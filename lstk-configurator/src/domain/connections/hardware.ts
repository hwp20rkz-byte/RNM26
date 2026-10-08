import type { Vec3 } from "../geometry/vec";

/**
 * Bought-in connection hardware — not rolled on the C89 line but part of every
 * LSTK frame: anchors, hold-downs, strap bracing, truss clips, corner fixings.
 * Rules and sources: docs/lstk-knowledge-base.md («Правила для генератора»).
 */
export type HardwareKind = "anchor" | "hold-down" | "strap" | "truss-clip" | "floor-clip" | "corner-screws" | "tee-screws";

export interface HardwareItem {
  kind: HardwareKind;
  /** Model position (mm); for straps the two ends */
  at: Vec3;
  to?: Vec3;
  /** Outward normal of the wall face the item sits on */
  normal?: Vec3;
  /** Storey (for the plan cut) */
  level: number;
  /** Assembly the item belongs to */
  mark: string;
  /** Quantity represented by this item (screws per corner, metres of strap…) */
  qty: number;
}

export interface HardwareSpec {
  kind: HardwareKind;
  /** i18n key `hw.<kind>` */
  unit: "pcs" | "m";
  /** ₸ per unit — indicative */
  price: number;
  kg: number;
}

export const HARDWARE: Record<HardwareKind, HardwareSpec> = {
  anchor: { kind: "anchor", unit: "pcs", price: 650, kg: 0.15 },
  "hold-down": { kind: "hold-down", unit: "pcs", price: 4800, kg: 1.2 },
  strap: { kind: "strap", unit: "m", price: 650, kg: 0.32 },
  "truss-clip": { kind: "truss-clip", unit: "pcs", price: 380, kg: 0.12 },
  "floor-clip": { kind: "floor-clip", unit: "pcs", price: 380, kg: 0.12 },
  "corner-screws": { kind: "corner-screws", unit: "pcs", price: 15, kg: 0.004 },
  "tee-screws": { kind: "tee-screws", unit: "pcs", price: 15, kg: 0.004 },
};

/** Anchor spacing along the bottom plate and distance from ends, mm */
export const ANCHOR_SPACING = 1200;
export const ANCHOR_EDGE = 300;
/** Screws joining two studs back-to-back at a corner or T, one per this many mm */
export const STUD_SCREW_PITCH = 300;

export function anchorStations(from: number, to: number): number[] {
  const len = to - from;
  if (len < 200) return [];
  if (len <= 2 * ANCHOR_EDGE) return [from + len / 2];
  const a = from + ANCHOR_EDGE;
  const b = to - ANCHOR_EDGE;
  const n = Math.max(1, Math.ceil((b - a) / ANCHOR_SPACING - 1e-9));
  return Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
}

export interface HardwareLine {
  kind: HardwareKind;
  qty: number;
  unit: HardwareSpec["unit"];
  cost: number;
  massKg: number;
}

export function hardwareTotals(items: readonly HardwareItem[]): HardwareLine[] {
  const by = new Map<HardwareKind, number>();
  for (const i of items) by.set(i.kind, (by.get(i.kind) ?? 0) + i.qty);
  return [...by].map(([kind, qty]) => {
    const s = HARDWARE[kind];
    return { kind, qty, unit: s.unit, cost: qty * s.price, massKg: qty * s.kg };
  });
}
