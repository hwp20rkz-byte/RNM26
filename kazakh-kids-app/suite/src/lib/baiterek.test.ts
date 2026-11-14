import { describe, expect, it } from 'vitest';
import { buildDefenseRound, defenseReducer, face, fallTime, initialDefense, FALL, METEORS_PER_ROUND, SHIELDS, type DState } from './baiterekLogic';

const seeded = (seed: number) => () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };

describe('round', () => {
  it('12 different meteors, three distinct options with the right word among them', () => {
    for (const mode of ['pictures', 'words'] as const) for (let seed = 1; seed < 8; seed++) {
      const r = buildDefenseRound(mode, seeded(seed));
      expect(r.meteors).toHaveLength(METEORS_PER_ROUND);
      expect(new Set(r.meteors.map((m) => m.kk)).size).toBe(METEORS_PER_ROUND);
      for (const m of r.meteors) { expect(new Set(m.options).size).toBe(3); expect(m.options).toContain(m.kk); expect(m.lane).toBeGreaterThanOrEqual(0); expect(m.lane).toBeLessThan(3); }
    }
  });
  it('pictures mode shows an emoji, words mode the word in the UI language', () => {
    const p = buildDefenseRound('pictures', seeded(2)).meteors[0], w = buildDefenseRound('words', seeded(2)).meteors[0];
    expect(face(p, 'pictures', 'ru')).toBe(p.e);
    expect(face(w, 'words', 'en')).toBe(w.en);
  });
  it('fall time shrinks gently and never below the floor', () => {
    expect(fallTime('pictures', 0)).toBe(FALL.pictures[0]);
    expect(fallTime('words', 30)).toBe(FALL.words[1]);
    for (let i = 1; i < 12; i++) expect(fallTime('words', i - 1) - fallTime('words', i)).toBeLessThanOrEqual(0.4 + 1e-9);
  });
});

const start = (seed = 3): DState => defenseReducer(initialDefense(), { type: 'start', round: buildDefenseRound('words', seeded(seed)) });

describe('reducer', () => {
  it('right answers: hit, combo, speed bonus; twelve hits win', () => {
    let s = start();
    s = defenseReducer(s, { type: 'answer', word: s.round!.meteors[0].kk, left: 1 });
    expect(s.phase).toBe('hit'); expect(s.xp).toBe(50 + 30); expect(s.combo).toBe(1);
    s = defenseReducer(s, { type: 'next' });
    s = defenseReducer(s, { type: 'answer', word: s.round!.meteors[1].kk, left: 0 });
    expect(s.xp).toBe(80 + 60);                                                    // combo 2 → +10, no speed bonus
    for (let i = 2; i < METEORS_PER_ROUND; i++) { s = defenseReducer(s, { type: 'next' }); s = defenseReducer(s, { type: 'answer', word: s.round!.meteors[i].kk, left: 0.5 }); }
    s = defenseReducer(s, { type: 'next' });
    expect(s.phase).toBe('victory'); expect(s.firstTry).toBe(METEORS_PER_ROUND);
  });
  it('a wrong word breaks the combo, greys out, keeps the meteor falling; no shield lost', () => {
    let s = start(), m = s.round!.meteors[0];
    const bad = m.options.find((o) => o !== m.kk)!;
    s = defenseReducer(s, { type: 'answer', word: bad, left: 0.8 });
    expect(s.phase).toBe('falling'); expect(s.shields).toBe(SHIELDS); expect(s.wrong).toEqual([bad]);
    expect(defenseReducer(s, { type: 'answer', word: bad, left: 0.7 })).toBe(s);     // a greyed option does nothing
    s = defenseReducer(s, { type: 'answer', word: m.kk, left: 0.5 });
    expect(s.phase).toBe('hit'); expect(s.firstTry).toBe(0);
    m = s.round!.meteors[1];
  });
  it('three impacts end the round in defeat; answers after an impact are ignored', () => {
    let s = start();
    for (let k = 0; k < SHIELDS; k++) {
      s = defenseReducer(s, { type: 'impact' });
      expect(defenseReducer(s, { type: 'answer', word: s.round!.meteors[s.i].kk, left: 0 })).toBe(s);
      s = defenseReducer(s, { type: 'next' });
    }
    expect(s.phase).toBe('defeat'); expect(s.shields).toBe(0);
  });
});
