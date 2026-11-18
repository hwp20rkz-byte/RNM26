// @ts-expect-error -- Node builtin; @types/node is not installed in the suite
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { EVENTS, R_GAP, R_LIVES, R_PER, R_STAGES, buildRiverRound, evOf, initialRiver, riverReducer } from './riverLogic';

const require = createRequire(import.meta.url);
const g = globalThis as unknown as { window: Record<string, unknown>; self: unknown };
g.window = g.window || {}; g.self = g.window;
require('../../../web/data.js'); require('../../../web/grammar-core.js');
const M = require('../../../web/mektep-core.js') as { EVENTS: { kk: string; y: number }[] };
const seeded = (seed: number) => () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };

describe('the river = the «Мектеп» history table', () => {
  it('same events and years', () => { expect(EVENTS.map((e) => e.kk + ':' + e.y)).toEqual(M.EVENTS.map((e) => e.kk + ':' + e.y)); });
  it('reference order (written by hand): pyramids before the Olympics … independence last', () => {
    const order = [...EVENTS].sort((a, b) => a.y - b.y).map((e) => e.short);
    expect(order).toEqual(['Пирамидалар', 'Олимпиада', 'Алтын адам', 'Жібек жолы', 'Әл-Фараби', 'Ясауи кесенесі', 'Қазақ хандығы', 'Колумб', 'Абай', 'Тәуелсіздік']);
  });
});

describe('rounds', () => {
  it('4 stages of 4 events; the order is by year; neighbours ≥ 300 years apart', () => {
    for (let s = 1; s < 60; s++) {
      const r = buildRiverRound(seeded(s));
      expect(r.stages).toHaveLength(R_STAGES);
      for (const st of r.stages) {
        expect(st.order).toHaveLength(R_PER); expect([...st.events].sort()).toEqual([...st.order].sort());
        const ys = st.order.map((k) => evOf(k).y);
        for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(R_GAP);
      }
    }
  });
});

describe('reducer', () => {
  it('right picks in order fill the river; a wrong pick costs a life and places nothing', () => {
    const r = buildRiverRound(seeded(4));
    let s = riverReducer(initialRiver(), { type: 'start', round: r });
    const st = r.stages[0];
    s = riverReducer(s, { type: 'pick', event: st.order[2] }); expect(s.phase).toBe('miss'); expect(s.lives).toBe(R_LIVES - 1); expect(s.placed).toHaveLength(0);
    for (let k = 0; k < 4; k++) s = riverReducer(s, { type: 'pick', event: st.order[k] });
    expect(s.phase).toBe('stage'); expect(s.placed).toEqual(st.order);
    s = riverReducer(s, { type: 'next' }); expect(s.i).toBe(1); expect(s.placed).toHaveLength(0);
    for (let i = 1; i < 4; i++) { for (const e of r.stages[i].order) s = riverReducer(s, { type: 'pick', event: e }); s = riverReducer(s, { type: 'next' }); }
    expect(s.phase).toBe('victory'); expect(s.clean).toBe(3);
  });
});
