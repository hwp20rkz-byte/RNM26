/**
 * «Грави-тир» (Gravity Range): «мынау / анау» by distance and «аламын / алмаймын» abilities.
 * The ability forms below are checked against web/grammar-core.js (ability()) in gravity.test.ts — the engine is the
 * source of truth; this list only names the verbs and pictures.
 */
import type { Localized } from '../types/game.types';

export interface RangeItem extends Localized { kk: string; e: string }
export const RANGE_ITEMS: RangeItem[] = [
  { kk: 'алма', e: '🍎', ru: 'яблоко', en: 'apple' }, { kk: 'доп', e: '⚽', ru: 'мяч', en: 'ball' },
  { kk: 'кітап', e: '📖', ru: 'книга', en: 'book' }, { kk: 'мысық', e: '🐈', ru: 'кошка', en: 'cat' },
  { kk: 'ағаш', e: '🌳', ru: 'дерево', en: 'tree' }, { kk: 'үй', e: '🏠', ru: 'дом', en: 'house' },
  { kk: 'құс', e: '🐦', ru: 'птица', en: 'bird' }, { kk: 'гүл', e: '🌸', ru: 'цветок', en: 'flower' },
  { kk: 'ұшақ', e: '✈️', ru: 'самолёт', en: 'plane' }, { kk: 'қалам', e: '✏️', ru: 'карандаш', en: 'pencil' },
  { kk: 'сағат', e: '⏰', ru: 'часы', en: 'clock' }, { kk: 'тауық', e: '🐔', ru: 'курица', en: 'hen' }
];
/** «This is …» near / far: Мынау — алма. / Анау — ұшақ. */
export const demoPhrase = (near: boolean, kk: string) => (near ? 'Мынау' : 'Анау') + ' — ' + kk + '.';

export interface Ability extends Localized { stem: string; obj?: string; e: string; can: string; cannot: string }
/** can / cannot = (object +) G.ability(stem, 'men' [, true]) — verified in the test. */
export const ABILITIES: Ability[] = [
  { stem: 'жүз', e: '🏊', ru: 'плавать', en: 'swim', can: 'жүзе аламын', cannot: 'жүзе алмаймын' },
  { stem: 'оқы', e: '📖', ru: 'читать', en: 'read', can: 'оқи аламын', cannot: 'оқи алмаймын' },
  { stem: 'жүгір', e: '🏃', ru: 'бегать', en: 'run', can: 'жүгіре аламын', cannot: 'жүгіре алмаймын' },
  { stem: 'сөйле', e: '🗣️', ru: 'говорить', en: 'speak', can: 'сөйлей аламын', cannot: 'сөйлей алмаймын' },
  { stem: 'жаз', e: '✍️', ru: 'писать', en: 'write', can: 'жаза аламын', cannot: 'жаза алмаймын' },
  { stem: 'айт', obj: 'ән', e: '🎤', ru: 'петь', en: 'sing', can: 'ән айта аламын', cannot: 'ән айта алмаймын' },
  { stem: 'сал', obj: 'сурет', e: '🎨', ru: 'рисовать', en: 'draw', can: 'сурет сала аламын', cannot: 'сурет сала алмаймын' },
  { stem: 'ұш', e: '🕊️', ru: 'летать', en: 'fly', can: 'ұша аламын', cannot: 'ұша алмаймын' }
];
export const canPhrase = (a: Ability, yes: boolean) => 'Мен ' + (yes ? a.can : a.cannot) + '.';
