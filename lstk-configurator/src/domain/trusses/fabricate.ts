import { v3, type Vec3 } from "../geometry/vec";
import { centrelineLength } from "../members/member";
import { connectionHoles } from "../members/punching";
import type { Member, MemberRole } from "../members/types";
import type { TrussBar, TrussModel, TrussNode } from "./types";

/**
 * Turns the analytical model into fabrication pieces:
 * - collinear chord bars merge into one continuous piece (a chord is rolled as
 *   one length, not cut at every panel point), split only where a piece would
 *   exceed `maxPieceLength` — at the node closest to an even division;
 * - the top chord extends past the heel by the overhang;
 * - every piece gets dimple pairs where other members connect to it.
 *
 * Placement (mm): truss plane is x (span) / y (up) at z = `planeZ`. Members are
 * "web-in-plane": the C webs lie in the truss plane, chord flanges face +z and
 * web members are flipped to face −z, offset so the webs sit back to back.
 *
 * Lengths are centreline lengths. Real cut lengths need end-detailing
 * (nesting clearances, mitre cuts) for the specific machine — see README.
 */

export interface FabricatedTruss {
  members: Member[];
  /** Chord splices that had to be introduced, as node ids */
  splices: number[];
}

interface Chain {
  role: "top-chord" | "bottom-chord";
  nodes: number[];
}

export function fabricateTruss(model: TrussModel, opts: { planeZ?: number; idPrefix?: string } = {}): FabricatedTruss {
  const { input } = model;
  const planeZ = opts.planeZ ?? 0;
  const prefix = opts.idPrefix ?? "T";
  const node = (id: number) => model.nodes[id]!;
  const chains = [...chordChains(model, "top-chord"), ...chordChains(model, "bottom-chord")];

  // Which nodes each chord chain touches, to place connection holes
  const members: Member[] = [];
  const splices: number[] = [];
  let seq = 0;
  const nextId = (role: MemberRole) => `${prefix}-${role}-${++seq}`;

  for (const chain of chains) {
    const pieces = splitChain(model, chain, input.maxPieceLength);
    if (pieces.length > 1) splices.push(...pieces.slice(1).map((p) => p[0]!));
    for (const pieceNodes of pieces) {
      let start = toVec(node(pieceNodes[0]!), planeZ);
      let end = toVec(node(pieceNodes[pieceNodes.length - 1]!), planeZ);
      // Extend the top chord past a heel (support node) by the overhang
      if (chain.role === "top-chord" && input.overhang > 0) {
        if (node(pieceNodes[0]!).support) start = extend(end, start, input.overhang);
        if (node(pieceNodes[pieceNodes.length - 1]!).support) end = extend(start, end, input.overhang);
      }
      const length = centrelineLength({ start, end });
      const stations = pieceNodes.map((id) => distanceAlong(start, end, toVec(node(id), planeZ)));
      members.push({
        id: nextId(chain.role),
        role: chain.role,
        profile: input.chordProfile,
        start,
        end,
        webAxis: inPlaneNormal(start, end),
        features: connectionHoles(length, stations),
      });
    }
  }

  const webOffset = -(input.chordProfile.thickness + input.webProfile.thickness) / 2;
  for (const bar of model.bars) {
    if (bar.role === "top-chord" || bar.role === "bottom-chord") continue;
    const start = toVec(node(bar.a), planeZ + webOffset);
    const end = toVec(node(bar.b), planeZ + webOffset);
    const length = centrelineLength({ start, end });
    members.push({
      id: nextId("truss-web"),
      role: "truss-web",
      profile: input.webProfile,
      start,
      end,
      webAxis: inPlaneNormal(start, end),
      flipped: true,
      features: connectionHoles(length, [0, length]),
    });
  }

  return { members, splices };
}

const toVec = (n: TrussNode, z: number): Vec3 => v3(n.x, n.y, z);

function extend(from: Vec3, to: Vec3, by: number): Vec3 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const l = Math.hypot(dx, dy);
  return v3(to.x + (dx / l) * by, to.y + (dy / l) * by, to.z);
}

function distanceAlong(start: Vec3, end: Vec3, p: Vec3): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const l = Math.hypot(dx, dy);
  return ((p.x - start.x) * dx + (p.y - start.y) * dy) / l;
}

/** In-plane perpendicular, oriented "up" so the section reads consistently */
function inPlaneNormal(start: Vec3, end: Vec3): Vec3 {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const n = v3(-dy, dx, 0);
  return n.y < 0 || (n.y === 0 && n.x < 0) ? v3(dy, -dx, 0) : n;
}

/** Group chord bars into maximal straight runs (ordered node lists) */
function chordChains(model: TrussModel, role: Chain["role"]): Chain[] {
  const bars = model.bars.filter((b) => b.role === role);
  const adj = new Map<number, TrussBar[]>();
  for (const b of bars) {
    adj.set(b.a, [...(adj.get(b.a) ?? []), b]);
    adj.set(b.b, [...(adj.get(b.b) ?? []), b]);
  }
  const used = new Set<number>();
  const chains: Chain[] = [];
  const dir = (a: number, b: number) => {
    const p = model.nodes[a]!;
    const q = model.nodes[b]!;
    const l = Math.hypot(q.x - p.x, q.y - p.y);
    return { x: (q.x - p.x) / l, y: (q.y - p.y) / l };
  };
  const collinear = (a: number, m: number, b: number) => {
    const u = dir(a, m);
    const w = dir(m, b);
    return Math.abs(u.x * w.y - u.y * w.x) < 1e-9 && u.x * w.x + u.y * w.y > 0;
  };
  const other = (bar: TrussBar, n: number) => (bar.a === n ? bar.b : bar.a);

  // Start from the left-most unused bar each time so chains run left → right
  const sorted = [...bars].sort((p, q) => Math.min(model.nodes[p.a]!.x, model.nodes[p.b]!.x) - Math.min(model.nodes[q.a]!.x, model.nodes[q.b]!.x));
  for (const first of sorted) {
    if (used.has(first.id)) continue;
    used.add(first.id);
    const [l, r] = model.nodes[first.a]!.x <= model.nodes[first.b]!.x ? [first.a, first.b] : [first.b, first.a];
    const nodes = [l, r];
    // Walk right while the next bar continues straight
    for (;;) {
      const tail = nodes[nodes.length - 1]!;
      const prev = nodes[nodes.length - 2]!;
      const next = (adj.get(tail) ?? []).find((b) => !used.has(b.id) && collinear(prev, tail, other(b, tail)));
      if (!next) break;
      used.add(next.id);
      nodes.push(other(next, tail));
    }
    chains.push({ role, nodes });
  }
  return chains;
}

/** Split a chain into pieces no longer than maxLen, cutting at nodes */
function splitChain(model: TrussModel, chain: Chain, maxLen: number): number[][] {
  const pts = chain.nodes.map((id) => model.nodes[id]!);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1]! + Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y));
  const total = cum[cum.length - 1]!;
  const count = Math.ceil(total / maxLen - 1e-9);
  if (count <= 1) return [chain.nodes];
  const cuts: number[] = [];
  for (let k = 1; k < count; k++) {
    const target = (total * k) / count;
    let best = -1;
    for (let i = 1; i < pts.length - 1; i++) {
      if (cuts.includes(i)) continue;
      if (best < 0 || Math.abs(cum[i]! - target) < Math.abs(cum[best]! - target)) best = i;
    }
    if (best > 0) cuts.push(best);
  }
  cuts.sort((a, b) => a - b);
  const pieces: number[][] = [];
  let from = 0;
  for (const c of [...cuts, chain.nodes.length - 1]) {
    pieces.push(chain.nodes.slice(from, c + 1));
    from = c;
  }
  return pieces;
}
