import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { MepLayout, MepPoint, MepSystem } from "@/domain/mep/routing";
import { MM } from "./profileGeometry";

/**
 * Services in 3D, modelled after the real parts (procedural geometry, no
 * downloaded models): corrugated cable conduit, PE-RT water pipes with
 * bends, grey PVC drains with sockets, galvanised spiral ducts, and the
 * devices — sockets, LED downlights, the panel, type-22 steel radiators,
 * convectors, the boiler and the water heater, WC, basin, shower, sink.
 *
 * Everything of one material on one storey is merged into one mesh, so a
 * house costs a few dozen draw calls. Colours in MEP_COLOR double as the
 * legend in the UI.
 */
export const MEP_COLOR: Record<MepSystem, string> = {
  power: "hsl(210 6% 30%)",
  lighting: "hsl(210 6% 62%)",
  cold: "hsl(210 85% 48%)",
  hot: "hsl(2 78% 48%)",
  sewer: "hsl(210 4% 70%)",
  vent: "hsl(205 8% 74%)",
  heating: "hsl(330 55% 55%)",
};

type MatKey = MepSystem | "white" | "ceramic" | "chrome" | "steel" | "dark" | "glass" | "led" | "orangePvc" | "panelGrey" | "brass";

const hsl = (css: string) => {
  // three.js does not read the space-separated CSS hsl() syntax: convert by hand
  const [h, s, l] = css.match(/[\d.]+/g)!.map(Number) as [number, number, number];
  return new THREE.Color().setHSL(h / 360, s / 100, l / 100);
};

let corrugation: THREE.Texture | null = null;
/** Normal map of a corrugated conduit: rings along the tube (v) */
function corrugationMap(): THREE.Texture | null {
  if (corrugation || typeof document === "undefined") return corrugation;
  const c = document.createElement("canvas");
  c.width = 8;
  c.height = 64;
  const g = c.getContext("2d");
  if (!g) return null;
  for (let y = 0; y < 64; y++) {
    // Slope of a sine profile → tangent-space normal (x stays 0.5, y tilts)
    const slope = Math.cos((y / 64) * Math.PI * 2);
    g.fillStyle = `rgb(128, ${Math.round(128 + slope * 110)}, 255)`;
    g.fillRect(0, y, 8, 1);
  }
  corrugation = new THREE.CanvasTexture(c);
  corrugation.wrapS = corrugation.wrapT = THREE.RepeatWrapping;
  return corrugation;
}

const mats = new Map<MatKey, THREE.MeshStandardMaterial>();
function material(k: MatKey): THREE.MeshStandardMaterial {
  let m = mats.get(k);
  if (m) return m;
  const std = (o: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(o);
  switch (k) {
    case "power":
    case "lighting":
      m = std({ color: hsl(MEP_COLOR[k]), roughness: 0.55, metalness: 0, normalMap: corrugationMap(), normalScale: new THREE.Vector2(0.9, 0.9) });
      break;
    case "cold":
    case "hot":
    case "heating":
      m = std({ color: hsl(MEP_COLOR[k]), roughness: 0.35, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.25 });
      break;
    case "sewer":
      m = std({ color: hsl(MEP_COLOR.sewer), roughness: 0.45, metalness: 0 });
      break;
    case "vent":
      // Galvanised spiral duct
      m = std({ color: hsl(MEP_COLOR.vent), roughness: 0.32, metalness: 0.9 });
      break;
    case "white":
      m = std({ color: new THREE.Color(0.94, 0.94, 0.93), roughness: 0.32, metalness: 0, clearcoat: 0.4 });
      break;
    case "ceramic":
      m = std({ color: new THREE.Color(0.97, 0.97, 0.96), roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05 });
      break;
    case "chrome":
      m = std({ color: new THREE.Color(0.9, 0.9, 0.92), roughness: 0.08, metalness: 1 });
      break;
    case "steel":
      m = std({ color: new THREE.Color(0.78, 0.79, 0.8), roughness: 0.28, metalness: 1 });
      break;
    case "dark":
      m = std({ color: new THREE.Color(0.08, 0.08, 0.09), roughness: 0.5, metalness: 0 });
      break;
    case "glass":
      m = std({ color: new THREE.Color(0.85, 0.93, 0.95), roughness: 0.04, metalness: 0, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
      break;
    case "led":
      m = std({ color: new THREE.Color(1, 0.98, 0.92), emissive: new THREE.Color(1, 0.95, 0.85), emissiveIntensity: 1.6, roughness: 0.6 });
      break;
    case "orangePvc":
      m = std({ color: hsl("hsl(20 80% 50%)"), roughness: 0.5, metalness: 0 });
      break;
    case "panelGrey":
      m = std({ color: hsl("hsl(60 4% 86%)"), roughness: 0.45, metalness: 0.1 });
      break;
    case "brass":
      m = std({ color: hsl("hsl(42 60% 52%)"), roughness: 0.3, metalness: 1 });
      break;
  }
  mats.set(k, m!);
  return m!;
}

// ── Geometry helpers (metres) ─────────────────────────────

const box = (w: number, h: number, d: number, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const cyl = (r: number, h: number, x = 0, y = 0, z = 0, seg = 24) => new THREE.CylinderGeometry(r, r, h, seg).translate(x, y, z);
/** Cylinder lying along z (out of the wall) */
const disc = (r: number, d: number, x = 0, y = 0, z = 0, seg = 32) => new THREE.CylinderGeometry(r, r, d, seg).rotateX(Math.PI / 2).translate(x, y, z);
const lathe = (pts: [number, number][], seg = 40) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

const up = new THREE.Vector3(0, 1, 0);

/** Straight tube a → b; uv.v scaled to length so a ring texture keeps its pitch */
function tube(a: THREE.Vector3, b: THREE.Vector3, r: number, pitch = 0): THREE.BufferGeometry | null {
  const d = b.clone().sub(a);
  const len = d.length();
  if (len < 1e-4) return null;
  const g = new THREE.CylinderGeometry(r, r, len, 14, 1, true);
  if (pitch > 0) {
    const uv = g.getAttribute("uv") as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * (len / pitch));
  }
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, d.normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
}

/** Orient a model built facing +z (front) with +y up to face `normal` at `at` */
function place(g: THREE.BufferGeometry, at: THREE.Vector3, normal?: { x: number; z: number }): THREE.BufferGeometry {
  if (normal) g.rotateY(Math.atan2(normal.x, normal.z));
  return g.translate(at.x, at.y, at.z);
}

// ── Devices: built at the origin, front towards +z, mm → m via MM ──

type Parts = [MatKey, THREE.BufferGeometry][];

function socket(): Parts {
  return [
    ["white", box(80 * MM, 80 * MM, 9 * MM, 0, 0, 4.5 * MM)],
    ["white", disc(24 * MM, 3 * MM, 0, 0, 10 * MM)],
    ["dark", disc(2.4 * MM, 2 * MM, -9.5 * MM, 0, 11.6 * MM, 12)],
    ["dark", disc(2.4 * MM, 2 * MM, 9.5 * MM, 0, 11.6 * MM, 12)],
  ];
}

function downlight(): Parts {
  // Hangs under the ceiling: built facing down (−y)
  return [
    ["white", cyl(95 * MM, 8 * MM, 0, -4 * MM, 0, 40)],
    ["led", cyl(80 * MM, 2 * MM, 0, -9 * MM, 0, 40)],
  ];
}

function panelBoard(): Parts {
  const p: Parts = [
    ["panelGrey", box(300 * MM, 450 * MM, 110 * MM, 0, 0, 55 * MM)],
    ["white", box(290 * MM, 440 * MM, 4 * MM, 0, 0, 112 * MM)],
    ["dark", box(200 * MM, 60 * MM, 2 * MM, 0, 80 * MM, 115 * MM)],
  ];
  return p;
}

/** Steel panel radiator, type 22: two profiled panels, convector fins, top grille */
function radiator(w: number, h: number): Parts {
  const p: Parts = [];
  const W = w * MM;
  const H = h * MM;
  for (const z of [22, 78]) {
    p.push(["white", box(W, H, 14 * MM, 0, H / 2, z * MM)]);
    // Vertical water channels pressed into the panel, 33 mm pitch
    for (let x = -W / 2 + 16 * MM; x < W / 2 - 10 * MM; x += 33 * MM) p.push(["white", box(18 * MM, H - 30 * MM, 4 * MM, x, H / 2, (z + (z > 50 ? 8 : -8)) * MM)]);
  }
  p.push(["white", box(W, 6 * MM, 100 * MM, 0, H + 3 * MM, 50 * MM)]);
  for (let x = -W / 2 + 12 * MM; x < W / 2 - 8 * MM; x += 14 * MM) p.push(["dark", box(6 * MM, 2 * MM, 70 * MM, x, H + 6.5 * MM, 50 * MM)]);
  // Side covers and wall brackets
  for (const s of [-1, 1]) p.push(["white", box(4 * MM, H, 100 * MM, (s * W) / 2, H / 2, 50 * MM)]);
  return p;
}

function convector(w: number): Parts {
  const W = w * MM;
  const p: Parts = [["white", box(W, 420 * MM, 80 * MM, 0, 210 * MM, 40 * MM)]];
  for (let y = 330; y < 400; y += 14) p.push(["dark", box(W - 80 * MM, 5 * MM, 2 * MM, 0, y * MM, 81 * MM)]);
  p.push(["dark", box(40 * MM, 20 * MM, 2 * MM, W / 2 - 50 * MM, 60 * MM, 81 * MM)]);
  return p;
}

function boiler(): Parts {
  return [
    ["white", box(400 * MM, 700 * MM, 330 * MM, 0, 0, 165 * MM)],
    ["dark", box(160 * MM, 60 * MM, 2 * MM, 0, -230 * MM, 331 * MM)],
    ["led", box(60 * MM, 20 * MM, 2 * MM, 0, -230 * MM, 332 * MM)],
    ...[-120, -40, 40, 120].map((x): [MatKey, THREE.BufferGeometry] => ["brass", cyl(10 * MM, 80 * MM, x * MM, -390 * MM, 120 * MM, 12)]),
  ];
}

function waterHeater(): Parts {
  return [
    ["white", cyl(225 * MM, 760 * MM, 0, 0, 230 * MM, 40)],
    ["white", new THREE.SphereGeometry(225 * MM, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.25, 1).translate(0, 380 * MM, 230 * MM)],
    ["white", new THREE.SphereGeometry(225 * MM, 40, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1, 0.25, 1).translate(0, -380 * MM, 230 * MM)],
    ["cold", cyl(10 * MM, 120 * MM, -60 * MM, -440 * MM, 230 * MM, 12)],
    ["hot", cyl(10 * MM, 120 * MM, 60 * MM, -440 * MM, 230 * MM, 12)],
  ];
}

function wc(): Parts {
  // Bowl: lathe profile, then squashed to an oval; cistern against the wall
  const bowl = lathe([
    [0, 0],
    [120, 0],
    [150, 120],
    [185, 330],
    [170, 360],
    [130, 360],
    [140, 300],
    [100, 150],
    [0, 140],
  ].map(([r, y]) => [r! * MM, y! * MM] as [number, number]));
  bowl.scale(1, 1, 1.35).translate(0, -450 * MM, 330 * MM);
  return [
    ["ceramic", bowl],
    ["ceramic", box(380 * MM, 360 * MM, 170 * MM, 0, 30 * MM, 90 * MM)],
    ["chrome", box(60 * MM, 10 * MM, 30 * MM, 0, 215 * MM, 90 * MM)],
    ["white", new THREE.TorusGeometry(160 * MM, 18 * MM, 12, 40).rotateX(Math.PI / 2).scale(1, 1, 1.3).translate(0, -82 * MM, 340 * MM)],
  ];
}

function basin(): Parts {
  const bowl = lathe([
    [0, 0],
    [190, 20],
    [240, 150],
    [250, 160],
    [225, 160],
    [180, 50],
    [0, 40],
  ].map(([r, y]) => [r! * MM, y! * MM] as [number, number]));
  bowl.scale(1, 1, 0.8).translate(0, 230 * MM, 230 * MM);
  return [
    ["ceramic", bowl],
    ["chrome", cyl(14 * MM, 140 * MM, 0, 450 * MM, 60 * MM, 16)],
    ["chrome", box(24 * MM, 22 * MM, 120 * MM, 0, 510 * MM, 110 * MM)],
    ["chrome", cyl(16 * MM, 280 * MM, 0, 80 * MM, 120 * MM, 16)],
  ];
}

function shower(): Parts {
  return [
    ["ceramic", box(800 * MM, 50 * MM, 800 * MM, 0, -425 * MM, 400 * MM)],
    ["steel", disc(30 * MM, 4 * MM, 0, -399 * MM, 400 * MM).rotateX(Math.PI / 2)],
    ["glass", box(6 * MM, 1950 * MM, 800 * MM, 397 * MM, 575 * MM, 400 * MM)],
    ["glass", box(800 * MM, 1950 * MM, 6 * MM, 0, 575 * MM, 797 * MM)],
    ["chrome", cyl(11 * MM, 1600 * MM, -300 * MM, 650 * MM, 30 * MM, 16)],
    ["chrome", cyl(110 * MM, 10 * MM, -300 * MM, 1470 * MM, 130 * MM, 32)],
    ["chrome", box(22 * MM, 22 * MM, 110 * MM, -300 * MM, 1460 * MM, 80 * MM)],
  ];
}

function kitchenSink(): Parts {
  return [
    ["white", box(600 * MM, 850 * MM, 600 * MM, 0, -25 * MM, 300 * MM)],
    ["steel", box(560 * MM, 8 * MM, 500 * MM, 0, 405 * MM, 300 * MM)],
    ["dark", box(420 * MM, 4 * MM, 360 * MM, 0, 410 * MM, 300 * MM)],
    ["chrome", cyl(15 * MM, 260 * MM, 0, 540 * MM, 80 * MM, 16)],
    ["chrome", new THREE.TorusGeometry(110 * MM, 12 * MM, 10, 24, Math.PI).rotateY(Math.PI / 2).translate(0, 670 * MM, 190 * MM)],
  ];
}

function floorDrain(): Parts {
  return [["steel", box(150 * MM, 6 * MM, 150 * MM, 0, -447 * MM, 150 * MM)]];
}

function entry(): Parts {
  return [
    ["brass", cyl(28 * MM, 110 * MM, 0, 0, 0, 20).rotateZ(Math.PI / 2)],
    ["cold", box(40 * MM, 60 * MM, 30 * MM, 0, 40 * MM, 0)],
    ["white", cyl(40 * MM, 30 * MM, 120 * MM, 0, 0, 24).rotateX(Math.PI / 2)],
  ];
}

function ceilingFan(): Parts {
  const p: Parts = [["white", box(220 * MM, 12 * MM, 220 * MM, 0, -6 * MM, 0)]];
  for (let x = -80; x <= 80; x += 20) p.push(["dark", box(8 * MM, 3 * MM, 160 * MM, x * MM, -13 * MM, 0)]);
  return p;
}

function inletValve(): Parts {
  return [
    ["white", disc(85 * MM, 22 * MM, 0, 0, 11 * MM, 40)],
    ["dark", disc(55 * MM, 2 * MM, 0, 0, 23 * MM, 40)],
  ];
}

function mvhr(): Parts {
  return [
    ["panelGrey", box(800 * MM, 300 * MM, 600 * MM)],
    ...[-250, -80, 80, 250].map((x): [MatKey, THREE.BufferGeometry] => ["vent", cyl(80 * MM, 120 * MM, x * MM, 210 * MM, 0, 24)]),
  ];
}

function stackFoot(): Parts {
  return [["sewer", cyl(70 * MM, 140 * MM, 0, 0, 0, 24)]];
}

function outlet(): Parts {
  return [["orangePvc", cyl(62 * MM, 200 * MM, 0, 0, 0, 24).rotateX(Math.PI / 2)]];
}

function device(p: MepPoint): Parts {
  switch (p.kind) {
    case "socket":
      return socket();
    case "light":
      return downlight();
    case "panel":
      return panelBoard();
    case "radiator":
      return radiator(Math.max(p.size[0], p.size[2]), 500);
    case "convector":
      return convector(Math.max(p.size[0], p.size[2]));
    case "boiler":
      return boiler();
    case "heater":
      return waterHeater();
    case "entry":
      return entry();
    case "fan":
      return ceilingFan();
    case "valve":
      return inletValve();
    case "unit":
      return mvhr();
    case "stack":
      return stackFoot();
    case "outlet":
      return outlet();
    case "fixture":
      switch (p.fixture) {
        case "wc":
          return wc();
        case "basin":
          return basin();
        case "shower":
          return shower();
        case "sink":
          return kitchenSink();
        case "drain":
          return floorDrain();
        default:
          return [["white", box(p.size[0] * MM, p.size[1] * MM, p.size[2] * MM)]];
      }
  }
}

/** Radiators and convectors stand on the floor line; the point is their centre */
function anchor(p: MepPoint): THREE.Vector3 {
  const at = new THREE.Vector3(p.at.x * MM, p.at.y * MM, p.at.z * MM);
  if (p.kind === "radiator" || p.kind === "convector") at.y -= 250 * MM;
  // Wall-mounted: the model is built from the wall face outwards; step back from
  // the routed point (which sits in the room) to the face
  const back: Partial<Record<MepPoint["kind"], number>> = { radiator: 120, convector: 120, panel: 60, boiler: 360, heater: 360, fixture: 260 };
  const d = back[p.kind];
  if (p.normal && d) at.addScaledVector(new THREE.Vector3(p.normal.x, 0, p.normal.z), -d * MM);
  return at;
}

export function createMep(layout: MepLayout, systems: ReadonlySet<MepSystem>): THREE.Group {
  const root = new THREE.Group();
  root.name = "mep";
  const buckets = new Map<string, { mat: MatKey; level: number; geos: THREE.BufferGeometry[] }>();
  const add = (mat: MatKey, level: number, g: THREE.BufferGeometry | null) => {
    if (!g) return;
    const k = `${mat}:${level}`;
    let b = buckets.get(k);
    if (!b) {
      b = { mat, level, geos: [] };
      buckets.set(k, b);
    }
    // Merge needs one attribute layout: non-indexed with position/normal/uv
    const n = g.index ? g.toNonIndexed() : g;
    if (n !== g) g.dispose();
    for (const name of Object.keys(n.attributes)) if (!["position", "normal", "uv"].includes(name)) n.deleteAttribute(name);
    b.geos.push(n);
  };

  for (const run of layout.runs) {
    if (!systems.has(run.system)) continue;
    // Real outside diameters, cables drawn as their 16 mm conduit
    const r = Math.max(8, run.diameter / 2) * MM;
    const pts = run.points.map((p) => new THREE.Vector3(p.x * MM, p.y * MM, p.z * MM));
    const pitch = run.system === "power" || run.system === "lighting" ? 6 * MM : 0;
    for (let i = 1; i < pts.length; i++) {
      add(run.system, run.level, tube(pts[i - 1]!, pts[i]!, r, pitch));
      // Drain pipes: a socket (bell) at the start of every length
      if (run.system === "sewer") {
        const d = pts[i]!.clone().sub(pts[i - 1]!);
        if (d.length() > 0.12) add("sewer", run.level, tube(pts[i - 1]!, pts[i - 1]!.clone().addScaledVector(d.normalize(), 0.09), r * 1.18));
      }
    }
    // Bends: a sphere at every corner reads as a smooth elbow
    for (let i = 1; i < pts.length - 1; i++) add(run.system, run.level, new THREE.SphereGeometry(r * (run.system === "sewer" ? 1.12 : 1.04), 14, 10).translate(pts[i]!.x, pts[i]!.y, pts[i]!.z));
    // Vent stack and roof ducts end in a weather cap
    const last = pts[pts.length - 1]!;
    const first = pts[0]!;
    if ((run.system === "sewer" || run.system === "vent") && pts.length === 2 && last.y - first.y > 1.5) {
      add(run.system === "vent" ? "vent" : "sewer", run.level, cyl(r * 1.25, 0.06, last.x, last.y + 0.03, last.z));
      add("dark", run.level, new THREE.ConeGeometry(r * 2, 0.12, 24).translate(last.x, last.y + 0.18, last.z));
    }
  }

  for (const p of layout.points) {
    if (!systems.has(p.system)) continue;
    const at = anchor(p);
    for (const [mat, g] of device(p)) add(mat, p.level, place(g, at, p.normal));
  }

  for (const { mat, level, geos } of buckets.values()) {
    if (!geos.length) continue;
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, material(mat));
    mesh.castShadow = mat !== "glass" && mat !== "led";
    mesh.receiveShadow = true;
    mesh.userData.ownsGeometry = true;
    mesh.userData.level = level;
    mesh.name = `mep:${mat}`;
    root.add(mesh);
  }
  return root;
}
