import type { Assembly } from "../assemblies/types";
import { frame } from "../geometry/frame";
import { v3 } from "../geometry/vec";
import { centrelineLength } from "../members/member";
import { connectionHoles } from "../members/punching";
import type { Member } from "../members/types";
import { findProfile } from "../profiles/catalog";
import type { ProfileSpec } from "../profiles/types";
import { fabricateTruss } from "../trusses/fabricate";
import { generateTruss } from "../trusses/generate";
import type { TrussModel } from "../trusses/types";
import { SWAGE_LENGTH, generateWall } from "../walls/generate";
import type { BuildingInput, WallSide } from "./types";

/**
 * Model coordinates (mm): x along the ridge, z across (truss span), y up,
 * origin at the outer corner of the front-left wall on the floor.
 */

export interface Building {
  input: BuildingInput;
  assemblies: Assembly[];
  truss: TrussModel;
  trussPositions: number[];
  /** Underside of the roof sheeting at the eaves / ridge, mm */
  eaveHeight: number;
  ridgeHeight: number;
}

export interface WallPlan {
  side: WallSide;
  mark: string;
  length: number;
}

const depthOf = (p: ProfileSpec) => (p.family === "Hat" ? p.depth : p.web);

/** First/last truss plane from the outer face of the end walls, mm */
export const TRUSS_EDGE = 50;

/** Clear lengths of the four walls — the UI needs them to place openings */
export function wallPlans(input: Pick<BuildingInput, "length" | "width" | "profileId">): WallPlan[] {
  const d = depthOf(findProfile(input.profileId));
  return [
    { side: "front", mark: "W1", length: input.length },
    { side: "back", mark: "W2", length: input.length },
    { side: "left", mark: "W3", length: input.width - 2 * d },
    { side: "right", mark: "W4", length: input.width - 2 * d },
  ];
}

export function validateBuilding(input: BuildingInput): string[] {
  const e: string[] = [];
  if (!(input.length >= 1500 && input.length <= 30000)) e.push("Длина здания — от 1,5 до 30 м");
  if (!(input.width >= 1500 && input.width <= 15000)) e.push("Ширина (пролёт ферм) — от 1,5 до 15 м");
  if (!(input.trussSpacing >= 300 && input.trussSpacing <= 1500)) e.push("Шаг ферм — от 300 до 1500 мм");
  if (input.kind === "carport" && !(input.postSpacing >= 1000 && input.postSpacing <= 6000)) e.push("Шаг стоек навеса — от 1 до 6 м");
  return e;
}

/** Evenly spaced stations from `edge` to `length − edge`, no wider than `max` */
export function evenStations(length: number, max: number, edge: number): number[] {
  const span = length - 2 * edge;
  const bays = Math.max(1, Math.ceil(span / max - 1e-9));
  return Array.from({ length: bays + 1 }, (_, i) => edge + (span * i) / bays);
}

export function generateBuilding(input: BuildingInput): Building {
  const errors = validateBuilding(input);
  if (errors.length) throw new Error(errors.join("; "));
  const profile = findProfile(input.profileId);
  const d = depthOf(profile);
  const t = profile.thickness;
  const { length: L, width: W, wallHeight: H } = input;
  const assemblies: Assembly[] = [];

  if (input.kind === "enclosed") {
    const plans = wallPlans(input);
    const placement: Record<WallSide, ReturnType<typeof frame>> = {
      front: frame(v3(0, 0, d / 2), v3(1, 0, 0), v3(0, 1, 0)),
      back: frame(v3(L, 0, W - d / 2), v3(-1, 0, 0), v3(0, 1, 0)),
      left: frame(v3(d / 2, 0, W - d), v3(0, 0, -1), v3(0, 1, 0)),
      right: frame(v3(L - d / 2, 0, d), v3(0, 0, 1), v3(0, 1, 0)),
    };
    const outward: Record<WallSide, ReturnType<typeof v3>> = {
      front: v3(0, 0, -1),
      back: v3(0, 0, 1),
      left: v3(-1, 0, 0),
      right: v3(1, 0, 0),
    };
    for (const plan of plans) {
      let members: Member[];
      try {
        members = generateWall(
          { length: plan.length, height: H, studSpacing: input.studSpacing, profile, openings: input.openings[plan.side], noggings: true },
          plan.mark,
        );
      } catch (err) {
        throw new Error(`Стена ${plan.mark}: ${err instanceof Error ? err.message : String(err)}`);
      }
      assemblies.push({
        id: plan.mark,
        mark: plan.mark,
        kind: "wall",
        name: `Стена ${plan.mark}`,
        members,
        placement: placement[plan.side],
        size: { width: plan.length, height: H },
        explode: outward[plan.side],
        layer: 0,
      });
    }
  } else {
    // Carport: a post-and-beam frame along each long side
    const posts = evenStations(L, input.postSpacing, t);
    for (const [side, z, dir] of [
      ["front", d / 2, -1],
      ["back", W - d / 2, 1],
    ] as const) {
      const mark = side === "front" ? "F1" : "F2";
      assemblies.push({
        id: mark,
        mark,
        kind: "frame",
        name: `Рама ${mark}`,
        members: postAndBeam(L, H, posts, profile, mark),
        placement: frame(v3(0, 0, z), v3(1, 0, 0), v3(0, 1, 0)),
        size: { width: L, height: H },
        explode: v3(0, 0, dir),
        layer: 0,
      });
    }
  }

  // Roof trusses bearing on the top plates / eave beams
  const truss = generateTruss({
    span: W,
    shape: { kind: "triangular", pitchDeg: input.pitchDeg },
    pattern: input.trussPattern,
    panels: input.trussPanels,
    overhang: input.overhang,
    chordProfile: profile,
    webProfile: profile,
    maxPieceLength: 12000,
  });
  const { members: trussMembers } = fabricateTruss(truss, { idPrefix: "T1" });
  const trussPositions = evenStations(L, input.trussSpacing, TRUSS_EDGE);
  // Bottom chord web is centred on its member line: lift it by half the web so it sits on the plate
  const base = H + d / 2;
  trussPositions.forEach((x, i) => {
    assemblies.push({
      id: `T1#${i + 1}`,
      mark: "T1",
      kind: "truss",
      name: `Ферма T1 (${i + 1} из ${trussPositions.length})`,
      members: trussMembers.map((m) => ({ ...m, id: `${m.id}#${i + 1}` })),
      placement: frame(v3(x, base, 0), v3(0, 0, 1), v3(0, 1, 0)),
      size: { width: W, height: truss.height },
      explode: v3(0, 1, 0),
      layer: 1,
    });
  });

  return {
    input,
    assemblies,
    truss,
    trussPositions,
    eaveHeight: base,
    ridgeHeight: base + truss.height + d / 2,
  };
}

/** Back-to-back double C89 posts under a continuous eave beam */
function postAndBeam(L: number, H: number, posts: number[], profile: ProfileSpec, mark: string): Member[] {
  const t = profile.thickness;
  const members: Member[] = [];
  const beamStart = v3(0, H - t / 2, 0);
  const beamEnd = v3(L, H - t / 2, 0);
  members.push({
    id: `${mark}-1`,
    role: "beam",
    profile,
    start: beamStart,
    end: beamEnd,
    webAxis: v3(0, 0, 1),
    flipped: true,
    features: connectionHoles(L, posts),
  });
  let n = 1;
  for (const x of posts) {
    for (const flipped of [false, true]) {
      const px = flipped ? x + t / 2 : x - t / 2;
      const start = v3(Math.min(Math.max(px, t / 2), L - t / 2), 0, 0);
      const end = v3(start.x, H - t, 0);
      const length = centrelineLength({ start, end });
      members.push({
        id: `${mark}-${++n}`,
        role: "post",
        profile,
        start,
        end,
        webAxis: v3(0, 0, 1),
        flipped,
        features: [
          ...connectionHoles(length, [length]),
          { kind: "bolt-hole", position: 60, offset: 0, diameter: 14 },
          { kind: "swage", position: length - SWAGE_LENGTH, length: SWAGE_LENGTH },
        ],
      });
    }
  }
  return members;
}
