import * as THREE from "three";
import type { Building } from "@/domain/buildings/generate";
import type { RoomPurpose } from "@/domain/buildings/types";
import { finish, type FinishChoice } from "@/domain/finishes/catalog";
import { rooms, type Room } from "@/domain/layout/rooms";
import { hallFloor } from "@/domain/planner/analyze";
import { themeOf } from "@/domain/interior/theme";
import { MM } from "./profileGeometry";
import { hsl } from "./skin";
import { openingGaps, type Gap } from "./sport";

/**
 * The finished interior: every room lined on its four walls (gypsum board
 * painted, tiles in wet rooms) with the doors and windows cut out, a
 * suspended board ceiling on the bottom chords with the attic insulation
 * laid over it, and the floor finish of the room. Ceilings and insulation
 * hide in the floor-plan cut, so the plan still looks into the rooms.
 */

const WET: RoomPurpose[] = ["bathroom", "washing", "changing", "technical"];
const STEAM: RoomPurpose[] = ["steam"];
const UTILITY: RoomPurpose[] = ["garage", "workshop", "poultry"];

const mats = new Map<string, THREE.MeshStandardMaterial>();
function surface(id: string, color: string, rough = 0.85): THREE.MeshStandardMaterial {
  const k = `${id}|${color}`;
  let m = mats.get(k);
  if (!m) {
    const look = finish(id).look;
    m = new THREE.MeshStandardMaterial({ color: hsl(color), roughness: look === "tiles" ? 0.35 : rough, metalness: 0 });
    mats.set(k, m);
  }
  return m;
}

/** A lining sheet on one side of a room, holes where the openings are; local x along the side, y up */
function lining(len: number, height: number, holes: { lo: number; hi: number; sill: number; top: number }[], t: number, mat: THREE.Material): THREE.Mesh {
  const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(len * MM, 0), new THREE.Vector2(len * MM, height * MM), new THREE.Vector2(0, height * MM)]);
  for (const h of holes) {
    const x0 = Math.max(1, h.lo);
    const x1 = Math.min(len - 1, h.hi);
    if (x1 - x0 < 50) continue;
    const p = new THREE.Path();
    p.moveTo(x0 * MM, Math.max(1, h.sill) * MM);
    p.lineTo(x1 * MM, Math.max(1, h.sill) * MM);
    p.lineTo(x1 * MM, Math.min(height - 1, h.top) * MM);
    p.lineTo(x0 * MM, Math.min(height - 1, h.top) * MM);
    p.closePath();
    shape.holes.push(p);
  }
  const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: t * MM, bevelEnabled: false }), mat);
  mesh.userData.ownsGeometry = true;
  mesh.receiveShadow = true;
  return mesh;
}

function slab(x0: number, y: number, z0: number, w: number, t: number, h: number, mat: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w * MM, t * MM, h * MM), mat);
  mesh.position.set((x0 + w / 2) * MM, (y + t / 2) * MM, (z0 + h / 2) * MM);
  mesh.userData.ownsGeometry = true;
  mesh.receiveShadow = true;
  return mesh;
}

function wallsOf(g: THREE.Group, r: Room, gs: Gap[], d: number, base: number, H: number, mat: THREE.Material) {
  const t = 13;
  const sides = [
    { axis: "z" as const, at: r.z0, from: r.x0, to: r.x1, inward: 1 },
    { axis: "z" as const, at: r.z1, from: r.x0, to: r.x1, inward: -1 },
    { axis: "x" as const, at: r.x0, from: r.z0, to: r.z1, inward: 1 },
    { axis: "x" as const, at: r.x1, from: r.z0, to: r.z1, inward: -1 },
  ];
  for (const s of sides) {
    const holes = gs.filter((o) => o.axis === s.axis && Math.abs(o.at - s.at) <= d && o.hi > s.from && o.lo < s.to).map((o) => ({ lo: o.lo - s.from, hi: o.hi - s.from, sill: o.sill, top: o.top }));
    const m = lining(s.to - s.from, H, holes, t, mat);
    // Local x along the side, y up, extrusion (+z local) into the room
    if (s.axis === "z") {
      m.position.set(s.from * MM, base * MM, (s.at + (s.inward > 0 ? 0 : -t)) * MM);
    } else {
      // Turned so local x runs along +z; the extrusion then points to −x
      m.rotation.y = -Math.PI / 2;
      m.position.set((s.at + (s.inward > 0 ? t : 0)) * MM, base * MM, s.from * MM);
    }
    g.add(m);
  }
}

export function createInterior(b: Building, f: FinishChoice, atticInsulation: number): THREE.Group {
  const root = new THREE.Group();
  root.name = "interior";
  const { input, depth: d } = b;
  const enclosed = (["front", "back", "left", "right"] as const).every((s) => input.levels[0]!.sides[s].type === "wall");
  if (!enclosed) return root;
  // Unheated sheds and garages get their floors, but no lining or ceiling
  const finished = input.heating !== "none";
  const wool = new THREE.MeshStandardMaterial({ color: hsl("hsl(45 70% 62%)"), roughness: 1 });
  const theme = themeOf(input.productId);
  const ceilingMat = surface(f.interior, finish(f.interior).color, 0.9);
  input.levels.forEach((level, li) => {
    const info = b.levels[li]!;
    const H = level.height;
    const gs = openingGaps(b, li);
    const walls = new THREE.Group();
    const lids = new THREE.Group();
    for (const r of rooms(level, info.inner, d)) {
      const p = r.purpose;
      const wallId = STEAM.includes(p) ? f.steam : WET.includes(p) ? f.wet : UTILITY.includes(p) ? "osbOpen" : f.interior;
      // A club's theme tints the painted walls and the wet-room tiles
      const tint = theme && wallId === f.interior ? theme.wall : theme && wallId === f.wet ? theme.tile : finish(wallId).color;
      if (finished) wallsOf(walls, r, gs, d, info.base, H, surface(wallId, tint));
      // Floor finish of the room
      const floorId = p === "gym" ? hallFloor(input.productId) : WET.includes(p) ? "tile" : STEAM.includes(p) ? "deck" : UTILITY.includes(p) ? (input.foundation.type === "slab" ? "concrete" : "deck") : f.floor;
      const fl = slab(r.x0, info.base + 2, r.z0, r.x1 - r.x0, 16, r.z1 - r.z0, surface(floorId, finish(floorId).color, 0.6));
      fl.userData.roomKey = `${li}:${r.key}`;
      walls.add(fl);
      // Board ceiling on the bottom chords; the top floor gets the attic insulation over it
      if (finished) lids.add(slab(r.x0, info.base + H - 13, r.z0, r.x1 - r.x0, 13, r.z1 - r.z0, ceilingMat));
      if (finished && li === input.levels.length - 1 && atticInsulation > 0) {
        const ins = slab(r.x0, info.base + H, r.z0, r.x1 - r.x0, atticInsulation, r.z1 - r.z0, wool);
        ins.castShadow = false;
        lids.add(ins);
      }
    }
    walls.userData.level = li;
    // Ceilings go with the storey above in the plan cut, so the plan looks into the rooms
    lids.userData.level = li + 0.5;
    root.add(walls, lids);
  });
  wool.userData.ownsMaterial = true;
  return root;
}
