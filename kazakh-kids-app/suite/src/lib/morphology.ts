/**
 * Kazakh morphology engine for the suite: case endings (септік жалғаулары) and predicate personal
 * endings (жіктік жалғаулары), with the two rules children must learn:
 *
 *   1. Vowel harmony (сингармонизм): the LAST vowel of the word decides back (жуан) vs front (жіңішке)
 *      endings: қала → қалаНЫҢ, кесене → кесенеНІҢ.
 *   2. Consonant assimilation: the LAST SOUND decides the first consonant of the ending:
 *      мүсін → мүсіНнің (nasal), сарай → сарайДЫҢ (sonorant), барыс → барысТЫҢ (voiceless).
 *
 * Every ending in the corpus is cross-checked against this engine in morphology.test.ts, so a typo in
 * the data cannot reach a child.
 */
import type { CaseId, FinalClass, Harmony, PersonId, PhonologyReport, SuffixResult } from '../types/game.types';

const BACK = 'аоұыяюё';
const FRONT = 'әеөүіэ';
/** у and и are written as vowels but sound like [ұу]/[үу] and [ій] — harmony comes from the previous vowel. */
const AMBIGUOUS = 'уи';
const VOWELS = BACK + FRONT + AMBIGUOUS;

const SONORANT = 'лрйуи';
const NASAL = 'мнң';
const VOICED_Z = 'жз';

/** The suffix attaches to the last word of a multi-word root: «мәрмәр тас» + тан. */
export function headWord(root: string): string {
  const parts = root.trim().split(/[\s-]+/);
  return parts[parts.length - 1].toLowerCase();
}

export function harmonyOf(root: string): { harmony: Harmony; lastVowel: string | null } {
  const w = headWord(root);
  let fallback: Harmony | null = null, ambiguous: string | null = null;
  for (let i = w.length - 1; i >= 0; i--) {
    const ch = w[i];
    if (BACK.includes(ch)) return { harmony: 'back', lastVowel: ch };
    if (FRONT.includes(ch)) return { harmony: 'front', lastVowel: ch };
    if (AMBIGUOUS.includes(ch) && ambiguous === null) { ambiguous = ch; fallback = ch === 'у' ? 'back' : 'front'; }
  }
  return { harmony: fallback ?? 'back', lastVowel: ambiguous };
}

export function finalClassOf(root: string): { finalLetter: string; finalClass: FinalClass } {
  const w = headWord(root), f = w[w.length - 1];
  if (SONORANT.includes(f)) return { finalLetter: f, finalClass: 'sonorant' };   // у/и act as consonants at the end: су → судың
  if (VOWELS.includes(f)) return { finalLetter: f, finalClass: 'vowel' };
  if (NASAL.includes(f)) return { finalLetter: f, finalClass: 'nasal' };
  if (VOICED_Z.includes(f)) return { finalLetter: f, finalClass: 'voicedZ' };
  return { finalLetter: f, finalClass: 'voiceless' };
}

export function analyze(root: string): PhonologyReport {
  const h = harmonyOf(root), c = finalClassOf(root);
  return { word: root, head: headWord(root), lastVowel: h.lastVowel, harmony: h.harmony, finalLetter: c.finalLetter, finalClass: c.finalClass };
}

type Table = Record<FinalClass, [string, string]>;   // [back, front]
const T = (vowel: [string, string], sonorant: [string, string], nasal: [string, string], voicedZ: [string, string], voiceless: [string, string]): Table =>
  ({ vowel, sonorant, nasal, voicedZ, voiceless });

/** Case endings by final class and harmony — the canonical school tables. */
export const CASE_TABLE: Record<Exclude<CaseId, 'atau'>, Table> = {
  ilik: T(['ның', 'нің'], ['дың', 'дің'], ['ның', 'нің'], ['дың', 'дің'], ['тың', 'тің']),
  barys: T(['ға', 'ге'], ['ға', 'ге'], ['ға', 'ге'], ['ға', 'ге'], ['қа', 'ке']),
  tabys: T(['ны', 'ні'], ['ды', 'ді'], ['ды', 'ді'], ['ды', 'ді'], ['ты', 'ті']),
  zhatys: T(['да', 'де'], ['да', 'де'], ['да', 'де'], ['да', 'де'], ['та', 'те']),
  shygys: T(['дан', 'ден'], ['дан', 'ден'], ['нан', 'нен'], ['дан', 'ден'], ['тан', 'тен']),
  komektes: T(['мен', 'мен'], ['мен', 'мен'], ['мен', 'мен'], ['бен', 'бен'], ['пен', 'пен'])
};

/** Predicate personal endings (жіктік) after nouns/adjectives: Мен ақылдыМЫН, Мен емесПІН, Мен ұстазБЫН. */
export const PERSON_TABLE: Record<Exclude<PersonId, 'ol' | 'olar'>, Table> = {
  men: T(['мын', 'мін'], ['мын', 'мін'], ['мын', 'мін'], ['бын', 'бін'], ['пын', 'пін']),
  sen: T(['сың', 'сің'], ['сың', 'сің'], ['сың', 'сің'], ['сың', 'сің'], ['сың', 'сің']),
  siz: T(['сыз', 'сіз'], ['сыз', 'сіз'], ['сыз', 'сіз'], ['сыз', 'сіз'], ['сыз', 'сіз']),
  biz: T(['мыз', 'міз'], ['мыз', 'міз'], ['мыз', 'міз'], ['быз', 'біз'], ['пыз', 'піз']),
  sender: T(['сыңдар', 'сіңдер'], ['сыңдар', 'сіңдер'], ['сыңдар', 'сіңдер'], ['сыңдар', 'сіңдер'], ['сыңдар', 'сіңдер']),
  sizder: T(['сыздар', 'сіздер'], ['сыздар', 'сіздер'], ['сыздар', 'сіздер'], ['сыздар', 'сіздер'], ['сыздар', 'сіздер'])
};

export function caseSuffix(root: string, c: CaseId): SuffixResult {
  const p = analyze(root);
  if (c === 'atau') return { suffix: '', phonology: p, rule: 'atau' };
  return { suffix: CASE_TABLE[c][p.finalClass][p.harmony === 'back' ? 0 : 1], phonology: p, rule: c + '.' + p.finalClass };
}

export function personSuffix(root: string, person: PersonId): SuffixResult {
  const p = analyze(root);
  if (person === 'ol' || person === 'olar') return { suffix: '', phonology: p, rule: 'person.zero' };
  return { suffix: PERSON_TABLE[person][p.finalClass][p.harmony === 'back' ? 0 : 1], phonology: p, rule: 'person.' + person + '.' + p.finalClass };
}

/** All distinct allomorphs of a case / person — the pool for distractors. */
export function caseAllomorphs(c: CaseId): string[] {
  if (c === 'atau') return [''];
  return [...new Set(Object.values(CASE_TABLE[c]).flat())];
}
export function personAllomorphs(p: PersonId): string[] {
  if (p === 'ol' || p === 'olar') return [''];
  return [...new Set(Object.values(PERSON_TABLE[p]).flat())];
}

/**
 * Pedagogically meaningful distractors, most instructive first:
 *   1) right consonant, wrong harmony (тың ↔ тің) — tests сингармонизм;
 *   2) right harmony, wrong consonant (тың ↔ дың/ның) — tests assimilation;
 *   3) the same consonant class in another case (ға for an ілік task) — tests the case meaning.
 */
export function distractors(answer: string, pool: string[], otherCasePool: string[], n: number): string[] {
  const out: string[] = [];
  const push = (s: string) => { if (s !== answer && !out.includes(s) && out.length < n) out.push(s); };
  const flipHarmony = (s: string) => s.replace(/[аоұыәеөүі]/g, (v) => ({ а: 'е', е: 'а', ы: 'і', і: 'ы', о: 'ө', ө: 'о', ұ: 'ү', ү: 'ұ', ә: 'а' } as Record<string, string>)[v] ?? v);
  const flipped = flipHarmony(answer);
  if (pool.includes(flipped)) push(flipped);          // only real endings — көмектес has no «пан»
  pool.filter((s) => s.length && s[1] === answer[1]).forEach(push);   // same vowel = same harmony, other consonant
  pool.forEach(push);
  otherCasePool.forEach(push);
  return out.slice(0, n);
}

const CLASS_RU: Record<FinalClass, string> = { vowel: 'гласная', sonorant: 'сонорный (л, р, й, у)', nasal: 'носовой (м, н, ң)', voicedZ: 'звонкий (ж, з)', voiceless: 'глухой' };
const CLASS_EN: Record<FinalClass, string> = { vowel: 'a vowel', sonorant: 'a sonorant (л, р, й, у)', nasal: 'a nasal (м, н, ң)', voicedZ: 'a voiced ж/з', voiceless: 'voiceless' };

/** One-line explanation of why `root` takes `suffix`: harmony + assimilation in plain words. */
export function explain(root: string, r: SuffixResult): { ru: string; en: string } {
  const p = r.phonology;
  if (r.suffix === '') {
    return r.rule === 'atau'
      ? { ru: 'Атау септік (кім? не?) — без окончания: «' + root + '».', en: 'The nominative (кім? не?) has no ending: «' + root + '».' }
      : { ru: 'Ол / Олар — личного окончания нет.', en: 'Ол / Олар take no personal ending.' };
  }
  const hRu = p.harmony === 'back' ? 'твёрдая' : 'мягкая', hEn = p.harmony === 'back' ? 'back' : 'front';
  const v = p.lastVowel ? '«' + p.lastVowel + '»' : '—';
  return {
    ru: root + ' + ' + r.suffix + ': последний звук «' + p.finalLetter + '» — ' + CLASS_RU[p.finalClass] + ', поэтому «' + r.suffix[0] + '…»; последняя гласная ' + v + ' — ' + hRu + ', поэтому -' + r.suffix + '.',
    en: root + ' + ' + r.suffix + ': the last sound «' + p.finalLetter + '» is ' + CLASS_EN[p.finalClass] + ', so «' + r.suffix[0] + '…»; the last vowel ' + v + ' is a ' + hEn + ' vowel, so -' + r.suffix + '.'
  };
}
