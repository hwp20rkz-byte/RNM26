import { EPS, add2, cross2, dist2, dot2, len2, norm2, perpLeft, scale2, sub2, type Vec2 } from "./vec";

/**
 * Replace every interior corner of an open polyline with a circular arc of
 * radius `radius` (a cold-formed bend). The radius is clamped per corner so
 * that two neighbouring fillets never overlap on a short leg (e.g. a 10 mm lip
 * with a 4 mm bend radius still produces a valid shape).
 */
export function filletPolyline(points: readonly Vec2[], radius: number, maxSegmentAngle = Math.PI / 12): Vec2[] {
  if (points.length < 3 || radius <= 0) return [...points];
  const out: Vec2[] = [points[0]!];

  // Each leg can donate at most half its length to each of its two corners
  const legs = points.slice(1).map((p, i) => dist2(points[i]!, p));

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]!;
    const cur = points[i]!;
    const next = points[i + 1]!;
    const u = norm2(sub2(cur, prev));
    const w = norm2(sub2(next, cur));
    const turn = Math.acos(Math.max(-1, Math.min(1, dot2(u, w))));
    if (turn < 1e-6) {
      out.push(cur);
      continue;
    }
    const tanHalf = Math.tan(turn / 2);
    const maxTangent = Math.min(legs[i - 1]!, legs[i]!) / 2;
    const tangent = Math.min(radius * tanHalf, maxTangent);
    const r = tangent / tanHalf;

    const t1 = sub2(cur, scale2(u, tangent));
    const t2 = add2(cur, scale2(w, tangent));
    const side = cross2(u, w) > 0 ? 1 : -1;
    const centre = add2(t1, scale2(perpLeft(u), side * r));

    const a0 = Math.atan2(t1.y - centre.y, t1.x - centre.x);
    const segments = Math.max(2, Math.ceil(turn / maxSegmentAngle));
    out.push(t1);
    for (let s = 1; s < segments; s++) {
      const a = a0 + side * turn * (s / segments);
      out.push({ x: centre.x + r * Math.cos(a), y: centre.y + r * Math.sin(a) });
    }
    out.push(t2);
  }

  out.push(points[points.length - 1]!);
  return dedupe(out);
}

function dedupe(points: Vec2[]): Vec2[] {
  return points.filter((p, i) => i === 0 || dist2(p, points[i - 1]!) > EPS);
}

/**
 * Offset an open polyline sideways by `d` (positive = left of travel direction).
 * Interior vertices use a mitred normal so straight legs stay exactly parallel.
 * Fillets must already be applied: on sharp corners the mitre grows without bound.
 */
export function offsetPolyline(points: readonly Vec2[], d: number): Vec2[] {
  const n = points.length;
  if (n < 2) throw new Error("A polyline needs at least two points to offset");
  const segNormals: Vec2[] = [];
  for (let i = 0; i < n - 1; i++) segNormals.push(perpLeft(norm2(sub2(points[i + 1]!, points[i]!))));

  return points.map((p, i) => {
    if (i === 0) return add2(p, scale2(segNormals[0]!, d));
    if (i === n - 1) return add2(p, scale2(segNormals[n - 2]!, d));
    const a = segNormals[i - 1]!;
    const b = segNormals[i]!;
    const sum = add2(a, b);
    if (len2(sum) < EPS) throw new Error("Polyline folds back on itself — cannot offset");
    const m = norm2(sum);
    const k = d / dot2(m, a);
    return add2(p, scale2(m, k));
  });
}

/**
 * Turn an open centreline of a constant-thickness strip into the closed outline
 * of its cross-section: left offset forward, right offset backward.
 * The result is counter-clockwise.
 */
export function stripOutline(centreline: readonly Vec2[], thickness: number): Vec2[] {
  const half = thickness / 2;
  const left = offsetPolyline(centreline, half);
  const right = offsetPolyline(centreline, -half);
  const outline = [...left, ...right.reverse()];
  return signedArea(outline) < 0 ? outline.reverse() : outline;
}

export function polylineLength(points: readonly Vec2[]): number {
  let l = 0;
  for (let i = 1; i < points.length; i++) l += dist2(points[i - 1]!, points[i]!);
  return l;
}

/** Shoelace area; positive for counter-clockwise polygons */
export function signedArea(polygon: readonly Vec2[]): number {
  let a = 0;
  for (let i = 0; i < polygon.length; i++) {
    const p = polygon[i]!;
    const q = polygon[(i + 1) % polygon.length]!;
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

/** True if any two non-adjacent edges of a closed polygon intersect */
export function isSelfIntersecting(polygon: readonly Vec2[]): boolean {
  const n = polygon.length;
  const seg = (i: number) => [polygon[i]!, polygon[(i + 1) % n]!] as const;
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const [a, b] = seg(i);
      const [c, d] = seg(j);
      if (segmentsCross(a, b, c, d)) return true;
    }
  }
  return false;
}

function segmentsCross(a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
  const d1 = cross2(sub2(b, a), sub2(c, a));
  const d2 = cross2(sub2(b, a), sub2(d, a));
  const d3 = cross2(sub2(d, c), sub2(a, c));
  const d4 = cross2(sub2(d, c), sub2(b, c));
  return d1 * d2 < -EPS && d3 * d4 < -EPS;
}
