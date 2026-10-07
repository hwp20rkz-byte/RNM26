import { describe, expect, it } from "vitest";
import { worldMembers } from "../assemblies/types";
import { PRODUCTS, productInput } from "../catalog/products";
import { memberOnMachine } from "../machines/check";
import { GOLDEN_INTEGRITY_C89 } from "../machines/golden-integrity-c89";
import { validateFeatures } from "../members/member";
import { FLOOR_TRUSS_DEPTH, evenStations, generateBuilding, levelBases, sideOpenings, wallPlans } from "./generate";

const bounds = (pts: { x: number; y: number; z: number }[]) => ({
  min: { x: Math.min(...pts.map((p) => p.x)), y: Math.min(...pts.map((p) => p.y)), z: Math.min(...pts.map((p) => p.z)) },
  max: { x: Math.max(...pts.map((p) => p.x)), y: Math.max(...pts.map((p) => p.y)), z: Math.max(...pts.map((p) => p.z)) },
});

describe("every catalogue product", () => {
  it.each(PRODUCTS.map((p) => p.id))("%s: builds, every member valid and makeable on the C89 line", (id) => {
    const b = generateBuilding(productInput(id));
    const members = worldMembers(b.assemblies);
    expect(members.length).toBeGreaterThan(40);
    expect(new Set(members.map((m) => m.id)).size).toBe(members.length);
    for (const m of members) {
      expect(validateFeatures(m), m.id).toEqual([]);
      expect(memberOnMachine(m, GOLDEN_INTEGRITY_C89).filter((i) => i.level === "error"), m.id).toEqual([]);
    }
  });
});

describe("one-storey house on a strip foundation", () => {
  const input = productInput("house");
  const b = generateBuilding(input);
  const d = 89;
  const walls = b.assemblies.filter((a) => a.kind === "wall" && a.mark.startsWith("W"));

  it("level 1 stands on ground-floor trusses laid on the plinth", () => {
    expect(b.groundFloor).toBe(true);
    expect(b.levels[0]!.base).toBe(input.foundation.plinth + FLOOR_TRUSS_DEPTH);
    expect(b.assemblies.filter((a) => a.mark === "FT1")).toHaveLength(b.floorPositions.length);
  });

  it("four outer walls inside length × width, from the level base to its height", () => {
    expect(walls.map((w) => w.mark)).toEqual(["W1", "W2", "W3", "W4"]);
    const bb = bounds(worldMembers(walls).flatMap((m) => [m.start, m.end]));
    expect(bb.min.x).toBeGreaterThanOrEqual(-1e-6);
    expect(bb.max.x).toBeLessThanOrEqual(input.length + 1e-6);
    expect(bb.min.z).toBeGreaterThanOrEqual(-1e-6);
    expect(bb.max.z).toBeLessThanOrEqual(input.width + 1e-6);
    const base = b.levels[0]!.base;
    expect(bb.max.y).toBeCloseTo(base + input.levels[0]!.height - 0.95 / 2, 6);
  });

  it("end walls fit between the long walls", () => {
    expect(wallPlans(input, 0).find((p) => p.side === "left")!.length).toBe(input.width - 2 * d);
  });

  it("trusses: spacing ≤ requested, on the top plates", () => {
    expect(b.trussPositions[0]).toBe(50);
    expect(b.trussPositions.at(-1)).toBe(input.length - 50);
    const gaps = b.trussPositions.slice(1).map((x, i) => x - b.trussPositions[i]!);
    for (const g of gaps) expect(g).toBeLessThanOrEqual(input.trussSpacing + 1e-9);
    const chords = worldMembers(b.assemblies.filter((a) => a.mark === "T1")).filter((m) => m.role === "bottom-chord");
    for (const m of chords) expect(m.start.y).toBeCloseTo(b.roofBase, 6);
  });

  it("partitions become panels P1.k between the outer walls", () => {
    const parts = b.assemblies.filter((a) => a.mark.startsWith("P1."));
    // 2 cross partitions + 1 long one cut into 3 segments
    expect(parts).toHaveLength(5);
    const pts = worldMembers(parts).flatMap((m) => [m.start, m.end]);
    const bb = bounds(pts);
    expect(bb.min.x).toBeGreaterThanOrEqual(d - 1e-6);
    expect(bb.max.x).toBeLessThanOrEqual(input.length - d + 1e-6);
  });

  it("an invalid opening names the level and wall", () => {
    const bad = productInput("house");
    bad.levels[0]!.sides.left.openings = [{ id: "x", kind: "window", x: 10, width: 900, height: 900, sill: 900 }];
    expect(() => generateBuilding(bad)).toThrow(/Этаж 1, стена W3: .*близко к началу/);
  });
});

describe("levels and plinth", () => {
  it("screw piles: plinth + floor trusses under level 1; floor trusses between levels", () => {
    const input = productInput("house2");
    input.foundation = { type: "screw-piles", plinth: 600 };
    expect(levelBases(input)).toEqual([600 + FLOOR_TRUSS_DEPTH, 600 + FLOOR_TRUSS_DEPTH + input.levels[0]!.height + FLOOR_TRUSS_DEPTH]);
    const b = generateBuilding(input);
    expect(b.assemblies.some((a) => a.mark === "FT1")).toBe(true);
    expect(b.assemblies.some((a) => a.mark === "FT2")).toBe(true);
    const marks = new Set(b.assemblies.filter((a) => a.kind === "wall").map((a) => a.mark));
    for (const m of ["W1", "W4", "W5", "W8"]) expect(marks.has(m)).toBe(true);
  });

  it("a slab carries level 1 directly; no ground-floor trusses", () => {
    const input = productInput("garage");
    const b = generateBuilding(input);
    expect(b.levels[0]!.base).toBe(input.foundation.plinth);
    expect(b.assemblies.some((a) => a.mark === "FT1")).toBe(false);
  });

  it("open sides above level 1 are rejected", () => {
    const input = productInput("house2");
    input.levels[1]!.sides.front.type = "open";
    expect(() => generateBuilding(input)).toThrow(/только на первом этаже/);
  });
});

describe("half and open sides", () => {
  const input = productInput("gazebo");
  const p = generateBuilding(input).profile;
  it("open side: full-height bays between posts no wider than the post spacing", () => {
    const ops = sideOpenings({ type: "open", openings: [] }, 6000, 2400, { postSpacing: 2000, parapet: 900 }, p);
    expect(ops).toHaveLength(3);
    for (const o of ops) {
      expect(o.kind).toBe("gate");
      expect(o.width).toBeLessThan(2000);
    }
  });
  it("half side: parapet bays, a door turns its bay into a passage", () => {
    const ops = sideOpenings({ type: "half", openings: [{ id: "d", kind: "door", x: 2500, width: 900, height: 2000, sill: 0 }] }, 6000, 2400, { postSpacing: 2000, parapet: 900 }, p);
    expect(ops.map((o) => o.kind)).toEqual(["window", "gate", "window"]);
    expect(ops[0]!.sill).toBe(900);
  });
});

describe("mono-pitch roof", () => {
  it("uses mono trusses rising to the back, ridge at the high side", () => {
    const b = generateBuilding(productInput("shed"));
    expect(b.roofTruss.input.shape.kind).toBe("mono");
    const top = Math.max(...b.roofTruss.nodes.map((n) => n.y));
    expect(b.ridgeHeight).toBeCloseTo(b.roofBase + top + b.depth / 2, 6);
  });
});

describe("evenStations", () => {
  it("never exceeds the maximum gap and keeps the edges", () => {
    expect(evenStations(6000, 600, 50)).toHaveLength(11);
    expect(evenStations(1000, 3000, 0)).toEqual([0, 1000]);
  });
});
