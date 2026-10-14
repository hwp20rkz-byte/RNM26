import type { BuildingInput, Level, Partition, RoomPurpose } from "../buildings/types";
import type { Opening } from "../walls/types";

/**
 * Plan layout of one level. Coordinates are model plan coordinates in mm:
 * x along the building (0…length), z across (0…width). Outer walls are `d`
 * thick (the stud depth): long walls occupy z ∈ [0, d] and [W − d, W], end
 * walls x ∈ [0, d] and [L − d, L], so the interior is [d, L − d] × [d, W − d].
 *
 * Partitions across the building ("x") run the full interior width; partitions
 * along it ("z") are cut into segments between the cross partitions, so no two
 * partition panels ever occupy the same space.
 */

export interface Interior {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export function interior(b: Pick<BuildingInput, "length" | "width">, d: number): Interior {
  return { x0: d, x1: b.length - d, z0: d, z1: b.width - d };
}

export interface PartitionSegment {
  partition: Partition;
  /** Segment centre line in plan: a fixed coordinate and a span along the other axis */
  axis: "x" | "z";
  at: number;
  from: number;
  to: number;
  /** Doors in segment-local coordinates (x from `from`) */
  doors: Opening[];
}

export interface Room {
  key: string;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  /** Clear floor area, m² */
  area: number;
  /** Clear perimeter, m */
  perimeter: number;
  purpose: RoomPurpose;
}

const MIN_ROOM = 900;

/** Where a partition runs along its own axis: its span, or wall to wall */
export function partitionReach(p: Partition, inner: Interior): { lo: number; hi: number } {
  const [lo, hi] = p.axis === "x" ? [inner.z0, inner.z1] : [inner.x0, inner.x1];
  return p.span ? { lo: Math.max(lo, p.span.from), hi: Math.min(hi, p.span.to) } : { lo, hi };
}

/** Does the partition run past this coordinate (along its own axis)? */
export function partitionCovers(p: Partition, inner: Interior, at: number, tol = 1): boolean {
  const r = partitionReach(p, inner);
  return at >= r.lo - tol && at <= r.hi + tol;
}

export function validatePartitions(level: Level, inner: Interior, d: number): string[] {
  const e: string[] = [];
  for (const axis of ["x", "z"] as const) {
    const parts = level.partitions.filter((p) => p.axis === axis);
    const [lo, hi] = axis === "x" ? [inner.x0, inner.x1] : [inner.z0, inner.z1];
    const name = axis === "x" ? "поперёк" : "вдоль";
    for (const p of parts) {
      if (p.at - d / 2 - lo < MIN_ROOM || hi - p.at - d / 2 < MIN_ROOM) e.push(`Перегородки ${name}: помещение уже ${MIN_ROOM} мм`);
      // Two partitions that run side by side must leave a room between them
      for (const q of parts) {
        if (q === p || q.at <= p.at) continue;
        const a = partitionReach(p, inner);
        const b = partitionReach(q, inner);
        if (Math.min(a.hi, b.hi) - Math.max(a.lo, b.lo) > d && q.at - p.at - d < MIN_ROOM) e.push(`Перегородки ${name}: помещение уже ${MIN_ROOM} мм`);
      }
      // A shortened partition must end on an outer wall or on a crossing partition
      if (p.span) {
        const other = level.partitions.filter((q) => q.axis !== axis);
        const r = partitionReach(p, inner);
        const [olo, ohi] = axis === "x" ? [inner.z0, inner.z1] : [inner.x0, inner.x1];
        for (const end of [r.lo, r.hi]) {
          const onWall = Math.abs(end - olo) < 1 || Math.abs(end - ohi) < 1;
          const onPartition = other.some((q) => Math.abs(q.at - end) < 1 && partitionCovers(q, inner, p.at));
          if (!onWall && !onPartition) e.push(`Перегородка ${name} на ${Math.round(p.at)} мм обрывается в помещении`);
        }
      }
    }
  }
  return [...new Set(e)];
}

/**
 * Partition panels to build. A partition is cut at every crossing partition
 * it meets that runs through (cross partitions win at a crossing); its ends
 * stop at the face of the wall they meet.
 */
export function partitionSegments(level: Level, inner: Interior, d: number): PartitionSegment[] {
  const segs: PartitionSegment[] = [];
  const face = (end: number, bound: number, sign: 1 | -1) => (Math.abs(end - bound) < 1 ? bound : end + (sign * d) / 2);
  const cross = level.partitions.filter((p) => p.axis === "x").sort((a, b) => a.at - b.at);
  for (const p of cross) {
    const r = partitionReach(p, inner);
    const from = face(r.lo, inner.z0, 1);
    const to = face(r.hi, inner.z1, -1);
    const offset = from - inner.z0;
    const doors = p.span ? p.doors.filter((o) => o.x >= offset - 1e-6 && o.x + o.width <= offset + (to - from) + 1e-6).map((o) => ({ ...o, x: o.x - offset })) : p.doors;
    segs.push({ partition: p, axis: "x", at: p.at, from, to, doors });
  }
  for (const p of level.partitions.filter((x) => x.axis === "z")) {
    const r = partitionReach(p, inner);
    // Cut at the cross partitions that run through this line, inside the span
    const cuts = [...new Set(cross.filter((c) => c.at > r.lo + 1 && c.at < r.hi - 1 && partitionCovers(c, inner, p.at)).map((c) => c.at))];
    const stops = [r.lo, ...cuts, r.hi];
    for (let i = 0; i + 1 < stops.length; i++) {
      const from = face(stops[i]!, inner.x0, 1);
      const to = face(stops[i + 1]!, inner.x1, -1);
      const offset = from - inner.x0;
      const doors = p.doors
        .filter((o) => o.x >= offset - 1e-6 && o.x + o.width <= offset + (to - from) + 1e-6)
        .map((o) => ({ ...o, x: o.x - offset }));
      segs.push({ partition: p, axis: "z", at: p.at, from, to, doors });
    }
  }
  return segs;
}

/** Doors of long partitions that cross a cross-partition (cannot be built) */
export function strandedDoors(level: Level, inner: Interior, d: number): Opening[] {
  const placed = new Set(partitionSegments(level, inner, d).flatMap((s) => s.doors.map((o) => o.id)));
  return level.partitions.flatMap((p) => p.doors.filter((o) => !placed.has(o.id)));
}

export function roomKey(i: number, j: number): string {
  return `${i}-${j}`;
}

/**
 * Rooms: the cells of the grid of all partition lines, merged where no
 * partition actually separates two neighbouring cells (shortened partitions
 * leave cells open to each other). A room's rectangle is the bounding box of
 * its cells; its area is the sum of their clear areas. Purpose: the first of
 * its cells' keys that has one in `level.rooms`.
 */
export function rooms(level: Level, inner: Interior, d: number, fallback: RoomPurpose = "living"): Room[] {
  const xs = [inner.x0, ...[...new Set(level.partitions.filter((p) => p.axis === "x").map((p) => p.at))].sort((a, b) => a - b), inner.x1];
  const zs = [inner.z0, ...[...new Set(level.partitions.filter((p) => p.axis === "z").map((p) => p.at))].sort((a, b) => a - b), inner.z1];
  const nx = xs.length - 1;
  const nz = zs.length - 1;
  const parent = Array.from({ length: nx * nz }, (_, k) => k);
  const find = (k: number): number => (parent[k] === k ? k : (parent[k] = find(parent[k]!)));
  const join = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb);
  };
  const idx = (i: number, j: number) => i * nz + j;
  const walled = (axis: "x" | "z", at: number, mid: number) => level.partitions.some((p) => p.axis === axis && Math.abs(p.at - at) < 1 && partitionCovers(p, inner, mid, -1));
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < nz; j++) {
      const zm = (zs[j]! + zs[j + 1]!) / 2;
      const xm = (xs[i]! + xs[i + 1]!) / 2;
      if (i + 1 < nx && !walled("x", xs[i + 1]!, zm)) join(idx(i, j), idx(i + 1, j));
      if (j + 1 < nz && !walled("z", zs[j + 1]!, xm)) join(idx(i, j), idx(i, j + 1));
    }
  const groups = new Map<number, { i: number; j: number }[]>();
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) groups.set(find(idx(i, j)), [...(groups.get(find(idx(i, j))) ?? []), { i, j }]);
  const out: Room[] = [];
  for (const cells of groups.values()) {
    let x0 = Infinity;
    let x1 = -Infinity;
    let z0 = Infinity;
    let z1 = -Infinity;
    let area = 0;
    for (const { i, j } of cells) {
      // Clear cell: inside the faces of the walls that actually bound it
      const cx0 = i === 0 ? xs[i]! : xs[i]! + (walled("x", xs[i]!, (zs[j]! + zs[j + 1]!) / 2) ? d / 2 : 0);
      const cx1 = i + 1 === nx ? xs[i + 1]! : xs[i + 1]! - (walled("x", xs[i + 1]!, (zs[j]! + zs[j + 1]!) / 2) ? d / 2 : 0);
      const cz0 = j === 0 ? zs[j]! : zs[j]! + (walled("z", zs[j]!, (xs[i]! + xs[i + 1]!) / 2) ? d / 2 : 0);
      const cz1 = j + 1 === nz ? zs[j + 1]! : zs[j + 1]! - (walled("z", zs[j + 1]!, (xs[i]! + xs[i + 1]!) / 2) ? d / 2 : 0);
      x0 = Math.min(x0, cx0);
      x1 = Math.max(x1, cx1);
      z0 = Math.min(z0, cz0);
      z1 = Math.max(z1, cz1);
      area += ((cx1 - cx0) * (cz1 - cz0)) / 1e6;
    }
    const keys = cells.map((c) => roomKey(c.i, c.j));
    const purpose = keys.map((k) => level.rooms[k]).find((x) => x !== undefined) ?? fallback;
    out.push({ key: keys[0]!, x0, x1, z0, z1, area, perimeter: (2 * (x1 - x0 + (z1 - z0))) / 1000, purpose });
  }
  return out.sort((a, b) => a.key.localeCompare(b.key, "en", { numeric: true }));
}

/** Grid key of the cell containing a plan point (to assign room purposes by position) */
export function cellAt(level: Level, inner: Interior, x: number, z: number): string {
  const xs = [...new Set(level.partitions.filter((p) => p.axis === "x").map((p) => p.at))].sort((a, b) => a - b);
  const zs = [...new Set(level.partitions.filter((p) => p.axis === "z").map((p) => p.at))].sort((a, b) => a - b);
  void inner;
  return roomKey(xs.filter((v) => v < x).length, zs.filter((v) => v < z).length);
}
