import { describe, expect, it } from 'vitest';
import { SOLIDS, T_LIVES, T_TASKS, buildTowerRound, initialTower, mulSentence, towerReducer } from './towerLogic';

const seeded = (seed: number) => () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };

describe('tower: the multiplication table 2–9', () => {
  it('8 different products, the answer is a × b, two near wrong options', () => {
    for (let s = 1; s < 60; s++) {
      const r = buildTowerRound('tower', seeded(s));
      expect(r.stages).toHaveLength(T_TASKS);
      expect(new Set(r.stages.map((st) => st.a + 'x' + st.b)).size).toBe(T_TASKS);
      for (const st of r.stages) {
        expect(st.a).toBeGreaterThanOrEqual(2); expect(st.b).toBeLessThanOrEqual(9);
        expect(st.answer).toBe(String(st.a * st.b)); expect(st.options).toContain(st.answer); expect(new Set(st.options).size).toBe(3);
        for (const o of st.options) if (o !== st.answer) expect(Math.abs(+o - st.a * st.b)).toBeLessThanOrEqual(9);
      }
    }
  });
  it('the sentence in words (reference written by hand)', () => { expect(mulSentence(4, 6)).toBe('Төрт көбейту алты тең жиырма төрт.'); expect(mulSentence(9, 9)).toBe('Тоғыз көбейту тоғыз тең сексен бір.'); });
});

describe('shapes: five solids', () => {
  it('8 tasks, every solid appears, three different names', () => {
    for (let s = 1; s < 60; s++) {
      const r = buildTowerRound('shapes', seeded(s));
      expect(r.stages).toHaveLength(T_TASKS);
      expect(new Set(r.stages.map((st) => st.solid)).size).toBe(SOLIDS.length);
      for (const st of r.stages) { expect(st.answer).toBe(SOLIDS.find((x) => x.id === st.solid)!.kk); expect(new Set(st.options).size).toBe(3); expect(st.options).toContain(st.answer); }
    }
  });
});

describe('reducer', () => {
  it('a wrong pick costs a life; eight right ones win', () => {
    const r = buildTowerRound('tower', seeded(2));
    let s = towerReducer(initialTower(), { type: 'start', round: r });
    s = towerReducer(s, { type: 'pick', option: r.stages[0].options.find((o) => o !== r.stages[0].answer)! }); expect(s.lives).toBe(T_LIVES - 1);
    for (const st of r.stages) { s = towerReducer(s, { type: 'pick', option: st.answer }); s = towerReducer(s, { type: 'next' }); }
    expect(s.phase).toBe('victory'); expect(s.firstTry).toBe(T_TASKS - 1);
  });
});
