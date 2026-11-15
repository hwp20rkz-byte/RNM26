import * as THREE from "three";

/**
 * After sunset the building lives: windows glow from inside, the site lamps
 * are on and throw pools of light. The scene marks what can light up
 * (`userData.glass`, `userData.lamp`, `userData.night`); this switches it.
 */
export function applyNight(root: THREE.Object3D, night: boolean) {
  const seen = new Set<THREE.Material>();
  root.traverse((o) => {
    if (o.userData.night) o.visible = night;
    if (!(o instanceof THREE.Mesh)) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (seen.has(m)) continue;
      seen.add(m);
      const std = m as THREE.MeshStandardMaterial;
      if (m.userData.glass) {
        std.emissive.set(night ? "#ffb25c" : "#000000");
        std.emissiveIntensity = night ? 1.7 : 1;
        std.opacity = night ? 0.9 : 0.55;
      } else if (m.userData.lamp) std.emissiveIntensity = night ? 7 : 1.2;
    }
  });
}
