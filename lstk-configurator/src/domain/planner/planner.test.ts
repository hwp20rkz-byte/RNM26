import { describe, expect, it } from "vitest";
import { generateBuilding } from "../buildings/generate";
import { PRODUCTS, productInput } from "../catalog/products";
import { CITIES, degreeDays, findCity, requiredR } from "../climate/cities";
import { envelope } from "../envelope/geometry";
import { thermal, type ThermalOptions } from "../envelope/insulation";
import { foundation } from "../foundation/foundation";
import { interior, rooms, validatePartitions } from "../layout/rooms";
import { coopLength, coopPlan } from "../livestock/coop";
import { planDelivery } from "../logistics/delivery";
import { mep } from "../mep/mep";
import { productionEnergy, linePower } from "../production/energy";
import { GOLDEN_INTEGRITY_C89 } from "../machines/golden-integrity-c89";
import { analyze, DEFAULT_SETTINGS } from "./analyze";

const prices = { steelPerKg: 850, scrapPct: 3, fastenerEach: 15, boltEach: 400 };
const opts = (cityId: string, patch: Partial<ThermalOptions> = {}): ThermalOptions => ({
  city: findCity(cityId),
  heating: "permanent",
  material: "wool",
  level: "norm",
  windowR: 0.7,
  airChanges: 0.5,
  recovery: 0,
  ...patch,
});

describe("climate", () => {
  it("36 cities, unique ids, three names each, plausible ranges", () => {
    expect(CITIES.length).toBeGreaterThanOrEqual(35);
    expect(new Set(CITIES.map((c) => c.id)).size).toBe(CITIES.length);
    for (const c of CITIES) {
      expect(c.name.ru && c.name.kk && c.name.zh).toBeTruthy();
      expect(c.t5).toBeLessThan(-10);
      expect(c.t5).toBeGreaterThan(-45);
      expect(c.tHt).toBeGreaterThan(c.t5);
      expect(c.z).toBeGreaterThan(100);
    }
  });
  it("ГСОП and the norm: Astana wall ≈ 3.5 m²K/W", () => {
    const g = degreeDays(findCity("astana"), 20);
    expect(g).toBeCloseTo((20 + 8.1) * 215, 6);
    expect(requiredR("wall", g)).toBeCloseTo(0.00035 * g + 1.4, 9);
    expect(requiredR("wall", g)).toBeGreaterThan(3.4);
  });
});

describe("insulation", () => {
  const b = generateBuilding(productInput("house"));
  it("colder city → thicker external layer; every element meets the norm", () => {
    const cold = thermal(b, opts("oskemen"));
    const warm = thermal(b, opts("shymkent"));
    const w = (r: typeof cold) => r.assemblies.find((a) => a.element === "wall")!;
    expect(w(cold).added).toBeGreaterThanOrEqual(w(warm).added);
    for (const a of [...cold.assemblies, ...warm.assemblies]) expect(a.ok).toBe(true);
  });
  it("steel bridging: cavity wool alone does not meet the Astana norm", () => {
    const r = thermal(b, opts("astana"));
    const wall = r.assemblies.find((a) => a.element === "wall")!;
    expect(wall.added).toBeGreaterThan(0);
    const cavity = wall.layers.find((l) => l.key === "cavityWool")!;
    expect(cavity.r).toBeLessThan((89 / 1000 / 0.04) * 0.6);
  });
  it("PIR needs a thinner layer than wool for the same target", () => {
    const wool = thermal(b, opts("astana")).assemblies.find((a) => a.element === "wall")!;
    const pir = thermal(b, opts("astana", { material: "pir" })).assemblies.find((a) => a.element === "wall")!;
    expect(pir.added).toBeLessThanOrEqual(wool.added);
  });
  it("heat-recovery ventilation cuts the ventilation loss by its efficiency", () => {
    const nat = thermal(b, opts("astana"));
    const rec = thermal(b, opts("astana", { recovery: 0.75 }));
    expect(rec.hVentilation).toBeCloseTo(nat.hVentilation * 0.25, 6);
    expect(rec.peakKw).toBeLessThan(nat.peakKw);
  });
  it("unheated or open buildings are not insulated", () => {
    expect(thermal(generateBuilding(productInput("garage")), opts("astana", { heating: "none" })).insulated).toBe(false);
    expect(thermal(generateBuilding(productInput("carport1")), opts("astana")).insulated).toBe(false);
  });
});

describe("envelope and rooms", () => {
  it("gable roof area = 2 × (half-span slope + overhang) × (length + 2 overhangs)", () => {
    const b = generateBuilding(productInput("house"));
    const e = envelope(b);
    const a = (25 * Math.PI) / 180;
    expect(e.roofM2).toBeCloseTo(2 * (4 / Math.cos(a) + 0.45) * (10 + 0.9), 6);
    expect(e.enclosed).toBe(true);
  });
  it("rooms tile the interior minus partition thickness", () => {
    const input = productInput("house");
    const inner = interior(input, 89);
    const rs = rooms(input.levels[0]!, inner, 89);
    expect(rs).toHaveLength(6);
    const clear = ((inner.x1 - inner.x0) * (inner.z1 - inner.z0)) / 1e6;
    const parts = (2 * 89 * (inner.z1 - inner.z0) + 89 * (inner.x1 - inner.x0)) / 1e6;
    expect(rs.reduce((s, r) => s + r.area, 0)).toBeCloseTo(clear - parts + (2 * 89 * 89) / 1e6, 6);
  });
  it("a room narrower than 0.9 m is rejected", () => {
    const input = productInput("dacha");
    input.levels[0]!.partitions[0]!.at = 600;
    expect(validatePartitions(input.levels[0]!, interior(input, 89), 89).length).toBeGreaterThan(0);
  });
});

describe("MEP", () => {
  const b = generateBuilding(productInput("house"));
  const rs = envelope(b).rooms;
  const m = mep(b, rs, 6);
  it("no sockets in the steam room; wet rooms get an RCD; grommets ≈ cable metres", () => {
    const bath = generateBuilding(productInput("bath"));
    const r = mep(bath, envelope(bath).rooms, 0);
    expect(r.rooms.find((x) => x.room.purpose === "steam")!.sockets).toBe(0);
    expect(r.rcds).toBeGreaterThanOrEqual(2);
    expect(m.grommets).toBe(Math.ceil(m.cable15M + m.cable25M + m.cable6M));
  });
  it("demand ≤ installed; heating counted in full", () => {
    expect(m.demandKw).toBeLessThanOrEqual(m.installedKw + 1e-9);
    expect(m.demandKw).toBeGreaterThanOrEqual(6);
    expect(m.waterPoints).toBe(4); // kitchen sink + WC, basin, shower
  });
});

describe("coop sizing", () => {
  it("4 birds/m², 1 nest per 5 hens, 25 cm of perch per bird", () => {
    const c = coopPlan(20);
    expect(c.floorM2).toBe(5);
    expect(c.nests).toBe(4);
    expect(c.perchM).toBe(5);
    expect(coopLength(20, 2400, 89) * (2400 - 178)).toBeGreaterThanOrEqual(5e6);
  });
});

describe("foundation", () => {
  it("screw piles go below the freezing depth; colder city → longer piles", () => {
    const b = generateBuilding({ ...productInput("house"), foundation: { type: "screw-piles", plinth: 400 } });
    const astana = foundation(b, findCity("astana"));
    const shym = foundation(b, findCity("shymkent"));
    expect(astana.pileLength).toBeGreaterThanOrEqual(1900 + 300 + 400);
    expect(astana.pileLength).toBeGreaterThan(shym.pileLength);
    expect(astana.piles).toBeGreaterThan(10);
  });
  it("deep frost: the strip becomes a shallow insulated strip", () => {
    const b = generateBuilding(productInput("house"));
    expect(foundation(b, findCity("astana")).notes).toContain("shallowStrip");
    expect(foundation(b, findCity("almaty")).stripDepth).toBe(800);
  });
});

describe("production energy", () => {
  it("line power is read from the offer: 14.5 kW", () => {
    expect(linePower(GOLDEN_INTEGRITY_C89)).toBe(14.5);
  });
  it("cost = kWh × tariff; 48 ₸ by default", () => {
    const a = analyze(productInput("house"), DEFAULT_SETTINGS, prices);
    expect(a.energy.cost).toBeCloseTo(a.energy.kWh * 48, 6);
    const e2 = productionEnergy(a.bom, a.energy.stops - a.bom.totals.pieces, { ...DEFAULT_SETTINGS, ...{ tariff: 96, linePowerKw: 14.5, loadFactor: 0.6, secondsPerStop: 1.2, speed: 50, assemblyKw: 1.5, assemblyHoursPerT: 40, shopKw: 3 } });
    expect(e2.cost).toBeCloseTo(e2.kWh * 96, 6);
  });
});

describe("delivery", () => {
  it("picks the cheapest vehicle that fits; long items need a long bed", () => {
    const d = planDelivery([{ key: "x", massKg: 1000, volumeM3: 3, longest: 9000, widest: 1000 }], 100, false);
    expect(d.best!.vehicle.bedLength + 1000).toBeGreaterThanOrEqual(9000);
    const small = planDelivery([{ key: "x", massKg: 500, volumeM3: 2, longest: 3000, widest: 1000 }], 100, false);
    expect(small.best!.vehicle.id).toBe("gazelle");
  });
  it("heavier cargo → more trips", () => {
    const d = planDelivery([{ key: "x", massKg: 30000, volumeM3: 10, longest: 6000, widest: 1000 }], 10, false);
    for (const o of d.options.filter((x) => x.fits)) expect(o.trips).toBeGreaterThanOrEqual(Math.ceil(30000 / o.vehicle.payloadKg));
  });
});

describe("analyze: every product", () => {
  it.each(PRODUCTS.map((p) => p.id))("%s: positive cost lines, a vehicle, price = cost × (1 + margin)", (id) => {
    const a = analyze(productInput(id), DEFAULT_SETTINGS, prices);
    for (const l of a.lines) expect(l.amount, l.key).toBeGreaterThan(0);
    expect(a.cost).toBeCloseTo(a.lines.reduce((s, l) => s + l.amount, 0), 4);
    expect(a.price).toBeCloseTo(a.cost * 1.2, 4);
    expect(a.delivery.best).not.toBeNull();
    expect(a.delivery.massKg).toBeGreaterThan(a.bom.totals.massKg);
    expect(a.lines.some((l) => l.key === "electricity")).toBe(true);
  });
});
