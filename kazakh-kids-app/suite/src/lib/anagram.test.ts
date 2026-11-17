import { describe, expect, it } from 'vitest';
import { LETTER_WORDS, LOOKALIKE, SPECIAL, specialsOf } from '../data/letterCorpus';
import { anagramReducer, buildAnagramRound, buildStage, focusLetter, gapped, initialAnagram, missHint, ANAGRAM_LIVES, WORDS_PER_ROUND, XP_CLEAN_WORD, XP_PER_LETTER, type AState } from './anagramLogic';

const seeded = (seed: number) => () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };

describe('letter corpus', () => {
  it('every word has a special letter, a picture, translations, and no duplicates', () => {
    expect(new Set(LETTER_WORDS.map((w) => w.kk)).size).toBe(LETTER_WORDS.length);
    for (const w of LETTER_WORDS) { expect(specialsOf(w.kk).length).toBeGreaterThan(0); expect(w.e && w.ru && w.en).toBeTruthy(); expect(w.kk).toBe(w.kk.toLowerCase()); }
  });
  it('every special letter is taught by at least two words', () => {
    for (const c of SPECIAL) expect(LETTER_WORDS.filter((w) => w.kk.includes(c)).length).toBeGreaterThanOrEqual(2);
  });
  it('the decoy look-alike never already occurs in the word', () => {
    for (const w of LETTER_WORDS) expect(w.kk.includes(LOOKALIKE[focusLetter(w.kk)])).toBe(false);
  });
});

describe('stages', () => {
  it('build: the word letters plus one look-alike decoy, never pre-solved', () => {
    for (const w of LETTER_WORDS) for (let seed = 1; seed < 6; seed++) {
      const st = buildStage(w, 'build', seeded(seed));
      expect(st.cubes.filter((c) => !c.decoy).map((c) => c.text).sort()).toEqual([...w.kk].sort());
      expect(st.cubes.filter((c) => c.decoy).map((c) => c.text)).toEqual([LOOKALIKE[st.special]]);
    }
  });
  it('missing: the gap is the focus letter; four distinct options with exactly one right', () => {
    for (const w of LETTER_WORDS) {
      const st = buildStage(w, 'missing', seeded(3));
      expect(gapped(st).replace('_', st.special)).toBe(w.kk);
      expect(new Set(st.cubes.map((c) => c.text)).size).toBe(4);
      expect(st.cubes.filter((c) => !c.decoy).map((c) => c.text)).toEqual([st.special]);
    }
  });
  it('a round has 6 words with different focus letters first', () => {
    const r = buildAnagramRound('build', seeded(9));
    expect(r.stages).toHaveLength(WORDS_PER_ROUND);
    expect(new Set(r.stages.map((s) => s.special)).size).toBe(WORDS_PER_ROUND);
  });
});

function solve(s: AState): AState {
  const st = s.round!.stages[s.stage];
  const used = new Set<number>();
  for (const t of st.target) { const c = st.cubes.find((x) => !x.decoy && x.text === t && !used.has(x.id))!; used.add(c.id); s = anagramReducer(s, { type: 'pick', cube: c.id }); }
  return s;
}

describe('reducer', () => {
  it('a clean round: letters dock in order, each word pays the bonus, victory', () => {
    let s = anagramReducer(initialAnagram(), { type: 'start', round: buildAnagramRound('build', seeded(4)) });
    const n = s.round!.stages[0].target.length;
    s = solve(s);
    expect(s.phase).toBe('done'); expect(s.xp).toBe(n * XP_PER_LETTER + XP_CLEAN_WORD);
    for (let i = 0; i < WORDS_PER_ROUND; i++) { if (i) s = solve(s); s = anagramReducer(s, { type: 'next' }); }
    expect(s.phase).toBe('victory'); expect(s.cleanWords).toBe(WORDS_PER_ROUND);
  });
  it('the look-alike costs a life and the hint names the letter and its sound', () => {
    let s = anagramReducer(initialAnagram(), { type: 'start', round: buildAnagramRound('build', seeded(5)) });
    const st = s.round!.stages[0], decoy = st.cubes.find((c) => c.decoy)!;
    expect(missHint(st, decoy, 'ru')).toContain('русская буква');
    s = anagramReducer(s, { type: 'pick', cube: decoy.id });
    expect(s.lives).toBe(ANAGRAM_LIVES - 1); expect(s.phase).toBe('resolving');
    for (let i = 1; i < ANAGRAM_LIVES; i++) { s = anagramReducer(s, { type: 'settle' }); s = anagramReducer(s, { type: 'pick', cube: decoy.id }); }
    expect(anagramReducer(s, { type: 'settle' }).phase).toBe('defeat');
  });
  it('a letter out of order is a mistake; a repeated letter may come from either cube', () => {
    const w = LETTER_WORDS.find((x) => x.kk === 'қала')!;
    let s = anagramReducer(initialAnagram(), { type: 'start', round: { mode: 'build', stages: [buildStage(w, 'build', seeded(2))] } });
    const st = s.round!.stages[0], as = st.cubes.filter((c) => c.text === 'а');
    s = anagramReducer(s, { type: 'pick', cube: as[0].id });
    expect(s.phase).toBe('resolving');
    s = anagramReducer(s, { type: 'settle' });
    s = anagramReducer(s, { type: 'pick', cube: st.cubes.find((c) => c.text === 'қ')!.id });
    s = anagramReducer(s, { type: 'pick', cube: as[1].id });                // the second «а» cube first is fine
    expect(s.docked).toHaveLength(2);
  });
  it('missing mode: one right cube finishes the word', () => {
    let s = anagramReducer(initialAnagram(), { type: 'start', round: buildAnagramRound('missing', seeded(8)) });
    s = solve(s);
    expect(s.phase).toBe('done');
  });
});
