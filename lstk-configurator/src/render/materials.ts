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
      // Hot-dip galvanised Z275: a bright, fairly smooth metal. The viewport
      // provides a procedural studio environment to reflect (no CDN HDRs)
      color: new THREE.Color().setHSL(210 / 360, 0.05, tone),
      metalness: 0.7,
      roughness: 0.38,
      side: THREE.DoubleSide,
      // Closed extrusions: cast shadows from back faces only, otherwise a
      // double-sided 1 mm sheet shadows itself (dark flecks on studs/posts)
      shadowSide: THREE.BackSide,
    });
    cache.set(key, m);
  }
  return m;
}
