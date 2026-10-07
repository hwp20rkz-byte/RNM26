import { sectionGeometry } from "../profiles/section";
import type { ProfileSpec } from "../profiles/types";
import type { Feature } from "./types";

/**
 * Feature layout rules. Defaults are typical for 89–150 mm studs and are meant
 * to be overridden from the roll-former's tooling sheet (hole sizes are fixed
 * by the punch dies, spacing by the detailer).
 */

export interface ServiceHoleRule {
  /** Pitch between holes, mm */
  spacing: number;
  /** Keep-out from each end, mm */
  endClearance: number;
  /** Hole size along the member × across the web, mm */
  width: number;
  height: number;
}

export const DEFAULT_SERVICE_HOLES: ServiceHoleRule = { spacing: 600, endClearance: 300, width: 64, height: 32 };

/** Evenly spaced service holes centred on the web, symmetric about mid-length */
export function serviceHoles(length: number, profile: ProfileSpec, rule: ServiceHoleRule = DEFAULT_SERVICE_HOLES): Feature[] {
  const span = sectionGeometry(profile).webSpan;
  if (!span || span.yMax - span.yMin < rule.height) return [];
  const usable = length - 2 * rule.endClearance;
  if (usable < 0) return [];
  const count = Math.floor(usable / rule.spacing) + 1;
  const first = (length - (count - 1) * rule.spacing) / 2;
  return Array.from({ length: count }, (_, i) => ({
    kind: "service-hole" as const,
    position: first + i * rule.spacing,
    offset: 0,
    width: rule.width,
    height: rule.height,
  }));
}

export interface ConnectionRule {
  /** Distance from the member end to the first fastener row, mm */
  endDistance: number;
  /** Fasteners across the web per connection */
  perConnection: 1 | 2;
  /** Gauge between the two fasteners across the web, mm */
  gauge: number;
  diameter: number;
  kind: "dimple" | "bolt-hole";
}

export const DEFAULT_DIMPLES: ConnectionRule = { endDistance: 20, perConnection: 2, gauge: 30, diameter: 5.1, kind: "dimple" };

/**
 * Fastener holes at given stations along the member (e.g. where truss webs
 * cross a chord, or at both ends of a stud). Stations closer than `endDistance`
 * to an end are pulled inwards so the hole stays on the member.
 */
export function connectionHoles(length: number, stations: readonly number[], rule: ConnectionRule = DEFAULT_DIMPLES): Feature[] {
  const offsets = rule.perConnection === 2 ? [-rule.gauge / 2, rule.gauge / 2] : [0];
  const clamp = (p: number) => Math.min(length - rule.endDistance, Math.max(rule.endDistance, p));
  return stations.flatMap((s) =>
    offsets.map((offset) =>
      rule.kind === "dimple"
        ? { kind: "dimple" as const, position: clamp(s), offset, diameter: rule.diameter }
        : { kind: "bolt-hole" as const, position: clamp(s), offset, diameter: rule.diameter },
    ),
  );
}

export interface ThermalSlotRule {
  /** Number of slot rows across the web */
  rows: number;
  slotLength: number;
  slotWidth: number;
  /** Solid bridge between slots in a row, mm */
  bridge: number;
  /** Keep-out from each end, mm */
  endClearance: number;
}

export const DEFAULT_THERMAL_SLOTS: ThermalSlotRule = { rows: 4, slotLength: 75, slotWidth: 3, bridge: 25, endClearance: 100 };

/**
 * Staggered thermal-break slots ("термопрофиль"): adjacent rows shift by half a
 * pitch so heat has to zig-zag through the bridges. Rows are spread evenly over
 * the flat web.
 */
export function thermalSlots(length: number, profile: ProfileSpec, rule: ThermalSlotRule = DEFAULT_THERMAL_SLOTS): Feature[] {
  const span = sectionGeometry(profile).webSpan;
  if (!span || rule.rows < 1) return [];
  const flat = span.yMax - span.yMin;
  const rowPitch = flat / (rule.rows + 1);
  if (rowPitch < rule.slotWidth * 2) return [];
  const pitch = rule.slotLength + rule.bridge;
  const out: Feature[] = [];
  for (let r = 0; r < rule.rows; r++) {
    const offset = span.yMin + rowPitch * (r + 1);
    const shift = r % 2 === 0 ? 0 : pitch / 2;
    for (let p = rule.endClearance + rule.slotLength / 2 + shift; p + rule.slotLength / 2 <= length - rule.endClearance; p += pitch) {
      out.push({ kind: "web-slot", position: p, offset, length: rule.slotLength, width: rule.slotWidth });
    }
  }
  return out;
}
