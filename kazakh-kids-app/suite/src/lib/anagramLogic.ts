/**
 * Pure logic of «Әріп кубтары» (Voxel Anagram), 6 words per round.
 *  - build:   the letters of the word float as cubes, plus one decoy — the Russian look-alike of a special letter
 *             («к» for «қ»). Dock the cubes in order; a repeated letter can come from either cube.
 *  - missing: the word is shown with its first special letter replaced by «_»; four cubes offer that letter,
 *             its look-alike and two other special letters.
 * A wrong cube costs a life (3 per round) and explains the sound of the letter.
 */
import type { Lang } from '../types/game.types';
import { LETTER_SOUND, LETTER_WORDS, LOOKALIKE, SPECIAL, specialsOf, type LetterWord, type SpecialLetter } from '../data/letterCorpus';
import { pick } from './i18n';
import { shuffle, type Rng } from './totemLogic';

export type AnagramMode = 'build' | 'missing';
export const WORDS_PER_ROUND = 6;
export const ANAGRAM_LIVES = 3;
export const XP_PER_LETTER = 10;
export const XP_CLEAN_WORD = 50;

export interface Cube { id: number; text: string; decoy: boolean }
export interface AStage { word: LetterWord; target: string[]; cubes: Cube[]; special: SpecialLetter; gap: number }
export interface ARound { mode: AnagramMode; stages: AStage[] }

/** The special letter the stage is about: the first one whose look-alike is not already in the word. */
export function focusLetter(w: string): SpecialLetter {
  const s = specialsOf(w);
  return s.find((c) => !w.includes(LOOKALIKE[c])) ?? s[0];
}

export function buildStage(word: LetterWord, mode: AnagramMode, rng: Rng = Math.random): AStage {
  const special = focusLetter(word.kk), gap = [...word.kk].indexOf(special);
  if (mode === 'build') {
    const faces = [...word.kk].map((c) => ({ text: c, decoy: false })).concat([{ text: LOOKALIKE[special], decoy: true }]);
    let order = shuffle(faces, rng);
    for (let i = 0; i < 4 && order.slice(0, word.kk.length).every((f, k) => f.text === word.kk[k]); i++) order = shuffle(faces, rng);
    return { word, special, gap, target: [...word.kk], cubes: order.map((f, id) => ({ ...f, id })) };
  }
  const others = shuffle(SPECIAL.filter((c) => c !== special && c !== LOOKALIKE[special]), rng).slice(0, 2);
  const faces = [{ text: special, decoy: false }, { text: LOOKALIKE[special], decoy: true }, ...others.map((c) => ({ text: c, decoy: true }))];
  return { word, special, gap, target: [special], cubes: shuffle(faces, rng).map((f, id) => ({ ...f, id })) };
}

export function buildAnagramRound(mode: AnagramMode, rng: Rng = Math.random): ARound {
  const pool = LETTER_WORDS.filter((w) => mode === 'missing' || w.kk.length <= 6);
  // one word per special letter first, so a round covers different letters
  const bySpecial = new Map<string, LetterWord[]>();
  for (const w of shuffle(pool, rng)) { const k = focusLetter(w.kk); bySpecial.set(k, [...(bySpecial.get(k) ?? []), w]); }
  const firsts = shuffle([...bySpecial.values()].map((l) => l[0]), rng), rest = shuffle(pool.filter((w) => !firsts.includes(w)), rng);
  return { mode, stages: [...firsts, ...rest].slice(0, WORDS_PER_ROUND).map((w) => buildStage(w, mode, rng)) };
}

/** The word as shown in «missing» mode: «_ала». */
export const gapped = (st: AStage): string => [...st.word.kk].map((c, i) => (i === st.gap ? '_' : c)).join('');

export function missHint(st: AStage, cube: Cube, lang: Lang): string {
  const right = st.target[0] === cube.text ? null : st.special;
  if (cube.text === LOOKALIKE[st.special]) {
    return lang === 'en' ? `«${cube.text}» is the Russian letter. Here it is «${st.special}»: ${pick(LETTER_SOUND[st.special], 'en')}`
      : `«${cube.text}» — русская буква. Здесь нужна «${st.special}»: ${pick(LETTER_SOUND[st.special], 'ru')}`;
  }
  return lang === 'en' ? `Not «${cube.text}». ${right ? 'The word is ' : ''}«${st.word.kk}» — ${st.word.en}.` : `Не «${cube.text}». Слово — «${st.word.kk}», ${st.word.ru}.`;
}

/* ------------------------------------------------------------------ reducer */

export type APhase = 'intro' | 'playing' | 'resolving' | 'done' | 'victory' | 'defeat';
export interface AEvent { kind: 'dock' | 'miss'; cube: number; seq: number }
export interface AState {
  round: ARound | null; phase: APhase; stage: number; docked: number[];
  lives: number; mistakes: number; stageMistakes: number; cleanWords: number; combo: number; bestCombo: number; xp: number; event: AEvent | null;
}
export type AAction = { type: 'start'; round: ARound } | { type: 'pick'; cube: number } | { type: 'settle' } | { type: 'next' };

export const initialAnagram = (): AState => ({ round: null, phase: 'intro', stage: 0, docked: [], lives: ANAGRAM_LIVES, mistakes: 0, stageMistakes: 0, cleanWords: 0, combo: 0, bestCombo: 0, xp: 0, event: null });

export function anagramReducer(s: AState, a: AAction): AState {
  switch (a.type) {
    case 'start': return { ...initialAnagram(), round: a.round, phase: 'playing' };
    case 'pick': {
      if (s.phase !== 'playing' || !s.round) return s;
      const st = s.round.stages[s.stage], cube = st.cubes.find((c) => c.id === a.cube);
      if (!cube || s.docked.includes(cube.id)) return s;
      const seq = (s.event?.seq ?? 0) + 1;
      if (!cube.decoy && st.target[s.docked.length] === cube.text) {
        const docked = [...s.docked, cube.id], done = docked.length === st.target.length, clean = done && s.stageMistakes === 0, combo = s.combo + 1;
        return { ...s, docked, combo, bestCombo: Math.max(s.bestCombo, combo), event: { kind: 'dock', cube: cube.id, seq },
          xp: s.xp + XP_PER_LETTER + (clean ? XP_CLEAN_WORD : 0), cleanWords: s.cleanWords + (clean ? 1 : 0), phase: done ? 'done' : 'playing' };
      }
      return { ...s, phase: 'resolving', lives: s.lives - 1, mistakes: s.mistakes + 1, stageMistakes: s.stageMistakes + 1, combo: 0, event: { kind: 'miss', cube: cube.id, seq } };
    }
    case 'settle': return s.phase !== 'resolving' ? s : s.lives <= 0 ? { ...s, phase: 'defeat' } : { ...s, phase: 'playing' };
    case 'next': {
      if (s.phase !== 'done' || !s.round) return s;
      const n = s.stage + 1;
      return n >= s.round.stages.length ? { ...s, phase: 'victory' } : { ...s, phase: 'playing', stage: n, docked: [], stageMistakes: 0, event: null };
    }
  }
}
export const anagramAccuracy = (s: AState) => ({ correct: s.cleanWords, total: s.round ? s.round.stages.length : 0 });
