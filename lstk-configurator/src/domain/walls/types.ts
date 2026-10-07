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
}

export const OPENING_LABEL: Record<OpeningKind, string> = { window: "Окно", door: "Дверь", gate: "Ворота" };
