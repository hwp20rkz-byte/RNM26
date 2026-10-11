import { describe, expect, it } from "vitest";
import { generateBuilding } from "../buildings/generate";
import { PRODUCTS, productInput } from "../catalog/products";
import { memberOnMachine } from "../machines/check";
import { GOLDEN_INTEGRITY_C89 } from "../machines/golden-integrity-c89";
import { centrelineLength, validateFeatures } from "../members/member";
import type { Member } from "../members/types";
import { findProfile } from "../profiles/catalog";
import { fabricateTruss } from "../trusses/fabricate";
import { generateTruss } from "../trusses/generate";
import { generateWallDetailed } from "../walls/generate";
import { DETAILING, detailPlanar, planarClashes } from "./planar";

const C89 = findProfile("C89x41x11x0.95");
const t = C89.thickness;
const F = C89.family === "C" ? C89.flange : 0;

const plainWall = () => generateWallDetailed({ length: 3000, height: 2700, studSpacing: 600, profile: C89, openings: [], noggings: true }, "W");

describe("every catalogue product is clash-free and fabricable", () => {
  for (const p of PRODUCTS) {
    it(p.id, () => {
      const b = generateBuilding(productInput(p.id));
      const seen = new Set<string>();
      for (const a of b.assemblies) {
        if (seen.has(a.mark)) continue;
        seen.add(a.mark);
        expect(planarClashes(a.members), a.mark).toEqual([]);
        expect(a.detailIssues ?? [], a.mark).toEqual([]);
        for (const m of a.members) {
          expect(validateFeatures(m), `${a.mark} ${m.id}`).toEqual([]);
          expect(memberOnMachine(m, GOLDEN_INTEGRITY_C89).filter((i) => i.level === "error"), `${a.mark} ${m.id}`).toEqual([]);
        }
      }
    });
  }
});

describe("the clash check is not blind", () => {
  const { members } = plainWall();
  const swap = (id: string, f: (m: Member) => Member) => members.map((m) => (m.id === id ? f(m) : m));
  const stud = members.find((m) => m.role === "stud")!;
  const plate = members.find((m) => m.role === "track")!;

  it("a stud without its swage clashes with the plates", () => {
    const broken = swap(stud.id, (m) => ({ ...m, features: m.features.filter((f) => f.kind !== "swage") }));
    expect(planarClashes(broken).some((c) => c.reason.includes("обжат"))).toBe(true);
  });

  it("a plate without lip cuts clashes with the studs", () => {
    const broken = swap(plate.id, (m) => ({ ...m, features: m.features.filter((f) => f.kind !== "lip-cut") }));
    expect(planarClashes(broken).some((c) => c.reason.includes("отгиб"))).toBe(true);
  });

  it("a stud cut to the centreline length runs into the plate web", () => {
    const broken = swap(stud.id, (m) => ({ ...m, start: { ...m.start, y: t / 2 } }));
    expect(planarClashes(broken).some((c) => c.reason.includes("стенку"))).toBe(true);
  });

  it("two C of one size cannot nest toe-to-toe (the old box post)", () => {
    const a: Member = { id: "a", role: "stud", profile: C89, start: { x: 500, y: 100, z: 0 }, end: { x: 500, y: 2000, z: 0 }, webAxis: { x: 0, y: 0, z: 1 }, flipped: false, features: [] };
    const b: Member = { ...a, id: "b", start: { x: 500 - t - F + t / 2, y: 100, z: 0 }, end: { x: 500 - t - F + t / 2, y: 2000, z: 0 }, flipped: true };
    expect(planarClashes([a, b])).toHaveLength(1);
  });
});

describe("wall joints", () => {
  const d = plainWall();
  it("studs nest into both plates: cut length = height − 2 plates − 2 gaps, on the 0.5 mm grid", () => {
    for (const s of d.members.filter((m) => m.role === "stud")) {
      const L = centrelineLength(s);
      expect(L).toBeLessThanOrEqual(2700 - 2 * t - 2 * DETAILING.nestGap);
      expect(L).toBeGreaterThan(2700 - 2 * t - 2 * DETAILING.nestGap - 0.5);
      expect(s.features.filter((f) => f.kind === "swage")).toHaveLength(2);
    }
  });
  it("plates get a lip cut over every stud that lands in them", () => {
    const studs = d.members.filter((m) => m.role === "stud").length;
    for (const p of d.members.filter((m) => m.role === "track")) expect(p.features.filter((f) => f.kind === "lip-cut")).toHaveLength(studs);
  });
  it("a nogging nests into the stud whose flanges face it and butts the back of the other", () => {
    const nog = d.joints.filter((j) => d.members.find((m) => m.id === j.member)!.role === "nogging");
    expect(nog.some((j) => j.kind === "nested")).toBe(true);
    expect(nog.some((j) => j.kind === "butt")).toBe(true);
  });
  it("re-detailing a detailed panel changes nothing", () => {
    const again = detailPlanar(d.members);
    again.members.forEach((m, i) => expect(centrelineLength(m)).toBeCloseTo(centrelineLength(d.members[i]!), 6));
  });
});

describe("truss joints (flat, Howick-type)", () => {
  const model = generateTruss({ span: 6000, shape: { kind: "triangular", pitchDeg: 30 }, pattern: "howe", panels: 6, overhang: 400, chordProfile: C89, webProfile: C89, maxPieceLength: 12000 });
  const fab = fabricateTruss(model);
  it("all members lie flat in one plane, one profile deep", () => {
    for (const m of fab.members) expect(Math.abs(m.webAxis.z)).toBe(1);
    expect(new Set(fab.members.map((m) => m.start.z)).size).toBe(1);
  });
  it("webs nest into the chords with swaged ends; inclined ends are chamfered", () => {
    const webs = fab.members.filter((m) => m.role === "truss-web");
    for (const w of webs) expect(w.features.filter((f) => f.kind === "swage").length).toBeGreaterThanOrEqual(2);
    expect(fab.joints.some((j) => j.chamfer)).toBe(true);
  });
  it("the bottom chord nests into the top chord at the heels; the top chords are cut back at the ridge", () => {
    const heels = fab.joints.filter((j) => j.kind === "nested" && fab.members.find((m) => m.id === j.member)!.role === "bottom-chord");
    expect(heels).toHaveLength(2);
    expect(fab.joints.filter((j) => j.kind === "apex")).toHaveLength(2);
    expect(planarClashes(fab.members)).toEqual([]);
    expect(fab.issues).toEqual([]);
  });
  it("building hardware carries the clips and ridge plates the joints call for", () => {
    const b = generateBuilding(productInput("house"));
    const kinds = new Set(b.hardware.map((h) => h.kind));
    expect(kinds.has("joint-clip")).toBe(true);
    expect(kinds.has("ridge-plate")).toBe(true);
    const plates = b.hardware.filter((h) => h.kind === "ridge-plate").reduce((s, h) => s + h.qty, 0);
    expect(plates).toBe(b.trussPositions.length);
  });
});
