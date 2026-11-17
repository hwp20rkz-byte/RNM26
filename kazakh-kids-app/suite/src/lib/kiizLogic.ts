/**
 * Pure logic of «Киіз үй» (the yurt, phase 2 «Мектеп», logic grade 2 — the 3D part of day 4): 5 tasks, 3 lives.
 *  - build: «Енді не керек?» — choose the next part; it takes its place in 3D (кереге → есік → шаңырақ → уық → киіз).
 *           Options are the next part, parts that come later, and materials a yurt is not made of (кірпіш, шыны).
 *  - name:  the yurt stands; one part lights up — «Бұл не?».
 * The order and the narrator lines are the same table as the 2D topic (web/mektep-core.js YURT; kiiz.test.ts checks it).
 */
import { shuffle, type Rng } from './totemLogic';

export interface Part { kk: string; ru: string; en: string; done: string; whyRu: string; whyEn: string }
export const PARTS: Part[] = [
  { kk: 'кереге', ru: 'решётчатые стены', en: 'lattice walls', done: 'Кереге жайылды.', whyRu: 'Сначала раздвигают решётки-стены по кругу.', whyEn: 'First the lattice walls are opened in a circle.' },
  { kk: 'есік', ru: 'дверь', en: 'door', done: 'Есік орнатылды.', whyRu: 'Дверь ставят между решётками — она держит круг.', whyEn: 'The door stands between the lattices and closes the circle.' },
  { kk: 'шаңырақ', ru: 'купольный круг', en: 'roof crown', done: 'Шаңырақ көтерілді.', whyRu: 'Шаңырақ поднимают на шестах в центр.', whyEn: 'The crown is lifted to the centre on poles.' },
  { kk: 'уық', ru: 'жерди купола', en: 'roof poles', done: 'Уықтар шаншылды.', whyRu: 'Жерди соединяют стены с шаңыраком.', whyEn: 'The poles join the walls to the crown.' },
  { kk: 'киіз', ru: 'войлочное покрытие', en: 'felt cover', done: 'Киіз жабылды.', whyRu: 'В конце юрту укрывают войлоком.', whyEn: 'Last, the yurt is covered with felt.' }
];
export const DECOYS = [{ kk: 'кірпіш', ru: 'кирпич', en: 'brick' }, { kk: 'шыны', ru: 'стекло', en: 'glass' }, { kk: 'темір', ru: 'железо', en: 'iron' }];
export const K_LIVES = 3;
export type KiizMode = 'build' | 'name';
export interface KStage { target: number; answer: string; options: string[] }
export interface KRound { mode: KiizMode; stages: KStage[] }
export const partOf = (kk: string) => PARTS.find((p) => p.kk === kk) ?? null;
export const labelOf = (kk: string, en: boolean) => { const p = partOf(kk) ?? DECOYS.find((d) => d.kk === kk); return p ? (en ? p.en : p.ru) : ''; };

export function buildKiizRound(mode: KiizMode, rng: Rng = Math.random): KRound {
  const names = PARTS.map((p) => p.kk);
  if (mode === 'build') {
    return { mode, stages: PARTS.map((p, i) => {
      const pool = shuffle([...names.slice(i + 1), ...DECOYS.map((d) => d.kk)], rng).slice(0, 2);
      return { target: i, answer: p.kk, options: shuffle([p.kk, ...pool], rng) };
    }) };
  }
  return { mode, stages: shuffle([0, 1, 2, 3, 4], rng).map((t) => ({ target: t, answer: names[t], options: shuffle([names[t], ...shuffle(names.filter((n) => n !== names[t]), rng).slice(0, 2)], rng) })) };
}

export type KPhase = 'intro' | 'aim' | 'hit' | 'miss' | 'victory' | 'defeat';
export interface KState { round: KRound | null; phase: KPhase; i: number; lives: number; xp: number; combo: number; bestCombo: number; firstTry: number; tried: string[]; built: number; seq: number }
export type KAction = { type: 'start'; round: KRound } | { type: 'pick'; option: string } | { type: 'next' };
export const initialKiiz = (): KState => ({ round: null, phase: 'intro', i: 0, lives: K_LIVES, xp: 0, combo: 0, bestCombo: 0, firstTry: 0, tried: [], built: 0, seq: 0 });
export function kiizReducer(s: KState, a: KAction): KState {
  switch (a.type) {
    case 'start': return { ...initialKiiz(), round: a.round, phase: 'aim', built: a.round.mode === 'name' ? PARTS.length : 0 };
    case 'pick': {
      if ((s.phase !== 'aim' && s.phase !== 'miss') || !s.round || s.tried.includes(a.option)) return s;
      const st = s.round.stages[s.i];
      if (a.option === st.answer) {
        const combo = s.combo + 1;
        return { ...s, phase: 'hit', combo, bestCombo: Math.max(s.bestCombo, combo), firstTry: s.firstTry + (s.tried.length ? 0 : 1), xp: s.xp + 60 + Math.min(combo - 1, 4) * 10,
          built: s.round.mode === 'build' ? st.target + 1 : s.built, seq: s.seq + 1 };
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
export const kiizAccuracy = (s: KState) => ({ correct: s.firstTry, total: s.round ? s.round.stages.length : 0 });
