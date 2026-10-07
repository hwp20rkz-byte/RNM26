import { GOLDEN_INTEGRITY_C89 } from "../machines/golden-integrity-c89";
import { known } from "../machines/types";
import type { CSpec, HatSpec, ProfileSpec, USpec, ZSpec } from "./types";

/**
 * Starter catalogue of typical LSTK sizes. These are common market sizes, not a
 * specific manufacturer's TU: before quoting or sending anything to a roll-former,
 * replace them with the exact profile table (dimensions, radii, grade, coating)
 * of the line in use — tooling fixes the flange/lip/radius, only web and t vary.
 */

const DEFAULTS = { coatingGsm: 275, grade: "S350GD" } as const;

const r = (t: number) => Math.max(1, Math.round(t * 1.5 * 10) / 10);

function c(web: number, flange: number, lip: number, t: number): CSpec {
  return { id: `C${web}x${flange}x${lip}x${t}`, family: "C", web, flange, lip, thickness: t, innerRadius: r(t), ...DEFAULTS };
}

function u(web: number, flange: number, t: number): USpec {
  return { id: `U${web}x${flange}x${t}`, family: "U", web, flange, thickness: t, innerRadius: r(t), ...DEFAULTS };
}

function z(web: number, flange: number, lip: number, t: number): ZSpec {
  return { id: `Z${web}x${flange}x${lip}x${t}`, family: "Z", web, flange, lip, thickness: t, innerRadius: r(t), ...DEFAULTS };
}

function hat(depth: number, crown: number, flange: number, t: number): HatSpec {
  return { id: `H${depth}x${crown}x${flange}x${t}`, family: "Hat", depth, crown, flange, thickness: t, innerRadius: r(t), ...DEFAULTS };
}

/**
 * C89 from the Golden Integrity line (КП, с. 2 и 4): 89×41×11, t = 0.75–1.2 мм, G550.
 * The offer gives neither the bend radius nor a coating — r = 1.5·t and Z275 are
 * placeholders, and the offer's own coil width (179–182 мм) does not match these
 * dimensions (see machines/check.ts), so mass and strip width are approximate.
 */
function machineC89(t: number): CSpec {
  const m = GOLDEN_INTEGRITY_C89;
  const dim = (s: typeof m.profile.web) => {
    if (!known(s)) throw new Error("Размер профиля линии неизвестен");
    return s.value;
  };
  return {
    id: `C89x41x11x${t}`,
    family: "C",
    web: dim(m.profile.web),
    flange: dim(m.profile.flange),
    lip: dim(m.profile.lip),
    thickness: t,
    innerRadius: r(t),
    coatingGsm: DEFAULTS.coatingGsm,
    grade: "G550",
    machineId: m.id,
  };
}

/** Thicknesses inside the line's 0.75–1.2 mm range that are common G550 gauges */
export const C89_THICKNESSES = [0.75, 0.95, 1.0, 1.15, 1.2] as const;

export const PROFILE_CATALOG: readonly ProfileSpec[] = [
  // Golden Integrity C89 line
  ...C89_THICKNESSES.map(machineC89),
  // Generic sizes — not produced by the line above (see profileOnMachine)
  // Structural C
  c(150, 50, 13, 1.2),
  c(150, 50, 13, 1.5),
  c(150, 50, 13, 2.0),
  c(200, 50, 15, 1.5),
  c(200, 50, 15, 2.0),
  c(250, 60, 20, 2.0),
  c(250, 60, 20, 2.5),
  // Tracks
  u(91, 40, 0.95),
  u(152, 40, 1.2),
  u(152, 40, 1.5),
  u(203, 40, 1.5),
  // Purlins
  z(150, 50, 15, 1.5),
  z(200, 60, 18, 2.0),
  // Battens / furring
  hat(25, 30, 15, 0.7),
  hat(40, 45, 20, 1.0),
];

export function findProfile(id: string): ProfileSpec {
  const p = PROFILE_CATALOG.find((x) => x.id === id);
  if (!p) throw new Error(`Профиль ${id} отсутствует в каталоге`);
  return p;
}
