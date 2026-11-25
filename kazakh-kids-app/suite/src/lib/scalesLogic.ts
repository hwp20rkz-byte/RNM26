/**
 * Pure logic of «Таразы» (phase 2 «Мектеп», maths 1–3 — a balance scale in 3D). Answers are computed, no facts.
 *  - add: a sack of L kg on the left, an r kg weight on the right — «Таразы теңессін: қай гір керек?» → L − r kg (1–9).
 *  - div: a sack of T kg on the left, the weights are w kg each — «Неше гір керек?» → T ÷ w (2–6).
 * After the answer the beam levels and the narrator says the short answer («Бес килограмм!»); the full equation
 * («Жеті қосу бес тең он екі.») stays on screen. Sentences are checked against web/mektep-core.js in scales.test.ts.
 */
import { NUMBER_WORDS } from '../data/numberWords';
import { shuffle, type Rng } from './totemLogic';

export type ScalesMode = 'add' | 'div';
export const S_TASKS = 8, S_LIVES = 3;
export interface SStage { mode: ScalesMode; left: number; right: number[]; w: number; answer: string; options: string[]; sentence: string; say: string }
export interface SRound { mode: ScalesMode; stages: SStage[] }
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1), word = (n: number) => NUMBER_WORDS[n];
export const SCALES_Q: Record<ScalesMode, string> = { add: 'Таразы теңессін: қай гір керек?', div: 'Неше гір керек?' };
export const addSentence = (r: number, x: number) => cap(word(r)) + ' қосу ' + word(x) + ' тең ' + word(r + x) + '.';
export const divSentence = (t: number, w: number) => cap(word(t)) + ' бөлу ' + word(w) + ' тең ' + word(t / w) + '.';
export const sayShort = (mode: ScalesMode, n: number) => cap(word(n)) + (mode === 'add' ? ' килограмм!' : ' гір!');
const ri = (r: Rng, a: number, b: number) => a + Math.floor(r() * (b - a + 1));

/** Three different options near the answer, inside [lo, hi]. */
function near(ans: number, lo: number, hi: number, rng: Rng): number[] {
  const c = shuffle([ans - 1, ans + 1, ans - 2, ans + 2].filter((x) => x >= lo && x <= hi), rng).slice(0, 2);
  return shuffle([ans, ...c], rng);
}

export function buildScalesRound(mode: ScalesMode, rng: Rng = Math.random): SRound {
  const seen = new Set<string>(), stages: SStage[] = [];
  for (let g = 0; stages.length < S_TASKS && g < 500; g++) {
    if (mode === 'add') {
      const x = ri(rng, 1, 9), r = ri(rng, 1, Math.min(15, 20 - x)), k = r + '+' + x;
      if (seen.has(k)) continue; seen.add(k);
      stages.push({ mode, left: r + x, right: [r], w: x, answer: String(x), options: near(x, 1, 9, rng).map(String), sentence: addSentence(r, x), say: sayShort('add', x) });
    } else {
      const w = ri(rng, 2, 5), n = ri(rng, 2, 6), k = w + 'x' + n;
      if (seen.has(k)) continue; seen.add(k);
      stages.push({ mode, left: w * n, right: [], w, answer: String(n), options: near(n, 1, 9, rng).map(String), sentence: divSentence(w * n, w), say: sayShort('div', n) });
    }
  }
  return { mode, stages };
}

export type SPhase = 'intro' | 'aim' | 'hit' | 'miss' | 'victory' | 'defeat';
export interface SState { round: SRound | null; phase: SPhase; i: number; lives: number; xp: number; combo: number; bestCombo: number; firstTry: number; tried: string[]; seq: number }
export type SAction = { type: 'start'; round: SRound } | { type: 'pick'; option: string } | { type: 'next' };
export const initialScales = (): SState => ({ round: null, phase: 'intro', i: 0, lives: S_LIVES, xp: 0, combo: 0, bestCombo: 0, firstTry: 0, tried: [], seq: 0 });
export function scalesReducer(s: SState, a: SAction): SState {
  switch (a.type) {
    case 'start': return { ...initialScales(), round: a.round, phase: 'aim' };
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
/** Right pan total for a picked option: add → r + x, div → x weights of w kg. The beam tilts by left − right. */
export const rightTotal = (st: SStage, pick: number | null) => (st.mode === 'add' ? st.right[0] + (pick ?? 0) : (pick ?? 0) * st.w);
export const scalesAccuracy = (s: SState) => ({ correct: s.firstTry, total: s.round ? s.round.stages.length : 0 });
