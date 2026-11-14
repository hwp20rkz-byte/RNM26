/**
 * Pure logic of «Сандар қаласы» (Number City, phase 2 «Мектеп», maths grades 1–2): 8 tasks, 3 lives.
 *  - count: towers of tens (rods) and ones (cubes) → which number is it?
 *  - add:   two groups a + b; after the answer the ones fly together and every ten ones snap into a new rod
 *           (carrying a ten, «ондықтан аттап қосу»). Half of the tasks need the carry.
 * Number words come from the engine via data/numberWords.ts.
 */
import { NUMBER_WORDS } from '../data/numberWords';
import { shuffle, type Rng } from './totemLogic';

export type SandarMode = 'count' | 'add';
export const S_TASKS = 8, S_LIVES = 3;
export interface SStage { a: number; b: number; answer: number; options: number[]; carry: boolean }
export interface SRound { mode: SandarMode; stages: SStage[] }
export const word = (n: number) => NUMBER_WORDS[n];
/** «Отыз жеті қосу жиырма бес тең алпыс екі.» */
export const addSentence = (a: number, b: number) => { const w = word(a); return w.charAt(0).toUpperCase() + w.slice(1) + ' қосу ' + word(b) + ' тең ' + word(a + b) + '.'; };
const ri = (r: Rng, a: number, b: number) => a + Math.floor(r() * (b - a + 1));

function options(ans: number, r: Rng): number[] {
  const set = [ans];
  for (const d of shuffle([10, -10, 1, -1, 11, -9], r)) { const x = ans + d; if (x >= 1 && x <= 99 && !set.includes(x) && set.length < 3) set.push(x); }
  return shuffle(set, r);
}
export function buildSandarRound(mode: SandarMode, rng: Rng = Math.random): SRound {
  const stages: SStage[] = [];
  for (let k = 0; k < S_TASKS; k++) {
    if (mode === 'count') { const n = ri(rng, 11, 99); stages.push({ a: n, b: 0, answer: n, options: options(n, rng), carry: false }); continue; }
    const carry = k % 2 === 0;
    let a = 0, b = 0;
    for (let g = 0; g < 100; g++) {
      a = ri(rng, 12, 68); b = ri(rng, 5, 99 - a);
      if ((a % 10 + b % 10 >= 10) === carry && a + b <= 99) break;
    }
    stages.push({ a, b, answer: a + b, options: options(a + b, rng), carry: a % 10 + b % 10 >= 10 });
  }
  return { mode, stages };
}
export type SPhase = 'intro' | 'aim' | 'hit' | 'miss' | 'victory' | 'defeat';
export interface SState { round: SRound | null; phase: SPhase; i: number; lives: number; xp: number; combo: number; bestCombo: number; firstTry: number; tried: number[]; seq: number }
export type SAction = { type: 'start'; round: SRound } | { type: 'pick'; option: number } | { type: 'next' };
export const initialSandar = (): SState => ({ round: null, phase: 'intro', i: 0, lives: S_LIVES, xp: 0, combo: 0, bestCombo: 0, firstTry: 0, tried: [], seq: 0 });
export function sandarReducer(s: SState, a: SAction): SState {
  switch (a.type) {
    case 'start': return { ...initialSandar(), round: a.round, phase: 'aim' };
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
export const sandarAccuracy = (s: SState) => ({ correct: s.firstTry, total: s.round ? s.round.stages.length : 0 });
