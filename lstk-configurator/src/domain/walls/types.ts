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

/**
 * Opening class, by clear width (docs/lstk-knowledge-base.md, rules 8–10):
 * - single: ≤ 600 mm — jack + king each side, flat lintel with cripples;
 * - double: 600–2400 mm — header truss; a second king from 1200 mm;
 * - truss: > 2400 mm — header truss, two jacks and two kings each side.
 */
export type OpeningClass = "single" | "double" | "truss";

/** Flat lintel with cripples up to this width; a header truss above, mm */
export const LINTEL_TRUSS_WIDTH = 600;
/** Clear height between the lintel and the top plate strips needed for a header truss, mm */
export const HEADER_MIN_CLEAR = 150;
/** Openings wider than this get a second king stud each side, mm */
export const DOUBLE_JAMB_WIDTH = 1200;
/** Openings wider than this get a second jack stud each side, mm */
export const DOUBLE_JACK_WIDTH = 2400;

export function openingClass(o: Opening): OpeningClass {
  if (o.width > DOUBLE_JACK_WIDTH) return "truss";
  if (o.width > LINTEL_TRUSS_WIDTH) return "double";
  return "single";
}

export const OPENING_LABEL: Record<OpeningKind, string> = { window: "Окно", door: "Дверь", gate: "Ворота" };
