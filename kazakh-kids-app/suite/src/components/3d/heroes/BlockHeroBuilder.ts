/**
 * BlockHeroBuilder — the eight blocky QazaqVerse characters as data, for the 3D hall (React Three Fiber).
 * Proportions and palette mirror the main game's humanoid (web/v3d.js) and characters (src/games/characters.ts),
 * so a hero looks the same in the main game and in the hall. 100 % procedural: boxes, cylinders and spheres,
 * no model files. The face is built from blocks (eyes, mouth) so the mouth can follow the voice (lip-sync).
 *
 * Coordinates: metres, Y up, the hero faces +Z, feet at y = 0, ~3.3 m tall (head top at 3.2).
 */
export type HeroId = 'batyr' | 'aisulu' | 'tayson' | 'azhebot' | 'apai' | 'anel' | 'alibek' | 'zhalkau';
export type PartId = 'root' | 'torso' | 'head' | 'armL' | 'armR' | 'legL' | 'legR';
export type Move = 'idle' | 'wave' | 'cheer' | 'jump360' | 'dombra' | 'punch' | 'levitate' | 'bata' | 'yawn' | 'power' | 'sit' | 'lie' | 'hold';
type V3 = [number, number, number];

export interface Piece { part: PartId; shape: 'box' | 'cyl' | 'ball'; size: number[]; pos: V3; rot?: V3; color: string; glow?: boolean; opacity?: number }
export interface HeroSpec {
  id: HeroId; kk: string; voice: string;
  palette: { skin: string; hair: string; top: string; sleeve: string; pants: string; shoes: string };
  face: { style: 'eyes' | 'visor' | 'glasses' | 'screen' | 'sleepy'; eye: string; glow?: string };
  hover?: boolean; signature: Move; pieces: Piece[];
}

export const NEON = { cyan: '#22e6ff', pink: '#ff4fd8', gold: '#ffc93c', violet: '#9b6bff', red: '#ff4d5e', lime: '#7dff5a' };

/** Body parts of the humanoid: [size w,h,d] and position of each pivot (arms and legs swing from the shoulder / hip). */
export const BODY = {
  head: { size: [1.25, 1.15, 1.1] as V3, pos: [0, 2.62, 0] as V3 },
  torso: { size: [1.0, 1.1, 0.56] as V3, pos: [0, 1.48, 0] as V3 },
  arm: { pivot: [0.68, 2.0, 0] as V3, sleeve: { size: [0.34, 1.0, 0.4] as V3, pos: [0, -0.5, 0] as V3 }, hand: { size: [0.34, 0.22, 0.4] as V3, pos: [0, -1.08, 0] as V3 } },
  leg: { pivot: [0.26, 0.95, 0] as V3, pants: { size: [0.44, 0.75, 0.46] as V3, pos: [0, -0.38, 0] as V3 }, shoe: { size: [0.46, 0.2, 0.6] as V3, pos: [0, -0.85, 0.06] as V3 } },
  /** Face blocks sit on the front of the head (z = half depth + 1 mm). */
  faceZ: 0.556, eyes: { size: [0.17, 0.17, 0.02] as V3, x: 0.27, y: 0.08 }, mouth: { size: [0.38, 0.08, 0.02] as V3, pos: [0, -0.26, 0] as V3 }
};

const box = (part: PartId, size: number[], pos: V3, color: string, extra: Partial<Piece> = {}): Piece => ({ part, shape: 'box', size, pos, color, ...extra });
const cyl = (part: PartId, size: number[], pos: V3, color: string, extra: Partial<Piece> = {}): Piece => ({ part, shape: 'cyl', size, pos, color, ...extra });
const ball = (part: PartId, r: number, pos: V3, color: string, extra: Partial<Piece> = {}): Piece => ({ part, shape: 'ball', size: [r], pos, color, ...extra });

export const HEROES: Record<HeroId, HeroSpec> = {
  batyr: {
    id: 'batyr', kk: 'Батыр-X', voice: 'M1', signature: 'jump360',
    palette: { skin: '#e8b98a', hair: '#2b2230', top: '#1b2a5c', sleeve: '#2456c9', pants: '#1b2340', shoes: '#ffc93c' },
    face: { style: 'visor', eye: NEON.cyan, glow: '#38bdf8' },
    pieces: [
      box('root', [1.16, 1.3, 0.7], [0, 1.4, 0], NEON.cyan, { opacity: 0.38 }),                                  // holographic шапан
      box('root', [0.12, 1.3, 0.72], [-0.2, 1.4, 0.01], NEON.gold, { glow: true }), box('root', [0.12, 1.3, 0.72], [0.2, 1.4, 0.01], NEON.gold, { glow: true }),
      box('root', [1.18, 0.1, 0.72], [0, 0.8, 0], NEON.gold, { glow: true }),
      box('head', [1.35, 0.3, 1.2], [0, 0.62, 0], '#ffc93c'), cyl('head', [0.12, 0.5, 0.5], [0, 0.98, 0], '#2456c9'), ball('head', 0.12, [0, 1.3, 0], NEON.cyan, { glow: true }),
      box('root', [0.5, 0.2, 0.24], [-0.62, 2.12, 0], NEON.cyan, { glow: true }), box('root', [0.5, 0.2, 0.24], [0.62, 2.12, 0], NEON.gold, { glow: true }),   // turquoise-gold pauldrons
      cyl('root', [0.06, 0.06, 1.7], [0.5, 1.9, -0.5], '#4b3a2a', { rot: [0, 0, -0.5] }), ball('root', 0.26, [0.92, 2.65, -0.5], NEON.cyan, { glow: true })     // laser шоқпар
    ]
  },
  aisulu: {
    id: 'aisulu', kk: 'Айсұлу Neon', voice: 'T4', signature: 'dombra',
    palette: { skin: '#f3c9a5', hair: '#2a1b3d', top: '#18b7a6', sleeve: '#ffffff', pants: '#3a2f66', shoes: '#ffffff' },
    face: { style: 'glasses', eye: '#7a3fd0', glow: NEON.cyan },
    pieces: [
      cyl('head', [0.6, 0.66, 0.34], [0, 0.72, 0], '#7a3fd0'), cyl('head', [0.61, 0.67, 0.08], [0, 0.6, 0], NEON.gold, { glow: true }),   // тюбетейка
      box('head', [0.14, 0.5, 0.5], [-0.7, 0.05, 0], '#22262e'), box('head', [0.14, 0.5, 0.5], [0.7, 0.05, 0], '#22262e'), box('head', [1.5, 0.1, 0.16], [0, 0.66, -0.1], '#22262e'), // headphones
      ...[-1, 1].flatMap((s) => [0, 1, 2, 3, 4].map((i) => box('head', [0.2 - i * 0.015, 0.22, 0.2 - i * 0.015], [s * 0.66, -0.5 - i * 0.24, -0.2], i % 2 ? NEON.pink : NEON.violet, { glow: true }))), // glowing braids
      box('root', [1.02, 0.12, 0.58], [0, 1.0, 0], NEON.pink, { glow: true }),
      box('legL', [0.5, 0.07, 0.64], [0, -0.97, 0.06], NEON.pink, { glow: true }), box('legR', [0.5, 0.07, 0.64], [0, -0.97, 0.06], NEON.pink, { glow: true }),
      cyl('armR', [0.26, 0.3, 0.12], [-0.25, -1.0, 0.35], '#a0522d', { rot: [Math.PI / 2, 0, 0] }), box('armR', [0.08, 0.06, 1.1], [-0.25, -0.98, 0.95], '#6b3a1f')   // dombra: body + neck
    ]
  },
  tayson: {
    id: 'tayson', kk: 'Тайсон-Тайпақ', voice: 'K1', signature: 'punch',
    palette: { skin: '#e0a878', hair: '#3b2a20', top: '#ff8a2a', sleeve: '#ff8a2a', pants: '#2d3142', shoes: '#ffffff' },
    face: { style: 'eyes', eye: '#2a1b12' },
    pieces: [
      box('torso', [1.14, 1.0, 0.6], [0, 0, 0], '#ff8a2a'),                                                       // wide wrestler torso
      box('root', [1.06, 0.18, 0.62], [0, 1.02, 0], NEON.gold, { glow: true }), box('root', [0.34, 0.26, 0.64], [0, 1.02, 0.01], '#ffc93c'), // champion belt
      ball('armL', 0.27, [0, -1.12, 0], NEON.red), ball('armR', 0.27, [0, -1.12, 0], NEON.red),                    // boxing gloves
      box('head', [1.3, 0.2, 1.15], [0, 0.5, 0], '#3b2a20')
    ]
  },
  azhebot: {
    id: 'azhebot', kk: 'Әже-Bot 3000', voice: 'E4', signature: 'levitate', hover: true,
    palette: { skin: '#cfd3e6', hair: '#ffffff', top: '#8c2f4a', sleeve: '#b9bfd8', pants: '#8c2f4a', shoes: '#8c2f4a' },
    face: { style: 'screen', eye: NEON.cyan, glow: NEON.cyan },
    pieces: [
      box('head', [1.36, 1.0, 1.2], [0, 0.12, -0.05], '#ffffff'),                                                   // cyber кимешек
      cyl('head', [0.02, 0.02, 0.4], [0.3, 0.95, 0], '#8a8fa8'), ball('head', 0.09, [0.3, 1.18, 0], NEON.gold, { glow: true }),   // antenna
      box('root', [1.04, 0.14, 0.6], [0, 1.86, 0], NEON.gold, { glow: true }), box('root', [0.2, 1.1, 0.6], [0, 1.48, 0.005], NEON.gold, { glow: true }), // камзол trim
      cyl('root', [0.55, 0.7, 0.5], [0, 0.65, 0], '#8c2f4a'), cyl('root', [0.72, 0.72, 0.06], [0, 0.38, 0], NEON.cyan, { glow: true })   // hover skirt + thruster ring
    ]
  },
  apai: {
    id: 'apai', kk: 'Баян апай', voice: 'APAI', signature: 'bata',
    palette: { skin: '#e9b892', hair: '#3a2418', top: '#16756a', sleeve: '#16756a', pants: '#2b2230', shoes: '#2b2230' },
    face: { style: 'eyes', eye: '#3a2418' },
    pieces: [
      ball('head', 0.32, [0, 0.42, -0.5], '#3a2418'),                                                             // hair bun
      box('head', [1.0, 0.07, 0.04], [0, 0.1, 0.58], '#3a2418'),                                                  // glasses frame
      ball('root', 0.08, [0, 1.85, 0.3], NEON.gold, { glow: true }),                                              // brooch
      box('root', [1.06, 0.5, 0.6], [0, 0.72, 0], '#16756a'),                                                     // long skirt
      box('armR', [0.06, 0.06, 0.9], [0, -1.1, 0.4], '#c8a26a')                                                   // pointer
    ]
  },
  anel: {
    id: 'anel', kk: 'Әнел', voice: 'ANEL', signature: 'cheer',
    palette: { skin: '#f3c9a5', hair: '#2a1b12', top: '#1b2340', sleeve: '#ffffff', pants: '#1b2340', shoes: '#2b2230' },
    face: { style: 'eyes', eye: '#2a1b12' },
    pieces: [
      ball('head', 0.24, [-0.72, 0.1, -0.1], '#2a1b12'), ball('head', 0.24, [0.72, 0.1, -0.1], '#2a1b12'),        // pigtails
      box('head', [0.5, 0.18, 0.12], [0, 0.66, 0.2], NEON.pink), box('head', [1.3, 0.22, 1.15], [0, 0.5, 0], '#2a1b12'),
      box('root', [0.5, 0.06, 0.04], [0, 1.92, 0.3], '#d02f3a')                                                  // school tie
    ]
  },
  alibek: {
    id: 'alibek', kk: 'Әлібек', voice: 'ALIBEK', signature: 'wave',
    palette: { skin: '#e8b98a', hair: '#2b2230', top: '#2456c9', sleeve: '#ffffff', pants: '#1b2340', shoes: '#333a52' },
    face: { style: 'eyes', eye: '#3a2a1a' },
    pieces: [
      box('head', [1.3, 0.24, 1.15], [0, 0.52, 0], '#2b2230'), box('head', [0.4, 0.14, 0.3], [0.2, 0.68, 0.3], '#2b2230'),  // hair + quiff
      box('root', [0.5, 0.06, 0.04], [0, 1.92, 0.3], '#d02f3a'), box('root', [0.12, 0.5, 0.04], [0, 1.62, 0.3], '#d02f3a')   // school tie
    ]
  },
  zhalkau: {
    id: 'zhalkau', kk: 'Жалқаубек', voice: 'ZHALKAU', signature: 'yawn',
    palette: { skin: '#e2b083', hair: '#5a3a20', top: '#8a8f99', sleeve: '#8a8f99', pants: '#3a3f55', shoes: '#8a5a2a' },
    face: { style: 'sleepy', eye: '#3a2418' },
    pieces: [
      box('head', [1.1, 0.24, 1.0], [0.08, 0.66, 0], '#d04a3a', { rot: [0, 0, 0.18] }), box('head', [0.5, 0.06, 0.4], [0.35, 0.56, 0.45], '#d04a3a', { rot: [0, 0, 0.18] }), // crooked cap
      box('root', [0.3, 0.3, 0.06], [0.2, 1.3, 0.3], '#6f7480'), box('root', [0.16, 0.12, 0.06], [-0.25, 1.65, 0.3], '#a0522d')  // stains and a patch: an untidy shirt
    ]
  }
};
export const HERO_IDS = Object.keys(HEROES) as HeroId[];

/** Pose of each part (rotation x / z of the pivots, root offset) for a move at time t (seconds) — pure, unit-tested. */
export interface Pose { armL: V3; armR: V3; legL: V3; legR: V3; head: V3; root: { y: number; rotY: number; rotZ?: number } }
export function pose(move: Move, t: number, talking = 0): Pose {
  const s = Math.sin, P: Pose = { armL: [s(t * 1.6) * 0.06, 0, 0.06], armR: [-s(t * 1.6) * 0.06, 0, -0.06], legL: [0, 0, 0], legR: [0, 0, 0], head: [talking * 0.12, s(t * 0.7) * 0.08, 0], root: { y: Math.abs(s(t * 2)) * 0.02, rotY: 0 } };
  switch (move) {
    case 'wave': P.armR = [0, 0, -2.6 + s(t * 8) * 0.35]; break;
    case 'cheer': P.armL = [0, 0, 2.7 + s(t * 10) * 0.15]; P.armR = [0, 0, -2.7 - s(t * 10) * 0.15]; P.root.y = Math.abs(s(t * 6)) * 0.35; break;
    case 'jump360': { const k = (t % 1.4) / 1.4; P.root.y = s(k * Math.PI) * 1.6; P.root.rotY = k * Math.PI * 2; P.armL = [0, 0, 1.2]; P.armR = [0, 0, -1.2]; break; }
    case 'dombra': P.armR = [-0.9, 0, -0.5]; P.armL = [-1.1 + s(t * 14) * 0.25, 0, 0.6]; P.head = [0.05, s(t * 4) * 0.15, 0]; break;
    case 'punch': { const a = s(t * 12) > 0; P.armL = [a ? -1.55 : -0.3, 0, 0]; P.armR = [a ? -0.3 : -1.55, 0, 0]; P.root.y = 0.05; break; }
    case 'levitate': P.root.y = 0.45 + s(t * 2) * 0.18; P.armL = [0, 0, 0.5]; P.armR = [0, 0, -0.5]; break;
    case 'bata': P.armL = [-1.3, 0, 0.4]; P.armR = [-1.3, 0, -0.4]; P.head = [0.25 + s(t * 2) * 0.08, 0, 0]; break;
    case 'yawn': P.armL = [0, 0, 2.9]; P.armR = [0, 0, -2.9]; P.head = [-0.35, 0, s(t) * 0.1]; break;
    case 'power': P.armL = [0, 0, 1.4 + s(t * 20) * 0.05]; P.armR = [0, 0, -1.4 - s(t * 20) * 0.05]; P.root.y = 0.25 + s(t * 3) * 0.08; break;
    // «Аниматор» poses (оқып отыр / тұр / жатыр): both hands hold something in front
    case 'hold': P.armL = [-1.15, 0, 0.25]; P.armR = [-1.15, 0, -0.25]; P.head = [0.3, s(t * 0.7) * 0.05, 0]; break;
    case 'sit': P.legL = [-1.5, 0, 0.05]; P.legR = [-1.5, 0, -0.05]; P.root.y = -0.78; P.armL = [-1.0, 0, 0.25]; P.armR = [-1.0, 0, -0.25]; P.head = [0.3, 0, 0]; break;
    // lying on the side, facing the camera, head to the left; raised by half the body width to rest on the ground
    case 'lie': P.root.rotZ = Math.PI / 2; P.root.y = 0.62; P.armL = [-1.3, 0, 0]; P.armR = [-1.3, 0, 0]; P.head = [0, 0, -0.25]; P.legL = [0, 0, 0]; P.legR = [s(t * 2) * 0.15, 0, 0]; break;
    case 'idle': default: break;
  }
  return P;
}
/** Mouth opening 0..1 → scale Y of the mouth block (closed 1, wide open 4). */
export const mouthScale = (level: number) => 1 + Math.max(0, Math.min(1, level)) * 3;
