import * as THREE from "three";
import type { MemberRole } from "@/domain/members/types";

/**
 * Galvanised steel. Chords read slightly darker than webs so the structure is
 * legible without colour-coding (identity is also in the BOM / labels).
 */
const cache = new Map<string, THREE.MeshStandardMaterial>();

export function steelMaterial(role: MemberRole | "default" = "default"): THREE.MeshStandardMaterial {
  const tone = role === "top-chord" || role === "bottom-chord" || role === "track" ? 0.62 : 0.72;
  const key = `${tone}`;
  let m = cache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(210 / 360, 0.06, tone),
      // Low metalness on purpose: a metallic surface only shows what it reflects, and
      // the scene has no environment map (HDRs would come from a CDN at runtime)
      metalness: 0.25,
      roughness: 0.5,
      side: THREE.DoubleSide,
    });
    cache.set(key, m);
  }
  return m;
}
