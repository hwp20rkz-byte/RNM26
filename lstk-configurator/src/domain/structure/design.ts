import type { Building } from "../buildings/generate";
import { sideOpenings, wallPlans } from "../buildings/generate";
import type { City } from "../climate/cities";
import { finish, type FinishChoice } from "../finishes/catalog";
import { findProfile } from "../profiles/catalog";
import type { ProfileSpec } from "../profiles/types";
import { solveTruss } from "../trusses/analysis";
import { roofNodeLoads } from "../trusses/loads";
import type { BarRole, TrussModel } from "../trusses/types";
import { openingClass } from "../walls/types";
import { mcRdX, mcRdY, nbRd, ntRd, resistance } from "./section";

/**
 * Preliminary structural design of the frame (limit states, EN 1990 / 1991 /
 * 1993-1-3 as adopted in Kazakhstan by СП РК EN). Loads by city, combination
 * 1.35·G + 1.5·S (roof) and 1.35·G + 1.5·Q (floors), wind on studs with 1.5·W.
 * Every check reports utilisation = demand / resistance and, on failure, the
 * thinnest C89 gauge from the line that passes. Not checked: distortional and
 * torsional buckling, web crippling at bearings, connections, deflections,
 * seismic. The result does not replace the engineer's calculation.
 */

export const LIVE_FLOOR_KPA = 1.5; // residential floors, EN 1991-1-1 cat. A
export const GAMMA_G = 1.35;
export const GAMMA_Q = 1.5;

export interface Loads {
  /** Roof dead load on plan, kPa */
  roofG: number;
  /** Ground snow s_k and roof snow s = μ·s_k, kPa */
  snowGround: number;
  snowMu: number;
  snowRoof: number;
  /** Design roof load on plan, kPa */
  roofDesign: number;
  /** Floor dead / live / design, kPa */
  floorG: number;
  floorQ: number;
  floorDesign: number;
  /** Basic wind pressure and design pressure on walls, kPa */
  wind: number;
  windDesign: number;
}

export type CheckKind = "compression" | "tension" | "combined" | "bending";

export interface Check {
  /** i18n key under `chk.*` */
  element: string;
  /** Detail: level, mark or opening */
  where: string;
  kind: CheckKind;
  demand: number;
  resistance: number;
  utilisation: number;
  ok: boolean;
  /** Thinnest line gauge that passes, if the current one fails */
  suggest: string | null;
}

export interface Design {
  loads: Loads;
  checks: Check[];
  worst: number;
  ok: boolean;
}

/** EN 1991-1-3 shape coefficient μ1 for a pitched roof */
export function snowShape(pitchDeg: number): number {
  if (pitchDeg <= 30) return 0.8;
  if (pitchDeg >= 60) return 0;
  return (0.8 * (60 - pitchDeg)) / 30;
}

const LINE = [0.75, 0.95, 1.0, 1.15, 1.2].map((t) => findProfile(`C89x41x11x${t}`));

function suggest(fn: (p: ProfileSpec) => number, current: ProfileSpec): string | null {
  for (const p of LINE) if (p.thickness > current.thickness && fn(p) <= 1) return p.id;
  return LINE.every((p) => fn(p) > 1) ? "—" : null;
}

function check(element: string, where: string, kind: CheckKind, demand: number, res: number, fn: (p: ProfileSpec) => number, p: ProfileSpec): Check {
  const u = res > 0 ? demand / res : Infinity;
  return { element, where, kind, demand, resistance: res, utilisation: u, ok: u <= 1, suggest: u > 1 ? suggest(fn, p) : null };
}

const barLength = (m: TrussModel, i: number) => {
  const b = m.bars[i]!;
  const a = m.nodes[b.a]!;
  const c = m.nodes[b.b]!;
  return Math.hypot(c.x - a.x, c.y - a.y);
};

/** Bar forces by role under a uniform design load on plan */
function trussChecks(model: TrussModel, qKpa: number, spacing: number, label: string, p: ProfileSpec, battens: number): Check[] {
  const sol = solveTruss(model, roofNodeLoads(model, qKpa, spacing));
  const out: Check[] = [];
  const roles: BarRole[] = ["top-chord", "bottom-chord", "diagonal", "vertical"];
  for (const role of roles) {
    let worstC = 0;
    let lenC = 0;
    let worstT = 0;
    model.bars.forEach((b, i) => {
      if (b.role !== role) return;
      const f = sol.barForces[i]!;
      const L = barLength(model, i);
      if (-f > worstC) {
        worstC = -f;
        lenC = L;
      }
      if (f > worstT) worstT = f;
    });
    if (worstC > 1) {
      // Chords are held out of plane by battens / ceiling lining; webs only at their ends
      const weak = role === "top-chord" || role === "bottom-chord" ? Math.min(lenC, battens) : lenC;
      const u = (q: ProfileSpec) => worstC / nbRd(resistance(q), lenC, weak);
      out.push(check(`bar.${role}`, label, "compression", worstC, nbRd(resistance(p), lenC, weak), u, p));
    }
    if (worstT > 1) out.push(check(`bar.${role}`, label, "tension", worstT, ntRd(resistance(p)), (q) => worstT / ntRd(resistance(q)), p));
  }
  return out;
}

export function design(b: Building, city: City, finishes: FinishChoice): Design {
  const { input, profile: p } = b;
  const W = input.width;
  const a = (input.roof.pitchDeg * Math.PI) / 180;
  const covering = finish(finishes.roofing).kgPerM2 + 6; // + battens and membrane
  const ceiling = input.heating === "none" ? 0 : 10 + 6; // lining + insulation
  const roofG = ((covering / Math.cos(a) + ceiling + 8) * 9.81) / 1000; // + truss self-weight
  const mu = snowShape(input.roof.pitchDeg);
  const snowRoof = mu * city.snowKpa;
  const roofDesign = GAMMA_G * roofG + GAMMA_Q * snowRoof;
  const floorG = 0.6;
  const floorDesign = GAMMA_G * floorG + GAMMA_Q * LIVE_FLOOR_KPA;
  // Exposure for a low building in open terrain (EN 1991-1-4 ce(z) ≈ 1.7 at 5–7 m), cpe + cpi ≈ 1.0
  const windDesign = GAMMA_Q * city.windKpa * 1.7 * 1.0;
  const loads: Loads = { roofG, snowGround: city.snowKpa, snowMu: mu, snowRoof, roofDesign, floorG, floorQ: LIVE_FLOOR_KPA, floorDesign, wind: city.windKpa, windDesign };

  const checks: Check[] = [];
  const gaps = b.trussPositions.slice(1).map((x, i) => x - b.trussPositions[i]!);
  const spacing = Math.max(...gaps, input.trussSpacing);
  checks.push(...trussChecks(b.roofTruss, roofDesign, spacing, "T1", p, 600));
  if (b.floorTruss) checks.push(...trussChecks(b.floorTruss, floorDesign, 600, "FT", p, 600));

  // Line loads on the long walls, N/mm, from the top down
  const roofLine = (roofDesign * (W / 2 + input.roof.overhang)) / 1000; // kPa × m → kN/m = N/mm
  const floorLine = (floorDesign * (W / 2)) / 1000;
  const n = input.levels.length;
  input.levels.forEach((level, li) => {
    const above = roofLine + (n - 1 - li) * (floorLine + (GAMMA_G * 0.5 * (input.levels[li + 1]?.height ?? 0)) / 1e6 * 1000);
    const H = level.height;
    const s = input.studSpacing;
    const label = `${li + 1}`;
    // Long-wall stud: axial + wind bending; noggings halve the weak-axis length
    const N = above * s;
    const M = ((loads.windDesign / 1000) * s * H * H) / 8;
    const stud = (q: ProfileSpec) => {
      const r = resistance(q);
      return N / nbRd(r, H, H / 2) + M / mcRdX(r);
    };
    const r0 = resistance(p);
    checks.push(check("chk.stud", label, "combined", N / nbRd(r0, H, H / 2) + M / mcRdX(r0), 1, stud, p));
    // Lintels on the long walls
    for (const plan of wallPlans(input, li, b.levels[li]!.base)) {
      if (plan.side !== "front" && plan.side !== "back") continue;
      const cfg = level.sides[plan.side];
      for (const o of sideOpenings(cfg, plan.length, H, input, p)) {
        const L = o.width + 100;
        const Md = (above * L * L) / 8;
        const cls = openingClass(o);
        const headerH = H - (o.sill + o.height) - 2 * p.thickness;
        const res = (q: ProfileSpec) => {
          const r = resistance(q);
          if (cls === "truss" && headerH > 250) {
            // Chord force = M / lever arm; the top plate is restrained by the cripples at stud spacing
            const lever = headerH - (q.family === "C" ? q.flange : 41);
            return (Md / lever) / nbRd(r, s, s);
          }
          const box = cls === "double" ? 2 * (r.iy + r.area * (0.35 * (q.family === "C" ? q.flange : 41)) ** 2) / r.iy : 1;
          return Md / (mcRdY(r) * box);
        };
        const u = res(p);
        checks.push({ ...check(`chk.lintel.${cls}`, `${plan.mark} · ${Math.round(o.width)}`, "bending", u, 1, res, p) });
      }
    }
  });

  const worst = Math.max(0, ...checks.map((c) => c.utilisation));
  return { loads, checks, worst, ok: checks.every((c) => c.ok) };
}
