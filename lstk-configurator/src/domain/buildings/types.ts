import type { WebPattern } from "../trusses/types";
import type { Opening } from "../walls/types";

export type WallSide = "front" | "back" | "left" | "right";
export const WALL_SIDES: readonly WallSide[] = ["front", "back", "left", "right"];

/**
 * How a side of a level is built:
 * - wall: framed panel with the user's openings;
 * - half: parapet (≈1 m) with posts and a lintel above — gazebos, BBQ zones;
 * - open: posts, lintel and top plate only — carports, open sides of a gazebo.
 * All three are wall panels to the generator: "half"/"open" are walls whose
 * bays are openings, so posts are jamb studs and the beam is lintel + top plate.
 */
export type SideType = "wall" | "half" | "open";

export interface SideConfig {
  type: SideType;
  /** For "wall": user openings. For "half": doors mark passage bays. */
  openings: Opening[];
}

export type RoomPurpose =
  | "living"
  | "bedroom"
  | "kitchen"
  | "bathroom"
  | "steam"
  | "washing"
  | "rest"
  | "hall"
  | "storage"
  | "technical"
  | "garage"
  | "workshop"
  | "poultry"
  | "open";

export interface Partition {
  id: string;
  /** "x": a wall across the building at x = at; "z": a wall along it at z = at */
  axis: "x" | "z";
  /** Centre line from the model origin, mm */
  at: number;
  /** Doors, x measured from the inner face of the outer wall where the partition starts */
  doors: Opening[];
}

export interface Level {
  /** Wall height of this level (top of top plate above the level's base), mm */
  height: number;
  sides: Record<WallSide, SideConfig>;
  partitions: Partition[];
  /** Room purpose by cell key "i-j" (see layout/rooms.ts) */
  rooms: Record<string, RoomPurpose>;
}

export type RoofType = "gable" | "mono";

export interface RoofConfig {
  type: RoofType;
  pitchDeg: number;
  /** Eaves overhang along the rafter, mm */
  overhang: number;
  pattern: WebPattern;
  panels: number;
  /** Mono-pitch: height of the truss at the low (front) side, mm */
  heelHeight: number;
}

export type FoundationType = "screw-piles" | "strip" | "slab" | "none";

export interface FoundationConfig {
  type: FoundationType;
  /** Height of the base of the frame above ground (цоколь), mm */
  plinth: number;
}

/** How the building is used — decides whether and how it is insulated */
export type HeatingMode = "permanent" | "seasonal" | "bath" | "none";

export interface BuildingInput {
  productId: string;
  /** Along the ridge (model x), out-to-out, mm */
  length: number;
  /** Across the ridge = truss span (model z), out-to-out, mm */
  width: number;
  levels: Level[];
  roof: RoofConfig;
  trussSpacing: number;
  studSpacing: number;
  /** Max post spacing on half/open sides, mm */
  postSpacing: number;
  /** Parapet height on half sides, mm */
  parapet: number;
  foundation: FoundationConfig;
  heating: HeatingMode;
  profileId: string;
}

export const MAX_LEVELS = 2;
