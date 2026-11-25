// @ts-expect-error -- Node builtin; @types/node is not installed in the suite
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { STEPS, WATER_Q, W_LIVES, W_TASKS, buildWaterRound, initialWater, shownStep, stepOf, waterReducer } from './waterLogic';

const require = createRequire(import.meta.url);
const g = globalThis as unknown as { window: Record<string, unknown>; self: unknown };
g.window = g.window || {}; g.self = g.window;
require('../../../web/data.js');
const M = require('../../../web/mektep-core.js') as { WATER: { kk: string; e: string }[]; WATER_Q: string; lines3d(): string[] };
const seeded = (seed: number) => () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };

describe('the stages = the «Мектеп» table, all voiced', () => {
  it('same stages in the same order; the question is the same', () => {
    expect(STEPS.map((s) => s.kk + s.e)).toEqual(M.WATER.map((s) => s.kk + s.e)); expect(WATER_Q).toBe(M.WATER_Q);
    const spoken = new Set(M.lines3d()); expect([WATER_Q, ...STEPS.map((s) => s.kk)].every((t) => spoken.has(t))).toBe(true);
  });
  it('reference order (written by hand): evaporation → cloud → rain → river → evaporation', () => {
    expect(STEPS.map((s) => s.kk)).toEqual(['Су буланады', 'Бұлт пайда болады', 'Жаңбыр жауады', 'Су өзенге ағады']);
  });
});

describe('rounds', () => {
  it('8 tasks; each answer is the next stage, and the next task starts there', () => {
    for (let s = 1; s < 60; s++) {
      const r = buildWaterRound(seeded(s));
      expect(r.stages).toHaveLength(W_TASKS);
      r.stages.forEach((st, i) => {
        expect(stepOf(st.answer)).toBe((st.from + 1) % 4); expect(new Set(st.options).size).toBe(3); expect(st.options).toContain(st.answer);
        if (i) expect(st.from).toBe(stepOf(r.stages[i - 1].answer));
      });
    }
  });
});

describe('reducer', () => {
  it('a wrong stage costs a life; the scene shows the answer after a hit; eight right ones win', () => {
    const r = buildWaterRound(seeded(4));
    let s = waterReducer(initialWater(), { type: 'start', round: r });
    expect(shownStep(s)).toBe(r.stages[0].from);
    s = waterReducer(s, { type: 'pick', option: r.stages[0].options.find((o) => o !== r.stages[0].answer)! }); expect(s.lives).toBe(W_LIVES - 1);
    for (const st of r.stages) { s = waterReducer(s, { type: 'pick', option: st.answer }); expect(shownStep(s)).toBe(stepOf(st.answer)); s = waterReducer(s, { type: 'next' }); }
    expect(s.phase).toBe('victory'); expect(s.firstTry).toBe(W_TASKS - 1);
  });
});
