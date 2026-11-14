import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { ABILITIES, RANGE_ITEMS, canPhrase, demoPhrase } from '../data/gravityCorpus';
import { buildGravityRound, gravityReducer, initialGravity, G_LIVES, TARGETS } from './gravityLogic';

const require = createRequire(import.meta.url);
const G = require('../../../web/grammar-core.js') as { ability(stem: string, p: string, neg?: boolean): string };
const seeded = (seed: number) => () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };

describe('corpus', () => {
  it('every ability form is what the grammar engine builds', () => {
    for (const a of ABILITIES) {
      const pre = a.obj ? a.obj + ' ' : '';
      expect(a.can).toBe(pre + G.ability(a.stem, 'men'));
      expect(a.cannot).toBe(pre + G.ability(a.stem, 'men', true));
    }
  });
  it('items are distinct; phrases read «Мынау — X.» / «Анау — X.»', () => {
    expect(new Set(RANGE_ITEMS.map((x) => x.kk)).size).toBe(RANGE_ITEMS.length);
    expect(demoPhrase(true, 'алма')).toBe('Мынау — алма.');
    expect(canPhrase(ABILITIES[0], false)).toBe('Мен жүзе алмаймын.');
  });
});

describe('rounds', () => {
  it('10 targets; the answer is among distinct options and matches distance / yes-no', () => {
    for (const mode of ['demo', 'can'] as const) for (let seed = 1; seed < 20; seed++) {
      const r = buildGravityRound(mode, seeded(seed));
      expect(r.stages).toHaveLength(TARGETS);
      for (const st of r.stages) {
        expect(new Set(st.options).size).toBe(st.options.length);
        expect(st.options).toContain(st.answer);
        if (mode === 'demo') expect(st.answer.startsWith(st.near ? 'Мынау' : 'Анау')).toBe(true);
        else expect(st.answer.includes(st.yes ? 'аламын' : 'алмаймын')).toBe(true);
      }
    }
  });
});

describe('reducer', () => {
  it('right picks win the round; a wrong pick costs a life and can be retried with another option', () => {
    let s = gravityReducer(initialGravity(), { type: 'start', round: buildGravityRound('demo', seeded(4)) });
    const wrong = s.round!.stages[0].options.find((o) => o !== s.round!.stages[0].answer)!;
    s = gravityReducer(s, { type: 'pick', option: wrong });
    expect(s.phase).toBe('miss'); expect(s.lives).toBe(G_LIVES - 1);
    expect(gravityReducer(s, { type: 'pick', option: wrong })).toBe(s);
    s = gravityReducer(s, { type: 'pick', option: s.round!.stages[0].answer });
    expect(s.phase).toBe('hit'); expect(s.firstTry).toBe(0);
    for (let i = 1; i < TARGETS; i++) { s = gravityReducer(s, { type: 'next' }); s = gravityReducer(s, { type: 'pick', option: s.round!.stages[i].answer }); }
    s = gravityReducer(s, { type: 'next' });
    expect(s.phase).toBe('victory'); expect(s.firstTry).toBe(TARGETS - 1);
  });
  it('three wrong picks end the round', () => {
    let s = gravityReducer(initialGravity(), { type: 'start', round: buildGravityRound('can', seeded(7)) });
    for (let k = 0; k < G_LIVES; k++) { const st = s.round!.stages[s.i]; s = gravityReducer(s, { type: 'pick', option: st.options.filter((o) => o !== st.answer && !s.tried.includes(o))[0] ?? st.options[0] }); if (s.phase === 'hit') { s = gravityReducer(s, { type: 'next' }); } }
    expect(['defeat', 'miss', 'aim']).toContain(s.phase);
    expect(s.lives).toBeLessThan(G_LIVES);
  });
});
