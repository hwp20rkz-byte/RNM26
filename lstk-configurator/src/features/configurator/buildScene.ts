import * as THREE from "three";
import type { Assembly } from "@/domain/assemblies/types";
import { computeBom, type Bom } from "@/domain/bom/bom";
import type { Building } from "@/domain/buildings/generate";
import { findProduct } from "@/domain/catalog/products";
import { IDENTITY } from "@/domain/geometry/frame";
import { v3 } from "@/domain/geometry/vec";
import { memberOnMachine, type MachineIssue } from "@/domain/machines/check";
import { GOLDEN_INTEGRITY_C89 } from "@/domain/machines/golden-integrity-c89";
import { validateFeatures } from "@/domain/members/member";
import { connectionHoles, serviceHoles, thermalSlots } from "@/domain/members/punching";
import type { Feature, Member } from "@/domain/members/types";
import { findProfile } from "@/domain/profiles/catalog";
import { checkDeterminacy, type DeterminacyCheck } from "@/domain/trusses/analysis";
import { fabricateTruss } from "@/domain/trusses/fabricate";
import { generateTruss } from "@/domain/trusses/generate";
import { forceSummary, roofNodeLoads, type ForceSummary } from "@/domain/trusses/loads";
import type { TrussModel } from "@/domain/trusses/types";
import { generateWall } from "@/domain/walls/generate";
import { createAssembliesGroup } from "@/render/assemblies";
import { analyze, type Analysis } from "@/domain/planner/analyze";
import { createHardware } from "@/render/hardware";
import { createProps } from "@/render/props";
import { createSkin } from "@/render/skin";
import { trussShape, type ProjectState } from "@/store/configurator";

/** The line the configurator currently produces for */
export const ACTIVE_MACHINE = GOLDEN_INTEGRITY_C89;

export interface TrussReport {
  model: TrussModel;
  determinacy: DeterminacyCheck;
  /** Bar forces under the user's roof load, if the truss is solvable */
  forces: { byRole: ForceSummary[]; reactionN: number; spacing: number } | null;
}

export interface Scene {
  object: THREE.Object3D;
  assemblies: Assembly[];
  /** member id → member (assembly-local) and its assembly mark */
  index: Map<string, { member: Member; mark: string }>;
  featureIssues: string[];
  machineIssues: MachineIssue[];
  bom: Bom;
  truss: TrussReport | null;
  building: Building | null;
  analysis: Analysis | null;
  /** Translation applied to centre the model — overlays (dimensions, labels) use it */
  offset: [number, number, number];
  /** Model size, m */
  size: [number, number, number];
}

/** Put the model on the ground (y = 0) and centre it in x/z; buildings stand on their own ground */
function settle(object: THREE.Object3D, onGround: boolean): { object: THREE.Object3D; offset: [number, number, number]; size: [number, number, number] } {
  const box = new THREE.Box3().setFromObject(object);
  const centre = box.getCenter(new THREE.Vector3());
  const sz = box.getSize(new THREE.Vector3());
  const wrapper = new THREE.Group();
  const offset: [number, number, number] = [-centre.x, onGround ? 0 : -box.min.y, -centre.z];
  object.position.set(...offset);
  wrapper.add(object);
  return { object: wrapper, offset, size: [sz.x, sz.y, sz.z] };
}

function single(id: string, mark: string, name: string, kind: Assembly["kind"], members: Member[], size: Assembly["size"]): Assembly {
  return { id, mark, kind, name, members, placement: IDENTITY, size, explode: v3(0, 1, 0), layer: 0 };
}

function profileAssembly(p: ProjectState["profile"]): Assembly {
  const profile = findProfile(p.profileId);
  const features: Feature[] = [
    ...(p.serviceHoles ? serviceHoles(p.length, profile) : []),
    ...(p.thermalSlots ? thermalSlots(p.length, profile) : []),
    ...(p.endDimples && profile.family !== "Hat" ? connectionHoles(p.length, [0, p.length]) : []),
  ];
  const member: Member = { id: "P1-1", role: "stud", profile, start: v3(0, 0, 0), end: v3(p.length, 0, 0), webAxis: v3(0, 1, 0), features };
  return single("P1", "P1", "Профиль", "frame", [member], { width: p.length, height: 200 });
}

function trussReport(model: TrussModel, qKpa: number, spacing: number): TrussReport {
  const determinacy = checkDeterminacy(model);
  const forces = determinacy.ok && qKpa > 0 ? { ...forceSummary(model, roofNodeLoads(model, qKpa, spacing)), spacing } : null;
  return { model, determinacy, forces };
}

export function buildScene(s: ProjectState): Scene {
  let assemblies: Assembly[];
  let truss: TrussReport | null = null;
  let building: Building | null = null;
  let analysis: Analysis | null = null;

  switch (s.mode) {
    case "profile":
      assemblies = [profileAssembly(s.profile)];
      break;
    case "wall": {
      const w = s.wall;
      const members = generateWall({ length: w.length, height: w.height, studSpacing: w.studSpacing, noggings: w.noggings, profile: findProfile(w.profileId), openings: w.openings }, "W1");
      assemblies = [single("W1", "W1", "Стеновая панель W1", "wall", members, { width: w.length, height: w.height })];
      break;
    }
    case "truss": {
      const t = s.truss;
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
      const { members } = fabricateTruss(model, { idPrefix: "T1" });
      assemblies = [single("T1", "T1", "Ферма T1", "truss", members, { width: t.span, height: model.height })];
      truss = trussReport(model, s.roofLoadKpa, t.spacing);
      break;
    }
    case "building": {
      analysis = analyze(s.building, s.planner, s.prices);
      building = analysis.building;
      assemblies = building.assemblies;
      const gaps = building.trussPositions.slice(1).map((x, i) => x - building!.trussPositions[i]!);
      truss = trussReport(building.roofTruss, s.roofLoadKpa, Math.max(...gaps, 0));
      break;
    }
  }

  const index = new Map<string, { member: Member; mark: string }>();
  const featureIssues = new Set<string>();
  const machine = new Map<string, MachineIssue>();
  // Identical assemblies (trusses) share pieces: check each mark once
  const checked = new Set<string>();
  for (const a of assemblies) {
    for (const m of a.members) index.set(m.id, { member: m, mark: a.mark });
    if (checked.has(a.mark)) continue;
    checked.add(a.mark);
    for (const m of a.members) {
      for (const i of validateFeatures(m)) featureIssues.add(`${a.mark}: ${i.reason}`);
      for (const i of memberOnMachine(m, ACTIVE_MACHINE)) machine.set(i.text, i);
    }
  }

  const root = createAssembliesGroup(assemblies, s.view.detail);
  if (building) root.add(createHardware(building.hardware));
  if (building && s.view.cladding) root.add(createSkin(building, s.planner.finishes));
  if (building && s.view.props) {
    let kinds: ReturnType<typeof findProduct>["props"] = [];
    try {
      kinds = findProduct(building.input.productId).props;
    } catch {
      /* unknown product id from an old file: no props */
    }
    root.add(createProps(building, kinds, s.planner.birds));
  }
  const { object, offset, size } = settle(root, !!building);

  return {
    object,
    assemblies,
    index,
    featureIssues: [...featureIssues],
    machineIssues: [...machine.values()].sort((a, b) => (a.level === b.level ? 0 : a.level === "error" ? -1 : 1)),
    bom: analysis?.bom ?? computeBom(assemblies, s.prices),
    truss,
    building,
    analysis,
    offset,
    size,
  };
}
