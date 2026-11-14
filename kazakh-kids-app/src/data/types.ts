/* Typed schema of src/data/curriculum.json — the single source of the textbook modules 2 and 4.
 * tools/build-curriculum.js validates the JSON against these rules and emits web/curriculum.js
 * (window.QCURRICULUM), which the app loads before app.js. */

export type PersonaId = 'ALIBEK' | 'ANEL' | 'ZHALKAU' | 'ATA' | 'AZHE' | 'APAI' | 'ARCH';

export interface Bi { ru: string; en: string }
export interface Word extends Bi { kk: string; e: string }
export interface Sentence extends Bi { kk: string; alt?: string[] }
/** Gap in a sentence; `ans` must be one of `opts`. */
export interface Fill extends Bi { pre: string; ans: string; post: string; opts: string[] }
/** «Жалғау шебері»: root + [?] — pick the affix that keeps vowel harmony / assimilation. */
export interface Affix extends Bi { root: string; person?: string; ans: string; opts: string[]; why: string; whyEn: string }
/** «Қатені тап»: the spoken form `said` differs from the written one; pick the correct spelling. */
export interface Buster extends Bi { said?: string; ans: string; opts: string[]; why: string; whyEn: string }
/** Postposition / auxiliary word dragged into the gap (үшін, туралы, себебі, …). */
export type Post = Fill;

export interface Lesson {
  id: string; kk: string; ru: string; en: string; icon: string; page: number;
  /** Prompt unit this textbook lesson implements, e.g. «1.3 Қоғамдық көліктегі әдеп». */
  unit: string;
  game: string;
  book: string;
  tip: Bi;
  poem?: { kk: string; author?: string };
  rule?: string;
  words: Word[];
  sentences: Sentence[];
  fills: Fill[];
  affixes?: Affix[];
  busters?: Buster[];
  posts?: Post[];
  review?: boolean;
  assess?: boolean;
  /** Checkpoint: time limit and a hard heart cap. */
  boss?: { seconds: number; hearts: number };
}

export interface Module {
  id: string; module: number; kk: string; ru: string; en: string;
  hue: 'green' | 'blue' | 'pink' | 'purple' | 'gold' | 'orange' | 'red' | 'teal';
  hero: string; mascot: string; mascotEn: string; pages: string;
  epigraph: { kk: string; author: string };
  lessons: Lesson[];
}

export interface SortItem extends Bi { kk: string; e: string; bin: string }
export type TopicGame =
  | { type: 'sort'; kk: string; ru: string; en: string; icon: string; bins: { id: string; kk: string; e: string }[]; items: SortItem[]; showWord?: boolean; wide?: boolean; plural?: Record<string, string> }
  | { type: 'pairs'; kk: string; ru: string; en: string; icon: string; pairs: { a: string; ae: string; b: string; be: string }[]; iconsLeft?: boolean }
  | { type: 'seq'; kk: string; ru: string; en: string; icon: string; items: [string, string, string][]; chunk?: number }
  | { type: '3d'; kk: string; ru: string; en: string; icon: string; scene: 'wheel' | 'workshop' | 'room'; /** open without finishing its lesson */ free?: boolean }
  | { type: 'dialogue'; kk: string; ru: string; en: string; icon: string; dialogue: string };

export interface Choice extends Bi { kk: string; next: string; ok: boolean; xp?: number; why?: Bi; speak?: boolean }
export interface DNode extends Bi { who: PersonaId; kk: string; next?: string; choices?: Choice[]; end?: boolean; anim?: string }
export interface Dialogue { id: string; kk: string; ru: string; en: string; scene: 'bus' | 'baiterek'; start: string; nodes: Record<string, DNode> }

/** easy — 1–2 grade vocabulary; textbook — modules 2 and 4 of the 3rd-grade textbook. */
export interface Riddle extends Bi { answer: string; clue: string; src: string; level: 'easy' | 'textbook' }
export interface RoomItem extends Bi { id: string; kk: string; e: string; to: string; say: string }
export interface Container extends Bi { id: string; kk: string; e: string }
export interface Tier extends Bi { id: string; kk: string; q: string; ans: string; opts: string[] }
export interface Blueprint extends Bi { id: string; kk: string; city: string; tiers: Tier[]; done: string }

export interface Curriculum {
  version: number;
  source: string;
  modules: Module[];
  topicGames: Record<string, TopicGame>;
  dialogues: Record<string, Dialogue>;
  riddles: Riddle[];
  room: { containers: Container[]; items: RoomItem[]; start: string; end: string };
  workshop: Blueprint[];
}
