import * as THREE from "three";
import type { HardwareItem } from "@/domain/connections/hardware";
import { MM } from "./profileGeometry";

/**
 * Connection hardware in 3D: anchor bolts with washers, hold-down brackets,
 * flat strap X-bracing on the wall face, truss and floor clips. Screws are
 * counted, not drawn (thousands of them would only add noise).
 */
const mats = {
  zinc: new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(205 / 360, 0.08, 0.78), metalness: 0.6, roughness: 0.35 }),
  bolt: new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(40 / 360, 0.5, 0.55), metalness: 0.7, roughness: 0.3 }),
  strap: new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(24 / 360, 0.7, 0.5), metalness: 0.4, roughness: 0.45, side: THREE.DoubleSide }),
};

function mesh(geo: THREE.BufferGeometry, m: THREE.Material): THREE.Mesh {
  const o = new THREE.Mesh(geo, m);
  o.castShadow = true;
  o.userData.ownsGeometry = true;
  return o;
}

export function createHardware(items: readonly HardwareItem[]): THREE.Group {
  const root = new THREE.Group();
  root.name = "hardware";
  const byLevel = new Map<number, THREE.Group>();
  const group = (l: number) => {
    let g = byLevel.get(l);
    if (!g) {
      g = new THREE.Group();
      g.userData.level = l;
      byLevel.set(l, g);
      root.add(g);
    }
    return g;
  };
  for (const it of items) {
    const g = group(it.level);
    const p = new THREE.Vector3(it.at.x * MM, it.at.y * MM, it.at.z * MM);
    switch (it.kind) {
      case "anchor": {
        const b = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 8), mats.bolt);
        b.position.copy(p).add(new THREE.Vector3(0, 0.03, 0));
        const w = mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.004, 12), mats.zinc);
        w.position.copy(p).add(new THREE.Vector3(0, 0.004, 0));
        g.add(b, w);
        break;
      }
      case "hold-down": {
        const n = it.normal ? new THREE.Vector3(it.normal.x, 0, it.normal.z) : new THREE.Vector3(0, 0, 1);
        const h = mesh(new THREE.BoxGeometry(0.05, 0.3, 0.05), mats.zinc);
        h.position.copy(p).add(new THREE.Vector3(0, 0.15, 0)).addScaledVector(n, -0.07);
        g.add(h);
        break;
      }
      case "strap": {
        if (!it.to) break;
        const q = new THREE.Vector3(it.to.x * MM, it.to.y * MM, it.to.z * MM);
        const n = it.normal ? new THREE.Vector3(it.normal.x, it.normal.y, it.normal.z) : new THREE.Vector3(0, 0, -1);
        const dir = q.clone().sub(p);
        const len = dir.length();
        const s = mesh(new THREE.BoxGeometry(0.04, len, 0.0015), mats.strap);
        // Lie on the outer face of the studs (half a web + a sheet)
        s.position.copy(p).add(q).multiplyScalar(0.5).addScaledVector(n, 0.0447);
        const up = dir.clone().normalize();
        const side = new THREE.Vector3().crossVectors(up, n).normalize();
        s.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(side, up, n));
        s.castShadow = false;
        g.add(s);
        break;
      }
      case "truss-clip":
      case "floor-clip": {
        const c = mesh(new THREE.BoxGeometry(0.05, 0.09, 0.06), mats.zinc);
        c.position.copy(p).add(new THREE.Vector3(0.045, 0.045, 0));
        g.add(c);
        break;
      }
      default:
        break;
    }
  }
  return root;
}
