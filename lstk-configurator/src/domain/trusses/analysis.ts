import type { TrussModel } from "./types";

/**
 * Method-of-joints equilibrium for a pin-jointed plane truss.
 *
 * Unknowns: one axial force per bar (tension +) and the support reactions
 * (pin: Rx, Ry; roller: Ry). Equations: ΣFx = 0 and ΣFy = 0 at every node.
 * The truss is statically determinate and stable exactly when that square
 * system is non-singular. This is a geometry check and the kernel a later
 * structural module builds on — it is NOT a code check of the steel members
 * (buckling, local/distortional buckling, connections per SP RK EN 1993-1-3).
 */

export interface NodeLoad {
  node: number;
  /** N, +x right, +y up (gravity loads are negative) */
  fx: number;
  fy: number;
}

export interface TrussSolution {
  /** Axial force per bar id, N (tension positive) */
  barForces: number[];
  /** Reactions keyed by node id, N */
  reactions: Map<number, { rx: number; ry: number }>;
}

export type DeterminacyCheck =
  | { ok: true }
  | { ok: false; reason: "unstable" | "indeterminate"; unknowns: number; equations: number };

interface System {
  matrix: number[][];
  unknowns: number;
  reactionCols: { node: number; dir: "x" | "y"; col: number }[];
}

function assemble(model: TrussModel): System {
  const nNodes = model.nodes.length;
  const nBars = model.bars.length;
  const reactionCols: System["reactionCols"] = [];
  let col = nBars;
  for (const n of model.nodes) {
    if (n.support === "pin") {
      reactionCols.push({ node: n.id, dir: "x", col: col++ }, { node: n.id, dir: "y", col: col++ });
    } else if (n.support === "roller") {
      reactionCols.push({ node: n.id, dir: "y", col: col++ });
    }
  }
  const matrix = Array.from({ length: 2 * nNodes }, () => new Array<number>(col).fill(0));
  for (const bar of model.bars) {
    const a = model.nodes[bar.a]!;
    const b = model.nodes[bar.b]!;
    const L = Math.hypot(b.x - a.x, b.y - a.y);
    const cx = (b.x - a.x) / L;
    const cy = (b.y - a.y) / L;
    // Tension pulls node a towards b and node b towards a
    matrix[2 * a.id]![bar.id] = cx;
    matrix[2 * a.id + 1]![bar.id] = cy;
    matrix[2 * b.id]![bar.id] = -cx;
    matrix[2 * b.id + 1]![bar.id] = -cy;
  }
  for (const r of reactionCols) matrix[2 * r.node + (r.dir === "x" ? 0 : 1)]![r.col] = 1;
  return { matrix, unknowns: col, reactionCols };
}

/** Gaussian elimination with partial pivoting; returns null if singular */
function solve(a: number[][], rhs: number[]): number[] | null {
  const n = rhs.length;
  const m = a.map((row, i) => [...row, rhs[i]!]);
  const scale = Math.max(1, ...a.flat().map(Math.abs));
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r]![c]!) > Math.abs(m[p]![c]!)) p = r;
    if (Math.abs(m[p]![c]!) < 1e-9 * scale) return null;
    [m[c], m[p]] = [m[p]!, m[c]!];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = m[r]![c]! / m[c]![c]!;
      if (f === 0) continue;
      for (let k = c; k <= n; k++) m[r]![k]! -= f * m[c]![k]!;
    }
  }
  return m.map((row, i) => row[n]! / row[i]!);
}

export function checkDeterminacy(model: TrussModel): DeterminacyCheck {
  const sys = assemble(model);
  const equations = sys.matrix.length;
  if (sys.unknowns !== equations) {
    return { ok: false, reason: sys.unknowns > equations ? "indeterminate" : "unstable", unknowns: sys.unknowns, equations };
  }
  const probe = solve(sys.matrix, new Array<number>(equations).fill(1));
  return probe ? { ok: true } : { ok: false, reason: "unstable", unknowns: sys.unknowns, equations };
}

export function solveTruss(model: TrussModel, loads: readonly NodeLoad[]): TrussSolution {
  const det = checkDeterminacy(model);
  if (!det.ok) throw new Error(`Ферма ${det.reason === "unstable" ? "геометрически изменяема" : "статически неопределима"}`);
  const sys = assemble(model);
  const rhs = new Array<number>(sys.matrix.length).fill(0);
  // Equilibrium: Σ(internal + reactions) + external = 0 → move external loads to the right side
  for (const l of loads) {
    rhs[2 * l.node]! -= l.fx;
    rhs[2 * l.node + 1]! -= l.fy;
  }
  const x = solve(sys.matrix, rhs);
  if (!x) throw new Error("Система уравнений вырождена");
  const reactions = new Map<number, { rx: number; ry: number }>();
  for (const r of sys.reactionCols) {
    const cur = reactions.get(r.node) ?? { rx: 0, ry: 0 };
    if (r.dir === "x") cur.rx = x[r.col]!;
    else cur.ry = x[r.col]!;
    reactions.set(r.node, cur);
  }
  return { barForces: x.slice(0, model.bars.length), reactions };
}

/**
 * Equal gravity loads on every top-chord node, total `totalN` newtons. A truss
 * whose top chord is a single node (2-panel Warren) loads that node.
 */
export function uniformTopLoad(model: TrussModel, totalN: number): NodeLoad[] {
  const topNodes = new Set<number>();
  for (const b of model.bars) {
    if (b.role === "top-chord") {
      topNodes.add(b.a);
      topNodes.add(b.b);
    }
  }
  if (topNodes.size === 0) for (const n of model.nodes) if (n.y > 0) topNodes.add(n.id);
  const ids = [...topNodes];
  return ids.map((node) => ({ node, fx: 0, fy: -totalN / ids.length }));
}
