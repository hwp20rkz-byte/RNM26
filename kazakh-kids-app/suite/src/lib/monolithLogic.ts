/**
 * Pure logic of «Ұшқыр монолиттер» (Floating Monoliths): 12 monoliths = 6 pairs.
 *  - antonyms:  әдепті ↔ әдепсіз (both faces visible);
 *  - translate: кесене ↔ мавзолей / mausoleum (both faces visible);
 *  - memory:    translation pairs with hidden faces — a monolith shows its word only while raised.
 * Selecting two monoliths of one pair builds the golden bridge (+XP, combo); a wrong pair costs a crystal
 * (a life) in the open modes and only a move in memory mode.
 */
import type { Lang, Localized } from '../types/game.types';
import { ANTONYMS, TRANSLATIONS, type AntonymPair } from '../data/pairsCorpus';
import { shuffle, type Rng } from './totemLogic';

export type MonolithMode = 'antonyms' | 'translate' | 'memory';
export const PAIRS_PER_ROUND = 6;
export const MONO_LIVES = 3;
export const XP_PER_MATCH = 100;
export const MONO_PALETTE = ['#00AFCA', '#F5A623', '#00E599', '#B98CFF', '#3DD6F5', '#FF7A59'];
/** Colour by board position, never by pair: a shared colour would give the answer away. */
export const tileColor = (t: Pick<Tile, 'id'>): string => MONO_PALETTE[t.id % MONO_PALETTE.length];

export interface Tile {
  id: number;
  pair: number;
  text: string;
  /** Kazakh face (spoken with the bundled TTS) or the translation face. */
  kk: boolean;
}
export interface PairInfo extends Localized { a: string; b: string; note?: Localized; source?: string }

export interface Round { mode: MonolithMode; tiles: Tile[]; pairs: PairInfo[] }

export function buildRound(mode: MonolithMode, lang: Lang, rng: Rng = Math.random): Round {
  let pairs: PairInfo[];
  if (mode === 'antonyms') {
    pairs = shuffle(ANTONYMS, rng).slice(0, PAIRS_PER_ROUND).map((p: AntonymPair) => ({ a: p.a, b: p.b, ru: p.ru, en: p.en, note: p.note, source: p.source }));
  } else {
    // one module per round keeps the words thematic (2 — ethics, 4 — architecture)
    const module = rng() < 0.5 ? 2 : 4;
    pairs = shuffle(TRANSLATIONS.filter((w) => w.module === module), rng).slice(0, PAIRS_PER_ROUND)
      .map((w) => ({ a: w.kk, b: lang === 'en' ? w.en : w.ru, ru: w.kk + ' — ' + w.ru, en: w.kk + ' — ' + w.en, source: module + '-модуль' }));
  }
  const faces: Omit<Tile, 'id'>[] = [];
  pairs.forEach((p, i) => { faces.push({ pair: i, text: p.a, kk: true }); faces.push({ pair: i, text: p.b, kk: mode === 'antonyms' }); });
  return { mode, pairs, tiles: shuffle(faces, rng).map((t, id) => ({ ...t, id })) };
}

/* ------------------------------------------------------------------ reducer */

export type MonoPhase = 'intro' | 'playing' | 'resolving' | 'victory' | 'defeat';
export interface MonoEvent { kind: 'match' | 'miss'; a: number; b: number; seq: number }

export interface MonoState {
  round: Round | null;
  phase: MonoPhase;
  selected: number | null;
  matched: number[];          // tile ids
  lives: number;
  moves: number;
  mistakes: number;
  combo: number;
  bestCombo: number;
  xp: number;
  /** Last resolved selection — drives the bridge / recoil animation. */
  event: MonoEvent | null;
}

export type MonoAction =
  | { type: 'start'; round: Round }
  | { type: 'select'; id: number }
  | { type: 'settle' };       // the animation of the last event finished

export const initialMono = (): MonoState => ({ round: null, phase: 'intro', selected: null, matched: [], lives: MONO_LIVES, moves: 0, mistakes: 0, combo: 0, bestCombo: 0, xp: 0, event: null });

export function monoReducer(s: MonoState, a: MonoAction): MonoState {
  switch (a.type) {
    case 'start': return { ...initialMono(), round: a.round, phase: 'playing' };
    case 'select': {
      if (s.phase !== 'playing' || !s.round) return s;
      const t = s.round.tiles[a.id];
      if (!t || s.matched.includes(a.id)) return s;
      if (s.selected === null) return { ...s, selected: a.id };
      if (s.selected === a.id) return { ...s, selected: null };           // tap again to drop it
      const first = s.round.tiles[s.selected], seq = (s.event?.seq ?? 0) + 1, moves = s.moves + 1;
      if (first.pair === t.pair) {
        const combo = s.combo + 1;
        return { ...s, phase: 'resolving', selected: null, moves, combo, bestCombo: Math.max(s.bestCombo, combo), xp: s.xp + XP_PER_MATCH + (combo - 1) * 20,
          matched: [...s.matched, first.id, t.id], event: { kind: 'match', a: first.id, b: t.id, seq } };
      }
      const lives = s.round.mode === 'memory' ? s.lives : s.lives - 1;
      return { ...s, phase: 'resolving', selected: null, moves, combo: 0, mistakes: s.mistakes + 1, lives, event: { kind: 'miss', a: first.id, b: t.id, seq } };
    }
    case 'settle': {
      if (s.phase !== 'resolving' || !s.round) return s;
      if (s.matched.length === s.round.tiles.length) return { ...s, phase: 'victory' };
      if (s.lives <= 0) return { ...s, phase: 'defeat' };
      return { ...s, phase: 'playing' };
    }
  }
}

/** First-try score for the progression store: pairs found without a mistake in between. */
export function accuracy(s: MonoState): { correct: number; total: number } {
  const total = s.round ? s.round.pairs.length : 0;
  return { correct: Math.max(0, Math.min(total, total - s.mistakes)), total };
}
