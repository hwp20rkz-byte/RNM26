/**
 * Minimal vector math for the domain layer. The domain never imports three.js:
 * geometry here is pure data (millimetres) that render adapters turn into meshes,
 * and that BOM/CNC exporters consume without a WebGL context.
 */

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export const v2 = (x: number, y: number): Vec2 => ({ x, y });
export const add2 = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub2 = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale2 = (a: Vec2, k: number): Vec2 => ({ x: a.x * k, y: a.y * k });
export const dot2 = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
/** z-component of the 2D cross product: > 0 means b turns left from a */
export const cross2 = (a: Vec2, b: Vec2): number => a.x * b.y - a.y * b.x;
export const len2 = (a: Vec2): number => Math.hypot(a.x, a.y);
export const dist2 = (a: Vec2, b: Vec2): number => len2(sub2(a, b));

export function norm2(a: Vec2): Vec2 {
  const l = len2(a);
  if (l === 0) throw new Error("Cannot normalise a zero-length 2D vector");
  return { x: a.x / l, y: a.y / l };
}

/** Left-hand normal (rotate +90°) */
export const perpLeft = (a: Vec2): Vec2 => ({ x: -a.y, y: a.x });

export const v3 = (x: number, y: number, z: number): Vec3 => ({ x, y, z });
export const add3 = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const sub3 = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const scale3 = (a: Vec3, k: number): Vec3 => ({ x: a.x * k, y: a.y * k, z: a.z * k });
export const dot3 = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross3 = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
export const len3 = (a: Vec3): number => Math.hypot(a.x, a.y, a.z);
export const dist3 = (a: Vec3, b: Vec3): number => len3(sub3(a, b));

export function norm3(a: Vec3): Vec3 {
  const l = len3(a);
  if (l === 0) throw new Error("Cannot normalise a zero-length 3D vector");
  return { x: a.x / l, y: a.y / l, z: a.z / l };
}

export const EPS = 1e-9;
