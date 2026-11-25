// @ts-expect-error -- Node builtin; @types/node is not installed in the suite
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { S_LIVES, S_TASKS, SCALES_Q, addSentence, buildScalesRound, divSentence, initialScales, rightTotal, sayShort, scalesReducer } from './scalesLogic';

const require = createRequire(import.meta.url);
const g = globalThis as unknown as { window: Record<string, unknown>; self: unknown };
g.window = g.window || {}; g.self = g.window;
require('../../../web/data.js');
const M = require('../../../web/mektep-core.js') as { scalesAdd(r: number, x: number): string; scalesDiv(t: number, w: number): string; scalesSay(m: string, n: number): string; SCALES_Q: Record<string, string>; lines3d(): string[] };
const seeded = (seed: number) => () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };

describe('sentences = the main game (voiced there)', () => {
  it('reference (written by hand)', () => {
    expect(addSentence(7, 5)).toBe('Жеті қосу бес тең он екі.'); expect(divSentence(12, 3)).toBe('Он екі бөлу үш тең төрт.');
    expect(sayShort('add', 5)).toBe('Бес килограмм!'); expect(sayShort('div', 4)).toBe('Төрт гір!');
  });
  it('every sentence equals the engine; every spoken line has a voice line', () => {
    const spoken = new Set(M.lines3d());
    expect(SCALES_Q).toEqual(M.SCALES_Q); expect(spoken.has(SCALES_Q.add) && spoken.has(SCALES_Q.div)).toBe(true);
    for (const mode of ['add', 'div'] as const) for (let s = 1; s < 40; s++) for (const st of buildScalesRound(mode, seeded(s)).stages) {
      expect(st.sentence).toBe(mode === 'add' ? M.scalesAdd(st.right[0], +st.answer) : M.scalesDiv(st.left, st.w));
      expect(st.say).toBe(M.scalesSay(mode, +st.answer)); expect(spoken.has(st.say)).toBe(true);
    }
  });
});

describe('rounds', () => {
  it('8 different tasks; the answer balances the scale; three options in range', () => {
    for (const mode of ['add', 'div'] as const) for (let s = 1; s < 80; s++) {
      const r = buildScalesRound(mode, seeded(s));
      expect(r.stages).toHaveLength(S_TASKS); expect(new Set(r.stages.map((x) => x.sentence)).size).toBe(S_TASKS);
      for (const st of r.stages) {
        expect(rightTotal(st, +st.answer)).toBe(st.left);
        for (const o of st.options) if (o !== st.answer) expect(rightTotal(st, +o)).not.toBe(st.left);
        expect(new Set(st.options).size).toBe(3); expect(st.options).toContain(st.answer);
        expect(st.left).toBeLessThanOrEqual(30); expect(+st.answer).toBeGreaterThanOrEqual(1); expect(+st.answer).toBeLessThanOrEqual(9);
      }
    }
  });
});

describe('reducer', () => {
  it('a wrong weight costs a life; eight right ones win', () => {
    const r = buildScalesRound('add', seeded(5));
    let s = scalesReducer(initialScales(), { type: 'start', round: r });
    s = scalesReducer(s, { type: 'pick', option: r.stages[0].options.find((o) => o !== r.stages[0].answer)! }); expect(s.lives).toBe(S_LIVES - 1);
    for (const st of r.stages) { s = scalesReducer(s, { type: 'pick', option: st.answer }); s = scalesReducer(s, { type: 'next' }); }
    expect(s.phase).toBe('victory'); expect(s.firstTry).toBe(S_TASKS - 1);
  });
});
