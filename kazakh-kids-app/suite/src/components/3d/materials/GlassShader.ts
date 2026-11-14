/**
 * RuneGlassMaterial — custom GLSL «rune glass»: a fresnel rim with thin-film iridescence, a slow
 * holographic scan line and an emissive rune mask that flares when `uActivate` goes to 1.
 * It fakes the look of transmissive glass at a fraction of the cost (no extra render pass), so it is
 * the default on medium/low tiers; the high tier layers drei's MeshTransmissionMaterial on top.
 * Output goes above 1.0 on purpose: the Bloom pass picks the runes and rims up.
 */
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend, type ThreeElement } from '@react-three/fiber';

export interface RuneGlassUniforms {
  uTime: number;
  uColor: THREE.Color;
  uRim: THREE.Color;
  uActivate: number;
  uOpacity: number;
  uRune: THREE.Texture | null;
  uHasRune: number;
}

const vertex = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vViewDirW;
  varying vec3 vPosW;
  varying vec2 vUv;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPosW = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDirW = normalize(cameraPosition - world.xyz);
    vUv = uv;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform vec3 uRim;
  uniform float uActivate;
  uniform float uOpacity;
  uniform sampler2D uRune;
  uniform float uHasRune;
  varying vec3 vNormalW;
  varying vec3 vViewDirW;
  varying vec3 vPosW;
  varying vec2 vUv;

  // cheap thin-film iridescence: hue shifts with the viewing angle
  vec3 iridescence(float t) {
    return 0.5 + 0.5 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + t));
  }

  void main() {
    vec3 n = normalize(vNormalW);
    if (!gl_FrontFacing) n = -n;
    float ndv = clamp(dot(n, normalize(vViewDirW)), 0.0, 1.0);
    float fresnel = pow(1.0 - ndv, 2.6);

    vec3 base = uColor * (0.18 + 0.35 * ndv);
    vec3 film = iridescence(fresnel * 1.4 + uTime * 0.05) * fresnel * 0.55;
    vec3 rim = uRim * fresnel * (1.4 + 2.2 * uActivate);

    float scan = smoothstep(0.92, 1.0, sin(vPosW.y * 9.0 - uTime * 2.4) * 0.5 + 0.5) * 0.35;
    float rune = uHasRune > 0.5 ? texture2D(uRune, vUv).a : 0.0;
    vec3 runeGlow = uRim * rune * (0.6 + 3.4 * uActivate) * (0.85 + 0.15 * sin(uTime * 3.0));

    vec3 col = base + film + rim + uRim * scan + runeGlow;
    float alpha = clamp(uOpacity * (0.35 + fresnel * 0.65) + rune * 0.8 + uActivate * 0.25, 0.0, 1.0);
    gl_FragColor = vec4(col, alpha);
  }
`;

export const RuneGlassMaterial = shaderMaterial(
  { uTime: 0, uColor: new THREE.Color('#00AFCA'), uRim: new THREE.Color('#7DF9FF'), uActivate: 0, uOpacity: 0.85, uRune: null as THREE.Texture | null, uHasRune: 0 } satisfies RuneGlassUniforms,
  vertex,
  fragment,
  (m) => {
    if (!m) return;
    m.transparent = true;
    m.depthWrite = false;
    m.side = THREE.DoubleSide;
    m.toneMapped = false;
  }
);

extend({ RuneGlassMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    runeGlassMaterial: ThreeElement<typeof RuneGlassMaterial>;
  }
}

/* ---------------------------------------------------------------- rune textures */

/**
 * Procedural runes (one per case) drawn on a canvas: geometric strokes in the spirit of Turkic
 * tamga signs — no font or image assets needed.
 */
const RUNES: number[][][] = [
  [[0.5, 0.15, 0.5, 0.85]],                                                           // Атау — the bare stem
  [[0.5, 0.15, 0.5, 0.85], [0.5, 0.35, 0.78, 0.15], [0.5, 0.35, 0.22, 0.15]],         // Ілік — branching «of»
  [[0.2, 0.5, 0.8, 0.5], [0.6, 0.3, 0.8, 0.5], [0.6, 0.7, 0.8, 0.5]],                 // Барыс — arrow «to»
  [[0.25, 0.2, 0.75, 0.8], [0.75, 0.2, 0.25, 0.8]],                                   // Табыс — the mark «X»
  [[0.2, 0.75, 0.8, 0.75], [0.3, 0.75, 0.3, 0.35], [0.7, 0.75, 0.7, 0.35], [0.3, 0.35, 0.7, 0.35]], // Жатыс — a dwelling
  [[0.8, 0.5, 0.2, 0.5], [0.4, 0.3, 0.2, 0.5], [0.4, 0.7, 0.2, 0.5], [0.8, 0.25, 0.8, 0.75]],       // Шығыс — «out of»
  [[0.3, 0.2, 0.3, 0.8], [0.7, 0.2, 0.7, 0.8], [0.3, 0.5, 0.7, 0.5]]                  // Көмектес — «together»
];

const runeCache = new Map<number, THREE.CanvasTexture>();
export function runeTexture(index: number): THREE.CanvasTexture {
  const hit = runeCache.get(index); if (hit) return hit;
  const size = 256, c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, size, size);
  g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
  g.shadowColor = '#fff'; g.shadowBlur = 18; g.lineWidth = 16;
  (RUNES[index % RUNES.length]).forEach(([x0, y0, x1, y1]) => { g.beginPath(); g.moveTo(x0 * size, y0 * size); g.lineTo(x1 * size, y1 * size); g.stroke(); });
  const tx = new THREE.CanvasTexture(c);
  tx.colorSpace = THREE.SRGBColorSpace;
  runeCache.set(index, tx);
  return tx;
}
