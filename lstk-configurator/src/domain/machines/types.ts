import type { Feature } from "../members/types";

/**
 * A roll-forming line as the source documents describe it. Every value carries
 * where it came from; values the documents do not give are `null` with a note,
 * never a guess — they decide whether a part can be made at all.
 */

export interface Sourced<T> {
  value: T;
  /** Document and page, e.g. "КП Golden Integrity C89, с. 4" */
  source: string;
}

export interface Unknown {
  value: null;
  /** What is missing and whom to ask */
  note: string;
}

export type Spec<T> = Sourced<T> | Unknown;

/** Punch / cut stations the line has */
export type MachineToolKind =
  | "service-hole"
  | "dimple"
  | "bolt-hole"
  | "web-notch"
  | "lip-notch"
  | "end-truss"
  | "triple-web-hole"
  | "swage"
  | "chamfer"
  | "shear";

export interface MachineTool {
  kind: MachineToolKind;
  /** Label as the vendor writes it */
  vendorName: string;
  /** Domain feature this station produces, if the domain models it yet */
  feature: Feature["kind"] | null;
  /** Hole / notch dimensions, mm */
  size: Spec<string>;
  source: string;
}

export interface RollFormingMachine {
  id: string;
  vendor: string;
  model: string;
  /** For UI and documents, e.g. "Golden Integrity C89" */
  shortName: string;
  profile: {
    family: "C";
    web: Spec<number>;
    flange: Spec<number>;
    lip: Spec<number>;
    innerRadius: Spec<number>;
    /** Rolled longitudinal stiffener(s) in the web, if any */
    webRib: Spec<string>;
  };
  thickness: Spec<{ min: number; max: number }>;
  steelGrade: Spec<string>;
  coating: Spec<string>;
  coilWidth: Spec<{ min: number; max: number }>;
  lengthAccuracy: Spec<number>;
  partLength: Spec<{ min: number; max: number }>;
  speed: Spec<string>;
  tools: MachineTool[];
  control: Spec<string>;
  designSoftware: Spec<string>;
  inputFormat: Spec<string>;
  /** Commercial and physical data, informational */
  other: Record<string, Sourced<string>>;
}

export const known = <T>(s: Spec<T>): s is Sourced<T> => s.value !== null;
