import * as THREE from "three";
import type { Building } from "@/domain/buildings/generate";
import { rooms, type Room } from "@/domain/layout/rooms";
import { box, cyl, mat } from "./kit";
import { MM } from "./profileGeometry";
import { openingGaps, row, runs, type Gap, type Side } from "./sport";

/**
 * Furniture of a home by room purpose, set against the free walls (clear of
 * doors and low windows): beds with bedside tables and a wardrobe, a corner
 * sofa with a TV wall and a rug in the living room, a dining table where the
 * kitchen is big enough, a hall wardrobe, a desk and a bookcase in the
 * study, a washer and a dryer in the laundry, shelving in stores.
 * Contemporary palette: oak, white lacquer, graphite, linen.
 */

const OAK = "hsl(32 40% 58%)";
const WHITE = "hsl(40 15% 93%)";
const GRAPHITE = "hsl(210 6% 26%)";
const LINEN = "hsl(36 22% 78%)";
const SAGE = "hsl(140 12% 52%)";

/** The free stretch of wall, longest first, as [side, from, to] */
function freeWalls(r: Room, gs: Gap[], d: number, under = 900): [Side, number, number][] {
  const out: [Side, number, number][] = [];
  for (const s of ["z1", "x0", "x1", "z0"] as Side[]) for (const [a, b] of runs(r, s, gs, d, under)) out.push([s, a, b]);
  return out.sort((p, q) => q[2] - q[1] - (p[2] - p[1]));
}

/** Put a unit built facing +z (back on the wall at z = 0) at `s` along a side of the room */
function against(g: THREE.Group, r: Room, side: Side, s: number, floor: number, make: (u: THREE.Group) => void) {
  const u = new THREE.Group();
  make(u);
  if (side === "z0") u.position.set(s, floor, r.z0 + 15);
  else if (side === "z1") {
    u.position.set(s, floor, r.z1 - 15);
    u.rotation.y = Math.PI;
  } else if (side === "x0") {
    u.position.set(r.x0 + 15, floor, s);
    u.rotation.y = Math.PI / 2;
  } else {
    u.position.set(r.x1 - 15, floor, s);
    u.rotation.y = -Math.PI / 2;
  }
  u.position.multiplyScalar(MM);
  g.add(u);
}

function bed(u: THREE.Group, w: number) {
  box(u, -w / 2, 0, 0, w, 300, 2100, mat(OAK, 0.6));
  box(u, -w / 2 + 30, 300, 40, w - 60, 220, 2000, mat(WHITE, 0.9));
  box(u, -w / 2 + 30, 520, 1100, w - 60, 40, 980, mat(LINEN, 0.95));
  for (const x of w > 1200 ? [-w / 4, w / 4] : [0]) box(u, x - 300, 520, 120, 600, 140, 420, mat(WHITE, 0.95));
  box(u, -w / 2 - 50, 0, 0, w + 100, 1100, 80, mat(GRAPHITE, 0.8));
  for (const s of [-1, 1]) {
    box(u, s * (w / 2 + 300) - 225, 0, 0, 450, 500, 400, mat(OAK, 0.6));
    cyl(u, s * (w / 2 + 300), 650, 200, 90, 300, mat(WHITE, 0.4));
  }
}

function wardrobe(u: THREE.Group, w: number) {
  box(u, -w / 2, 0, 0, w, 2400, 600, mat(WHITE, 0.35));
  for (let x = -w / 2 + w / 3; x < w / 2 - 10; x += w / 3) box(u, x - 2, 100, 600, 4, 2200, 4, mat(GRAPHITE, 0.6));
}

function sofaL(u: THREE.Group) {
  const m = mat(LINEN, 0.95);
  box(u, -1400, 120, 0, 2800, 330, 950, m);
  box(u, -1400, 120, 0, 2800, 750, 200, m);
  box(u, 700, 120, 0, 900, 330, 1700, m);
  for (let x = -1250; x < 600; x += 650) box(u, x, 450, 230, 600, 120, 650, mat(LINEN, 1));
  box(u, -1300, 0, 1300, 2000, 400, 900, mat(OAK, 0.5)); // coffee table... sits on the rug
  box(u, -1800, 2, 600, 3600, 6, 2600, mat(SAGE, 1)); // rug
}

function tvWall(u: THREE.Group, w: number) {
  box(u, -w / 2, 0, 0, w, 450, 450, mat(OAK, 0.5));
  box(u, -820, 1000, 20, 1640, 940, 40, mat("hsl(220 10% 8%)", 0.2, 0.4));
}

function dining(g: THREE.Group, x: number, y: number, z: number, along: boolean) {
  const t = new THREE.Group();
  box(t, -900, 720, -450, 1800, 40, 900, mat(OAK, 0.5));
  for (const sx of [-1, 1]) box(t, sx * 700 - 40, 0, -40, 80, 720, 80, mat(GRAPHITE, 0.5, 0.4));
  for (const sx of [-600, 0, 600])
    for (const sz of [-1, 1]) {
      box(t, sx - 220, 450, sz * 650 - 220, 440, 40, 440, mat(GRAPHITE, 0.6));
      box(t, sx - 220, 450, sz > 0 ? sz * 650 + 200 : sz * 650 - 220, 440, 450, 20, mat(GRAPHITE, 0.6));
    }
  cyl(t, 0, 1800, 0, 250, 60, mat(WHITE, 0.4)); // pendant
  if (!along) t.rotation.y = Math.PI / 2;
  t.position.set(x * MM, y * MM, z * MM);
  g.add(t);
}

function desk(u: THREE.Group) {
  box(u, -700, 730, 0, 1400, 30, 700, mat(OAK, 0.5));
  for (const s of [-1, 1]) box(u, s * 660 - 20, 0, 40, 40, 730, 620, mat(GRAPHITE, 0.5, 0.4));
  box(u, -250, 0, 900, 500, 480, 500, mat(GRAPHITE, 0.8));
  box(u, -250, 480, 1350, 500, 550, 60, mat(GRAPHITE, 0.8));
}

function bookcase(u: THREE.Group) {
  box(u, -450, 0, 0, 900, 2000, 350, mat(WHITE, 0.4));
  const colors = ["hsl(10 40% 40%)", "hsl(210 30% 35%)", "hsl(40 40% 55%)", "hsl(150 20% 35%)"];
  for (let y = 300; y < 1900; y += 400) for (let x = -400; x < 380; x += 120) box(u, x, y, 40, 90, 260, 250, mat(colors[Math.abs(Math.round(x / 120) + Math.round(y / 400)) % 4]!, 0.8));
}

function laundry(u: THREE.Group) {
  for (const x of [-650, 0]) {
    box(u, x, 0, 0, 600, 850, 600, mat(WHITE, 0.3));
    cyl(u, x + 300, 450, 605, 200, 10, mat(GRAPHITE, 0.2, 0.5), "z");
  }
  box(u, 0, 850, 0, 600, 850, 600, mat(WHITE, 0.3));
  box(u, -650, 2000, 0, 1300, 600, 350, mat(WHITE, 0.4));
}

export function homeInterior(b: Building): THREE.Group {
  const g = new THREE.Group();
  g.name = "home";
  const d = b.depth;
  b.input.levels.forEach((lv, li) => {
    const floor = b.levels[li]!.base;
    const gs = openingGaps(b, li);
    const lvl = new THREE.Group();
    lvl.userData.level = li;
    for (const r of rooms(lv, b.levels[li]!.inner, d)) {
      const w = r.x1 - r.x0;
      const h = r.z1 - r.z0;
      const walls = freeWalls(r, gs, d);
      const [side, a, c] = walls[0] ?? ["z1", r.x0, r.x1];
      const mid = (a + c) / 2;
      switch (r.purpose) {
        case "bedroom": {
          const bw = r.area >= 16 ? 1800 : 1000;
          if (c - a >= bw + 1100) against(lvl, r, side, mid, floor, (u) => bed(u, bw));
          const second = walls.find(([s, x, y]) => s !== side && y - x >= 1800);
          if (second) against(lvl, r, second[0], (second[1] + second[2]) / 2, floor, (u) => wardrobe(u, Math.min(2400, second[2] - second[1] - 200)));
          break;
        }
        case "living":
        case "rest": {
          if (c - a >= 3000) against(lvl, r, side, mid, floor, sofaL);
          const opposite: Record<Side, Side> = { z0: "z1", z1: "z0", x0: "x1", x1: "x0" };
          const tv = walls.find(([s, x, y]) => s === opposite[side] && y - x >= 1800);
          if (tv) against(lvl, r, tv[0], (tv[1] + tv[2]) / 2, floor, (u) => tvWall(u, Math.min(2400, tv[2] - tv[1] - 200)));
          else if (r.purpose === "rest") row(lvl, r, walls[1]?.[0] ?? "x1", gs, d, floor, 900, bookcase, 3);
          break;
        }
        case "kitchen":
          // The kitchen run comes with the "kitchen" prop; a table for six where there is room
          if (r.area >= 20) dining(lvl, (r.x0 + r.x1) / 2, floor, (r.z0 + r.z1) / 2, w >= h);
          break;
        case "hall":
          if (c - a >= 1400) against(lvl, r, side, mid, floor, (u) => wardrobe(u, Math.min(1800, c - a - 200)));
          break;
        case "office":
          if (c - a >= 1600) {
            against(lvl, r, side, mid, floor, desk);
            row(lvl, r, walls[1]?.[0] ?? "x1", gs, d, floor, 900, bookcase, 3);
          }
          break;
        case "washing":
          if (c - a >= 1400) against(lvl, r, side, mid, floor, laundry);
          break;
        case "storage":
          if (c - a >= 1000) against(lvl, r, side, mid, floor, (u) => wardrobe(u, Math.min(2400, c - a - 200)));
          break;
      }
    }
    g.add(lvl);
  });
  return g;
}

/** Kitchen run: base units with a worktop, a hob and a sink, wall units over them, on the longest free kitchen wall */
export function kitchenRun(b: Building): THREE.Group {
  const g = new THREE.Group();
  const d = b.depth;
  b.input.levels.forEach((lv, li) => {
    const floor = b.levels[li]!.base;
    const gs = openingGaps(b, li);
    for (const r of rooms(lv, b.levels[li]!.inner, d).filter((x) => x.purpose === "kitchen")) {
      const wall = freeWalls(r, gs, d, 2100)[0];
      if (!wall) continue;
      const [side, a, c] = wall;
      const len = Math.min(4200, c - a - 100);
      if (len < 1200) continue;
      against(g, r, side, a + 50 + len / 2, floor, (u) => {
        box(u, -len / 2, 100, 0, len, 750, 600, mat(WHITE, 0.35));
        box(u, -len / 2, 0, 50, len, 100, 500, mat(GRAPHITE, 0.8));
        box(u, -len / 2, 850, 0, len, 40, 620, mat(GRAPHITE, 0.3));
        box(u, -len / 2 + 300, 891, 120, 600, 4, 500, mat("hsl(0 0% 6%)", 0.2, 0.3));
        box(u, len / 2 - 900, 860, 100, 500, 40, 420, mat("hsl(210 8% 70%)", 0.2, 0.9));
        box(u, -len / 2, 1450, 0, len, 700, 330, mat(OAK, 0.5));
      });
    }
  });
  g.userData.level = 0;
  return g;
}
