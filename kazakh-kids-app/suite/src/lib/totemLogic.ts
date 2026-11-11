/**
 * Pure game logic of «Totem of Cases» — no React, no WebGL, fully unit-tested.
 * A session is a short round (8 tasks) that visits every case ring at least once, then a reducer
 * moves it through answer → feedback → next and decides victory / defeat.
 */
import type { AnswerVerdict, CaseId, GamePhase, PersonId, TotemMode, TotemTask } from '../types/game.types';
import { CASES, CASE_SENTENCES, PERSON_SENTENCES } from '../data/kazakhGrammarCorpus';
import { caseAllomorphs, caseSuffix, distractors, explain, personAllomorphs, personSuffix } from './morphology';

export const ZERO = '∅';          // how the zero ending of Атау / Ол is shown on a crystal
export const SESSION_LENGTH = 8;
export const MAX_LIVES = 3;
export const XP_PER_HIT = 20;

export type Rng = () => number;
export function shuffle<T>(a: readonly T[], rng: Rng): T[] {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}
/** Small deterministic PRNG for tests and replays (mulberry32). */
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const show = (s: string) => (s === '' ? ZERO : s);

function caseTask(id: string, target: CaseId, rng: Rng): TotemTask {
  const s = shuffle(CASE_SENTENCES.filter((x) => x.case === target), rng)[0];
  const r = caseSuffix(s.root, target);
  // distractors: other allomorphs of this case first, then the same root in other cases
  const others = CASES.filter((k) => k.id !== target).map((k) => caseSuffix(s.root, k.id).suffix);
  const opts = [r.suffix, ...distractors(r.suffix, caseAllomorphs(target), others, 3)];
  return { id, mode: 'cases', target, sentence: s, answer: show(r.suffix), options: shuffle(opts.map(show), rng), rule: r.rule };
}

function personTask(id: string, target: PersonId, rng: Rng): TotemTask {
  const s = shuffle(PERSON_SENTENCES.filter((x) => x.person === target), rng)[0];
  const r = personSuffix(s.root, target);
  const others = (['men', 'sen', 'siz', 'biz', 'sender', 'sizder'] as PersonId[]).filter((p) => p !== target).map((p) => personSuffix(s.root, p).suffix);
  const opts = [r.suffix, ...distractors(r.suffix, personAllomorphs(target), others, 3)];
  return { id, mode: 'persons', target, sentence: s, answer: show(r.suffix), options: shuffle(opts.map(show), rng), rule: r.rule };
}

/** Every case appears at least once; the remaining slots are random. */
export function buildSession(mode: TotemMode, rng: Rng = Math.random, length = SESSION_LENGTH): TotemTask[] {
  const targets: (CaseId | PersonId)[] = mode === 'cases'
    ? CASES.map((c) => c.id)
    : (['men', 'sen', 'siz', 'biz', 'sender', 'sizder', 'ol'] as PersonId[]);
  const order = shuffle(targets, rng);
  while (order.length < length) order.push(targets[Math.floor(rng() * targets.length)]);
  return order.slice(0, length).map((t, i) => mode === 'cases' ? caseTask('q' + i, t as CaseId, rng) : personTask('q' + i, t as PersonId, rng));
}

export function fullSentence(t: TotemTask): string {
  const e = t.answer === ZERO ? '' : t.answer;
  return t.sentence.before + t.sentence.root + e + t.sentence.after;
}

export function judge(t: TotemTask, chosen: string): AnswerVerdict {
  const r = t.mode === 'cases' ? caseSuffix(t.sentence.root, t.target as CaseId) : personSuffix(t.sentence.root, t.target as PersonId);
  return { correct: chosen === t.answer, chosen, answer: t.answer, full: fullSentence(t), explanation: explain(t.sentence.root, r) };
}

/* ------------------------------------------------------------------ reducer */

export interface TotemState {
  mode: TotemMode;
  tasks: TotemTask[];
  index: number;
  phase: GamePhase;
  lives: number;
  combo: number;
  bestCombo: number;
  xp: number;
  firstTry: number;
  verdict: AnswerVerdict | null;
  /** Targets the child missed — shown in the summary as «повтори». */
  missed: (CaseId | PersonId)[];
}

export type TotemAction =
  | { type: 'start'; mode: TotemMode; tasks: TotemTask[] }
  | { type: 'answer'; option: string }
  | { type: 'next' };

export function initialTotem(mode: TotemMode = 'cases'): TotemState {
  return { mode, tasks: [], index: 0, phase: 'intro', lives: MAX_LIVES, combo: 0, bestCombo: 0, xp: 0, firstTry: 0, verdict: null, missed: [] };
}

/** Combo multiplier: ×1, ×1.5 from 3 in a row, ×2 from 5, ×3 from 8. */
export const comboMultiplier = (combo: number): number => (combo >= 8 ? 3 : combo >= 5 ? 2 : combo >= 3 ? 1.5 : 1);

export function totemReducer(s: TotemState, a: TotemAction): TotemState {
  switch (a.type) {
    case 'start':
      return { ...initialTotem(a.mode), tasks: a.tasks, phase: 'playing' };
    case 'answer': {
      if (s.phase !== 'playing') return s;
      const t = s.tasks[s.index], v = judge(t, a.option);
      if (v.correct) {
        const combo = s.combo + 1;
        return { ...s, phase: 'feedback', verdict: v, combo, bestCombo: Math.max(s.bestCombo, combo), firstTry: s.firstTry + 1, xp: s.xp + Math.round(XP_PER_HIT * comboMultiplier(combo)) };
      }
      const lives = s.lives - 1;
      return { ...s, phase: lives <= 0 ? 'defeat' : 'feedback', verdict: v, combo: 0, lives, missed: s.missed.includes(t.target) ? s.missed : [...s.missed, t.target] };
    }
    case 'next': {
      if (s.phase !== 'feedback') return s;
      const index = s.index + 1;
      return index >= s.tasks.length ? { ...s, phase: 'victory', verdict: null } : { ...s, index, phase: 'playing', verdict: null };
    }
  }
}
