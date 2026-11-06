import * as THREE from "three";
import type { Building } from "@/domain/buildings/generate";
import { rooms, type Room } from "@/domain/layout/rooms";
import { themeOf } from "@/domain/interior/theme";
import { box, cyl, mat } from "./kit";
import { MM } from "./profileGeometry";
import { openingGaps, row, type Gap } from "./sport";

/**
 * Fit-out of the commercial pavilions and the guest house, by product and
 * room purpose: cars and chargers under the solar canopy, the coffee bar,
 * parcel racks and fitting booths of a pick-up point, wash bays with a
 * gantry of lances, pallet racks, gaming stations, a café corner in a
 * guest-house lobby. Low-poly boxes, sized in mm.
 */

const DARK = "hsl(210 8% 18%)";
const STEEL = "hsl(210 6% 34%)";
const OAK = "hsl(34 42% 58%)";
const WHITE = "hsl(40 14% 92%)";
const CARS = ["hsl(212 70% 38%)", "hsl(0 0% 92%)", "hsl(0 0% 14%)", "hsl(4 70% 42%)", "hsl(200 10% 62%)", "hsl(150 30% 30%)"];

/** A hatchback, 4.3 × 1.8 m, centred at (cx, cz) on floor y, along x or z */
export function car(g: THREE.Group, cx: number, y: number, cz: number, alongX: boolean, color: string) {
  const c = new THREE.Group();
  const body = mat(color, 0.25, 0.6);
  box(c, -2150, 300, -880, 4300, 650, 1760, body);
  box(c, -1300, 950, -800, 2400, 520, 1600, mat("hsl(205 30% 22%)", 0.1, 0.8));
  box(c, -1250, 1460, -760, 2300, 30, 1520, body);
  for (const [x, z] of [[-1400, -820], [1400, -820], [-1400, 820], [1400, 820]] as const) cyl(c, x, 320, z, 320, 220, mat(DARK, 0.9), "z");
  box(c, 2140, 600, -700, 20, 120, 300, mat("hsl(50 80% 80%)", 0.2));
  box(c, 2140, 600, 400, 20, 120, 300, mat("hsl(50 80% 80%)", 0.2));
  if (!alongX) c.rotation.y = Math.PI / 2;
  c.position.set(cx * MM, y * MM, cz * MM);
  g.add(c);
}

function glow(color: string, intensity = 0.7): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color, emissive: new THREE.Color(color), emissiveIntensity: intensity, roughness: 0.5 });
  m.userData.ownsMaterial = true;
  return m;
}

/** A charging pedestal 400 × 300 × 1700 with a lit screen and a holstered cable, its face to +z */
function charger(g: THREE.Group, x: number, y: number, z: number, accent: string, dc: boolean) {
  box(g, x - 200, y, z, 400, dc ? 1900 : 1500, 300, mat(dc ? DARK : WHITE, 0.4, 0.3));
  box(g, x - 150, y + (dc ? 1300 : 1000), z + 301, 300, 200, 4, glow(accent));
  box(g, x - 200, y + (dc ? 1800 : 1400), z + 301, 400, 60, 4, glow(accent, 1));
  cyl(g, x + 230, y + 900, z + 150, 30, 600, mat(DARK, 0.6));
}

/** Pallet rack bay 2700 × 1100 × 4000: uprights, beams on four levels, pallets with cartons */
function rack(u: THREE.Group, levels: number) {
  const blue = mat("hsl(214 70% 38%)", 0.5, 0.4);
  const orange = mat("hsl(24 90% 50%)", 0.5, 0.4);
  for (const x of [-1350, 1290]) for (const z of [0, 1040]) box(u, x, 0, z, 60, levels * 1000 + 200, 60, blue);
  for (let l = 0; l < levels; l++) {
    const y = 150 + l * 1000;
    for (const z of [0, 1040]) box(u, -1350, y, z, 2700, 100, 60, orange);
    for (const px of [-1250, 0]) {
      box(u, px, y + 100, 60, 1200, 140, 980, mat("hsl(34 40% 62%)", 0.9));
      box(u, px + 50, y + 240, 100, 1100, 550, 900, mat("hsl(30 35% 55%)", 0.95));
    }
  }
}

/** A gaming station: desk, two monitors, a gaming chair; its back to the wall */
function station(u: THREE.Group, i: number, accent: string) {
  box(u, -550, 720, 0, 1100, 30, 700, mat(DARK, 0.4));
  for (const sx of [-1, 1]) box(u, sx * 520 - 20, 0, 40, 40, 720, 620, mat(DARK, 0.4, 0.5));
  box(u, -480, 0, 100, 220, 450, 450, mat("hsl(230 8% 12%)", 0.4));
  box(u, -480, 300, 545, 220, 4, 4, glow(accent, 1));
  const screen = glow(i % 2 ? "hsl(200 70% 45%)" : "hsl(270 60% 50%)", 0.45);
  box(u, -420, 900, 120, 600, 340, 30, mat("hsl(230 8% 8%)", 0.3));
  box(u, -410, 910, 151, 580, 320, 2, screen);
  box(u, 200, 900, 120, 360, 240, 30, mat("hsl(230 8% 8%)", 0.3));
  // Chair
  const c = mat(i % 3 ? "hsl(230 8% 14%)" : accent, 0.7);
  box(u, -280, 420, 900, 560, 90, 520, c);
  box(u, -280, 500, 1380, 560, 820, 100, c);
  cyl(u, 0, 210, 1150, 40, 420, mat(STEEL, 0.3, 0.8));
}

/** A parcel cell rack 1200 × 400 × 2200 with numbered bins */
function parcels(u: THREE.Group, i: number) {
  box(u, -600, 0, 0, 1200, 2200, 400, mat("hsl(210 8% 70%)", 0.5, 0.5));
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 3; x++) box(u, -580 + x * 390, 60 + y * 430, 380, 370, 360, 30, mat((x + y + i) % 3 ? "hsl(30 40% 62%)" : "hsl(270 40% 55%)", 0.9));
}

function bar(g: THREE.Group, x: number, y: number, z: number, len: number, accent: string) {
  box(g, x, y, z, len, 1050, 600, mat(accent, 0.6));
  box(g, x - 30, y + 1050, z - 30, len + 60, 40, 660, mat(OAK, 0.45));
}

function stool(g: THREE.Group, x: number, y: number, z: number) {
  cyl(g, x, y + 375, z, 25, 750, mat(STEEL, 0.3, 0.8));
  cyl(g, x, y + 760, z, 190, 40, mat(OAK, 0.5));
}

function cafeTable(g: THREE.Group, x: number, y: number, z: number) {
  cyl(g, x, y + 360, z, 30, 720, mat(DARK, 0.4, 0.6));
  cyl(g, x, y + 740, z, 350, 30, mat(WHITE, 0.4));
  for (const a of [0, Math.PI]) {
    const cx = x + Math.cos(a) * 600;
    const cz = z + Math.sin(a) * 600;
    box(g, cx - 220, y + 450, cz - 220, 440, 40, 440, mat(OAK, 0.6));
    box(g, cx - 220, y, cz - 20, 40, 450, 40, mat(DARK, 0.5));
  }
}

function largest(rs: Room[], purposes: string[]): Room | undefined {
  return rs.filter((r) => purposes.includes(r.purpose)).sort((a, b) => b.area - a.area)[0];
}

function evhub(g: THREE.Group, b: Building, y: number, accent: string) {
  const { length: L, width: W } = b.input;
  // A bay per post spacing, cars nose-in towards the back row of posts with a charger each
  const n = Math.max(1, Math.round(L / b.input.postSpacing));
  const bw = L / n;
  for (let i = 0; i < n; i++) {
    const cx = (i + 0.5) * bw;
    car(g, cx, y, W / 2 + 200, false, CARS[i % CARS.length]!);
    charger(g, cx, y, W - 700, accent, i % 2 === 0);
    // Bay lines
    box(g, i * bw + 40, y + 2, 300, 100, 4, W - 600, mat("hsl(0 0% 96%)", 0.8));
  }
  box(g, L - 140, y + 2, 300, 100, 4, W - 600, mat("hsl(0 0% 96%)", 0.8));
  // Battery cabinet and the transformer box by the right end
  box(g, L + 600, y, W / 2 - 1100, 1200, 2200, 2200, mat(WHITE, 0.4, 0.2));
  box(g, L + 590, y + 1800, W / 2 - 1000, 10, 200, 2000, glow(accent));
}

function carwash(g: THREE.Group, b: Building, rs: Room[], y: number, accent: string) {
  const bays = rs.filter((r) => r.purpose === "garage").sort((a, b2) => a.x0 - b2.x0);
  bays.forEach((r, i) => {
    const cx = (r.x0 + r.x1) / 2;
    const cz = (r.z0 + r.z1) / 2;
    // Floor drain, a car in two of the bays, the boom with a lance and a coin terminal
    box(g, cx - 150, y + 1, r.z0 + 500, 300, 6, r.z1 - r.z0 - 1000, mat(STEEL, 0.4, 0.6));
    if (i % 2 === 0) car(g, cx, y, cz, false, CARS[i % CARS.length]!);
    const h = b.input.levels[0]!.height;
    cyl(g, r.x0 + 300, y + h - 400, cz, 40, r.x1 - r.x0 - 600, mat(STEEL, 0.3, 0.8), "x");
    cyl(g, cx, y + h - 1500, cz, 15, 2200, mat(DARK, 0.6));
    box(g, r.x1 - 700, y, r.z0 + 400, 500, 1600, 350, mat(accent, 0.4, 0.3));
    box(g, r.x1 - 650, y + 1100, r.z0 + 751, 400, 250, 4, glow("hsl(48 100% 55%)", 0.8));
  });
  const plant = largest(rs, ["technical"]);
  if (plant) {
    // Osmosis tanks and pumps
    for (let i = 0; i < 3; i++) cyl(g, plant.x0 + 600 + i * 800, y + 900, plant.z1 - 700, 300, 1800, mat("hsl(205 60% 45%)", 0.4));
    box(g, plant.x0 + 300, y, plant.z0 + 400, 1800, 1200, 700, mat(STEEL, 0.4, 0.5));
  }
}

function warehouse(g: THREE.Group, b: Building, rs: Room[], gs: Gap[], y: number) {
  const store = largest(rs, ["storage"]);
  if (!store) return;
  // Back-to-back rack rows across the store, aisles 3.2 m for a reach truck, clear of the dock gates
  const h = b.input.levels[0]!.height;
  const levels = Math.max(2, Math.floor((h - 600) / 1000));
  const rowsFrom = store.z0 + 4500;
  for (let x = store.x0 + 2000; x + 2700 < store.x1 - 1500; x += 2800) {
    for (const z of [rowsFrom, rowsFrom + 1100]) {
      if (z + 1100 > store.z1 - 300) continue;
      const u = new THREE.Group();
      rack(u, levels);
      u.position.set((x + 1350) * MM, y * MM, z * MM);
      g.add(u);
    }
  }
  // Packing tables along the front, clear of the gates
  row(g, store, "z0", gs, b.depth, y, 2200, (u) => {
    box(u, -1000, 850, 100, 2000, 40, 800, mat(OAK, 0.5));
    for (const sx of [-1, 1]) box(u, sx * 950 - 25, 0, 150, 50, 850, 700, mat(STEEL, 0.4, 0.6));
    box(u, -900, 890, 300, 500, 300, 400, mat("hsl(30 35% 55%)", 0.95));
  }, 4);
}

function esports(g: THREE.Group, b: Building, rs: Room[], gs: Gap[], y: number, accent: string) {
  const hall = largest(rs, ["rest", "open"]);
  if (hall) {
    // Stations along both long walls and an island of two back-to-back rows in the middle
    let n = row(g, hall, "z0", gs, b.depth, y, 1200, (u, i) => station(u, i, accent));
    n += row(g, hall, "z1", gs, b.depth, y, 1200, (u, i) => station(u, i + n, accent));
    const cz = (hall.z0 + hall.z1) / 2;
    for (let x = hall.x0 + 2000; x + 1200 < hall.x1 - 1600; x += 1200)
      for (const side of [-1, 1]) {
        const u = new THREE.Group();
        station(u, x / 1200 + side, accent);
        u.position.set((x + 600) * MM, y * MM, (cz + side * 50) * MM);
        u.rotation.y = side < 0 ? Math.PI : 0;
        g.add(u);
      }
    // LED strip along the ceiling
    box(g, hall.x0 + 200, y + b.input.levels[0]!.height - 120, cz - 30, hall.x1 - hall.x0 - 400, 30, 60, glow(accent, 1.2));
  }
  const lobby = largest(rs, ["lobby"]);
  if (lobby) {
    bar(g, lobby.x0 + 500, y, lobby.z1 - 1300, Math.min(3000, lobby.x1 - lobby.x0 - 1000), accent);
    for (let i = 0; i < 3; i++) stool(g, lobby.x0 + 1000 + i * 700, y, lobby.z1 - 1900);
  }
}

function pvz(g: THREE.Group, b: Building, rs: Room[], gs: Gap[], y: number, accent: string) {
  const store = largest(rs, ["storage"]);
  if (store) for (const s of ["z0", "z1", "x1"] as const) row(g, store, s, gs, b.depth, y, 1200, parcels);
  const hall = largest(rs, ["lobby"]);
  if (hall) {
    // Counter across the hall in front of the store door, two fitting booths with curtains on the left end
    bar(g, hall.x1 - 2800, y, (hall.z0 + hall.z1) / 2 - 300, 1800, accent);
    for (let i = 0; i < 2; i++) {
      const z = hall.z1 - 1300 - i * 1300;
      box(g, hall.x0 + 100, y, z, 1200, 2200, 40, mat(WHITE, 0.5));
      box(g, hall.x0 + 1260, y + 100, z, 30, 2000, 1200, mat(accent, 0.95));
      box(g, hall.x0 + 120, y + 300, z + 1150, 600, 1500, 20, mat("hsl(210 20% 86%)", 0.03, 1));
    }
  }
}

function coffee(g: THREE.Group, rs: Room[], y: number, accent: string) {
  const r = rs[0];
  if (!r) return;
  // Espresso machine and grinders on the counter by the serving window
  box(g, r.x0 + 400, y + 900, r.z0 + 150, 800, 450, 550, mat("hsl(0 0% 80%)", 0.2, 0.9));
  box(g, r.x0 + 1300, y + 900, r.z0 + 200, 250, 550, 300, mat(DARK, 0.3, 0.5));
  box(g, r.x0 + 1600, y + 900, r.z0 + 200, 250, 550, 300, mat(DARK, 0.3, 0.5));
  box(g, r.x0 + 200, y, r.z0 + 50, 2200, 900, 650, mat(accent, 0.6));
  box(g, r.x0 + 180, y + 900, r.z0 + 30, 2240, 40, 690, mat(OAK, 0.45));
  // Menu board over the window
  box(g, r.x0 + 300, y + 2350, r.z0 + 40, 2000, 350, 20, glow("hsl(36 60% 70%)", 0.35));
}

function guestLobby(g: THREE.Group, rs: Room[], y: number, accent: string) {
  const lobby = largest(rs, ["lobby"]);
  if (!lobby) return;
  // Reception bar by the entrance, café tables along the windows
  bar(g, lobby.x1 - 2400, y, lobby.z0 + 600, 1800, accent);
  for (let i = 0; i < 3; i++) cafeTable(g, lobby.x0 + 1200 + i * 1500, y, lobby.z1 - 2200);
}

export function commerceInterior(b: Building): THREE.Group {
  const g = new THREE.Group();
  g.name = "commerce";
  const id = b.input.productId;
  const y = b.levels[0]!.base;
  const rs = rooms(b.input.levels[0]!, b.levels[0]!.inner, b.depth);
  const gs = openingGaps(b);
  const accent = themeOf(id)?.accent2 ?? "hsl(24 80% 50%)";
  if (id === "evhub") evhub(g, b, y, accent);
  else if (id === "carwash") carwash(g, b, rs, y, accent);
  else if (id === "warehouse") warehouse(g, b, rs, gs, y);
  else if (id === "esports") esports(g, b, rs, gs, y, accent);
  else if (id === "pvz") pvz(g, b, rs, gs, y, accent);
  else if (id === "coffee") coffee(g, rs, y, accent);
  else if (id === "minsu") guestLobby(g, rs, y, "hsl(30 25% 40%)");
  else if (id === "officebox") {
    const r = rs[0];
    if (r) {
      box(g, r.x1 - 1700, y + 720, r.z1 - 800, 1500, 30, 700, mat(OAK, 0.5));
      for (const sx of [0, 1]) box(g, r.x1 - 1700 + sx * 1460, y, r.z1 - 780, 40, 720, 660, mat(STEEL, 0.4, 0.6));
      box(g, r.x0 + 200, y, r.z1 - 500, 900, 1900, 450, mat(WHITE, 0.4));
    }
  }
  g.userData.level = 0;
  return g;
}
