import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { productInput } from "@/domain/catalog/products";
import { SITE_OFF } from "@/domain/site/site";
import { buildScene } from "@/features/configurator/buildScene";
import { DEFAULT_PROJECT } from "@/store/configurator";
import { applyNight } from "./night";
import { prng } from "./textures";

function marked(root: THREE.Object3D, key: "glass" | "lamp"): THREE.MeshStandardMaterial[] {
  const out = new Set<THREE.MeshStandardMaterial>();
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m.userData[key]) out.add(m as THREE.MeshStandardMaterial);
  });
  return [...out];
}

describe("evening scene", () => {
  const p = structuredClone(DEFAULT_PROJECT);
  const s = buildScene({ ...p, mode: "building", building: productInput("bjj"), planner: { ...p.planner, site: { ...SITE_OFF, enabled: true, items: [] } } });

  it("lights the windows and turns the lamps up after sunset, and back by day", () => {
    const glass = marked(s.object, "glass");
    const lamps = marked(s.object, "lamp");
    expect(glass.length).toBeGreaterThan(0);
    expect(lamps.length).toBeGreaterThan(0);
    applyNight(s.object, true);
    expect(glass[0]!.emissive.getHex()).not.toBe(0);
    expect(glass[0]!.opacity).toBeGreaterThan(0.8);
    expect(lamps[0]!.emissiveIntensity).toBeGreaterThan(5);
    applyNight(s.object, false);
    expect(glass[0]!.emissive.getHex()).toBe(0);
    expect(lamps[0]!.emissiveIntensity).toBeCloseTo(1.2);
  });

  it("the attic insulation stays under the roof at the eaves", () => {
    const b = s.building!;
    const tan = Math.tan((b.input.roof.pitchDeg * Math.PI) / 180);
    let checked = 0;
    s.object.getObjectByName("interior")!.traverse((o) => {
      if (!(o instanceof THREE.Mesh) || !(o.geometry instanceof THREE.BoxGeometry)) return;
      const m = o.material as THREE.MeshStandardMaterial;
      if (m.roughness !== 1 || !m.userData.ownsMaterial) return;
      const { depth, height } = o.geometry.parameters;
      const z0 = (o.position.z - depth / 2) * 1000;
      // Roof underside over the front wall plate at the wool's front edge
      expect(tan * z0).toBeGreaterThanOrEqual(height * 1000 - 1);
      checked++;
    });
    expect(checked).toBeGreaterThan(0);
  });
});

describe("procedural textures", () => {
  it("noise is deterministic and in [0, 1)", () => {
    const a = prng(7);
    const b = prng(7);
    for (let i = 0; i < 100; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
