/**
 * Pure logic of «Сөйлем экспресі» (Hyperloop Builder): 6 sentences per round. The words of a sentence
 * float as pods; the child docks them onto the monorail one by one in Kazakh order. A pod is accepted
 * when the docked words plus it are the start of the canonical order or of an accepted alternative
 * (time ↔ subject). A wrong pod — or the decoy (a non-imperative verb form in «commands») — costs a life.
 * When the last pod docks the train departs: the sentence is spoken and the next one arrives.
 *
 * Pods are shown in lower case, so a capital letter never gives the first word away.
 */
import type { Lang } from '../types/game.types';
import { MODE_RULE, SENTENCES, type Sentence, type SentenceMode } from '../data/sentenceCorpus';
import { pick } from './i18n';
import { shuffle, type Rng } from './totemLogic';

export const SENTENCES_PER_ROUND = 6;
export const HYPER_LIVES = 3;
export const XP_PER_DOCK = 10;
export const XP_CLEAN_SENTENCE = 60;

export interface Pod { id: number; text: string; decoy: boolean }
export interface Stage { sentence: Sentence; pods: Pod[] }
export interface HyperRound { mode: SentenceMode; stages: Stage[] }

const norm = (w: string) => w.toLowerCase();
/** Every accepted order of a sentence, normalised. */
export const orders = (s: Sentence): string[][] => [s.words, ...(s.alts ?? [])].map((o) => o.map(norm));

/** Is `seq` (normalised words) the start of an accepted order? */
export function isValidPrefix(s: Sentence, seq: string[]): boolean {
  return orders(s).some((o) => seq.length <= o.length && seq.every((w, i) => o[i] === w));
}

export function buildStage(s: Sentence, rng: Rng = Math.random): Stage {
  const faces = s.words.map((w) => ({ text: norm(w), decoy: false }));
  if (s.decoy) faces.push({ text: norm(s.decoy), decoy: true });
  // never start with the pods already in the right order
  let order = shuffle(faces, rng);
  for (let i = 0; i < 4 && order.every((f, k) => !f.decoy && f.text === norm(s.words[k] ?? '')); i++) order = shuffle(faces, rng);
  return { sentence: s, pods: order.map((f, id) => ({ ...f, id })) };
}

export function buildHyperRound(mode: SentenceMode, rng: Rng = Math.random): HyperRound {
  return { mode, stages: shuffle(SENTENCES[mode], rng).slice(0, SENTENCES_PER_ROUND).map((s) => buildStage(s, rng)) };
}

/** What to say after a mistake: the rule of the mode, or why the decoy is not a command. */
export function missHint(round: HyperRound, stage: Stage, pod: Pod, lang: Lang): string {
  if (pod.decoy) {
    const verb = stage.sentence.words[stage.sentence.words.length - 1];
    return lang === 'en'
      ? `«${pod.text}» is not a command. The command is «${norm(verb)}!» — the verb stem.`
      : `«${pod.text}» — не команда. Команда: «${norm(verb)}!» — основа глагола.`;
  }
  return pick(MODE_RULE[round.mode], lang);
}

/* ------------------------------------------------------------------ reducer */

export type HyperPhase = 'intro' | 'playing' | 'resolving' | 'departing' | 'victory' | 'defeat';
export interface HyperEvent { kind: 'dock' | 'miss'; pod: number; seq: number }

export interface HyperState {
  round: HyperRound | null;
  phase: HyperPhase;
  stage: number;
  /** Pod ids docked so far, in dock order. */
  docked: number[];
  lives: number;
  mistakes: number;
  /** Mistakes in the current sentence (a clean sentence earns the bonus). */
  stageMistakes: number;
  cleanSentences: number;
  combo: number;
  bestCombo: number;
  xp: number;
  event: HyperEvent | null;
}

export type HyperAction =
  | { type: 'start'; round: HyperRound }
  | { type: 'pick'; pod: number }
  | { type: 'settle' }        // the miss animation finished
  | { type: 'arrive' };       // the departing train left: next sentence (or the end)

export const initialHyper = (): HyperState => ({ round: null, phase: 'intro', stage: 0, docked: [], lives: HYPER_LIVES, mistakes: 0, stageMistakes: 0, cleanSentences: 0, combo: 0, bestCombo: 0, xp: 0, event: null });

export function hyperReducer(s: HyperState, a: HyperAction): HyperState {
  switch (a.type) {
    case 'start': return { ...initialHyper(), round: a.round, phase: 'playing' };
    case 'pick': {
      if (s.phase !== 'playing' || !s.round) return s;
      const st = s.round.stages[s.stage], pod = st.pods.find((p) => p.id === a.pod);
      if (!pod || s.docked.includes(pod.id)) return s;
      const seq = (s.event?.seq ?? 0) + 1;
      const words = [...s.docked.map((id) => st.pods[id].text), pod.text];
      if (!pod.decoy && isValidPrefix(st.sentence, words)) {
        const combo = s.combo + 1, docked = [...s.docked, pod.id];
        const done = docked.length === st.sentence.words.length;
        const clean = done && s.stageMistakes === 0;
        return { ...s, docked, combo, bestCombo: Math.max(s.bestCombo, combo), event: { kind: 'dock', pod: pod.id, seq },
          xp: s.xp + XP_PER_DOCK + (clean ? XP_CLEAN_SENTENCE : 0), cleanSentences: s.cleanSentences + (clean ? 1 : 0),
          phase: done ? 'departing' : 'playing' };
      }
      return { ...s, phase: 'resolving', lives: s.lives - 1, mistakes: s.mistakes + 1, stageMistakes: s.stageMistakes + 1, combo: 0, event: { kind: 'miss', pod: pod.id, seq } };
    }
    case 'settle': {
      if (s.phase !== 'resolving') return s;
      return s.lives <= 0 ? { ...s, phase: 'defeat' } : { ...s, phase: 'playing' };
    }
    case 'arrive': {
      if (s.phase !== 'departing' || !s.round) return s;
      const next = s.stage + 1;
      if (next >= s.round.stages.length) return { ...s, phase: 'victory' };
      return { ...s, phase: 'playing', stage: next, docked: [], stageMistakes: 0, event: null };
    }
  }
}

/** First-try score for the progression store: sentences built without a mistake. */
export function hyperAccuracy(s: HyperState): { correct: number; total: number } {
  return { correct: s.cleanSentences, total: s.round ? s.round.stages.length : 0 };
}
