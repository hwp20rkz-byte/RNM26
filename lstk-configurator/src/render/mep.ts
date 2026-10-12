import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { MepLayout, MepSystem } from "@/domain/mep/routing";
import { MM } from "./profileGeometry";

/**
 * Services in 3D: runs as tubes (one merged mesh per system and level),
 * devices as boxes. Colours follow the usual drawing convention: power
 * orange, lighting yellow, cold water blue, hot water red, drainage brown,
 * ventilation light grey, heating purple.
 */
export const MEP_COLOR: Record<MepSystem, string> = {
  power: "hsl(28 90% 52%)",
  lighting: "hsl(48 95% 55%)",
  cold: "hsl(210 85% 52%)",
  hot: "hsl(0 80% 52%)",
  sewer: "hsl(25 45% 35%)",
  vent: "hsl(200 10% 78%)",
  heating: "hsl(285 55% 55%)",
};

const materials = new Map<MepSystem, THREE.MeshStandardMaterial>();
function material(s: MepSystem): THREE.MeshStandardMaterial {
  let m = materials.get(s);
  if (!m) {
    // three.js does not read the space-separated CSS hsl() syntax: convert by hand
    const [h, sat, l] = MEP_COLOR[s].match(/[\d.]+/g)!.map(Number) as [number, number, number];
    m = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(h / 360, sat / 100, l / 100), roughness: 0.5, metalness: s === "vent" ? 0.5 : 0.1, emissive: new THREE.Color().setHSL(h / 360, sat / 100, l / 100), emissiveIntensity: 0.25 });
    materials.set(s, m);
  }
  return m;
}

const up = new THREE.Vector3(0, 1, 0);

function segment(a: THREE.Vector3, b: THREE.Vector3, r: number): THREE.BufferGeometry | null {
  const d = b.clone().sub(a);
  const len = d.length();
  if (len < 1e-4) return null;
  const g = new THREE.CylinderGeometry(r, r, len, 8, 1, false);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, d.normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
}

export function createMep(layout: MepLayout, systems: ReadonlySet<MepSystem>): THREE.Group {
  const root = new THREE.Group();
  root.name = "mep";
  const parts = new Map<string, { system: MepSystem; level: number; geos: THREE.BufferGeometry[] }>();
  const bucket = (system: MepSystem, level: number) => {
    const k = `${system}:${level}`;
    let p = parts.get(k);
    if (!p) {
      p = { system, level, geos: [] };
      parts.set(k, p);
    }
    return p;
  };
  for (const run of layout.runs) {
    if (!systems.has(run.system)) continue;
    // Drawn a little fatter than real so a cable reads at house scale
    const r = Math.max(9, run.diameter / 2 + 4) * MM;
    const pts = run.points.map((p) => new THREE.Vector3(p.x * MM, p.y * MM, p.z * MM));
    const b = bucket(run.system, run.level);
    for (let i = 1; i < pts.length; i++) {
      const g = segment(pts[i - 1]!, pts[i]!, r);
      if (g) b.geos.push(g);
    }
  }
  for (const pt of layout.points) {
    if (!systems.has(pt.system)) continue;
    const g = new THREE.BoxGeometry(pt.size[0] * MM, pt.size[1] * MM, pt.size[2] * MM);
    g.translate(pt.at.x * MM, pt.at.y * MM, pt.at.z * MM);
    bucket(pt.system, pt.level).geos.push(g);
  }
  for (const { system, level, geos } of parts.values()) {
    if (!geos.length) continue;
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, material(system));
    mesh.userData.ownsGeometry = true;
    mesh.userData.level = level;
    mesh.name = `mep:${system}`;
    root.add(mesh);
  }
  return root;
}
