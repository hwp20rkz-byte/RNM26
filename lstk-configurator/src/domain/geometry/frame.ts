import { add3, cross3, norm3, scale3, v3, type Vec3 } from "./vec";

/**
 * Rigid placement of a local coordinate system in the model (mm). Assemblies
 * (wall panels, trusses) are designed flat in their own x/y plane — the way they
 * are built on the assembly table — and placed into the building with a Frame3.
 */
export interface Frame3 {
  origin: Vec3;
  /** Unit axes of the local system expressed in model coordinates */
  ex: Vec3;
  ey: Vec3;
  ez: Vec3;
}

export const IDENTITY: Frame3 = { origin: v3(0, 0, 0), ex: v3(1, 0, 0), ey: v3(0, 1, 0), ez: v3(0, 0, 1) };

/** Frame from an origin and two axes; ez completes a right-handed system */
export function frame(origin: Vec3, ex: Vec3, ey: Vec3): Frame3 {
  const x = norm3(ex);
  const y = norm3(ey);
  return { origin, ex: x, ey: y, ez: cross3(x, y) };
}

export function toWorld(f: Frame3, p: Vec3): Vec3 {
  return add3(f.origin, add3(scale3(f.ex, p.x), add3(scale3(f.ey, p.y), scale3(f.ez, p.z))));
}

export function dirToWorld(f: Frame3, d: Vec3): Vec3 {
  return add3(scale3(f.ex, d.x), add3(scale3(f.ey, d.y), scale3(f.ez, d.z)));
}

/** Rotation about the model's vertical (y) axis by `deg`, then translation */
export function yawFrame(origin: Vec3, deg: number): Frame3 {
  const a = (deg * Math.PI) / 180;
  return frame(origin, v3(Math.cos(a), 0, -Math.sin(a)), v3(0, 1, 0));
}
