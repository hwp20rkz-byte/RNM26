import * as THREE from "three";
import type { HardwareItem } from "@/domain/connections/hardware";
import { MM } from "./profileGeometry";

/**
 * Connection hardware in 3D: anchor bolts with washers, hold-down brackets,
 * flat strap X-bracing on the wall face, truss and floor clips. Screws are
 * counted, not drawn (thousands of them would only add noise).
 */
const mats = {
  zinc: new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(205 / 360, 0.08, 0.8), metalness: 0.85, roughness: 0.3, side: THREE.DoubleSide }),
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
        // M12 stud, washer and nut on the bottom plate
        const b = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.07, 12), mats.zinc);
        b.position.copy(p).add(new THREE.Vector3(0, 0.035, 0));
        const w = mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.003, 20), mats.zinc);
        w.position.copy(p).add(new THREE.Vector3(0, 0.0015, 0));
        const nut = mesh(new THREE.CylinderGeometry(0.0105, 0.0105, 0.01, 6), mats.zinc);
        nut.position.copy(p).add(new THREE.Vector3(0, 0.008, 0));
        g.add(b, w, nut);
        break;
      }
      case "hold-down": {
        // Folded hold-down bracket on the stud face, bolted down through the plate
        const n = it.normal ? new THREE.Vector3(it.normal.x, 0, it.normal.z) : new THREE.Vector3(0, 0, 1);
        const side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), n).normalize();
        const basis = new THREE.Matrix4().makeBasis(side, new THREE.Vector3(0, 1, 0), n);
        const parts = [
          new THREE.BoxGeometry(0.06, 0.28, 0.003).translate(0, 0.16, 0),
          new THREE.BoxGeometry(0.003, 0.28, 0.04).translate(-0.03, 0.16, 0.02),
          new THREE.BoxGeometry(0.003, 0.28, 0.04).translate(0.03, 0.16, 0.02),
          new THREE.BoxGeometry(0.06, 0.004, 0.06).translate(0, 0.03, 0.03),
        ];
        for (const geo of parts) {
          const h = mesh(geo, mats.zinc);
          h.applyMatrix4(basis);
          h.position.add(p).addScaledVector(n, -0.052);
          g.add(h);
        }
        const bolt = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.07, 12), mats.zinc);
        bolt.position.copy(p).addScaledVector(n, -0.022).add(new THREE.Vector3(0, 0.045, 0));
        const nut = mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.012, 6), mats.zinc);
        nut.position.copy(p).addScaledVector(n, -0.022).add(new THREE.Vector3(0, 0.04, 0));
        g.add(bolt, nut);
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
        // Angle clip 90×60×1.5: one leg on the top plate, one up the chord
        const legs = [new THREE.BoxGeometry(0.06, 0.0015, 0.08).translate(0.03, 0, 0), new THREE.BoxGeometry(0.0015, 0.09, 0.08).translate(0.06, 0.045, 0)];
        for (const geo of legs) {
          const c = mesh(geo, mats.zinc);
          c.position.copy(p);
          g.add(c);
        }
        break;
      }
      case "joint-clip": {
        // 40×40 angle at a butt joint, both faces of the panel
        const n = it.normal ? new THREE.Vector3(it.normal.x, it.normal.y, it.normal.z) : new THREE.Vector3(0, 0, 1);
        for (const s of [-1, 1]) {
          const c = mesh(new THREE.BoxGeometry(0.04, 0.04, 0.0012), mats.zinc);
          c.lookAt(n);
          c.position.copy(p).addScaledVector(n, s * 0.0455);
          g.add(c);
        }
        break;
      }
      case "ridge-plate": {
        // Gusset over the apex, both faces of the truss
        const n = it.normal ? new THREE.Vector3(it.normal.x, it.normal.y, it.normal.z) : new THREE.Vector3(1, 0, 0);
        for (const s of [-1, 1]) {
          const c = mesh(new THREE.BoxGeometry(0.3, 0.18, 0.0012), mats.zinc);
          c.lookAt(n);
          c.position.copy(p).addScaledVector(n, s * 0.0455);
          g.add(c);
        }
        break;
      }
      default:
        break;
    }
  }
  return root;
}
