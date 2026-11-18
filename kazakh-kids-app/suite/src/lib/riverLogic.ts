/**
 * Pure logic of «Уақыт өзені» (River of Time, phase 2 «Мектеп», history grade 5 — the 3D part of day 8).
 * Each stage shows 4 events; the child taps them from the oldest to the newest and they land on the river's stones.
 * Neighbouring events in a stage are ≥ 300 years apart, so disputed datings never decide the order. The events are the
 * table in web/mektep-core.js (EVENTS); river.test.ts checks they stay equal. Years are used for ordering only and
 * are never shown (several are approximate).
 */
import { shuffle, type Rng } from './totemLogic';

export interface Ev { kk: string; y: number; e: string; short: string }
export const EVENTS: Ev[] = [
  { kk: 'Мысыр пирамидалары салынды', y: -2600, e: '🔺', short: 'Пирамидалар' }, { kk: 'Алғашқы Олимпиада ойындары өтті', y: -776, e: '🏅', short: 'Олимпиада' },
  { kk: 'Сақтар дәуірі: Алтын адам', y: -400, e: '👑', short: 'Алтын адам' }, { kk: 'Ұлы Жібек жолы ашылды', y: -130, e: '🐫', short: 'Жібек жолы' },
  { kk: 'Әл-Фараби өмір сүрді', y: 900, e: '📜', short: 'Әл-Фараби' }, { kk: 'Қожа Ахмет Ясауи кесенесі салынды', y: 1390, e: '🕌', short: 'Ясауи кесенесі' },
  { kk: 'Қазақ хандығы құрылды', y: 1465, e: '🏇', short: 'Қазақ хандығы' }, { kk: 'Колумб Америкаға жетті', y: 1492, e: '⛵', short: 'Колумб' },
  { kk: 'Абай дүниеге келді', y: 1845, e: '✍️', short: 'Абай' }, { kk: 'Қазақстан тәуелсіздік алды', y: 1991, e: '🇰🇿', short: 'Тәуелсіздік' }
];
export const R_STAGES = 4, R_PER = 4, R_GAP = 300, R_LIVES = 3;
export interface RStage { events: string[]; order: string[] }   // shown (shuffled) and the right order
export interface RRound { stages: RStage[] }
export const evOf = (kk: string) => EVENTS.find((e) => e.kk === kk)!;

/** Four events whose neighbours (by year) are ≥ 300 years apart; different sets for the stages when possible. */
export function buildRiverRound(rng: Rng = Math.random): RRound {
  const stages: RStage[] = [], seen = new Set<string>();
  for (let s = 0, guard = 0; s < R_STAGES && guard < 5000; guard++) {
    const pick = shuffle(EVENTS.slice(), rng).slice(0, R_PER).sort((a, b) => a.y - b.y);
    if (pick.some((e, i) => i > 0 && e.y - pick[i - 1].y < R_GAP)) continue;
    const key = pick.map((e) => e.kk).join('|'); if (seen.has(key) && guard < 4000) continue; seen.add(key);
    stages.push({ order: pick.map((e) => e.kk), events: shuffle(pick.map((e) => e.kk), rng) }); s++;
  }
  return { stages };
}

export type RPhase = 'intro' | 'aim' | 'hit' | 'miss' | 'stage' | 'victory' | 'defeat';
export interface RState { round: RRound | null; phase: RPhase; i: number; placed: string[]; lives: number; xp: number; combo: number; bestCombo: number; clean: number; wrong: string[]; seq: number }
export type RAction = { type: 'start'; round: RRound } | { type: 'pick'; event: string } | { type: 'next' };
export const initialRiver = (): RState => ({ round: null, phase: 'intro', i: 0, placed: [], lives: R_LIVES, xp: 0, combo: 0, bestCombo: 0, clean: 0, wrong: [], seq: 0 });
/** pick: the next-oldest event lands on the river (hit, or «stage» when the four are placed); any other costs a life. */
export function riverReducer(s: RState, a: RAction): RState {
  switch (a.type) {
    case 'start': return { ...initialRiver(), round: a.round, phase: 'aim' };
    case 'pick': {
      if (!s.round || (s.phase !== 'aim' && s.phase !== 'miss' && s.phase !== 'hit') || s.placed.includes(a.event)) return s;
      const st = s.round.stages[s.i], want = st.order[s.placed.length];
      if (a.event === want) {
        const placed = [...s.placed, a.event], combo = s.combo + 1, done = placed.length === st.order.length;
        const clean = done && !st.order.some((e) => s.wrong.includes(e + '@' + s.i)) && s.wrong.every((w) => !w.endsWith('@' + s.i)) ? s.clean + 1 : s.clean;
        return { ...s, placed, combo, bestCombo: Math.max(s.bestCombo, combo), xp: s.xp + 25 + Math.min(combo - 1, 6) * 5, phase: done ? 'stage' : 'hit', clean, seq: s.seq + 1 };
      }
      const lives = s.lives - 1;
      return { ...s, lives, combo: 0, phase: lives <= 0 ? 'defeat' : 'miss', wrong: [...s.wrong, a.event + '@' + s.i], seq: s.seq + 1 };
    }
    case 'next': {
      if (s.phase !== 'stage' || !s.round) return s;
      const i = s.i + 1;
      return i >= s.round.stages.length ? { ...s, phase: 'victory' } : { ...s, phase: 'aim', i, placed: [] };
    }
  }
}
