import type { ProfileSpec } from "../profiles/types";

export type OpeningKind = "window" | "door" | "gate";

export interface Opening {
  id: string;
  kind: OpeningKind;
  /** Clear opening, left edge from the wall start, mm */
  x: number;
  width: number;
  /** Clear height, mm */
  height: number;
  /** Window sill height above the bottom of the wall; 0 for doors and gates */
  sill: number;
}

export interface WallInput {
  /** Overall panel length, mm */
  length: number;
  /** Overall panel height, top of top plate, mm */
  height: number;
  /** Stud centres, mm */
  studSpacing: number;
  profile: ProfileSpec;
  openings: Opening[];
  /** Mid-height noggings between studs */
  noggings: boolean;
  /**
   * Extra full-height studs (corner backing, T-junction backing), web centre x
   * and flange direction. Grid studs that would clash with them are dropped.
   */
  backing?: BackingStud[];
}

export interface BackingStud {
  x: number;
  /** Flanges to +x (true) or −x (false) */
  flipped: boolean;
  /** Why it is there — drives the node catalogue */
  reason: "corner" | "tee";
}

/** Opening reinforcement class, by clear width (see docs/lstk-knowledge-base.md) */
export type OpeningClass = "single" | "double" | "truss";

/** Openings wider than this get a second (king) stud each side, mm */
export const DOUBLE_JAMB_WIDTH = 1200;
/**
 * Lintel: single C up to this width, box (two C toe-to-toe) above, mm.
 * A C89 laid flat bends about its weak axis: the design check
 * (domain/structure) fails a single lintel over ~650 mm under a snow roof.
 */
export const BOX_LINTEL_WIDTH = 600;
/** Header truss (lintel + top plate + diagonals) from this width, mm */
export const HEADER_TRUSS_WIDTH = 900;

export function openingClass(o: Opening): OpeningClass {
  if (o.width >= HEADER_TRUSS_WIDTH) return "truss";
  if (o.width > BOX_LINTEL_WIDTH) return "double";
  return "single";
}

export const OPENING_LABEL: Record<OpeningKind, string> = { window: "Окно", door: "Дверь", gate: "Ворота" };
