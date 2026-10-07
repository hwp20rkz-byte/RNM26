import * as THREE from "three";
import type { Assembly } from "@/domain/assemblies/types";
import { createMembersGroup, type DetailLevel } from "./meshes";
import { MM } from "./profileGeometry";

/** Metres an assembly travels per explode layer at explode = 1 */
const EXPLODE_STEP = 1.6;

function placementMatrix(a: Assembly): THREE.Matrix4 {
  const { origin, ex, ey, ez } = a.placement;
  return new THREE.Matrix4()
    .makeBasis(new THREE.Vector3(ex.x, ex.y, ex.z), new THREE.Vector3(ey.x, ey.y, ey.z), new THREE.Vector3(ez.x, ez.y, ez.z))
    .setPosition(origin.x * MM, origin.y * MM, origin.z * MM);
}

/**
 * One child group per assembly, positioned by its placement. The group keeps
 * its home position and explode direction in userData so the exploded view is
 * a cheap position update (applyExplode), not a rebuild.
 */
export function createAssembliesGroup(assemblies: readonly Assembly[], detail: DetailLevel): THREE.Group {
  const root = new THREE.Group();
  root.name = "assemblies";
  for (const a of assemblies) {
    const g = new THREE.Group();
    g.name = a.id;
    g.applyMatrix4(placementMatrix(a));
    g.add(createMembersGroup(a.members, detail));
    tagExplode(g, new THREE.Vector3(a.explode.x, a.explode.y, a.explode.z), a.layer);
    g.userData.assemblyId = a.id;
    // Storey for the floor-plan cut: walls on layer 2i, the floor above level i on 2i+1, roof last
    g.userData.level = Math.ceil(a.layer / 2);
    root.add(g);
  }
  return root;
}

export function tagExplode(o: THREE.Object3D, dir: THREE.Vector3, layer: number): void {
  o.userData.home = o.position.clone();
  o.userData.explodeDir = dir.clone().normalize();
  o.userData.explodeLayer = layer;
}

/** Move every tagged object along its explode direction; t ∈ [0, 1] */
export function applyExplode(root: THREE.Object3D, t: number): void {
  root.traverse((o) => {
    const home = o.userData.home as THREE.Vector3 | undefined;
    const dir = o.userData.explodeDir as THREE.Vector3 | undefined;
    if (!home || !dir) return;
    const layer = (o.userData.explodeLayer as number) ?? 0;
    o.position.copy(home).addScaledVector(dir, t * EXPLODE_STEP * (layer + 1));
  });
}

const HIGHLIGHT = new THREE.Color().setHSL(24 / 360, 0.88, 0.5);
const WHITE = new THREE.Color(1, 1, 1);
const highlightMaterial = new THREE.MeshStandardMaterial({ color: HIGHLIGHT, metalness: 0.2, roughness: 0.5, side: THREE.DoubleSide });

/** Id of the member under a pointer hit, if any */
export function memberIdFromHit(object: THREE.Object3D, instanceId: number | undefined): string | null {
  if (object instanceof THREE.InstancedMesh && instanceId !== undefined) {
    const ids = object.userData.memberIds as string[] | undefined;
    return ids?.[instanceId] ?? null;
  }
  return (object.userData.memberId as string | undefined) ?? null;
}

/**
 * Colour the selected member. Instanced meshes use per-instance colour (the
 * material colour multiplies it, so white = unchanged); detailed meshes swap material.
 */
export function highlightMember(root: THREE.Object3D, id: string | null): void {
  root.traverse((o) => {
    if (o instanceof THREE.InstancedMesh) {
      const ids = o.userData.memberIds as string[] | undefined;
      if (!ids) return;
      if (!o.instanceColor) for (let i = 0; i < ids.length; i++) o.setColorAt(i, WHITE);
      const prev = o.userData.highlighted as number | undefined;
      if (prev !== undefined && prev >= 0) o.setColorAt(prev, WHITE);
      const next = id === null ? -1 : ids.indexOf(id);
      if (next >= 0) o.setColorAt(next, HIGHLIGHT);
      o.userData.highlighted = next;
      o.instanceColor!.needsUpdate = true;
    } else if (o instanceof THREE.Mesh && o.userData.memberId) {
      if (!o.userData.baseMaterial) o.userData.baseMaterial = o.material;
      o.material = o.userData.memberId === id ? highlightMaterial : (o.userData.baseMaterial as THREE.Material);
    }
  });
}

/** Floor-plan cut: hide everything above `level` (−1 shows all) */
export function applyCut(root: THREE.Object3D, level: number): void {
  root.traverse((o) => {
    const l = o.userData.level as number | undefined;
    if (l !== undefined) o.visible = level < 0 || l <= level;
  });
}
