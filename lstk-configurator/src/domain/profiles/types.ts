/**
 * Cold-formed steel profile specifications. All dimensions in millimetres,
 * out-to-out (as manufacturers list them: C150×50×13×1.5 means web 150, flange 50,
 * lip 13, thickness 1.5 measured over the outside faces).
 */

export type ProfileFamily = "C" | "U" | "Z" | "Hat";

interface ProfileBase {
  /** Stable catalogue key, e.g. "C150x50x13x1.5" */
  id: string;
  /** Base metal thickness, mm */
  thickness: number;
  /** Inside bend radius, mm (typically 1–2 × t) */
  innerRadius: number;
  /** Zinc coating mass, g/m² total both sides (Z275 → 275) */
  coatingGsm: number;
  /** Steel grade, informational (e.g. "S350GD") */
  grade: string;
  /** Roll-forming line that produces this profile, if any (see domain/machines) */
  machineId?: string;
}

/** Longitudinal V-stiffener rolled into the web centre */
export interface WebSwage {
  /** Width of the swage opening on the web, mm */
  width: number;
  /** Depth into the section (towards the flanges), mm */
  depth: number;
}

export interface CSpec extends ProfileBase {
  family: "C";
  web: number;
  flange: number;
  lip: number;
  swage?: WebSwage;
}

/** Track (U / ПН): no lips */
export interface USpec extends ProfileBase {
  family: "U";
  web: number;
  flange: number;
}

/** Z-purlin: flanges point to opposite sides */
export interface ZSpec extends ProfileBase {
  family: "Z";
  web: number;
  flange: number;
  lip: number;
}

/** Hat / omega furring channel */
export interface HatSpec extends ProfileBase {
  family: "Hat";
  /** Overall depth, mm */
  depth: number;
  /** Crown (top) width, mm */
  crown: number;
  /** Each outward base flange, mm */
  flange: number;
}

export type ProfileSpec = CSpec | USpec | ZSpec | HatSpec;

export interface SectionProperties {
  /** Cross-section area, mm² */
  area: number;
  /** Centroid in section coordinates, mm */
  centroid: { x: number; y: number };
  /** Second moments of area about centroidal axes, mm⁴ */
  ix: number;
  iy: number;
  /** Developed (centreline) width of the strip, mm — what the coil is slit to */
  developedWidth: number;
  /** Steel mass, kg/m (ρ = 7850 kg/m³) */
  steelMassPerM: number;
  /** Steel + zinc coating mass, kg/m */
  massPerM: number;
}
