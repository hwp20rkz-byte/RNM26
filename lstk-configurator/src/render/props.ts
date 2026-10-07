import * as THREE from "three";
import type { Building } from "@/domain/buildings/generate";
import type { RoomPurpose } from "@/domain/buildings/types";
import type { PropKind } from "@/domain/catalog/products";
import { rooms, type Room } from "@/domain/layout/rooms";
import { coopPlan } from "@/domain/livestock/coop";
import { hsl } from "./skin";
import { MM } from "./profileGeometry";

/**
 * Low-poly scenery that explains the building's purpose and scale: a car
 * under the carport, a table under the gazebo, a stove in the steam room,
 * nest boxes in the coop. Built from boxes and cylinders — no external models.
 */

const mats = new Map<string, THREE.MeshStandardMaterial>();
function mat(color: string, rough = 0.7, metal = 0): THREE.MeshStandardMaterial {
  const k = `${color}|${rough}|${metal}`;
  let m = mats.get(k);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: hsl(color), roughness: rough, metalness: metal });
    mats.set(k, m);
  }
  return m;
}

const WOOD = "hsl(28 45% 42%)";
const DARK = "hsl(210 8% 18%)";
const BRICK = "hsl(10 45% 40%)";

function box(g: THREE.Group, x: number, y: number, z: number, sx: number, sy: number, sz: number, m: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx * MM, sy * MM, sz * MM), m);
  mesh.position.set((x + sx / 2) * MM, (y + sy / 2) * MM, (z + sz / 2) * MM);
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.userData.ownsGeometry = true;
  g.add(mesh);
  return mesh;
}

function cyl(g: THREE.Group, x: number, y: number, z: number, r: number, h: number, m: THREE.Material, axis: "x" | "y" | "z" = "y") {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r * MM, r * MM, h * MM, 16), m);
  if (axis === "x") mesh.rotation.z = Math.PI / 2;
  if (axis === "z") mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x * MM, y * MM, z * MM);
  mesh.castShadow = true;
  mesh.userData.ownsGeometry = true;
  g.add(mesh);
  return mesh;
}

/** A hatchback, 4.3 × 1.8 m, centred at (cx, cz) on floor y, along x or z */
function car(g: THREE.Group, cx: number, y: number, cz: number, alongX: boolean, color: string) {
  const c = new THREE.Group();
  const body = mat(color, 0.25, 0.6);
  box(c, -2150, 300, -880, 4300, 650, 1760, body);
  box(c, -1300, 950, -800, 2400, 520, 1600, mat("hsl(205 30% 22%)", 0.1, 0.8));
  box(c, -1250, 1460, -760, 2300, 30, 1520, body);
  for (const [x, z] of [[-1400, -820], [1400, -820], [-1400, 820], [1400, 820]] as const) cyl(c, x, 320, z, 320, 220, mat(DARK, 0.9), "z");
  box(c, 2140, 600, -700, 20, 120, 300, mat("hsl(50 80% 80%)", 0.2)).position.z += 0;
  box(c, 2140, 600, 400, 20, 120, 300, mat("hsl(50 80% 80%)", 0.2));
  if (!alongX) c.rotation.y = Math.PI / 2;
  c.position.set(cx * MM, y * MM, cz * MM);
  g.add(c);
}

function table(g: THREE.Group, cx: number, y: number, cz: number, len: number, alongX: boolean, benches: boolean) {
  const t = new THREE.Group();
  const w = mat(WOOD);
  box(t, -len / 2, 720, -400, len, 40, 800, w);
  for (const sx of [-1, 1]) box(t, sx * (len / 2 - 150) - 40, 0, -300, 80, 720, 600, w);
  if (benches)
    for (const sz of [-1, 1]) {
      box(t, -len / 2, 420, sz * 700 - 160, len, 35, 320, w);
      for (const sx of [-1, 1]) box(t, sx * (len / 2 - 200) - 30, 0, sz * 700 - 120, 60, 420, 240, w);
    }
  if (!alongX) t.rotation.y = Math.PI / 2;
  t.position.set(cx * MM, y * MM, cz * MM);
  g.add(t);
}

/** Chimney from (x, y, z) up through the roof to `top`; hidden with the roof in the plan cut */
function chimney(g: THREE.Group, x: number, y: number, z: number, top: number) {
  const c = new THREE.Group();
  cyl(c, x, (y + top) / 2, z, 75, top - y, mat("hsl(0 0% 75%)", 0.3, 0.8));
  cyl(c, x, top + 60, z, 110, 120, mat("hsl(0 0% 70%)", 0.3, 0.8));
  c.userData.level = Number.MAX_SAFE_INTEGER;
  g.add(c);
}

const findRoom = (rs: Room[], purposes: RoomPurpose[], level: Record<string, RoomPurpose>) => rs.find((r) => purposes.includes(level[r.key] ?? "living"));

export function createProps(b: Building, kinds: readonly PropKind[], birds: number): THREE.Group {
  const g = new THREE.Group();
  g.name = "props";
  const { input, depth: d } = b;
  const { length: L, width: W } = input;
  const l0 = input.levels[0]!;
  const floor = b.levels[0]!.base;
  const rs = rooms(l0, b.levels[0]!.inner, d);
  const ridgeTop = b.ridgeHeight + 700;
  const roofAt = (z: number) => b.roofBase + (input.roof.type === "mono" ? input.roof.heelHeight + Math.tan((input.roof.pitchDeg * Math.PI) / 180) * z : Math.tan((input.roof.pitchDeg * Math.PI) / 180) * Math.min(z, W - z));
  const gatesFront = l0.sides.front.openings.some((o) => o.kind === "gate");
  const alongX = !gatesFront && L >= W;

  for (const k of kinds) {
    switch (k) {
      case "car": {
        const cars = input.productId.endsWith("2") ? 2 : 1;
        for (let i = 0; i < cars; i++) {
          const off = cars === 1 ? 0 : (i - 0.5) * (alongX ? W : L) * 0.5;
          const cx = alongX ? L / 2 + (input.productId.startsWith("garage") ? -500 : 0) : L / 2 + off;
          const cz = alongX ? W / 2 + off : W / 2;
          car(g, cx, floor, cz, alongX, i ? "hsl(0 0% 92%)" : "hsl(212 70% 38%)");
        }
        break;
      }
      case "table":
        table(g, L / 2, floor, W / 2, Math.min(2400, L - 1600), L >= W, kinds.includes("benches"));
        break;
      case "grill": {
        const w = mat(DARK, 0.6, 0.5);
        box(g, L / 2 - 500, floor + 750, W - d - 650, 1000, 180, 350, w);
        for (const sx of [0, 1]) for (const sz of [0, 1]) box(g, L / 2 - 480 + sx * 940, floor, W - d - 640 + sz * 310, 20, 750, 20, w);
        box(g, L / 2 - 500, floor + 930, W - d - 650, 1000, 10, 350, mat("hsl(18 90% 50%)", 0.4));
        break;
      }
      case "bbq": {
        // Brick oven with a hood against the back wall, chimney through the roof
        const x = L - d - 1900;
        const z = W - d - 900;
        box(g, x, floor, z, 1800, 850, 800, mat(BRICK, 0.9));
        box(g, x + 100, floor + 850, z + 50, 1600, 40, 700, mat("hsl(30 10% 60%)", 0.5));
        box(g, x + 200, floor + 1700, z, 1400, 600, 800, mat(BRICK, 0.9));
        chimney(g, x + 900, floor + 2300, z + 400, roofAt(z + 400) + 900);
        break;
      }
      case "stove": {
        const r = findRoom(rs, ["steam"], l0.rooms) ?? rs[0]!;
        const x = r.x0 + 150;
        const z = r.z0 + 150;
        box(g, x, floor, z, 550, 800, 700, mat(DARK, 0.5, 0.6));
        box(g, x + 25, floor + 800, z + 25, 500, 250, 650, mat("hsl(30 6% 55%)", 0.95));
        chimney(g, x + 275, floor + 1050, z + 350, Math.max(roofAt(z + 350) + 600, ridgeTop - 300));
        // Benches (полок) along the far wall
        box(g, r.x1 - 650, floor + 450, r.z0, 600, 40, r.z1 - r.z0, mat("hsl(40 50% 70%)"));
        box(g, r.x1 - 1150, floor + 900, r.z0, 500, 40, r.z1 - r.z0, mat("hsl(40 50% 70%)"));
        break;
      }
      case "benches":
        if (!kinds.includes("table")) {
          const r = findRoom(rs, ["rest"], l0.rooms);
          if (r) table(g, (r.x0 + r.x1) / 2, floor, (r.z0 + r.z1) / 2, Math.min(1600, r.x1 - r.x0 - 800), true, true);
        }
        break;
      case "kitchen": {
        const r = findRoom(rs, ["kitchen"], l0.rooms);
        if (!r) break;
        const len = Math.min(3000, r.x1 - r.x0 - 200);
        box(g, r.x0 + 100, floor, r.z1 - 620, len, 850, 600, mat("hsl(40 15% 90%)", 0.4));
        box(g, r.x0 + 100, floor + 850, r.z1 - 620, len, 40, 620, mat("hsl(210 6% 30%)", 0.3));
        box(g, r.x0 + 100, floor + 1450, r.z1 - 350, len, 700, 330, mat("hsl(40 15% 90%)", 0.4));
        break;
      }
      case "workbench": {
        const len = Math.min(2400, L - 2 * d - 400);
        box(g, L - d - len - 200, floor + 850, W - d - 750, len, 50, 700, mat(WOOD));
        for (const sx of [0, 1]) box(g, L - d - len - 180 + sx * (len - 80), floor, W - d - 720, 60, 850, 640, mat(DARK, 0.5, 0.5));
        box(g, L - d - len - 200, floor + 1300, W - d - 120, len, 900, 20, mat("hsl(30 30% 55%)"));
        break;
      }
      case "nests": {
        const r = findRoom(rs, ["poultry"], l0.rooms) ?? rs[rs.length - 1]!;
        const n = coopPlan(birds).nests;
        const per = Math.max(1, Math.floor((r.x1 - r.x0 - 200) / 330));
        for (let i = 0; i < Math.min(n, per * 2); i++) {
          const row = Math.floor(i / per);
          const col = i % per;
          box(g, r.x0 + 100 + col * 330, floor + 500 + row * 360, r.z1 - 420, 300, 320, 400, mat("hsl(36 45% 55%)"));
          box(g, r.x0 + 100 + col * 330 + 60, floor + 560 + row * 360, r.z1 - 425, 180, 200, 5, mat(DARK, 0.9));
        }
        break;
      }
      case "perches": {
        const r = findRoom(rs, ["poultry"], l0.rooms) ?? rs[rs.length - 1]!;
        const runs = Math.max(1, Math.ceil(coopPlan(birds).perchM / ((r.x1 - r.x0 - 400) / 1000)));
        for (let i = 0; i < Math.min(runs, 5); i++) cyl(g, (r.x0 + r.x1) / 2, floor + 500 + i * 300, r.z0 + 300 + i * 350, 25, r.x1 - r.x0 - 400, mat(WOOD), "x");
        break;
      }
      case "run": {
        // Fenced run in front of the coop: 1 m² per bird, mesh on posts
        const area = coopPlan(birds).runM2 * 1e6;
        const depth = Math.min(8000, Math.max(1500, area / L));
        const post = mat("hsl(210 8% 60%)", 0.4, 0.6);
        const mesh = new THREE.MeshStandardMaterial({ color: hsl("hsl(210 8% 55%)"), transparent: true, opacity: 0.25, side: THREE.DoubleSide });
        mats.set("mesh", mesh);
        const h = 1800;
        for (const x of [0, L / 2, L]) box(g, x - 25, 0, -depth - 25, 50, h, 50, post);
        for (const z of [-depth / 2]) for (const x of [0, L]) box(g, x - 25, 0, z - 25, 50, h, 50, post);
        const front = box(g, 0, 0, -depth, L, h, 5, mesh);
        front.castShadow = false;
        for (const x of [0, L]) box(g, x, 0, -depth, 5, h, depth - 20, mesh).castShadow = false;
        break;
      }
      case "stair": {
        if (input.levels.length < 2) break;
        const rise = b.levels[1]!.base - floor;
        const steps = Math.ceil(rise / 180);
        const run = 260;
        const x0 = d + 200;
        const z0 = W - d - 1000;
        for (let i = 0; i < steps; i++) box(g, x0 + i * run, floor + i * (rise / steps), z0, run + 20, 40, 900, mat(WOOD));
        break;
      }
    }
  }
  g.userData.level = 0;
  return g;
}
