import type { Opening } from "../walls/types";
import { WALL_SIDES, type Level, type RoomPurpose, type SideConfig, type WallSide } from "./types";

/**
 * A new upper storey derived from the one below, the way an architect starts
 * it: windows on the same axes as the openings below (facade rhythm, the
 * jambs and lintels stack and carry straight down), doors and gates become
 * windows, partitions and wet rooms stack over the ones below (shared risers),
 * living rooms become bedrooms, the room over the stair a hall.
 */
const UPPER: Partial<Record<RoomPurpose, RoomPurpose>> = {
  living: "bedroom",
  kitchen: "bedroom",
  rest: "bedroom",
  hall: "hall",
  bathroom: "bathroom",
  washing: "bathroom",
  steam: "storage",
  storage: "storage",
  technical: "storage",
  garage: "storage",
  workshop: "storage",
  poultry: "storage",
  open: "bedroom",
};

let seq = 0;
const id = () => `u${Date.now().toString(36)}${(seq++).toString(36)}`;

function upperOpenings(below: Opening[], height: number): Opening[] {
  const out: Opening[] = [];
  for (const o of below) {
    const width = o.kind === "window" ? o.width : Math.min(Math.max(o.width, 900), 1500);
    const x = o.x + (o.width - width) / 2;
    const h = Math.min(o.kind === "window" ? o.height : 1400, height - 900 - 400);
    if (h < 600) continue;
    out.push({ id: id(), kind: "window", x, width, height: h, sill: 900 });
  }
  return out;
}

export function upperLevel(below: Level, height = Math.min(below.height, 2700)): Level {
  const sides = Object.fromEntries(
    WALL_SIDES.map((s): [WallSide, SideConfig] => [s, { type: "wall", openings: below.sides[s].type === "wall" ? upperOpenings(below.sides[s].openings, height) : [] }]),
  ) as Record<WallSide, SideConfig>;
  const partitions = below.partitions.map((p) => ({ ...p, id: id(), doors: p.doors.map((d) => ({ ...d, id: id() })) }));
  const rooms: Record<string, RoomPurpose> = {};
  for (const [k, v] of Object.entries(below.rooms)) rooms[k] = UPPER[v] ?? "bedroom";
  // The stair rises from the first room (see render/props): a hall above it
  rooms["0-0"] = rooms["0-0"] === "bathroom" ? "bathroom" : "hall";
  return { height, sides, partitions, rooms };
}
