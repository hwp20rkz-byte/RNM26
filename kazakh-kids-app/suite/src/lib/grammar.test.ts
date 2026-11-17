import { describe, expect, it } from 'vitest';
import { analyze, caseSuffix, distractors, caseAllomorphs, explain, personSuffix } from './morphology';
import { CASE_SENTENCES, PERSON_SENTENCES, CASES } from '../data/kazakhGrammarCorpus';
import { buildSession, initialTotem, judge, seeded, totemReducer, ZERO, comboMultiplier, MAX_LIVES } from './totemLogic';

describe('phonology', () => {
  it.each([
    ['қала', 'back', 'vowel'], ['кесене', 'front', 'vowel'], ['мүсін', 'front', 'nasal'], ['сарай', 'back', 'sonorant'],
    ['барыс', 'back', 'voiceless'], ['біз', 'front', 'voicedZ'], ['жалқау', 'back', 'sonorant'], ['су', 'back', 'sonorant'],
    ['автобус', 'back', 'voiceless'], ['лего', 'back', 'vowel'], ['велосипед', 'front', 'voiceless'], ['мәрмәр тас', 'back', 'voiceless']
  ])('%s → %s / %s', (w, h, f) => { const p = analyze(w); expect(p.harmony).toBe(h); expect(p.finalClass).toBe(f); });
});

describe('case endings — textbook forms', () => {
  it.each([
    ['мүсін', ['', 'нің', 'ге', 'ді', 'де', 'нен', 'мен']],          // the table on p. 122
    ['жануар', ['', 'дың', 'ға', 'ды', 'да', 'дан', 'мен']],
    ['су', ['', 'дың', 'ға', 'ды', 'да', 'дан', 'мен']],
    ['қыз', ['', 'дың', 'ға', 'ды', 'да', 'дан', 'бен']],
    ['кітап', ['', 'тың', 'қа', 'ты', 'та', 'тан', 'пен']],
    ['Бәйтерек', ['', 'тің', 'ке', 'ті', 'те', 'тен', 'пен']]
  ])('%s', (w, forms) => {
    expect(CASES.map((c) => caseSuffix(w, c.id).suffix)).toEqual(forms);
  });
  it('every corpus sentence matches the engine', () => {
    for (const s of CASE_SENTENCES) expect(caseSuffix(s.root, s.case).suffix, s.id + ' ' + s.root).toBe(s.ending);
    for (const s of PERSON_SENTENCES) expect(personSuffix(s.root, s.person).suffix, s.id + ' ' + s.root).toBe(s.ending);
  });
  it('the corpus covers every case and every person at least once', () => {
    for (const c of CASES) expect(CASE_SENTENCES.some((s) => s.case === c.id)).toBe(true);
    for (const p of ['men', 'sen', 'siz', 'biz', 'sender', 'sizder', 'ol']) expect(PERSON_SENTENCES.some((s) => s.person === p)).toBe(true);
  });
});

describe('personal endings', () => {
  it.each([['ақылды', 'мын'], ['мейірімді', 'мін'], ['емес', 'пін'], ['ұстаз', 'бын'], ['жалқау', 'мын'], ['қазақ', 'пын']])('Мен %s + %s', (w, e) => {
    expect(personSuffix(w, 'men').suffix).toBe(e);
  });
  it('Ол takes no ending', () => expect(personSuffix('мейірімді', 'ol').suffix).toBe(''));
});

describe('distractors', () => {
  it('first distractor flips harmony, never repeats the answer', () => {
    const d = distractors('тың', caseAllomorphs('ilik'), ['қа', 'ты'], 3);
    expect(d[0]).toBe('тің'); expect(d).not.toContain('тың'); expect(new Set(d).size).toBe(3);
  });
  it('explanations name the deciding sound and vowel', () => {
    const e = explain('мүсін', caseSuffix('мүсін', 'ilik'));
    expect(e.ru).toContain('«н»'); expect(e.ru).toContain('мягкая'); expect(e.en).toContain('front');
  });
});

describe('totem session', () => {
  it('visits all 7 cases, options are unique and contain the answer', () => {
    const tasks = buildSession('cases', seeded(7));
    expect(tasks).toHaveLength(8);
    expect(new Set(tasks.map((t) => t.target)).size).toBe(7);
    for (const t of tasks) { expect(t.options).toContain(t.answer); expect(new Set(t.options).size).toBe(t.options.length); expect(t.options.length).toBeGreaterThanOrEqual(3); }
    expect(tasks.find((t) => t.target === 'atau')!.answer).toBe(ZERO);
  });
  it('every option is a real Kazakh ending (no invented forms like «-пан»)', () => {
    for (let seed = 1; seed <= 40; seed++) for (const mode of ['cases', 'persons'] as const) for (const t of buildSession(mode, seeded(seed))) {
      const real = new Set<string>([ZERO, ...CASES.flatMap((c) => caseAllomorphs(c.id)), 'мын', 'мін', 'бын', 'бін', 'пын', 'пін', 'сың', 'сің', 'сыз', 'сіз', 'мыз', 'міз', 'быз', 'біз', 'пыз', 'піз', 'сыңдар', 'сіңдер', 'сыздар', 'сіздер']);
      for (const o of t.options) expect(real.has(o), t.sentence.root + ' ' + o).toBe(true);
    }
  });
  it('person mode works the same way', () => {
    const tasks = buildSession('persons', seeded(3));
    for (const t of tasks) expect(judge(t, t.answer).correct).toBe(true);
  });
  it('reducer: combo XP, lives, defeat, victory', () => {
    const tasks = buildSession('cases', seeded(1));
    let s = totemReducer(initialTotem(), { type: 'start', mode: 'cases', tasks });
    for (let i = 0; i < 3; i++) { s = totemReducer(s, { type: 'answer', option: s.tasks[s.index].answer }); s = totemReducer(s, { type: 'next' }); }
    expect(s.combo).toBe(3); expect(s.xp).toBe(20 + 20 + 30);
    const wrong = s.tasks[s.index].options.find((o) => o !== s.tasks[s.index].answer)!;
    s = totemReducer(s, { type: 'answer', option: wrong });
    expect(s.lives).toBe(MAX_LIVES - 1); expect(s.combo).toBe(0); expect(s.verdict!.explanation.ru.length).toBeGreaterThan(20);
    s = totemReducer(s, { type: 'next' });
    while (s.phase === 'playing') { s = totemReducer(s, { type: 'answer', option: s.tasks[s.index].answer }); s = totemReducer(s, { type: 'next' }); }
    expect(s.phase).toBe('victory'); expect(s.firstTry).toBe(7);
    let d = totemReducer(initialTotem(), { type: 'start', mode: 'cases', tasks });
    for (let i = 0; i < 3; i++) { const t = d.tasks[d.index]; d = totemReducer(d, { type: 'answer', option: t.options.find((o) => o !== t.answer)! }); if (d.phase === 'feedback') d = totemReducer(d, { type: 'next' }); }
    expect(d.phase).toBe('defeat');
  });
  it('combo multiplier steps', () => expect([1, 3, 5, 8].map(comboMultiplier)).toEqual([1, 1.5, 2, 3]));
});
