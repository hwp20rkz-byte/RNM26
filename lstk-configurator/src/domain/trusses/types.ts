import type { ProfileSpec } from "../profiles/types";

/** Outline of the truss. All lengths mm, angles degrees. */
export type TrussShape =
  /** Gable, chords meet at the heel */
  | { kind: "triangular"; pitchDeg: number }
  /** Gable with a vertical end post (heel) — "трапециевидная" */
  | { kind: "trapezoidal"; pitchDeg: number; heelHeight: number }
  /** Flat, parallel chords */
  | { kind: "parallel"; depth: number }
  /** Mono-pitch: low heel at x = 0 rising to the high end at x = span */
  | { kind: "mono"; pitchDeg: number; heelHeight: number };

export type WebPattern = "fink" | "howe" | "pratt" | "warren";

export const PATTERNS_FOR_SHAPE: Record<TrussShape["kind"], readonly WebPattern[]> = {
  triangular: ["fink", "howe", "pratt"],
  trapezoidal: ["howe", "pratt"],
  parallel: ["pratt", "howe", "warren"],
  mono: ["pratt", "howe"],
};

export interface TrussInput {
  span: number;
  shape: TrussShape;
  pattern: WebPattern;
  /** Number of panels along the bottom chord (even). Ignored by "fink". */
  panels: number;
  /** Top chord extension past the heel (eaves), mm, each side */
  overhang: number;
  chordProfile: ProfileSpec;
  webProfile: ProfileSpec;
  /** Longest piece the line/transport allows; longer chords are spliced at a node */
  maxPieceLength: number;
}

export type BarRole = "top-chord" | "bottom-chord" | "vertical" | "diagonal";

export interface TrussNode {
  id: number;
  x: number;
  y: number;
  /** Support condition for the analytical model */
  support?: "pin" | "roller";
}

export interface TrussBar {
  id: number;
  a: number;
  b: number;
  role: BarRole;
}

/** Pin-jointed analytical model in the truss plane (x along span, y up) */
export interface TrussModel {
  input: TrussInput;
  nodes: TrussNode[];
  bars: TrussBar[];
  /** Ridge height above the bottom chord, mm */
  height: number;
}
