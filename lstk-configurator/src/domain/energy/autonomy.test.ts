import { describe, expect, it } from "vitest";
import { productInput } from "../catalog/products";
import { findCity } from "../climate/cities";
import { analyze, DEFAULT_SETTINGS } from "../planner/analyze";
import { ru } from "@/i18n/ru";
import { AUTONOMY_MAX, AUTONOMY_OFF, autonomyPreset, type AutonomySettings } from "./autonomy";

const prices = { steelPerKg: 850, scrapPct: 3, fastenerEach: 15, boltEach: 400 };
const run = (id: string, autonomy: AutonomySettings, city = "astana", over: object = {}) => analyze({ ...productInput(id), ...over }, { ...DEFAULT_SETTINGS, cityId: city, autonomy }, prices);

describe("energy and autonomy", () => {
  it("is off by default: no plant, no estimate section", () => {
    const a = run("bjj", AUTONOMY_OFF);
    expect(a.autonomy.enabled).toBe(false);
    expect(a.autonomy.items).toEqual([]);
    expect(a.estimate.sections.some((s) => s.id === "energy")).toBe(false);
  });

  const max = run("bjj", autonomyPreset("bjj", findCity("astana")), "astana", { trussSpacing: 500 });
  const x = max.autonomy;

  it("sizes the plant of the BJJ centre and prices it in the estimate", () => {
    expect(x.enabled).toBe(true);
    expect(x.pv!.kwp).toBeLessThanOrEqual(x.pv!.maxKwp + 1e-9);
    expect(x.pv!.count).toBeGreaterThan(30);
    expect(x.heatPump!.kind).toBe("ground");
    expect(x.heatPump!.kw).toBeGreaterThanOrEqual(max.thermal.peakKw);
    expect(x.heatPump!.probeDepth).toBeGreaterThan(0);
    expect(x.skylights!.count).toBeGreaterThan(15);
    expect(x.genset!.kva).toBeGreaterThan(0);
    expect(x.selfSufficiency).toBeGreaterThan(0.2);
    expect(x.selfSufficiency).toBeLessThanOrEqual(1);
    expect(x.capex).toBeCloseTo(x.items.reduce((s, i) => s + i.cost, 0), 0);
    expect(max.estimate.sections.find((s) => s.id === "energy")!.total).toBeCloseTo(x.capex, -1);
    expect(x.billAfter).toBeLessThan(x.billBefore);
  });

  it("keeps floor heating out from under the tatami and says why", () => {
    expect(x.ufh!.excluded).toContain("gym");
    expect(x.notes).toContain("tatami");
    expect(x.ufh!.areaM2).toBeLessThan(150);
  });

  it("PV loads the roof: at 600 mm trusses the BJJ roof fails and says so, at 500 it passes", () => {
    const at600 = run("bjj", { ...AUTONOMY_OFF, pv: true });
    expect(at600.design.worst).toBeGreaterThan(1);
    expect(at600.autonomy.notes).toContain("pvTruss");
    expect(max.design.worst).toBeLessThanOrEqual(1);
  });

  it("off the grid the genset closes the gap even if it was not ticked", () => {
    const off = run("house", { ...AUTONOMY_OFF, pv: true, battery: true, grid: false });
    expect(off.autonomy.genset).not.toBeNull();
    expect(off.autonomy.genset!.hoursPerYear).toBeGreaterThan(0);
    expect(off.autonomy.notes).toContain("offGridGenset");
  });

  it("wind is left out of the preset where it does not blow", () => {
    expect(autonomyPreset("bjj", findCity("almaty")).wind).toBe(0);
    expect(autonomyPreset("bjj", findCity("aktau")).wind).toBe(1);
  });

  it("every item, use and note is translated", () => {
    const keys = new Set(Object.keys(ru));
    const all = run("house", { ...AUTONOMY_MAX, grid: false, heatPump: "air", evDc: 1 }, "astana");
    for (const r of [x, all.autonomy]) {
      for (const i of r.items) expect(keys.has(`est.auto.${i.key}`), i.key).toBe(true);
      for (const n of r.notes) expect(keys.has(`auto.note.${n}`), n).toBe(true);
      for (const u of Object.keys(r.use)) expect(keys.has(`auto.use.${u}`), u).toBe(true);
    }
    for (const u of new Set([...x.items, ...all.autonomy.items].map((i) => i.unit))) expect(keys.has(`eu.${u}`), u).toBe(true);
  });
});
