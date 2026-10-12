import { v3 } from "../geometry/vec";
import { DETAILING, detailPlanar, type DetailedAssembly } from "../detailing/planar";
import { centrelineLength } from "../members/member";
import { connectionHoles } from "../members/punching";
import type { Feature, Member, MemberRole } from "../members/types";
import type { ProfileSpec } from "../profiles/types";
import { DOUBLE_JACK_WIDTH, DOUBLE_JAMB_WIDTH, HEADER_MIN_CLEAR, openingClass, type Opening, type WallInput } from "./types";

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
 *
 * Openings (LSTK 3.0 practice, rules 8–11 in docs/lstk-knowledge-base.md):
 * - each side a jack stud carries the lintel and a king stud runs full
 *   height beside it, web to web (an I-post screwed through the webs); from
 *   1200 mm a second king, from 2400 mm a second jack, lip to lip;
 * - the lintel lies flanges up on the jacks; up to 600 mm cripples tie it to
 *   the top plate, wider openings get a header truss (lintel and top plate
 *   as chords, verticals and Pratt diagonals nested into both);
 * - corner and T-junction backing studs where other walls meet this one.
 *
 * The layout is drawn member face to member face; `detailPlanar` then sets the
 * real cut ends (clearances, swages, lip cuts, chamfers), see domain/detailing.
 */

/** Gap between the lips of a box post or box lintel, mm */
const BOX_GAP = DETAILING.buttGap;
const MIN_GAP = 100;
const MIN_CRIPPLE = 120;

function flangeOf(p: ProfileSpec): number {
  return p.family === "Hat" ? p.crown : p.flange;
}

export function openingTop(o: Opening): number {
  return o.sill + o.height;
}

/** Width taken by the posts beside an opening, from the clear edge outwards */
export function jambZone(o: Opening, p: ProfileSpec): number {
  const f = flangeOf(p);
  const jacks = o.width > DOUBLE_JACK_WIDTH ? 2 : 1;
  const kings = o.width > DOUBLE_JAMB_WIDTH ? 2 : 1;
  // Members of one strip each, a lip-to-lip gap between every box pair
  return (jacks + kings) * f + (jacks - 1 + kings - 1) * BOX_GAP;
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
    // jamb (or box post) + end stud + room for the end stud's flange
    const zone = jambZone(o, input.profile) + t + f;
    if (o.x < zone) e.push(`${name}: слишком близко к началу стены (минимум ${Math.ceil(zone)} мм)`);
    if (o.x + o.width > input.length - zone) e.push(`${name}: слишком близко к концу стены`);
    if (openingTop(o) > input.height - 3 * t) e.push(`${name}: верх проёма упирается в обвязку`);
    const next = sorted[i + 1];
    const pier = jambZone(o, input.profile) + (next ? jambZone(next, input.profile) : 0) + MIN_GAP;
    if (next && next.x - (o.x + o.width) < pier) e.push(`${name} и ${i + 2}: простенок меньше ${Math.ceil(pier)} мм`);
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
  return generateWallDetailed(input, mark).members;
}

/** Wall members with the production detailing (joints, issues) */
export function generateWallDetailed(input: WallInput, mark = "W"): DetailedAssembly {
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
  // Opening posts: jack studs carry the lintel, king studs run full height
  const frames = openings.map((o) => ({ o, left: openingPosts(o, "left", profile), right: openingPosts(o, "right", profile) }));
  for (const { left, right } of frames)
    for (const post of [...left.posts, ...right.posts]) {
      if (post.role === "jamb") fullStuds.push({ x: post.x, flipped: post.flipped, role: "jamb" });
    }
  const backing = (input.backing ?? []).filter((b) => b.x > t + f && b.x < L - t - f && !openings.some((o) => b.x > o.x - jambZone(o, profile) - f && b.x < o.x + o.width + jambZone(o, profile) + f));
  for (const b of backing) fullStuds.push({ x: b.x, flipped: b.flipped, role: "stud" });

  // Keep-out zones around openings, ends and backing studs, where grid studs are replaced
  const blocked = (x: number) =>
    x < t + f ||
    x > L - t - f ||
    openings.some((o) => x > o.x - jambZone(o, profile) - f && x < o.x + o.width + jambZone(o, profile) + f) ||
    backing.some((b) => Math.abs(x - b.x) < t + f);

  const grid: number[] = [];
  for (let x = input.studSpacing; x < L; x += input.studSpacing) grid.push(x);
  for (const x of grid) if (!blocked(x)) fullStuds.push({ x, flipped: false, role: "stud" });

  for (const s of fullStuds) pieces.push({ role: s.role, x0: s.x, y0: t, x1: s.x, y1: H - t, flipped: s.flipped });

  // Openings (ЛСТК: king + jack each side, lintel on the jacks):
  // - the lintel lies flanges up on the jack studs and butts the king studs;
  // - up to 600 mm: cripples on the stud grid tie it to the top plate;
  // - wider: the lintel and the top plate are the chords of a header truss
  //   with verticals and Pratt diagonals nested into both;
  // - windows: a sill flanges down between the jacks, cripples below it.
  for (const { o, left, right } of frames) {
    const top = openingTop(o);
    for (const post of [...left.posts, ...right.posts]) {
      if (post.role === "jack") pieces.push({ role: "jack", x0: post.x, y0: t, x1: post.x, y1: top, flipped: post.flipped });
    }
    const x0 = left.lintelEnd;
    const x1 = right.lintelEnd;
    pieces.push({ role: "lintel", x0, y0: top + t / 2, x1, y1: top + t / 2, flipped: false });
    if (o.kind === "window") pieces.push({ role: "sill", x0: o.x, y0: o.sill - t / 2, x1: o.x + o.width, y1: o.sill - t / 2, flipped: true });
    const inside = grid.filter((x) => x > o.x + f && x < o.x + o.width - 2);
    if (o.kind === "window" && o.sill - t - t >= MIN_CRIPPLE) for (const x of inside) pieces.push({ role: "cripple", x0: x, y0: t, x1: x, y1: o.sill - t, flipped: false });

    // Header: room between the lintel strip and the top plate strip
    const clear = H - f - (top + f);
    if (openingClass(o) !== "single" && clear >= HEADER_MIN_CLEAR) pieces.push(...headerTruss(left.bearing, right.bearing, top, H, profile));
    else if (H - t - (top + t) >= MIN_CRIPPLE) for (const x of inside) pieces.push({ role: "cripple", x0: x, y0: top + t, x1: x, y1: H - t, flipped: false });
  }

  // Noggings at mid-height between neighbouring full-height members, skipping openings
  if (input.noggings) {
    const y = H / 2;
    const xs = fullStuds.map((s) => s.x).sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i++) {
      const a = xs[i]! + t / 2;
      const b = xs[i + 1]! - t / 2;
      const mid = (a + b) / 2;
      // The opening's sill, lintels and cripples already brace that bay; a
      // nogging there would run into them
      const inOpening = openings.some((o) => mid > o.x && mid < o.x + o.width);
      if (!inOpening && b - a >= MIN_CRIPPLE) pieces.push({ role: "nogging", x0: a, y0: y, x1: b, y1: y, flipped: false });
    }
  }

  return detailPlanar(toMembers(pieces, profile, mark));
}


interface Post {
  role: "jack" | "jamb";
  /** Web centreline x */
  x: number;
  /** Flanges to +x */
  flipped: boolean;
  lo: number;
  hi: number;
}

/**
 * Posts on one side of an opening, from the clear edge outwards. Neighbours
 * alternate their flanges, so every pair either sits web to web (screwed
 * through the webs, an I-post) or lip to lip with `BOX_GAP` (a box):
 *
 *   ≤ 1200 mm      jack ⟩⟨ king
 *   1200–2400 mm   jack ⟩⟨ king ⟩ ⟨ king
 *   > 2400 mm      jack ⟩ ⟨ jack ⟩⟨ king ⟩ ⟨ king
 *
 * (⟩ = flanges towards the opening). The lintel runs over the jacks to the
 * web of the first king.
 */
function openingPosts(o: Opening, side: "left" | "right", p: ProfileSpec): { posts: Post[]; lintelEnd: number; bearing: { lo: number; hi: number } } {
  const t = p.thickness;
  const f = flangeOf(p);
  const jacks = o.width > DOUBLE_JACK_WIDTH ? 2 : 1;
  const kings = o.width > DOUBLE_JAMB_WIDTH ? 2 : 1;
  // From the opening outwards: true = flanges towards the opening
  const seq: { role: Post["role"]; toward: boolean }[] =
    jacks === 2
      ? [{ role: "jack", toward: false }, { role: "jack", toward: true }, { role: "jamb", toward: false }, { role: "jamb", toward: true }]
      : [{ role: "jack", toward: true }, { role: "jamb", toward: false }, { role: "jamb", toward: true }];
  if (kings === 1) seq.pop();
  const dir = side === "left" ? -1 : 1;
  const edge = side === "left" ? o.x : o.x + o.width;
  let d = 0;
  const posts: Post[] = [];
  seq.forEach((s, i) => {
    // Lips meet (box) when the previous member's flanges point outwards and this one's inwards
    if (i > 0 && !seq[i - 1]!.toward && s.toward) d += BOX_GAP;
    const near = edge + dir * d;
    const far = edge + dir * (d + f);
    const lo = Math.min(near, far);
    const hi = Math.max(near, far);
    // Flanges towards the opening = towards −dir
    const plusX = s.toward ? dir < 0 : dir > 0;
    posts.push({ role: s.role, x: plusX ? lo + t / 2 : hi - t / 2, flipped: plusX, lo, hi });
    d += f;
  });
  const lastJack = posts.filter((q) => q.role === "jack").at(-1)!;
  return { posts, lintelEnd: side === "left" ? lastJack.lo : lastJack.hi, bearing: { lo: lastJack.lo, hi: lastJack.hi } };
}

/**
 * Header truss over an opening: lintel (bottom chord, flanges up) and top
 * plate (top chord, flanges down), verticals over the jacks and at even
 * panel points, Pratt diagonals sloping down towards mid-span (in tension
 * under gravity). Pieces are laid on the analytical lines through the middle
 * of the chord strips; the detailer nests every end into the chords.
 */
function headerTruss(left: { lo: number; hi: number }, right: { lo: number; hi: number }, top: number, H: number, p: ProfileSpec): Piece[] {
  const t = p.thickness;
  const f = flangeOf(p);
  const yb = top + f / 2;
  const yt = H - f / 2;
  const depth = yt - yb;
  const a = (left.lo + left.hi) / 2;
  const b = (right.lo + right.hi) / 2;
  // Panels about 1.2 × depth wide (webs near 40°), an even count for symmetry
  let n = Math.max(2, Math.ceil((b - a) / (1.2 * depth)));
  if (n % 2) n += 1;
  const xs = Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
  const out: Piece[] = [];
  const off = f / 2 - t / 2;
  xs.forEach((x, i) => {
    // Verticals: flanges towards mid-span, so the end ones sit web to web with the kings
    const plusX = i <= n / 2;
    const xc = plusX ? x - off : x + off;
    out.push({ role: "cripple", x0: xc, y0: yb, x1: xc, y1: yt, flipped: plusX });
  });
  for (let i = 0; i < n; i++) {
    const leftHalf = i < n / 2;
    const [ax, ay, bx, by] = leftHalf ? [xs[i]!, yt, xs[i + 1]!, yb] : [xs[i]!, yb, xs[i + 1]!, yt];
    const l = Math.hypot(bx - ax, by - ay);
    // Unflipped flange direction (−dy, dx); shift so the strip is centred on the line
    const nx = -(by - ay) / l;
    const ny = (bx - ax) / l;
    out.push({ role: "brace", x0: ax - nx * off, y0: ay - ny * off, x1: bx - nx * off, y1: by - ny * off, flipped: false });
  }
  return out;
}

function toMembers(pieces: Piece[], profile: ProfileSpec, mark: string): Member[] {
  const vertical = (p: Piece) => p.x0 === p.x1;
  const diagonal = (p: Piece) => p.x0 !== p.x1 && p.y0 !== p.y1;
  // Connection stations on horizontal pieces: where vertical members land on them
  const verticals = pieces.filter(vertical);
  let n = 0;
  return pieces.map((p) => {
    const start = v3(p.x0, p.y0, 0);
    const end = v3(p.x1, p.y1, 0);
    const length = centrelineLength({ start, end });
    const features: Feature[] = [];
    if (vertical(p) || diagonal(p)) {
      features.push(...connectionHoles(length, [0, length]));
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
