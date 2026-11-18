/**
 * Pure logic of «Табиғат зертханасы» (Nature Lab, phase 2 «Мектеп», science grades 1–2 — the 3D part of day 5).
 *  - homes:  «Бұл жануар қайда тұрады?» — send each of 8 animals to its habitat: суда / тауда / шөлде / орманда.
 *  - chains: «Тізбекте не жетіспейді?» — fill the missing link of a food chain (шөп → қоян → түлкі).
 * The animals, the locative forms (from the engine) and the chains are the table in web/mektep-core.js; lab.test.ts
 * checks that they stay equal.
 */
import { shuffle, type Rng } from './totemLogic';

export interface Habitat { id: 'су' | 'тау' | 'шөл' | 'орман'; at: string; ru: string; en: string; color: string }
export const HABITATS: Habitat[] = [
  { id: 'су', at: 'суда', ru: 'в воде', en: 'in water', color: '#38BDF8' },
  { id: 'тау', at: 'тауда', ru: 'в горах', en: 'in the mountains', color: '#94A3B8' },
  { id: 'шөл', at: 'шөлде', ru: 'в пустыне', en: 'in the desert', color: '#FBBF24' },
  { id: 'орман', at: 'орманда', ru: 'в лесу', en: 'in the forest', color: '#22C55E' }
];
export interface Animal { kk: string; e: string; home: Habitat['id']; at: string; ru: string; en: string }
export const LAB_ANIMALS: Animal[] = [
  { kk: 'балық', e: '🐟', home: 'су', at: 'суда', ru: 'рыба', en: 'fish' }, { kk: 'шаян', e: '🦞', home: 'су', at: 'суда', ru: 'рак', en: 'crayfish' },
  { kk: 'барыс', e: '🐆', home: 'тау', at: 'тауда', ru: 'снежный барс', en: 'snow leopard' }, { kk: 'арқар', e: '🐏', home: 'тау', at: 'тауда', ru: 'архар', en: 'argali' },
  { kk: 'түйе', e: '🐫', home: 'шөл', at: 'шөлде', ru: 'верблюд', en: 'camel' }, { kk: 'кесіртке', e: '🦎', home: 'шөл', at: 'шөлде', ru: 'ящерица', en: 'lizard' },
  { kk: 'тиін', e: '🐿️', home: 'орман', at: 'орманда', ru: 'белка', en: 'squirrel' }, { kk: 'тоқылдақ', e: '🐦', home: 'орман', at: 'орманда', ru: 'дятел', en: 'woodpecker' }
];
export interface Link { kk: string; e: string; ru: string; en: string }
export const CHAINS: Link[][] = [
  [{ kk: 'шөп', e: '🌿', ru: 'трава', en: 'grass' }, { kk: 'қоян', e: '🐇', ru: 'заяц', en: 'hare' }, { kk: 'түлкі', e: '🦊', ru: 'лиса', en: 'fox' }],
  [{ kk: 'дән', e: '🌾', ru: 'зерно', en: 'grain' }, { kk: 'тышқан', e: '🐭', ru: 'мышь', en: 'mouse' }, { kk: 'бүркіт', e: '🦅', ru: 'беркут', en: 'golden eagle' }],
  [{ kk: 'шөп', e: '🌱', ru: 'трава', en: 'grass' }, { kk: 'қой', e: '🐑', ru: 'овца', en: 'sheep' }, { kk: 'қасқыр', e: '🐺', ru: 'волк', en: 'wolf' }]
];
export const L_LIVES = 3;
export type LabMode = 'homes' | 'chains';
export interface LStage { animal?: string; chain?: number; gap?: number; answer: string; options: string[] }
export interface LRound { mode: LabMode; stages: LStage[] }
export const animalOf = (kk: string) => LAB_ANIMALS.find((a) => a.kk === kk) ?? null;
/** The narrator line after a right answer: «Түйе шөлде тұрады.» / «Шөп — қоян — түлкі». */
export const doneLine = (st: LStage): string => {
  if (st.animal) { const a = animalOf(st.animal)!; return a.kk.charAt(0).toUpperCase() + a.kk.slice(1) + ' ' + a.at + ' тұрады.'; }
  return CHAINS[st.chain!].map((x) => x.kk).join(' — ');
};

export function buildLabRound(mode: LabMode, rng: Rng = Math.random): LRound {
  if (mode === 'homes') return { mode, stages: shuffle(LAB_ANIMALS.slice(), rng).map((a) => ({ animal: a.kk, answer: a.at, options: HABITATS.map((h) => h.at) })) };
  // chains: 6 of the 9 (chain, gap) pairs; wrong options are links from the other chains, never from this one
  const pairs = shuffle(CHAINS.flatMap((_, c) => [0, 1, 2].map((gap) => ({ c, gap }))), rng).slice(0, 6);
  return { mode, stages: pairs.map(({ c, gap }) => {
    const answer = CHAINS[c][gap].kk, own = CHAINS[c].map((x) => x.kk);
    const pool = [...new Set(CHAINS.flat().map((x) => x.kk))].filter((k) => !own.includes(k));
    return { chain: c, gap, answer, options: shuffle([answer, ...shuffle(pool, rng).slice(0, 2)], rng) };
  }) };
}

export type LPhase = 'intro' | 'aim' | 'hit' | 'miss' | 'victory' | 'defeat';
export interface LState { round: LRound | null; phase: LPhase; i: number; lives: number; xp: number; combo: number; bestCombo: number; firstTry: number; tried: string[]; placed: string[]; seq: number }
export type LAction = { type: 'start'; round: LRound } | { type: 'pick'; option: string } | { type: 'next' };
export const initialLab = (): LState => ({ round: null, phase: 'intro', i: 0, lives: L_LIVES, xp: 0, combo: 0, bestCombo: 0, firstTry: 0, tried: [], placed: [], seq: 0 });
export function labReducer(s: LState, a: LAction): LState {
  switch (a.type) {
    case 'start': return { ...initialLab(), round: a.round, phase: 'aim' };
    case 'pick': {
      if ((s.phase !== 'aim' && s.phase !== 'miss') || !s.round || s.tried.includes(a.option)) return s;
      const st = s.round.stages[s.i];
      if (a.option === st.answer) {
        const combo = s.combo + 1;
        return { ...s, phase: 'hit', combo, bestCombo: Math.max(s.bestCombo, combo), firstTry: s.firstTry + (s.tried.length ? 0 : 1), xp: s.xp + 50 + Math.min(combo - 1, 5) * 10,
          placed: st.animal ? [...s.placed, st.animal] : s.placed, seq: s.seq + 1 };
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
export const labAccuracy = (s: LState) => ({ correct: s.firstTry, total: s.round ? s.round.stages.length : 0 });
