import { describe, expect, it } from "vitest";
import { dot3, len3, v3 } from "../geometry/vec";
import { findProfile } from "../profiles/catalog";
import { centrelineLength, memberFrame, validateFeatures } from "./member";
import { connectionHoles, serviceHoles, thermalSlots } from "./punching";
import type { Member } from "./types";

const stud = (overrides: Partial<Member> = {}): Member => ({
  id: "s1",
  role: "stud",
  profile: findProfile("C150x50x13x1.5"),
  start: v3(0, 0, 0),
  end: v3(0, 2700, 0),
  webAxis: v3(0, 0, 1),
  features: [],
  ...overrides,
});

describe("memberFrame", () => {
  it("is orthonormal and right-handed", () => {
    const f = memberFrame({ start: v3(0, 0, 0), end: v3(1000, 500, 200), webAxis: v3(0, 0, 1) });
    for (const v of [f.axis, f.web, f.flange]) expect(len3(v)).toBeCloseTo(1, 12);
    expect(dot3(f.axis, f.web)).toBeCloseTo(0, 12);
    expect(dot3(f.axis, f.flange)).toBeCloseTo(0, 12);
    expect(dot3(f.web, f.flange)).toBeCloseTo(0, 12);
    // flange × web = axis (x × y = z)
    const cross = { x: f.flange.y * f.web.z - f.flange.z * f.web.y, y: f.flange.z * f.web.x - f.flange.x * f.web.z, z: f.flange.x * f.web.y - f.flange.y * f.web.x };
    expect(dot3(cross, f.axis)).toBeCloseTo(1, 12);
  });

  it("projects a skewed web hint onto the member's normal plane", () => {
    const f = memberFrame({ start: v3(0, 0, 0), end: v3(0, 1000, 0), webAxis: v3(0, 1, 1) });
    expect(f.web.y).toBeCloseTo(0, 12);
    expect(f.web.z).toBeCloseTo(1, 12);
  });

  it("flipping turns the section 180° about the axis", () => {
    const a = memberFrame(stud());
    const b = memberFrame(stud({ flipped: true }));
    expect(dot3(a.web, b.web)).toBeCloseTo(-1, 12);
    expect(dot3(a.flange, b.flange)).toBeCloseTo(-1, 12);
    expect(dot3(a.axis, b.axis)).toBeCloseTo(1, 12);
  });

  it("rejects a web hint parallel to the member", () => {
    expect(() => memberFrame(stud({ webAxis: v3(0, 5, 0) }))).toThrow(/параллельна/);
  });
});

describe("centrelineLength", () => {
  it("rounds to the 0.5 mm cut grid", () => {
    expect(centrelineLength({ start: v3(0, 0, 0), end: v3(1000.26, 0, 0) })).toBe(1000.5);
    expect(centrelineLength({ start: v3(0, 0, 0), end: v3(300, 400, 0) })).toBe(500);
  });
});

describe("punching", () => {
  it("service holes: symmetric, inside the end clearance", () => {
    const holes = serviceHoles(2700, findProfile("C150x50x13x1.5"));
    expect(holes).toHaveLength(4);
    const pos = holes.map((h) => h.position);
    expect(pos[0]! + pos[pos.length - 1]!).toBeCloseTo(2700, 9);
    expect(pos[0]).toBeGreaterThanOrEqual(300);
    expect(validateFeatures(stud({ features: holes }))).toEqual([]);
  });

  it("service holes are skipped when the web is too narrow", () => {
    expect(serviceHoles(2700, findProfile("H40x45x20x1"))).toEqual([]);
  });

  it("connection holes are clamped onto the member and paired across the web", () => {
    const holes = connectionHoles(1000, [0, 500, 1000]);
    expect(holes).toHaveLength(6);
    expect(Math.min(...holes.map((h) => h.position))).toBe(20);
    expect(Math.max(...holes.map((h) => h.position))).toBe(980);
  });

  it("thermal slots: staggered rows, all on the flat web", () => {
    const profile = findProfile("C150x50x13x1.5");
    const slots = thermalSlots(2700, profile);
    const rows = new Map<number, number[]>();
    for (const s of slots) {
      if (s.kind !== "web-slot") continue;
      rows.set(s.offset, [...(rows.get(s.offset) ?? []), s.position]);
    }
    expect(rows.size).toBe(4);
    const [r0, r1] = [...rows.values()];
    expect(r1![0]! - r0![0]!).toBeCloseTo((75 + 25) / 2, 9);
    expect(validateFeatures(stud({ features: slots }))).toEqual([]);
  });

  it("validation flags overlapping punches (default slots collide with service holes)", () => {
    const profile = findProfile("C150x50x13x1.5");
    const both = [...serviceHoles(2700, profile), ...thermalSlots(2700, profile)];
    const issues = validateFeatures(stud({ features: both }));
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.every((i) => /пересекается/.test(i.reason))).toBe(true);
    // dimples at the ends stay clear of the thermal slots' end clearance
    expect(validateFeatures(stud({ features: [...thermalSlots(2700, profile), ...connectionHoles(2700, [0, 2700])] }))).toEqual([]);
  });

  it("validation flags features off the member and on the bends", () => {
    const issues = validateFeatures(
      stud({
        features: [
          { kind: "dimple", position: 2699, offset: 0, diameter: 5 },
          { kind: "bolt-hole", position: 100, offset: 70, diameter: 12 },
          { kind: "lip-cut", position: 0, length: 50 },
        ],
      }),
    );
    expect(issues.map((i) => i.reason)).toEqual([expect.stringMatching(/за пределами/), expect.stringMatching(/гиба/)]);
  });
});
