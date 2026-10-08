import { describe, expect, it } from "vitest";
import { memberOnMachine } from "../machines/check";
import { GOLDEN_INTEGRITY_C89 } from "../machines/golden-integrity-c89";
import { centrelineLength, memberFrame, validateFeatures } from "../members/member";
import type { Member } from "../members/types";
import { findProfile } from "../profiles/catalog";
import { generateWall, openingTop, validateWall } from "./generate";
import type { Opening, WallInput } from "./types";

const C89 = findProfile("C89x41x11x0.95");
const t = C89.thickness;

const wall = (openings: Opening[] = [], extra: Partial<WallInput> = {}): WallInput => ({
  length: 6000,
  height: 2700,
  studSpacing: 600,
  profile: C89,
  openings,
  noggings: true,
  ...extra,
});

const window1: Opening = { id: "o1", kind: "window", x: 1500, width: 1200, height: 1400, sill: 900 };
const door: Opening = { id: "o2", kind: "door", x: 3800, width: 900, height: 2100, sill: 0 };

const byRole = (ms: Member[], role: Member["role"]) => ms.filter((m) => m.role === role);
const xOf = (m: Member) => m.start.x;

describe("generateWall — plain wall", () => {
  const ms = generateWall(wall());

  it("two full-length plates, flanges facing the studs", () => {
    const plates = byRole(ms, "track");
    expect(plates).toHaveLength(2);
    for (const p of plates) expect(centrelineLength(p)).toBe(6000);
    const [bottom, top] = [...plates].sort((a, b) => a.start.y - b.start.y);
    expect(memberFrame(bottom!).flange.y).toBeCloseTo(1, 12);
    expect(memberFrame(top!).flange.y).toBeCloseTo(-1, 12);
  });

  it("studs on the 600 grid plus end studs, all between the plates", () => {
    const studs = byRole(ms, "stud");
    // 600…5400 (9) + two end studs
    expect(studs).toHaveLength(11);
    for (const s of studs) {
      expect(s.start.y).toBeCloseTo(t, 9);
      expect(s.end.y).toBeCloseTo(2700 - t, 9);
    }
  });

  it("end studs turn their flanges into the panel", () => {
    const studs = byRole(ms, "stud").sort((a, b) => xOf(a) - xOf(b));
    expect(memberFrame(studs[0]!).flange.x).toBeCloseTo(1, 12);
    expect(memberFrame(studs[studs.length - 1]!).flange.x).toBeCloseTo(-1, 12);
  });

  it("studs carry dimples and swaged ends; plates a dimple pair per stud", () => {
    const stud = byRole(ms, "stud")[3]!;
    expect(stud.features.filter((f) => f.kind === "swage")).toHaveLength(2);
    expect(stud.features.filter((f) => f.kind === "dimple")).toHaveLength(4);
    const plate = byRole(ms, "track")[0]!;
    expect(plate.features.filter((f) => f.kind === "dimple")).toHaveLength(2 * 11);
  });

  it("noggings fill every bay at mid-height", () => {
    expect(byRole(ms, "nogging")).toHaveLength(10);
  });

  it("every member is valid and can be made on the C89 line", () => {
    for (const m of ms) {
      expect(validateFeatures(m), m.id).toEqual([]);
      expect(memberOnMachine(m, GOLDEN_INTEGRITY_C89).filter((i) => i.level === "error"), m.id).toEqual([]);
    }
  });
});

describe("generateWall — openings", () => {
  const ms = generateWall(wall([window1, door]));

  it("jambs frame each opening exactly at its clear edges", () => {
    const jambs = byRole(ms, "jamb").map(xOf).sort((a, b) => a - b);
    expect(jambs).toEqual([1500 - t / 2, 2700 + t / 2, 3800 - t / 2, 4700 + t / 2].map((x) => expect.closeTo(x, 9)));
  });

  it("bottom plate is cut at the door, continuous under the window", () => {
    const bottom = byRole(ms, "track").filter((m) => m.start.y < 10).sort((a, b) => a.start.x - b.start.x);
    expect(bottom.map((m) => [m.start.x, m.end.x])).toEqual([
      [0, door.x],
      [door.x + door.width, 6000],
    ]);
  });

  it("lintel over every opening (box lintel over 600 mm), sill only under the window", () => {
    // lower lintel of each opening sits on the opening top
    const lintels = byRole(ms, "lintel").filter((l) => !l.flipped);
    expect(lintels).toHaveLength(2);
    expect(lintels.map((l) => l.start.y - t / 2).sort((a, b) => a - b)).toEqual([openingTop(door), openingTop(window1)].sort((a, b) => a - b).map((y) => expect.closeTo(y, 9)));
    const boxes = byRole(ms, "lintel").filter((l) => l.flipped);
    expect(boxes).toHaveLength([door, window1].filter((o) => o.width > 600).length);
    const sills = byRole(ms, "sill");
    expect(sills).toHaveLength(1);
    expect(sills[0]!.start.y + t / 2).toBeCloseTo(900, 9);
  });

  it("no full-height stud runs through an opening; cripples carry the grid", () => {
    for (const s of byRole(ms, "stud")) {
      for (const o of [window1, door]) expect(xOf(s) < o.x || xOf(s) > o.x + o.width).toBe(true);
    }
    const cripples = byRole(ms, "cripple");
    // window 1500–2700: grid 1800, 2400 → above and below; door 3800–4700: 4200 above only
    expect(cripples).toHaveLength(2 * 2 + 1);
  });

  it("no nogging crosses an opening", () => {
    for (const n of byRole(ms, "nogging")) {
      const mid = (n.start.x + n.end.x) / 2;
      for (const o of [window1, door]) expect(mid > o.x && mid < o.x + o.width).toBe(false);
    }
  });

  it("all members valid", () => {
    for (const m of ms) expect(validateFeatures(m), m.id).toEqual([]);
  });
});

describe("validateWall", () => {
  it("rejects openings too close to the ends, to each other or to the top plate", () => {
    expect(validateWall(wall([{ ...window1, x: 20 }]))).toEqual([expect.stringMatching(/близко к началу/)]);
    expect(validateWall(wall([window1, { ...door, x: 2750 }]))).toEqual([expect.stringMatching(/простенок/)]);
    expect(validateWall(wall([{ ...window1, height: 1799 }]))).toEqual([expect.stringMatching(/обвязку/)]);
    expect(validateWall(wall([{ ...door, sill: 300 }]))).toEqual([expect.stringMatching(/низ проёма/)]);
  });

  it("throws on invalid input", () => {
    expect(() => generateWall(wall([], { height: 500 }))).toThrow(/Высота/);
  });
});

describe("reinforcement", () => {
  const p = findProfile("C89x41x11x0.95");
  const wide = { id: "g", kind: "gate" as const, x: 600, width: 3000, height: 2200, sill: 0 };
  const ms = generateWall({ length: 5000, height: 2700, studSpacing: 600, profile: p, openings: [wide], noggings: false }, "G");
  it("an opening over 1200 mm gets box posts each side", () => {
    const left = ms.filter((m) => m.start.x === m.end.x && m.start.x < wide.x);
    // end stud + king stud + jamb
    expect(left.length).toBe(3);
  });
  it("from 1500 mm the header becomes a truss with diagonals", () => {
    expect(ms.filter((m) => m.role === "brace").length).toBeGreaterThanOrEqual(2);
  });
  it("backing studs replace grid studs that would clash", () => {
    const w = generateWall({ length: 4000, height: 2700, studSpacing: 600, profile: p, openings: [], noggings: false, backing: [{ x: 1180, flipped: true, reason: "tee" }, { x: 1268, flipped: false, reason: "tee" }] });
    const xs = w.filter((m) => m.start.x === m.end.x).map((m) => m.start.x).sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) expect(xs[i]! - xs[i - 1]!).toBeGreaterThan(41);
    expect(xs).toContain(1180);
  });
});
