import { describe, expect, it } from "vitest";
import { generateBuilding } from "../buildings/generate";
import { productInput } from "../catalog/products";
import { analyze, DEFAULT_SETTINGS } from "../planner/analyze";
import { ru } from "@/i18n/ru";
import { AUTONOMY_OFF } from "../energy/autonomy";
import { baysFor, SITE_KINDS, SITE_OFF, sitePlan, type Rect } from "./site";

const prices = { steelPerKg: 850, scrapPct: 3, fastenerEach: 15, boltEach: 400 };
const overlap = (a: Rect, b: Rect) => a.x0 < b.x1 - 1 && b.x0 < a.x1 - 1 && a.z0 < b.z1 - 1 && b.z0 < a.z1 - 1;

describe("site plan", () => {
  const b = generateBuilding(productInput("bjj"));
  const p = sitePlan(b, { ...SITE_OFF, enabled: true }, 3);

  it("parks a club: 1 bay per 3 people of a session + staff, ≥ 10 % accessible, EV bays", () => {
    expect(baysFor("bjj")).toBe(Math.ceil(40 / 3) + 2);
    expect(p.quantities.bays).toBe(baysFor("bjj"));
    expect(p.quantities.accessible).toBeGreaterThanOrEqual(Math.ceil(p.quantities.bays * 0.1));
    expect(p.quantities.ev).toBe(3);
    for (const x of p.bays) {
      expect(x.z1 - x.z0).toBeCloseTo(5300);
      expect(x.x1 - x.x0).toBeCloseTo(x.kind === "accessible" ? 3600 : 2500);
    }
  });

  it("keeps bays off each other and off the building, inside the plot", () => {
    const building = { x0: 0, z0: 0, x1: b.input.length, z1: b.input.width };
    p.bays.forEach((x, i) => {
      expect(overlap(x, building)).toBe(false);
      for (const y of p.bays.slice(i + 1)) expect(overlap(x, y)).toBe(false);
      expect(x.x0 >= p.plot.x0 && x.x1 <= p.plot.x1 && x.z0 >= p.plot.z0).toBe(true);
    });
  });

  it("paves a walkway round the building to every exit", () => {
    const { length: L, width: W } = b.input;
    const covers = (x: number, z: number) => p.paving.some((r) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1);
    expect(covers(L / 2, W + 700)).toBe(true); // back
    expect(covers(L + 700, W / 2)).toBe(true); // right end
    expect(covers(-700, W / 2)).toBe(true); // left end
    expect(covers(L / 2, -1000)).toBe(true); // entrance apron
  });

  it("costs what it lists and counts editor items", () => {
    const withItems = sitePlan(b, { ...SITE_OFF, enabled: true, items: [{ id: "a", kind: "bench", x: 0, z: -2000, rot: 0 }, { id: "b", kind: "tree", x: 5000, z: -20000, rot: 0 }] });
    expect(withItems.lines.find((l) => l.key === "bench")!.qty).toBe(1);
    expect(withItems.quantities.trees).toBe(p.quantities.trees + 1);
    expect(withItems.cost).toBeCloseTo(withItems.lines.reduce((t, l) => t + l.qty * l.price, 0), 0);
    expect(p.quantities.lawnM2).toBeGreaterThan(0);
  });

  it("goes into the estimate only when switched on; every label is translated", () => {
    const off = analyze(productInput("bjj"), DEFAULT_SETTINGS, prices);
    expect(off.site).toBeNull();
    expect(off.estimate.sections.some((s) => s.id === "site")).toBe(false);
    const on = analyze(productInput("bjj"), { ...DEFAULT_SETTINGS, autonomy: AUTONOMY_OFF, site: { ...SITE_OFF, enabled: true } }, prices);
    const sec = on.estimate.sections.find((s) => s.id === "site")!;
    expect(sec.total).toBeCloseTo(on.site!.cost, -1);
    const keys = new Set(Object.keys(ru));
    for (const l of sec.lines) expect(keys.has(`est.${l.id}`), l.id).toBe(true);
    for (const k of [...SITE_KINDS, "erase"]) expect(keys.has(`site.kind.${k}`), k).toBe(true);
    expect(keys.has("estsec.site")).toBe(true);
  });
});
