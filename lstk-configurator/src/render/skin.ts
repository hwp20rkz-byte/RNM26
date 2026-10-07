import * as THREE from "three";
import { FLOOR_TRUSS_DEPTH, sideOpenings, wallPlans, type Building } from "@/domain/buildings/generate";
import type { RoomPurpose } from "@/domain/buildings/types";
import { finish, type FinishChoice } from "@/domain/finishes/catalog";
import { rooms } from "@/domain/layout/rooms";
import type { Frame3 } from "@/domain/geometry/frame";
import { openingTop } from "@/domain/walls/generate";
import type { Opening } from "@/domain/walls/types";
import { tagExplode } from "./assemblies";
import { MM } from "./profileGeometry";

/**
 * The building's skin: facade and roof finishes in the chosen colours, windows
 * with glass, doors, gates, the plinth and the foundation, room floors (seen
 * in the floor-plan cut). Visual only — quantities come from the domain.
 * Every group carries `userData.level` for the floor-plan cut.
 */

/** "hsl(200 8% 62%)" → THREE.Color (three's parser wants commas) */
export function hsl(s: string): THREE.Color {
  const m = /hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\)/.exec(s);
  return m ? new THREE.Color().setHSL(Number(m[1]) / 360, Number(m[2]) / 100, Number(m[3]) / 100, THREE.SRGBColorSpace) : new THREE.Color(s);
}

export const PURPOSE_COLOR: Record<RoomPurpose, string> = {
  living: "hsl(36 60% 70%)",
  bedroom: "hsl(250 35% 74%)",
  kitchen: "hsl(18 70% 68%)",
  bathroom: "hsl(190 55% 66%)",
  steam: "hsl(10 60% 58%)",
  washing: "hsl(200 50% 70%)",
  rest: "hsl(140 35% 66%)",
  hall: "hsl(40 15% 72%)",
  storage: "hsl(30 10% 62%)",
  technical: "hsl(210 15% 60%)",
  garage: "hsl(215 8% 56%)",
  workshop: "hsl(45 45% 58%)",
  poultry: "hsl(55 60% 66%)",
  open: "hsl(30 30% 60%)",
};

type Look = ReturnType<typeof finish>["look"];

const texCache = new Map<string, THREE.CanvasTexture | null>();

/** Small tileable canvas texture per finish look; one tile = `period` metres */
function lookTexture(look: Look): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  if (texCache.has(look)) return texCache.get(look)!;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  if (!g) return null;
  g.fillStyle = "#fff";
  g.fillRect(0, 0, 64, 64);
  const dark = (a: number) => `rgba(0,0,0,${a})`;
  const light = (a: number) => `rgba(255,255,255,${a})`;
  switch (look) {
    case "ribbed":
      for (let x = 0; x < 64; x += 16) {
        g.fillStyle = dark(0.22);
        g.fillRect(x, 0, 5, 64);
        g.fillStyle = light(0.25);
        g.fillRect(x + 5, 0, 2, 64);
      }
      break;
    case "standing-seam":
      g.fillStyle = dark(0.25);
      g.fillRect(0, 0, 3, 64);
      g.fillStyle = light(0.3);
      g.fillRect(3, 0, 2, 64);
      break;
    case "boards":
      for (let y = 0; y < 64; y += 16) {
        g.fillStyle = dark(0.18);
        g.fillRect(0, y, 64, 3);
        g.fillStyle = light(0.15);
        g.fillRect(0, y + 3, 64, 2);
      }
      break;
    case "tiles":
      for (let y = 0; y < 64; y += 32) {
        g.fillStyle = dark(0.25);
        g.fillRect(0, y + 28, 64, 4);
        for (let x = 0; x < 64; x += 32) {
          const grd = g.createLinearGradient(x, 0, x + 32, 0);
          grd.addColorStop(0, dark(0.15));
          grd.addColorStop(0.5, light(0.12));
          grd.addColorStop(1, dark(0.15));
          g.fillStyle = grd;
          g.fillRect(x, y, 32, 28);
        }
      }
      break;
    case "shingles":
      for (let y = 0; y < 64; y += 16) {
        g.fillStyle = dark(0.25);
        g.fillRect(0, y + 13, 64, 3);
        for (let x = (y / 16) % 2 ? 8 : 0; x < 64; x += 16) g.fillRect(x, y, 2, 13);
      }
      break;
    case "stone":
      for (let y = 0; y < 64; y += 16)
        for (let x = (y / 16) % 2 ? -10 : 0; x < 64; x += 20) {
          g.fillStyle = dark(0.05 + ((x * 7 + y * 3) % 5) * 0.03);
          g.fillRect(x + 1, y + 1, 18, 14);
        }
      break;
    case "smooth":
      texCache.set(look, null);
      return null;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  texCache.set(look, tex);
  return tex;
}

/** Metres covered by one texture tile, per look */
const TILE: Record<Look, number> = { ribbed: 0.8, "standing-seam": 0.5, boards: 0.8, tiles: 0.7, shingles: 1, stone: 1.2, smooth: 1 };

function finishMaterial(id: string, color: string, sizeM: [number, number], rotate = false): THREE.MeshStandardMaterial {
  const f = finish(id);
  const tex = lookTexture(f.look);
  const metal = f.look === "ribbed" || f.look === "standing-seam" || f.look === "tiles";
  const m = new THREE.MeshStandardMaterial({ color: hsl(color), roughness: metal ? 0.45 : 0.85, metalness: metal ? 0.3 : 0, side: THREE.DoubleSide });
  if (tex) {
    const t = tex.clone();
    const [u, v] = sizeM;
    if (rotate) {
      t.rotation = Math.PI / 2;
      t.repeat.set(v / TILE[f.look], u / TILE[f.look]);
    } else t.repeat.set(u / TILE[f.look], v / TILE[f.look]);
    t.needsUpdate = true;
    m.map = t;
  }
  m.userData.ownsMaterial = true;
  return m;
}

const plain = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => {
  const m = new THREE.MeshStandardMaterial({ color: hsl(color), roughness: 0.6, metalness: 0.1, ...extra });
  m.userData.ownsMaterial = true;
  return m;
};

function owned(mesh: THREE.Mesh, cast = true): THREE.Mesh {
  mesh.userData.ownsGeometry = true;
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  return mesh;
}

/** Box from min corner (mm) and size (mm) in model coordinates */
function box(x: number, y: number, z: number, sx: number, sy: number, sz: number, mat: THREE.Material): THREE.Mesh {
  const m = owned(new THREE.Mesh(new THREE.BoxGeometry(sx * MM, sy * MM, sz * MM), mat));
  m.position.set((x + sx / 2) * MM, (y + sy / 2) * MM, (z + sz / 2) * MM);
  return m;
}

function basis(f: Frame3, offset: THREE.Vector3): THREE.Matrix4 {
  return new THREE.Matrix4()
    .makeBasis(new THREE.Vector3(f.ex.x, f.ex.y, f.ex.z), new THREE.Vector3(f.ey.x, f.ey.y, f.ey.z), new THREE.Vector3(f.ez.x, f.ez.y, f.ez.z))
    .setPosition(
      (f.origin.x + f.ex.x * offset.x + f.ey.x * offset.y + f.ez.x * offset.z) * MM,
      (f.origin.y + f.ex.y * offset.x + f.ey.y * offset.y + f.ez.y * offset.z) * MM,
      (f.origin.z + f.ex.z * offset.x + f.ey.z * offset.y + f.ez.z * offset.z) * MM,
    );
}

/** A flat panel in wall-local mm (x along, y up), extruded `depth` outward */
function panel(points: [number, number][], holes: Opening[], yShift: number, depth: number, mat: THREE.Material): THREE.Mesh {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x * MM, y * MM)));
  for (const o of holes) {
    const h = new THREE.Path();
    const y0 = o.sill + yShift;
    const y1 = openingTop(o) + yShift;
    h.moveTo(o.x * MM, y0 * MM);
    h.lineTo((o.x + o.width) * MM, y0 * MM);
    h.lineTo((o.x + o.width) * MM, y1 * MM);
    h.lineTo(o.x * MM, y1 * MM);
    h.closePath();
    shape.holes.push(h);
  }
  // Extrude along +z; the caller mirrors so the panel grows outward (−z local)
  const geo = new THREE.ExtrudeGeometry(shape, { depth: depth * MM, bevelEnabled: false });
  geo.translate(0, 0, -depth * MM);
  return owned(new THREE.Mesh(geo, mat));
}

/** Window: frame, mullion and glass; door: leaf and handle; gate: ribbed sectional panel */
function filler(o: Opening, yShift: number, trim: THREE.Material, glass: THREE.Material, gateMat: THREE.Material, leaf: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const x0 = o.x;
  const y0 = o.sill + yShift;
  const w = o.width;
  const h = openingTop(o) - o.sill;
  const fr = 60;
  const z = -40;
  if (o.kind === "window") {
    g.add(box(x0, y0, z, w, fr, 70, trim), box(x0, y0 + h - fr, z, w, fr, 70, trim), box(x0, y0, z, fr, h, 70, trim), box(x0 + w - fr, y0, z, fr, h, 70, trim));
    if (w > 1000) g.add(box(x0 + w / 2 - fr / 2, y0, z, fr, h, 70, trim));
    const pane = box(x0 + fr, y0 + fr, z + 30, w - 2 * fr, h - 2 * fr, 8, glass);
    pane.castShadow = false;
    g.add(pane);
    // Sill flashing
    g.add(box(x0 - 30, y0 - 20, z - 60, w + 60, 20, 90, trim));
  } else if (o.kind === "door") {
    g.add(box(x0, y0, z, w, h, 50, leaf));
    g.add(box(x0 + w - 140, y0 + 1000, z - 40, 100, 25, 30, trim));
  } else {
    const ribs = Math.max(4, Math.round(h / 500));
    for (let i = 0; i < ribs; i++) g.add(box(x0, y0 + (h * i) / ribs + 4, z, w, h / ribs - 8, 40, gateMat));
  }
  return g;
}

export function createSkin(b: Building, finishes: FinishChoice): THREE.Group {
  const root = new THREE.Group();
  root.name = "skin";
  const { input, depth: d, profile } = b;
  const { length: L, width: W, roof } = input;
  const a = (roof.pitchDeg * Math.PI) / 180;
  const plinth = input.foundation.type === "none" ? 0 : input.foundation.plinth;
  const trim = plain(finishes.trimColor, { metalness: 0.3, roughness: 0.4 });
  const glass = new THREE.MeshStandardMaterial({ color: hsl("hsl(205 45% 55%)"), metalness: 0.7, roughness: 0.05, transparent: true, opacity: 0.45 });
  glass.userData.ownsMaterial = true;
  const leaf = plain("hsl(24 35% 30%)", { roughness: 0.7 });
  const gateMat = finishMaterial("profsheet", finishes.trimColor, [6, 3]);
  const SKIN = 12;
  // Clear of truss end verticals (half a web, 45 mm) that reach past the outer face
  const outset = 50;

  const tag = (g: THREE.Object3D, level: number, dir: THREE.Vector3, layer: number) => {
    g.userData.level = level;
    tagExplode(g, dir, layer);
    root.add(g);
  };

  // ── Walls ────────────────────────────────────────────────
  input.levels.forEach((level, li) => {
    const info = b.levels[li]!;
    const y0 = li === 0 ? plinth : info.base - FLOOR_TRUSS_DEPTH;
    const shift = info.base - y0;
    for (const plan of wallPlans(input, li, info.base)) {
      const cfg = level.sides[plan.side];
      if (cfg.type === "open") continue;
      const ends = plan.side === "left" || plan.side === "right" ? d + outset + SKIN : outset + SKIN;
      const ops = sideOpenings(cfg, plan.length, level.height, input, profile);
      const top = cfg.type === "half" ? input.parapet + shift : level.height + shift;
      const len = plan.length + 2 * ends;
      const mat = finishMaterial(finishes.facade, finishes.facadeColor, [len / 1000, top / 1000]);
      const pts: [number, number][] = [
        [-ends, 0],
        [plan.length + ends, 0],
        [plan.length + ends, top],
        [-ends, top],
      ];
      const g = new THREE.Group();
      const sheet = panel(pts, cfg.type === "wall" ? ops : [], shift, SKIN, mat);
      g.add(sheet);
      if (cfg.type === "wall") for (const o of ops) g.add(filler(o, shift, trim, glass, gateMat, leaf));
      else g.add(box(-ends, top, -SKIN - 40, len, 40, d + SKIN + 60, trim)); // parapet cap
      g.applyMatrix4(basis(plan.placement, new THREE.Vector3(0, -shift, -(d / 2 + outset))));
      tag(g, li, new THREE.Vector3(plan.outward.x, plan.outward.y, plan.outward.z), li * 2 + 2);
    }
  });

  // ── Gables / mono-pitch infill ───────────────────────────
  const topLevel = input.levels.length - 1;
  const topInfo = b.levels[topLevel]!;
  const H = topInfo.height;
  const topSides = input.levels[topLevel]!.sides;
  const heel = roof.type === "mono" ? roof.heelHeight : 0;
  const lift = d / 2 + d / Math.cos(a) / 2;
  /** Roof underside above the wall top at plan z (mm from the front face) */
  const under = (z: number) => (roof.type === "mono" ? heel + Math.tan(a) * z : Math.tan(a) * Math.min(z, W - z)) + lift;
  for (const plan of wallPlans(input, topLevel, topInfo.base)) {
    if (topSides[plan.side].type !== "wall") continue;
    const ends = plan.side === "left" || plan.side === "right" ? d + outset + SKIN : outset + SKIN;
    const pts: [number, number][] = [];
    if (plan.side === "left" || plan.side === "right") {
      // local x runs from z = W−d (left) / z = d (right)
      const zAt = (x: number) => (plan.side === "left" ? W - d - x : d + x);
      const xs = [-ends, ...(roof.type === "gable" ? [plan.length / 2] : []), plan.length + ends];
      pts.push([-ends, H]);
      pts.push([plan.length + ends, H]);
      for (const x of [...xs].reverse()) pts.push([x, H + under(Math.max(0, Math.min(W, zAt(x))))]);
    } else if (roof.type === "mono") {
      const h = under(plan.side === "front" ? 0 : W);
      pts.push([-ends, H], [plan.length + ends, H], [plan.length + ends, H + h], [-ends, H + h]);
    } else continue;
    const span = (pts.reduce((m, p) => Math.max(m, p[1]), 0) - H) / 1000;
    const g = new THREE.Group();
    g.add(panel(pts, [], 0, SKIN, finishMaterial(finishes.facade, finishes.facadeColor, [(plan.length + 2 * ends) / 1000, span])));
    g.applyMatrix4(basis(plan.placement, new THREE.Vector3(0, 0, -(d / 2 + outset))));
    // Gables go with the roof in the plan cut
    tag(g, input.levels.length, new THREE.Vector3(plan.outward.x, plan.outward.y, plan.outward.z), topLevel * 2 + 2);
  }

  // ── Roof ─────────────────────────────────────────────────
  const roofLevel = input.levels.length;
  const ov = roof.overhang;
  const RL = L + 2 * Math.min(ov, 400);
  const thick = 40;
  const roofG = new THREE.Group();
  const slopeMesh = (rafter: number, z: number, y: number, rot: number) => {
    const m = owned(new THREE.Mesh(new THREE.BoxGeometry(RL * MM, thick * MM, rafter * MM), finishMaterial(finishes.roofing, finishes.roofColor, [RL / 1000, rafter / 1000], true)));
    m.position.set((L / 2) * MM, y * MM, z * MM);
    m.rotation.x = rot;
    roofG.add(m);
  };
  const baseY = b.roofBase;
  if (roof.type === "gable") {
    const rafter = W / 2 / Math.cos(a) + ov;
    const along = rafter / 2 - ov;
    for (const s of [-1, 1] as const) {
      const z = s < 0 ? along * Math.cos(a) : W - along * Math.cos(a);
      slopeMesh(rafter, z, baseY + along * Math.sin(a) + lift + thick / 2, s < 0 ? -a : a);
    }
    // Ridge cap and gutters
    const ridge = owned(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, RL * MM, 12, 1, false, 0, Math.PI), trim));
    ridge.rotation.z = Math.PI / 2;
    ridge.position.set((L / 2) * MM, (baseY + (W / 2) * Math.tan(a) + lift + thick) * MM, (W / 2) * MM);
    roofG.add(ridge);
    for (const s of [-1, 1] as const) {
      const ez = s < 0 ? -ov * Math.cos(a) : W + ov * Math.cos(a);
      const ey = baseY - ov * Math.sin(a) + lift;
      roofG.add(box(-Math.min(ov, 400), ey - 120, ez - 60, RL, 110, 120, trim));
    }
  } else {
    const rafter = W / Math.cos(a) + 2 * ov;
    slopeMesh(rafter, W / 2, baseY + heel + (W / 2) * Math.tan(a) + lift + thick / 2, -a);
    const ez = -ov * Math.cos(a);
    roofG.add(box(-Math.min(ov, 400), baseY + heel - ov * Math.sin(a) + lift - 120, ez - 60, RL, 110, 120, trim));
  }
  tag(roofG, roofLevel, new THREE.Vector3(0, 1, 0), roofLevel * 2 + 2);

  // ── Plinth, foundation ───────────────────────────────────
  const base = new THREE.Group();
  if (plinth > 0) {
    const pm = finishMaterial(finishes.plinth, finish(finishes.plinth).color, [(2 * (L + W)) / 1000, plinth / 1000]);
    const o = outset + SKIN;
    base.add(box(-o, 0, -o, L + 2 * o, plinth, SKIN, pm), box(-o, 0, W + o - SKIN, L + 2 * o, plinth, SKIN, pm));
    base.add(box(-o, 0, -o, SKIN, plinth, W + 2 * o, pm), box(L + o - SKIN, 0, -o, SKIN, plinth, W + 2 * o, pm));
  }
  if (input.foundation.type === "slab") base.add(box(-200, plinth - 200, -200, L + 400, 200, W + 400, plain("hsl(30 4% 68%)", { roughness: 0.95 })));
  base.userData.level = 0;
  root.add(base);

  // ── Room floors (seen in the plan cut) ───────────────────
  input.levels.forEach((level, li) => {
    const info = b.levels[li]!;
    const g = new THREE.Group();
    const open = !(["front", "back", "left", "right"] as const).every((s) => level.sides[s].type === "wall");
    if (open) {
      if (input.foundation.type !== "slab" && input.foundation.type !== "none") g.add(box(0, info.base - 30, 0, L, 30, W, finishMaterial("deck", finish("deck").color, [L / 1000, W / 1000])));
    } else
      for (const r of rooms(level, info.inner, d)) {
        const purpose = level.rooms[r.key] ?? "living";
        const m = box(r.x0, info.base + 2, r.z0, r.x1 - r.x0, 18, r.z1 - r.z0, plain(PURPOSE_COLOR[purpose], { roughness: 0.8 }));
        m.castShadow = false;
        m.userData.roomKey = `${li}:${r.key}`;
        g.add(m);
      }
    g.userData.level = li;
    root.add(g);
  });

  return root;
}
