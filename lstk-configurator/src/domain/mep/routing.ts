import { sideOpenings, wallPlans, type Building } from "../buildings/generate";
import { toWorld } from "../geometry/frame";
import { v3, type Vec3 } from "../geometry/vec";
import type { Room } from "../layout/rooms";
import { ROOM_RULES, type Mep, type WaterFixture } from "./mep";

/**
 * Schematic routing of the services through the frame, for the 3D view and
 * the drawings: where the panel, the risers, the fixtures, the fans and the
 * radiators go and how the runs reach them. Rules (docs/lstk-knowledge-base.md §8):
 * - cables run through the stud service holes at 300 mm (sockets) and in the
 *   ceiling void (lights), each room fed from the panel;
 * - water enters in the technical room, cold and hot pipes run in the floor
 *   void (between floor trusses) or along the walls on a slab, then rise to
 *   the taps;
 * - drains fall at 2 % to the 110 mm stack beside the WC, the stack is
 *   vented through the roof, the outlet leaves through the foundation;
 * - exhaust from wet rooms and the kitchen goes up through the roof; living
 *   rooms get wall inlet valves (or ducts from the recovery unit);
 * - water heating: boiler in the technical room, two-pipe loop to radiators
 *   under the windows; electric heating: convectors under the windows.
 *
 * Positions are plan-level decisions for a preliminary design, not a
 * working MEP drawing.
 */

export type MepSystem = "power" | "lighting" | "cold" | "hot" | "sewer" | "vent" | "heating";

export const MEP_SYSTEMS: readonly MepSystem[] = ["power", "lighting", "cold", "hot", "sewer", "vent", "heating"];

export interface MepRun {
  system: MepSystem;
  level: number;
  /** Polyline, model mm */
  points: Vec3[];
  /** Outside diameter, mm (cables drawn as 10 mm) */
  diameter: number;
}

export type MepPointKind = "panel" | "socket" | "light" | "entry" | "heater" | "fixture" | "stack" | "outlet" | "fan" | "valve" | "unit" | "boiler" | "radiator" | "convector";

export interface MepPoint {
  system: MepSystem;
  kind: MepPointKind;
  level: number;
  at: Vec3;
  /** Box size, mm (x, y, z) */
  size: [number, number, number];
  fixture?: WaterFixture;
}

export interface MepLayout {
  runs: MepRun[];
  points: MepPoint[];
}

export interface MepRoutingOptions {
  electricHeating: boolean;
  recovery: boolean;
}

const INSET = 60;

/** Orthogonal path a → b in the horizontal plane at height y: along x, then along z */
function lPath(a: Vec3, b: Vec3, y: number): Vec3[] {
  return [v3(a.x, y, a.z), v3(b.x, y, a.z), v3(b.x, y, b.z)];
}

function dedupe(pts: Vec3[]): Vec3[] {
  return pts.filter((p, i) => i === 0 || Math.hypot(p.x - pts[i - 1]!.x, p.y - pts[i - 1]!.y, p.z - pts[i - 1]!.z) > 1);
}

/** Point on the room's perimeter (inset) at distance s from its x0/z0 corner, going round */
function perimeterPoint(r: Room, s: number, y: number): Vec3 {
  const x0 = r.x0 + INSET;
  const x1 = r.x1 - INSET;
  const z0 = r.z0 + INSET;
  const z1 = r.z1 - INSET;
  const w = x1 - x0;
  const h = z1 - z0;
  const p = ((s % (2 * (w + h))) + 2 * (w + h)) % (2 * (w + h));
  if (p < w) return v3(x0 + p, y, z0);
  if (p < w + h) return v3(x1, y, z0 + (p - w));
  if (p < 2 * w + h) return v3(x1 - (p - w - h), y, z1);
  return v3(x0, y, z1 - (p - 2 * w - h));
}

const inside = (r: Room, p: Vec3) => p.x >= r.x0 - 1 && p.x <= r.x1 + 1 && p.z >= r.z0 - 1 && p.z <= r.z1 + 1;

export function mepLayout(b: Building, rooms: Room[][], m: Mep, opts: MepRoutingOptions): MepLayout {
  const runs: MepRun[] = [];
  const points: MepPoint[] = [];
  const all = rooms.flatMap((level, li) => level.map((room) => ({ room, li })));
  if (!all.length) return { runs, points };
  const { input } = b;
  const W = input.width;
  const L = input.length;
  const levelBase = (li: number) => b.levels[li]?.base ?? 0;
  const levelTop = (li: number) => levelBase(li) + (b.levels[li]?.height ?? 2700);
  // Floor void: between floor trusses when there is a floor frame under the level
  const floorVoid = (li: number) => (li > 0 || b.groundFloor ? levelBase(li) - 120 : levelBase(li) + 150);
  const roofAt = (z: number) => {
    const a = (input.roof.pitchDeg * Math.PI) / 180;
    return b.roofBase + (input.roof.type === "mono" ? input.roof.heelHeight + Math.tan(a) * z : Math.tan(a) * Math.min(z, W - z));
  };

  const hub = all.find((r) => r.room.purpose === "technical") ?? all.find((r) => r.room.purpose === "hall") ?? all[0]!;

  // ── Electrical ───────────────────────────────────────────
  const panel = v3(hub.room.x0 + INSET, levelBase(hub.li) + 1600, (hub.room.z0 + hub.room.z1) / 2);
  points.push({ system: "power", kind: "panel", level: hub.li, at: panel, size: [120, 450, 300] });
  m.rooms.forEach((rm, k) => {
    const r = rm.room;
    const li = rm.level;
    const ceil = levelTop(li) - 150 - (k % 4) * 15;
    const per = 2 * (r.x1 - r.x0 + r.z1 - r.z0 - 4 * INSET);
    const corner = v3(r.x0 + INSET, ceil, r.z0 + INSET);
    // Feed: up from the panel into the ceiling void (through the floor to upper levels), across to the room
    const rise = v3(panel.x, ceil, panel.z);
    if (rm.sockets > 0) {
      const y = levelBase(li) + 300;
      const feed = dedupe([panel, v3(panel.x, levelTop(hub.li) - 150, panel.z), rise, ...lPath(rise, corner, ceil), v3(corner.x, y, corner.z)]);
      runs.push({ system: "power", level: li, points: feed, diameter: 10 });
      const ring: Vec3[] = [];
      for (let i = 0; i <= 40; i++) ring.push(perimeterPoint(r, (per * i) / 40, y));
      runs.push({ system: "power", level: li, points: ring, diameter: 10 });
      for (let i = 0; i < rm.sockets; i++) points.push({ system: "power", kind: "socket", level: li, at: perimeterPoint(r, (per * (i + 0.5)) / rm.sockets, y), size: [80, 80, 80] });
    }
    // Lights: a grid on the ceiling, chained from the room corner
    const n = Math.max(1, rm.lights);
    const cols = Math.ceil(Math.sqrt(n * ((r.x1 - r.x0) / Math.max(1, r.z1 - r.z0))));
    const rowsN = Math.ceil(n / cols);
    const lightY = levelTop(li) - 40;
    let prev = v3(r.x0 + INSET, ceil, r.z0 + INSET);
    const chain: Vec3[] = [v3(panel.x, ceil, panel.z), ...lPath(v3(panel.x, ceil, panel.z), prev, ceil)];
    for (let i = 0; i < n; i++) {
      const cx = r.x0 + ((i % cols) + 0.5) * ((r.x1 - r.x0) / cols);
      const cz = r.z0 + (Math.floor(i / cols) + 0.5) * ((r.z1 - r.z0) / rowsN);
      const p = v3(cx, ceil, cz);
      chain.push(...lPath(prev, p, ceil).slice(1));
      prev = p;
      points.push({ system: "lighting", kind: "light", level: li, at: v3(cx, lightY, cz), size: [220, 40, 220] });
    }
    runs.push({ system: "lighting", level: li, points: dedupe(chain), diameter: 10 });
  });

  // ── Water and drainage ───────────────────────────────────
  const wet = m.rooms.filter((r) => r.fixtures.length);
  if (wet.length) {
    const tech = wet.find((r) => r.fixtures.includes("heater")) ?? m.rooms.find((r) => r.room.purpose === "technical") ?? wet[0]!;
    const t = tech.room;
    // Entry through the outer wall nearest to the technical room
    const sides = [
      { d: t.x0 - b.depth, p: v3(t.x0 + INSET, 0, (t.z0 + t.z1) / 2) },
      { d: L - b.depth - t.x1, p: v3(t.x1 - INSET, 0, (t.z0 + t.z1) / 2) },
      { d: t.z0 - b.depth, p: v3((t.x0 + t.x1) / 2, 0, t.z0 + INSET) },
      { d: W - b.depth - t.z1, p: v3((t.x0 + t.x1) / 2, 0, t.z1 - INSET) },
    ].sort((a, c) => a.d - c.d);
    const entryXZ = sides[0]!.p;
    const entry = v3(entryXZ.x, floorVoid(tech.level), entryXZ.z);
    points.push({ system: "cold", kind: "entry", level: tech.level, at: entry, size: [150, 150, 150] });
    const heaterAt = v3(t.x0 + INSET + 300, levelBase(tech.level) + 900, t.z1 - INSET - 300);
    points.push({ system: "hot", kind: "heater", level: tech.level, at: heaterAt, size: [450, 800, 450] });

    // Stack: beside the first WC, else beside the first drained fixture
    const fixturesAt: { rm: (typeof wet)[number]; f: WaterFixture; at: Vec3 }[] = [];
    for (const rm of wet) {
      const r = rm.room;
      const list = rm.fixtures.filter((f) => f !== "heater");
      list.forEach((f, i) => {
        // Along the room wall nearest to the entry
        const alongX = Math.abs(entry.z - r.z0) < Math.abs(entry.z - r.z1);
        const z = alongX ? r.z0 + INSET + 200 : r.z1 - INSET - 200;
        const x = Math.min(r.x1 - INSET - 300, r.x0 + INSET + 400 + i * 800);
        fixturesAt.push({ rm, f, at: v3(x, levelBase(rm.level) + 450, z) });
      });
    }
    const stackOn = fixturesAt.find((x) => x.f === "wc") ?? fixturesAt.find((x) => x.f !== "drinker");
    for (const fx of fixturesAt) {
      points.push({ system: "cold", kind: "fixture", level: fx.rm.level, at: fx.at, size: fx.f === "wc" ? [400, 450, 650] : fx.f === "shower" ? [800, 60, 800] : [500, 200, 400], fixture: fx.f });
      const fv = floorVoid(fx.rm.level);
      runs.push({ system: "cold", level: fx.rm.level, points: dedupe([entry, ...lPath(entry, v3(fx.at.x, fv, fx.at.z), fv), v3(fx.at.x, fx.at.y + 100, fx.at.z)]), diameter: 20 });
      if (["sink", "basin", "shower"].includes(fx.f)) {
        const h0 = v3(heaterAt.x + 60, fv, heaterAt.z);
        runs.push({ system: "hot", level: fx.rm.level, points: dedupe([v3(heaterAt.x + 60, heaterAt.y, heaterAt.z), h0, ...lPath(h0, v3(fx.at.x + 60, fv, fx.at.z + 60), fv), v3(fx.at.x + 60, fx.at.y + 100, fx.at.z + 60)]), diameter: 20 });
      }
    }
    if (stackOn) {
      const s = v3(stackOn.at.x + 250, 0, stackOn.at.z);
      const below = (b.groundFloor ? b.levels[0]!.base - 400 : b.levels[0]!.base - 300) - 0;
      const top = roofAt(s.z) + 400;
      points.push({ system: "sewer", kind: "stack", level: 0, at: v3(s.x, below, s.z), size: [110, 110, 110] });
      runs.push({ system: "sewer", level: 0, points: [v3(s.x, below, s.z), v3(s.x, top, s.z)], diameter: 110 });
      // Outlet: from the stack foot out through the nearest long wall, below the frost line
      const outZ = s.z < W / 2 ? -600 : W + 600;
      runs.push({ system: "sewer", level: 0, points: [v3(s.x, below, s.z), v3(s.x, below - Math.abs(outZ - s.z) * 0.02, outZ)], diameter: 110 });
      points.push({ system: "sewer", kind: "outlet", level: 0, at: v3(s.x, below - Math.abs(outZ - s.z) * 0.02, outZ), size: [200, 200, 200] });
      for (const fx of fixturesAt) {
        if (fx.f === "drinker") continue;
        const dia = fx.f === "wc" ? 110 : 50;
        // Fall at 2 % towards the stack under the floor of the fixture's level
        const y0 = floorVoid(fx.rm.level) - 60;
        const path = lPath(v3(fx.at.x, y0, fx.at.z), v3(s.x, y0, s.z), y0);
        let run = 0;
        const fall: Vec3[] = [v3(fx.at.x, fx.at.y - 300, fx.at.z)];
        path.forEach((p, i) => {
          if (i > 0) run += Math.abs(p.x - path[i - 1]!.x) + Math.abs(p.z - path[i - 1]!.z);
          fall.push(v3(p.x, p.y - run * 0.02, p.z));
        });
        runs.push({ system: "sewer", level: fx.rm.level, points: dedupe(fall), diameter: dia });
      }
    }
  }

  // ── Ventilation ──────────────────────────────────────────
  const unit = opts.recovery ? v3(hub.room.x1 - INSET - 400, levelTop(hub.li) - 250, hub.room.z1 - INSET - 300) : null;
  if (unit) {
    points.push({ system: "vent", kind: "unit", level: hub.li, at: unit, size: [800, 300, 600] });
    runs.push({ system: "vent", level: hub.li, points: [unit, v3(unit.x, roofAt(unit.z) + 500, unit.z)], diameter: 160 });
  }
  for (const rm of m.rooms) {
    const rule = ROOM_RULES[rm.room.purpose];
    const r = rm.room;
    const top = levelTop(rm.level) - 60;
    const exhaust = rule.ventFixed > 0 || r.purpose === "steam" || r.purpose === "poultry";
    if (exhaust && rm.ventM3h > 0) {
      const at = v3(r.x1 - INSET - 200, top, r.z1 - INSET - 200);
      points.push({ system: "vent", kind: "fan", level: rm.level, at, size: [200, 60, 200] });
      if (unit) runs.push({ system: "vent", level: rm.level, points: dedupe([at, v3(at.x, levelTop(hub.li) - 250, at.z), ...lPath(v3(at.x, 0, at.z), unit, levelTop(hub.li) - 250)]), diameter: 125 });
      else runs.push({ system: "vent", level: rm.level, points: [at, v3(at.x, roofAt(at.z) + 400, at.z)], diameter: 125 });
    } else if (rm.ventM3h > 0 && ["living", "bedroom", "rest"].includes(r.purpose)) {
      if (unit) {
        const at = v3((r.x0 + r.x1) / 2, top, r.z0 + INSET + 200);
        points.push({ system: "vent", kind: "valve", level: rm.level, at, size: [200, 60, 200] });
        runs.push({ system: "vent", level: rm.level, points: dedupe([unit, ...lPath(unit, at, levelTop(hub.li) - 250), at]), diameter: 100 });
      } else {
        // Wall inlet valve on the outer wall the room touches
        const outer = r.z0 <= b.depth + 1 ? v3((r.x0 + r.x1) / 2, levelBase(rm.level) + 2000, r.z0 + 20) : r.z1 >= W - b.depth - 1 ? v3((r.x0 + r.x1) / 2, levelBase(rm.level) + 2000, r.z1 - 20) : null;
        if (outer) points.push({ system: "vent", kind: "valve", level: rm.level, at: outer, size: [160, 160, 60] });
      }
    }
  }

  // ── Heating ──────────────────────────────────────────────
  const heated = input.heating === "permanent" || input.heating === "seasonal";
  if (heated) {
    const boiler = opts.electricHeating ? null : v3(hub.room.x0 + INSET + 300, levelBase(hub.li) + 1200, hub.room.z0 + INSET + 250);
    if (boiler) points.push({ system: "heating", kind: "boiler", level: hub.li, at: boiler, size: [400, 700, 350] });
    input.levels.forEach((level, li) => {
      for (const plan of wallPlans(input, li, levelBase(li))) {
        const side = level.sides[plan.side];
        if (side.type !== "wall") continue;
        for (const o of sideOpenings(side, plan.length, level.height, input, b.profile)) {
          if (o.kind !== "window") continue;
          const inward = v3(-plan.outward.x, 0, -plan.outward.z);
          const base = toWorld(plan.placement, v3(o.x + o.width / 2, 0, 0));
          const off = b.depth / 2 + 120;
          const at = v3(base.x + inward.x * off, levelBase(li) + 350, base.z + inward.z * off);
          const room = all.find((x) => x.li === li && inside(x.room, at));
          if (!room || ["steam", "storage", "garage", "open", "poultry"].includes(room.room.purpose)) continue;
          const w = Math.min(1200, Math.max(400, o.width * 0.7));
          const size: [number, number, number] = plan.side === "front" || plan.side === "back" ? [w, 500, 90] : [90, 500, w];
          points.push({ system: "heating", kind: boiler ? "radiator" : "convector", level: li, at, size });
          if (boiler) {
            const y = floorVoid(li) + (li > 0 || b.groundFloor ? 0 : -60);
            for (const [dx, dy] of [[0, 0], [60, -40]] as const) {
              const s0 = v3(boiler.x + dx, y + dy, boiler.z);
              runs.push({ system: "heating", level: li, points: dedupe([v3(boiler.x + dx, boiler.y, boiler.z), s0, ...lPath(s0, v3(at.x + dx, y + dy, at.z), y + dy), v3(at.x + dx, at.y - 150, at.z)]), diameter: 20 });
            }
          }
        }
      }
    });
  }
  return { runs, points };
}

/** Run length by system, m */
export function mepLengths(layout: MepLayout): Record<MepSystem, number> {
  const out = Object.fromEntries(MEP_SYSTEMS.map((s) => [s, 0])) as Record<MepSystem, number>;
  for (const r of layout.runs) {
    for (let i = 1; i < r.points.length; i++) {
      const a = r.points[i - 1]!;
      const c = r.points[i]!;
      out[r.system] += Math.hypot(c.x - a.x, c.y - a.y, c.z - a.z) / 1000;
    }
  }
  return out;
}
