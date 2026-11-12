/**
 * Pairs for «Ұшқыр монолиттер»:
 *  - antonyms (қарама-қарсы мағыналы сөздер) — from the textbook modules and the 1–2 grade vocabulary;
 *  - translation pairs KZ ↔ RU / EN — read straight from the lesson vocabulary of modules 2 and 4
 *    (../../src/data/curriculum.json, the same file the main game uses: one source of truth).
 */
import curriculum from '../../../src/data/curriculum.json';
import type { Localized } from '../types/game.types';

export interface AntonymPair extends Localized {
  a: string; b: string;
  /** Optional grammar note shown after the match (e.g. -сыз/-сіз = «без»). */
  note?: Localized;
  source: string;
}

const NEG = { ru: '-сыз / -сіз значит «без»: из признака получается его противоположность.', en: '-сыз / -сіз means «without»: it turns a quality into its opposite.' };
const NEG_VERB = { ru: 'Отрицание глагола: -ма/-ме, -ба/-бе, -па/-пе (кешік + пе + йді).', en: 'Verb negation: -ма/-ме, -ба/-бе, -па/-пе (кешік + пе + йді).' };

export const ANTONYMS: AntonymPair[] = [
  { a: 'әдепті', b: 'әдепсіз', ru: 'воспитанный — невоспитанный', en: 'polite — rude', note: NEG, source: '2-модуль, 47-бет' },
  { a: 'ұқыпты', b: 'ұқыпсыз', ru: 'аккуратный — неаккуратный', en: 'tidy — untidy', note: NEG, source: '2-модуль, 50-бет' },
  { a: 'еңбекқор', b: 'жалқау', ru: 'трудолюбивый — ленивый', en: 'hard-working — lazy', source: '2-модуль, 40–43-бет' },
  { a: 'таза', b: 'лас', ru: 'чистый — грязный', en: 'clean — dirty', source: '2-модуль, 44-бет' },
  { a: 'кешігеді', b: 'кешікпейді', ru: 'опаздывает — не опаздывает', en: 'is late — is not late', note: NEG_VERB, source: '2-модуль, 50-бет' },
  { a: 'жақсы', b: 'жаман', ru: 'хороший — плохой', en: 'good — bad', source: '2-модуль, 38-бет' },
  { a: 'жарық', b: 'қараңғы', ru: 'светлый — тёмный', en: 'light — dark', source: '2-модуль: «жарық пен қараңғы»' },
  { a: 'биік', b: 'аласа', ru: 'высокий — низкий', en: 'tall — low', source: '4-модуль, 115-бет' },
  { a: 'ескі', b: 'жаңа', ru: 'старый — новый', en: 'old — new', source: '4-модуль, 125, 130-бет' },
  { a: 'үлкен', b: 'кішкентай', ru: 'большой — маленький', en: 'big — small', source: '1-сынып сөздігі' },
  { a: 'ыстық', b: 'суық', ru: 'горячий — холодный', en: 'hot — cold', source: '2-сынып сөздігі' },
  { a: 'ақ', b: 'қара', ru: 'белый — чёрный', en: 'white — black', source: '1-сынып сөздігі' }
];

export interface WordPair { kk: string; ru: string; en: string; module: number }

/** Lesson words short enough for a monolith face and with a single unambiguous meaning. */
export const TRANSLATIONS: WordPair[] = (() => {
  const out: WordPair[] = [], seen = new Set<string>();
  for (const m of curriculum.modules) for (const l of m.lessons) for (const w of l.words ?? []) {
    if (w.kk.length > 12 || w.ru.length > 13 || /[,(]/.test(w.ru) || w.ru.split(' ').length > 2 || seen.has(w.kk) || seen.has(w.ru)
      || [w.ru, w.en].some((t) => t.toLowerCase() === w.kk.toLowerCase())) continue;   // «лего = лего» teaches nothing
    seen.add(w.kk); seen.add(w.ru);
    out.push({ kk: w.kk, ru: w.ru, en: w.en, module: m.module });
  }
  return out;
})();
