// @ts-expect-error -- Node builtin; @types/node is not installed in the suite
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { NUMBER_WORDS } from '../data/numberWords';
import { S_LIVES, S_TASKS, addSentence, buildSandarRound, initialSandar, sandarReducer, word } from './sandarLogic';

const require = createRequire(import.meta.url);
(globalThis as unknown as { window: object }).window = (globalThis as unknown as { window?: object }).window || {};
require('../../../web/data.js');
const QD = (globalThis as unknown as { window: { QDATA: { numToKk(n: number): string } } }).window.QDATA;
const seeded = (seed: number) => () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };

describe('number words = the engine (run tools/build-numbers.js after changes)', () => {
  it('0–100', () => { for (let n = 0; n <= 100; n++) expect(NUMBER_WORDS[n]).toBe(QD.numToKk(n)); });
  it('sentence', () => { expect(addSentence(37, 25)).toBe('Отыз жеті қосу жиырма бес тең алпыс екі.'); expect(word(40)).toBe('қырық'); });
});
describe('rounds', () => {
  it('count: 8 numbers 11–99, the answer among 3 distinct options', () => {
    for (let s = 1; s < 30; s++) for (const st of buildSandarRound('count', seeded(s)).stages) {
      expect(st.answer).toBeGreaterThanOrEqual(11); expect(st.answer).toBeLessThanOrEqual(99);
      expect(new Set(st.options).size).toBe(3); expect(st.options).toContain(st.answer);
    }
  });
  it('add: sums ≤ 99, half of the tasks carry a ten, and the carry flag is right', () => {
    for (let s = 1; s < 30; s++) {
      const r = buildSandarRound('add', seeded(s)); expect(r.stages).toHaveLength(S_TASKS);
      for (const st of r.stages) { expect(st.answer).toBe(st.a + st.b); expect(st.answer).toBeLessThanOrEqual(99); expect(st.carry).toBe(st.a % 10 + st.b % 10 >= 10); }
      expect(r.stages.filter((x) => x.carry).length).toBeGreaterThanOrEqual(3);
    }
  });
  it('reducer: a wrong pick costs a life; a clean round wins', () => {
    let st = sandarReducer(initialSandar(), { type: 'start', round: buildSandarRound('add', seeded(2)) });
    const wrong = st.round!.stages[0].options.find((o) => o !== st.round!.stages[0].answer)!;
    st = sandarReducer(st, { type: 'pick', option: wrong }); expect(st.lives).toBe(S_LIVES - 1);
    for (let i = 0; i < S_TASKS; i++) { st = sandarReducer(st, { type: 'pick', option: st.round!.stages[i].answer }); st = sandarReducer(st, { type: 'next' }); }
    expect(st.phase).toBe('victory');
  });
});
