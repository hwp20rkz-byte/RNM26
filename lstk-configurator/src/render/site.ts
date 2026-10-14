import * as THREE from "three";
import type { Rect, SiteItem, SitePlan } from "@/domain/site/site";
import { box, cyl, mat } from "./kit";
import { MM } from "./profileGeometry";

/**
 * The plot in 3D: lawn, asphalt with bay markings (accessible bays blue, EV
 * green), paving round the building, solar LED lamps, trees and whatever the
 * landscape editor placed. Every placed item carries `userData.siteId`, so a
 * click finds it for the eraser.
 */

function slab(g: THREE.Group, r: Rect, y: number, t: number, m: THREE.Material) {
  const mesh = box(g, r.x0, y, r.z0, r.x1 - r.x0, t, r.z1 - r.z0, m);
  mesh.castShadow = false;
  return mesh;
}

function deciduous(g: THREE.Group, x: number, z: number, s = 1) {
  cyl(g, x, 1300 * s, z, 110 * s, 2600 * s, mat("hsl(25 30% 28%)", 0.95));
  for (const [dx, dy, dz, r] of [[0, 3600, 0, 1500], [700, 3200, 300, 1000], [-600, 3300, -400, 1100]] as const) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s * MM, 1), mat("hsl(105 38% 34%)", 0.95));
    m.position.set((x + dx * s) * MM, dy * s * MM, (z + dz * s) * MM);
    m.castShadow = true;
    m.userData.ownsGeometry = true;
    g.add(m);
  }
}

function conifer(g: THREE.Group, x: number, z: number) {
  cyl(g, x, 500, z, 120, 1000, mat("hsl(25 30% 25%)", 0.95));
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.ConeGeometry((1500 - i * 380) * MM, 2400 * MM, 9), mat("hsl(150 32% 24%)", 0.95));
    m.position.set(x * MM, (1900 + i * 1300) * MM, z * MM);
    m.castShadow = true;
    m.userData.ownsGeometry = true;
    g.add(m);
  }
}

/** Solar LED street lamp: 6 m pole, 40 W head, 120 W panel on top */
function lamp(g: THREE.Group, x: number, z: number) {
  cyl(g, x, 3000, z, 55, 6000, mat("hsl(210 6% 40%)", 0.4, 0.7));
  box(g, x - 60, 5800, z, 120, 60, 700, mat("hsl(210 6% 35%)", 0.4, 0.7));
  const head = box(g, x - 160, 5740, z + 500, 320, 50, 380, mat("hsl(210 6% 30%)", 0.4, 0.6));
  head.castShadow = false;
  const led = new THREE.MeshStandardMaterial({ color: "#fff6e0", emissive: new THREE.Color("#ffe8b0"), emissiveIntensity: 1.2 });
  led.userData.ownsMaterial = true;
  box(g, x - 140, 5735, z + 520, 280, 6, 340, led);
  const panel = box(g, x - 330, 6150, z - 450, 660, 30, 1000, mat("hsl(225 45% 18%)", 0.2, 0.6));
  panel.rotation.x = -0.6;
}

function item(i: SiteItem): THREE.Group {
  const g = new THREE.Group();
  switch (i.kind) {
    case "tree":
      deciduous(g, 0, 0);
      break;
    case "conifer":
      conifer(g, 0, 0);
      break;
    case "shrub":
      for (const [dx, dz, r] of [[0, 0, 550], [500, 250, 400], [-450, 200, 420]] as const) {
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r * MM, 1), mat("hsl(115 35% 30%)", 0.95));
        m.position.set(dx * MM, r * 0.8 * MM, dz * MM);
        m.castShadow = true;
        m.userData.ownsGeometry = true;
        g.add(m);
      }
      break;
    case "flowerbed": {
      box(g, -1000, 0, -1000, 2000, 250, 2000, mat("hsl(25 25% 30%)", 0.95));
      const colors = ["hsl(350 70% 55%)", "hsl(45 90% 58%)", "hsl(280 45% 60%)", "hsl(20 85% 58%)"];
      for (let k = 0; k < 16; k++) {
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), mat(colors[k % 4]!, 0.8));
        m.position.set((-0.75 + (k % 4) * 0.5) * 1, 0.33, (-0.75 + Math.floor(k / 4) * 0.5) * 1);
        m.userData.ownsGeometry = true;
        g.add(m);
      }
      break;
    }
    case "bench":
      box(g, -900, 420, -220, 1800, 50, 440, mat("hsl(30 45% 50%)", 0.7));
      box(g, -900, 470, 180, 1800, 400, 40, mat("hsl(30 45% 50%)", 0.7));
      for (const s of [-1, 1]) box(g, s * 750 - 30, 0, -220, 60, 470, 440, mat("hsl(210 6% 25%)", 0.4, 0.7));
      break;
    case "lamp":
      lamp(g, 0, 0);
      break;
    case "bin":
      cyl(g, 0, 450, 0, 230, 900, mat("hsl(210 8% 30%)", 0.5, 0.5));
      break;
    case "bikeRack":
      for (let k = 0; k < 5; k++) {
        const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.025, 6, 16, Math.PI), mat("hsl(210 6% 70%)", 0.3, 0.9));
        hoop.position.set(-1.0 + k * 0.5, 0, 0);
        hoop.userData.ownsGeometry = true;
        g.add(hoop);
      }
      break;
  }
  g.position.set(i.x * MM, 0, i.z * MM);
  g.rotation.y = (i.rot * Math.PI) / 180;
  g.userData.siteId = i.id;
  return g;
}

export function createSite(p: SitePlan): THREE.Group {
  const g = new THREE.Group();
  g.name = "site";
  slab(g, p.plot, -2, 4, mat("hsl(95 38% 46%)", 1));
  for (const r of p.asphalt) slab(g, r, 2, 30, mat("hsl(220 6% 26%)", 0.95));
  for (const r of p.paving) slab(g, r, 4, 40, mat("hsl(30 8% 70%)", 0.85));
  const white = mat("hsl(0 0% 94%)", 0.7);
  for (const b of p.bays) {
    if (b.kind !== "car") slab(g, { x0: b.x0 + 80, x1: b.x1 - 80, z0: b.z0 + 80, z1: b.z1 - 80 }, 33, 4, mat(b.kind === "accessible" ? "hsl(210 70% 45%)" : "hsl(145 55% 38%)", 0.8));
    slab(g, { x0: b.x0 - 50, x1: b.x0 + 50, z0: b.z0, z1: b.z1 }, 33, 5, white);
    slab(g, { x0: b.x1 - 50, x1: b.x1 + 50, z0: b.z0, z1: b.z1 }, 33, 5, white);
  }
  for (const l of p.lamps) lamp(g, l.x, l.z);
  for (const t of p.trees) (t.kind === "conifer" ? conifer : deciduous)(g, t.x, t.z);
  for (const i of p.items) g.add(item(i));
  g.userData.level = 0;
  return g;
}

/** The site item a click landed on, if any */
export function siteIdFromHit(o: THREE.Object3D | null): string | null {
  for (let x = o; x; x = x.parent) if (typeof x.userData.siteId === "string") return x.userData.siteId as string;
  return null;
}
