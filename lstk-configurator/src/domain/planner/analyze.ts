import type { Assembly } from "../assemblies/types";
import { computeBom, type Bom, type Prices } from "../bom/bom";
import { generateBuilding, overallSize, type Building } from "../buildings/generate";
import type { RoomPurpose } from "../buildings/types";
import { findCity, type City } from "../climate/cities";
import { doorArea, windowArea } from "../envelope/geometry";
import { thermal, type EfficiencyLevel, type InsulationMaterial, type ThermalResult } from "../envelope/insulation";
import { DEFAULT_FINISHES, finish, type FinishChoice } from "../finishes/catalog";
import { foundation, type FoundationResult } from "../foundation/foundation";
import { coopPlan, type CoopPlan } from "../livestock/coop";
import { DEFAULT_MEP_PRICES, mep, type Mep } from "../mep/mep";
import { planDelivery, type Cargo, type DeliveryResult, type ShippingMode } from "../logistics/delivery";
import { DEFAULT_ENERGY, productionEnergy, type EnergyResult } from "../production/energy";

/**
 * The planner: one call turns a building input and the project settings into
 * everything the user sees — frame, thermal design, finishes, MEP, foundation,
 * production energy, delivery and the cost estimate.
 */

export interface PlannerSettings {
  cityId: string;
  insulation: InsulationMaterial;
  efficiency: EfficiencyLevel;
  /** Window R, m²K/W */
  windowR: number;
  ventilation: "natural" | "recovery";
  finishes: FinishChoice;
  shipping: ShippingMode;
  distanceKm: number;
  /** Electricity tariff, ₸/kWh — production and the heating forecast */
  tariff: number;
  /** Workshop and site labour, ₸/h incl. taxes */
  labourRate: number;
  marginPct: number;
  /** Electric heating installed (else the client's own boiler/stove) */
  electricHeating: boolean;
  /** Birds for coops and poultry houses */
  birds: number;
}

export const DEFAULT_SETTINGS: PlannerSettings = {
  cityId: "astana",
  insulation: "wool",
  efficiency: "norm",
  windowR: 0.7,
  ventilation: "natural",
  finishes: DEFAULT_FINISHES,
  shipping: "panels",
  distanceKm: 50,
  tariff: 48,
  labourRate: 2600,
  marginPct: 20,
  electricHeating: true,
  birds: 20,
};

/** Unit prices the estimate needs beyond the BOM — indicative, ₸ */
export const UNIT = {
  windowPerM2: 52000,
  entranceDoor: 160000,
  interiorDoor: 48000,
  gatePerM2: 38000,
  membranePerM2: 450,
  osb9PerM2: 2400,
  osb18PerM2: 4300,
  /** Shop assembly, h per tonne of frame (panels mode) */
  shopHoursPerT: 40,
  /** Site erection, h per tonne: panels vs kit */
  siteHoursPerT: { panels: 22, kit: 55 },
  overheadPct: 8,
  /** Windows/doors mass, kg/m² and per leaf */
  windowKgM2: 28,
  doorKg: 45,
} as const;

export interface CostLine {
  key: string;
  group: "frame" | "production" | "envelope" | "finishes" | "openings" | "mep" | "foundation" | "site" | "delivery" | "overhead";
  amount: number;
  /** Optional quantity and unit for the table */
  qty?: number;
  unit?: string;
}

export interface FinishTakeoff {
  zone: string;
  finishId: string;
  areaM2: number;
  cost: number;
  massKg: number;
}

export interface Analysis {
  building: Building;
  bom: Bom;
  city: City;
  thermal: ThermalResult;
  finishes: FinishTakeoff[];
  mep: Mep;
  foundation: FoundationResult;
  energy: EnergyResult;
  delivery: DeliveryResult;
  cargo: Cargo[];
  coop: CoopPlan | null;
  lines: CostLine[];
  cost: number;
  price: number;
  /** Overall finished size, mm */
  size: { length: number; width: number; height: number };
  /** Heating forecast at the tariff, ₸ per season */
  heatingPerYear: number;
  areas: { footprint: number; floor: number; living: number };
}

/** Longest wall panel shipped in one piece; longer walls are split at the shop, mm */
export const MAX_PANEL = 6000;

const INTERIOR_ZONE: Partial<Record<RoomPurpose, "interior" | "wet" | "steam" | "utility">> = {
  living: "interior",
  bedroom: "interior",
  kitchen: "interior",
  rest: "interior",
  hall: "interior",
  storage: "interior",
  technical: "wet",
  bathroom: "wet",
  washing: "wet",
  steam: "steam",
  garage: "utility",
  workshop: "utility",
  poultry: "utility",
};

function operations(assemblies: readonly Assembly[]): number {
  return assemblies.reduce((s, a) => s + a.members.reduce((t, m) => t + m.features.length, 0), 0);
}

export function analyze(input: Building["input"], settings: PlannerSettings, prices: Prices): Analysis {
  const building = generateBuilding(input);
  const bom = computeBom(building.assemblies, prices);
  const city = findCity(settings.cityId);
  const thermalResult = thermal(building, {
    city,
    heating: input.heating,
    material: settings.insulation,
    level: settings.efficiency,
    windowR: settings.windowR,
    airChanges: input.heating === "bath" ? 1 : 0.5,
    recovery: settings.ventilation === "recovery" ? 0.75 : 0,
  });
  const env = thermalResult.envelope;
  const f = settings.finishes;

  // ── Finishes ───────────────────────────────────────────
  const takeoff: FinishTakeoff[] = [];
  const add = (zone: string, finishId: string, areaM2: number) => {
    if (areaM2 <= 0.01) return;
    const fin = finish(finishId);
    const a = areaM2 * (1 + fin.waste);
    takeoff.push({ zone, finishId, areaM2, cost: a * (fin.price + fin.labour), massKg: a * fin.kgPerM2 });
  };
  const facadeM2 = env.sides.reduce((s, x) => s + x.wallM2, 0) + env.gablesM2;
  add("facade", f.facade, facadeM2);
  add("roofing", f.roofing, env.roofM2);
  if (input.foundation.plinth > 0 && input.foundation.type !== "none") add("plinth", f.plinth, env.plinthM2);
  const zones = { interior: 0, wet: 0, steam: 0, utility: 0 };
  const floors = { main: 0, wet: 0, steam: 0, utility: 0 };
  env.rooms.forEach((level, li) =>
    level.forEach((r) => {
      const z = INTERIOR_ZONE[r.purpose];
      if (!z || !env.enclosed) return;
      const h = input.levels[li]!.height / 1000;
      zones[z] += r.perimeter * h + r.area; // walls + ceiling
      if (z === "interior") floors.main += r.area;
      else if (z === "wet") floors.wet += r.area;
      else if (z === "steam") floors.steam += r.area;
      else floors.utility += r.area;
    }),
  );
  // Openings come out of the inner faces too (about the same as the outer)
  zones.interior = Math.max(0, zones.interior - windowArea(env) - doorArea(env));
  add("interior", f.interior, zones.interior);
  add("wet", f.wet, zones.wet);
  add("steam", f.steam, zones.steam);
  add("utility", "osbOpen", zones.utility);
  add("floor", f.floor, floors.main);
  add("floorWet", "tile", floors.wet);
  add("floorSteam", "deck", floors.steam);
  add("floorUtility", input.foundation.type === "slab" ? "concrete" : "deck", floors.utility);
  if (!env.enclosed && input.foundation.type !== "slab" && input.foundation.type !== "none") add("floorOpen", "deck", env.floorM2[0]!);

  // ── MEP ────────────────────────────────────────────────
  const heatingKw = settings.electricHeating && thermalResult.insulated && input.heating !== "bath" ? Math.ceil(thermalResult.peakKw * 1.15 * 2) / 2 : 0;
  const coop = input.productId === "coop" || input.productId === "poultry" ? coopPlan(settings.birds) : null;
  const mepResult = env.enclosed || coop ? mep(building, env.rooms, heatingKw, DEFAULT_MEP_PRICES, coop?.birds ?? 0) : mep(building, [], 0);

  // ── Foundation, production ─────────────────────────────
  const fnd = foundation(building, city);
  const energy = productionEnergy(bom, operations(building.assemblies), { ...DEFAULT_ENERGY, tariff: settings.tariff, assemblyHoursPerT: settings.shipping === "panels" ? UNIT.shopHoursPerT : 6 });

  // ── Openings ───────────────────────────────────────────
  const winM2 = windowArea(env);
  const outerDoors = env.sides.reduce((s, x) => s + x.doors, 0);
  const gatesM2 = env.sides.reduce((s, x) => s + (x.gatesM2 ?? 0), 0);
  const innerDoors = input.levels.reduce((s, l) => s + l.partitions.reduce((t, p) => t + p.doors.length, 0), 0);

  // ── Cargo ──────────────────────────────────────────────
  const frameT = bom.totals.massWithScrapKg / 1000;
  const walls = building.assemblies.filter((a) => a.kind === "wall");
  const trusses = building.assemblies.filter((a) => a.kind === "truss");
  const longestPiece = Math.max(...bom.cutList.map((c) => c.length));
  const cargo: Cargo[] = [];
  if (settings.shipping === "panels") {
    // Walls ship on edge in A-frame racks; walls over MAX_PANEL are split at the shop
    const wallDims = walls.map((w) => Math.min(w.size.width, MAX_PANEL));
    const trussDims = trusses.map((t) => t.size.width + 2 * input.roof.overhang);
    const wallKg = walls.reduce((s, w) => s + bom.assemblies.find((x) => x.mark === w.mark)!.massKg, 0);
    // Panels stacked flat: 89 mm frame + 40 mm spacers per panel; trusses nested in 50 mm
    cargo.push({ key: "wallPanels", massKg: wallKg, volumeM3: walls.reduce((s, w) => s + (w.size.width * w.size.height * (building.depth + 40)) / 1e9, 0), longest: Math.max(0, ...wallDims), widest: 1200 });
    cargo.push({ key: "trusses", massKg: bom.totals.massKg - wallKg, volumeM3: trusses.reduce((s, t) => s + (t.size.width * t.size.height * 90) / 1e9, 0), longest: Math.max(0, ...trussDims), widest: Math.max(0, ...trusses.map((t) => t.size.height)) });
  } else {
    // Bundles: C89 nests at ≈ 2.5× its solid section
    cargo.push({ key: "bundles", massKg: bom.totals.massKg, volumeM3: bom.totals.metres * 0.089 * 0.041 * 2.5, longest: longestPiece, widest: 400 });
  }
  const insKg = thermalResult.quantities.massKg;
  if (insKg > 0) cargo.push({ key: "insulation", massKg: insKg, volumeM3: (thermalResult.quantities.cavityM3 + thermalResult.quantities.addedM3 + thermalResult.quantities.xpsM3) * 0.6, longest: 1200, widest: 600 });
  const finKg = takeoff.reduce((s, t) => s + t.massKg, 0);
  if (finKg > 0) cargo.push({ key: "finishes", massKg: finKg, volumeM3: finKg / 700, longest: Math.min(6000, input.length + 2 * input.roof.overhang), widest: 1200 });
  const openingsKg = winM2 * UNIT.windowKgM2 + (outerDoors + innerDoors) * UNIT.doorKg + gatesM2 * 15;
  if (openingsKg > 0) cargo.push({ key: "openings", massKg: openingsKg, volumeM3: winM2 * 0.25 + (outerDoors + innerDoors) * 0.25 + gatesM2 * 0.15, longest: 2400, widest: 1500 });
  if (fnd.type === "screw-piles") cargo.push({ key: "piles", massKg: fnd.massKg, volumeM3: fnd.piles * 0.03, longest: fnd.pileLength, widest: 300 });
  const heaviestPanel = Math.max(0, ...bom.assemblies.map((a) => a.massKg));
  const delivery = planDelivery(cargo, settings.distanceKm, settings.shipping === "panels" && heaviestPanel > 120);

  // ── Cost lines ─────────────────────────────────────────
  const L = (key: string, group: CostLine["group"], amount: number, qty?: number, unit?: string): CostLine => ({ key, group, amount, qty, unit });
  const wallM2 = facadeM2;
  const lines: CostLine[] = [
    L("steel", "frame", bom.totals.steelCost, bom.totals.massWithScrapKg, "kg"),
    L("fasteners", "frame", bom.totals.fastenerCost, bom.totals.fasteners, "pcs"),
    L("electricity", "production", energy.cost, energy.kWh, "kWh"),
    L("lineLabour", "production", energy.lineHours * settings.labourRate * 2, energy.lineHours * 2, "h"),
    L("shopLabour", "production", energy.assemblyHours * settings.labourRate, energy.assemblyHours, "h"),
    L("insulation", "envelope", thermalResult.quantities.cost, thermalResult.quantities.cavityM3 + thermalResult.quantities.addedM3 + thermalResult.quantities.xpsM3, "m3"),
    L("membranes", "envelope", thermalResult.insulated ? (2 * wallM2 + 2 * env.ceilingM2 + env.floorM2[0]!) * UNIT.membranePerM2 : 0),
    L("sheathing", "envelope", thermalResult.insulated ? wallM2 * UNIT.osb9PerM2 + (building.groundFloor ? env.floorM2.reduce((s, x) => s + x, 0) * UNIT.osb18PerM2 : 0) : building.groundFloor ? env.floorM2[0]! * UNIT.osb18PerM2 : 0),
    ...takeoff.map((t) => L(`finish.${t.zone}`, "finishes", t.cost, t.areaM2, "m2")),
    L("windows", "openings", winM2 * UNIT.windowPerM2, winM2, "m2"),
    L("doors", "openings", outerDoors * UNIT.entranceDoor + innerDoors * UNIT.interiorDoor, outerDoors + innerDoors, "pcs"),
    L("gates", "openings", gatesM2 * UNIT.gatePerM2, gatesM2, "m2"),
    L("electrical", "mep", mepResult.cost.electrical),
    L("plumbing", "mep", mepResult.cost.plumbing),
    L("ventilation", "mep", mepResult.cost.ventilation),
    L("heating", "mep", mepResult.cost.heating, heatingKw, "kW"),
    L("foundation", "foundation", fnd.cost),
    L("erection", "site", frameT * UNIT.siteHoursPerT[settings.shipping] * settings.labourRate * 1.2, frameT * UNIT.siteHoursPerT[settings.shipping], "h"),
    L("delivery", "delivery", delivery.best?.cost ?? 0, delivery.best?.trips, "trips"),
  ].filter((l) => l.amount > 0.5);
  const direct = lines.reduce((s, l) => s + l.amount, 0);
  const overhead = (direct * UNIT.overheadPct) / 100;
  lines.push(L("overhead", "overhead", overhead));
  const cost = direct + overhead;
  const price = cost * (1 + settings.marginPct / 100);

  const floor = env.floorM2.reduce((s, x) => s + x, 0);
  const living = env.rooms.flat().filter((r) => ["living", "bedroom", "kitchen", "rest"].includes(r.purpose)).reduce((s, r) => s + r.area, 0);
  return {
    building,
    bom,
    city,
    thermal: thermalResult,
    finishes: takeoff,
    mep: mepResult,
    foundation: fnd,
    energy,
    delivery,
    cargo,
    coop,
    lines,
    cost,
    price,
    size: overallSize(building),
    heatingPerYear: thermalResult.seasonKwh * settings.tariff,
    areas: { footprint: env.footprintM2, floor, living },
  };
}
