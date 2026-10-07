import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { BUILDING_PRESETS, presetInput } from "@/domain/buildings/presets";
import { applyExplode, highlightMember } from "@/render/assemblies";
import { DEFAULT_PROJECT, parseProject, type Mode, type ProjectState } from "@/store/configurator";
import { buildScene } from "./buildScene";

const project = (patch: Partial<ProjectState>): ProjectState => ({ ...structuredClone(DEFAULT_PROJECT), ...patch });

describe("buildScene", () => {
  it.each(["building", "wall", "truss", "profile"] as Mode[])("%s mode: model, BOM and index agree", (mode) => {
    const s = buildScene(project({ mode }));
    const members = s.assemblies.flatMap((a) => a.members);
    expect(s.index.size).toBe(members.length);
    expect(s.bom.totals.pieces).toBe(members.length);
    const box = new THREE.Box3().setFromObject(s.object);
    expect(box.min.y).toBeCloseTo(0, 6);
  });

  it.each(BUILDING_PRESETS.map((p) => p.id))("preset %s: no line or punching errors, cladding builds", (id) => {
    const s = buildScene(project({ mode: "building", presetId: id, building: presetInput(id), view: { ...DEFAULT_PROJECT.view, cladding: true } }));
    expect(s.machineIssues.filter((i) => i.level === "error")).toEqual([]);
    expect(s.featureIssues).toEqual([]);
    expect(s.truss?.determinacy.ok).toBe(true);
    expect(s.object.getObjectByName("cladding")).toBeDefined();
  });

  it("explode moves assemblies away from home and back", () => {
    const s = buildScene(project({ mode: "building" }));
    const wall = s.object.getObjectByName("W1")!;
    const home = wall.position.clone();
    applyExplode(s.object, 1);
    expect(wall.position.distanceTo(home)).toBeGreaterThan(1);
    applyExplode(s.object, 0);
    expect(wall.position.distanceTo(home)).toBeCloseTo(0, 9);
  });

  it("highlight colours exactly one instance", () => {
    const s = buildScene(project({ mode: "wall" }));
    const id = s.assemblies[0]!.members[5]!.id;
    highlightMember(s.object, id);
    let coloured = 0;
    s.object.traverse((o) => {
      if (!(o instanceof THREE.InstancedMesh) || !o.instanceColor) return;
      const c = new THREE.Color();
      for (let i = 0; i < o.count; i++) {
        o.getColorAt(i, c);
        if (c.r !== 1 || c.g !== 1 || c.b !== 1) coloured += 1;
      }
    });
    expect(coloured).toBe(1);
  });

  it("invalid input surfaces as an error, not a crash", () => {
    const bad = project({ mode: "wall" });
    bad.wall.openings = [{ id: "x", kind: "window", x: 5, width: 900, height: 900, sill: 900 }];
    expect(() => buildScene(bad)).toThrow(/близко к началу/);
  });
});

describe("parseProject", () => {
  it("round-trips a project and resets the explode slider", () => {
    const p = project({ mode: "truss", view: { ...DEFAULT_PROJECT.view, explode: 0.7 } });
    const back = parseProject(JSON.parse(JSON.stringify(p)))!;
    expect(back.mode).toBe("truss");
    expect(back.view.explode).toBe(0);
  });

  it("rejects foreign JSON and fills missing fields of old saves", () => {
    expect(parseProject({ hello: 1 })).toBeNull();
    const old = JSON.parse(JSON.stringify(project({})));
    delete old.prices;
    delete old.truss.spacing;
    const p = parseProject(old)!;
    expect(p.prices).toEqual(DEFAULT_PROJECT.prices);
    expect(p.truss.spacing).toBe(600);
  });
});
