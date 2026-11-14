/**
 * Domain model of the QazaqVerse 3D suite.
 * Linguistic types (cases, persons, phonology) are kept separate from 3D/runtime state so the
 * grammar engine can be unit-tested without WebGL.
 */

/* ------------------------------------------------------------------ phonology */

/** Vowel harmony class of a word: жуан (back) or жіңішке (front). */
export type Harmony = 'back' | 'front';

/**
 * Class of the final sound — it decides the consonant of the suffix (assimilation).
 *  vowel     — а ә е о ө ұ ү ы і        → ның, ға, ны, да, дан, мен
 *  sonorant  — л р й у (и)              → дың, ға, ды, да, дан, мен
 *  nasal     — м н ң                    → ның, ға, ды, да, нан, мен
 *  voicedZ   — ж з                      → дың, ға, ды, да, дан, бен
 *  voiceless — к қ п с т ф х ш щ ц ч һ, and б в г д ғ at the end of loanwords → тың, қа, ты, та, тан, пен
 */
export type FinalClass = 'vowel' | 'sonorant' | 'nasal' | 'voicedZ' | 'voiceless';

export interface PhonologyReport {
  word: string;
  /** Last word of a multi-word root («мәрмәр тас» → «тас») — the suffix attaches to it. */
  head: string;
  lastVowel: string | null;
  harmony: Harmony;
  finalLetter: string;
  finalClass: FinalClass;
}

/* ------------------------------------------------------------------ grammar */

/** The 7 cases (септік) of Kazakh. */
export type CaseId = 'atau' | 'ilik' | 'barys' | 'tabys' | 'zhatys' | 'shygys' | 'komektes';
/** Persons for predicate endings (жіктік жалғау). Ол / Олар take no ending. */
export type PersonId = 'men' | 'sen' | 'siz' | 'ol' | 'biz' | 'sender' | 'sizder' | 'olar';

export interface Localized { ru: string; en: string }

export interface CaseInfo extends Localized {
  id: CaseId;
  kk: string;
  /** Question words, e.g. «кімнің? ненің?». */
  questions: string;
  /** All allomorphs of the case ending, used to build distractors. Empty string = zero ending. */
  allomorphs: string[];
  /** Theme colour of the runic ring (hex). */
  color: string;
}

export interface PersonInfo extends Localized { id: PersonId; kk: string; allomorphs: string[] }

/** Result of the morphology engine: the ending plus why it is that ending. */
export interface SuffixResult {
  suffix: string;
  phonology: PhonologyReport;
  /** Machine-readable rule key, e.g. «ilik.nasal» — maps to an explanation. */
  rule: string;
}

/* ------------------------------------------------------------------ corpus */

/** A sentence with one gap after `root`: `${before}${root}[ending]${after}`. */
export interface GapSentence extends Localized {
  id: string;
  root: string;
  before: string;
  after: string;
  /** Textbook reference, e.g. «3 сынып, 4-модуль, 122-бет». */
  source: string;
}
export interface CaseSentence extends GapSentence { case: CaseId }
export interface PersonSentence extends GapSentence { person: PersonId }

/* ------------------------------------------------------------------ game */

export type TotemMode = 'cases' | 'persons';

export interface TotemTask {
  id: string;
  mode: TotemMode;
  /** CaseId or PersonId. */
  target: CaseId | PersonId;
  sentence: GapSentence;
  answer: string;
  /** 3–4 options including the answer; shuffled. */
  options: string[];
  rule: string;
}

export interface AnswerVerdict {
  correct: boolean;
  chosen: string;
  answer: string;
  /** Full sentence with the correct ending — spoken and shown after the answer. */
  full: string;
  explanation: Localized;
}

export type GamePhase = 'intro' | 'playing' | 'feedback' | 'victory' | 'defeat';

/* ------------------------------------------------------------------ 3D / runtime */

export type Quality = 'low' | 'medium' | 'high';
export type CrystalState = 'idle' | 'hover' | 'dragging' | 'flying' | 'accepted' | 'rejected';
export type Lang = 'ru' | 'en';

/** Procedural sound effects of the synthesizer (no audio files). */
export type Sfx = 'chime' | 'snap' | 'beam' | 'buzz' | 'whoosh' | 'levelUp' | 'tap' | 'shockwave';

export type Vec3 = [number, number, number];
