import { dirToWorld, toWorld, type Frame3 } from "../geometry/frame";
import type { Vec3 } from "../geometry/vec";
import type { Member } from "../members/types";

/**
 * An assembly is one production unit: a wall panel or a truss, rolled and
 * screwed together on the table, then lifted into place. Members are stored in
 * the assembly's local coordinates (x along, y up, z through the thickness), so
 * the same data feeds the shop drawing (DXF), the marking and the 3D model.
 */
export type AssemblyKind = "wall" | "truss" | "frame";

export interface Assembly {
  id: string;
  /** Marking printed on every piece, e.g. "W1", "T3" */
  mark: string;
  kind: AssemblyKind;
  name: string;
  members: Member[];
  placement: Frame3;
  /** Local bounding size for drawings, mm */
  size: { width: number; height: number };
  /** Unit direction in model coordinates the assembly moves along in the exploded view */
  explode: Vec3;
  /** Explode order: 0 = moves least (walls), higher = later layers (roof) */
  layer: number;
}

/** Member transformed from assembly-local to model coordinates */
export function placeMember(m: Member, f: Frame3): Member {
  return { ...m, start: toWorld(f, m.start), end: toWorld(f, m.end), webAxis: dirToWorld(f, m.webAxis) };
}

export function worldMembers(assemblies: readonly Assembly[]): Member[] {
  return assemblies.flatMap((a) => a.members.map((m) => placeMember(m, a.placement)));
}
