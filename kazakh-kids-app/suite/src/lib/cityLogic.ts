/**
 * Pure logic of «Қала квесті»: 8 tasks per round, 3 lives, 6 buildings on screen.
 *  - go:  a hint («Маған дәрі керек.») → tap the building with the right sign; Айсұлу flies there on her hoverboard
 *         and says «Дәріханаға барамын!» (the dative — where to).
 *  - fix: Жалқаубек swapped one sign (a building with 💊 says КІТАПХАНА) → find it, then choose the right sign of 3.
 */
import { PLACES, type Place } from '../data/cityCorpus';
import { shuffle, type Rng } from './totemLogic';

export type CityMode = 'go' | 'fix';
export const TASKS = 8, C_LIVES = 3, ON_SCREEN = 6;
export interface CStage {
  places: Place[];          // buildings left to right (what they really are)
  signs: string[];          // what the signs say (kk); in «fix» one is wrong
  target: number;           // go: the building to reach; fix: the building with the wrong sign
  fixOptions?: string[];    // fix: the right sign and two others
}
export interface CRound { mode: CityMode; stages: CStage[] }

export function buildCityRound(mode: CityMode, rng: Rng = Math.random): CRound {
  const stages: CStage[] = [];
  const order = shuffle(PLACES, rng);
  for (let k = 0; k < TASKS; k++) {
    const target = order[k % order.length];
    const others = shuffle(PLACES.filter((p) => p !== target), rng);
    const places = shuffle([target, ...others.slice(0, ON_SCREEN - 1)], rng);
    const t = places.indexOf(target), signs = places.map((p) => p.kk);
    if (mode === 'go') { stages.push({ places, signs, target: t }); continue; }
    const offScreen = others.slice(ON_SCREEN - 1);           // the swapped-in sign is not on screen, so it can't be guessed by elimination
    signs[t] = offScreen[0].kk;
    stages.push({ places, signs, target: t, fixOptions: shuffle([target.kk, offScreen[0].kk, offScreen[1].kk], rng) });
  }
  return { mode, stages };
}

export type CPhase = 'intro' | 'aim' | 'fix' | 'hit' | 'miss' | 'victory' | 'defeat';
export interface CState { round: CRound | null; phase: CPhase; step: 'find' | 'fix'; i: number; lives: number; xp: number; combo: number; bestCombo: number; firstTry: number; tried: string[]; slips: number; seq: number }
/** pick: a building index (as a string, «b3») or a sign word in the fix step. */
export type CAction = { type: 'start'; round: CRound } | { type: 'pick'; option: string } | { type: 'next' };
export const initialCity = (): CState => ({ round: null, phase: 'intro', step: 'find', i: 0, lives: C_LIVES, xp: 0, combo: 0, bestCombo: 0, firstTry: 0, tried: [], slips: 0, seq: 0 });
export const building = (i: number) => 'b' + i;
/** The answer the current step expects. */
export function expected(s: CState): string | null {
  if (!s.round || s.i >= s.round.stages.length) return null;
  const st = s.round.stages[s.i];
  return s.step === 'fix' ? st.places[st.target].kk : building(st.target);
}

export function cityReducer(s: CState, a: CAction): CState {
  switch (a.type) {
    case 'start': return { ...initialCity(), round: a.round, phase: 'aim' };
    case 'pick': {
      if (!['aim', 'fix', 'miss'].includes(s.phase) || !s.round || s.tried.includes(a.option)) return s;
      if (a.option === expected(s)) {
        if (s.round.mode === 'fix' && s.step === 'find') return { ...s, phase: 'fix', step: 'fix', tried: [], seq: s.seq + 1 };
        const clean = s.slips === 0 && s.tried.length === 0, combo = s.combo + 1;
        return { ...s, phase: 'hit', combo, bestCombo: Math.max(s.bestCombo, combo), firstTry: s.firstTry + (clean ? 1 : 0), xp: s.xp + 50 + Math.min(combo - 1, 5) * 10, seq: s.seq + 1 };
      }
      const lives = s.lives - 1;
      return { ...s, phase: lives <= 0 ? 'defeat' : 'miss', lives, combo: 0, tried: [...s.tried, a.option], slips: s.slips + 1, seq: s.seq + 1 };
    }
    case 'next': {
      if (s.phase !== 'hit' || !s.round) return s;
      const i = s.i + 1;
      return i >= s.round.stages.length ? { ...s, phase: 'victory' } : { ...s, phase: 'aim', step: 'find', i, tried: [], slips: 0 };
    }
  }
}
export const cityAccuracy = (s: CState) => ({ correct: s.firstTry, total: s.round ? s.round.stages.length : 0 });
