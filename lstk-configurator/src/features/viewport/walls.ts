import type { Building } from "@/domain/buildings/generate";
import { partitionSegments } from "@/domain/layout/rooms";
import { openingGaps } from "@/render/sport";

/** A wall for the walk: its centre line in plan (mm) and half its thickness */
export interface WallLine {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  half: number;
}

/**
 * Walls of the ground floor the walker bumps into: the outer walls and the
 * partitions, each cut open where a door or gate is (sill under 300 mm).
 * Windows stay solid.
 */
export function walkWalls(b: Building): WallLine[] {
  const { length: L, width: W } = b.input;
  const d = b.depth;
  const lv = b.input.levels[0]!;
  const doors = openingGaps(b, 0).filter((g) => g.sill < 300);
  const lines: { axis: "x" | "z"; at: number; from: number; to: number }[] = [];
  if (lv.sides.front.type === "wall") lines.push({ axis: "z", at: d / 2, from: 0, to: L });
  if (lv.sides.back.type === "wall") lines.push({ axis: "z", at: W - d / 2, from: 0, to: L });
  if (lv.sides.left.type === "wall") lines.push({ axis: "x", at: d / 2, from: 0, to: W });
  if (lv.sides.right.type === "wall") lines.push({ axis: "x", at: L - d / 2, from: 0, to: W });
  for (const s of partitionSegments(lv, b.levels[0]!.inner, d)) lines.push({ axis: s.axis, at: s.at, from: s.from, to: s.to });
  const out: WallLine[] = [];
  for (const l of lines) {
    // Cut the line at its doors
    const cuts = doors
      .filter((g) => g.axis === l.axis && Math.abs(g.at - l.at) <= d && g.hi > l.from && g.lo < l.to)
      .map((g) => [Math.max(l.from, g.lo), Math.min(l.to, g.hi)] as [number, number])
      .sort((a, c) => a[0] - c[0]);
    let from = l.from;
    for (const [a, c] of [...cuts, [l.to, l.to] as [number, number]]) {
      if (a - from > 1) out.push(l.axis === "z" ? { x0: from, z0: l.at, x1: a, z1: l.at, half: d / 2 } : { x0: l.at, z0: from, x1: l.at, z1: a, half: d / 2 });
      from = Math.max(from, c);
    }
  }
  return out;
}

/**
 * Keep a walker of radius `r` (mm) out of the walls: push the plan point
 * out of every wall it overlaps. Returns the corrected point.
 */
export function collide(x: number, z: number, walls: readonly WallLine[], r = 300): [number, number] {
  let px = x;
  let pz = z;
  for (let pass = 0; pass < 2; pass++)
    for (const w of walls) {
      const dx = w.x1 - w.x0;
      const dz = w.z1 - w.z0;
      const len2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((px - w.x0) * dx + (pz - w.z0) * dz) / len2));
      const cx = w.x0 + t * dx;
      const cz = w.z0 + t * dz;
      const ex = px - cx;
      const ez = pz - cz;
      const dist = Math.hypot(ex, ez);
      const min = r + w.half;
      if (dist < min) {
        // On the line itself: push along the wall normal
        const [nx, nz] = dist > 1e-6 ? [ex / dist, ez / dist] : [-dz / Math.sqrt(len2), dx / Math.sqrt(len2)];
        px = cx + nx * min;
        pz = cz + nz * min;
      }
    }
  return [px, pz];
}
