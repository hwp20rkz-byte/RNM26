import * as THREE from "three";

/**
 * Procedural surface textures drawn once on a canvas and shared by every
 * scene: nothing is fetched at runtime. They tile, so one small canvas covers
 * any area. In tests (no DOM) every getter returns null and the materials
 * stay plain.
 */

/** Deterministic noise: the same texture on every load */
export function prng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  return g ? [c, g] : null;
}

/** Fine grain over what is already drawn: ± `amount` of brightness per pixel */
export function grain(g: CanvasRenderingContext2D, size: number, amount: number, seed: number) {
  const img = g.getImageData(0, 0, size, size);
  const r = prng(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    const k = 1 + (r() - 0.5) * 2 * amount;
    img.data[i] = Math.min(255, img.data[i]! * k);
    img.data[i + 1] = Math.min(255, img.data[i + 1]! * k);
    img.data[i + 2] = Math.min(255, img.data[i + 2]! * k);
  }
  g.putImageData(img, 0, 0);
}

function finishTexture(c: HTMLCanvasElement, srgb = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const cache = new Map<string, THREE.CanvasTexture | null>();
function once(key: string, make: () => THREE.CanvasTexture | null): THREE.CanvasTexture | null {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key)!;
}

/** Blotches of the size of a tuft / a patch of wear, wrapping round the tile */
function blotches(g: CanvasRenderingContext2D, size: number, n: number, rMin: number, rMax: number, colors: string[], seed: number) {
  const r = prng(seed);
  for (let i = 0; i < n; i++) {
    const x = r() * size;
    const y = r() * size;
    const rad = rMin + r() * (rMax - rMin);
    g.fillStyle = colors[Math.floor(r() * colors.length)]!;
    for (const dx of [-size, 0, size])
      for (const dy of [-size, 0, size]) {
        if (x + dx + rad < 0 || x + dx - rad > size || y + dy + rad < 0 || y + dy - rad > size) continue;
        g.beginPath();
        g.ellipse(x + dx, y + dy, rad, rad * (0.5 + r() * 0.5), r() * Math.PI, 0, Math.PI * 2);
        g.fill();
      }
  }
}

/** Lawn colour, shared by the plot and the land around it */
export const LAWN = "hsl(98 34% 40%)";

/** Mown lawn, one tile = 6 m: patches of lighter and darker green, then blade-scale grain */
export const grassTexture = () =>
  once("grass", () => {
    const cg = canvas(512);
    if (!cg) return null;
    const [c, g] = cg;
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, 512, 512);
    blotches(g, 512, 260, 10, 34, ["rgba(0,0,0,0.035)", "rgba(40,30,0,0.03)", "rgba(255,255,220,0.035)"], 11);
    blotches(g, 512, 1800, 1, 2.5, ["rgba(0,0,0,0.08)", "rgba(255,255,255,0.07)"], 12);
    grain(g, 512, 0.08, 13);
    return finishTexture(c);
  });

/** Asphalt, one tile = 3 m: aggregate specks and a few worn patches */
export const asphaltTexture = () =>
  once("asphalt", () => {
    const cg = canvas(256);
    if (!cg) return null;
    const [c, g] = cg;
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, 256, 256);
    blotches(g, 256, 30, 20, 60, ["rgba(0,0,0,0.08)", "rgba(255,255,255,0.05)"], 21);
    blotches(g, 256, 900, 0.6, 1.6, ["rgba(255,255,255,0.22)", "rgba(0,0,0,0.25)"], 22);
    grain(g, 256, 0.12, 23);
    return finishTexture(c);
  });

/** Concrete paving slabs 500 × 500 mm, one tile = 1 m */
export const pavingTexture = () =>
  once("paving", () => {
    const cg = canvas(256);
    if (!cg) return null;
    const [c, g] = cg;
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, 256, 256);
    const r = prng(31);
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 2; x++) {
        g.fillStyle = `rgba(0,0,0,${0.02 + r() * 0.08})`;
        g.fillRect(x * 128, y * 128, 128, 128);
      }
    g.fillStyle = "rgba(0,0,0,0.3)";
    for (const p of [0, 128]) {
      g.fillRect(p, 0, 3, 256);
      g.fillRect(0, p, 256, 3);
    }
    grain(g, 256, 0.08, 32);
    return finishTexture(c);
  });

/** A soft pool of light for the ground under a lamp or a window (additive blending) */
export const glowTexture = () =>
  once("glow", () => {
    const cg = canvas(128);
    if (!cg) return null;
    const [c, g] = cg;
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.35, "rgba(255,255,255,0.45)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });

/**
 * Scale a mesh's UVs so one texture tile covers `tile` metres: a shared
 * texture (repeat 1) then tiles in world units on meshes of any size.
 */
export function tileUV(geo: THREE.BufferGeometry, u: number, v: number) {
  const uv = geo.getAttribute("uv");
  if (!uv) return;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * u, uv.getY(i) * v);
  uv.needsUpdate = true;
}
