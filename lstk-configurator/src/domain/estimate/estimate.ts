import type { Analysis } from "../planner/analyze";
import { UNIT } from "../planner/analyze";
import { HARDWARE } from "../connections/hardware";
import { finish } from "../finishes/catalog";
import { DEFAULT_FOUNDATION_PRICES } from "../foundation/foundation";
import { DEFAULT_MEP_PRICES } from "../mep/mep";
import { MATERIALS } from "../envelope/insulation";

/**
 * Bill of quantities and cost (сметная ведомость) from site preparation to
 * handover. Every line: code, item, unit, quantity, material and labour unit
 * prices. Prices are indicative Kazakhstan 2026 levels without VAT — the user
 * edits rates in the planner; quantities come from the model.
 */

export type EstUnit = "set" | "m" | "m2" | "m3" | "kg" | "t" | "pcs" | "kWh" | "h" | "trip" | "month" | "kW" | "shift";

export interface EstLine {
  code: string;
  /** i18n key `est.<id>` */
  id: string;
  unit: EstUnit;
  qty: number;
  /** Unit prices, ₸ */
  material: number;
  labour: number;
  amount: number;
}

export interface EstSection {
  code: string;
  /** i18n key `estsec.<id>` */
  id: string;
  lines: EstLine[];
  material: number;
  labour: number;
  total: number;
}

export interface EstimateOptions {
  /** Overheads, % of direct cost */
  overheadPct: number;
  /** Contingency, % of direct cost */
  contingencyPct: number;
  /** Margin (сметная прибыль), % of cost */
  marginPct: number;
  /** Kazakhstan VAT 12 % */
  vat: boolean;
  vatPct: number;
  /** Design documentation (АР, КМ, КМД, ОВ/ВК/ЭО), ₸ per m² of floor */
  designPerM2: number;
}

export const DEFAULT_ESTIMATE_OPTIONS: EstimateOptions = { overheadPct: 8, contingencyPct: 5, marginPct: 20, vat: false, vatPct: 12, designPerM2: 3500 };

export interface Estimate {
  sections: EstSection[];
  direct: number;
  overhead: number;
  contingency: number;
  cost: number;
  margin: number;
  net: number;
  vat: number;
  total: number;
  options: EstimateOptions;
}

/** Indicative unit prices (material, labour), ₸ */
const P = {
  setout: [0, 85000],
  clearing: [0, 450],
  topsoil: [0, 2800],
  site: [120000, 0],
  cabin: [90000, 0],
  waste: [35000, 0],
  dig: [0, 4200],
  backfill: [0, 2400],
  sand: [6500, 1800],
  gravel: [9500, 1900],
  geotextile: [450, 150],
  compaction: [0, 650],
  formwork: [2200, 3800],
  waterproof: [1900, 1500],
  skirtXps: [6500, 1200],
  blind: [7200, 3800],
  drainage: [3800, 2600],
  membrane: [550, 300],
  pileHead: [3500, 1500],
  girder: [4800, 2200],
  crane: [0, 85000],
  scaffold: [45000, 0],
  roofMembrane: [650, 350],
  counter: [380, 250],
  ridge: [2600, 900],
  eaves: [1700, 700],
  verge: [1800, 700],
  gutter: [5200, 1800],
  snowGuard: [4800, 1500],
  sheathing9: [2400, 900],
  wind: [450, 250],
  subframe: [1500, 1200],
  sill: [2800, 1200],
  vapour: [300, 200],
  subfloor: [4300, 1200],
  supervision: [0, 150000],
} as const;

export function buildEstimate(a: Analysis, o: EstimateOptions = DEFAULT_ESTIMATE_OPTIONS, labourRate = 2600): Estimate {
  const b = a.building;
  const input = b.input;
  const env = a.thermal.envelope;
  const { length: L, width: W } = input;
  const sections: EstSection[] = [];
  let sec: EstSection | null = null;
  const section = (code: string, id: string) => {
    sec = { code, id, lines: [], material: 0, labour: 0, total: 0 };
    sections.push(sec);
  };
  const line = (id: string, unit: EstUnit, qty: number, material: number, labour: number) => {
    if (!sec || !(qty > 1e-6) || material + labour <= 0) return;
    const s = sec as EstSection;
    const amount = qty * (material + labour);
    s.lines.push({ code: `${s.code}.${String(s.lines.length + 1).padStart(2, "0")}`, id, unit, qty, material, labour, amount });
    s.material += qty * material;
    s.labour += qty * labour;
    s.total += amount;
  };
  const price = (k: keyof typeof P) => P[k];
  const ln = (id: string, unit: EstUnit, qty: number, k: keyof typeof P) => line(id, unit, qty, price(k)[0], price(k)[1]);

  const footprint = (L * W) / 1e6;
  const perim = (2 * (L + W)) / 1000;
  const fnd = a.foundation;
  const fp = DEFAULT_FOUNDATION_PRICES;

  // 01 Site preparation
  section("01", "prep");
  ln("setout", "set", 1, "setout");
  ln("clearing", "m2", ((L + 4000) * (W + 4000)) / 1e6, "clearing");
  ln("topsoil", "m3", (((L + 2000) * (W + 2000)) / 1e6) * 0.2, "topsoil");
  ln("site", "set", 1, "site");
  ln("cabin", "month", Math.max(1, Math.ceil(footprint / 60)), "cabin");
  ln("waste", "trip", Math.max(1, Math.ceil(footprint / 80)), "waste");

  // 02 Earthworks and base
  section("02", "earth");
  if (fnd.type === "strip") {
    const run = perim + input.levels[0]!.partitions.reduce((s, p) => s + (p.axis === "x" ? W : L) / 1000, 0);
    const trench = run * (fnd.stripWidth / 1000 + 0.6) * (fnd.stripDepth / 1000 + 0.3);
    ln("dig", "m3", trench, "dig");
    ln("sand", "m3", run * 0.7 * 0.2, "sand");
    ln("geotextile", "m2", run * 1.4, "geotextile");
    ln("compaction", "m2", run * 0.9, "compaction");
    ln("backfill", "m3", trench * 0.55, "backfill");
    ln("waterproof", "m2", run * (fnd.stripDepth + input.foundation.plinth) / 1000 * 2, "waterproof");
    if (fnd.notes.includes("shallowStrip")) ln("skirtXps", "m2", (perim + 4.8) * 1.2, "skirtXps");
    ln("drainage", "m", perim + 8, "drainage");
  } else if (fnd.type === "slab") {
    const area = ((L + 400) * (W + 400)) / 1e6;
    ln("dig", "m3", area * 0.5, "dig");
    ln("sand", "m3", area * 0.3, "sand");
    ln("gravel", "m3", area * 0.15, "gravel");
    ln("geotextile", "m2", area * 1.1, "geotextile");
    ln("compaction", "m2", area * 2, "compaction");
    ln("membrane", "m2", area * 1.15, "membrane");
  } else if (fnd.type === "screw-piles") {
    ln("compaction", "m2", footprint, "compaction");
    ln("geotextile", "m2", footprint * 1.1, "geotextile");
    ln("gravel", "m3", footprint * 0.1, "gravel");
  }
  if (fnd.type !== "none") ln("blind", "m2", (perim + 4) * 0.8, "blind");

  // 03 Foundation
  section("03", "foundation");
  if (fnd.type === "screw-piles") {
    const pile = fnd.pileDiameter === 108 ? fp.pile108 : fp.pile89;
    line(`pile${fnd.pileDiameter}`, "pcs", fnd.piles, pile * (fnd.pileLength / 2500), fp.pileInstall);
    ln("pileHead", "pcs", fnd.piles, "pileHead");
    line("pileConcrete", "m3", fnd.concreteM3, fp.concrete, 0);
    ln("girder", "m", perim + input.levels[0]!.partitions.reduce((s, p) => s + (p.axis === "x" ? W : L) / 1000, 0), "girder");
  } else if (fnd.type === "strip" || fnd.type === "slab") {
    line("concrete", "m3", fnd.concreteM3, fp.concrete, fp.works * 0.4);
    line("rebar", "kg", fnd.rebarKg, fp.rebar, 120);
    const form = fnd.type === "strip" ? 2 * (perim + 4) * ((fnd.stripDepth + input.foundation.plinth) / 1000) * 0.6 : perim * 0.45;
    ln("formwork", "m2", form, "formwork");
    line("pump", "shift", 1, 0, fp.mobilization);
  } else line("anchorsOnSlab", "pcs", a.hardware.find((h) => h.kind === "anchor")?.qty ?? 0, 900, 600);

  // 04 LSTK frame (production)
  section("04", "frame");
  const scrap = a.bom.totals.massWithScrapKg;
  for (const p of a.bom.profiles) line(`steel:${p.designation}`, "kg", p.massKg * (scrap / Math.max(1, a.bom.totals.massKg)), scrap > 0 ? a.bom.totals.steelCost / scrap : 0, 0);
  line("fasteners", "pcs", a.bom.totals.fasteners, a.bom.totals.fasteners ? (a.bom.totals.fastenerCost - a.bom.totals.bolts * 400) / a.bom.totals.fasteners : 0, 0);
  for (const h of a.hardware) line(`hw.${h.kind}`, h.unit === "m" ? "m" : "pcs", h.qty, HARDWARE[h.kind].price, 0);
  line("electricity", "kWh", a.energy.kWh, a.energy.cost / Math.max(1e-9, a.energy.kWh), 0);
  line("lineLabour", "h", a.energy.lineHours * 2, 0, labourRate);
  line("shopLabour", "h", a.energy.assemblyHours, 0, labourRate);

  // 05 Frame erection
  section("05", "erection");
  const frameT = scrap / 1000;
  const siteH = frameT * UNIT.siteHoursPerT[a.cargo.some((c) => c.key === "bundles") ? "kit" : "panels"];
  line("erectWalls", "t", frameT * 0.6, 0, (siteH * 0.6 * labourRate * 1.2) / Math.max(1e-9, frameT * 0.6));
  line("erectTrusses", "pcs", b.trussPositions.length + (b.floorTruss ? b.floorPositions.length * (b.groundFloor ? 1 : 0) + b.floorPositions.length * (input.levels.length - 1) : 0), 0, 4500);
  if (a.delivery.craneAdvised || input.levels.length > 1) ln("crane", "shift", input.levels.length, "crane");
  if (input.levels.length > 1 || b.ridgeHeight > 4500) ln("scaffold", "set", 1, "scaffold");

  // 06 Roof
  section("06", "roof");
  const rf = finish(a.settings.finishes.roofing);
  ln("roofMembrane", "m2", env.roofM2 * 1.1, "roofMembrane");
  ln("counter", "m2", env.roofM2, "counter");
  line(`finish.${rf.id}`, "m2", env.roofM2 * (1 + rf.waste), rf.price, rf.labour);
  ln("ridge", "m", env.ridgeM, "ridge");
  ln("eaves", "m", env.eavesM, "eaves");
  ln("verge", "m", env.vergeM, "verge");
  ln("gutter", "m", env.eavesM + 2 * (input.levels.reduce((s, l) => s + l.height, 0) / 1000 + 1) * 2, "gutter");
  if (a.city.snowKpa >= 1.2 && input.roof.pitchDeg > 10) ln("snowGuard", "m", env.eavesM, "snowGuard");

  // 07 Facade and external walls
  section("07", "facade");
  const facadeM2 = env.sides.reduce((s, x) => s + x.wallM2, 0) + env.gablesM2;
  const wallIns = a.thermal.assemblies.find((x) => x.element === "wall");
  if (a.thermal.insulated) {
    ln("sheathing9", "m2", facadeM2 * 1.08, "sheathing9");
    ln("wind", "m2", facadeM2 * 1.1, "wind");
    if (wallIns && wallIns.added > 0) {
      const m = MATERIALS[a.settings.insulation];
      line(`ext.${m.id}`, "m3", (facadeM2 * wallIns.added) / 1000, m.pricePerM3, 9000);
    }
  }
  ln("subframe", "m2", facadeM2, "subframe");
  for (const f of a.finishes.filter((x) => x.zone === "facade" || x.zone === "plinth")) {
    const fin = finish(f.finishId);
    line(`finish.${fin.id}`, "m2", f.areaM2 * (1 + fin.waste), fin.price, fin.labour);
  }
  const winPerim = env.sides.reduce((s, x) => s + x.windows, 0) * 4.4;
  ln("sill", "m", winPerim, "sill");

  // 08 Thermal insulation
  section("08", "insulation");
  const q = a.thermal.quantities;
  if (a.thermal.insulated) {
    line("cavityWool", "m3", q.cavityM3, 22000, 7000);
    if (q.xpsM3 > 0) line("xps", "m3", q.xpsM3, 48000, 6000);
    ln("vapour", "m2", (facadeM2 + env.ceilingM2) * 1.15, "vapour");
  }

  // 09 Windows, doors, gates
  section("09", "openings");
  const winM2 = env.sides.reduce((s, x) => s + x.windowsM2, 0);
  const outerDoors = env.sides.reduce((s, x) => s + x.doors, 0);
  const innerDoors = input.levels.reduce((s, l) => s + l.partitions.reduce((t, p) => t + p.doors.length, 0), 0);
  const gatesM2 = env.sides.reduce((s, x) => s + x.gatesM2, 0);
  line("windows", "m2", winM2, UNIT.windowPerM2 * 0.8, UNIT.windowPerM2 * 0.2);
  line("entranceDoor", "pcs", outerDoors, UNIT.entranceDoor * 0.85, UNIT.entranceDoor * 0.15);
  line("interiorDoor", "pcs", innerDoors, UNIT.interiorDoor * 0.8, UNIT.interiorDoor * 0.2);
  line("gates", "m2", gatesM2, UNIT.gatePerM2 * 0.85, UNIT.gatePerM2 * 0.15);

  // 10 Interior finishes, 11 Floors
  section("10", "interior");
  for (const f of a.finishes.filter((x) => ["interior", "wet", "steam", "utility"].includes(x.zone))) {
    const fin = finish(f.finishId);
    line(`finish.${fin.id}`, "m2", f.areaM2 * (1 + fin.waste), fin.price, fin.labour);
  }
  section("11", "floors");
  if (b.groundFloor || input.levels.length > 1) ln("subfloor", "m2", env.floorM2.reduce((s, x) => s + x, 0) * 1.08, "subfloor");
  for (const f of a.finishes.filter((x) => x.zone.startsWith("floor"))) {
    const fin = finish(f.finishId);
    line(`finish.${fin.id}`, "m2", f.areaM2 * (1 + fin.waste), fin.price, fin.labour);
  }

  // 12-15 Engineering systems
  const mp = DEFAULT_MEP_PRICES;
  const m = a.mep;
  section("12", "electrical");
  line("panel", "pcs", m.rooms.length ? 1 : 0, mp.panel * 0.7, mp.panel * 0.3);
  line("breakers", "pcs", m.circuits, mp.breaker, 0);
  line("rcd", "pcs", m.rcds, mp.rcd, 0);
  line("cable15", "m", m.cable15M, mp.cable15 * 0.6, mp.cable15 * 0.4);
  line("cable25", "m", m.cable25M, mp.cable25 * 0.6, mp.cable25 * 0.4);
  line("cable6", "m", m.cable6M, mp.cable6 * 0.7, mp.cable6 * 0.3);
  line("sockets", "pcs", m.sockets, mp.socketPoint * 0.4, mp.socketPoint * 0.6);
  line("lights", "pcs", m.lights, mp.lightPoint * 0.5, mp.lightPoint * 0.5);
  line("grommets", "pcs", m.grommets, mp.grommet, 0);
  line("earthing", "set", m.rooms.length ? 1 : 0, 45000, 25000);
  section("13", "plumbing");
  line("waterPoints", "pcs", m.waterPoints, mp.waterPoint * 0.5, mp.waterPoint * 0.5);
  line("pipes", "m", m.pipeM, mp.pipePerM * 0.6, mp.pipePerM * 0.4);
  line("sewer50", "m", m.sewer50M, mp.sewer50PerM * 0.6, mp.sewer50PerM * 0.4);
  line("sewer110", "m", m.sewer110M, mp.sewer110PerM * 0.6, mp.sewer110PerM * 0.4);
  section("14", "ventilation");
  line("fans", "pcs", m.fans, mp.fan * 0.7, mp.fan * 0.3);
  line("ducts", "m", m.ductM, mp.ductPerM * 0.6, mp.ductPerM * 0.4);
  section("15", "heating");
  line("heaters", "kW", m.heatingKw, mp.heaterPerKw * 0.8, mp.heaterPerKw * 0.2);

  // 16 Delivery and machinery
  section("16", "delivery");
  if (a.delivery.best) line(`vehicle.${a.delivery.best.vehicle.id}`, "trip", a.delivery.best.trips, 0, a.delivery.best.cost / a.delivery.best.trips);

  // 17 Design and supervision
  section("17", "design");
  line("designDocs", "m2", Math.max(a.areas.floor, footprint), 0, o.designPerM2);
  ln("supervision", "set", 1, "supervision");

  const kept = sections.filter((s) => s.lines.length);
  const direct = kept.reduce((s, x) => s + x.total, 0);
  const overhead = (direct * o.overheadPct) / 100;
  const contingency = (direct * o.contingencyPct) / 100;
  const cost = direct + overhead + contingency;
  const margin = (cost * o.marginPct) / 100;
  const net = cost + margin;
  const vat = o.vat ? (net * o.vatPct) / 100 : 0;
  return { sections: kept, direct, overhead, contingency, cost, margin, net, vat, total: net + vat, options: o };
}
