import { v3 } from "../geometry/vec";
import { centrelineLength } from "../members/member";
import { connectionHoles } from "../members/punching";
import type { Feature, Member, MemberRole } from "../members/types";
import type { ProfileSpec } from "../profiles/types";
import type { Opening, WallInput } from "./types";

/**
 * Wall panel in local coordinates: x along the wall from its start, y up from
 * the underside of the bottom plate, z through the thickness (web centred on 0).
 *
 * Howick-style single-profile framing, the way a C89 line builds walls:
 * - bottom plate flanges up, top plate flanges down; studs fit between them
 *   with swaged ends (the line's swage tool);
 * - every opening gets a full-height jamb stud each side, a lintel above
 *   and, for windows, a sill below; cripples carry the stud grid over/under;
 * - the end studs turn their flanges inwards so the panel ends are flat webs
 *   that bolt to the neighbouring panel.
 */

export const SWAGE_LENGTH = 45;
const MIN_GAP = 100;
const MIN_CRIPPLE = 120;

function flangeOf(p: ProfileSpec): number {
  return p.family === "Hat" ? p.crown : p.flange;
}

export function openingTop(o: Opening): number {
  return o.sill + o.height;
}

export function validateWall(input: WallInput): string[] {
  const e: string[] = [];
  const t = input.profile.thickness;
  const f = flangeOf(input.profile);
  if (input.profile.family !== "C") e.push("Стены собираются из C-профиля");
  if (!(input.length >= 300 && input.length <= 15000)) e.push("Длина стены — от 300 до 15 000 мм");
  if (!(input.height >= 1000 && input.height <= 6000)) e.push("Высота стены — от 1000 до 6000 мм");
  if (!(input.studSpacing >= 300 && input.studSpacing <= 1200)) e.push("Шаг стоек — от 300 до 1200 мм");
  const sorted = [...input.openings].sort((a, b) => a.x - b.x);
  sorted.forEach((o, i) => {
    const name = `Проём ${i + 1}`;
    if (!(o.width >= 300)) e.push(`${name}: ширина меньше 300 мм`);
    if (!(o.height >= 300)) e.push(`${name}: высота меньше 300 мм`);
    if (o.kind !== "window" && o.sill !== 0) e.push(`${name}: у двери и ворот низ проёма — 0`);
    if (o.kind === "window" && o.sill < 2 * t + MIN_CRIPPLE) e.push(`${name}: подоконник ниже ${Math.ceil(2 * t + MIN_CRIPPLE)} мм — нет места под нижние стойки`);
    // jamb + end stud + room for the end stud's flange
    if (o.x < 2 * t + f) e.push(`${name}: слишком близко к началу стены (минимум ${Math.ceil(2 * t + f)} мм)`);
    if (o.x + o.width > input.length - 2 * t - f) e.push(`${name}: слишком близко к концу стены`);
    if (openingTop(o) > input.height - 3 * t) e.push(`${name}: верх проёма упирается в обвязку`);
    const next = sorted[i + 1];
    if (next && next.x - (o.x + o.width) < 2 * t + MIN_GAP) e.push(`${name} и ${i + 2}: простенок меньше ${Math.ceil(2 * t + MIN_GAP)} мм`);
  });
  return e;
}

interface Piece {
  role: MemberRole;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** For horizontal pieces: flanges up (false) or down (true). For vertical: flanges to −x (false) or +x (true). */
  flipped: boolean;
}

export function generateWall(input: WallInput, mark = "W"): Member[] {
  const errors = validateWall(input);
  if (errors.length) throw new Error(errors.join("; "));
  const { length: L, height: H, profile } = input;
  const t = profile.thickness;
  const f = flangeOf(profile);
  const openings = [...input.openings].sort((a, b) => a.x - b.x);
  const pieces: Piece[] = [];

  // Plates. The bottom plate is cut out at doors and gates (nothing to trip over,
  // a car can drive through); it runs under windows.
  let from = 0;
  for (const o of openings.filter((x) => x.kind !== "window")) {
    if (o.x - from > 1) pieces.push({ role: "track", x0: from, y0: t / 2, x1: o.x, y1: t / 2, flipped: false });
    from = o.x + o.width;
  }
  if (L - from > 1) pieces.push({ role: "track", x0: from, y0: t / 2, x1: L, y1: t / 2, flipped: false });
  pieces.push({ role: "track", x0: 0, y0: H - t / 2, x1: L, y1: H - t / 2, flipped: true });

  // Vertical full-height members: x of the web centreline
  const fullStuds: { x: number; flipped: boolean; role: MemberRole }[] = [
    { x: t / 2, flipped: true, role: "stud" },
    { x: L - t / 2, flipped: false, role: "stud" },
  ];
  for (const o of openings) {
    fullStuds.push({ x: o.x - t / 2, flipped: false, role: "jamb" });
    fullStuds.push({ x: o.x + o.width + t / 2, flipped: true, role: "jamb" });
  }

  // Keep-out zones around openings and ends, where grid studs are replaced
  const blocked = (x: number) =>
    x < t + f || x > L - t - f || openings.some((o) => x > o.x - t - f && x < o.x + o.width + t + f);

  const grid: number[] = [];
  for (let x = input.studSpacing; x < L; x += input.studSpacing) grid.push(x);
  for (const x of grid) if (!blocked(x)) fullStuds.push({ x, flipped: false, role: "stud" });

  for (const s of fullStuds) pieces.push({ role: s.role, x0: s.x, y0: t, x1: s.x, y1: H - t, flipped: s.flipped });

  // Openings: lintel, sill, cripples on the stud grid
  for (const o of openings) {
    const top = openingTop(o);
    pieces.push({ role: "lintel", x0: o.x, y0: top + t / 2, x1: o.x + o.width, y1: top + t / 2, flipped: false });
    if (o.kind === "window") pieces.push({ role: "sill", x0: o.x, y0: o.sill - t / 2, x1: o.x + o.width, y1: o.sill - t / 2, flipped: true });
    const inside = grid.filter((x) => x > o.x + f && x < o.x + o.width - f);
    for (const x of inside) {
      if (H - t - (top + t) >= MIN_CRIPPLE) pieces.push({ role: "cripple", x0: x, y0: top + t, x1: x, y1: H - t, flipped: false });
      if (o.kind === "window" && o.sill - t - t >= MIN_CRIPPLE) pieces.push({ role: "cripple", x0: x, y0: t, x1: x, y1: o.sill - t, flipped: false });
    }
  }

  // Noggings at mid-height between neighbouring full-height members, skipping openings
  if (input.noggings) {
    const y = H / 2;
    const xs = fullStuds.map((s) => s.x).sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i++) {
      const a = xs[i]! + t / 2;
      const b = xs[i + 1]! - t / 2;
      const mid = (a + b) / 2;
      const inOpening = openings.some((o) => mid > o.x && mid < o.x + o.width && y > o.sill && y < openingTop(o));
      if (!inOpening && b - a >= MIN_CRIPPLE) pieces.push({ role: "nogging", x0: a, y0: y, x1: b, y1: y, flipped: false });
    }
  }

  return toMembers(pieces, profile, mark);
}

function toMembers(pieces: Piece[], profile: ProfileSpec, mark: string): Member[] {
  const vertical = (p: Piece) => p.x0 === p.x1;
  // Connection stations on horizontal pieces: where vertical members land on them
  const verticals = pieces.filter(vertical);
  let n = 0;
  return pieces.map((p) => {
    const start = v3(p.x0, p.y0, 0);
    const end = v3(p.x1, p.y1, 0);
    const length = centrelineLength({ start, end });
    const features: Feature[] = [];
    if (vertical(p)) {
      features.push(...connectionHoles(length, [0, length]));
      if (p.role !== "nogging") {
        features.push({ kind: "swage", position: 0, length: SWAGE_LENGTH }, { kind: "swage", position: length - SWAGE_LENGTH, length: SWAGE_LENGTH });
      }
    } else {
      const lo = Math.min(p.x0, p.x1);
      const hi = Math.max(p.x0, p.x1);
      const stations = verticals
        .filter((v) => v.x0 >= lo - 1e-6 && v.x0 <= hi + 1e-6 && (Math.abs(v.y0 - p.y0) < 2 * profile.thickness + 1e-6 || Math.abs(v.y1 - p.y0) < 2 * profile.thickness + 1e-6))
        .map((v) => v.x0 - lo);
      if (p.role === "nogging" || p.role === "lintel" || p.role === "sill") stations.push(0, length);
      features.push(...connectionHoles(length, dedupe(stations)));
    }
    return {
      id: `${mark}-${++n}`,
      role: p.role,
      profile,
      start,
      end,
      webAxis: v3(0, 0, 1),
      flipped: p.flipped,
      features: dedupeHoles(features),
    };
  });
}

function dedupe(xs: number[]): number[] {
  const out: number[] = [];
  for (const x of [...xs].sort((a, b) => a - b)) if (!out.length || x - out[out.length - 1]! > 1) out.push(x);
  return out;
}

/** Stations closer than the dimple pitch collapse into one connection */
function dedupeHoles(features: Feature[]): Feature[] {
  const seen = new Set<string>();
  return features.filter((f) => {
    const key = `${f.kind}:${Math.round(f.position)}:${"offset" in f ? Math.round(f.offset) : ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
