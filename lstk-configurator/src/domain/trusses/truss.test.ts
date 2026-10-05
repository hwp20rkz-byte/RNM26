import { describe, expect, it } from "vitest";
import { dist3 } from "../geometry/vec";
import { centrelineLength, validateFeatures } from "../members/member";
import { findProfile } from "../profiles/catalog";
import { checkDeterminacy, solveTruss, uniformTopLoad } from "./analysis";
import { fabricateTruss } from "./fabricate";
import { generateTruss, topChordY, validateTruss } from "./generate";
import { PATTERNS_FOR_SHAPE, type TrussInput, type TrussShape } from "./types";

const chord = findProfile("C89x41x11x0.95s");
const web = findProfile("C89x41x11x0.95s");

const input = (shape: TrussShape, pattern: TrussInput["pattern"], panels = 6, extra: Partial<TrussInput> = {}): TrussInput => ({
  span: 9000,
  shape,
  pattern,
  panels,
  overhang: 0,
  chordProfile: chord,
  webProfile: web,
  maxPieceLength: 12000,
  ...extra,
});

const SHAPES: TrussShape[] = [
  { kind: "triangular", pitchDeg: 25 },
  { kind: "trapezoidal", pitchDeg: 15, heelHeight: 400 },
  { kind: "parallel", depth: 900 },
];

const combos = SHAPES.flatMap((shape) =>
  PATTERNS_FOR_SHAPE[shape.kind].flatMap((pattern) => (pattern === "fink" ? [4] : [2, 4, 6, 8, 10]).map((n) => [shape.kind, pattern, n, shape] as const)),
);

describe("every supported shape × pattern × panel count", () => {
  it.each(combos)("%s / %s / %i panels: stable and statically determinate (m = 2j − 3)", (_k, pattern, n, shape) => {
    const model = generateTruss(input(shape, pattern, n));
    expect(model.bars.length).toBe(2 * model.nodes.length - 3);
    expect(checkDeterminacy(model)).toEqual({ ok: true });
  });

  it.each(combos)("%s / %s / %i panels: global equilibrium under uniform load", (_k, pattern, n, shape) => {
    const model = generateTruss(input(shape, pattern, n));
    const total = 10_000;
    const sol = solveTruss(model, uniformTopLoad(model, total));
    const reactions = [...sol.reactions.values()];
    expect(reactions.reduce((a, r) => a + r.ry, 0)).toBeCloseTo(total, 6);
    expect(reactions.reduce((a, r) => a + r.rx, 0)).toBeCloseTo(0, 6);
  });
});

describe("analysis against hand calculations", () => {
  it("king-post truss: heel forces match P/(2 sin α) and P/(2 tan α)", () => {
    // Symmetric truss, load P at ridge only: heel equilibrium gives
    // top chord compression P/(2 sin α), bottom chord tension P/(2 tan α)
    const model = generateTruss(input({ kind: "triangular", pitchDeg: 30 }, "pratt", 2));
    const ridge = model.nodes.find((n) => Math.abs(n.x - 4500) < 1e-6 && n.y > 0)!;
    const P = 1000;
    const sol = solveTruss(model, [{ node: ridge.id, fx: 0, fy: -P }]);
    const a = Math.PI / 6;
    const forceOf = (role: string, x: number) =>
      sol.barForces[model.bars.find((b) => b.role === role && Math.min(model.nodes[b.a]!.x, model.nodes[b.b]!.x) === x)!.id]!;
    expect(forceOf("top-chord", 0)).toBeCloseTo(-P / (2 * Math.sin(a)), 6);
    expect(forceOf("bottom-chord", 0)).toBeCloseTo(P / (2 * Math.tan(a)), 6);
    // king post carries nothing for a ridge-only load in this geometry
    expect(sol.barForces[model.bars.find((b) => b.role === "vertical")!.id]).toBeCloseTo(0, 6);
  });

  it("Pratt diagonals are in tension and Howe diagonals in compression under gravity", () => {
    const shape: TrussShape = { kind: "parallel", depth: 900 };
    for (const [pattern, sign] of [["pratt", 1], ["howe", -1]] as const) {
      const model = generateTruss(input(shape, pattern, 6));
      const sol = solveTruss(model, uniformTopLoad(model, 10_000));
      for (const b of model.bars.filter((x) => x.role === "diagonal")) expect(Math.sign(sol.barForces[b.id]!)).toBe(sign);
    }
  });

  it("detects a mechanism", () => {
    const model = generateTruss(input({ kind: "parallel", depth: 900 }, "pratt", 4));
    const broken = { ...model, bars: model.bars.filter((b) => b.role !== "diagonal").map((b, id) => ({ ...b, id })) };
    expect(checkDeterminacy(broken).ok).toBe(false);
  });
});

describe("geometry", () => {
  it("top chord height follows pitch and heel", () => {
    const tri = { span: 9000, shape: { kind: "triangular", pitchDeg: 45 } as TrussShape };
    expect(topChordY(tri, 4500)).toBeCloseTo(4500, 6);
    const trap = { span: 9000, shape: { kind: "trapezoidal", pitchDeg: 45, heelHeight: 300 } as TrussShape };
    expect(topChordY(trap, 0)).toBe(300);
  });

  it("validation rejects unsupported patterns and odd panel counts", () => {
    expect(validateTruss(input({ kind: "trapezoidal", pitchDeg: 15, heelHeight: 400 }, "fink"))).not.toEqual([]);
    expect(validateTruss(input({ kind: "parallel", depth: 900 }, "pratt", 5))).not.toEqual([]);
    expect(() => generateTruss(input({ kind: "triangular", pitchDeg: 2 }, "howe"))).toThrow(/Уклон/);
  });
});

describe("fabricateTruss", () => {
  it("rolls each straight chord as one piece and every web as its own piece", () => {
    const model = generateTruss(input({ kind: "triangular", pitchDeg: 25 }, "howe", 6));
    const { members, splices } = fabricateTruss(model);
    expect(members.filter((m) => m.role === "top-chord")).toHaveLength(2);
    expect(members.filter((m) => m.role === "bottom-chord")).toHaveLength(1);
    const webBars = model.bars.filter((b) => b.role === "vertical" || b.role === "diagonal").length;
    expect(members.filter((m) => m.role === "truss-web")).toHaveLength(webBars);
    expect(splices).toEqual([]);
  });

  it("chord length is conserved; overhang extends top chords past the heel", () => {
    const base = input({ kind: "triangular", pitchDeg: 30 }, "fink", 4);
    const plain = fabricateTruss(generateTruss(base)).members.filter((m) => m.role === "top-chord");
    const withEaves = fabricateTruss(generateTruss({ ...base, overhang: 500 })).members.filter((m) => m.role === "top-chord");
    const rafter = 4500 / Math.cos(Math.PI / 6);
    for (const m of plain) expect(dist3(m.start, m.end)).toBeCloseTo(rafter, 6);
    for (const m of withEaves) expect(dist3(m.start, m.end)).toBeCloseTo(rafter + 500, 6);
  });

  it("splices a chord longer than the max piece length at a node", () => {
    const model = generateTruss(input({ kind: "parallel", depth: 900 }, "pratt", 10, { span: 15000, maxPieceLength: 9000 }));
    const { members, splices } = fabricateTruss(model);
    const bottom = members.filter((m) => m.role === "bottom-chord");
    expect(bottom).toHaveLength(2);
    expect(splices.length).toBeGreaterThanOrEqual(2);
    for (const m of members) expect(centrelineLength(m)).toBeLessThanOrEqual(9000);
    expect(bottom.reduce((a, m) => a + dist3(m.start, m.end), 0)).toBeCloseTo(15000, 6);
  });

  it("all connection holes land on their members", () => {
    for (const [, pattern, n, shape] of combos) {
      const { members } = fabricateTruss(generateTruss(input(shape, pattern, n, { overhang: 300 })));
      for (const m of members) {
        const issues = validateFeatures(m).filter((i) => !/гиба/.test(i.reason));
        expect(issues, `${m.id}`).toEqual([]);
      }
    }
  });
});
