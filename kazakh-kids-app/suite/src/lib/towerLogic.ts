/**
 * Pure logic of «Көбейту мұнарасы» and «Пішіндер» (phase 2 «Мектеп», maths 2–3 and 1 — the 3D parts of days 3 and 2).
 *  - tower:  a × b cubes stand as a tower of a floors with b cubes each; «Неше текше?» — the answer builds the tower.
 *            Tables 2–9; wrong options are the neighbours a × (b ± 1) and (a ± 1) × b, never equal to the answer.
 *  - shapes: a 3D solid turns on a pedestal — «Бұл қандай пішін?» (шар, куб, цилиндр, конус, пирамида).
 * Numbers in words come from the engine (data/numberWords.ts, checked against web/data.js).
 */
import { NUMBER_WORDS } from '../data/numberWords';
import { shuffle, type Rng } from './totemLogic';

export type TowerMode = 'tower' | 'shapes';
export const SOLIDS = [
  { id: 'sphere', kk: 'шар', ru: 'шар', en: 'sphere' }, { id: 'cube', kk: 'куб', ru: 'куб', en: 'cube' },
  { id: 'cylinder', kk: 'цилиндр', ru: 'цилиндр', en: 'cylinder' }, { id: 'cone', kk: 'конус', ru: 'конус', en: 'cone' },
  { id: 'pyramid', kk: 'пирамида', ru: 'пирамида', en: 'pyramid' }
] as const;
export type SolidId = typeof SOLIDS[number]['id'];
export const T_TASKS = 8, T_LIVES = 3;
export interface TStage { a: number; b: number; solid: SolidId | null; answer: string; options: string[] }
export interface TRound { mode: TowerMode; stages: TStage[] }
export const word = (n: number) => NUMBER_WORDS[n];
/** «Төрт көбейту алты тең жиырма төрт.» */
export const mulSentence = (a: number, b: number) => { const w = word(a); return w.charAt(0).toUpperCase() + w.slice(1) + ' көбейту ' + word(b) + ' тең ' + word(a * b) + '.'; };
const ri = (r: Rng, a: number, b: number) => a + Math.floor(r() * (b - a + 1));

export function buildTowerRound(mode: TowerMode, rng: Rng = Math.random): TRound {
  if (mode === 'shapes') {
    // every solid once, plus three more at random — no solid is ever left out of a round
    const order = shuffle([...SOLIDS, ...shuffle([...SOLIDS], rng).slice(0, T_TASKS - SOLIDS.length)], rng);
    return { mode, stages: order.map((s) => ({ a: 0, b: 0, solid: s.id, answer: s.kk, options: shuffle([s.kk, ...shuffle(SOLIDS.filter((x) => x.id !== s.id).map((x) => x.kk), rng).slice(0, 2)], rng) })) };
  }
  const seen = new Set<string>(), stages: TStage[] = [];
  for (let g = 0; stages.length < T_TASKS && g < 500; g++) {
    const a = ri(rng, 2, 9), b = ri(rng, 2, 9), k = a + 'x' + b; if (seen.has(k)) continue; seen.add(k);
    const near = [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, a * b + 1, a * b - 1].filter((x) => x > 0 && x <= 100 && x !== a * b);
    const opts = [a * b, ...shuffle([...new Set(near)], rng).slice(0, 2)];
    stages.push({ a, b, solid: null, answer: String(a * b), options: shuffle(opts.map(String), rng) });
  }
  return { mode, stages };
}

export type TPhase = 'intro' | 'aim' | 'hit' | 'miss' | 'victory' | 'defeat';
export interface TState { round: TRound | null; phase: TPhase; i: number; lives: number; xp: number; combo: number; bestCombo: number; firstTry: number; tried: string[]; seq: number }
export type TAction = { type: 'start'; round: TRound } | { type: 'pick'; option: string } | { type: 'next' };
export const initialTower = (): TState => ({ round: null, phase: 'intro', i: 0, lives: T_LIVES, xp: 0, combo: 0, bestCombo: 0, firstTry: 0, tried: [], seq: 0 });
export function towerReducer(s: TState, a: TAction): TState {
  switch (a.type) {
    case 'start': return { ...initialTower(), round: a.round, phase: 'aim' };
    case 'pick': {
      if ((s.phase !== 'aim' && s.phase !== 'miss') || !s.round || s.tried.includes(a.option)) return s;
      if (a.option === s.round.stages[s.i].answer) {
        const combo = s.combo + 1;
        return { ...s, phase: 'hit', combo, bestCombo: Math.max(s.bestCombo, combo), firstTry: s.firstTry + (s.tried.length ? 0 : 1), xp: s.xp + 50 + Math.min(combo - 1, 5) * 10, seq: s.seq + 1 };
      }
      const lives = s.lives - 1;
      return { ...s, phase: lives <= 0 ? 'defeat' : 'miss', lives, combo: 0, tried: [...s.tried, a.option], seq: s.seq + 1 };
    }
    case 'next': {
      if (s.phase !== 'hit' || !s.round) return s;
      const i = s.i + 1;
      return i >= s.round.stages.length ? { ...s, phase: 'victory' } : { ...s, phase: 'aim', i, tried: [] };
    }
  }
}
export const towerAccuracy = (s: TState) => ({ correct: s.firstTry, total: s.round ? s.round.stages.length : 0 });
