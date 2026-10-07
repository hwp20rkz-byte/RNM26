import type { WebPattern } from "../trusses/types";
import type { Opening } from "../walls/types";

export type BuildingKind = "enclosed" | "carport";
export type WallSide = "front" | "back" | "left" | "right";

export interface BuildingInput {
  kind: BuildingKind;
  /** Along the ridge (model x), out-to-out, mm */
  length: number;
  /** Across the ridge = truss span (model z), out-to-out, mm */
  width: number;
  /** Top of the top plate / eave beam above the floor, mm */
  wallHeight: number;
  pitchDeg: number;
  trussPattern: WebPattern;
  trussPanels: number;
  trussSpacing: number;
  studSpacing: number;
  /** Eaves overhang along the rafter, mm */
  overhang: number;
  /** Carport: maximum post spacing along the length, mm */
  postSpacing: number;
  profileId: string;
  openings: Record<WallSide, Opening[]>;
}

export const WALL_SIDE_LABEL: Record<WallSide, string> = {
  front: "Фасад (длинная, спереди)",
  back: "Задняя (длинная)",
  left: "Торец левый",
  right: "Торец правый",
};

export interface BuildingPreset {
  id: string;
  name: string;
  input: BuildingInput;
}
