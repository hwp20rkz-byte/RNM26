import { describe, expect, it } from "vitest";
import { isSelfIntersecting, polylineLength, signedArea } from "../geometry/polyline";
import { PROFILE_CATALOG, findProfile } from "./catalog";
import { designation, sectionGeometry, sectionParts, sectionProperties, validateProfile } from "./section";
import type { CSpec, USpec } from "./types";

const bbox = (pts: { x: number; y: number }[]) => ({
  minX: Math.min(...pts.map((p) => p.x)),
  maxX: Math.max(...pts.map((p) => p.x)),
  minY: Math.min(...pts.map((p) => p.y)),
  maxY: Math.max(...pts.map((p) => p.y)),
});

describe("sectionGeometry — every catalogue profile", () => {
  it.each(PROFILE_CATALOG.map((p) => [p.id, p] as const))("%s: valid, closed, CCW, not self-intersecting", (_id, spec) => {
    const g = sectionGeometry(spec);
    expect(g.outline.length).toBeGreaterThan(8);
    expect(signedArea(g.outline)).toBeGreaterThan(0);
    expect(isSelfIntersecting(g.outline)).toBe(false);
  });

  it.each(PROFILE_CATALOG.map((p) => [p.id, p] as const))("%s: area equals thickness × developed width", (_id, spec) => {
    // Offsetting a strip by ±t/2 around its centreline gives exactly t·L when every
    // bend radius on the centreline exceeds t/2 — a strong check of fillet + offset.
    const g = sectionGeometry(spec);
    const expected = spec.thickness * polylineLength(g.centreline);
    expect(signedArea(g.outline)).toBeCloseTo(expected, 1);
  });
});

describe("out-to-out dimensions match the designation", () => {
  it("C150×50×13×1.5", () => {
    const b = bbox(sectionGeometry(findProfile("C150x50x13x1.5")).outline);
    expect(b.maxY - b.minY).toBeCloseTo(150, 6);
    expect(b.maxX - b.minX).toBeCloseTo(50, 6);
    // lip: from outer flange face down to lip tip
    const g = sectionGeometry(findProfile("C150x50x13x1.5"));
    const lipTip = Math.min(...g.outline.filter((p) => p.x > 40 && p.y > 0).map((p) => p.y));
    expect(b.maxY - lipTip).toBeCloseTo(13, 6);
  });

  it("U152×40×1.2", () => {
    const b = bbox(sectionGeometry(findProfile("U152x40x1.2")).outline);
    expect(b.maxY - b.minY).toBeCloseTo(152, 6);
    expect(b.maxX - b.minX).toBeCloseTo(40, 6);
  });

  it("Z200×60×18×2 — flanges on opposite sides", () => {
    const b = bbox(sectionGeometry(findProfile("Z200x60x18x2")).outline);
    expect(b.maxY - b.minY).toBeCloseTo(200, 6);
    expect(b.maxX).toBeCloseTo(60 - 1, 6);
    expect(b.minX).toBeCloseTo(-(60 - 1), 6);
  });

  it("Hat 40×45×20×1", () => {
    const b = bbox(sectionGeometry(findProfile("H40x45x20x1")).outline);
    expect(b.minY).toBeCloseTo(0, 6);
    expect(b.maxY).toBeCloseTo(40, 6);
    expect(b.maxX - b.minX).toBeCloseTo(45 + 2 * 20, 6);
  });
});

describe("sectionProperties", () => {
  it("matches the hand calculation for a U with zero inside radius", () => {
    // Zero inside radius still leaves the outside corner rounded with r = t
    // (sheet cannot fold to a knife edge): each corner loses (1 − π/4)·t² vs rectangles.
    const t = 2;
    const spec: USpec = { id: "u", family: "U", web: 100, flange: 50, thickness: t, innerRadius: 0, coatingGsm: 0, grade: "" };
    const p = sectionProperties(spec);
    const rectangles = 100 * t + 2 * 48 * t;
    // tolerance covers chord loss of the arc discretisation (15° segments)
    expect(p.area).toBeCloseTo(rectangles - 2 * (1 - Math.PI / 4) * t * t, 1);
    // Ix of the rectangle model minus the two rounded-off corners (≈ (1 − π/4)·t² each at y ≈ 49.5)
    const ixRect = (t * 100 ** 3) / 12 + 2 * ((48 * t ** 3) / 12 + 48 * t * 49 ** 2);
    const ix = ixRect - 2 * (1 - Math.PI / 4) * t * t * 49.5 ** 2;
    expect(Math.abs(p.ix - ix) / ix).toBeLessThan(1e-3);
    expect(p.centroid.y).toBeCloseTo(0, 9);
  });

  it("C is symmetric about its x-axis; centroid sits between web and flange tips", () => {
    const p = sectionProperties(findProfile("C200x50x15x2"));
    expect(p.centroid.y).toBeCloseTo(0, 6);
    expect(p.centroid.x).toBeGreaterThan(0);
    expect(p.centroid.x).toBeLessThan(25);
    expect(p.ix).toBeGreaterThan(p.iy);
  });

  it("mass per metre: area × ρ, plus zinc", () => {
    const spec = findProfile("C150x50x13x1.5");
    const p = sectionProperties(spec);
    expect(p.steelMassPerM).toBeCloseTo(p.area * 7.85e-3, 9);
    expect(p.massPerM - p.steelMassPerM).toBeCloseTo(0.275 * (p.developedWidth / 1000), 9);
    // Plausibility: a C150×50×13×1.5 is ~3.2–3.4 kg/m in manufacturers' tables
    expect(p.massPerM).toBeGreaterThan(3.0);
    expect(p.massPerM).toBeLessThan(3.6);
  });
});

describe("validation", () => {
  it("rejects a lip shorter than the bend allows", () => {
    const bad: CSpec = { ...(findProfile("C150x50x13x1.5") as CSpec), lip: 1 };
    expect(validateProfile(bad).length).toBeGreaterThan(0);
    expect(() => sectionGeometry(bad)).toThrow(/Отгиб/);
  });

  it("rejects a swage wider than the flat web", () => {
    const bad: CSpec = { ...(findProfile("C89x41x11x0.95") as CSpec), swage: { width: 90, depth: 2 } };
    expect(() => sectionGeometry(bad)).toThrow(/рифт/);
  });

  it("formats designations", () => {
    expect(designation(findProfile("C150x50x13x1.5"))).toBe("C150×50×13×1,5");
    expect(designation(findProfile("C89x41x11x0.95"))).toBe("C89×41×11×0,95");
    const swaged: CSpec = { ...(findProfile("C89x41x11x0.95") as CSpec), swage: { width: 18, depth: 2.5 } };
    expect(designation(swaged)).toBe("C89×41×11×0,95 (рифт)");
  });
});

describe("sectionParts", () => {
  it("web plate + flange strips add up to the full section area", () => {
    for (const id of ["C150x50x13x1.5", "U152x40x1.2", "Z200x60x18x2"]) {
      const spec = findProfile(id);
      const parts = sectionParts(spec)!;
      const restArea = parts.rest.reduce((a, o) => a + signedArea(o), 0);
      const webArea = (parts.web.yMax - parts.web.yMin) * spec.thickness;
      expect(restArea + webArea).toBeCloseTo(sectionProperties(spec).area, 6);
    }
  });

  it("hat sections have no flat web plate", () => {
    expect(sectionParts(findProfile("H40x45x20x1"))).toBeNull();
  });
});
