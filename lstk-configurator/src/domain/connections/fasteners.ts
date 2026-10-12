import type { ProfileSpec } from "../profiles/types";
import { fyb } from "../structure/section";

/**
 * Fasteners that join the C89 pieces in the dimples: self-drilling screws or
 * structural blind rivets. Sources and the choice: docs/lstk-knowledge-base.md §9.
 *
 * Capacity per fastener in a two-ply lap of equal thickness t, shear
 * (EN 1993-1-3:2006, tables 8.1 and 8.2):
 *   bearing   Fb,Rd = α · fu · d · t / γM2,
 *             α = 3.6·√(t/d) ≤ 2.1 for blind rivets, 3.2·√(t/d) ≤ 2.1 for screws;
 *   the fastener's own shear Fv,Rd (catalogue) must be ≥ 1.2·Fb,Rd — the
 *   types below are chosen so that it is.
 * The rivet coefficient is taken from memory of table 8.1 and is not yet
 * checked against the text [не проверено]; see knowledge base §9.
 */

export type FastenerKind = "screw" | "rivet";

export interface FastenerSpec {
  kind: FastenerKind;
  /** Nominal diameter, mm */
  d: number;
  /** Indicative price per piece, ₸ */
  price: number;
  /** Fitting time per piece on the assembly table, s */
  seconds: number;
  /** α coefficient: k·√(t/d) */
  k: number;
}

export const FASTENERS: Record<FastenerKind, FastenerSpec> = {
  // Self-drilling hex-washer screw ST4.2 (No. 8), into the dimple
  screw: { kind: "screw", d: 4.2, price: 15, seconds: 6, k: 3.2 },
  // Structural blind rivet 4.8 mm, steel/steel, pneumatic riveter
  rivet: { kind: "rivet", d: 4.8, price: 38, seconds: 4, k: 3.6 },
};

export const GAMMA_M2 = 1.25;

/** Ultimate strength used with the design yield (S350GD → 420, S550 → 560, else 360), MPa */
export function fu(p: ProfileSpec): number {
  const y = fyb(p);
  return y >= 500 ? 560 : y >= 350 ? 420 : 360;
}

/** Design bearing resistance of one fastener in a lap of two plies of `p`, N */
export function fastenerResistance(kind: FastenerKind, p: ProfileSpec): number {
  const f = FASTENERS[kind];
  const t = p.thickness;
  const alpha = Math.min(2.1, f.k * Math.sqrt(t / f.d));
  return (alpha * fu(p) * f.d * t) / GAMMA_M2;
}
