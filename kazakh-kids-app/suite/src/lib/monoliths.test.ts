import { describe, expect, it } from 'vitest';
import { ANTONYMS, TRANSLATIONS } from '../data/pairsCorpus';
import { buildRound, initialMono, monoReducer, MONO_LIVES, PAIRS_PER_ROUND, XP_PER_MATCH, tileColor, type MonoState } from './monolithLogic';
import { seeded } from './totemLogic';

describe('pairs corpus', () => {
  it('antonyms are distinct words and each has a translation', () => {
    const words = ANTONYMS.flatMap((p) => [p.a, p.b]);
    expect(new Set(words).size).toBe(words.length);
    for (const p of ANTONYMS) { expect(p.ru).toContain('—'); expect(p.en).toContain('—'); }
  });
  it('translation pool comes from both modules, short and unambiguous', () => {
    expect(TRANSLATIONS.filter((w) => w.module === 2).length).toBeGreaterThanOrEqual(PAIRS_PER_ROUND);
    expect(TRANSLATIONS.filter((w) => w.module === 4).length).toBeGreaterThanOrEqual(PAIRS_PER_ROUND);
    expect(new Set(TRANSLATIONS.map((w) => w.ru)).size).toBe(TRANSLATIONS.length);
    for (const w of TRANSLATIONS) { expect(w.kk.length).toBeLessThanOrEqual(12); expect(w.ru).not.toMatch(/[,(]/); }
  });
});

describe('round', () => {
  it.each(['antonyms', 'translate', 'memory'] as const)('%s: 12 tiles, 6 pairs of 2, unique faces', (mode) => {
    for (let seed = 1; seed <= 20; seed++) {
      const r = buildRound(mode, 'ru', seeded(seed));
      expect(r.tiles).toHaveLength(12);
      for (let p = 0; p < 6; p++) expect(r.tiles.filter((t) => t.pair === p)).toHaveLength(2);
      expect(new Set(r.tiles.map((t) => t.text)).size).toBe(12);
    }
  });
  it('EN UI shows English translations', () => {
    const r = buildRound('translate', 'en', seeded(4));
    expect(r.tiles.filter((t) => !t.kk).every((t) => /^[A-Za-z][A-Za-z ’'-]*$/.test(t.text))).toBe(true);
  });
});

describe('no visual give-aways', () => {
  it('pair partners share a colour only by chance (≈1 in 6), never systematically', () => {
    let same = 0, total = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const r = buildRound('antonyms', 'ru', seeded(seed));
      for (let p = 0; p < 6; p++) { const [a, b] = r.tiles.filter((t) => t.pair === p); total++; if (tileColor(a) === tileColor(b)) same++; }
    }
    expect(same / total).toBeLessThan(0.3);
  });
});

describe('reducer', () => {
  const play = (mode: 'antonyms' | 'memory', wrongFirst: number) => {
    const round = buildRound(mode, 'ru', seeded(9));
    let s: MonoState = monoReducer(initialMono(), { type: 'start', round });
    for (let w = 0; w < wrongFirst; w++) {
      const a = round.tiles.find((t) => !s.matched.includes(t.id))!, b = round.tiles.find((t) => t.pair !== a.pair && !s.matched.includes(t.id))!;
      s = monoReducer(monoReducer(s, { type: 'select', id: a.id }), { type: 'select', id: b.id });
      expect(s.event!.kind).toBe('miss');
      s = monoReducer(s, { type: 'settle' });
      if (s.phase === 'defeat') return s;
    }
    for (let p = 0; p < 6; p++) {
      const [a, b] = round.tiles.filter((t) => t.pair === p);
      s = monoReducer(monoReducer(s, { type: 'select', id: a.id }), { type: 'select', id: b.id });
      expect(s.event!.kind).toBe('match');
      s = monoReducer(s, { type: 'settle' });
    }
    return s;
  };
  it('perfect game: victory, combo bonus XP', () => {
    const s = play('antonyms', 0);
    expect(s.phase).toBe('victory'); expect(s.bestCombo).toBe(6);
    expect(s.xp).toBe(6 * XP_PER_MATCH + (0 + 1 + 2 + 3 + 4 + 5) * 20);
  });
  it('three wrong pairs in an open mode → defeat', () => expect(play('antonyms', MONO_LIVES).phase).toBe('defeat'));
  it('memory mode: mistakes cost moves, not lives', () => {
    const s = play('memory', 4); expect(s.phase).toBe('victory'); expect(s.lives).toBe(MONO_LIVES); expect(s.mistakes).toBe(4);
  });
  it('tapping the same monolith twice drops it; input is ignored while resolving', () => {
    const round = buildRound('antonyms', 'ru', seeded(2));
    let s = monoReducer(initialMono(), { type: 'start', round });
    s = monoReducer(s, { type: 'select', id: 0 }); expect(s.selected).toBe(0);
    s = monoReducer(s, { type: 'select', id: 0 }); expect(s.selected).toBe(null);
    const [a, b] = round.tiles.filter((t) => t.pair === 0);
    s = monoReducer(monoReducer(s, { type: 'select', id: a.id }), { type: 'select', id: b.id });
    expect(monoReducer(s, { type: 'select', id: 5 })).toBe(s);
  });
});
