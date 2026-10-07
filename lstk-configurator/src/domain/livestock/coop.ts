/**
 * Poultry housing rules of thumb for laying hens kept on the floor. Common
 * husbandry guidance, not a veterinary norm — adjust to the breed and the
 * owner's practice:
 * - stocking: 4 birds per m² of house floor (3–5 is the usual range);
 * - perch: 0.25 m per bird;
 * - one nest box per 5 hens;
 * - ventilation: minimum (winter) 1 m³/h per bird, summer up to 6 m³/h per bird;
 * - run (вольер): 1 m² per bird.
 */
export const BIRDS_PER_M2 = 4;
export const PERCH_PER_BIRD_M = 0.25;
export const HENS_PER_NEST = 5;
export const VENT_WINTER_M3H = 1;
export const VENT_SUMMER_M3H = 6;
export const RUN_M2_PER_BIRD = 1;

export interface CoopPlan {
  birds: number;
  floorM2: number;
  perchM: number;
  nests: number;
  ventWinterM3h: number;
  ventSummerM3h: number;
  runM2: number;
}

export function coopPlan(birds: number): CoopPlan {
  const n = Math.max(1, Math.round(birds));
  return {
    birds: n,
    floorM2: n / BIRDS_PER_M2,
    perchM: n * PERCH_PER_BIRD_M,
    nests: Math.ceil(n / HENS_PER_NEST),
    ventWinterM3h: n * VENT_WINTER_M3H,
    ventSummerM3h: n * VENT_SUMMER_M3H,
    runM2: n * RUN_M2_PER_BIRD,
  };
}

/** Birds a given clear floor area holds */
export function birdsFor(floorM2: number): number {
  return Math.floor(floorM2 * BIRDS_PER_M2);
}

/** Building length (mm, rounded to 100) for `birds` at a given width, interior wall thickness `d` */
export function coopLength(birds: number, width: number, d: number): number {
  const clearWidth = (width - 2 * d) / 1000;
  const clearLength = coopPlan(birds).floorM2 / clearWidth;
  return Math.max(1800, Math.ceil((clearLength * 1000 + 2 * d) / 100) * 100);
}
