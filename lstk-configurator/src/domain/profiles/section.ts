import { filletPolyline, polylineLength, signedArea, stripOutline } from "../geometry/polyline";
import { v2, type Vec2 } from "../geometry/vec";
import type { CSpec, HatSpec, ProfileSpec, SectionProperties, USpec, ZSpec } from "./types";

/**
 * Section coordinate system (mm), shared by every family so render and CNC code
 * never special-case orientation:
 *   y — along the web (web depth), centred on 0;
 *   x — towards the flanges; the web centreline sits on x = 0
 *       (for Hat the base flanges sit on y = 0 and the crown at y = depth).
 * The member's length runs along +z.
 */

export interface SectionGeometry {
  /** Bent strip centreline, filleted, open polyline */
  centreline: Vec2[];
  /** Closed CCW outline of the steel */
  outline: Vec2[];
  /** y-range of the flat web (between bend tangent points), if the family has one */
  webSpan: { yMin: number; yMax: number } | null;
}

const MIN_LEG = 0.5;

/** Sharp-cornered centreline for the family (before bends are rounded) */
export function rawCentreline(spec: ProfileSpec): Vec2[] {
  const t = spec.thickness;
  switch (spec.family) {
    case "C":
      return cCentreline(spec, t);
    case "U":
      return uCentreline(spec, t);
    case "Z":
      return zCentreline(spec, t);
    case "Hat":
      return hatCentreline(spec, t);
  }
}

function cCentreline(s: CSpec, t: number): Vec2[] {
  const h = (s.web - t) / 2;
  const b = s.flange - t;
  const c = s.lip - t / 2;
  const top: Vec2[] = c > MIN_LEG ? [v2(b, h - c), v2(b, h)] : [v2(b, h)];
  const bottom: Vec2[] = c > MIN_LEG ? [v2(b, -h), v2(b, -h + c)] : [v2(b, -h)];
  const web: Vec2[] = s.swage ? swagePoints(s.swage) : [];
  return [...top, v2(0, h), ...web, v2(0, -h), ...bottom];
}

/** V-stiffener pressed towards +x, points ordered top → bottom */
function swagePoints(sw: { width: number; depth: number }): Vec2[] {
  const w = sw.width / 2;
  return [v2(0, w), v2(sw.depth, w / 3), v2(sw.depth, -w / 3), v2(0, -w)];
}

function uCentreline(s: USpec, t: number): Vec2[] {
  const h = (s.web - t) / 2;
  const b = s.flange - t / 2;
  return [v2(b, h), v2(0, h), v2(0, -h), v2(b, -h)];
}

function zCentreline(s: ZSpec, t: number): Vec2[] {
  const h = (s.web - t) / 2;
  const b = s.flange - t;
  const c = s.lip - t / 2;
  const top: Vec2[] = c > MIN_LEG ? [v2(b, h - c), v2(b, h)] : [v2(b, h)];
  const bottom: Vec2[] = c > MIN_LEG ? [v2(-b, -h), v2(-b, -h + c)] : [v2(-b, -h)];
  return [...top, v2(0, h), v2(0, -h), ...bottom];
}

function hatCentreline(s: HatSpec, t: number): Vec2[] {
  const d = s.depth - t;
  const half = (s.crown - t) / 2;
  const base = t / 2;
  // flange is measured from the outer face of the hat's side wall to the tip
  const f = s.flange + t / 2;
  return [v2(-half - f, base), v2(-half, base), v2(-half, base + d), v2(half, base + d), v2(half, base), v2(half + f, base)];
}

export function validateProfile(spec: ProfileSpec): string[] {
  const errors: string[] = [];
  const t = spec.thickness;
  if (!(t > 0)) errors.push("Толщина должна быть больше нуля");
  if (spec.innerRadius < 0) errors.push("Радиус гиба не может быть отрицательным");
  const need = (name: string, value: number, min: number) => {
    if (!(value >= min)) errors.push(`${name}: ${value} мм — меньше минимума ${min.toFixed(1)} мм для t = ${t} мм`);
  };
  switch (spec.family) {
    case "C":
    case "Z":
      need("Стенка", spec.web, 4 * t + 2 * spec.innerRadius);
      need("Полка", spec.flange, 2 * t + spec.innerRadius);
      if (spec.lip > 0) need("Отгиб", spec.lip, t + spec.innerRadius / 2);
      if (spec.family === "C" && spec.swage) {
        const flat = spec.web - 2 * (t + spec.innerRadius);
        if (spec.swage.width >= flat) errors.push("Ширина рифта больше плоской части стенки");
        if (spec.swage.depth >= spec.flange - 2 * t) errors.push("Глубина рифта больше полки");
      }
      break;
    case "U":
      need("Стенка", spec.web, 4 * t + 2 * spec.innerRadius);
      need("Полка", spec.flange, 2 * t + spec.innerRadius);
      break;
    case "Hat":
      need("Высота", spec.depth, 2 * t + spec.innerRadius);
      need("Корона", spec.crown, 2 * t + 2 * spec.innerRadius);
      need("Полка", spec.flange, t + spec.innerRadius);
      break;
  }
  return errors;
}

export function sectionGeometry(spec: ProfileSpec): SectionGeometry {
  const errors = validateProfile(spec);
  if (errors.length > 0) throw new Error(`Некорректный профиль ${spec.id}: ${errors.join("; ")}`);
  const bendRadius = spec.innerRadius + spec.thickness / 2;
  const centreline = filletPolyline(rawCentreline(spec), bendRadius);
  const outline = stripOutline(centreline, spec.thickness);
  return { centreline, outline, webSpan: webSpan(spec, bendRadius) };
}

/** Flat part of the web (between bend tangent points), where service holes may be punched */
function webSpan(spec: ProfileSpec, bendRadius: number): { yMin: number; yMax: number } | null {
  if (spec.family === "Hat") return null;
  const h = (spec.web - spec.thickness) / 2;
  const flat = h - bendRadius;
  return flat > 0 ? { yMin: -flat, yMax: flat } : null;
}

const STEEL_DENSITY_KG_PER_MM3 = 7.85e-6;

/**
 * Exact polygon properties of the outline (not thin-wall approximations).
 * Mass per metre: area (mm²) × 1000 mm × ρ.
 */
export function sectionProperties(spec: ProfileSpec): SectionProperties {
  const { outline, centreline } = sectionGeometry(spec);
  const area = signedArea(outline);
  let cx = 0;
  let cy = 0;
  let ixx = 0;
  let iyy = 0;
  for (let i = 0; i < outline.length; i++) {
    const p = outline[i]!;
    const q = outline[(i + 1) % outline.length]!;
    const k = p.x * q.y - q.x * p.y;
    cx += (p.x + q.x) * k;
    cy += (p.y + q.y) * k;
    ixx += (p.y * p.y + p.y * q.y + q.y * q.y) * k;
    iyy += (p.x * p.x + p.x * q.x + q.x * q.x) * k;
  }
  cx /= 6 * area;
  cy /= 6 * area;
  // About origin, then parallel-axis shift to the centroid
  const ix = ixx / 12 - area * cy * cy;
  const iy = iyy / 12 - area * cx * cx;
  const developedWidth = polylineLength(centreline);
  const steelMassPerM = area * 1000 * STEEL_DENSITY_KG_PER_MM3;
  // Coating mass is per m² of sheet (both sides together): sheet area per metre = developed width (m) × 1 m
  const coatingMassPerM = (spec.coatingGsm / 1000) * (developedWidth / 1000);
  return {
    area,
    centroid: { x: cx, y: cy },
    ix,
    iy,
    developedWidth,
    steelMassPerM,
    massPerM: steelMassPerM + coatingMassPerM,
  };
}

/** Human-readable designation, e.g. "C150×50×13×1,5" */
export function designation(spec: ProfileSpec): string {
  const t = spec.thickness.toLocaleString("ru-RU");
  switch (spec.family) {
    case "C":
      return `C${spec.web}×${spec.flange}×${spec.lip}×${t}${spec.swage ? " (рифт)" : ""}`;
    case "U":
      return `U${spec.web}×${spec.flange}×${t}`;
    case "Z":
      return `Z${spec.web}×${spec.flange}×${spec.lip}×${t}`;
    case "Hat":
      return `Ω${spec.depth}×${spec.crown}×${spec.flange}×${t}`;
  }
}

export interface SectionParts {
  /** Closed outlines of everything except the flat web (bends, flanges, lips) */
  rest: Vec2[][];
  /** Flat web plate, section y-range, centred on x = 0 */
  web: { yMin: number; yMax: number };
}

/**
 * Split a C/U/Z section into the flat web plate and the remaining strip(s), so
 * the web can be modelled as a plate with real punched holes. A web swage is
 * ignored here (the punched web is flat) — the detailed view is for checking
 * hole layouts, the instanced view keeps the swage.
 */
export function sectionParts(spec: ProfileSpec): SectionParts | null {
  if (spec.family === "Hat") return null;
  const flatSpec = spec.family === "C" && spec.swage ? { ...spec, swage: undefined } : spec;
  const { centreline } = sectionGeometry(flatSpec);
  const i = centreline.findIndex(
    (p, k) => k < centreline.length - 1 && Math.abs(p.x) < 1e-9 && Math.abs(centreline[k + 1]!.x) < 1e-9 && p.y > centreline[k + 1]!.y,
  );
  if (i < 0) return null;
  const top = centreline[i]!;
  const bottom = centreline[i + 1]!;
  return {
    rest: [centreline.slice(0, i + 1), centreline.slice(i + 1)].map((c) => stripOutline(c, spec.thickness)),
    web: { yMin: bottom.y, yMax: top.y },
  };
}
