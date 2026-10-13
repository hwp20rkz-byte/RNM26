import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { FastenerKind } from "@/domain/connections/fasteners";
import { centrelineLength, memberFrame } from "@/domain/members/member";
import type { Member } from "@/domain/members/types";
import { MM } from "./profileGeometry";

/**
 * The fasteners the detailing placed (domain/detailing): a hex-washer head of
 * a self-drilling screw or the dome of a structural blind rivet on the outer
 * face at every dimple. A nested joint has a dimple in both members at the
 * same point: one head is drawn, on the outermost face. Instanced — a house
 * has tens of thousands.
 */

function screwHead(): THREE.BufferGeometry {
  // Washer Ø11 × 1, hex 8 mm across flats × 3.5, along +y
  const washer = new THREE.CylinderGeometry(5.5 * MM, 5.5 * MM, 1 * MM, 12).translate(0, 0.5 * MM, 0);
  const hex = new THREE.CylinderGeometry(4.62 * MM, 4.62 * MM, 3.5 * MM, 6).translate(0, 2.75 * MM, 0);
  return mergeGeometries([washer.toNonIndexed(), hex.toNonIndexed()], false)!;
}

function rivetHead(): THREE.BufferGeometry {
  // Dome head Ø9.5 × 1.6 with a pulled mandrel stub
  const dome = new THREE.SphereGeometry(4.75 * MM, 12, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.34, 1);
  const stub = new THREE.CylinderGeometry(1.4 * MM, 1.4 * MM, 1.2 * MM, 10).translate(0, 1.6 * MM, 0);
  return mergeGeometries([dome.toNonIndexed(), stub.toNonIndexed()], false)!;
}

const heads = new Map<FastenerKind, THREE.BufferGeometry>();
const headMaterial = {
  screw: new THREE.MeshStandardMaterial({ color: new THREE.Color(0.86, 0.84, 0.74), metalness: 0.95, roughness: 0.28 }),
  rivet: new THREE.MeshStandardMaterial({ color: new THREE.Color(0.85, 0.86, 0.88), metalness: 0.95, roughness: 0.22 }),
};

export interface FastenerPoint {
  at: THREE.Vector3;
  normal: THREE.Vector3;
}

/** Head positions (assembly-local, metres) for the flange and web dimples of these members */
export function fastenerPoints(members: readonly Member[]): FastenerPoint[] {
  const seen = new Map<string, FastenerPoint & { out: number }>();
  for (const m of members) {
    if (m.profile.family === "Hat") continue;
    const f = memberFrame(m);
    const L = centrelineLength(m);
    const half = m.profile.web / 2;
    for (const d of m.features) {
      if (d.kind !== "dimple" || d.position < 0 || d.position > L) continue;
      const base = new THREE.Vector3(m.start.x, m.start.y, m.start.z).addScaledVector(new THREE.Vector3(f.axis.x, f.axis.y, f.axis.z), d.position);
      let at: THREE.Vector3;
      let normal: THREE.Vector3;
      if (d.flange) {
        // On the flange face: across the flange by `offset`, out to the face of the web depth
        const web = new THREE.Vector3(f.web.x, f.web.y, f.web.z).multiplyScalar(d.flange);
        at = base.addScaledVector(new THREE.Vector3(f.flange.x, f.flange.y, f.flange.z), d.offset).addScaledVector(web, half);
        normal = web;
      } else {
        // Through the web, head on its back face
        const back = new THREE.Vector3(-f.flange.x, -f.flange.y, -f.flange.z);
        at = base.addScaledVector(new THREE.Vector3(f.web.x, f.web.y, f.web.z), d.offset).addScaledVector(back, m.profile.thickness / 2);
        normal = back;
      }
      // One head per hole pair: key on the point projected off the face direction
      const k = [at.x, at.y, at.z].map((v, i) => (Math.abs([normal.x, normal.y, normal.z][i]!) > 0.9 ? Math.sign([normal.x, normal.y, normal.z][i]!) : Math.round(v * 2) / 2)).join(":");
      const out = at.dot(normal);
      const prev = seen.get(k);
      if (!prev || out > prev.out) seen.set(k, { at: at.multiplyScalar(MM), normal, out });
    }
  }
  return [...seen.values()].map(({ at, normal }) => ({ at, normal }));
}

export function createFasteners(members: readonly Member[], kind: FastenerKind): THREE.InstancedMesh | null {
  const pts = fastenerPoints(members);
  if (!pts.length) return null;
  let geo = heads.get(kind);
  if (!geo) {
    geo = kind === "screw" ? screwHead() : rivetHead();
    heads.set(kind, geo);
  }
  const mesh = new THREE.InstancedMesh(geo, headMaterial[kind], pts.length);
  const up = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion();
  const mtx = new THREE.Matrix4();
  pts.forEach((p, i) => {
    q.setFromUnitVectors(up, p.normal);
    // A quarter turn per head so the hexes don't all line up
    q.multiply(new THREE.Quaternion().setFromAxisAngle(up, (i * 0.7) % (Math.PI / 3)));
    mtx.compose(p.at, q, new THREE.Vector3(1, 1, 1));
    mesh.setMatrixAt(i, mtx);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.castShadow = false;
  mesh.name = "fasteners";
  return mesh;
}
