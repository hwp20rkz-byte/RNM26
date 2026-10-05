import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { v3 } from "@/domain/geometry/vec";
import { validateFeatures } from "@/domain/members/member";
import { connectionHoles, thermalSlots } from "@/domain/members/punching";
import type { Member } from "@/domain/members/types";
import { findProfile } from "@/domain/profiles/catalog";
import { sectionProperties } from "@/domain/profiles/section";
import type { CSpec, USpec } from "@/domain/profiles/types";
import { generateTruss } from "@/domain/trusses/generate";
import { createCProfileMesh, createMembersGroup, createTrussMesh, createUProfileMesh, memberMatrix } from "./meshes";
import { MM } from "./profileGeometry";

const box = (g: THREE.BufferGeometry) => {
  g.computeBoundingBox();
  return g.boundingBox!;
};

/** Signed volume via the divergence theorem — positive iff all faces point outward */
function signedVolume(g: THREE.BufferGeometry): number {
  const pos = g.getAttribute("position");
  const idx = g.getIndex();
  const n = idx ? idx.count : pos.count;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  let v = 0;
  for (let i = 0; i < n; i += 3) {
    const [i0, i1, i2] = idx ? [idx.getX(i), idx.getX(i + 1), idx.getX(i + 2)] : [i, i + 1, i + 2];
    a.fromBufferAttribute(pos, i0);
    b.fromBufferAttribute(pos, i1);
    c.fromBufferAttribute(pos, i2);
    v += a.dot(b.clone().cross(c)) / 6;
  }
  return v;
}

const C150 = findProfile("C150x50x13x1.5") as CSpec;

describe("createCProfileMesh / createUProfileMesh", () => {
  it("plain C: bounding box = section × length, closed and outward-facing", () => {
    const mesh = createCProfileMesh(C150, 3000);
    const b = box(mesh.geometry);
    // three.js stores positions as float32 → ~1e-7 relative precision
    expect(b.max.z - b.min.z).toBeCloseTo(3, 6);
    expect(b.max.y - b.min.y).toBeCloseTo(0.15, 6);
    expect(b.max.x - b.min.x).toBeCloseTo(0.05, 6);
    // Volume = exact section area × length; positive means faces point outward
    expect(signedVolume(mesh.geometry)).toBeCloseTo(sectionProperties(C150).area * MM * MM * 3, 7);
  });

  it("detailed C with holes: same envelope, less steel, still outward-facing", () => {
    const plain = createCProfileMesh(C150, 2700);
    // A thermal stud: slots + end dimples (service holes would overlap the slots — see validateFeatures)
    const holes = [...thermalSlots(2700, C150), ...connectionHoles(2700, [0, 2700])];
    expect(validateFeatures({ id: "x", role: "stud", profile: C150, start: v3(0, 0, 0), end: v3(0, 2700, 0), webAxis: v3(0, 0, 1), features: holes })).toEqual([]);
    const punched = createCProfileMesh(C150, 2700, { features: holes });
    const bp = box(plain.geometry);
    const bh = box(punched.geometry);
    expect(bh.min.distanceTo(bp.min)).toBeLessThan(1e-6);
    expect(bh.max.distanceTo(bp.max)).toBeLessThan(1e-6);
    const vPlain = signedVolume(plain.geometry);
    const vPunched = signedVolume(punched.geometry);
    expect(vPunched).toBeGreaterThan(0);
    expect(vPunched).toBeLessThan(vPlain);
    // Removed steel ≈ hole areas × t
    const t = 1.5 * MM;
    const obroundArea = (w: number, h: number) => (w - h) * h + (Math.PI * h * h) / 4;
    const removed =
      holes.reduce((a, f) => {
        if (f.kind === "service-hole") return a + obroundArea(f.width, f.height);
        if (f.kind === "web-slot") return a + obroundArea(f.length, f.width);
        if (f.kind === "dimple" || f.kind === "bolt-hole") return a + (Math.PI * f.diameter * f.diameter) / 4;
        return a;
      }, 0) *
      MM *
      MM *
      t;
    expect((vPlain - vPunched) / removed).toBeGreaterThan(0.97);
    expect((vPlain - vPunched) / removed).toBeLessThan(1.03);
  });

  it("U track mesh", () => {
    const u = findProfile("U152x40x1.2") as USpec;
    const b = box(createUProfileMesh(u, 1000).geometry);
    expect(b.max.y - b.min.y).toBeCloseTo(0.152, 6);
  });
});

describe("memberMatrix", () => {
  it("maps section axes onto the member frame and scales unit length", () => {
    const m: Member = {
      id: "m",
      role: "stud",
      profile: C150,
      start: v3(1000, 0, 0),
      end: v3(1000, 2500, 0),
      webAxis: v3(0, 0, 1),
      features: [],
    };
    const mat = memberMatrix(m, 2.5);
    const end = new THREE.Vector3(0, 0, 1).applyMatrix4(mat);
    expect(end.x).toBeCloseTo(1, 9);
    expect(end.y).toBeCloseTo(2.5, 9);
    const webDir = new THREE.Vector3(0, 1, 0).transformDirection(mat);
    expect(webDir.z).toBeCloseTo(1, 9);
    expect(mat.determinant()).toBeGreaterThan(0);
  });
});

describe("createTrussMesh", () => {
  const input = {
    span: 9000,
    shape: { kind: "triangular", pitchDeg: 25 } as const,
    pattern: "howe" as const,
    panels: 6,
    overhang: 400,
    chordProfile: findProfile("C89x41x11x0.95s"),
    webProfile: findProfile("C89x41x11x0.95s"),
    maxPieceLength: 12000,
  };

  it("instanced: one InstancedMesh per profile×role, instance count = member count", () => {
    const group = createTrussMesh(input);
    const members = group.userData.members as Member[];
    const count = group.children.reduce((a, c) => a + (c as THREE.InstancedMesh).count, 0);
    expect(count).toBe(members.length);
    expect(group.children.every((c) => c instanceof THREE.InstancedMesh)).toBe(true);
  });

  it("world bounds cover the span plus eaves and the ridge height", () => {
    const model = generateTruss(input);
    const group = createTrussMesh(model);
    const b = new THREE.Box3().setFromObject(group);
    const eaves = 0.4 * Math.cos((25 * Math.PI) / 180);
    expect(b.min.x).toBeLessThan(-eaves + 0.05);
    expect(b.max.x).toBeGreaterThan(9 + eaves - 0.05);
    expect(b.max.y).toBeGreaterThan(model.height * MM);
  });

  it("detailed: one mesh per member with holes", () => {
    const group = createMembersGroup(createTrussMesh(input).userData.members as Member[], "detailed");
    expect(group.children.every((c) => c instanceof THREE.Mesh && !(c instanceof THREE.InstancedMesh))).toBe(true);
  });
});
