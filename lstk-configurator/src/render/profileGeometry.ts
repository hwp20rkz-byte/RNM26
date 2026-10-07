import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Vec2 } from "@/domain/geometry/vec";
import type { Feature } from "@/domain/members/types";
import { sectionGeometry, sectionParts } from "@/domain/profiles/section";
import type { ProfileSpec } from "@/domain/profiles/types";

/** Domain works in millimetres, the scene in metres */
export const MM = 0.001;

const toShape = (outline: readonly Vec2[]) => new THREE.Shape(outline.map((p) => new THREE.Vector2(p.x * MM, p.y * MM)));

/**
 * Section outlines are already polylines; curveSegments only affects the arcs
 * of punched holes (16 per arc keeps a Ø5 dimple round and a slot's ends smooth).
 */
function extrude(shape: THREE.Shape, depth: number): THREE.BufferGeometry {
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1, curveSegments: 16 });
}

const unitCache = new Map<string, THREE.BufferGeometry>();

/**
 * The section extruded 1 m along +z. Shared by every instance of a profile —
 * instances scale z by their length, so a building with thousands of members
 * costs one geometry per profile size.
 */
export function unitProfileGeometry(spec: ProfileSpec): THREE.BufferGeometry {
  const key = JSON.stringify(spec);
  let g = unitCache.get(key);
  if (!g) {
    g = extrude(toShape(sectionGeometry(spec).outline), 1);
    unitCache.set(key, g);
  }
  return g;
}

/** Plain profile of a given length (z from 0 to length) */
export function createProfileGeometry(spec: ProfileSpec, lengthMm: number): THREE.BufferGeometry {
  return extrude(toShape(sectionGeometry(spec).outline), lengthMm * MM);
}

/** Stadium (slot) outline centred on (u, v), long side along u */
function obround(path: THREE.Path, u: number, v: number, along: number, across: number): void {
  const r = Math.min(along, across) / 2;
  if (along >= across) {
    const half = along / 2 - r;
    path.moveTo(u - half, v - r);
    path.lineTo(u + half, v - r);
    path.absarc(u + half, v, r, -Math.PI / 2, Math.PI / 2, false);
    path.lineTo(u - half, v + r);
    path.absarc(u - half, v, r, Math.PI / 2, (3 * Math.PI) / 2, false);
  } else {
    const half = across / 2 - r;
    path.moveTo(u + r, v - half);
    path.lineTo(u + r, v + half);
    path.absarc(u, v + half, r, 0, Math.PI, false);
    path.lineTo(u - r, v - half);
    path.absarc(u, v - half, r, Math.PI, 2 * Math.PI, false);
  }
}

function holePath(f: Feature): THREE.Path | null {
  const p = new THREE.Path();
  // Plate is built with v = −y so the final transform is a rotation (see below)
  const u = f.position * MM;
  switch (f.kind) {
    case "service-hole":
      obround(p, u, -f.offset * MM, f.width * MM, f.height * MM);
      return p;
    case "web-slot":
      obround(p, u, -f.offset * MM, f.length * MM, f.width * MM);
      return p;
    case "dimple":
    case "bolt-hole":
      p.absarc(u, -f.offset * MM, (f.diameter / 2) * MM, 0, 2 * Math.PI, false);
      return p;
    case "lip-cut":
    case "flange-cut":
    case "swage":
      // Not modelled in 3D yet: they only remove material at the member ends
      return null;
  }
}

/**
 * Profile with real punched web holes: the flat web is a plate with holes,
 * bends/flanges/lips are extruded strips. Falls back to the plain extrusion
 * for sections without a flat web (Hat) or without web features.
 */
export function createDetailedProfileGeometry(spec: ProfileSpec, lengthMm: number, features: readonly Feature[]): THREE.BufferGeometry {
  const parts = sectionParts(spec);
  const holes = features.map(holePath).filter((p): p is THREE.Path => p !== null);
  if (!parts || holes.length === 0) return createProfileGeometry(spec, lengthMm);

  const L = lengthMm * MM;
  const t = spec.thickness * MM;
  const pieces = parts.rest.map((o) => extrude(toShape(o), L));

  // Plate in (u = along member, v = −y across web), extruded by t
  const plate = new THREE.Shape();
  const vMin = -parts.web.yMax * MM;
  const vMax = -parts.web.yMin * MM;
  plate.moveTo(0, vMin);
  plate.lineTo(L, vMin);
  plate.lineTo(L, vMax);
  plate.lineTo(0, vMax);
  plate.closePath();
  plate.holes.push(...holes);
  const web = extrude(plate, t);
  // (u, v, w) → (x = w − t/2, y = −v, z = u): a proper rotation (det = +1), so winding/normals stay outward
  web.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, -t / 2, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1));

  const merged = mergeGeometries([...pieces, web], false);
  for (const g of [...pieces, web]) g.dispose();
  if (!merged) throw new Error("Не удалось объединить геометрию профиля");
  return merged;
}
