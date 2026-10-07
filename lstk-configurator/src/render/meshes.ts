import * as THREE from "three";
import { centrelineLength, memberFrame } from "@/domain/members/member";
import type { Feature, Member } from "@/domain/members/types";
import type { CSpec, HatSpec, ProfileSpec, USpec, ZSpec } from "@/domain/profiles/types";
import { fabricateTruss } from "@/domain/trusses/fabricate";
import { generateTruss } from "@/domain/trusses/generate";
import type { TrussInput, TrussModel } from "@/domain/trusses/types";
import { steelMaterial } from "./materials";
import { MM, createDetailedProfileGeometry, createProfileGeometry, unitProfileGeometry } from "./profileGeometry";

export type DetailLevel = "instanced" | "detailed";

export interface ProfileMeshOptions {
  features?: readonly Feature[];
  material?: THREE.Material;
}

/** A single profile along +z (metres), section in xy — for previews and the detail view */
export function createProfileMesh(spec: ProfileSpec, lengthMm: number, opts: ProfileMeshOptions = {}): THREE.Mesh {
  const geometry = opts.features?.length ? createDetailedProfileGeometry(spec, lengthMm, opts.features) : createProfileGeometry(spec, lengthMm);
  const mesh = new THREE.Mesh(geometry, opts.material ?? steelMaterial());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = spec.id;
  mesh.userData.ownsGeometry = true;
  return mesh;
}

export const createCProfileMesh = (spec: CSpec, lengthMm: number, opts?: ProfileMeshOptions) => createProfileMesh(spec, lengthMm, opts);
export const createUProfileMesh = (spec: USpec, lengthMm: number, opts?: ProfileMeshOptions) => createProfileMesh(spec, lengthMm, opts);
export const createZProfileMesh = (spec: ZSpec, lengthMm: number, opts?: ProfileMeshOptions) => createProfileMesh(spec, lengthMm, opts);
export const createHatProfileMesh = (spec: HatSpec, lengthMm: number, opts?: ProfileMeshOptions) => createProfileMesh(spec, lengthMm, opts);

/**
 * World transform of a member: section x → flange direction, y → web direction,
 * z → member axis, origin at the start point. `lengthScale` stretches a
 * unit-length geometry to the member's length.
 */
export function memberMatrix(member: Member, lengthScale = 1): THREE.Matrix4 {
  const f = memberFrame(member);
  const x = new THREE.Vector3(f.flange.x, f.flange.y, f.flange.z);
  const y = new THREE.Vector3(f.web.x, f.web.y, f.web.z);
  const z = new THREE.Vector3(f.axis.x, f.axis.y, f.axis.z).multiplyScalar(lengthScale);
  const m = new THREE.Matrix4().makeBasis(x, y, z);
  m.setPosition(member.start.x * MM, member.start.y * MM, member.start.z * MM);
  return m;
}

/**
 * All members as a scene group.
 * - "instanced": one InstancedMesh per (profile, role) — scales to whole buildings;
 *   instance i ↔ `userData.memberIds[i]` for picking.
 * - "detailed": one mesh per member with punched holes — for a handful of members.
 */
export function createMembersGroup(members: readonly Member[], detail: DetailLevel = "instanced"): THREE.Group {
  const group = new THREE.Group();
  if (detail === "detailed") {
    for (const m of members) {
      const geometry = createDetailedProfileGeometry(m.profile, centrelineLength(m), m.features);
      const mesh = new THREE.Mesh(geometry, steelMaterial(m.role));
      mesh.applyMatrix4(memberMatrix(m));
      // cast onto the ground only: self-shadowing thin steel reads as noise
      mesh.castShadow = true;
      mesh.name = m.id;
      mesh.userData.memberId = m.id;
      mesh.userData.ownsGeometry = true;
      group.add(mesh);
    }
    return group;
  }

  const buckets = new Map<string, Member[]>();
  for (const m of members) {
    const key = `${m.profile.id}|${m.role}`;
    buckets.set(key, [...(buckets.get(key) ?? []), m]);
  }
  for (const list of buckets.values()) {
    const first = list[0]!;
    const mesh = new THREE.InstancedMesh(unitProfileGeometry(first.profile), steelMaterial(first.role), list.length);
    list.forEach((m, i) => mesh.setMatrixAt(i, memberMatrix(m, centrelineLength(m) * MM)));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.castShadow = true;
    mesh.name = `${first.profile.id}:${first.role}`;
    mesh.userData.memberIds = list.map((m) => m.id);
    group.add(mesh);
  }
  return group;
}

/** Truss from parameters (or a prebuilt model) as a scene group */
export function createTrussMesh(source: TrussInput | TrussModel, opts: { detail?: DetailLevel; planeZ?: number } = {}): THREE.Group {
  const model = "nodes" in source ? source : generateTruss(source);
  const { members } = fabricateTruss(model, { planeZ: opts.planeZ ?? 0 });
  const group = createMembersGroup(members, opts.detail ?? "instanced");
  group.name = "truss";
  group.userData.members = members;
  return group;
}

/**
 * Free GPU buffers of geometries this module created for one scene build.
 * Shared unit geometries (instanced) and cached materials are kept.
 */
export function disposeOwned(root: THREE.Object3D): void {
  root.traverse((o) => {
    if (o instanceof THREE.Mesh && o.userData.ownsGeometry) o.geometry.dispose();
    if (o instanceof THREE.Mesh) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (!m.userData.ownsMaterial) continue;
        // Textures are clones of a shared canvas: dispose the clone's GPU copy only
        if ((m as THREE.MeshStandardMaterial).map) (m as THREE.MeshStandardMaterial).map!.dispose();
        m.dispose();
      }
    }
  });
}
