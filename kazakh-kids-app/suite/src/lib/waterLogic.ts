/**
 * Pure logic of «Су айналымы» (phase 2 «Мектеп», science grade 2 — the water cycle in 3D).
 * The four stages are the table WATER in web/mektep-core.js (topic «Су айналымы»); water.test.ts keeps them equal.
 * A round: the drop starts at a random stage; each task asks «Судың айналымы: келесі кезең қандай?», the right answer
 * moves the scene to that stage, so 8 tasks take the drop twice round the cycle.
 */
import { shuffle, type Rng } from './totemLogic';

export const STEPS = [{ kk: 'Су буланады', e: '♨️' }, { kk: 'Бұлт пайда болады', e: '☁️' }, { kk: 'Жаңбыр жауады', e: '🌧️' }, { kk: 'Су өзенге ағады', e: '🏞️' }];
export const WATER_Q = 'Судың айналымы: келесі кезең қандай?';
export const W_TASKS = 8, W_LIVES = 3;
export interface WStage { from: number; answer: string; options: string[] }
export interface WRound { stages: WStage[] }
export const stepOf = (kk: string) => STEPS.findIndex((s) => s.kk === kk);

export function buildWaterRound(rng: Rng = Math.random): WRound {
  let cur = Math.floor(rng() * STEPS.length);
  const stages: WStage[] = [];
  for (let t = 0; t < W_TASKS; t++) {
    const next = (cur + 1) % STEPS.length, ans = STEPS[next].kk;
    const others = shuffle(STEPS.filter((_, i) => i !== next).map((s) => s.kk), rng).slice(0, 2);
    stages.push({ from: cur, answer: ans, options: shuffle([ans, ...others], rng) });
    cur = next;
  }
  return { stages };
}

export type WPhase = 'intro' | 'aim' | 'hit' | 'miss' | 'victory' | 'defeat';
export interface WState { round: WRound | null; phase: WPhase; i: number; lives: number; xp: number; combo: number; bestCombo: number; firstTry: number; tried: string[]; seq: number }
export type WAction = { type: 'start'; round: WRound } | { type: 'pick'; option: string } | { type: 'next' };
export const initialWater = (): WState => ({ round: null, phase: 'intro', i: 0, lives: W_LIVES, xp: 0, combo: 0, bestCombo: 0, firstTry: 0, tried: [], seq: 0 });
export function waterReducer(s: WState, a: WAction): WState {
  switch (a.type) {
    case 'start': return { ...initialWater(), round: a.round, phase: 'aim' };
    case 'pick': {
      if ((s.phase !== 'aim' && s.phase !== 'miss') || !s.round || s.tried.includes(a.option)) return s;
      const st = s.round.stages[s.i];
      if (!st.options.includes(a.option)) return s;
      if (a.option === st.answer) {
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
/** The stage the scene shows: the current one while asking, the answer once it is found. */
export const shownStep = (s: WState) => { const st = s.round?.stages[s.i]; return !st ? 0 : s.phase === 'hit' || s.phase === 'victory' ? stepOf(st.answer) : st.from; };
export const waterAccuracy = (s: WState) => ({ correct: s.firstTry, total: s.round ? s.round.stages.length : 0 });
