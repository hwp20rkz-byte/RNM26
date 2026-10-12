import type { Assembly } from "../assemblies/types";
import { placeMember } from "../assemblies/types";
import { add3, dot3, scale3, sub3, v3, type Vec3 } from "../geometry/vec";
import { centrelineLength, memberFrame } from "../members/member";
import type { Member } from "../members/types";
import { DETAILING, stripWidth } from "./planar";

/**
 * Clashes between members of different assemblies (wall to wall at corners
 * and T-junctions, trusses on the top plates, floor trusses on the walls).
 * Each member is a convex prism (see memberSolid). Swaged ends and lip cuts are inside one assembly, so between
 * assemblies any overlap is a real clash: two pieces of steel in one place.
 */

/**
 * A member as a convex prism: its outline in the (axis, flange) plane — the
 * strip with chamfered corners cut off — extruded over the web depth.
 */
export interface Solid {
  member: string;
  assembly: string;
  verts: Vec3[];
  /** Candidate separating directions contributed by this solid */
  normals: Vec3[];
  edges: Vec3[];
  c: Vec3;
  r: number;
}

export function memberSolid(m: Member, assembly: string, chamferLeg = DETAILING.chamferLeg): Solid {
  const f = memberFrame(m);
  const L = centrelineLength(m);
  const t = m.profile.thickness;
  const F = stripWidth(m.profile);
  const web = m.profile.family === "Hat" ? m.profile.depth : m.profile.web;
  const lo = -t / 2;
  const hi = F - t / 2;
  const cut = Math.min(chamferLeg, F - 2 * t);
  const chamferStart = m.features.some((x) => x.kind === "chamfer" && x.position <= 0.01);
  const chamferEnd = m.features.some((x) => x.kind === "chamfer" && x.position > 0.01);
  // Outline (u along the axis, v towards the flange tips), counter-clockwise
  const uv: [number, number][] = [[0, lo], [L, lo]];
  if (chamferEnd) uv.push([L, hi - cut], [L - cut, hi]);
  else uv.push([L, hi]);
  if (chamferStart) uv.push([cut, hi], [0, hi - cut]);
  else uv.push([0, hi]);
  const at = (u: number, v: number, w: number) => add3(add3(add3(m.start, scale3(f.axis, u)), scale3(f.flange, v)), scale3(f.web, w));
  const verts = uv.flatMap(([u, v]) => [at(u, v, -web / 2), at(u, v, web / 2)]);
  const edges2 = uv.map(([u, v], i) => {
    const [u2, v2] = uv[(i + 1) % uv.length]!;
    return add3(scale3(f.axis, u2 - u), scale3(f.flange, v2 - v));
  });
  const unit = (a: Vec3) => scale3(a, 1 / Math.hypot(a.x, a.y, a.z));
  const edges = [...edges2.map(unit), f.web];
  // Side faces: in-plane perpendiculars of the outline edges; caps: the web direction
  const normals = [f.web, ...edges2.map((e) => unit(cross(e, f.web)))];
  const c = scale3(verts.reduce((p, q) => add3(p, q), v3(0, 0, 0)), 1 / verts.length);
  const r = Math.max(...verts.map((p) => Math.hypot(p.x - c.x, p.y - c.y, p.z - c.z)));
  return { member: m.id, assembly, verts, normals, edges, c, r };
}

const cross = (u: Vec3, w: Vec3) => v3(u.y * w.z - u.z * w.y, u.z * w.x - u.x * w.z, u.x * w.y - u.y * w.x);

/** Penetration depth of two convex solids (0 when they are apart), separating-axis test */
export function penetration(a: Solid, b: Solid): number {
  const axes = [...a.normals, ...b.normals];
  for (const u of a.edges)
    for (const w of b.edges) {
      const c = cross(u, w);
      const l = Math.hypot(c.x, c.y, c.z);
      if (l > 1e-6) axes.push(scale3(c, 1 / l));
    }
  let min = Infinity;
  for (const n of axes) {
    let a0 = Infinity;
    let a1 = -Infinity;
    for (const p of a.verts) {
      const d = dot3(p, n);
      if (d < a0) a0 = d;
      if (d > a1) a1 = d;
    }
    let b0 = Infinity;
    let b1 = -Infinity;
    for (const p of b.verts) {
      const d = dot3(p, n);
      if (d < b0) b0 = d;
      if (d > b1) b1 = d;
    }
    const o = Math.min(a1, b1) - Math.max(a0, b0);
    if (o <= 0) return 0;
    min = Math.min(min, o);
  }
  return min;
}

export interface SpatialClash {
  a: string;
  b: string;
  assemblies: [string, string];
  depth: number;
  at: Vec3;
}

/** Overlaps deeper than `tol` mm between members of different assemblies */
export function spatialClashes(assemblies: readonly Assembly[], tol = 0.5): SpatialClash[] {
  const boxes = assemblies.flatMap((a) => a.members.map((m) => memberSolid(placeMember(m, a.placement), a.id)));
  const out: SpatialClash[] = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const A = boxes[i]!;
      const B = boxes[j]!;
      if (A.assembly === B.assembly) continue;
      const d = sub3(A.c, B.c);
      if (Math.hypot(d.x, d.y, d.z) > A.r + B.r) continue;
      const p = penetration(A, B);
      if (p > tol) out.push({ a: A.member, b: B.member, assemblies: [A.assembly, B.assembly], depth: p, at: scale3(add3(A.c, B.c), 0.5) });
    }
  }
  return out;
}
