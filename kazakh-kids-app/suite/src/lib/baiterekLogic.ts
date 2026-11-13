/**
 * Pure logic of «Бәйтерек қорғаны» (Baiterek Defense): 12 meteors per round, one at a time.
 * A meteor carries a picture (pictures mode, grades 1–2) or a Russian / English word (words mode, grades 3–4) and falls
 * towards the Baiterek; three Kazakh words wait below. The right word fires a beam: +XP, combo, a speed bonus.
 * A wrong word only breaks the combo and greys that option out — the meteor keeps falling. A meteor that reaches the
 * tower costs a shield (3 per round). Fall time shrinks gently from meteor to meteor, never below a floor.
 */
import type { Lang } from '../types/game.types';
import { LETTER_WORDS } from '../data/letterCorpus';
import { TRANSLATIONS } from '../data/pairsCorpus';
import { pick } from './i18n';
import { shuffle, type Rng } from './totemLogic';

export type DefenseMode = 'pictures' | 'words';
export const METEORS_PER_ROUND = 12;
export const SHIELDS = 3;
/** Seconds a meteor needs to reach the tower: [first, floor]. Children get time to read. */
export const FALL: Record<DefenseMode, [number, number]> = { pictures: [11, 7], words: [10, 6] };
export const fallTime = (mode: DefenseMode, i: number) => Math.max(FALL[mode][1], FALL[mode][0] - i * 0.4);

export interface Meteor { id: number; kk: string; ru: string; en: string; e?: string; options: string[]; lane: number }
export interface DRound { mode: DefenseMode; meteors: Meteor[] }

export function buildDefenseRound(mode: DefenseMode, rng: Rng = Math.random): DRound {
  const pool = mode === 'pictures' ? LETTER_WORDS.map((w) => ({ kk: w.kk, ru: w.ru, en: w.en, e: w.e })) : TRANSLATIONS.map((w) => ({ kk: w.kk, ru: w.ru, en: w.en }));
  const picked = shuffle(pool, rng).slice(0, METEORS_PER_ROUND);
  return { mode, meteors: picked.map((w, id) => {
    const wrong = shuffle(pool.filter((x) => x.kk !== w.kk), rng).slice(0, 2).map((x) => x.kk);
    return { id, ...w, options: shuffle([w.kk, ...wrong], rng), lane: Math.floor(rng() * 3) };
  }) };
}
/** What the meteor shows: a picture, or the word in the UI language. */
export const face = (m: Meteor, mode: DefenseMode, lang: Lang) => (mode === 'pictures' && m.e ? m.e : pick(m, lang));

export type DPhase = 'intro' | 'falling' | 'hit' | 'impact' | 'victory' | 'defeat';
export interface DState {
  round: DRound | null; phase: DPhase; i: number; shields: number; xp: number; combo: number; bestCombo: number;
  hits: number; firstTry: number; wrong: string[]; seq: number;
}
export type DAction = { type: 'start'; round: DRound } | { type: 'answer'; word: string; left: number } | { type: 'impact' } | { type: 'next' };

export const initialDefense = (): DState => ({ round: null, phase: 'intro', i: 0, shields: SHIELDS, xp: 0, combo: 0, bestCombo: 0, hits: 0, firstTry: 0, wrong: [], seq: 0 });

export function defenseReducer(s: DState, a: DAction): DState {
  switch (a.type) {
    case 'start': return { ...initialDefense(), round: a.round, phase: 'falling' };
    case 'answer': {
      if (s.phase !== 'falling' || !s.round || s.wrong.includes(a.word)) return s;
      const m = s.round.meteors[s.i];
      if (a.word === m.kk) {
        const combo = s.combo + 1, speed = Math.round(Math.max(0, Math.min(1, a.left)) * 30);   // up to +30 for a fast answer
        return { ...s, phase: 'hit', combo, bestCombo: Math.max(s.bestCombo, combo), hits: s.hits + 1, firstTry: s.firstTry + (s.wrong.length ? 0 : 1),
          xp: s.xp + 50 + Math.min(combo - 1, 5) * 10 + speed, seq: s.seq + 1 };
      }
      return { ...s, combo: 0, wrong: [...s.wrong, a.word], seq: s.seq + 1 };
    }
    case 'impact': return s.phase !== 'falling' ? s : { ...s, phase: 'impact', shields: s.shields - 1, combo: 0, seq: s.seq + 1 };
    case 'next': {
      if ((s.phase !== 'hit' && s.phase !== 'impact') || !s.round) return s;
      if (s.shields <= 0) return { ...s, phase: 'defeat' };
      const i = s.i + 1;
      return i >= s.round.meteors.length ? { ...s, phase: 'victory' } : { ...s, phase: 'falling', i, wrong: [] };
    }
  }
}
export const defenseAccuracy = (s: DState) => ({ correct: s.firstTry, total: s.round ? s.round.meteors.length : 0 });
