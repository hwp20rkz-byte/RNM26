import type { Building } from "../buildings/generate";
import type { RoomPurpose } from "../buildings/types";
import { PRODUCTS } from "../catalog/products";
import type { City } from "../climate/cities";
import type { ThermalResult } from "../envelope/insulation";
import type { Room } from "../layout/rooms";

/**
 * Energy and autonomy of a building: what it consumes over a year and at the
 * peak, and the plant that covers it on site — PV on the roof with a battery
 * and a hybrid inverter, small wind, a diesel genset as the backup, an air or
 * ground source heat pump feeding underfloor heating and hot water, light
 * tubes through the roof, a borehole with treatment and a packaged sewage
 * plant, EV chargers.
 *
 * It is a feasibility sizing for a preliminary design: yields and prices are
 * typical for Kazakhstan, the specialist sections of a working design decide.
 */

export type HeatPumpKind = "none" | "air" | "ground";

export interface AutonomySettings {
  /** Grid connection: with it the plant offsets the bill, without it the genset closes the gap */
  grid: boolean;
  pv: boolean;
  /** Installed PV, kWp; null — as much as the bill needs and the roof takes */
  pvKwp: number | null;
  battery: boolean;
  heatPump: HeatPumpKind;
  ufh: boolean;
  skylights: boolean;
  /** 5 kW turbines on 18 m masts */
  wind: number;
  genset: boolean;
  well: boolean;
  /** Expected borehole depth, m — hydrogeology decides */
  wellDepth: number;
  septic: boolean;
  /** EV chargers: AC 11 kW and DC 50 kW */
  evAc: number;
  evDc: number;
  /** Where the front wall faces, degrees from south (+ to the west) */
  azimuth: number;
}

export const AUTONOMY_OFF: AutonomySettings = {
  grid: true,
  pv: false,
  pvKwp: null,
  battery: false,
  heatPump: "none",
  ufh: false,
  skylights: false,
  wind: 0,
  genset: false,
  well: false,
  wellDepth: 60,
  septic: false,
  evAc: 0,
  evDc: 0,
  azimuth: 0,
};

/** Everything on: an off-grid building that keeps the grid as an option */
export const AUTONOMY_MAX: AutonomySettings = {
  ...AUTONOMY_OFF,
  pv: true,
  battery: true,
  heatPump: "ground",
  ufh: true,
  skylights: true,
  wind: 1,
  genset: true,
  well: true,
  septic: true,
  evAc: 4,
  evDc: 1,
};

/** Maximum autonomy sized to the building: chargers by use, wind only where it blows */
export function autonomyPreset(productId: string, city: City): AutonomySettings {
  const p = PRODUCTS.find((x) => x.id === productId);
  const sport = p?.category === "sport";
  return {
    ...AUTONOMY_MAX,
    evAc: sport ? Math.max(2, Math.round((p?.capacity?.default ?? 20) / 10)) : 1,
    evDc: sport && (p?.capacity?.default ?? 0) >= 40 ? 1 : 0,
    wind: windSpeed(city) >= 4 ? 1 : 0,
    wellDepth: AUTONOMY_MAX.wellDepth,
  };
}

/** Annual PV yield at a 20–35° tilt facing south, kWh per kWp (PVGIS-type estimates, ±10 %) */
const YIELD: Record<string, number> = {
  astana: 1290, almaty: 1350, shymkent: 1450, karaganda: 1350, aktobe: 1320, atyrau: 1400, aktau: 1460, kostanay: 1270, pavlodar: 1290,
  petropavlovsk: 1240, kokshetau: 1270, oskemen: 1260, semey: 1300, oral: 1260, kyzylorda: 1500, taraz: 1430, taldykorgan: 1380,
  turkistan: 1500, zhezkazgan: 1420, ekibastuz: 1300, temirtau: 1340, balkhash: 1430, rudny: 1270, konaev: 1440, zhanaozen: 1460,
  kulsary: 1430, ridder: 1150, arkalyk: 1360, baikonur: 1500, zaysan: 1400, saryagash: 1480, zharkent: 1450, stepnogorsk: 1280,
  shchuchinsk: 1260, aksu: 1290,
};

/** Mean wind speed at 10 m, m/s (climate reference, indicative) */
const WIND_MS: Record<string, number> = {
  astana: 4.4, almaty: 1.8, shymkent: 2.6, karaganda: 4.2, aktobe: 4.0, atyrau: 4.6, aktau: 5.6, kostanay: 4.0, pavlodar: 4.0,
  petropavlovsk: 3.8, kokshetau: 4.0, oskemen: 2.4, semey: 3.0, oral: 3.8, kyzylorda: 3.6, taraz: 2.8, taldykorgan: 2.6,
  turkistan: 3.0, zhezkazgan: 4.4, ekibastuz: 5.0, temirtau: 4.2, balkhash: 4.6, rudny: 4.0, konaev: 3.2, zhanaozen: 5.2,
  kulsary: 4.6, ridder: 2.0, arkalyk: 4.8, baikonur: 4.0, zaysan: 4.6, saryagash: 2.6, zharkent: 3.0, stepnogorsk: 4.4,
  shchuchinsk: 3.6, aksu: 4.0,
};

export const yieldPerKwp = (c: City) => YIELD[c.id] ?? 1300;
export const windSpeed = (c: City) => WIND_MS[c.id] ?? 3.8;

/** Plant prices, ₸ — placeholders for 2026 turnkey supply and installation */
export const AUTONOMY_PRICES = {
  pvPerKwp: 290000,
  batteryPerKwh: 190000,
  inverterPerKw: 65000,
  heatPumpAirPerKw: 180000,
  heatPumpGroundPerKw: 230000,
  /** Borehole heat exchanger drilling and probe, per metre */
  probePerM: 14000,
  backupHeaterPerKw: 12000,
  ufhPerM2: 9500,
  manifold: 120000,
  dhwTankPerL: 650,
  lightTube: 260000,
  lightTube350: 185000,
  wind5kw: 4200000,
  gensetPerKw: 210000,
  wellPerM: 26000,
  wellPump: 650000,
  waterTreatment: 1900000,
  septicPerPe: 160000,
  evAc: 650000,
  evDc: 12500000,
  diesel: 320,
};

const PANEL = { w: 1134, h: 2278, kwp: 0.45, gap: 20 };

export interface PvLayout {
  /** Which roof slope: "front" (z = 0 side) or "back"; a mono roof has one */
  slope: "front" | "back";
  rows: number;
  cols: number;
  /** Panels actually placed */
  count: number;
}

export interface PlantItem {
  /** i18n key under `auto.item.*` */
  key: string;
  qty: number;
  unit: "kWp" | "kWh" | "kW" | "m" | "m2" | "pcs" | "set";
  cost: number;
}

export interface AutonomyResult {
  enabled: boolean;
  people: { visitsPerDay: number; showersPerDay: number };
  /** Annual electricity by use, kWh */
  use: { heating: number; hotWater: number; lighting: number; ventilation: number; equipment: number; water: number; ev: number };
  annualKwh: number;
  /** Electrical peak at the design temperature, kW */
  peakKw: number;
  heatPump: { kind: HeatPumpKind; kw: number; scop: number; backupKw: number; probes: number; probeDepth: number } | null;
  ufh: { areaM2: number; pipeM: number; loops: number; manifolds: number; fluxWm2: number; excluded: string[]; dry: boolean } | null;
  dhw: { litresPerDay: number; tankL: number };
  skylights: { count: number; diameter: 530 | 350; rooms: { key: string; count: number; z0: number; z1: number }[]; saving: number } | null;
  pv: (PvLayout & { kwp: number; maxKwp: number; yieldKwh: number; loadKpa: number }) | null;
  battery: { kwh: number } | null;
  inverterKw: number;
  wind: { turbines: number; kw: number; speed: number; yieldKwh: number } | null;
  genset: { kva: number; litresPerHour: number; tankL: number; hoursPerYear: number; fuelL: number } | null;
  water: { m3PerDay: number; wellDepth: number; pumpKw: number } | null;
  septic: { pe: number } | null;
  ev: { ac: number; dc: number; kw: number } | null;
  /** Own generation used on site and its share of the need */
  ownKwh: number;
  selfSufficiency: number;
  /** Grid import or genset output for the rest, kWh */
  gapKwh: number;
  items: PlantItem[];
  capex: number;
  /** Bill before and after, ₸ a year (genset fuel included) */
  billBefore: number;
  billAfter: number;
  paybackYears: number | null;
  notes: string[];
}

/** Visits a day and showers: sports halls fill 3 sessions of the capacity, homes have 4 residents */
function occupancy(b: Building): { visits: number; showers: number; days: number } {
  const p = PRODUCTS.find((x) => x.id === b.input.productId);
  if (p?.category === "sport") {
    const cap = p.capacity?.default ?? 20;
    return { visits: cap * 3, showers: cap * 3 * 0.7, days: 310 };
  }
  if (p?.category === "living") return { visits: 4, showers: 4, days: 365 };
  return { visits: 2, showers: 0, days: 200 };
}

const LIGHT_W: Partial<Record<RoomPurpose, number>> = { gym: 7, changing: 5, bathroom: 5, lobby: 5, office: 6, storage: 2, technical: 3 };
const TUBE_EVERY: Partial<Record<RoomPurpose, number>> = { gym: 16, changing: 12, bathroom: 8, lobby: 12, living: 14, kitchen: 10, hall: 10 };
/** Rooms never floor-heated: tatami blocks the floor (R ≈ 1 for 40 mm EVA), stores and boiler rooms take the losses */
const NO_UFH: RoomPurpose[] = ["storage", "technical", "garage", "poultry", "workshop"];

/** The roof slope that faces the sun best and how far it turns from south, degrees */
function pvSlope(b: Building, s: AutonomySettings): { slope: PvLayout["slope"]; off: number } {
  const az = ((s.azimuth % 360) + 360) % 360;
  const frontOff = Math.min(az, 360 - az);
  if (b.input.roof.type === "mono") return { slope: "front", off: frontOff };
  return { slope: frontOff <= 90 ? "front" : "back", off: Math.min(frontOff, 180 - frontOff) };
}

/** Plan band (z) of roof free of PV for light tubes */
function freeBand(b: Building, s: AutonomySettings): [number, number] {
  const W = b.input.width;
  if (!s.pv) return [-Infinity, Infinity];
  if (b.input.roof.type === "mono") return [W + 1, W + 1]; // one slope, all PV
  return pvSlope(b, s).slope === "front" ? [W / 2 + 300, Infinity] : [-Infinity, W / 2 - 300];
}

export function autonomy(b: Building, city: City, thermal: ThermalResult, rooms: Room[][], tariff: number, s: AutonomySettings, prices = AUTONOMY_PRICES): AutonomyResult {
  const { input } = b;
  const enabled = s.pv || s.battery || s.heatPump !== "none" || s.ufh || s.skylights || s.wind > 0 || s.genset || s.well || s.septic || s.evAc + s.evDc > 0;
  const occ = occupancy(b);
  const all = rooms.flat();
  const floorM2 = all.reduce((t, r) => t + r.area, 0);
  const sport = PRODUCTS.find((x) => x.id === input.productId)?.category === "sport";
  const notes: string[] = [];
  const items: PlantItem[] = [];
  const item = (key: string, qty: number, unit: PlantItem["unit"], cost: number) => {
    if (qty > 0) items.push({ key, qty, unit, cost });
  };

  // ── Skylights: light tubes pass between the trusses without cutting a chord ──
  // Ø530 needs the 559 mm clear gap of 600 mm centres; closer trusses take Ø350 (≈ 0.45 of the light each)
  let skylights: AutonomyResult["skylights"] = null;
  if (s.skylights && thermal.envelope.enclosed) {
    const clear = input.trussSpacing - 41; // C89 chords are 41 mm wide
    const diameter = clear >= 550 ? 530 : 350;
    const scale = diameter === 530 ? 1 : 0.45;
    const top = rooms[rooms.length - 1] ?? [];
    // With PV on a gable roof the tubes go through the other slope only
    const free = freeBand(b, s);
    const per = top
      .map((r) => {
        const [z0, z1] = [Math.max(r.z0, free[0]), Math.min(r.z1, free[1])];
        const area = z1 > z0 ? (r.area * (z1 - z0)) / (r.z1 - r.z0) : 0;
        return { key: r.key, count: TUBE_EVERY[r.purpose] && area > 4 ? Math.max(1, Math.round(area / (TUBE_EVERY[r.purpose]! * scale))) : 0, z0, z1 };
      })
      .filter((x) => x.count > 0);
    const count = per.reduce((t, x) => t + x.count, 0);
    skylights = { count, diameter, rooms: per, saving: 0.35 };
    item(diameter === 530 ? "lightTube" : "lightTube350", count, "pcs", count * (diameter === 530 ? prices.lightTube : prices.lightTube350));
  }

  // ── Annual use ──
  const hours = sport ? 14 : 6;
  const lit = all.reduce((t, r) => t + r.area * (LIGHT_W[r.purpose] ?? 4), 0) / 1000; // kW
  const daylit = skylights ? skylights.saving * 0.6 : 0; // tubes work in the daytime part of the hours
  const lighting = lit * hours * occ.days * (1 - daylit);
  const volume = thermal.envelope.volumeM3;
  // Mechanical supply/extract: 60 m³/h a person in a hall at a third of the capacity, at least 1 ACH; SFP 1.5 kW per m³/s
  const flow = Math.max(volume, sport ? (occ.visits / 3 / 3) * 60 * 3 : volume * 0.5) / 3600;
  const ventilation = thermal.insulated ? flow * 1.5 * hours * occ.days : 0;
  const equipment = (floorM2 * (sport ? 4 : 3) * hours * occ.days) / 1000 + (input.productId === "fitness" ? 2 * hours * occ.days : 0);
  const litres = occ.showers * 40 + occ.visits * 5; // mixed at 40 °C
  const dhwHeat = (litres * 30 * 1.163 * occ.days) / 1000; // kWh of heat
  // Heat pump efficiency follows the mean heating-season temperature (air) or the ground (≈ +5 °C)
  const scop = s.heatPump === "ground" ? 3.9 : s.heatPump === "air" ? Math.max(2.2, Math.min(3.6, 3.2 + 0.06 * city.tHt)) : 1;
  const heating = thermal.insulated ? thermal.seasonKwh / scop : 0;
  const hotWater = dhwHeat / (s.heatPump === "none" ? 0.95 : 2.6);
  const waterM3 = (litres * 1.25) / 1000; // + WC, cleaning
  const pumpKw = waterM3 > 8 ? 2.2 : 1.1;
  const water = s.well ? (waterM3 * occ.days * 0.5) : 0; // ≈ 0.5 kWh per m³ lifted 60 m with treatment
  // Average use of a public charger at a club: AC ≈ 2 h a day at 7 kW, DC ≈ 30 min at 50 kW
  const ev = (s.evAc * 7 * 2 + s.evDc * 50 * 0.5) * 300;
  const use = { heating, hotWater, lighting, ventilation, equipment, water, ev };
  const annualKwh = Object.values(use).reduce((t, v) => t + v, 0);

  // ── Heat pump ──
  let heatPump: AutonomyResult["heatPump"] = null;
  if (s.heatPump !== "none" && thermal.insulated) {
    const kw = Math.ceil((thermal.peakKw * 1.1 + (litres / 1000) * 1.5) * 2) / 2; // + DHW reheat
    // Air-to-water loses about 40 % at −25 °C: an electric backup covers the rest
    const backupKw = s.heatPump === "air" && city.t5 < -15 ? Math.ceil(kw * 0.4) : 0;
    const evap = kw * (1 - 1 / scop);
    const probeDepth = s.heatPump === "ground" ? Math.ceil((evap * 1000) / 45 / 10) * 10 : 0; // 45 W/m in dry clay-sand
    const probes = s.heatPump === "ground" ? Math.ceil(probeDepth / 100) : 0;
    heatPump = { kind: s.heatPump, kw, scop, backupKw, probes, probeDepth };
    item(s.heatPump === "ground" ? "heatPumpGround" : "heatPumpAir", kw, "kW", kw * (s.heatPump === "ground" ? prices.heatPumpGroundPerKw : prices.heatPumpAirPerKw));
    if (probeDepth) item("probes", probeDepth, "m", probeDepth * prices.probePerM);
    if (backupKw) item("backupHeater", backupKw, "kW", backupKw * prices.backupHeaterPerKw);
    if (s.heatPump === "ground") notes.push("probeSpacing");
  }
  const tankL = Math.max(200, Math.ceil((litres * 0.35) / 100) * 100); // the evening peak, 35 % of the day
  if (heatPump) item("dhwTank", tankL, "pcs", tankL * prices.dhwTankPerL);

  // ── Underfloor heating ──
  let ufh: AutonomyResult["ufh"] = null;
  if (s.ufh && thermal.insulated) {
    const excluded = all.filter((r) => NO_UFH.includes(r.purpose) || (r.purpose === "gym" && input.productId === "bjj")).map((r) => r.purpose);
    const heated = all.filter((r) => !NO_UFH.includes(r.purpose) && !(r.purpose === "gym" && input.productId === "bjj"));
    const areaM2 = heated.reduce((t, r) => t + r.area, 0);
    const pipeM = Math.ceil((areaM2 / 0.15) * 1.05);
    const loops = Math.max(1, Math.ceil(pipeM / 90));
    const manifolds = Math.max(1, Math.ceil(loops / 10));
    const share = floorM2 > 0 ? areaM2 / floorM2 : 0;
    const fluxWm2 = areaM2 > 0 ? (thermal.peakKw * 1000 * share) / areaM2 : 0;
    const dry = input.foundation.type !== "slab" || input.levels.length > 1;
    ufh = { areaM2, pipeM, loops, manifolds, fluxWm2, excluded: [...new Set(excluded)], dry };
    item("ufh", areaM2, "m2", areaM2 * prices.ufhPerM2);
    item("manifold", manifolds, "pcs", manifolds * prices.manifold);
    if (input.productId === "bjj") notes.push("tatami");
    if (fluxWm2 > 90) notes.push("ufhFlux");
    if (dry) notes.push("ufhDry");
  }

  // ── Peak electrical load ──
  const heatPeak = thermal.insulated ? (heatPump ? heatPump.kw / (s.heatPump === "air" ? 2 : 3.2) + heatPump.backupKw : thermal.peakKw) : 0;
  const evKw = s.evAc * 11 * 0.5 + s.evDc * 50; // dynamic load management halves the AC side
  const baseKw = heatPeak + lit + flow * 1.5 + floorM2 * 0.004 * (sport ? 2 : 1) + (s.well ? pumpKw : 0);
  const peakKw = Math.ceil((baseKw + evKw) * 10) / 10;

  // ── PV on the roof slope that faces the sun best ──
  let pv: AutonomyResult["pv"] = null;
  if (s.pv) {
    const { slope, off } = pvSlope(b, s);
    const mono = input.roof.type === "mono";
    const a = (input.roof.pitchDeg * Math.PI) / 180;
    const run = (mono ? input.width : input.width / 2) + input.roof.overhang;
    const along = run / Math.cos(a) - 700; // ridge and eaves margins
    const across = input.length + 2 * input.roof.overhang - 1000; // verge margins, fire paths
    const rows = Math.max(0, Math.floor(along / (PANEL.h + PANEL.gap)));
    const cols = Math.max(0, Math.floor(across / (PANEL.w + PANEL.gap)));
    const maxKwp = rows * cols * PANEL.kwp;
    // Orientation loss: ≈ 15 % at east/west; low pitches lose less
    const orient = 1 - 0.15 * Math.pow(Math.sin((off * Math.PI) / 180), 2) * Math.min(1, input.roof.pitchDeg / 25);
    const kWhPerKwp = yieldPerKwp(city) * orient;
    const need = s.grid ? annualKwh * 0.7 : annualKwh; // grid-tied: what can be used on site
    const want = s.pvKwp ?? need / kWhPerKwp;
    const kwp = Math.min(maxKwp, Math.ceil(want / PANEL.kwp) * PANEL.kwp);
    const count = Math.round(kwp / PANEL.kwp);
    pv = { slope, rows, cols, count, kwp, maxKwp, yieldKwh: kwp * kWhPerKwp, loadKpa: count ? 0.15 : 0 };
    item("pv", kwp, "kWp", kwp * prices.pvPerKwp);
    if (maxKwp < want) notes.push("roofFull");
    notes.push("pvLoad");
  }

  // ── Wind ──
  let wind: AutonomyResult["wind"] = null;
  if (s.wind > 0) {
    const v = windSpeed(city) * Math.pow(18 / 10, 0.2); // hub at 18 m
    const cf = Math.max(0, Math.min(0.3, 0.06 * (v - 2.5)));
    wind = { turbines: s.wind, kw: s.wind * 5, speed: v, yieldKwh: s.wind * 5 * 8760 * cf };
    item("wind", s.wind, "pcs", s.wind * prices.wind5kw);
    if (v < 4.5) notes.push("windWeak");
  }

  // ── Battery and inverter ──
  const daily = annualKwh / occ.days;
  const battery = s.battery ? { kwh: Math.ceil(((daily * 0.4) / 0.9) / 5) * 5 } : null;
  if (battery) item("battery", battery.kwh, "kWh", battery.kwh * prices.batteryPerKwh);
  const inverterKw = s.pv || s.battery || s.wind ? Math.ceil(Math.max(peakKw * (s.grid ? 0.6 : 1.1), (pv?.kwp ?? 0) * 0.9) / 5) * 5 : 0;
  if (inverterKw) item("inverter", inverterKw, "kW", inverterKw * prices.inverterPerKw);

  // ── Balance ──
  const produced = (pv?.yieldKwh ?? 0) + (wind?.yieldKwh ?? 0);
  // Without storage only daytime use takes the PV; a battery shifts most of the rest; winter is short of sun either way
  const usable = produced * (battery ? 0.85 : s.grid ? 0.55 : 0.5);
  const ownKwh = Math.min(annualKwh, usable);
  const gapKwh = annualKwh - ownKwh;
  const selfSufficiency = annualKwh > 0 ? ownKwh / annualKwh : 0;

  // ── Genset: the backup; off-grid it closes the whole gap ──
  let genset: AutonomyResult["genset"] = null;
  if (s.genset || !s.grid) {
    const STD = [10, 15, 20, 30, 40, 60, 80, 100, 150, 200];
    // Chargers are shed while the genset runs; motor starts and cos φ 0.8 on the rest
    const need = (baseKw * 1.25) / 0.8;
    const kva = STD.find((x) => x >= need) ?? Math.ceil(need / 50) * 50;
    const lph = kva * 0.8 * 0.75 * 0.27;
    const hoursPerYear = s.grid ? 72 : Math.ceil(gapKwh / (kva * 0.8 * 0.75));
    genset = { kva, litresPerHour: lph, tankL: Math.ceil((lph * 72) / 100) * 100, hoursPerYear, fuelL: hoursPerYear * lph };
    item("genset", kva * 0.8, "kW", kva * 0.8 * prices.gensetPerKw);
    if (!s.grid && !s.genset) notes.push("offGridGenset");
  }

  // ── Water and sewage ──
  let water_: AutonomyResult["water"] = null;
  if (s.well) {
    water_ = { m3PerDay: waterM3, wellDepth: s.wellDepth, pumpKw };
    item("well", s.wellDepth, "m", s.wellDepth * prices.wellPerM);
    item("wellPump", 1, "set", prices.wellPump);
    item("waterTreatment", 1, "set", prices.waterTreatment);
    notes.push("wellPermit");
  }
  let septic: AutonomyResult["septic"] = null;
  if (s.septic) {
    const pe = Math.max(5, Math.ceil(waterM3 / 0.2));
    septic = { pe };
    item("septic", pe, "pcs", pe * prices.septicPerPe);
  }
  const evRes = s.evAc + s.evDc > 0 ? { ac: s.evAc, dc: s.evDc, kw: s.evAc * 11 + s.evDc * 50 } : null;
  if (evRes) {
    item("evAc", s.evAc, "pcs", s.evAc * prices.evAc);
    item("evDc", s.evDc, "pcs", s.evDc * prices.evDc);
    if (s.evDc > 0 && !s.grid) notes.push("dcOffGrid");
  }

  const capex = items.reduce((t, x) => t + x.cost, 0);
  // Before: the same building on the grid with direct electric heating and no plant
  const baseline = annualKwh - heating - hotWater + (thermal.insulated ? thermal.seasonKwh : 0) + dhwHeat / 0.95 - water + (lighting * daylit) / Math.max(1e-9, 1 - daylit);
  const billBefore = baseline * tariff;
  const fuel = genset && !s.grid ? genset.fuelL * prices.diesel : 0;
  const billAfter = (s.grid ? gapKwh * tariff : 0) + fuel;
  const saving = billBefore - billAfter;
  const paybackYears = saving > 0 && capex > 0 ? capex / saving : null;

  return {
    enabled,
    people: { visitsPerDay: occ.visits, showersPerDay: occ.showers },
    use,
    annualKwh,
    peakKw,
    heatPump,
    ufh,
    dhw: { litresPerDay: litres, tankL },
    skylights,
    pv,
    battery,
    inverterKw,
    wind,
    genset,
    water: water_,
    septic,
    ev: evRes,
    ownKwh,
    selfSufficiency,
    gapKwh,
    items,
    capex,
    billBefore,
    billAfter,
    paybackYears,
    notes,
  };
}
