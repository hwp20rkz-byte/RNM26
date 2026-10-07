import type { Building } from "../buildings/generate";
import { sideOpenings, wallPlans } from "../buildings/generate";
import { WALL_SIDES, type WallSide } from "../buildings/types";
import { rooms, type Room } from "../layout/rooms";

/**
 * Envelope take-off, m² / m. Gross areas from the frame's outer faces;
 * openings are deducted. Laps, fixings and trims are added by the finish
 * catalogue's waste factors, not here.
 */
export interface SideArea {
  level: number;
  side: WallSide;
  /** Clad wall area (net of openings; parapet only for half sides) */
  wallM2: number;
  windowsM2: number;
  doorsM2: number;
  gatesM2: number;
  windows: number;
  doors: number;
  gates: number;
}

export interface Envelope {
  sides: SideArea[];
  /** Gable / mono-pitch end infill above the top plates */
  gablesM2: number;
  /** Roof covering incl. overhangs */
  roofM2: number;
  /** Ridge, eaves and verge trims, m */
  ridgeM: number;
  eavesM: number;
  vergeM: number;
  /** Ceiling under the roof (top level) */
  ceilingM2: number;
  /** Floor of each level, clear */
  floorM2: number[];
  /** Plinth (цоколь) facing, m² */
  plinthM2: number;
  perimeterM: number;
  /** Partitions, one face, net of doors */
  partitionsM2: number;
  /** Building footprint, m² */
  footprintM2: number;
  /** Heated volume, m³ */
  volumeM3: number;
  rooms: Room[][];
  enclosed: boolean;
}

export function envelope(b: Building): Envelope {
  const { input, depth: d, profile } = b;
  const { length: L, width: W, roof } = input;
  const a = (roof.pitchDeg * Math.PI) / 180;
  const sides: SideArea[] = [];
  input.levels.forEach((level, li) => {
    for (const plan of wallPlans(input, li, b.levels[li]!.base)) {
      const cfg = level.sides[plan.side];
      const gross = (plan.length + (plan.side === "left" || plan.side === "right" ? 2 * d : 0)) / 1000;
      const ops = sideOpenings(cfg, plan.length, level.height, input, profile);
      const sum = (k: string) => ops.filter((o) => o.kind === k).reduce((s, o) => s + (o.width * o.height) / 1e6, 0);
      const count = (k: string) => ops.filter((o) => o.kind === k).length;
      let wallM2: number;
      if (cfg.type === "wall") wallM2 = gross * (level.height / 1000) - sum("window") - sum("door") - sum("gate");
      else if (cfg.type === "half") wallM2 = gross * (input.parapet / 1000);
      else wallM2 = 0;
      const user = cfg.type === "wall";
      sides.push({
        level: li,
        side: plan.side,
        wallM2,
        windowsM2: user ? sum("window") : 0,
        doorsM2: sum("door"),
        gatesM2: user ? sum("gate") : 0,
        windows: user ? count("window") : 0,
        doors: count("door"),
        gates: user ? count("gate") : 0,
      });
    }
  });

  const top = input.levels.length - 1;
  const topSides = input.levels[top]!.sides;
  const rise = roof.type === "mono" ? roof.heelHeight + W * Math.tan(a) : (W / 2) * Math.tan(a);
  // Ends are filled where the top level has a wall on that side
  let gablesM2 = 0;
  if (roof.type === "gable") {
    for (const s of ["left", "right"] as const) if (topSides[s].type === "wall") gablesM2 += (W * rise) / 2 / 1e6;
  } else {
    for (const s of ["left", "right"] as const) if (topSides[s].type === "wall") gablesM2 += (W * (roof.heelHeight + rise)) / 2 / 1e6;
    if (topSides.front.type === "wall") gablesM2 += (L * roof.heelHeight) / 1e6;
    if (topSides.back.type === "wall") gablesM2 += (L * rise) / 1e6;
  }
  const ov = roof.overhang;
  const roofLength = L + 2 * ov;
  const slope = roof.type === "mono" ? W / Math.cos(a) + 2 * ov : 2 * (W / 2 / Math.cos(a) + ov);
  const roofM2 = (roofLength * slope) / 1e6;
  const inner = b.levels[0]!.inner;
  const clear = ((inner.x1 - inner.x0) * (inner.z1 - inner.z0)) / 1e6;
  const enclosed = WALL_SIDES.every((s) => input.levels[0]!.sides[s].type === "wall");
  const roomsByLevel = input.levels.map((l, i) => rooms(l, b.levels[i]!.inner, d, enclosed ? "living" : "open"));
  const partitionsM2 = input.levels.reduce((s, l, i) => {
    const inn = b.levels[i]!.inner;
    return (
      s +
      l.partitions.reduce((t, p) => {
        const run = p.axis === "x" ? inn.z1 - inn.z0 : inn.x1 - inn.x0;
        return t + (run * l.height) / 1e6 - p.doors.reduce((u, o) => u + (o.width * o.height) / 1e6, 0);
      }, 0)
    );
  }, 0);
  return {
    sides,
    gablesM2,
    roofM2,
    ridgeM: roof.type === "gable" ? roofLength / 1000 : 0,
    eavesM: (roof.type === "gable" ? 2 : 2) * (roofLength / 1000),
    vergeM: (roof.type === "gable" ? 4 : 2) * (slope / (roof.type === "gable" ? 2 : 1) / 1000),
    ceilingM2: enclosed ? clear : 0,
    floorM2: input.levels.map(() => clear),
    plinthM2: (2 * (L + W) * input.foundation.plinth) / 1e6,
    perimeterM: (2 * (L + W)) / 1000,
    partitionsM2,
    footprintM2: (L * W) / 1e6,
    volumeM3: enclosed ? input.levels.reduce((s, l) => s + clear * (l.height / 1000), 0) : 0,
    rooms: roomsByLevel,
    enclosed,
  };
}

export const sum = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0);
export const wallArea = (e: Envelope) => sum(e.sides.map((s) => s.wallM2)) + e.gablesM2;
export const windowArea = (e: Envelope) => sum(e.sides.map((s) => s.windowsM2));
export const doorArea = (e: Envelope) => sum(e.sides.map((s) => s.doorsM2 + s.gatesM2));
