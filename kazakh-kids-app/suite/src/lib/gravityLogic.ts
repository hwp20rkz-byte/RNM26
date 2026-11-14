/**
 * Pure logic of «Грави-тир»: 10 targets per round, 3 lives.
 *  - demo: an object hangs near (big, in reach) or far (small, across the range); pick «Мынау — X» or «Анау — X».
 *    Options mix both words with the right object and a wrong one, so distance and vocabulary both count.
 *  - can:  a picture of an action with ✅ or ❌; pick «Мен … аламын / алмаймын» — the right one powers up the hero.
 */
import { ABILITIES, RANGE_ITEMS, canPhrase, demoPhrase, type Ability, type RangeItem } from '../data/gravityCorpus';
import { shuffle, type Rng } from './totemLogic';

export type GravityMode = 'demo' | 'can';
export const TARGETS = 10, G_LIVES = 3;
export interface GStage { item?: RangeItem; near?: boolean; ability?: Ability; yes?: boolean; answer: string; options: string[] }
export interface GRound { mode: GravityMode; stages: GStage[] }

export function buildGravityRound(mode: GravityMode, rng: Rng = Math.random): GRound {
  if (mode === 'demo') {
    const items = shuffle(RANGE_ITEMS, rng).slice(0, TARGETS);
    return { mode, stages: items.map((item, i) => {
      const near = rng() < 0.5, other = items[(i + 1) % items.length], answer = demoPhrase(near, item.kk);
      return { item, near, answer, options: shuffle([answer, demoPhrase(!near, item.kk), demoPhrase(near, other.kk), demoPhrase(!near, other.kk)], rng) };
    }) };
  }
  const abs = shuffle([...ABILITIES, ...ABILITIES], rng).slice(0, TARGETS);
  return { mode, stages: abs.map((ability, i) => {
    const yes = rng() < 0.6, answer = canPhrase(ability, yes), other = abs.find((x, k) => k !== i && x.stem !== ability.stem) ?? ABILITIES[0];
    return { ability, yes, answer, options: shuffle([answer, canPhrase(ability, !yes), canPhrase(other, yes)], rng) };
  }) };
}

export type GPhase = 'intro' | 'aim' | 'hit' | 'miss' | 'victory' | 'defeat';
export interface GState { round: GRound | null; phase: GPhase; i: number; lives: number; xp: number; combo: number; bestCombo: number; firstTry: number; tried: string[]; seq: number }
export type GAction = { type: 'start'; round: GRound } | { type: 'pick'; option: string } | { type: 'next' };
export const initialGravity = (): GState => ({ round: null, phase: 'intro', i: 0, lives: G_LIVES, xp: 0, combo: 0, bestCombo: 0, firstTry: 0, tried: [], seq: 0 });

export function gravityReducer(s: GState, a: GAction): GState {
  switch (a.type) {
    case 'start': return { ...initialGravity(), round: a.round, phase: 'aim' };
    case 'pick': {
      if ((s.phase !== 'aim' && s.phase !== 'miss') || !s.round || s.tried.includes(a.option)) return s;
      const st = s.round.stages[s.i];
      if (a.option === st.answer) {
        const combo = s.combo + 1;
        return { ...s, phase: 'hit', combo, bestCombo: Math.max(s.bestCombo, combo), firstTry: s.firstTry + (s.tried.length ? 0 : 1), xp: s.xp + 40 + Math.min(combo - 1, 5) * 10, seq: s.seq + 1 };
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
export const gravityAccuracy = (s: GState) => ({ correct: s.firstTry, total: s.round ? s.round.stages.length : 0 });
