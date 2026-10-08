import type { ProfileSpec } from "../profiles/types";
import { sectionProperties } from "../profiles/section";

/**
 * Cold-formed C-section resistance, simplified after EN 1993-1-3 / EN 1993-1-5
 * (effective width by Winter's formula, flexural buckling curve b). Distortional
 * and torsional-flexural buckling and web crippling are NOT checked — a
 * preliminary design aid, not a substitute for the engineer's calculation.
 */

export const E = 210000; // MPa
export const GAMMA_M0 = 1.0;
export const GAMMA_M1 = 1.0;

/**
 * Design yield strength. Without a mill certificate confirming G550 the
 * generator designs with S350GD values (fyb = 350 MPa) — see
 * docs/lstk-knowledge-base.md, rule 10. With a certificate (`certified`),
 * G550 thinner than 0.9 mm still gets only 75 % of 550 MPa (AS/NZS 4600 practice).
 */
let certified = false;
export function setCertifiedG550(v: boolean): void {
  certified = v;
}
export function fyb(p: ProfileSpec): number {
  if (/550/.test(p.grade)) return certified ? (p.thickness < 0.9 ? 0.75 * 550 : 550) : 350;
  if (/350/.test(p.grade)) return 350;
  return 250;
}

function rhoInternal(lp: number): number {
  return lp <= 0.673 ? 1 : Math.min(1, (lp - 0.22) / (lp * lp));
}
function rhoOutstand(lp: number): number {
  return lp <= 0.748 ? 1 : Math.min(1, (lp - 0.188) / (lp * lp));
}

export interface Resistance {
  area: number;
  aeff: number;
  /** Strong axis (web vertical) / weak axis second moments, mm⁴ */
  ix: number;
  iy: number;
  /** Elastic section modulus, strong axis, effective, mm³ */
  weffX: number;
  /** Weak axis (bending with the web horizontal — lintels laid flat), mm³ */
  weffY: number;
  fy: number;
}

export function resistance(p: ProfileSpec): Resistance {
  if (p.family !== "C") throw new Error("Расчёт поддерживает только C-профиль");
  const sp = sectionProperties(p);
  const t = p.thickness;
  const fy = fyb(p);
  const eps = Math.sqrt(235 / fy);
  const corner = p.innerRadius + t;
  const bw = p.web - 2 * corner;
  const bf = p.flange - 2 * corner;
  const bl = p.lip - corner;
  // Flanges with lips count as internal elements (k = 4) if the lip is adequate (≥ 0.2 bf)
  const kf = bl >= 0.2 * bf ? 4 : 0.43;
  const rw = rhoInternal(bw / t / (28.4 * eps * 2));
  const rf = (kf === 4 ? rhoInternal : rhoOutstand)(bf / t / (28.4 * eps * Math.sqrt(kf)));
  const rl = rhoOutstand(bl / t / (28.4 * eps * Math.sqrt(0.43)));
  const lost = (1 - rw) * bw * t + 2 * (1 - rf) * bf * t + 2 * (1 - rl) * bl * t;
  const aeff = sp.area - lost;
  // Bending about the strong axis: web in bending (k = 23.9) is nearly always effective;
  // the compression flange reduces the modulus roughly by its own ρ
  const wel = sp.ix / (p.web / 2);
  const cx = sp.centroid.x;
  const welY = sp.iy / Math.max(Math.abs(cx), p.flange - Math.abs(cx));
  return { area: sp.area, aeff, ix: sp.ix, iy: sp.iy, weffX: wel * (0.5 + 0.5 * rf), weffY: welY * rl, fy };
}

/** Flexural buckling (EN 1993-1-1 6.3.1, curve b) */
export function chi(lambda: number, alpha = 0.34): number {
  if (lambda <= 0.2) return 1;
  const phi = 0.5 * (1 + alpha * (lambda - 0.2) + lambda * lambda);
  return Math.min(1, 1 / (phi + Math.sqrt(phi * phi - lambda * lambda)));
}

/** Compression resistance with buckling lengths about the strong and weak axes, N */
export function nbRd(r: Resistance, lcrStrong: number, lcrWeak: number): number {
  const ncrX = (Math.PI ** 2 * E * r.ix) / lcrStrong ** 2;
  const ncrY = (Math.PI ** 2 * E * r.iy) / lcrWeak ** 2;
  const x = chi(Math.sqrt((r.aeff * r.fy) / ncrX));
  const y = chi(Math.sqrt((r.aeff * r.fy) / ncrY));
  return (Math.min(x, y) * r.aeff * r.fy) / GAMMA_M1;
}

/** Tension: gross area less ~10 % for service holes and dimples, N */
export function ntRd(r: Resistance): number {
  return (0.9 * r.area * r.fy) / GAMMA_M0;
}

/** Bending, N·mm */
export function mcRdX(r: Resistance): number {
  return (r.weffX * r.fy) / GAMMA_M0;
}
export function mcRdY(r: Resistance): number {
  return (r.weffY * r.fy) / GAMMA_M0;
}
