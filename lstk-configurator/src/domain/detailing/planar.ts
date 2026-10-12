import { v3, type Vec3 } from "../geometry/vec";
import { DEFAULT_DIMPLES } from "../members/punching";
import { CUT_RESOLUTION_MM, flangeFlat } from "../members/member";
import type { Feature, Member, MemberRole } from "../members/types";
import type { ProfileSpec } from "../profiles/types";

/**
 * Production detailing of a flat assembly (wall panel or truss): every member
 * lies with its web across the assembly plane (webAxis ∥ z), so in the plane
 * x/y each member is a strip — the web line plus the flange width on the
 * flange side. Two members clash in 3D exactly when their strips overlap,
 * except where one end is swaged and nested inside the other's channel.
 *
 * For every member end the detailer finds the member it lands on (the host)
 * and sets the real cut end:
 * - nested: the end enters the host channel from the open side, stops
 *   `nestGap` short of the host web; the end gets a swage over the length that
 *   sits between the host flanges, the host gets a lip cut where it passes;
 * - butt: the end meets the back of the host web, stops `buttGap` short of it,
 *   the joint takes an angle clip;
 * - inclined ends get a chamfer on the flange-tip corner when that lets the
 *   member reach further;
 * - members that meet without a host (ridge, two webs at one node) are cut
 *   back until they clear each other by `buttGap`.
 *
 * Clearances and the chamfer leg are the detailer's settings for the specific
 * line — the C89 vendor has not published them yet [не проверено].
 */

export interface DetailingRules {
  /** End of a nested member to the inside face of the host web, mm */
  nestGap: number;
  /** Butt joints and members cut back from each other, mm */
  buttGap: number;
  /** Chamfer leg along the member, mm (die size) */
  chamferLeg: number;
  /** Lip cut runs past the incoming member on each side, mm */
  lipCutMargin: number;
  /** Shortest swage the tool makes, mm */
  minSwage: number;
  /** Longest swage the tool makes, mm */
  maxSwage: number;
  /**
   * A nested end must reach this far past the host flange tips, mm: one screw
   * row with 1.5d to both edges, d = 4.2 (AISI S100 J4), rounded up
   */
  minEngagement: number;
}

export const DETAILING: DetailingRules = {
  nestGap: 1,
  buttGap: 2,
  chamferLeg: 20,
  lipCutMargin: 2,
  minSwage: 45,
  maxSwage: 150,
  minEngagement: 13,
};

export type JointKind = "nested" | "butt" | "apex";

export interface Joint {
  kind: JointKind;
  /** Member whose end is detailed */
  member: string;
  end: "start" | "end";
  /** Member(s) it lands on; for "apex" the member it was cut back from */
  hosts: string[];
  /** Where the joint is, assembly-local mm */
  at: Vec3;
  /** Angle between the member and the (first) host, degrees */
  angle: number;
  chamfer: boolean;
}

export interface DetailingIssue {
  member: string;
  text: string;
}

export interface DetailedAssembly {
  members: Member[];
  joints: Joint[];
  issues: DetailingIssue[];
}

interface P2 {
  x: number;
  y: number;
}

const sub = (a: P2, b: P2): P2 => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: P2, b: P2): P2 => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a: P2, k: number): P2 => ({ x: a.x * k, y: a.y * k });
const dot = (a: P2, b: P2) => a.x * b.x + a.y * b.y;
const crs = (a: P2, b: P2) => a.x * b.y - a.y * b.x;

/** Out-to-out width of the flange (the strip width in the plane) */
export function stripWidth(p: ProfileSpec): number {
  return p.family === "Hat" ? p.crown : p.flange;
}

const hasLips = (p: ProfileSpec) => (p.family === "C" || p.family === "Z") && p.lip > 0;

/** Strip of a flat member in the assembly plane */
interface Strip {
  m: Member;
  i: number;
  /** Web-centreline start and unit direction */
  a: P2;
  d: P2;
  L: number;
  /** Unit vector from the web towards the flange tips */
  n: P2;
  t: number;
  F: number;
  rank: number;
  /** Sign that turns (−dy, dx) into the flange direction */
  sg: number;
  chamfer: { start: boolean; end: boolean };
}

/**
 * Who can carry whom: an end lands only on a member of a higher rank. Plates
 * and chords run through, studs land in plates, noggings and webs land on
 * studs and chords; at the heel the bottom chord nests in the top chord.
 */
const RANK: Record<MemberRole, number> = {
  track: 4,
  "top-chord": 4,
  "bottom-chord": 3.5,
  stud: 3,
  jamb: 3,
  jack: 3,
  post: 3,
  beam: 2.5,
  purlin: 2.5,
  lintel: 2,
  sill: 2,
  cripple: 1,
  nogging: 1,
  brace: 1,
  "truss-web": 1,
  batten: 1,
};

function isFlat(m: Member): boolean {
  const w = m.webAxis;
  const l = Math.hypot(w.x, w.y, w.z);
  return Math.abs(Math.abs(w.z) - l) < 1e-9 * Math.max(1, l) && Math.abs(m.start.z - m.end.z) < 1e-6;
}

function stripOf(m: Member, i: number): Strip {
  const a = { x: m.start.x, y: m.start.y };
  const v = sub({ x: m.end.x, y: m.end.y }, a);
  const L = Math.hypot(v.x, v.y);
  const d = mul(v, 1 / L);
  // memberFrame: web = ±z, flange = web × axis → (0,0,s) × (dx,dy,0) = s·(−dy, dx)
  const s = (m.webAxis.z > 0 ? 1 : -1) * (m.flipped ? -1 : 1);
  const n = { x: -s * d.y, y: s * d.x };
  return { m, i, a, d, L, n, t: m.profile.thickness, F: stripWidth(m.profile), rank: RANK[m.role], sg: s, chamfer: { start: false, end: false } };
}

const endPoint = (s: Strip, e: End): P2 => (e === "start" ? s.a : add(s.a, mul(s.d, s.L)));
const outward = (s: Strip, e: End): P2 => (e === "start" ? mul(s.d, -1) : s.d);
type End = "start" | "end";

/** Corners of one end of the strip (web side, then flange-tip side, chamfered if set) */
function endCorners(s: Strip, e: End, chamfer: boolean, leg: number): P2[] {
  const E = endPoint(s, e);
  const out = outward(s, e);
  const web = add(E, mul(s.n, -s.t / 2));
  const tipW = s.F - s.t / 2;
  if (!chamfer) return [web, add(E, mul(s.n, tipW))];
  const c = Math.min(leg, s.F - 2 * s.t);
  return [web, add(E, mul(s.n, tipW - c)), add(add(E, mul(out, -c)), mul(s.n, tipW))];
}

/** Convex outline of the strip, counter-clockwise */
function polygon(s: Strip, leg: number): P2[] {
  const a = endCorners(s, "start", s.chamfer.start, leg);
  const b = endCorners(s, "end", s.chamfer.end, leg);
  // Round the outline: start web → end web → end face to the tips → back along the tips
  const pts = [a[0]!, ...b, ...a.slice(1).reverse()];
  let area2 = 0;
  for (let i = 0; i < pts.length; i++) area2 += crs(pts[i]!, pts[(i + 1) % pts.length]!);
  return area2 < 0 ? pts.reverse() : pts;
}


/** Sutherland–Hodgman: intersection of two convex CCW polygons */
function clip(subject: P2[], clipper: P2[]): P2[] {
  let out = subject;
  for (let i = 0; i < clipper.length && out.length; i++) {
    const A = clipper[i]!;
    const B = clipper[(i + 1) % clipper.length]!;
    const edge = sub(B, A);
    const inside = (p: P2) => crs(edge, sub(p, A)) >= -1e-9;
    const input = out;
    out = [];
    for (let j = 0; j < input.length; j++) {
      const P = input[j]!;
      const Q = input[(j + 1) % input.length]!;
      const pin = inside(P);
      const qin = inside(Q);
      if (pin) out.push(P);
      if (pin !== qin) {
        const den = crs(edge, sub(Q, P));
        if (Math.abs(den) > 1e-12) out.push(add(P, mul(sub(Q, P), -crs(edge, sub(P, A)) / den)));
      }
    }
  }
  return out;
}

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
const boxOf = (poly: P2[]): Box => {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of poly) {
    if (p.x < x0) x0 = p.x;
    if (p.x > x1) x1 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.y > y1) y1 = p.y;
  }
  return { x0, y0, x1, y1 };
};
const apart = (a: Box, b: Box) => a.x1 < b.x0 || b.x1 < a.x0 || a.y1 < b.y0 || b.y1 < a.y0;

function area(poly: P2[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) s += crs(poly[i]!, poly[(i + 1) % poly.length]!);
  return Math.abs(s) / 2;
}

/** Overlaps smaller than this (mm²) are numerical contact, not a clash */
const AREA_TOL = 0.5;

const local = (s: Strip, p: P2) => ({ u: dot(sub(p, s.a), s.d), v: dot(sub(p, s.a), s.n) });

export interface Clash {
  a: string;
  b: string;
  /** Overlap area in the plane, mm² */
  area: number;
  at: Vec3;
  reason: string;
}

/**
 * Overlap of guest g with host h is legal when g's end is swaged over the
 * whole overlap, the overlap stays in h's channel (off h's web) and h's lips
 * are cut where g passes.
 */
function nestedOk(g: Strip, h: Strip, overlap: P2[], features: Feature[][]): string | null {
  const gl = overlap.map((p) => local(g, p));
  const hl = overlap.map((p) => local(h, p));
  if (Math.min(...hl.map((q) => q.v)) < h.t / 2 - 0.05) return "упирается в стенку";
  const uMin = Math.min(...gl.map((q) => q.u));
  const uMax = Math.max(...gl.map((q) => q.u));
  const swages = features[g.i]!.filter((f) => f.kind === "swage");
  const atStart = swages.some((f) => f.position <= 0.01 && f.position + f.length >= uMax - 0.05);
  const atEnd = swages.some((f) => f.position <= uMin + 0.05 && f.position + f.length >= g.L - 0.6);
  if (!atStart && !atEnd) return "конец не обжат на длине захода";
  if (hasLips(h.m.profile)) {
    const sMin = Math.min(...hl.map((q) => q.u));
    const sMax = Math.max(...hl.map((q) => q.u));
    const cut = features[h.i]!.some((f) => f.kind === "lip-cut" && f.position <= Math.max(0, sMin) + 0.05 && f.position + f.length >= Math.min(h.L, sMax) - 0.05);
    if (!cut) return "отгиб принимающей детали не подрезан";
  }
  return null;
}

/** All illegal overlaps between flat members of one assembly */
export function planarClashes(members: readonly Member[], rules: DetailingRules = DETAILING): Clash[] {
  const flat = members.map((m, i) => ({ m, i })).filter(({ m }) => isFlat(m));
  const strips = flat.map(({ m, i }) => {
    const s = stripOf(m, i);
    s.chamfer.start = m.features.some((f) => f.kind === "chamfer" && f.position <= 0.01);
    s.chamfer.end = m.features.some((f) => f.kind === "chamfer" && f.position > 0.01);
    return s;
  });
  const features = members.map((m) => m.features);
  const polys = strips.map((s) => polygon(s, rules.chamferLeg));
  const boxes = polys.map(boxOf);
  const out: Clash[] = [];
  for (let i = 0; i < strips.length; i++) {
    for (let j = i + 1; j < strips.length; j++) {
      // Different planes (truss webs offset out of plane, etc.) never meet here
      if (Math.abs(strips[i]!.m.start.z - strips[j]!.m.start.z) > 1e-6) continue;
      if (apart(boxes[i]!, boxes[j]!)) continue;
      const ov = clip(polys[i]!, polys[j]!);
      const A = ov.length >= 3 ? area(ov) : 0;
      if (A <= AREA_TOL) continue;
      const si = strips[i]!;
      const sj = strips[j]!;
      const r1 = nestedOk(si, sj, ov, features);
      const r2 = r1 === null ? null : nestedOk(sj, si, ov, features);
      if (r1 === null || r2 === null) continue;
      // Report the reading that got furthest (the real guest fails on swage or lip, not on the web)
      const stage = (r: string) => (r.includes("отгиб") ? 3 : r.includes("обжат") ? 2 : 1);
      const reason = stage(r2) > stage(r1) ? r2 : r1;
      const c = ov.reduce((p, q) => add(p, mul(q, 1 / ov.length)), { x: 0, y: 0 });
      out.push({ a: si.m.id, b: sj.m.id, area: A, at: v3(c.x, c.y, si.m.start.z), reason });
    }
  }
  return out;
}

/**
 * Detail a flat assembly. Members that are not flat (webAxis not ∥ z) pass
 * through unchanged. Feature positions are carried over to the new ends;
 * swages, chamfers and lip cuts are recomputed.
 */
export function detailPlanar(input: readonly Member[], rules: DetailingRules = DETAILING): DetailedAssembly {
  const strips = input.map((m, i) => (isFlat(m) ? stripOf(m, i) : null));
  const flat = strips.filter((s): s is Strip => s !== null);
  const original = flat.map((s) => ({ a: s.a, L: s.L }));
  const leg = rules.chamferLeg;
  const issues: DetailingIssue[] = [];
  const joints: Joint[] = [];
  const nested: { g: Strip; e: End; h: Strip }[] = [];

  const setEnd = (s: Strip, e: End, ext: number) => {
    if (e === "start") {
      s.a = add(s.a, mul(s.d, -ext));
      s.L += ext;
    } else s.L += ext;
  };
  /** Move one end to a new point, the other end staying put */
  const moveEnd = (s: Strip, e: End, P: P2) => {
    const other = endPoint(s, e === "start" ? "end" : "start");
    const [A, B] = e === "start" ? [P, other] : [other, P];
    const v = sub(B, A);
    s.L = Math.hypot(v.x, v.y);
    s.d = mul(v, 1 / s.L);
    s.a = A;
    s.n = { x: -s.sg * s.d.y, y: s.sg * s.d.x };
  };

  type Host = { h: Strip; kind: "nested" | "butt" };
  const hostsAt = new Map<string, Host[]>();
  const key = (s: Strip, e: End) => `${s.i}:${e}`;

  /** Furthest the end may go (+ = longer) on its hosts, and whether a chamfer helps */
  const resolve = (g: Strip, e: End, hosts: Host[]) => {
    const out = outward(g, e);
    const reach = (chamfer: boolean) =>
      Math.min(
        ...hosts.map(({ h, kind }) => {
          const k = dot(out, h.n);
          const vs = endCorners(g, e, chamfer, leg).map((c) => local(h, c).v);
          return kind === "nested" ? (Math.min(...vs) - h.t / 2 - rules.nestGap) / -k : (-h.t / 2 - rules.buttGap - Math.max(...vs)) / k;
        }),
      );
    const plain = reach(false);
    const withChamfer = reach(true);
    const chamfer = withChamfer > plain + 0.5;
    setEnd(g, e, chamfer ? withChamfer : plain);
    g.chamfer[e] = chamfer;
  };

  // 1. Ends that land on a host
  const hostBox = new Map(flat.map((s) => [s, boxOf(polygon(s, leg))]));
  for (const g of flat) {
    for (const e of ["start", "end"] as const) {
      const P = endPoint(g, e);
      const out = outward(g, e);
      const hosts: Host[] = [];
      for (const h of flat) {
        if (h === g || h.rank <= g.rank || Math.abs(h.m.start.z - g.m.start.z) > 1e-6) continue;
        const hb = hostBox.get(h)!;
        if (P.x < hb.x0 - 2 || P.x > hb.x1 + 2 || P.y < hb.y0 - 2 || P.y > hb.y1 + 2) continue;
        if (Math.abs(crs(g.d, h.d)) < 0.05) continue;
        const q = local(h, P);
        if (q.u < -1 || q.u > h.L + 1) continue;
        // The end face must land along the host, not just touch its end
        // (a lintel resting on top of a jack stud is not inside the jack)
        const us = endCorners(g, e, false, leg).map((c) => local(h, c).u);
        if (Math.min(h.L, Math.max(...us)) - Math.max(0, Math.min(...us)) < 1) continue;
        if (q.v < -h.t / 2 - 1.5 || q.v > h.F - h.t / 2 + 0.5) continue;
        const k = dot(out, h.n);
        // The end must be heading into the host, not running along its back
        if (Math.abs(k) < 0.05) continue;
        hosts.push({ h, kind: k < 0 ? "nested" : "butt" });
      }
      if (hosts.length) hostsAt.set(key(g, e), hosts);
    }
  }
  // Resolve after all hosts are known, so host lookups use the drawn layout
  for (const g of flat) for (const e of ["start", "end"] as const) {
    const hosts = hostsAt.get(key(g, e));
    if (hosts) resolve(g, e, hosts);
  }

  // 2. Members that still overlap without a host relation
  const hostOf = (g: Strip, h: Strip) => ["start", "end"].some((e) => hostsAt.get(`${g.i}:${e}`)?.some((x) => x.h === h));
  // Outlines are cached per strip and dropped whenever a fix moves it
  const cache = new Map<Strip, { poly: P2[]; box: Box }>();
  const shape = (s: Strip) => {
    let c = cache.get(s);
    if (!c) {
      const poly = polygon(s, leg);
      c = { poly, box: boxOf(poly) };
      cache.set(s, c);
    }
    return c;
  };
  const clashes = (A: Strip, B: Strip) => {
    cache.delete(A);
    cache.delete(B);
    return overlapping(A, B);
  };
  const overlapping = (A: Strip, B: Strip) => {
    const a = shape(A);
    const b = shape(B);
    if (apart(a.box, b.box)) return false;
    const o = clip(a.poly, b.poly);
    return o.length >= 3 && area(o) > AREA_TOL;
  };
  const apex: { s: Strip; e: End; from: Strip }[] = [];
  /** Bisection on a one-parameter fix; returns false if even `max` does not clear */
  const search = (apply: (x: number) => void, ok: () => boolean, max: number, margin: number) => {
    let lo = 0;
    let hi = 2;
    apply(hi);
    while (!ok() && hi < max) {
      lo = hi;
      hi = Math.min(max, hi * 2);
      apply(hi);
    }
    if (!ok()) {
      apply(0);
      return false;
    }
    for (let it = 0; it < 30; it++) {
      const mid = (lo + hi) / 2;
      apply(mid);
      if (ok()) hi = mid;
      else lo = mid;
    }
    apply(hi + margin);
    return true;
  };
  for (let pass = 0; pass < 6; pass++) {
    let changed = false;
    for (let i = 0; i < flat.length; i++) {
      for (let j = i + 1; j < flat.length; j++) {
        const A = flat[i]!;
        const B = flat[j]!;
        if (Math.abs(A.m.start.z - B.m.start.z) > 1e-6) continue;
        if (!overlapping(A, B)) continue;
        if (hostOf(A, B) || hostOf(B, A)) continue;
        const ov = clip(shape(A).poly, shape(B).poly);
        const c = ov.reduce((p, q) => add(p, mul(q, 1 / ov.length)), { x: 0, y: 0 });
        const nearEnd = (s: Strip): End | null => {
          const u = local(s, c).u;
          if (u < s.L / 2 && u < 400) return "start";
          if (u >= s.L / 2 && s.L - u < 400) return "end";
          return null;
        };
        const eA = nearEnd(A);
        const eB = nearEnd(B);
        // Two ends nested in the same host: slide them apart along it
        const common = eA && eB ? hostsAt.get(key(A, eA))?.find((x) => x.kind === "nested" && hostsAt.get(key(B, eB))?.some((y) => y.h === x.h && y.kind === "nested"))?.h : undefined;
        if (common && eA && eB) {
          // An end held by two hosts (king post under the ridge) stays put
          const tilt = (s: Strip, e: End) => ((hostsAt.get(key(s, e))?.length ?? 0) > 1 ? -1 : 1 - Math.abs(crs(s.d, common.d)));
          const tA = tilt(A, eA);
          const tB = tilt(B, eB);
          const movers = tA > tB + 0.05 ? [{ s: A, e: eA, o: B, oe: eB }] : tB > tA + 0.05 ? [{ s: B, e: eB, o: A, oe: eA }] : [{ s: A, e: eA, o: B, oe: eB }, { s: B, e: eB, o: A, oe: eA }];
          // Middle of the strip end, so the side the web lies on does not bias the direction
          const mid = (s: Strip, e: End) => add(endPoint(s, e), mul(s.n, s.F / 2 - s.t / 2));
          const saved = movers.map(({ s, e, o, oe }) => {
            const E = endPoint(s, e);
            let dir = Math.sign(dot(sub(mid(s, e), mid(o, oe)), common.d));
            if (dir === 0) dir = Math.sign(dot(mul(outward(s, e), -1), common.d)) || 1;
            return { s, e, E, dir, a: s.a, d: s.d, L: s.L, n: s.n, ch: s.chamfer[e] };
          });
          let ok = search(
            (delta) => {
              for (const x of saved) {
                x.s.a = x.a;
                x.s.d = x.d;
                x.s.L = x.L;
                x.s.n = x.n;
                x.s.chamfer[x.e] = x.ch;
                moveEnd(x.s, x.e, add(x.E, mul(common.d, x.dir * delta)));
                resolve(x.s, x.e, hostsAt.get(key(x.s, x.e))!);
              }
            },
            () => !clashes(A, B),
            300,
            rules.buttGap,
          );
          if (!ok) {
            // The other way round (a long web may clear only on its far side)
            for (const x of saved) x.dir = -x.dir;
            ok = search(
              (delta) => {
                for (const x of saved) {
                  x.s.a = x.a;
                  x.s.d = x.d;
                  x.s.L = x.L;
                  x.s.n = x.n;
                  x.s.chamfer[x.e] = x.ch;
                  moveEnd(x.s, x.e, add(x.E, mul(common.d, x.dir * delta)));
                  resolve(x.s, x.e, hostsAt.get(key(x.s, x.e))!);
                }
              },
              () => !clashes(A, B),
              300,
              rules.buttGap,
            );
          }
          cache.delete(A);
          cache.delete(B);
          if (!ok) issues.push({ member: A.m.id, text: `не удаётся развести с ${B.m.id} вдоль ${common.m.id}` });
          else changed = true;
          continue;
        }
        // Otherwise cut back the lower-ranked / more oblique end, or both
        const cand: { s: Strip; e: End }[] = [];
        if (eA && (A.rank < B.rank || !eB)) cand.push({ s: A, e: eA });
        else if (eB && (B.rank < A.rank || !eA)) cand.push({ s: B, e: eB });
        else if (eA && eB) cand.push({ s: A, e: eA }, { s: B, e: eB });
        if (!cand.length) {
          issues.push({ member: A.m.id, text: `пересекается с ${B.m.id}` });
          continue;
        }
        const saved = cand.map(({ s, e }) => ({ s, e, a: s.a, L: s.L }));
        const ok = search(
          (tau) => {
            for (const x of saved) {
              x.s.a = x.a;
              x.s.L = x.L;
              setEnd(x.s, x.e, -tau);
            }
          },
          () => !clashes(A, B),
          600,
          rules.buttGap / Math.max(0.2, Math.abs(crs(A.d, B.d)) || 1),
        );
        cache.delete(A);
        cache.delete(B);
        if (!ok) {
          issues.push({ member: A.m.id, text: `не удаётся развести с ${B.m.id}` });
          continue;
        }
        changed = true;
        for (const { s, e } of cand) apex.push({ s, e, from: s === A ? B : A });
      }
    }
    if (!changed) break;
  }

  // Shallow ends: the strip crosses the host channel over a long run. The end
  // does not have to bottom out on the host web — it is screwed through the
  // flanges — so it is cut back until the swage fits the die, keeping at
  // least `minEngagement` inside the channel.
  const swageDepth = (g: Strip, e: End) =>
    Math.max(
      0,
      ...(hostsAt.get(key(g, e)) ?? [])
        .filter((x) => x.kind === "nested")
        .map(({ h }) => {
          const ov = clip(polygon(g, leg), polygon(h, leg));
          if (ov.length < 3) return 0;
          const gu = ov.map((p) => local(g, p).u);
          return e === "start" ? Math.max(...gu) : g.L - Math.min(...gu);
        }),
    );
  const limit = rules.maxSwage - 3;
  for (const g of flat) {
    for (const e of ["start", "end"] as const) {
      if (swageDepth(g, e) <= limit) continue;
      const a0 = g.a;
      const L0 = g.L;
      search(
        (tau) => {
          g.a = a0;
          g.L = L0;
          setEnd(g, e, -tau);
        },
        () => swageDepth(g, e) <= limit,
        limit,
        0,
      );
    }
  }

  // Joints, from the final geometry
  for (const s of flat) {
    for (const e of ["start", "end"] as const) {
      const hosts = hostsAt.get(key(s, e));
      const cut = apex.filter((x) => x.s === s && x.e === e);
      if (!hosts && !cut.length) continue;
      const E = endPoint(s, e);
      const first = hosts?.[0]?.h ?? cut[0]!.from;
      joints.push({
        kind: hosts ? (hosts.some((h) => h.kind === "nested") ? "nested" : "butt") : "apex",
        member: s.m.id,
        end: e,
        hosts: [...new Set([...(hosts ?? []).map((h) => h.h.m.id), ...cut.map((x) => x.from.m.id)])],
        at: v3(E.x, E.y, s.m.start.z),
        angle: (Math.acos(Math.min(1, Math.abs(dot(s.d, first.d)))) * 180) / Math.PI,
        chamfer: s.chamfer[e],
      });
      for (const h of hosts ?? []) if (h.kind === "nested") nested.push({ g: s, e, h: h.h });
    }
  }

  // 3. Snap lengths to the cut grid (always shorter, so clearances hold)
  for (const s of flat) {
    const L = Math.floor(s.L / CUT_RESOLUTION_MM + 1e-6) * CUT_RESOLUTION_MM;
    // Shorten from the end that has a joint; split the difference otherwise
    s.L = L;
  }

  // 4. Features: carry over, then swages, chamfers and lip cuts
  const features: Feature[][] = input.map((m) => m.features);
  flat.forEach((s, k) => {
    const shift = dot(sub(s.a, original[k]!.a), s.d);
    const kept = s.m.features
      // Connection dimples are derived from the joints below
      .filter((f) => f.kind !== "swage" && f.kind !== "chamfer" && f.kind !== "lip-cut" && f.kind !== "dimple")
      .map((f) => ({ ...f, position: f.position - shift }) as Feature)
      .map((f) => (f.kind === "dimple" || f.kind === "bolt-hole" ? { ...f, position: Math.min(s.L - DEFAULT_DIMPLES.endDistance, Math.max(DEFAULT_DIMPLES.endDistance, f.position)) } : f))
      .filter((f) => {
        if (f.kind === "service-hole") return f.position - f.width / 2 >= 0 && f.position + f.width / 2 <= s.L;
        if (f.kind === "web-slot") return f.position - f.length / 2 >= 0 && f.position + f.length / 2 <= s.L;
        if (f.kind === "flange-cut") return f.position >= 0 && f.position + f.length <= s.L;
        return true;
      });
    if (s.chamfer.start) kept.push({ kind: "chamfer", position: 0, length: Math.min(leg, s.L / 2) });
    if (s.chamfer.end) kept.push({ kind: "chamfer", position: s.L - Math.min(leg, s.L / 2), length: Math.min(leg, s.L / 2) });
    features[s.i] = kept;
  });

  const polys = new Map(flat.map((s) => [s, polygon(s, leg)]));
  const lipCuts = new Map<Strip, [number, number][]>();
  const swageLen = new Map<string, number>();
  const grip = new Map<string, { depth: number; host: string }>();
  for (const { g, e, h } of nested) {
    const ov = clip(polys.get(g)!, polys.get(h)!);
    if (ov.length < 3) continue;
    const gu = ov.map((p) => local(g, p).u);
    const depth = e === "start" ? Math.max(...gu) : g.L - Math.min(...gu);
    const key = `${g.i}:${e}`;
    swageLen.set(key, Math.max(swageLen.get(key) ?? 0, depth));
    const hu = ov.map((p) => local(h, p).u);
    lipCuts.set(h, [...(lipCuts.get(h) ?? []), [Math.min(...hu) - rules.lipCutMargin, Math.max(...hu) + rules.lipCutMargin]]);
    const engagement = h.F - h.t / 2 - Math.min(...ov.map((p) => local(h, p).v));
    if (engagement > (grip.get(key)?.depth ?? -Infinity)) grip.set(key, { depth: engagement, host: h.m.id });
  }
  // Fasteners. A nested end is screwed or riveted flange to flange: one
  // fastener through each flange at the same point of both members, placed
  // in the overlap with 1.5d to its edges and on the flat of both flanges.
  // Heels (bottom chord in top chord) take as many as fit, 3d apart, up to 6
  // per flange, truss web ends up to 4, wall joints one. Members standing web to web are fastened through the webs.
  const dia = DEFAULT_DIMPLES.diameter;
  const flatOf = (st: Strip) => flangeFlat(st.m.profile);
  const addDimples = (st: Strip, P: P2) => {
    const q = local(st, P);
    for (const side of [1, -1] as const) features[st.i]!.push({ kind: "dimple", position: round(q.u), offset: round(q.v), diameter: dia, flange: side });
  };
  const fastened = new Set<string>();
  const noRoom = new Map<string, string[]>();
  for (const { g, e, h } of nested) {
    const ov = clip(polys.get(g)!, polys.get(h)!);
    if (ov.length < 3) continue;
    const fg = flatOf(g);
    const fh = flatOf(h);
    if (!fg || !fh) continue;
    const box = boxOf(ov);
    const heel = g.m.role === "bottom-chord" && h.m.role === "top-chord";
    const cands: { P: P2; margin: number }[] = [];
    const centroid = ov.reduce((p, q) => add(p, mul(q, 1 / ov.length)), { x: 0, y: 0 });
    // Most joints are square: the middle of the overlap is the place; search only if it is not
    const grid: P2[] = [centroid];
    if (heel || g.m.role === "truss-web" || !fits(centroid)) for (let x = box.x0; x <= box.x1; x += 3) for (let y = box.y0; y <= box.y1; y += 3) grid.push({ x, y });
    function fits(P: P2): boolean {
      return score(P) !== null;
    }
    function score(P: P2): number | null {
        let margin = Infinity;
        for (let i = 0; i < ov.length; i++) {
          const A = ov[i]!;
          const B = ov[(i + 1) % ov.length]!;
          const ed = sub(B, A);
          const l = Math.hypot(ed.x, ed.y);
          if (l < 1e-9) continue;
          margin = Math.min(margin, crs(ed, sub(P, A)) / l);
        }
        if (margin < FASTENER_EDGE) return null;
        const vg = local(g, P).v;
        const vh = local(h, P).v;
        if (vg - dia / 2 < fg!.from || vg + dia / 2 > fg!.to || vh - dia / 2 < fh!.from || vh + dia / 2 > fh!.to) return null;
        return margin;
    }
    for (const P of grid) {
      const m = score(P);
      if (m !== null) cands.push({ P, margin: m });
    }
    if (!cands.length) {
      noRoom.set(`${g.i}:${e}`, [...(noRoom.get(`${g.i}:${e}`) ?? []), h.m.id]);
      continue;
    }
    fastened.add(`${g.i}:${e}`);
    cands.sort((a, b) => b.margin - a.margin);
    const picked: P2[] = [];
    for (const c of cands) {
      if (picked.length >= (heel ? HEEL_FASTENERS : g.m.role === "truss-web" ? WEB_FASTENERS : 1)) break;
      if (picked.every((p) => Math.hypot(p.x - c.P.x, p.y - c.P.y) >= FASTENER_PITCH)) picked.push(c.P);
    }
    for (const P of picked) {
      addDimples(g, P);
      addDimples(h, P);
    }
  }
  // An end in two hosts (under the ridge) needs fasteners in one of them
  for (const [k, hosts] of noRoom) if (!fastened.has(k)) issues.push({ member: strips[Number(k.split(":")[0])]!.m.id, text: `нет места под крепёж в узле с ${hosts.join(", ")}` });
  for (let i = 0; i < flat.length; i++)
    for (let j = 0; j < flat.length; j++) {
      const A = flat[i]!;
      const B = flat[j]!;
      if (i === j || Math.abs(crs(A.d, B.d)) > 1e-6 || dot(A.n, B.n) > -0.99) continue;
      // B's web right behind A's web: an I-post or a stud pair, web to web
      if (Math.abs(local(A, B.a).v + A.t / 2 + B.t / 2) > 0.3 || i > j) continue;
      const u0 = local(A, B.a).u;
      const u1 = local(A, add(B.a, mul(B.d, B.L))).u;
      const lo = Math.max(0, Math.min(u0, u1)) + 60;
      const hi = Math.min(A.L, Math.max(u0, u1)) - 60;
      if (hi - lo < 50) continue;
      const n = Math.max(2, Math.ceil((hi - lo) / WEB_SCREW_PITCH) + 1);
      for (let k = 0; k < n; k++) {
        const u = lo + ((hi - lo) * k) / (n - 1);
        const P = add(A.a, mul(A.d, u));
        for (const off of [-WEB_FASTENER_OFFSET, WEB_FASTENER_OFFSET]) {
          features[A.i]!.push({ kind: "dimple", position: round(u), offset: off, diameter: dia });
          features[B.i]!.push({ kind: "dimple", position: round(local(B, P).u), offset: off, diameter: dia });
        }
      }
    }

  // An end under the ridge sits in both top chords and the ridge plate ties
  // them: one chord with full screw grip is enough
  for (const [k, { depth, host }] of grip) {
    if (depth < rules.minEngagement - 0.01) issues.push({ member: strips[Number(k.split(":")[0])]!.m.id, text: `заходит в ${host} всего на ${depth.toFixed(1)} мм` });
  }
  for (const [key, depth] of swageLen) {
    const [i, e] = key.split(":") as [string, End];
    const s = strips[Number(i)]!;
    const len = Math.max(rules.minSwage, Math.ceil(depth + 3));
    if (len > rules.maxSwage) issues.push({ member: s.m.id, text: `обжатие ${len} мм длиннее штампа (${rules.maxSwage} мм)` });
    const l = Math.min(len, s.L / 2);
    features[s.i]!.push({ kind: "swage", position: e === "start" ? 0 : s.L - l, length: l });
  }
  for (const [h, spans] of lipCuts) {
    if (!hasLips(h.m.profile)) continue;
    const merged: [number, number][] = [];
    for (const [a, b] of spans.map(([a, b]) => [Math.max(0, a), Math.min(h.L, b)] as [number, number]).sort((x, y) => x[0] - y[0])) {
      const last = merged[merged.length - 1];
      if (last && a <= last[1] + 1) last[1] = Math.max(last[1], b);
      else merged.push([a, b]);
    }
    for (const [a, b] of merged) {
      // Rounded inwards to 0.1 mm so the cut never runs past the member end
      const from = Math.ceil(a * 10 - 1e-6) / 10;
      const to = Math.floor(b * 10 + 1e-6) / 10;
      if (to > from) features[h.i]!.push({ kind: "lip-cut", position: from, length: round(to - from) });
    }
  }

  const members = input.map((m, i) => {
    const s = strips[i];
    if (!s) return m;
    const end = add(s.a, mul(s.d, s.L));
    return { ...m, start: v3(s.a.x, s.a.y, m.start.z), end: v3(end.x, end.y, m.end.z), features: features[i]! };
  });
  for (const s of flat) if (s.L < 2 * DEFAULT_DIMPLES.endDistance) issues.push({ member: s.m.id, text: `после подрезки осталось ${s.L} мм` });
  return { members, joints, issues };
}

const round = (v: number) => Math.round(v * 10) / 10;

/** Fastener centre to any edge of the joint overlap, mm (1.5d for d = 4.8, rounded up) */
const FASTENER_EDGE = 8;
/** Between fasteners, mm (3d for d = 4.8, rounded up) */
const FASTENER_PITCH = 16;
/** Fasteners per flange at a truss heel, at most */
export const HEEL_FASTENERS = 6;
/** Fasteners per flange at a truss web end, at most (as many as fit) */
export const WEB_FASTENERS = 4;
/** Web-to-web pairs: a fastener pair across the web this often, mm */
const WEB_SCREW_PITCH = 300;
const WEB_FASTENER_OFFSET = 25;

export interface DetailingSummary {
  /** Physical joints over all assemblies (repeated trusses counted each time) */
  nested: number;
  butt: number;
  apex: number;
  chamfers: number;
  swages: number;
  lipCuts: number;
  /** Illegal overlaps, checked once per assembly mark */
  clashes: number;
  /** Unresolved detailing problems */
  issues: number;
  nestGap: number;
  buttGap: number;
}

export function detailingSummary(assemblies: readonly { mark: string; members: Member[]; joints?: Joint[]; detailIssues?: DetailingIssue[] }[], rules: DetailingRules = DETAILING): DetailingSummary {
  const s: DetailingSummary = { nested: 0, butt: 0, apex: 0, chamfers: 0, swages: 0, lipCuts: 0, clashes: 0, issues: 0, nestGap: rules.nestGap, buttGap: rules.buttGap };
  const checked = new Set<string>();
  for (const a of assemblies) {
    for (const j of a.joints ?? []) s[j.kind] += 1;
    for (const m of a.members)
      for (const f of m.features) {
        if (f.kind === "chamfer") s.chamfers += 1;
        if (f.kind === "swage") s.swages += 1;
        if (f.kind === "lip-cut") s.lipCuts += 1;
      }
    if (checked.has(a.mark)) continue;
    checked.add(a.mark);
    s.clashes += planarClashes(a.members, rules).length;
    s.issues += a.detailIssues?.length ?? 0;
  }
  return s;
}
