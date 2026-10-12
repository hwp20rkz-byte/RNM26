import { DETAILING, detailPlanar, stripWidth, type DetailingIssue, type Joint } from "../detailing/planar";
import { v3, type Vec3 } from "../geometry/vec";
import type { Member, MemberRole } from "../members/types";
import type { TrussBar, TrussModel, TrussNode } from "./types";

/**
 * Turns the analytical model into fabrication pieces:
 * - collinear chord bars merge into one continuous piece (a chord is rolled as
 *   one length, not cut at every panel point), split only where a piece would
 *   exceed `maxPieceLength` — at the node closest to an even division;
 * - the top chord extends past the heel by the overhang;
 * - connection dimples come from the detailed joints (domain/detailing).
 *
 * Placement (mm): truss plane is x (span) / y (up) at z = `planeZ`. Members lie
 * flat, the way a Howick-type line builds trusses: every C has its web across
 * the truss plane (webAxis = z), so the whole truss is one profile deep.
 * Chord flanges face into the truss, web members nest into the chord channels
 * with swaged ends; at the heel the bottom chord nests into the top chord.
 * The analytical line runs through the middle of each strip (flange width).
 *
 * `detailPlanar` sets the cut ends: clearances, swages, chamfers, lip cuts,
 * ridge cut-backs. Lengths are fabrication lengths.
 */

export interface FabricatedTruss {
  members: Member[];
  /** Chord splices that had to be introduced, as node ids */
  splices: number[];
  joints: Joint[];
  issues: DetailingIssue[];
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

  const chordWidth = stripWidth(input.chordProfile);
  const webWidth = stripWidth(input.webProfile);
  // Nodes where a top and a bottom chord meet (heels): the detailer cuts those
  const topNodes = new Set(chains.filter((c) => c.role === "top-chord").flatMap((c) => c.nodes));
  const heel = (id: number) => topNodes.has(id) && chains.some((c) => c.role === "bottom-chord" && (c.nodes[0] === id || c.nodes[c.nodes.length - 1] === id));

  for (const chain of chains) {
    const pieces = splitChain(model, chain, input.maxPieceLength);
    if (pieces.length > 1) splices.push(...pieces.slice(1).map((p) => p[0]!));
    pieces.forEach((pieceNodes, k) => {
      const first = pieceNodes[0]!;
      const last = pieceNodes[pieceNodes.length - 1]!;
      let start = toVec(node(first), planeZ);
      let end = toVec(node(last), planeZ);
      // Extend the top chord past a heel (support node) by the overhang
      if (chain.role === "top-chord" && input.overhang > 0) {
        if (node(first).support) start = extend(end, start, input.overhang);
        if (node(last).support) end = extend(start, end, input.overhang);
      }
      // Free chord ends run on by half a strip so the end web sits fully in the channel
      const half = webWidth / 2 + DETAILING.buttGap;
      if (k === 0 && !heel(first) && !(chain.role === "top-chord" && input.overhang > 0 && node(first).support)) start = extend(end, start, half);
      if (k === pieces.length - 1 && !heel(last) && !(chain.role === "top-chord" && input.overhang > 0 && node(last).support)) end = extend(start, end, half);
      // Splices: the two pieces stop short of each other by the butt gap
      if (k > 0) start = extend(end, start, -DETAILING.buttGap / 2);
      if (k < pieces.length - 1) end = extend(start, end, -DETAILING.buttGap / 2);
      const inward = chain.role === "top-chord" ? v3(0, -1, 0) : v3(0, 1, 0);
      const placed = flat(start, end, inward, chordWidth, input.chordProfile.thickness);
      members.push({ id: nextId(chain.role), role: chain.role, profile: input.chordProfile, ...placed, features: [] });
    });
  }

  for (const bar of model.bars) {
    if (bar.role === "top-chord" || bar.role === "bottom-chord") continue;
    const a = toVec(node(bar.a), planeZ);
    const b = toVec(node(bar.b), planeZ);
    const placed = flat(a, b, v3(1, 0, 0), webWidth, input.webProfile.thickness);
    members.push({ id: nextId("truss-web"), role: "truss-web", profile: input.webProfile, ...placed, features: [] });
  }

  const detailed = detailPlanar(members);
  return { members: detailed.members, splices, joints: detailed.joints, issues: detailed.issues };
}

/**
 * Lay a member flat (web across the plane) with its flanges towards `toward`
 * where possible, the strip centred on the analytical line a → b.
 */
function flat(a: Vec3, b: Vec3, toward: Vec3, width: number, t: number): Pick<Member, "start" | "end" | "webAxis" | "flipped"> {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l = Math.hypot(dx, dy);
  // Unflipped flange direction for webAxis +z: (−dy, dx)
  let nx = -dy / l;
  let ny = dx / l;
  let flipped = nx * toward.x + ny * toward.y < 0;
  if (Math.abs(nx * toward.x + ny * toward.y) < 1e-9) flipped = ny < 0 || (ny === 0 && nx < 0);
  if (flipped) {
    nx = -nx;
    ny = -ny;
  }
  const off = width / 2 - t / 2;
  return {
    start: v3(a.x - nx * off, a.y - ny * off, a.z),
    end: v3(b.x - nx * off, b.y - ny * off, b.z),
    webAxis: v3(0, 0, 1),
    flipped,
  };
}

const toVec = (n: TrussNode, z: number): Vec3 => v3(n.x, n.y, z);

function extend(from: Vec3, to: Vec3, by: number): Vec3 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const l = Math.hypot(dx, dy);
  return v3(to.x + (dx / l) * by, to.y + (dy / l) * by, to.z);
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
