import * as THREE from "three";
import { hsl } from "./skin";
import { MM } from "./profileGeometry";

/** Shared materials and primitives for low-poly scenery (props, sports interiors) */

const mats = new Map<string, THREE.MeshStandardMaterial>();
export function mat(color: string, rough = 0.7, metal = 0): THREE.MeshStandardMaterial {
  const k = `${color}|${rough}|${metal}`;
  let m = mats.get(k);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: hsl(color), roughness: rough, metalness: metal });
    mats.set(k, m);
  }
  return m;
}

/** A box from its minimum corner (x, y, z) and size, mm */
export function box(g: THREE.Group, x: number, y: number, z: number, sx: number, sy: number, sz: number, m: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx * MM, sy * MM, sz * MM), m);
  mesh.position.set((x + sx / 2) * MM, (y + sy / 2) * MM, (z + sz / 2) * MM);
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.userData.ownsGeometry = true;
  g.add(mesh);
  return mesh;
}

/** A cylinder centred at (x, y, z), mm */
export function cyl(g: THREE.Group, x: number, y: number, z: number, r: number, h: number, m: THREE.Material, axis: "x" | "y" | "z" = "y") {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r * MM, r * MM, h * MM, 16), m);
  if (axis === "x") mesh.rotation.z = Math.PI / 2;
  if (axis === "z") mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x * MM, y * MM, z * MM);
  mesh.castShadow = true;
  mesh.userData.ownsGeometry = true;
  g.add(mesh);
  return mesh;
}
