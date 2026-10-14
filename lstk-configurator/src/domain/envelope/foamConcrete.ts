/**
 * Light-gauge steel walls filled with non-autoclaved foam concrete (ГОСТ
 * 25485-2019) poured on site into permanent formwork — cement-bonded
 * particle board (ЦСП) both sides, screwed to the studs. The frame carries
 * the roof; the foam carries itself down to the plinth, braces the studs,
 * kills the drumming of a frame wall and makes it non-combustible.
 *
 * Conductivities are operating values for humidity zone Б (dry values from
 * the standard × ≈ 1.35 for 8–12 % moisture by mass); strength is the usual
 * compressive class of a site mix. Prices are placeholders for a mobile foam
 * generator crew with the mix.
 */

export type FoamGrade = 150 | 200 | 300 | 400 | 500 | 600;

export interface FoamSpec {
  grade: FoamGrade;
  /** Operating conductivity, W/(m·K) */
  lambda: number;
  /** Compressive strength, MPa */
  strength: number;
  /** Fresh density at the pour, kg/m³ — loads the formwork */
  wet: number;
  /** Material, ₸/m³ */
  price: number;
  /** Highest lift per pour, mm: the fresh mix pushes on the boards */
  lift: number;
}

export const FOAM: Record<FoamGrade, FoamSpec> = {
  150: { grade: 150, lambda: 0.065, strength: 0.25, wet: 230, price: 23000, lift: 1200 },
  200: { grade: 200, lambda: 0.075, strength: 0.4, wet: 290, price: 24000, lift: 1000 },
  300: { grade: 300, lambda: 0.11, strength: 0.75, wet: 400, price: 25500, lift: 800 },
  400: { grade: 400, lambda: 0.15, strength: 1.0, wet: 520, price: 27000, lift: 700 },
  500: { grade: 500, lambda: 0.18, strength: 1.5, wet: 640, price: 28500, lift: 600 },
  600: { grade: 600, lambda: 0.22, strength: 2.0, wet: 760, price: 30000, lift: 500 },
};

export const FOAM_GRADES = Object.keys(FOAM).map(Number) as FoamGrade[];

/** Pouring, vibrating-free placing and curing, ₸/m³ */
export const FOAM_LABOUR = 14000;
/** ЦСП 12 mm permanent formwork, ₸/m² of board incl. fixing */
export const CSP_PRICE = 5200;
export const CSP_LAMBDA = 0.26;

/** What fills the wall frame: stone wool (0) or a foam concrete grade, and the wall thickness it is poured to */
export interface WallFill {
  grade: 0 | FoamGrade;
  /** Poured thickness, mm: the stud depth or more (the frame sits in the middle) */
  thickness: number;
}

export const WOOL_FILL: WallFill = { grade: 0, thickness: 0 };

/** Operating mass, kg/m³: the grade plus about 10 % moisture */
export const operatingDensity = (g: FoamGrade) => g * 1.1;

/**
 * Effective R of the poured layer, m²K/W. The studs bridge the part that
 * holds the frame: the bridge conductance is calibrated so that stone wool
 * reproduces the ASHRAE factors (`woolFactor`); a conductive fill loses
 * relatively less to the steel. Foam beyond the frame is not bridged.
 */
export function foamR(spec: FoamSpec, thickness: number, depth: number, woolFactor: number): number {
  const uWool = 0.04 / (depth / 1000);
  const bridge = uWool * (1 / woolFactor - 1);
  const framed = 1 / (spec.lambda / (depth / 1000) + bridge);
  return framed + Math.max(0, thickness - depth) / 1000 / spec.lambda;
}

/** Dead load of the fill per metre of wall, kN/m */
export function wallLineLoad(fill: WallFill, heightMm: number): number {
  if (!fill.grade) return 0;
  return (operatingDensity(fill.grade) * (fill.thickness / 1000) * (heightMm / 1000) * 9.81) / 1000;
}
