// @ts-expect-error -- Node builtin; @types/node is not installed in the suite
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { DECOYS, K_LIVES, PARTS, buildKiizRound, initialKiiz, kiizReducer } from './kiizLogic';

const require = createRequire(import.meta.url);
const g = globalThis as unknown as { window: Record<string, unknown>; self: unknown };
g.window = g.window || {}; g.self = g.window;
require('../../../web/data.js'); require('../../../web/grammar-core.js');
const M = require('../../../web/mektep-core.js') as { YURT: { kk: string; done: string }[] };
const seeded = (seed: number) => () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };

describe('the yurt = the «Мектеп» logic table (one order for the 2D topic and the 3D build)', () => {
  it('same parts, same order, same narrator lines', () => {
    expect(PARTS.map((p) => p.kk)).toEqual(M.YURT.map((y) => y.kk));
    expect(PARTS.map((p) => p.done)).toEqual(M.YURT.map((y) => y.done));
  });
  it('decoys are not yurt parts', () => { for (const d of DECOYS) expect(PARTS.map((p) => p.kk)).not.toContain(d.kk); });
});

describe('build: «Енді не керек?»', () => {
  it('five steps in order; the answer is the next part; 3 distinct options; never a part already standing', () => {
    for (let s = 1; s < 60; s++) {
      const r = buildKiizRound('build', seeded(s));
      expect(r.stages.map((st) => st.answer)).toEqual(PARTS.map((p) => p.kk));
      r.stages.forEach((st, i) => {
        expect(st.options).toContain(st.answer); expect(new Set(st.options).size).toBe(3);
        for (const o of st.options) expect(PARTS.slice(0, i).map((p) => p.kk)).not.toContain(o);
        expect(st.target).toBe(i);
      });
    }
  });
});

describe('name: «Бұл не?»', () => {
  it('each part lights up once; the answer is its name; 3 part names as options', () => {
    for (let s = 1; s < 60; s++) {
      const r = buildKiizRound('name', seeded(s));
      expect(r.stages.map((st) => st.target).sort()).toEqual([0, 1, 2, 3, 4]);
      for (const st of r.stages) {
        expect(st.answer).toBe(PARTS[st.target].kk); expect(st.options).toContain(st.answer); expect(new Set(st.options).size).toBe(3);
        for (const o of st.options) expect(PARTS.map((p) => p.kk)).toContain(o);
      }
    }
  });
});

describe('reducer', () => {
  it('a wrong pick costs a life, the right one builds; five right answers win', () => {
    const r = buildKiizRound('build', seeded(3));
    let s = kiizReducer(initialKiiz(), { type: 'start', round: r });
    const wrong = r.stages[0].options.find((o) => o !== r.stages[0].answer)!;
    s = kiizReducer(s, { type: 'pick', option: wrong }); expect(s.phase).toBe('miss'); expect(s.lives).toBe(K_LIVES - 1); expect(s.built).toBe(0);
    s = kiizReducer(s, { type: 'pick', option: wrong }); expect(s.lives).toBe(K_LIVES - 1);   // the same wrong option twice does not count
    for (let i = 0; i < 5; i++) {
      s = kiizReducer(s, { type: 'pick', option: r.stages[i].answer }); expect(s.phase).toBe('hit'); expect(s.built).toBe(i + 1);
      s = kiizReducer(s, { type: 'next' });
    }
    expect(s.phase).toBe('victory'); expect(s.firstTry).toBe(4);
  });
  it('three wrong picks lose the round', () => {
    const r = buildKiizRound('name', seeded(5));
    let s = kiizReducer(initialKiiz(), { type: 'start', round: r });
    for (let k = 0; k < 3; k++) {
      const st = r.stages[s.i], o = st.options.find((x) => x !== st.answer && !s.tried.includes(x));
      if (!o) { s = kiizReducer(s, { type: 'pick', option: st.answer }); s = kiizReducer(s, { type: 'next' }); k--; continue; }
      s = kiizReducer(s, { type: 'pick', option: o });
    }
    expect(s.phase).toBe('defeat');
  });
});
