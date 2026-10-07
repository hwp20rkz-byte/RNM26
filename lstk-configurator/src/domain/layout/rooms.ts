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

export function validatePartitions(level: Level, inner: Interior, d: number): string[] {
  const e: string[] = [];
  const xs = level.partitions.filter((p) => p.axis === "x").map((p) => p.at).sort((a, b) => a - b);
  const zs = level.partitions.filter((p) => p.axis === "z").map((p) => p.at).sort((a, b) => a - b);
  const check = (vals: number[], lo: number, hi: number, name: string) => {
    const all = [lo - d / 2, ...vals, hi + d / 2];
    for (let i = 1; i < all.length; i++) {
      if (all[i]! - all[i - 1]! - d < MIN_ROOM) e.push(`Перегородки ${name}: помещение уже ${MIN_ROOM} мм`);
    }
  };
  check(xs, inner.x0, inner.x1, "поперёк");
  check(zs, inner.z0, inner.z1, "вдоль");
  return [...new Set(e)];
}

/** Partition panels to build: cross partitions whole, long ones split at the cross ones */
export function partitionSegments(level: Level, inner: Interior, d: number): PartitionSegment[] {
  const segs: PartitionSegment[] = [];
  const cross = level.partitions.filter((p) => p.axis === "x").sort((a, b) => a.at - b.at);
  for (const p of cross) {
    segs.push({ partition: p, axis: "x", at: p.at, from: inner.z0, to: inner.z1, doors: p.doors });
  }
  const stops = [inner.x0, ...cross.map((p) => p.at), inner.x1];
  for (const p of level.partitions.filter((x) => x.axis === "z")) {
    for (let i = 0; i + 1 < stops.length; i++) {
      // segment between faces of the neighbouring walls
      const from = i === 0 ? stops[i]! : stops[i]! + d / 2;
      const to = i + 1 === stops.length - 1 ? stops[i + 1]! : stops[i + 1]! - d / 2;
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
  return level.partitions.filter((p) => p.axis === "z").flatMap((p) => p.doors.filter((o) => !placed.has(o.id)));
}

export function roomKey(i: number, j: number): string {
  return `${i}-${j}`;
}

/** Rooms are the cells of the partition grid (long partitions are assumed full length) */
export function rooms(level: Level, inner: Interior, d: number, fallback: RoomPurpose = "living"): Room[] {
  const xs = [inner.x0, ...level.partitions.filter((p) => p.axis === "x").map((p) => p.at).sort((a, b) => a - b), inner.x1];
  const zs = [inner.z0, ...level.partitions.filter((p) => p.axis === "z").map((p) => p.at).sort((a, b) => a - b), inner.z1];
  const out: Room[] = [];
  for (let i = 0; i + 1 < xs.length; i++) {
    for (let j = 0; j + 1 < zs.length; j++) {
      const x0 = i === 0 ? xs[i]! : xs[i]! + d / 2;
      const x1 = i + 1 === xs.length - 1 ? xs[i + 1]! : xs[i + 1]! - d / 2;
      const z0 = j === 0 ? zs[j]! : zs[j]! + d / 2;
      const z1 = j + 1 === zs.length - 1 ? zs[j + 1]! : zs[j + 1]! - d / 2;
      const key = roomKey(i, j);
      out.push({
        key,
        x0,
        x1,
        z0,
        z1,
        area: ((x1 - x0) * (z1 - z0)) / 1e6,
        perimeter: (2 * (x1 - x0 + (z1 - z0))) / 1000,
        purpose: level.rooms[key] ?? fallback,
      });
    }
  }
  return out;
}
