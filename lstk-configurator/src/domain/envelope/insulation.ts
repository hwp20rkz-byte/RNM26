import type { Building } from "../buildings/generate";
import { FLOOR_TRUSS_DEPTH } from "../buildings/generate";
import type { HeatingMode } from "../buildings/types";
import { degreeDays, INDOOR_T, requiredR, type City, type Element } from "../climate/cities";
import { doorArea, envelope, wallArea, windowArea, type Envelope } from "./geometry";

/**
 * Thermal design of a light-gauge steel envelope.
 *
 * Steel studs short-circuit cavity insulation: the effective R of wool between
 * C-studs is roughly half its nominal value (ASHRAE 90.1 Table A9.2B gives
 * 0.46–0.55 for 89 mm studs at 400–600 mm). The Golden Integrity line cannot
 * punch thermal slots (no such tooling in the offer), so the remedy is a
 * continuous layer outside the frame — which also keeps the studs above the
 * dew point. The solver picks the thinnest external layer that meets the
 * target R, and flags a frame at risk of condensation.
 */

export type InsulationMaterial = "wool" | "eps" | "pir";
export type EfficiencyLevel = "minimum" | "norm" | "plus";

export interface Material {
  id: InsulationMaterial;
  /** Design conductivity, W/(m·K) (operating conditions B) */
  lambda: number;
  densityKg: number;
  /** ₸ per m³ — placeholder market price */
  pricePerM3: number;
  combustible: boolean;
}

export const MATERIALS: Record<InsulationMaterial, Material> = {
  wool: { id: "wool", lambda: 0.04, densityKg: 45, pricePerM3: 32000, combustible: false },
  eps: { id: "eps", lambda: 0.039, densityKg: 25, pricePerM3: 26000, combustible: true },
  pir: { id: "pir", lambda: 0.024, densityKg: 32, pricePerM3: 85000, combustible: true },
};

/** Cavity wool between studs/chords — always stone wool (fire, acoustics) */
const CAVITY = { lambda: 0.04, densityKg: 35, pricePerM3: 22000 };
/** Under-slab board */
const XPS = { lambda: 0.032, densityKg: 32, pricePerM3: 48000 };

const RSI = 1 / 8.7;
const RSE = 1 / 23;
const RSE_VENT = 1 / 12; // ventilated facade: the cladding layer is ignored
const STEPS = [0, 50, 100, 150, 200, 250, 300];

const FACTOR: Record<EfficiencyLevel, number> = { minimum: 0.63, norm: 1, plus: 1.4 };

export interface Layer {
  /** i18n key under `layer.*` */
  key: string;
  thickness: number;
  lambda: number | null;
  /** Effective R of the layer, m²K/W */
  r: number;
}

export interface Assembly {
  element: Element | "slab";
  areaM2: number;
  layers: Layer[];
  rTotal: number;
  rRequired: number;
  ok: boolean;
  /** Added continuous insulation, mm */
  added: number;
  /** Cavity insulation, mm */
  cavity: number;
  /** Share of R outside the steel — ≥ 0.4 keeps the frame warm in a cold climate */
  outsideShare: number;
}

export interface ThermalOptions {
  city: City;
  heating: HeatingMode;
  material: InsulationMaterial;
  level: EfficiencyLevel;
  /** Window R, m²K/W: 0.54 two-chamber PVC, 0.7 three-chamber, 0.8 warm-edge argon */
  windowR: number;
  /** Air changes per hour of the ventilation */
  airChanges: number;
  /** Heat-recovery efficiency of a mechanical system, 0 for natural ventilation */
  recovery: number;
}

export interface ThermalResult {
  insulated: boolean;
  tIn: number;
  gsop: number;
  assemblies: Assembly[];
  /** Heat-loss coefficient, W/K */
  hTransmission: number;
  hVentilation: number;
  /** Design heat load at t5, kW */
  peakKw: number;
  /** Seasonal heat demand, kWh */
  seasonKwh: number;
  /** Fraction of the season the building is actually heated */
  occupancy: number;
  condensationRisk: boolean;
  quantities: { cavityM3: number; addedM3: number; xpsM3: number; massKg: number; cost: number };
  envelope: Envelope;
}

/** Share of the heating season a building of this use is heated */
const OCCUPANCY: Record<HeatingMode, number> = { permanent: 1, seasonal: 0.3, bath: 0.12, none: 0 };

function bridging(spacing: number): number {
  return spacing >= 600 ? 0.55 : spacing >= 400 ? 0.5 : 0.45;
}

const layer = (key: string, thickness: number, lambda: number | null, r?: number): Layer => ({
  key,
  thickness,
  lambda,
  r: r ?? (lambda ? thickness / 1000 / lambda : 0),
});

/** Assemble layers, add the thinnest continuous layer that meets the target */
function solve(element: Assembly["element"], areaM2: number, rReq: number, fixed: Layer[], cavity: number, addKey: string, addLambda: number, steps = STEPS, surfaces = RSI + RSE_VENT): Assembly {
  const base = surfaces + fixed.reduce((s, l) => s + l.r, 0);
  let added = steps[steps.length - 1]!;
  for (const t of steps) {
    if (base + t / 1000 / addLambda >= rReq) {
      added = t;
      break;
    }
  }
  const layers = added > 0 ? [layer(addKey, added, addLambda), ...fixed] : fixed;
  const rTotal = surfaces + layers.reduce((s, l) => s + l.r, 0);
  const outside = added / 1000 / addLambda + RSE_VENT;
  return { element, areaM2, layers, rTotal, rRequired: rReq, ok: rTotal >= rReq - 1e-9, added, cavity, outsideShare: outside / rTotal };
}

export function thermal(b: Building, o: ThermalOptions): ThermalResult {
  const env = envelope(b);
  const tIn = INDOOR_T[o.heating];
  const gsop = degreeDays(o.city, tIn);
  const insulated = o.heating !== "none" && env.enclosed;
  const k = FACTOR[o.level];
  const mat = MATERIALS[o.material];
  const d = b.depth;
  const r = bridging(b.input.studSpacing);
  const assemblies: Assembly[] = [];

  if (insulated) {
    const wallFixed = [layer("osb9", 9, 0.13), layer("cavityWool", d, CAVITY.lambda, (r * d) / 1000 / CAVITY.lambda), layer("vapour", 0, null), layer("gkl", 12.5, 0.21)];
    assemblies.push(solve("wall", wallArea(env), k * requiredR("wall", gsop), wallFixed, d, `ext.${mat.id}`, mat.lambda));

    // Cold attic: wool between the bottom chords, the rest laid across them
    const atticFixed = [layer("cavityWool", d, CAVITY.lambda, (bridging(b.input.trussSpacing) * d) / 1000 / CAVITY.lambda), layer("vapour", 0, null), layer("gkl", 12.5, 0.21)];
    assemblies.push(solve("attic", env.ceilingM2, k * requiredR("attic", gsop), atticFixed, d, "overWool", CAVITY.lambda, STEPS, RSI + 1 / 12));

    if (b.groundFloor) {
      // Floor trusses: open webs bridge little, the chords do — r ≈ 0.75 across 300 mm
      const cav = FLOOR_TRUSS_DEPTH - 50;
      const floorFixed = [layer("board", 22, 0.15), layer("osb18", 18, 0.13), layer("cavityWool", cav, CAVITY.lambda, (0.75 * cav) / 1000 / CAVITY.lambda), layer("windMembrane", 0, null)];
      assemblies.push(solve("floor", env.floorM2[0]!, k * requiredR("floor", gsop), floorFixed, cav, "underWool", CAVITY.lambda, [0, 50, 100], RSI + 1 / 6));
    } else if (b.input.foundation.type === "slab") {
      // Slab on ground: XPS under the slab; the ground itself adds ≈ 2 m²K/W for a small building
      const fixed = [layer("screed", 50, 0.93), layer("slab", 150, 1.92), layer("ground", 0, null, 2)];
      assemblies.push(solve("slab", env.floorM2[0]!, k * requiredR("floor", gsop), fixed, 0, "xps", XPS.lambda, [50, 100, 150, 200], RSI));
    }
  }

  const w = assemblies.find((a) => a.element === "wall");
  const winR = o.windowR;
  const doorR = 0.6 * (w ? requiredR("wall", gsop) : 1); // insulated door, ~0.6 of the wall norm
  const hTransmission = insulated
    ? assemblies.reduce((s, a) => s + a.areaM2 / a.rTotal, 0) + windowArea(env) / winR + doorArea(env) / doorR + 0.15 * (env.perimeterM * 0.5) // linear bridges at the plinth
    : 0;
  const hVentilation = insulated ? 0.34 * o.airChanges * env.volumeM3 * (1 - o.recovery) : 0;
  const h = hTransmission + hVentilation;
  const occupancy = insulated ? OCCUPANCY[o.heating] : 0;
  const peakKw = (h * (tIn - o.city.t5)) / 1000;
  const seasonKwh = (h * gsop * 24 * occupancy) / 1000;

  const cavityM3 = assemblies.filter((a) => a.element !== "slab").reduce((s, a) => s + (a.areaM2 * a.cavity) / 1000, 0) * 0.9;
  const addedM3 = assemblies.filter((a) => a.element === "wall").reduce((s, a) => s + (a.areaM2 * a.added) / 1000, 0);
  const overM3 = assemblies.filter((a) => a.element === "attic" || a.element === "floor").reduce((s, a) => s + (a.areaM2 * a.added) / 1000, 0);
  const xpsM3 = assemblies.filter((a) => a.element === "slab").reduce((s, a) => s + (a.areaM2 * a.added) / 1000, 0);
  const massKg = (cavityM3 + overM3) * CAVITY.densityKg + addedM3 * mat.densityKg + xpsM3 * XPS.densityKg;
  const cost = (cavityM3 + overM3) * CAVITY.pricePerM3 + addedM3 * mat.pricePerM3 + xpsM3 * XPS.pricePerM3;

  return {
    insulated,
    tIn,
    gsop,
    assemblies,
    hTransmission,
    hVentilation,
    peakKw,
    seasonKwh,
    occupancy,
    // Studs below the dew point: little outside insulation where winters are hard
    condensationRisk: insulated && !!w && o.city.t5 < -20 && w.outsideShare < 0.35,
    quantities: { cavityM3: cavityM3 + overM3, addedM3, xpsM3, massKg, cost },
    envelope: env,
  };
}
