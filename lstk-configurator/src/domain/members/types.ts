import type { Vec3 } from "../geometry/vec";
import type { ProfileSpec } from "../profiles/types";

export type MemberRole =
  | "stud"
  | "track"
  | "jamb"
  | "sill"
  | "cripple"
  | "post"
  | "beam"
  | "nogging"
  | "brace"
  | "top-chord"
  | "bottom-chord"
  | "truss-web"
  | "purlin"
  | "lintel"
  | "batten";

/**
 * Operations the roll-former's punch/cut station performs. Positions are along
 * the member from its start (mm); `offset` is across the web from the web
 * centre (mm, section y). Shapes are informational for the 3D view —
 * a CNC exporter maps `kind` to the tool numbers of the specific line.
 */
export type Feature =
  | { kind: "service-hole"; position: number; offset: number; width: number; height: number }
  | { kind: "dimple"; position: number; offset: number; diameter: number }
  | { kind: "bolt-hole"; position: number; offset: number; diameter: number }
  | { kind: "web-slot"; position: number; offset: number; length: number; width: number }
  | { kind: "lip-cut"; position: number; length: number }
  /** End swage: flanges pressed in so the member end nests inside a track/chord */
  | { kind: "swage"; position: number; length: number }
  | { kind: "flange-cut"; position: number; length: number };

export interface Member {
  id: string;
  role: MemberRole;
  profile: ProfileSpec;
  /** Centreline end points in the model, mm */
  start: Vec3;
  end: Vec3;
  /**
   * Direction the section's +y (along the web) should face, in model space.
   * Projected onto the plane perpendicular to the member; must not be parallel to it.
   */
  webAxis: Vec3;
  /** Flip the section about its web (flanges point the other way) */
  flipped?: boolean;
  features: Feature[];
}
