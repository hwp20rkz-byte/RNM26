import { EPS, cross3, dist3, dot3, len3, norm3, scale3, sub3, type Vec3 } from "../geometry/vec";
import { sectionGeometry } from "../profiles/section";
import type { Feature, Member } from "./types";

/** Roll-formers cut to 0.5 mm; keep the BOM and the cut list on the same grid */
export const CUT_RESOLUTION_MM = 0.5;

/**
 * Centreline length rounded to the cut grid. This is NOT yet a fabrication
 * length: end clearances, nesting offsets and end-cut angles depend on how the
 * member joins its neighbours and belong to the detailing step.
 */
export function centrelineLength(m: Pick<Member, "start" | "end">): number {
  return Math.round(dist3(m.start, m.end) / CUT_RESOLUTION_MM) * CUT_RESOLUTION_MM;
}

export interface MemberFrame {
  /** Unit vector along the member (section z) */
  axis: Vec3;
  /** Unit vector along the web (section y) */
  web: Vec3;
  /** Unit vector towards the flanges (section x) — right-handed with web × axis */
  flange: Vec3;
}

/** Orthonormal frame of a member; throws if the web hint is parallel to the member */
export function memberFrame(m: Pick<Member, "start" | "end" | "webAxis" | "flipped">): MemberFrame {
  const d = sub3(m.end, m.start);
  if (len3(d) < EPS) throw new Error("Элемент нулевой длины");
  const axis = norm3(d);
  const along = dot3(m.webAxis, axis);
  const perp = sub3(m.webAxis, scale3(axis, along));
  if (len3(perp) < 1e-6 * Math.max(1, len3(m.webAxis))) {
    throw new Error("Ориентация стенки (webAxis) параллельна оси элемента");
  }
  // Flipping = turning the section 180° about the member axis: web and flange both reverse
  const web = m.flipped ? scale3(norm3(perp), -1) : norm3(perp);
  // section x = y × z keeps (x, y, z) right-handed
  return { axis, web, flange: cross3(web, axis) };
}

export interface FeatureIssue {
  feature: Feature;
  reason: string;
}

/** Extent of a feature along the member, mm */
export function featureSpan(f: Feature): { from: number; to: number } {
  switch (f.kind) {
    case "service-hole":
      return { from: f.position - f.width / 2, to: f.position + f.width / 2 };
    case "web-slot":
      return { from: f.position - f.length / 2, to: f.position + f.length / 2 };
    case "dimple":
    case "bolt-hole":
      return { from: f.position - f.diameter / 2, to: f.position + f.diameter / 2 };
    case "lip-cut":
    case "flange-cut":
    case "swage":
      return { from: f.position, to: f.position + f.length };
  }
}

/** Half-extent of a web feature across the web, mm */
/** Operations that act on flanges/lips over a length, not holes in the web */
export const END_OPERATIONS = ["lip-cut", "flange-cut", "swage"] as const;
type EndOperation = (typeof END_OPERATIONS)[number];
type WebFeature = Exclude<Feature, { kind: EndOperation }>;
const isWebFeature = (f: Feature): f is WebFeature => !(END_OPERATIONS as readonly string[]).includes(f.kind);

function halfAcross(f: WebFeature): number {
  switch (f.kind) {
    case "service-hole":
      return f.height / 2;
    case "web-slot":
      return f.width / 2;
    case "dimple":
    case "bolt-hole":
      return f.diameter / 2;
  }
}

/** Features that would fall outside the member or off the flat web */
export function validateFeatures(m: Member): FeatureIssue[] {
  const length = centrelineLength(m);
  const span = sectionGeometry(m.profile).webSpan;
  const issues: FeatureIssue[] = [];
  for (const f of m.features) {
    const { from, to } = featureSpan(f);
    if (from < 0 || to > length) {
      issues.push({ feature: f, reason: `за пределами элемента длиной ${length} мм` });
      continue;
    }
    if (!isWebFeature(f)) continue;
    if (!span) {
      issues.push({ feature: f, reason: "у профиля нет плоской стенки для пробивки" });
      continue;
    }
    const h = halfAcross(f);
    if (f.offset - h < span.yMin || f.offset + h > span.yMax) {
      issues.push({ feature: f, reason: "заходит на зону гиба стенки" });
    }
  }
  issues.push(...overlappingWebFeatures(m.features));
  return issues;
}

/**
 * Web features whose bounding boxes touch or overlap (minimum `bridge` mm of
 * steel between them). Overlapping punches tear the web on the machine and
 * cannot be modelled as separate holes.
 */
export function overlappingWebFeatures(features: readonly Feature[], bridge = 1): FeatureIssue[] {
  const web = features.filter(isWebFeature);
  const boxes = web
    .map((f) => ({ f, ...featureSpan(f), lo: f.offset - halfAcross(f), hi: f.offset + halfAcross(f) }))
    .sort((a, b) => a.from - b.from);
  const issues: FeatureIssue[] = [];
  for (let i = 0; i < boxes.length; i++) {
    const a = boxes[i]!;
    for (let j = i + 1; j < boxes.length && boxes[j]!.from < a.to + bridge; j++) {
      const b = boxes[j]!;
      if (b.lo < a.hi + bridge && a.lo < b.hi + bridge) {
        issues.push({ feature: b.f, reason: `пересекается с отверстием на ${a.f.position.toFixed(1)} мм` });
      }
    }
  }
  return issues;
}
