/**
 * Words for «Әріп кубтары» (Voxel Anagram): 1–2 grade vocabulary built around the nine Kazakh letters
 * Ә І Ң Ғ Ү Ұ Қ Ө Һ. Every word has a picture (emoji) and at least one special letter.
 * LOOKALIKE: the Russian letter a child writes instead — it is the decoy cube («к» for «қ», «у» for «ү»…).
 */
import type { Localized } from '../types/game.types';

export const SPECIAL = ['ә', 'і', 'ң', 'ғ', 'ү', 'ұ', 'қ', 'ө', 'һ'] as const;
export type SpecialLetter = (typeof SPECIAL)[number];
export const LOOKALIKE: Record<SpecialLetter, string> = { 'ә': 'а', 'і': 'и', 'ң': 'н', 'ғ': 'г', 'ү': 'у', 'ұ': 'у', 'қ': 'к', 'ө': 'о', 'һ': 'х' };
export const LETTER_SOUND: Record<SpecialLetter, Localized> = {
  'ә': { ru: 'ә — мягкое «а», как «я» в слове «пять»', en: 'ә — a soft a, as in «cat»' },
  'і': { ru: 'і — короткое мягкое «и»', en: 'і — a short soft i, as in «bit»' },
  'ң': { ru: 'ң — носовое «нг»', en: 'ң — ng, as in «sing»' },
  'ғ': { ru: 'ғ — горловое «г»', en: 'ғ — a throaty g' },
  'ү': { ru: 'ү — мягкое «у», как немецкое ü', en: 'ү — like German ü' },
  'ұ': { ru: 'ұ — короткое твёрдое «у»', en: 'ұ — a short u, as in «put»' },
  'қ': { ru: 'қ — глубокое «к» из горла', en: 'қ — a deep k from the throat' },
  'ө': { ru: 'ө — как немецкое ö', en: 'ө — like German ö' },
  'һ': { ru: 'һ — лёгкий выдох «х»', en: 'һ — h, as in «house»' }
};

export interface LetterWord extends Localized { kk: string; e: string }

export const LETTER_WORDS: LetterWord[] = [
  { kk: 'әже', e: '👵', ru: 'бабушка', en: 'grandma' }, { kk: 'әке', e: '👨', ru: 'папа', en: 'dad' },
  { kk: 'әтеш', e: '🐓', ru: 'петух', en: 'rooster' }, { kk: 'сәбіз', e: '🥕', ru: 'морковь', en: 'carrot' },
  { kk: 'кәмпит', e: '🍬', ru: 'конфета', en: 'sweet' }, { kk: 'тіс', e: '🦷', ru: 'зуб', en: 'tooth' },
  { kk: 'піл', e: '🐘', ru: 'слон', en: 'elephant' }, { kk: 'кітап', e: '📖', ru: 'книга', en: 'book' },
  { kk: 'таң', e: '🌅', ru: 'рассвет', en: 'dawn' }, { kk: 'қоңыз', e: '🐞', ru: 'жук', en: 'beetle' },
  { kk: 'жаңбыр', e: '🌧️', ru: 'дождь', en: 'rain' }, { kk: 'ағаш', e: '🌳', ru: 'дерево', en: 'tree' },
  { kk: 'ғарыш', e: '🚀', ru: 'космос', en: 'space' }, { kk: 'сағат', e: '⏰', ru: 'часы', en: 'clock' },
  { kk: 'үй', e: '🏠', ru: 'дом', en: 'house' }, { kk: 'гүл', e: '🌸', ru: 'цветок', en: 'flower' },
  { kk: 'күн', e: '☀️', ru: 'солнце', en: 'sun' }, { kk: 'түлкі', e: '🦊', ru: 'лиса', en: 'fox' },
  { kk: 'үкі', e: '🦉', ru: 'сова', en: 'owl' }, { kk: 'сүт', e: '🥛', ru: 'молоко', en: 'milk' },
  { kk: 'ұшақ', e: '✈️', ru: 'самолёт', en: 'plane' }, { kk: 'құс', e: '🐦', ru: 'птица', en: 'bird' },
  { kk: 'құлақ', e: '👂', ru: 'ухо', en: 'ear' }, { kk: 'тұз', e: '🧂', ru: 'соль', en: 'salt' },
  { kk: 'қала', e: '🏙️', ru: 'город', en: 'city' }, { kk: 'қой', e: '🐑', ru: 'овца', en: 'sheep' },
  { kk: 'балық', e: '🐟', ru: 'рыба', en: 'fish' }, { kk: 'тауық', e: '🐔', ru: 'курица', en: 'hen' },
  { kk: 'қар', e: '❄️', ru: 'снег', en: 'snow' }, { kk: 'өрік', e: '🍑', ru: 'абрикос', en: 'apricot' },
  { kk: 'көз', e: '👁️', ru: 'глаз', en: 'eye' }, { kk: 'көл', e: '🏞️', ru: 'озеро', en: 'lake' },
  { kk: 'сөмке', e: '👜', ru: 'сумка', en: 'bag' }, { kk: 'гауһар', e: '💎', ru: 'алмаз', en: 'diamond' },
  { kk: 'қаһарман', e: '🦸', ru: 'герой', en: 'hero' }
];

/** Special letters of a word, in order of appearance. */
export const specialsOf = (w: string): SpecialLetter[] => [...w].filter((c): c is SpecialLetter => (SPECIAL as readonly string[]).includes(c));
