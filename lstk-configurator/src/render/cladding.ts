import * as THREE from "three";
import { toWorld } from "@/domain/geometry/frame";
import { v3 } from "@/domain/geometry/vec";
import type { Building } from "@/domain/buildings/generate";
import { openingTop } from "@/domain/walls/generate";
import { tagExplode } from "./assemblies";
import { MM } from "./profileGeometry";

/**
 * Envelope for the "skin" view: profiled roof sheet on both slopes, wall
 * sheeting with real openings, gable triangles. Visual only — quantities come
 * from domain/buildings/quantities.
 */

function stripes(color: string, period = 8): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 4;
  const g = c.getContext("2d");
  if (!g) return null;
  g.fillStyle = color;
  g.fillRect(0, 0, 64, 4);
  g.fillStyle = "rgba(0,0,0,0.18)";
  for (let x = 0; x < 64; x += period) g.fillRect(x, 0, period / 3, 4);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const roofTex = stripes("#4a5361");
const wallTex = stripes("#d9dde3", 16);

function material(tex: THREE.Texture | null, color: string, repeat: [number, number]): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: tex ? "#ffffff" : color, roughness: 0.7, metalness: 0.1, side: THREE.DoubleSide });
  if (tex) {
    const t = tex.clone();
    t.repeat.set(...repeat);
    t.needsUpdate = true;
    m.map = t;
  }
  return m;
}

export function createCladding(b: Building): THREE.Group {
  const root = new THREE.Group();
  root.name = "cladding";
  const { length: L, width: W, pitchDeg, overhang, wallHeight: H } = b.input;
  const a = (pitchDeg * Math.PI) / 180;
  const d = 89;
  const sheet = 0.6; // mm, drawn thickness

  // Roof: each slope rests on the top-chord top surface
  const rafter = W / 2 / Math.cos(a) + overhang;
  const lift = d / 2 / Math.cos(a) + 25; // half web + batten
  for (const side of [-1, 1] as const) {
    const geo = new THREE.BoxGeometry(L * MM, sheet * MM * 20, rafter * MM);
    const mesh = new THREE.Mesh(geo, material(roofTex, "#4a5361", [L / 1000 / 0.2, 1]));
    // slope centre: halfway along the rafter from the eave tip to the ridge
    const along = rafter / 2 - overhang;
    const z = side < 0 ? along * Math.cos(a) : W - along * Math.cos(a);
    const y = b.eaveHeight + along * Math.sin(a) + lift;
    mesh.position.set((L / 2) * MM, y * MM, z * MM);
    mesh.rotation.x = side < 0 ? -a : a;
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData.ownsGeometry = true;
    const g = new THREE.Group();
    g.add(mesh);
    tagExplode(g, new THREE.Vector3(0, 1, side * 0.4), 2);
    root.add(g);
  }

  if (b.input.kind !== "enclosed") return root;

  for (const w of b.assemblies.filter((x) => x.kind === "wall")) {
    const shape = new THREE.Shape();
    const len = w.size.width;
    shape.moveTo(0, 0);
    shape.lineTo(len * MM, 0);
    shape.lineTo(len * MM, H * MM);
    shape.lineTo(0, H * MM);
    shape.closePath();
    const side = (["front", "back", "left", "right"] as const)[Number(w.mark.slice(1)) - 1]!;
    for (const o of b.input.openings[side]) {
      const hole = new THREE.Path();
      hole.moveTo(o.x * MM, o.sill * MM);
      hole.lineTo((o.x + o.width) * MM, o.sill * MM);
      hole.lineTo((o.x + o.width) * MM, openingTop(o) * MM);
      hole.lineTo(o.x * MM, openingTop(o) * MM);
      hole.closePath();
      shape.holes.push(hole);
    }
    const geo = new THREE.ExtrudeGeometry(shape, { depth: sheet * MM * 10, bevelEnabled: false });
    const mesh = new THREE.Mesh(geo, material(wallTex, "#d9dde3", [len / 1000 / 0.35, 1]));
    // outward is local −z for every wall; sit just outside the frame
    const f = w.placement;
    const o = toWorld(f, v3(0, 0, -(d / 2 + 8)));
    const basis = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(f.ex.x, f.ex.y, f.ex.z),
      new THREE.Vector3(f.ey.x, f.ey.y, f.ey.z),
      new THREE.Vector3(f.ez.x, f.ez.y, f.ez.z),
    );
    mesh.applyMatrix4(basis.setPosition(o.x * MM, o.y * MM, o.z * MM));
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData.ownsGeometry = true;
    const g = new THREE.Group();
    g.add(mesh);
    tagExplode(g, new THREE.Vector3(w.explode.x, w.explode.y, w.explode.z), 2);
    root.add(g);

    // Gable triangle above the end walls
    if (side === "left" || side === "right") {
      const rise = (W / 2) * Math.tan(a);
      const tri = new THREE.Shape();
      const x0 = -d;
      const x1 = len + d;
      tri.moveTo(x0 * MM, H * MM);
      tri.lineTo(x1 * MM, H * MM);
      // apex under the ridge sheet
      tri.lineTo(((x0 + x1) / 2) * MM, (b.eaveHeight + rise + d / 2) * MM);
      tri.closePath();
      const tg = new THREE.ExtrudeGeometry(tri, { depth: sheet * MM * 10, bevelEnabled: false });
      const tm = new THREE.Mesh(tg, material(wallTex, "#d9dde3", [len / 1000 / 0.35, 1]));
      tm.applyMatrix4(basis.clone().setPosition(o.x * MM, o.y * MM, o.z * MM));
      tm.userData.ownsGeometry = true;
      g.add(tm);
    }
  }
  return root;
}
