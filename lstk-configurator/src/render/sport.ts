import * as THREE from "three";
import { sideOpenings, wallPlans, type Building } from "@/domain/buildings/generate";
import { openingTop } from "@/domain/walls/generate";
import { partitionSegments, rooms, type Room } from "@/domain/layout/rooms";
import { box, cyl, mat } from "./kit";
import { MM } from "./profileGeometry";
import { lockersPerRoom } from "@/domain/interior/fitout";
import { themeOf } from "@/domain/interior/theme";

/**
 * Sports interiors and equipment, from the room purposes: the mat hall of a
 * BJJ club (tatami with two 8 × 8 m competition areas and wall padding), a
 * gym's cardio line, racks and dumbbells, yoga mats, ITTF tables with
 * barriers, a functional-training rig; lockers and benches in the changing
 * rooms, a reception desk and sofa in the lobby, a desk in the office,
 * shelving in the stores. Kept off the doors. Low-poly, sized in mm.
 */

/** A blocked stretch of wall: the fixed coordinate of the wall line and the range along it */
export interface Gap {
  /** "x" — the wall runs along z at x = at; "z" — along x at z = at */
  axis: "x" | "z";
  at: number;
  lo: number;
  hi: number;
  /** Bottom and top of the opening above the floor, mm (a window above the furniture does not block it) */
  sill: number;
  top: number;
}

/** Openings of a level as stretches of wall lines: outer windows/doors/gates and partition doors */
export function openingGaps(b: Building, li = 0): Gap[] {
  const { length: L, width: W } = b.input;
  const d = b.depth;
  const lv = b.input.levels[li]!;
  const out: Gap[] = [];
  for (const plan of wallPlans(b.input, li, b.levels[li]!.base)) {
    if (lv.sides[plan.side].type !== "wall") continue;
    for (const o of sideOpenings(lv.sides[plan.side], plan.length, lv.height, b.input, b.profile)) {
      const a0 = o.x;
      const a1 = o.x + o.width;
      const v = { sill: o.sill, top: openingTop(o) };
      if (plan.side === "front") out.push({ axis: "z", at: d / 2, lo: a0, hi: a1, ...v });
      else if (plan.side === "back") out.push({ axis: "z", at: W - d / 2, lo: L - a1, hi: L - a0, ...v });
      else if (plan.side === "left") out.push({ axis: "x", at: d / 2, lo: W - d - a1, hi: W - d - a0, ...v });
      else out.push({ axis: "x", at: L - d / 2, lo: d + a0, hi: d + a1, ...v });
    }
  }
  for (const s of partitionSegments(lv, b.levels[li]!.inner, d)) for (const o of s.doors) out.push({ axis: s.axis, at: s.at, lo: s.from + o.x, hi: s.from + o.x + o.width, sill: 0, top: o.height });
  return out;
}

export type Side = "x0" | "x1" | "z0" | "z1";

/** Free runs along one side of a room, clear of doors (and low windows) by 150 mm */
export function runs(r: Room, side: Side, gs: Gap[], d: number, under = 1900): [number, number][] {
  const axis = side[0] as "x" | "z";
  const at = r[side];
  const [lo, hi] = axis === "x" ? [r.z0, r.z1] : [r.x0, r.x1];
  const blocked = gs
    .filter((g) => g.axis === axis && Math.abs(g.at - at) <= d && g.sill < under && g.hi > lo && g.lo < hi)
    .map((g) => [g.lo - 150, g.hi + 150] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  let from = lo + 100;
  for (const [a, b] of blocked) {
    if (a - from >= 600) out.push([from, a]);
    from = Math.max(from, b);
  }
  if (hi - 100 - from >= 600) out.push([from, hi - 100]);
  return out;
}

/**
 * Place a row of `w`-wide units, `depth` deep, against a room side along the
 * free runs; `make` builds one unit at the origin facing +z (back to the wall
 * at z = 0) and the row turns it to face into the room.
 */
export function row(g: THREE.Group, r: Room, side: Side, gs: Gap[], d: number, floor: number, w: number, make: (u: THREE.Group, i: number) => void, max = Infinity, under?: number) {
  let n = 0;
  for (const [a, b] of runs(r, side, gs, d, under)) {
    const k = Math.floor((b - a) / w);
    for (let i = 0; i < k && n < max; i++, n++) {
      const u = new THREE.Group();
      make(u, n);
      const s = a + (b - a - k * w) / 2 + i * w + w / 2;
      // Into the room: the unit's +z
      if (side === "z0") u.position.set(s, floor, r.z0);
      else if (side === "z1") {
        u.position.set(s, floor, r.z1);
        u.rotation.y = Math.PI;
      } else if (side === "x0") {
        u.position.set(r.x0, floor, s);
        u.rotation.y = Math.PI / 2;
      } else {
        u.position.set(r.x1, floor, s);
        u.rotation.y = -Math.PI / 2;
      }
      u.position.multiplyScalar(0.001);
      g.add(u);
    }
  }
  return n;
}

const STEEL = "hsl(210 6% 32%)";
const CHROME = "hsl(210 8% 78%)";
const RUBBER = "hsl(210 6% 16%)";
const OAK = "hsl(34 42% 58%)";
const WHITE = "hsl(40 14% 92%)";

/** A locker column 400 × 500 × 1850 with two doors */
function locker(u: THREE.Group, i: number) {
  const body = mat(i % 2 ? "hsl(200 14% 74%)" : "hsl(200 14% 68%)", 0.5, 0.3);
  box(u, -195, 100, 0, 390, 1750, 490, body);
  box(u, -200, 0, 20, 400, 100, 460, mat(RUBBER));
  for (const y of [120, 1000]) {
    box(u, -185, y, 490, 370, 840, 8, mat("hsl(200 18% 62%)", 0.45, 0.3));
    box(u, 140, y + 380, 498, 20, 80, 10, mat(CHROME, 0.3, 0.9));
  }
}

function bench(g: THREE.Group, x: number, y: number, z: number, len: number, alongX: boolean) {
  const b = new THREE.Group();
  box(b, -len / 2, 420, -175, len, 40, 350, mat(OAK, 0.6));
  for (const s of [-1, 1]) box(b, s * (len / 2 - 120) - 20, 0, -150, 40, 420, 300, mat(STEEL, 0.4, 0.7));
  if (!alongX) b.rotation.y = Math.PI / 2;
  b.position.set(x * 0.001, y * 0.001, z * 0.001);
  g.add(b);
}

/** Tatami floor: the whole hall in 40 mm mats, two 8 × 8 m competition areas with a 1 m safety border */
function tatami(g: THREE.Group, r: Room, floor: number) {
  box(g, r.x0, floor, r.z0, r.x1 - r.x0, 40, r.z1 - r.z0, mat("hsl(214 52% 30%)", 0.85));
  const cz = (r.z0 + r.z1) / 2;
  const span = r.x1 - r.x0;
  const n = span >= 19000 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const cx = r.x0 + (span * (2 * i + 1)) / (2 * n);
    box(g, cx - 5000, floor + 1, cz - 5000, 10000, 40, 10000, mat("hsl(48 80% 52%)", 0.85));
    box(g, cx - 4000, floor + 2, cz - 4000, 8000, 40, 8000, mat("hsl(352 62% 42%)", 0.85));
  }
}

/** A band on the hall walls, off the doors: 50 mm padding (mat hall) or a painted dado */
function band(g: THREE.Group, r: Room, gs: Gap[], d: number, floor: number, height: number, thick: number, color: string) {
  const m = mat(color, thick > 10 ? 0.8 : 0.5);
  for (const side of ["x0", "x1", "z0", "z1"] as const)
    for (const [a, b] of runs(r, side, gs, d)) {
      if (side === "z0") box(g, a, floor, r.z0 + 13, b - a, height, thick, m);
      else if (side === "z1") box(g, a, floor, r.z1 - 13 - thick, b - a, height, thick, m);
      else if (side === "x0") box(g, r.x0 + 13, floor, a, thick, height, b - a, m);
      else box(g, r.x1 - 13 - thick, floor, a, thick, height, b - a, m);
    }
}

/** Entrance of a club: oak slat panels either side of the main door and a canopy over it */
function portal(g: THREE.Group, b: Building, gs: Gap[]) {
  const d = b.depth;
  const floor = b.levels[0]!.base;
  const front = gs.filter((x) => x.axis === "z" && x.at < d);
  const door = front.filter((x) => x.sill < 300).sort((p, q) => q.hi - q.lo - (p.hi - p.lo))[0];
  if (!door) return;
  const H = b.input.levels[0]!.height;
  const oak = mat("hsl(30 45% 46%)", 0.6);
  const left = Math.max(...front.filter((x) => x.hi <= door.lo).map((x) => x.hi), 0);
  const right = Math.min(...front.filter((x) => x.lo >= door.hi).map((x) => x.lo), b.input.length);
  const panels: [number, number][] = [
    [Math.max(left + 150, door.lo - 1200), door.lo - 50],
    [door.hi + 50, Math.min(right - 150, door.hi + 1200)],
  ];
  for (const [a, c] of panels) {
    if (c - a < 300) continue;
    box(g, a, floor, -120, c - a, H - 150, 20, mat("hsl(210 6% 18%)", 0.7));
    for (let x = a + 20; x < c - 40; x += 110) box(g, x, floor, -180, 50, H - 150, 60, oak);
  }
  // Canopy: graphite slab with an oak soffit, 1.5 m deep, wider than the door by 1.2 m each side
  const y = floor + door.top + 180;
  box(g, door.lo - 1200, y, -1560, door.hi - door.lo + 2400, 160, 1500, mat("hsl(210 6% 22%)", 0.5, 0.3));
  box(g, door.lo - 1150, y - 12, -1510, door.hi - door.lo + 2300, 12, 1400, oak);
}

function treadmill(u: THREE.Group) {
  box(u, -420, 0, 300, 840, 220, 1900, mat(RUBBER, 0.6));
  box(u, -360, 220, 360, 720, 15, 1500, mat("hsl(210 4% 10%)", 0.9));
  for (const s of [-1, 1]) box(u, s * 380 - 25, 220, 300, 50, 1150, 60, mat(STEEL, 0.4, 0.7));
  box(u, -380, 1370, 250, 760, 260, 160, mat(STEEL, 0.4, 0.7));
  box(u, -250, 1450, 410, 500, 160, 10, mat("hsl(200 60% 30%)", 0.2, 0.3));
}

function rack(u: THREE.Group) {
  const s = mat("hsl(0 0% 12%)", 0.5, 0.6);
  for (const x of [-560, 520]) for (const z of [200, 1300]) box(u, x, 0, z, 40, 2300, 40, s);
  for (const x of [-560, 520]) box(u, x, 2260, 200, 40, 40, 1140, s);
  box(u, -560, 2260, 200, 1120, 40, 40, s);
  box(u, -560, 2260, 1300, 1120, 40, 40, s);
  cyl(u, 0, 1400, 760, 14, 2200, mat(CHROME, 0.25, 0.9), "x");
  for (const x of [-900, 900]) cyl(u, x, 1400, 760, 225, 60, mat("hsl(0 70% 38%)", 0.6), "x");
  box(u, -300, 0, 400, 600, 450, 1200, mat(RUBBER, 0.7));
}

function dumbbells(u: THREE.Group) {
  box(u, -1100, 0, 100, 2200, 700, 500, mat(STEEL, 0.4, 0.7));
  for (let i = 0; i < 9; i++) for (const y of [720, 450]) cyl(u, -950 + i * 237, y, 350, 60 + i * 5, 280, mat(RUBBER, 0.5), "x");
  box(u, -1100, 0, 0, 2200, 2200, 20, mat("hsl(210 20% 86%)", 0.03, 1));
}

function yogaMat(g: THREE.Group, x: number, y: number, z: number, i: number) {
  const c = ["hsl(170 40% 46%)", "hsl(260 30% 58%)", "hsl(20 60% 60%)"][i % 3]!;
  box(g, x - 305, y, z - 915, 610, 6, 1830, mat(c, 0.9));
}

function pingPong(g: THREE.Group, cx: number, y: number, cz: number) {
  box(g, cx - 1370, y + 735, cz - 762, 2740, 25, 1525, mat("hsl(210 60% 30%)", 0.4));
  box(g, cx - 1370, y + 761, cz - 10, 2740, 1, 20, mat(WHITE));
  box(g, cx - 3, y + 760, cz - 900, 6, 152, 1800, mat("hsl(0 0% 96%)", 0.9));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, cx + sx * 1100 - 25, y, cz + sz * 600 - 25, 50, 735, 50, mat(STEEL, 0.4, 0.7));
}

function barrier(g: THREE.Group, x0: number, z0: number, x1: number, z1: number, y: number) {
  const m = mat("hsl(352 55% 38%)", 0.7);
  if (Math.abs(z1 - z0) < 1) box(g, Math.min(x0, x1), y, z0 - 10, Math.abs(x1 - x0), 750, 20, m);
  else box(g, x0 - 10, y, Math.min(z0, z1), 20, 750, Math.abs(z1 - z0), m);
}

function rig(g: THREE.Group, x0: number, x1: number, cz: number, y: number) {
  const s = mat("hsl(0 0% 10%)", 0.5, 0.6);
  for (let x = x0; x <= x1 + 1; x += 1800) for (const dz of [-600, 600]) box(g, x - 38, y, cz + dz - 38, 76, 3000, 76, s);
  box(g, x0 - 38, y + 2960, cz - 638, x1 - x0 + 76, 76, 76, s);
  box(g, x0 - 38, y + 2960, cz + 562, x1 - x0 + 76, 76, 76, s);
  for (let x = x0; x <= x1 + 1; x += 1800) cyl(g, x, y + 2900, cz, 16, 1200, mat(CHROME, 0.3, 0.9), "z");
  // climbing rope
  cyl(g, x0 + 900, y + 1500, cz, 19, 3000, mat("hsl(38 40% 60%)", 0.95));
}

function rower(g: THREE.Group, x: number, y: number, z: number) {
  box(g, x - 60, y, z - 1200, 120, 300, 2400, mat(RUBBER, 0.5, 0.3));
  cyl(g, x, y + 450, z - 1050, 260, 200, mat(STEEL, 0.4, 0.6), "x");
  box(g, x - 150, y + 300, z - 100, 300, 60, 380, mat(RUBBER, 0.8));
}

function desk(g: THREE.Group, x: number, y: number, z: number, w: number, deep: number, h = 750) {
  box(g, x, y + h - 30, z, w, 30, deep, mat(OAK, 0.55));
  for (const sx of [0, 1]) box(g, x + sx * (w - 40), y, z, 40, h - 30, deep, mat(WHITE, 0.6));
}

function sofa(g: THREE.Group, x: number, y: number, z: number, w: number) {
  const m = mat("hsl(28 14% 34%)", 0.95);
  box(g, x, y + 100, z, w, 320, 850, m);
  box(g, x, y + 100, z, w, 750, 200, m);
  for (const s of [0, 1]) box(g, x + s * (w - 200), y + 100, z, 200, 550, 850, m);
}

function plant(g: THREE.Group, x: number, y: number, z: number) {
  cyl(g, x, y + 200, z, 180, 400, mat("hsl(30 8% 22%)", 0.6));
  const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), mat("hsl(130 38% 32%)", 0.9));
  leaves.position.set(x * 0.001, (y + 950) * 0.001, z * 0.001);
  leaves.castShadow = true;
  leaves.userData.ownsGeometry = true;
  g.add(leaves);
}

function shelving(u: THREE.Group) {
  const s = mat("hsl(210 8% 60%)", 0.4, 0.7);
  for (const x of [-440, 420]) for (const z of [0, 480]) box(u, x, 0, z, 20, 2000, 20, s);
  for (const y of [100, 600, 1100, 1600]) box(u, -440, y, 0, 880, 20, 500, s);
  for (const y of [120, 620, 1120]) box(u, -380, y, 60, 300, 260, 380, mat("hsl(30 40% 55%)", 0.9));
}

function gymFloor(g: THREE.Group, r: Room, floor: number, color: string) {
  box(g, r.x0, floor, r.z0, r.x1 - r.x0, 12, r.z1 - r.z0, mat(color, 0.85));
}

function hall(g: THREE.Group, b: Building, r: Room, gs: Gap[], floor: number) {
  const d = b.depth;
  const id = b.input.productId;
  const w = r.x1 - r.x0;
  const h = r.z1 - r.z0;
  const cx = (r.x0 + r.x1) / 2;
  const cz = (r.z0 + r.z1) / 2;
  const f = floor + 15;
  const theme = themeOf(id);
  if (id === "bjj") {
    tatami(g, r, floor);
    band(g, r, gs, d, floor + 40, 1800, 50, theme?.accent ?? "hsl(214 40% 24%)");
    return;
  }
  // Painted dado in the brand colour, the light theme colour above it
  if (theme) band(g, r, gs, d, floor + 15, 1200, 6, theme.accent);
  if (id === "yoga") {
    gymFloor(g, r, floor, OAK);
    const cols = Math.max(1, Math.floor((w - 1200) / 1100));
    const rowsN = Math.max(1, Math.floor((h - 1200) / 2200));
    let i = 0;
    for (let a = 0; a < cols; a++) for (let c = 0; c < rowsN; c++) yogaMat(g, r.x0 + 600 + 550 + a * 1100, f, r.z0 + 600 + 1100 + c * 2200, i++);
    // mirror wall on the far end
    box(g, r.x1 - 30, floor + 300, r.z0 + 600, 20, 2000, h - 1200, mat("hsl(210 20% 86%)", 0.03, 1));
    return;
  }
  if (id === "tabletennis") {
    gymFloor(g, r, floor, "hsl(8 48% 34%)");
    // ITTF training courts 10 × 6 m (actually as many as fit), tables along x
    const nx = Math.max(1, Math.floor(w / 10000));
    const nz = Math.max(1, Math.floor(h / 6000));
    for (let a = 0; a < nx; a++)
      for (let c = 0; c < nz; c++) {
        const x0 = r.x0 + (w - nx * 10000) / 2 + a * 10000;
        const z0 = r.z0 + (h - nz * 6000) / 2 + c * 6000;
        pingPong(g, x0 + 5000, f, z0 + 3000);
        barrier(g, x0 + 300, z0 + 300, x0 + 9700, z0 + 300, f);
        barrier(g, x0 + 300, z0 + 5700, x0 + 9700, z0 + 5700, f);
      }
    return;
  }
  if (id === "crossfit") {
    gymFloor(g, r, floor, RUBBER);
    rig(g, r.x0 + 2500, Math.min(r.x1 - 2500, r.x0 + 2500 + 1800 * 5), cz, f);
    for (let i = 0; i < 6; i++) rower(g, r.x0 + 1500 + i * 900, f, r.z0 + 1800);
    // wall-ball targets at 3 m and plates
    for (let i = 0; i < 4; i++) cyl(g, r.x1 - 1000 - i * 1500, f + 3050, r.z1 - 30, 180, 30, mat("hsl(48 80% 50%)", 0.6), "z");
    for (let i = 0; i < 8; i++) cyl(g, r.x1 - 2000 - (i % 4) * 600, f + 225, r.z0 + 900 + Math.floor(i / 4) * 200, 225, 60, mat(RUBBER, 0.6), "z");
    return;
  }
  // Fitness: rubber floor, cardio line under the front windows, racks and dumbbells along the back
  gymFloor(g, r, floor, "hsl(210 6% 22%)");
  row(g, r, "z0", gs, d, f, 1000, treadmill, Math.floor(w / 1000 / 2));
  row(g, r, "z1", gs, d, f, 2600, (u, i) => (i % 2 ? dumbbells(u) : rack(u)), 6, 400);
  for (let i = 0; i < Math.floor(w / 4000); i++) bench(g, r.x0 + 2000 + i * 4000, f, cz, 1200, true);
}


/** Vanity: counter with two basins' worth of mirror, a shelf and a wall hair dryer */
function vanity(u: THREE.Group) {
  box(u, -600, 800, 0, 1200, 40, 500, mat(OAK, 0.5));
  box(u, -600, 0, 20, 40, 800, 460, mat(STEEL, 0.4, 0.7));
  box(u, 560, 0, 20, 40, 800, 460, mat(STEEL, 0.4, 0.7));
  box(u, -580, 1100, 0, 1160, 900, 10, mat("hsl(210 20% 88%)", 0.03, 1));
  box(u, 380, 1300, 10, 120, 220, 90, mat(WHITE, 0.4));
}

function armchair(g: THREE.Group, x: number, y: number, z: number) {
  const m = mat("hsl(200 18% 38%)", 0.9);
  box(g, x, y + 100, z, 700, 330, 700, m);
  box(g, x, y + 100, z, 700, 750, 140, m);
  for (const s of [0, 1]) box(g, x + s * 580, y + 100, z, 120, 560, 700, m);
}

/** A 65-inch screen on a wall, facing into the room from the given side */
function screen(g: THREE.Group, x: number, y: number, z: number, side: Side) {
  const s = new THREE.Group();
  box(s, -730, 0, 0, 1460, 830, 40, mat("hsl(220 10% 8%)", 0.2, 0.4));
  const lit = new THREE.MeshStandardMaterial({ color: "#1d3557", emissive: new THREE.Color("#2a6fdb"), emissiveIntensity: 0.6 });
  lit.userData.ownsMaterial = true;
  box(s, -700, 30, 41, 1400, 770, 2, lit);
  s.position.set(x * MM, y * MM, z * MM);
  s.rotation.y = side === "x1" ? -Math.PI / 2 : side === "x0" ? Math.PI / 2 : side === "z1" ? Math.PI : 0;
  g.add(s);
}

/** Brand name on a panel (canvas text in the browser, a plain panel in tests) */
function brandPanel(brand: { text: string; color: string; background: string }, w: number, h: number): THREE.Mesh {
  let map: THREE.Texture | null = null;
  if (typeof document !== "undefined") {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = Math.max(64, Math.round((1024 * h) / w));
    const x = c.getContext("2d");
    if (x) {
      x.fillStyle = brand.background;
      x.fillRect(0, 0, c.width, c.height);
      x.fillStyle = brand.color;
      x.textAlign = "center";
      x.textBaseline = "middle";
      let px = c.height * 0.62;
      x.font = `800 ${px}px 'Roboto Condensed', 'Arial Narrow', Arial, sans-serif`;
      const tw = x.measureText(brand.text).width;
      if (tw > c.width * 0.9) px *= (c.width * 0.9) / tw;
      x.font = `800 ${px}px 'Roboto Condensed', 'Arial Narrow', Arial, sans-serif`;
      x.fillText(brand.text, c.width / 2, c.height / 2);
      map = new THREE.CanvasTexture(c);
      map.colorSpace = THREE.SRGBColorSpace;
    }
  }
  const m = new THREE.MeshStandardMaterial({ color: map ? 0xffffff : new THREE.Color(brand.background), map, roughness: 0.4 });
  m.userData.ownsMaterial = true;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w * MM, h * MM), m);
  mesh.userData.ownsGeometry = true;
  return mesh;
}

/** `brand` — the club name for the reception front (the facade sign's text and colours) */
export function sportInterior(b: Building, brand?: { text: string; color: string; background: string }): THREE.Group {
  const g = new THREE.Group();
  g.name = "sport";
  const lv = b.input.levels[0]!;
  const floor = b.levels[0]!.base;
  const d = b.depth;
  const gs = openingGaps(b);
  for (const r of rooms(lv, b.levels[0]!.inner, d)) {
    const cx = (r.x0 + r.x1) / 2;
    const cz = (r.z0 + r.z1) / 2;
    const w = r.x1 - r.x0;
    const h = r.z1 - r.z0;
    switch (r.purpose) {
      case "gym":
        hall(g, b, r, gs, floor);
        break;
      case "changing": {
        // Two-tier lockers for every member of a session, long walls first; a vanity with mirrors on a short wall
        const columns = Math.ceil(lockersPerRoom(b.input.productId) / 2);
        const longFirst: Side[] = w >= h ? ["z0", "z1", "x0", "x1"] : ["x0", "x1", "z0", "z1"];
        let left = columns;
        const used: Side[] = [];
        for (const sd of longFirst) {
          if (left <= 0) break;
          const placed = row(g, r, sd, gs, d, floor, 400, locker, left);
          if (placed) used.push(sd);
          left -= placed;
        }
        const free = longFirst.find((sd) => !used.includes(sd));
        if (free) row(g, r, free, gs, d, floor, 1300, vanity, 2);
        const n = Math.max(1, Math.round(((w >= h ? w : h) - 2400) / 2400));
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n;
          bench(g, w >= h ? r.x0 + 1200 + t * (w - 2400) : cx, floor, w >= h ? cz : r.z0 + 1200 + t * (h - 2400), 1800, w >= h);
        }
        break;
      }
      case "lobby": {
        // Reception with the brand on its front, a slatted oak wall behind, a lounge corner and a screen
        const dw = Math.min(2600, w - 1400);
        desk(g, r.x0 + 600, floor, r.z1 - 1500, dw, 700, 1100);
        if (brand) {
          const face = brandPanel(brand, dw - 200, 380);
          face.position.set((r.x0 + 600 + dw / 2) * MM, (floor + 650) * MM, (r.z1 - 1500 - 4) * MM);
          face.rotation.y = Math.PI;
          g.add(face);
        }
        for (let x = r.x0 + 200; x < r.x0 + 200 + Math.min(w - 400, 4000); x += 120) box(g, x, floor, r.z1 - 60, 60, Math.min(lv.height - 100, 3000), 40, mat(OAK, 0.6));
        const sw = Math.min(2200, w - 1400);
        sofa(g, r.x1 - sw - 400, floor, r.z0 + 300, sw);
        box(g, r.x1 - sw / 2 - 400 - 500, floor, r.z0 + 1400, 1000, 420, 600, mat(OAK, 0.5));
        for (const k of [0, 1]) armchair(g, r.x1 - sw - 900, floor, r.z0 + 900 + k * 900);
        plant(g, r.x1 - 450, floor, r.z1 - 450);
        plant(g, r.x0 + 450, floor, r.z0 + 450);
        screen(g, r.x1 - 30, floor + 1500, (r.z0 + r.z1) / 2, "x1");
        break;
      }
      case "office":
        desk(g, r.x0 + 300, floor, r.z1 - 1100, Math.min(1600, w - 600), 800);
        armchair(g, r.x0 + 300 + Math.min(1600, w - 600) / 2 - 300, floor, r.z1 - 1900);
        armchair(g, r.x0 + 300 + Math.min(1600, w - 600) / 2 - 300, floor, r.z1 - 400);
        row(g, r, "x1", gs, d, floor, 900, shelving, 2);
        break;
      case "storage":
        row(g, r, w >= h ? "z1" : "x1", gs, d, floor, 900, shelving);
        break;
    }
  }
  portal(g, b, gs);
  g.userData.level = 0;
  return g;
}
