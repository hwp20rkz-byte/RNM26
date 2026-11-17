/**
 * Pure logic of «Лего-Сөз» (master plan, sprint 3), 10 tasks per round, 3 lives.
 *  - blocks: a root (кітап) and a person (менің) or «many» (көп) → pick the ending block (ым / ім / м).
 *            The block snaps on and the root shows its sound change: п → б (кітабым), a dropped vowel (ауыз → аузым).
 *  - pose:   Батыр-X or Тайсон sits / stands / lies while doing something, or has finished it → pick the sentence
 *            (оқып отыр / оқып тұр / оқып жатыр / кітапты оқып тастады).
 * All word forms come from web/grammar-core.js via the generated data/legoForms.ts.
 */
import { LEGO_NOUNS, POSE_VERBS } from '../data/legoForms';
import type { LegoNoun, PoseKey, PoseVerb, PossKey } from '../data/legoTypes';
import { shuffle, type Rng } from './totemLogic';

export type LegoMode = 'blocks' | 'pose';
export const L_TASKS = 10, L_LIVES = 3;
export const POSS_KEYS: PossKey[] = ['men', 'sen', 'ol', 'biz', 'pl'];
export const POSE_KEYS: PoseKey[] = ['отыр', 'тұр', 'жатыр', 'тастады'];
export const POSS_LABEL: Record<PossKey, string> = { men: 'менің', sen: 'сенің', ol: 'оның', biz: 'біздің', pl: 'көп' };
export const ENDINGS: Record<PossKey, string[]> = {
  men: ['ым', 'ім', 'м'], sen: ['ың', 'ің', 'ң'], ol: ['ы', 'і', 'сы', 'сі'], biz: ['ымыз', 'іміз', 'мыз', 'міз'], pl: ['лар', 'лер', 'дар', 'дер', 'тар', 'тер']
};
export type Change = 'none' | 'voiced' | 'dropped';
export interface Split { stem: string; ending: string; change: Change }

/** Splits an engine form into the root as it surfaces and the ending: кітабым → кітаб + ым (voiced), аузым → ауз + ым. */
export function splitForm(root: string, form: string): Split {
  if (form.startsWith(root)) return { stem: root, ending: form.slice(root.length), change: 'none' };
  if (form.slice(0, root.length - 1) === root.slice(0, -1)) return { stem: form.slice(0, root.length), ending: form.slice(root.length), change: 'voiced' };
  const dropped = root.slice(0, -2) + root.slice(-1);
  if (form.startsWith(dropped)) return { stem: dropped, ending: form.slice(dropped.length), change: 'dropped' };
  throw new Error('cannot split ' + form + ' over ' + root);
}

export const HEROES = [{ id: 'batyr' as const, kk: 'Батыр' }, { id: 'tayson' as const, kk: 'Тайсон' }];
export const poseSentence = (hero: string, v: PoseVerb, k: PoseKey) => hero + ' ' + (k === 'тастады' ? v.objAcc : v.obj) + ' ' + v.forms[k] + '.';
export const blockPhrase = (n: LegoNoun, k: PossKey) => (k === 'pl' ? '' : POSS_LABEL[k] + ' ') + n.forms[k];

export interface LStage { noun?: LegoNoun; key?: PossKey; split?: Split; verb?: PoseVerb; pose?: PoseKey; hero?: (typeof HEROES)[number]; answer: string; options: string[]; say: string }
export interface LRound { mode: LegoMode; stages: LStage[] }

export function buildLegoRound(mode: LegoMode, rng: Rng = Math.random): LRound {
  const stages: LStage[] = [];
  if (mode === 'blocks') {
    // at least 4 of 10 show a sound change — the point of the game
    const changing = LEGO_NOUNS.filter((n) => POSS_KEYS.slice(0, 4).some((k) => splitForm(n.kk, n.forms[k]).change !== 'none'));
    const plain = LEGO_NOUNS.filter((n) => !changing.includes(n));
    const picks = shuffle([...shuffle(changing, rng).slice(0, 4), ...shuffle(plain, rng).slice(0, L_TASKS - 4)], rng);
    for (const noun of picks) {
      const key = changing.includes(noun) ? POSS_KEYS[Math.floor(rng() * 4)] : POSS_KEYS[Math.floor(rng() * 5)];
      const split = splitForm(noun.kk, noun.forms[key]);
      const options = shuffle([split.ending, ...shuffle(ENDINGS[key].filter((e) => e !== split.ending), rng).slice(0, 2)], rng);
      stages.push({ noun, key, split, answer: split.ending, options, say: blockPhrase(noun, key) });
    }
    return { mode, stages };
  }
  for (let k = 0; k < L_TASKS; k++) {
    const verb = POSE_VERBS[Math.floor(rng() * POSE_VERBS.length)], pose = POSE_KEYS[Math.floor(rng() * 4)], hero = HEROES[k % 2];
    const answer = poseSentence(hero.kk, verb, pose);
    stages.push({ verb, pose, hero, answer, options: shuffle(POSE_KEYS.map((p) => poseSentence(hero.kk, verb, p)), rng), say: answer });
  }
  return { mode, stages };
}

export type LPhase = 'intro' | 'aim' | 'hit' | 'miss' | 'victory' | 'defeat';
export interface LState { round: LRound | null; phase: LPhase; i: number; lives: number; xp: number; combo: number; bestCombo: number; firstTry: number; tried: string[]; seq: number }
export type LAction = { type: 'start'; round: LRound } | { type: 'pick'; option: string } | { type: 'next' };
export const initialLego = (): LState => ({ round: null, phase: 'intro', i: 0, lives: L_LIVES, xp: 0, combo: 0, bestCombo: 0, firstTry: 0, tried: [], seq: 0 });

export function legoReducer(s: LState, a: LAction): LState {
  switch (a.type) {
    case 'start': return { ...initialLego(), round: a.round, phase: 'aim' };
    case 'pick': {
      if ((s.phase !== 'aim' && s.phase !== 'miss') || !s.round || s.tried.includes(a.option)) return s;
      if (a.option === s.round.stages[s.i].answer) {
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
export const legoAccuracy = (s: LState) => ({ correct: s.firstTry, total: s.round ? s.round.stages.length : 0 });
