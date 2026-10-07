import * as THREE from "three";
import { v3 } from "@/domain/geometry/vec";
import { centrelineLength, validateFeatures, type FeatureIssue } from "@/domain/members/member";
import { connectionHoles, serviceHoles, thermalSlots } from "@/domain/members/punching";
import type { Feature, Member } from "@/domain/members/types";
import { memberOnMachine, type MachineIssue } from "@/domain/machines/check";
import { GOLDEN_INTEGRITY_C89 } from "@/domain/machines/golden-integrity-c89";
import { findProfile } from "@/domain/profiles/catalog";
import { checkDeterminacy, type DeterminacyCheck } from "@/domain/trusses/analysis";
import { fabricateTruss } from "@/domain/trusses/fabricate";
import { generateTruss } from "@/domain/trusses/generate";
import type { TrussModel } from "@/domain/trusses/types";
import { createMembersGroup } from "@/render/meshes";
import { MM } from "@/render/profileGeometry";
import { trussShape, type Detail, type ProfileState, type TrussState } from "@/store/configurator";

/** The line the configurator currently produces for */
export const ACTIVE_MACHINE = GOLDEN_INTEGRITY_C89;

export interface SceneResult {
  object: THREE.Object3D;
  members: Member[];
  issues: FeatureIssue[];
  /** Why members cannot be made on ACTIVE_MACHINE (deduplicated) */
  machineIssues: MachineIssue[];
  truss?: { model: TrussModel; determinacy: DeterminacyCheck; splices: number };
}

/** Put the object on the ground (y = 0) and centre it on the origin in x/z */
function settle(object: THREE.Object3D): THREE.Object3D {
  const box = new THREE.Box3().setFromObject(object);
  const centre = box.getCenter(new THREE.Vector3());
  const wrapper = new THREE.Group();
  object.position.set(-centre.x, -box.min.y, -centre.z);
  wrapper.add(object);
  return wrapper;
}

export function buildProfileScene(p: ProfileState): SceneResult {
  const profile = findProfile(p.profileId);
  const length = p.length;
  const features: Feature[] = [
    ...(p.serviceHoles ? serviceHoles(length, profile) : []),
    ...(p.thermalSlots ? thermalSlots(length, profile) : []),
    ...(p.endDimples && profile.family !== "Hat" ? connectionHoles(length, [0, length]) : []),
  ];
  const member: Member = {
    id: "P-1",
    role: "stud",
    profile,
    start: v3(0, 0, 0),
    end: v3(length, 0, 0),
    webAxis: v3(0, 1, 0),
    features,
  };
  const issues = validateFeatures(member);
  // Overlapping punches cannot be triangulated as separate holes — show the plain profile then
  const safe = issues.length === 0 ? member : { ...member, features: [] };
  return { object: settle(createMembersGroup([safe], "detailed")), members: [member], issues, machineIssues: machineIssues([member]) };
}

export function buildTrussScene(t: TrussState, detail: Detail): SceneResult {
  const model = generateTruss({
    span: t.span,
    shape: trussShape(t),
    pattern: t.pattern,
    panels: t.panels,
    overhang: t.overhang,
    chordProfile: findProfile(t.chordProfileId),
    webProfile: findProfile(t.webProfileId),
    maxPieceLength: t.maxPieceLength,
  });
  const { members, splices } = fabricateTruss(model);
  const issues = members.flatMap(validateFeatures);
  return {
    object: settle(createMembersGroup(members, detail)),
    members,
    issues,
    machineIssues: machineIssues(members),
    truss: { model, determinacy: checkDeterminacy(model), splices: splices.length },
  };
}

function machineIssues(members: readonly Member[]): MachineIssue[] {
  const seen = new Map<string, MachineIssue>();
  for (const m of members) for (const i of memberOnMachine(m, ACTIVE_MACHINE)) seen.set(i.text, i);
  return [...seen.values()].sort((a, b) => (a.level === b.level ? 0 : a.level === "error" ? -1 : 1));
}

export interface CutListRow {
  profileId: string;
  role: Member["role"];
  length: number;
  qty: number;
  holes: number;
}

/** Identical pieces grouped — the start of a BOM */
export function cutList(members: readonly Member[]): CutListRow[] {
  const rows = new Map<string, CutListRow>();
  for (const m of members) {
    const length = centrelineLength(m);
    const key = `${m.profile.id}|${m.role}|${length}|${m.features.length}`;
    const row = rows.get(key);
    if (row) row.qty += 1;
    else rows.set(key, { profileId: m.profile.id, role: m.role, length, qty: 1, holes: m.features.length });
  }
  return [...rows.values()].sort((a, b) => a.role.localeCompare(b.role) || b.length - a.length);
}

/** Total centreline metres per profile */
export function metresByProfile(members: readonly Member[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of members) out.set(m.profile.id, (out.get(m.profile.id) ?? 0) + centrelineLength(m) * MM);
  return out;
}
