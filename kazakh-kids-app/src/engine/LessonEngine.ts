/* LessonEngine — the state machine behind every lesson of the game (and the boss checkpoints).
 * Pure TypeScript, no DOM: the renderer in web/app.js asks it what happened and draws the result.
 *
 *   question ──answer(ok)──▶ feedback ──next()──▶ question … ──▶ finished
 *        │                       │
 *        └──── tick(): time over ┴──▶ timeup        hearts reach 0 ──▶ failed
 *
 * Formative layer: combo multiplier on XP, per-category mistake tracking with an explanation key
 * (e.g. «harmony» → сингармонизм). Summative layer: first-try percent → mark 2–5 by the Kazakhstan
 * criteria thresholds and per-skill breakdown (Тыңдалым / Оқылым / Жазылым / Айтылым). */

export type Skill = 'tyn' | 'oqy' | 'zhaz' | 'ait';
export type Phase = 'question' | 'feedback' | 'finished' | 'failed' | 'timeup';
export type MistakeCategory = 'lexicon' | 'harmony' | 'grammar' | 'orthoepy' | 'listening' | 'speaking';

/** Exercise kind → skill (the four criteria of the Kazakhstan curriculum). */
export const SKILL_OF: Record<string, Skill> = {
  listen: 'tyn', buster: 'tyn',
  pick: 'oqy', pickR: 'oqy', sent: 'oqy', match: 'oqy', clock: 'oqy', clockR: 'oqy',
  build: 'zhaz', fill: 'zhaz', order: 'zhaz', clockLoc: 'zhaz', num: 'zhaz', affix: 'zhaz', post: 'zhaz',
  speak: 'ait'
};
/** Exercise kind → what a mistake there says about the learner. */
export const CATEGORY_OF: Record<string, MistakeCategory> = {
  pick: 'lexicon', pickR: 'lexicon', match: 'lexicon', sent: 'lexicon',
  affix: 'harmony', fill: 'grammar', post: 'grammar', build: 'grammar', order: 'grammar', clockLoc: 'grammar', num: 'grammar',
  clock: 'lexicon', clockR: 'lexicon', buster: 'orthoepy', listen: 'listening', speak: 'speaking'
};

export interface EngineOptions {
  /** Graded tasks in the lesson (retries of the same task are not counted twice). */
  total: number;
  hearts: number;
  /** Time limit in seconds (boss checkpoints); omit for untimed lessons. */
  seconds?: number;
  /** XP for one first-try answer before the combo multiplier. */
  xpPerTask?: number;
  now?: () => number;
}

export interface AnswerResult {
  ok: boolean; firstTry: boolean; heartsLeft: number; combo: number; multiplier: number; xpGained: number; phase: Phase;
}

export interface Summary {
  outcome: 'finished' | 'failed' | 'timeup';
  pct: number; mark: 2 | 3 | 4 | 5;
  firstTry: number; total: number;
  skills: Partial<Record<Skill, [number, number]>>;
  mistakes: Partial<Record<MistakeCategory, number>>;
  weakest: MistakeCategory | null;
  xp: number; bestCombo: number; timeUsedMs: number;
}

export function markOf(pct: number): 2 | 3 | 4 | 5 { return pct >= 85 ? 5 : pct >= 65 ? 4 : pct >= 40 ? 3 : 2; }
export function comboMultiplier(combo: number): number { return combo >= 10 ? 3 : combo >= 6 ? 2 : combo >= 3 ? 1.5 : 1; }

/** Daily streak: same day keeps it, the next day extends it, a gap restarts it at 1. Dates are YYYY-MM-DD. */
export function nextStreak(lastDay: string | null, today: string, streak: number): number {
  if (lastDay === today) return streak;
  const d = new Date(today + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - 1);
  return lastDay === d.toISOString().slice(0, 10) ? streak + 1 : 1;
}

export class LessonEngine {
  readonly total: number;
  readonly maxHearts: number;
  hearts: number;
  combo = 0;
  bestCombo = 0;
  xp = 0;
  phase: Phase = 'question';
  private readonly now: () => number;
  private readonly startedAt: number;
  private readonly deadline: number | null;
  private readonly xpPerTask: number;
  private readonly seen = new Map<string, { kind: string; first: boolean | null }>();
  private readonly mistakeCount: Partial<Record<MistakeCategory, number>> = {};
  private endedAt: number | null = null;

  constructor(o: EngineOptions) {
    if (!(o.total >= 0) || !(o.hearts > 0)) throw new Error('LessonEngine: total ≥ 0 and hearts > 0 are required');
    this.total = o.total; this.hearts = this.maxHearts = o.hearts;
    this.now = o.now || (() => Date.now());
    this.startedAt = this.now();
    this.deadline = o.seconds ? this.startedAt + o.seconds * 1000 : null;
    this.xpPerTask = o.xpPerTask ?? 2;
  }

  get timed(): boolean { return this.deadline !== null; }
  remainingMs(): number { return this.deadline === null ? Infinity : Math.max(0, this.deadline - this.now()); }

  /** Call from a timer; moves to «timeup» once the limit is over. */
  tick(): Phase {
    if (this.phase === 'question' || this.phase === 'feedback') {
      if (this.deadline !== null && this.now() >= this.deadline) this.end('timeup');
    }
    return this.phase;
  }

  /** Record an answer to task `taskId` of kind `kind`. A task answered again (retry queue) never counts as first try. */
  answer(taskId: string, kind: string, ok: boolean): AnswerResult {
    if (this.phase !== 'question') throw new Error('LessonEngine: answer() in phase ' + this.phase);
    if (this.tick() === 'timeup') return this.result(ok, false, 0);
    let rec = this.seen.get(taskId);
    const isFirst = !rec;
    if (!rec) { rec = { kind, first: null }; this.seen.set(taskId, rec); }
    let gained = 0;
    if (ok) {
      this.combo++; this.bestCombo = Math.max(this.bestCombo, this.combo);
      if (isFirst) rec.first = true;
      gained = Math.round(this.xpPerTask * comboMultiplier(this.combo) * (isFirst ? 1 : 0.5));
      this.xp += gained;
    } else {
      this.combo = 0;
      if (isFirst) rec.first = false;
      const cat = CATEGORY_OF[kind] || 'lexicon';
      this.mistakeCount[cat] = (this.mistakeCount[cat] || 0) + 1;
      this.hearts = Math.max(0, this.hearts - 1);
    }
    this.phase = this.hearts === 0 ? 'failed' : 'feedback';
    if (this.phase === 'failed') this.endedAt = this.now();
    return this.result(ok, isFirst && ok, gained);
  }

  /** After feedback: go to the next question, or finish when nothing is left. */
  next(hasMore: boolean): Phase {
    if (this.phase !== 'feedback') return this.phase;
    if (this.tick() === 'timeup') return this.phase;
    if (hasMore) this.phase = 'question'; else this.end('finished');
    return this.phase;
  }

  summary(): Summary {
    const skills: Partial<Record<Skill, [number, number]>> = {};
    let first = 0;
    this.seen.forEach((r) => {
      const s = SKILL_OF[r.kind] || 'oqy';
      const cell = skills[s] || (skills[s] = [0, 0]);
      cell[1]++; if (r.first) { cell[0]++; first++; }
    });
    const total = Math.max(this.total, this.seen.size);
    const pct = Math.round(first / Math.max(1, total) * 100);
    let weakest: MistakeCategory | null = null;
    (Object.keys(this.mistakeCount) as MistakeCategory[]).forEach((k) => { if (!weakest || (this.mistakeCount[k] || 0) > (this.mistakeCount[weakest] || 0)) weakest = k; });
    return {
      outcome: this.phase === 'failed' || this.phase === 'timeup' ? this.phase : 'finished',
      pct, mark: markOf(pct), firstTry: first, total, skills, mistakes: { ...this.mistakeCount }, weakest,
      xp: this.xp, bestCombo: this.bestCombo, timeUsedMs: (this.endedAt ?? this.now()) - this.startedAt
    };
  }

  private end(p: 'finished' | 'timeup'): void { this.phase = p; this.endedAt = this.now(); }
  private result(ok: boolean, firstTry: boolean, gained: number): AnswerResult {
    return { ok, firstTry, heartsLeft: this.hearts, combo: this.combo, multiplier: comboMultiplier(this.combo), xpGained: gained, phase: this.phase };
  }
}

/** What to tell the child (and the teacher) about the weakest category. */
export const ADVICE: Record<MistakeCategory, { ru: string; en: string }> = {
  harmony: { ru: 'Сингармонизм: твёрдое слово (а, о, ұ, ы) — твёрдое окончание, мягкое (ә, е, і, ө, ү) — мягкое. Повтори «Жалғау шебері».', en: 'Vowel harmony: back-vowel word (а, о, ұ, ы) → back ending, front-vowel word (ә, е, і, ө, ү) → front ending. Practise «Жалғау шебері».' },
  orthoepy: { ru: 'Произношение и письмо расходятся: [ұқұпту] — ұқыпты. Повтори «Қатені тап» и слушай 🔊.', en: 'Speech and spelling differ: [ұқұпту] — ұқыпты. Practise «Қатені тап» and listen 🔊.' },
  grammar: { ru: 'Окончания и послелоги: проверь падеж по вопросу (кімге? неден? немен?).', en: 'Endings and postpositions: check the case by its question (кімге? неден? немен?).' },
  lexicon: { ru: 'Слова темы: повтори карточки урока.', en: 'Topic words: review the lesson cards.' },
  listening: { ru: 'Аудирование: слушай фразу два раза, медленно.', en: 'Listening: play the phrase twice, slowly.' },
  speaking: { ru: 'Говорение: послушай образец, потом скажи громко и чётко.', en: 'Speaking: listen to the model, then say it loud and clear.' }
};
