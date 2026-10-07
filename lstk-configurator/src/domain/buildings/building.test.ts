import { describe, expect, it } from "vitest";
import { worldMembers } from "../assemblies/types";
import { memberOnMachine } from "../machines/check";
import { GOLDEN_INTEGRITY_C89 } from "../machines/golden-integrity-c89";
import { validateFeatures } from "../members/member";
import { evenStations, generateBuilding, wallPlans } from "./generate";
import { BUILDING_PRESETS, presetInput } from "./presets";

const bounds = (pts: { x: number; y: number; z: number }[]) => ({
  min: { x: Math.min(...pts.map((p) => p.x)), y: Math.min(...pts.map((p) => p.y)), z: Math.min(...pts.map((p) => p.z)) },
  max: { x: Math.max(...pts.map((p) => p.x)), y: Math.max(...pts.map((p) => p.y)), z: Math.max(...pts.map((p) => p.z)) },
});

describe("every preset", () => {
  it.each(BUILDING_PRESETS.map((p) => [p.name, p.id] as const))("%s: builds, every member valid and makeable on the C89 line", (_n, id) => {
    const b = generateBuilding(presetInput(id));
    const members = worldMembers(b.assemblies);
    expect(members.length).toBeGreaterThan(50);
    expect(new Set(members.map((m) => m.id)).size).toBe(members.length);
    for (const m of members) {
      expect(validateFeatures(m), m.id).toEqual([]);
      expect(memberOnMachine(m, GOLDEN_INTEGRITY_C89).filter((i) => i.level === "error"), m.id).toEqual([]);
    }
  });
});

describe("enclosed building geometry", () => {
  const input = presetInput("house");
  const b = generateBuilding(input);
  const walls = b.assemblies.filter((a) => a.kind === "wall");

  it("four walls; the envelope matches length × width × height", () => {
    expect(walls.map((w) => w.mark)).toEqual(["W1", "W2", "W3", "W4"]);
    const pts = worldMembers(walls).flatMap((m) => [m.start, m.end]);
    const bb = bounds(pts);
    // member lines sit within the outer faces (web centre lines, half a web inside)
    expect(bb.min.x).toBeGreaterThanOrEqual(-1e-6);
    expect(bb.max.x).toBeLessThanOrEqual(input.length + 1e-6);
    expect(bb.min.z).toBeGreaterThanOrEqual(-1e-6);
    expect(bb.max.z).toBeLessThanOrEqual(input.width + 1e-6);
    expect(bb.max.y).toBeCloseTo(input.wallHeight - 0.95 / 2, 6);
  });

  it("end walls fit between the long walls", () => {
    const plans = wallPlans(input);
    expect(plans.find((p) => p.side === "left")!.length).toBe(input.width - 2 * 89);
  });

  it("trusses: spacing ≤ requested, first/last near the end walls, sitting on the plates", () => {
    expect(b.trussPositions[0]).toBe(50);
    expect(b.trussPositions.at(-1)).toBe(input.length - 50);
    const gaps = b.trussPositions.slice(1).map((x, i) => x - b.trussPositions[i]!);
    for (const g of gaps) expect(g).toBeLessThanOrEqual(input.trussSpacing + 1e-9);
    const chords = worldMembers(b.assemblies.filter((a) => a.kind === "truss")).filter((m) => m.role === "bottom-chord");
    // Bottom chord line is half a web above the top of the wall (rafter tails hang lower — that's the eaves)
    for (const m of chords) expect(m.start.y).toBeCloseTo(input.wallHeight + 89 / 2, 6);
  });

  it("all trusses share one mark (identical pieces)", () => {
    const marks = new Set(b.assemblies.filter((a) => a.kind === "truss").map((a) => a.mark));
    expect([...marks]).toEqual(["T1"]);
  });

  it("an invalid opening names the wall", () => {
    const bad = presetInput("house");
    bad.openings.left = [{ id: "x", kind: "window", x: 10, width: 900, height: 900, sill: 900 }];
    expect(() => generateBuilding(bad)).toThrow(/Стена W3: .*близко к началу/);
  });
});

describe("carport", () => {
  const b = generateBuilding(presetInput("carport"));
  it("two post-and-beam frames, double posts within the post spacing", () => {
    const frames = b.assemblies.filter((a) => a.kind === "frame");
    expect(frames).toHaveLength(2);
    const posts = frames[0]!.members.filter((m) => m.role === "post");
    // 6 m / 3 m → 3 stations × 2 back-to-back
    expect(posts).toHaveLength(6);
  });
});

describe("evenStations", () => {
  it("never exceeds the maximum gap and keeps the edges", () => {
    expect(evenStations(6000, 600, 50)).toHaveLength(11);
    expect(evenStations(1000, 3000, 0)).toEqual([0, 1000]);
  });
});
