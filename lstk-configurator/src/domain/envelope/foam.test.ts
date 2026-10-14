import { describe, expect, it } from "vitest";
import { productInput } from "../catalog/products";
import { analyze, DEFAULT_SETTINGS } from "../planner/analyze";
import { ru } from "@/i18n/ru";
import { estLabel } from "@/features/documents/estimateLabels";
import { FOAM, FOAM_GRADES, foamR, wallLineLoad } from "./foamConcrete";

const prices = { steelPerKg: 850, scrapPct: 3, fastenerEach: 15, boltEach: 400 };
const run = (grade: 0 | 150 | 300 | 600, thickness = 200, id = "house") => analyze(productInput(id), { ...DEFAULT_SETTINGS, wallFill: { grade, thickness } }, prices);
const wall = (a: ReturnType<typeof analyze>) => a.thermal.assemblies.find((x) => x.element === "wall")!;

describe("foam concrete wall fill", () => {
  it("lighter grades insulate better and are weaker", () => {
    for (let i = 1; i < FOAM_GRADES.length; i++) {
      const [a, b] = [FOAM[FOAM_GRADES[i - 1]!], FOAM[FOAM_GRADES[i]!]];
      expect(b.lambda).toBeGreaterThan(a.lambda);
      expect(b.strength).toBeGreaterThan(a.strength);
    }
  });

  it("steel bridges a light fill relatively more than a heavy one", () => {
    const loss = (g: 150 | 600) => foamR(FOAM[g], 89, 89, 0.55) / (0.089 / FOAM[g].lambda);
    expect(loss(150)).toBeLessThan(loss(600));
    expect(loss(600)).toBeLessThan(1);
  });

  it("replaces the cavity wool and vapour barrier in the walls, needs less external insulation the lighter it is", () => {
    const d150 = wall(run(150, 250));
    const d600 = wall(run(600, 250));
    expect(d150.layers.some((l) => l.key === "foam.D150")).toBe(true);
    expect(d150.layers.some((l) => l.key === "cavityWool" || l.key === "vapour")).toBe(false);
    expect(d150.added).toBeLessThanOrEqual(d600.added);
    for (const w of [d150, d600]) expect(w.ok).toBe(true);
  });

  it("costs, weighs and loads the foundation; screw piles get closer", () => {
    const wool = run(0);
    const foam = run(600, 250);
    expect(foam.thermal.foam!.m3).toBeGreaterThan(5);
    expect(foam.thermal.foam!.massKg).toBeCloseTo(foam.thermal.foam!.m3 * 660, 0);
    expect(wallLineLoad({ grade: 600, thickness: 250 }, 2700)).toBeGreaterThan(4);
    if (wool.foundation.type === "screw-piles") expect(foam.foundation.piles).toBeGreaterThan(wool.foundation.piles);
    expect(foam.foundation.notes).toContain("foamLoad");
    const lines = foam.estimate.sections.flatMap((s) => s.lines.map((l) => l.id));
    expect(lines).toEqual(expect.arrayContaining(["foam.D600", "csp"]));
    expect(lines).not.toContain("sheathing9");
  });

  it("every new label and layer is translated", () => {
    const keys = new Set(Object.keys(ru));
    for (const g of FOAM_GRADES) {
      const a = analyze(productInput("bjj"), { ...DEFAULT_SETTINGS, wallFill: { grade: g, thickness: 200 } }, prices);
      for (const l of a.estimate.sections.flatMap((s) => s.lines)) expect(estLabel(l.id, (k) => (keys.has(k) ? "ok" : `MISSING:${k}`))).not.toMatch(/MISSING/);
      for (const l of wall(a).layers) expect(keys.has(`layer.${l.key}`), l.key).toBe(true);
    }
  });
});
