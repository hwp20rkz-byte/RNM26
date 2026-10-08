import type { Assembly } from "../assemblies/types";
import { anchorStations, STUD_SCREW_PITCH, type HardwareItem } from "../connections/hardware";
import { frame, type Frame3 } from "../geometry/frame";
import { v3, type Vec3 } from "../geometry/vec";
import { interior, partitionSegments, strandedDoors, validatePartitions, type Interior } from "../layout/rooms";
import type { Member } from "../members/types";
import { findProfile } from "../profiles/catalog";
import type { ProfileSpec } from "../profiles/types";
import { fabricateTruss } from "../trusses/fabricate";
import { generateTruss } from "../trusses/generate";
import type { TrussModel } from "../trusses/types";
import { generateWall } from "../walls/generate";
import { openingClass, type BackingStud, type Opening } from "../walls/types";
import { jambZone } from "../walls/generate";
import { WALL_SIDES, type BuildingInput, type Level, type SideConfig, type WallSide } from "./types";

/**
 * Model coordinates (mm): x along the ridge, z across (truss span), y up from
 * the ground, origin at the outer front-left corner.
 *
 * Vertical stack (platform framing):
 *   ground → plinth (foundation top)
 *   → ground-floor trusses (except on a slab or with no foundation)
 *   → level 1 walls → floor trusses → level 2 walls → roof trusses.
 */

export const TRUSS_EDGE = 50;
/** Minimum depth of a floor truss, out-to-out of the chords, mm */
export const FLOOR_TRUSS_DEPTH = 300;

/**
 * Floor truss depth for a span: parallel-chord trusses need about L/16 to
 * carry 1.5 kPa living load with C89 chords (checked in domain/structure).
 */
export function floorTrussDepth(span: number): number {
  return Math.min(600, Math.max(FLOOR_TRUSS_DEPTH, Math.ceil(span / 16 / 50) * 50));
}

/** Header (truss girder) depth above the bays of half and open sides, mm */
export const GIRDER_DEPTH = 300;
const FLOOR_SPACING = 600;

export interface LevelInfo {
  index: number;
  /** Underside of the bottom plate */
  base: number;
  height: number;
  inner: Interior;
}

export interface Building {
  input: BuildingInput;
  profile: ProfileSpec;
  /** Stud depth = wall thickness of the frame, mm */
  depth: number;
  assemblies: Assembly[];
  levels: LevelInfo[];
  roofTruss: TrussModel;
  floorTruss: TrussModel | null;
  trussPositions: number[];
  floorPositions: number[];
  /** Where the roof truss bottom chord line sits */
  roofBase: number;
  /** Top of the roof structure (ridge or high end of a mono roof) */
  ridgeHeight: number;
  /** Ground-floor frame present (trusses on piles/strip) */
  groundFloor: boolean;
  /** Bought-in connection hardware with positions */
  hardware: HardwareItem[];
  /** Node (connection detail) counts by type */
  nodes: NodeCount[];
}

export type NodeType =
  | "corner"
  | "tee"
  | "cross"
  | "opening-single"
  | "opening-double"
  | "opening-truss"
  | "base-anchor"
  | "hold-down"
  | "truss-heel"
  | "truss-ridge"
  | "floor-bearing"
  | "strap-brace";

export interface NodeCount {
  type: NodeType;
  count: number;
}

export interface WallPlan {
  level: number;
  side: WallSide;
  mark: string;
  length: number;
  placement: Frame3;
  outward: Vec3;
}

const depthOf = (p: ProfileSpec) => (p.family === "Hat" ? p.depth : p.web);
const flangeOf = (p: ProfileSpec) => (p.family === "Hat" ? p.crown : p.flange);

/** Evenly spaced stations from `edge` to `length − edge`, no wider than `max` */
export function evenStations(length: number, max: number, edge: number): number[] {
  const span = length - 2 * edge;
  const bays = Math.max(1, Math.ceil(span / max - 1e-9));
  return Array.from({ length: bays + 1 }, (_, i) => edge + (span * i) / bays);
}

export function hasGroundFloorFrame(input: Pick<BuildingInput, "foundation">): boolean {
  return input.foundation.type === "screw-piles" || input.foundation.type === "strip";
}

/** Base height of every level (underside of its bottom plate), mm */
export function levelBases(input: BuildingInput): number[] {
  const fd = floorTrussDepth(input.width);
  let y = input.foundation.plinth + (hasGroundFloorFrame(input) ? fd : 0);
  return input.levels.map((l) => {
    const base = y;
    y += l.height + fd;
    return base;
  });
}

/** The four outer walls of a level, their length and placement */
export function wallPlans(input: BuildingInput, level: number, base = levelBases(input)[level] ?? 0): WallPlan[] {
  const d = depthOf(findProfile(input.profileId));
  const { length: L, width: W } = input;
  const n = level * 4;
  return [
    { level, side: "front", mark: `W${n + 1}`, length: L, placement: frame(v3(0, base, d / 2), v3(1, 0, 0), v3(0, 1, 0)), outward: v3(0, 0, -1) },
    { level, side: "back", mark: `W${n + 2}`, length: L, placement: frame(v3(L, base, W - d / 2), v3(-1, 0, 0), v3(0, 1, 0)), outward: v3(0, 0, 1) },
    { level, side: "left", mark: `W${n + 3}`, length: W - 2 * d, placement: frame(v3(d / 2, base, W - d), v3(0, 0, -1), v3(0, 1, 0)), outward: v3(-1, 0, 0) },
    { level, side: "right", mark: `W${n + 4}`, length: W - 2 * d, placement: frame(v3(L - d / 2, base, d), v3(0, 0, 1), v3(0, 1, 0)), outward: v3(1, 0, 0) },
  ];
}

/**
 * Openings that make a "half" or "open" side: one bay per post spacing, the
 * posts being the jamb studs. Half sides keep a parapet; a user door on a half
 * side turns the bay it falls in into a full-height passage.
 */
export function sideOpenings(side: SideConfig, length: number, height: number, input: Pick<BuildingInput, "postSpacing" | "parapet">, p: ProfileSpec): Opening[] {
  if (side.type === "wall") return side.openings;
  const t = p.thickness;
  const f = flangeOf(p);
  // A station is a post made of two jambs back to back (or end stud + jamb at the corners)
  const edge = 2 * f + 2 * t + 20;
  const mid = 2 * f + 120;
  const stations = evenStations(length, input.postSpacing, 0);
  // Bays stop under a truss girder: lintel + top plate + diagonals, GIRDER_DEPTH deep
  const top = height - GIRDER_DEPTH;
  const out: Opening[] = [];
  for (let i = 0; i + 1 < stations.length; i++) {
    const x0 = stations[i]! + (i === 0 ? edge : mid / 2);
    const x1 = stations[i + 1]! - (i + 1 === stations.length - 1 ? edge : mid / 2);
    if (x1 - x0 < 300) continue;
    const c = (x0 + x1) / 2;
    const passage = side.type === "half" && side.openings.some((o) => o.kind !== "window" && c >= o.x && c <= o.x + o.width);
    if (side.type === "open" || passage) {
      out.push({ id: `bay${i}`, kind: "gate", x: x0, width: x1 - x0, height: top, sill: 0 });
    } else {
      out.push({ id: `bay${i}`, kind: "window", x: x0, width: x1 - x0, height: top - input.parapet, sill: input.parapet });
    }
  }
  return out;
}

/** A pair of backing studs centred on `x` for a wall of thickness `d` meeting this one */
function teePair(x: number, d: number, t: number): BackingStud[] {
  return [
    { x: x - d / 2 + t / 2, flipped: true, reason: "tee" },
    { x: x + d / 2 - t / 2, flipped: false, reason: "tee" },
  ];
}

/**
 * Backing studs of an outer wall: a corner stud where the end wall butts in
 * (3-stud corner) and a pair where every partition meets the wall (T-junction).
 */
export function outerBacking(input: BuildingInput, level: Level, side: WallSide, length: number, d: number, t: number): BackingStud[] {
  const out: BackingStud[] = [];
  const { length: L, width: W } = input;
  const closed = (s: WallSide) => level.sides[s].type === "wall";
  if (!closed(side)) return out;
  if (side === "front" || side === "back") {
    // local x from the wall start: front runs +x from x=0, back runs −x from x=L
    const startEnd: WallSide = side === "front" ? "left" : "right";
    const endEnd: WallSide = side === "front" ? "right" : "left";
    if (closed(startEnd)) out.push({ x: d + t / 2, flipped: false, reason: "corner" });
    if (closed(endEnd)) out.push({ x: length - d - t / 2, flipped: true, reason: "corner" });
    for (const p of level.partitions.filter((q) => q.axis === "x")) out.push(...teePair(side === "front" ? p.at : L - p.at, d, t));
  } else {
    for (const p of level.partitions.filter((q) => q.axis === "z")) out.push(...teePair(side === "left" ? W - d - p.at : p.at - d, d, t));
  }
  return out;
}

export function validateBuilding(input: BuildingInput): string[] {
  const e: string[] = [];
  if (!(input.length >= 1500 && input.length <= 30000)) e.push("Длина здания — от 1,5 до 30 м");
  if (!(input.width >= 1500 && input.width <= 15000)) e.push("Ширина (пролёт ферм) — от 1,5 до 15 м");
  if (!(input.trussSpacing >= 300 && input.trussSpacing <= 1500)) e.push("Шаг ферм — от 300 до 1500 мм");
  if (!(input.postSpacing >= 1000 && input.postSpacing <= 6000)) e.push("Шаг стоек открытых сторон — от 1 до 6 м");
  if (input.levels.length < 1 || input.levels.length > 2) e.push("Этажей — 1 или 2");
  input.levels.forEach((l, i) => {
    if (i > 0 && WALL_SIDES.some((s) => l.sides[s].type !== "wall")) e.push(`Этаж ${i + 1}: открытые стороны допустимы только на первом этаже`);
  });
  if (input.foundation.plinth < 0 || input.foundation.plinth > 1500) e.push("Цоколь — от 0 до 1500 мм");
  return e;
}

export function generateBuilding(input: BuildingInput): Building {
  const errors = validateBuilding(input);
  if (errors.length) throw new Error(errors.join("; "));
  const profile = findProfile(input.profileId);
  const d = depthOf(profile);
  const { length: L, width: W } = input;
  const bases = levelBases(input);
  const assemblies: Assembly[] = [];
  const levels: LevelInfo[] = [];

  // Floor trusses: parallel-chord C89 trusses at ≤ 600 mm, spanning the width
  const floorTruss = generateTruss({
    span: W,
    shape: { kind: "parallel", depth: floorTrussDepth(W) - d },
    pattern: "pratt",
    panels: Math.max(2, 2 * Math.ceil(W / 1200)),
    overhang: 0,
    chordProfile: profile,
    webProfile: profile,
    maxPieceLength: 12000,
  });
  const floorPieces = fabricateTruss(floorTruss, { idPrefix: "FT" }).members;
  const floorPositions = evenStations(L, FLOOR_SPACING, TRUSS_EDGE);
  const groundFloor = hasGroundFloorFrame(input);
  const addFloor = (mark: string, bottom: number, layer: number) => {
    floorPositions.forEach((x, i) => {
      assemblies.push({
        id: `${mark}#${i + 1}`,
        mark,
        kind: "truss",
        name: `Ферма перекрытия ${mark} (${i + 1} из ${floorPositions.length})`,
        members: floorPieces.map((m) => ({ ...m, id: `${mark}-${m.id}#${i + 1}` })),
        placement: frame(v3(x, bottom + d / 2, 0), v3(0, 0, 1), v3(0, 1, 0)),
        size: { width: W, height: floorTrussDepth(W) },
        explode: v3(0, -1, 0),
        layer,
      });
    });
  };
  if (groundFloor) addFloor("FT1", input.foundation.plinth, 0);

  input.levels.forEach((level, li) => {
    const base = bases[li]!;
    const inner = interior(input, d);
    levels.push({ index: li, base, height: level.height, inner });
    for (const plan of wallPlans(input, li, base)) {
      const side = level.sides[plan.side];
      const openings = sideOpenings(side, plan.length, level.height, input, profile);
      let members: Member[];
      const backing = outerBacking(input, level, plan.side, plan.length, d, profile.thickness);
      try {
        members = generateWall({ length: plan.length, height: level.height, studSpacing: input.studSpacing, profile, openings, noggings: side.type === "wall", backing }, plan.mark);
      } catch (err) {
        throw new Error(`Этаж ${li + 1}, стена ${plan.mark}: ${err instanceof Error ? err.message : String(err)}`);
      }
      assemblies.push({
        id: plan.mark,
        mark: plan.mark,
        kind: "wall",
        name: `Стена ${plan.mark}`,
        members,
        placement: plan.placement,
        size: { width: plan.length, height: level.height },
        explode: plan.outward,
        layer: li * 2,
      });
    }
    // Interior partitions
    const pErr = validatePartitions(level, inner, d);
    if (pErr.length) throw new Error(`Этаж ${li + 1}: ${pErr.join("; ")}`);
    const stranded = strandedDoors(level, inner, d);
    if (stranded.length) throw new Error(`Этаж ${li + 1}: дверь в продольной перегородке попадает на поперечную перегородку`);
    partitionSegments(level, inner, d).forEach((seg, k) => {
      const mark = `P${li + 1}.${k + 1}`;
      const length = seg.to - seg.from;
      let members: Member[];
      // Long partitions meeting this cross partition get a backing pair in it
      const backing = seg.axis === "x" ? level.partitions.filter((q) => q.axis === "z").flatMap((q) => teePair(q.at - seg.from, d, profile.thickness)) : [];
      try {
        members = generateWall({ length, height: level.height, studSpacing: input.studSpacing, profile, openings: seg.doors, noggings: false, backing }, mark);
      } catch (err) {
        throw new Error(`Этаж ${li + 1}, перегородка ${mark}: ${err instanceof Error ? err.message : String(err)}`);
      }
      const placement =
        seg.axis === "x" ? frame(v3(seg.at, base, seg.from), v3(0, 0, 1), v3(0, 1, 0)) : frame(v3(seg.from, base, seg.at), v3(1, 0, 0), v3(0, 1, 0));
      assemblies.push({
        id: mark,
        mark,
        kind: "wall",
        name: `Перегородка ${mark}`,
        members,
        placement,
        size: { width: length, height: level.height },
        explode: v3(0, 1, 0),
        layer: li * 2,
      });
    });
    // Floor between levels
    if (li + 1 < input.levels.length) addFloor(`FT${li + 2}`, base + level.height, li * 2 + 1);
  });

  // Roof
  const top = input.levels.length - 1;
  const roofBase = bases[top]! + input.levels[top]!.height + d / 2;
  const roof = input.roof;
  const roofTruss = generateTruss({
    span: W,
    shape: roof.type === "mono" ? { kind: "mono", pitchDeg: roof.pitchDeg, heelHeight: roof.heelHeight } : { kind: "triangular", pitchDeg: roof.pitchDeg },
    pattern: roof.type === "mono" && roof.pattern === "fink" ? "pratt" : roof.pattern,
    panels: roof.panels,
    overhang: roof.overhang,
    chordProfile: profile,
    webProfile: profile,
    maxPieceLength: 12000,
  });
  const roofPieces = fabricateTruss(roofTruss, { idPrefix: "T1" }).members;
  const trussPositions = evenStations(L, input.trussSpacing, TRUSS_EDGE);
  trussPositions.forEach((x, i) => {
    assemblies.push({
      id: `T1#${i + 1}`,
      mark: "T1",
      kind: "truss",
      name: `Ферма T1 (${i + 1} из ${trussPositions.length})`,
      members: roofPieces.map((m) => ({ ...m, id: `${m.id}#${i + 1}` })),
      placement: frame(v3(x, roofBase, 0), v3(0, 0, 1), v3(0, 1, 0)),
      size: { width: W, height: roofTruss.height },
      explode: v3(0, 1, 0),
      layer: input.levels.length * 2,
    });
  });

  const { hardware, nodes } = connections(input, assemblies, levels, bases, trussPositions, floorPositions, groundFloor, d, profile);

  return {
    input,
    profile,
    depth: d,
    hardware,
    nodes,
    assemblies,
    levels,
    roofTruss,
    floorTruss: groundFloor || input.levels.length > 1 ? floorTruss : null,
    trussPositions,
    floorPositions,
    roofBase,
    ridgeHeight: roofBase + roofTruss.height + d / 2,
    groundFloor,
  };
}

/** Overall envelope of the finished building incl. roof overhangs, mm */
export function overallSize(b: Building): { length: number; width: number; height: number } {
  const a = (b.input.roof.pitchDeg * Math.PI) / 180;
  const eaves = b.input.roof.overhang * Math.cos(a);
  return { length: b.input.length, width: b.input.width + 2 * eaves, height: b.ridgeHeight + 60 };
}

/**
 * Connection hardware and node counts. Positions are model coordinates, so the
 * 3D view and the drawings place the same items the estimate counts.
 */
function connections(
  input: BuildingInput,
  assemblies: Assembly[],
  levels: LevelInfo[],
  bases: number[],
  trussPositions: number[],
  floorPositions: number[],
  groundFloor: boolean,
  d: number,
  profile: ProfileSpec,
): { hardware: HardwareItem[]; nodes: NodeCount[] } {
  const hw: HardwareItem[] = [];
  const nodes = new Map<NodeType, number>();
  const add = (type: NodeType, n = 1) => nodes.set(type, (nodes.get(type) ?? 0) + n);
  const t = profile.thickness;
  const { length: L, width: W } = input;

  input.levels.forEach((level, li) => {
    const base = bases[li]!;
    const H = level.height;
    const screws = Math.ceil(H / STUD_SCREW_PITCH) + 1;
    const closed = (s: WallSide) => level.sides[s].type === "wall";
    // Corners: where two closed sides meet
    const corners: [WallSide, WallSide, number, number][] = [
      ["front", "left", 0, 0],
      ["front", "right", L, 0],
      ["back", "left", 0, W],
      ["back", "right", L, W],
    ];
    for (const [a, b, x, z] of corners) {
      if (!closed(a) || !closed(b)) continue;
      add("corner");
      hw.push({ kind: "corner-screws", at: v3(x, base + H / 2, z), level: li, mark: `L${li + 1}`, qty: 2 * screws });
    }
    // T-junctions and crossings of partitions
    const xs = level.partitions.filter((p) => p.axis === "x");
    const zs = level.partitions.filter((p) => p.axis === "z");
    add("tee", 2 * xs.length + 2 * zs.length);
    add("cross", 0);
    for (const p of xs) for (const z of [0, W]) hw.push({ kind: "tee-screws", at: v3(p.at, base + H / 2, z), level: li, mark: `L${li + 1}`, qty: 2 * screws });
    for (const p of zs) {
      for (const x of [0, L]) hw.push({ kind: "tee-screws", at: v3(x, base + H / 2, p.at), level: li, mark: `L${li + 1}`, qty: 2 * screws });
      for (const q of xs) {
        add("tee");
        hw.push({ kind: "tee-screws", at: v3(q.at, base + H / 2, p.at), level: li, mark: `L${li + 1}`, qty: 2 * screws });
      }
    }

    for (const plan of wallPlans(input, li, base)) {
      const side = level.sides[plan.side];
      const ops = sideOpenings(side, plan.length, H, input, profile);
      const world = (x: number, y: number) => {
        const f = plan.placement;
        return v3(f.origin.x + f.ex.x * x, f.origin.y + y, f.origin.z + f.ex.z * x);
      };
      if (side.type === "wall") for (const o of ops) add(`opening-${openingClass(o)}` as NodeType);
      // Anchors along the bottom plate (cut at doors and gates) — ground level only
      if (li === 0) {
        let from = 0;
        const runs: [number, number][] = [];
        for (const o of [...ops].filter((x) => x.kind !== "window").sort((a, b) => a.x - b.x)) {
          runs.push([from, o.x]);
          from = o.x + o.width;
        }
        runs.push([from, plan.length]);
        for (const [a, b] of runs)
          for (const x of anchorStations(a, b)) {
            hw.push({ kind: "anchor", at: world(x, 0), level: 0, mark: plan.mark, qty: 1 });
            add("base-anchor");
          }
      }
      if (side.type !== "wall") continue;
      // Hold-downs at the panel ends and beside openings ≥ 1200 mm (shear wall chords)
      const chords = [t + 20, plan.length - t - 20];
      for (const o of ops) if (o.width > 1200) chords.push(o.x - jambZone(o, profile) - 20, o.x + o.width + jambZone(o, profile) + 20);
      for (const x of chords) {
        hw.push({ kind: "hold-down", at: world(x, 0), normal: plan.outward, level: li, mark: plan.mark, qty: 1 });
        add("hold-down");
      }
      // Strap X-bracing in the first solid bay ≥ 600 mm from each end
      const solid = (a: number, b: number) => !ops.some((o) => o.x < b && o.x + o.width > a);
      const bay = Math.min(input.studSpacing * 2, 1800);
      for (const [a, b] of [
        [d, d + bay],
        [plan.length - d - bay, plan.length - d],
      ] as [number, number][]) {
        if (b - a < 600 || !solid(a - jambZoneMax(ops, profile), b + jambZoneMax(ops, profile))) continue;
        const diag = Math.hypot(b - a, H) / 1000;
        hw.push({ kind: "strap", at: world(a, 0), to: world(b, H), normal: plan.outward, level: li, mark: plan.mark, qty: diag });
        hw.push({ kind: "strap", at: world(a, H), to: world(b, 0), normal: plan.outward, level: li, mark: plan.mark, qty: diag });
        add("strap-brace");
      }
    }
  });

  // Partition anchors on the ground level
  for (const a of assemblies.filter((x) => x.mark.startsWith("P1."))) {
    for (const x of anchorStations(0, a.size.width)) {
      const f = a.placement;
      hw.push({ kind: "anchor", at: v3(f.origin.x + f.ex.x * x, f.origin.y, f.origin.z + f.ex.z * x), level: 0, mark: a.mark, qty: 1 });
      add("base-anchor");
    }
  }

  // Trusses: a clip at each bearing; heels and ridges
  const roofBase = levels.length ? levels[levels.length - 1]!.base + levels[levels.length - 1]!.height : 0;
  for (const x of trussPositions)
    for (const z of [d / 2, W - d / 2]) hw.push({ kind: "truss-clip", at: v3(x, roofBase, z), level: input.levels.length, mark: "T1", qty: 1 });
  add("truss-heel", 2 * trussPositions.length);
  if (input.roof.type === "gable") add("truss-ridge", trussPositions.length);
  const floors = (groundFloor ? 1 : 0) + Math.max(0, input.levels.length - 1);
  for (let k = 0; k < floors; k++) {
    const fd = floorTrussDepth(W);
    const y = groundFloor ? (k === 0 ? input.foundation.plinth : bases[k]! - fd) : bases[k + 1]! - fd;
    for (const x of floorPositions) for (const z of [d / 2, W - d / 2]) hw.push({ kind: "floor-clip", at: v3(x, y, z), level: Math.max(0, k - (groundFloor ? 0 : -1)), mark: "FT", qty: 1 });
    add("floor-bearing", 2 * floorPositions.length);
  }
  return { hardware: hw, nodes: [...nodes].filter(([, n]) => n > 0).map(([type, count]) => ({ type, count })) };
}

function jambZoneMax(ops: Opening[], p: ProfileSpec): number {
  return Math.max(0, ...ops.map((o) => jambZone(o, p))) + 41;
}
