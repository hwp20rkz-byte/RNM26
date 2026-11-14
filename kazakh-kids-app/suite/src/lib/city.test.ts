// @ts-expect-error -- Node builtin; @types/node is not installed in the suite
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { PLACES, fixPhrase, goPhrase, sign } from '../data/cityCorpus';
import { buildCityRound, building, cityReducer, expected, initialCity, C_LIVES, ON_SCREEN, TASKS } from './cityLogic';

const require = createRequire(import.meta.url);
const G = require('../../../web/grammar-core.js') as { caseForm(w: string, c: string): string };
const seeded = (seed: number) => () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };

describe('corpus', () => {
  it('the dative of every place is what the grammar engine builds', () => {
    for (const p of PLACES) expect(p.dat).toBe(G.caseForm(p.kk, 'barys'));
  });
  it('phrases and signs', () => {
    const ph = PLACES.find((p) => p.kk === 'дәріхана')!, sch = PLACES.find((p) => p.kk === 'мектеп')!;
    expect(goPhrase(ph)).toBe('Дәріханаға барамын!'); expect(goPhrase(sch)).toBe('Мектепке барамын!');
    expect(fixPhrase(ph)).toBe('Бұл — дәріхана.'); expect(sign('әуежай')).toBe('ӘУЕЖАЙ');
    expect(new Set(PLACES.map((p) => p.kk)).size).toBe(PLACES.length);
    for (const p of PLACES) expect(p.hint.kk.endsWith('.') && !!p.hint.ru && !!p.hint.en).toBe(true);
  });
});

describe('rounds', () => {
  it('go: 8 tasks, 6 distinct buildings, the target among them, signs true', () => {
    for (let seed = 1; seed < 30; seed++) {
      const r = buildCityRound('go', seeded(seed));
      expect(r.stages).toHaveLength(TASKS);
      expect(new Set(r.stages.map((s) => s.places[s.target].kk)).size).toBe(TASKS);
      for (const s of r.stages) { expect(new Set(s.places).size).toBe(ON_SCREEN); expect(s.signs).toEqual(s.places.map((p) => p.kk)); }
    }
  });
  it('fix: exactly one wrong sign, swapped with a place not on screen; the right sign is an option', () => {
    for (let seed = 1; seed < 30; seed++) for (const s of buildCityRound('fix', seeded(seed)).stages) {
      const wrong = s.signs.filter((x, k) => x !== s.places[k].kk);
      expect(wrong).toHaveLength(1);
      expect(s.places.map((p) => p.kk)).not.toContain(wrong[0]);
      expect(s.fixOptions).toContain(s.places[s.target].kk); expect(new Set(s.fixOptions).size).toBe(3);
    }
  });
});

describe('reducer', () => {
  it('go: a wrong building costs a life; the right one is a hit', () => {
    let s = cityReducer(initialCity(), { type: 'start', round: buildCityRound('go', seeded(3)) });
    const st = s.round!.stages[0], wrong = building((st.target + 1) % ON_SCREEN);
    s = cityReducer(s, { type: 'pick', option: wrong }); expect(s.phase).toBe('miss'); expect(s.lives).toBe(C_LIVES - 1);
    expect(cityReducer(s, { type: 'pick', option: wrong })).toBe(s);
    s = cityReducer(s, { type: 'pick', option: expected(s)! }); expect(s.phase).toBe('hit'); expect(s.firstTry).toBe(0);
  });
  it('fix: find the building, then choose the sign; a clean round counts every task first try', () => {
    let s = cityReducer(initialCity(), { type: 'start', round: buildCityRound('fix', seeded(5)) });
    for (let i = 0; i < TASKS; i++) {
      s = cityReducer(s, { type: 'pick', option: expected(s)! }); expect(s.phase).toBe('fix');
      s = cityReducer(s, { type: 'pick', option: expected(s)! }); expect(s.phase).toBe('hit');
      s = cityReducer(s, { type: 'next' });
    }
    expect(s.phase).toBe('victory'); expect(s.firstTry).toBe(TASKS);
  });
  it('a wrong sign in the fix step keeps the step; three slips end the round', () => {
    let s = cityReducer(initialCity(), { type: 'start', round: buildCityRound('fix', seeded(9)) });
    s = cityReducer(s, { type: 'pick', option: expected(s)! });
    const bad = s.round!.stages[0].fixOptions!.find((o) => o !== expected(s))!;
    s = cityReducer(s, { type: 'pick', option: bad }); expect(s.phase).toBe('miss'); expect(s.step).toBe('fix');
    s = cityReducer(s, { type: 'pick', option: expected(s)! }); expect(s.phase).toBe('hit'); expect(s.firstTry).toBe(0);
    s = cityReducer(s, { type: 'next' });
    for (let k = 0; k < 2; k++) s = cityReducer(s, { type: 'pick', option: building((s.round!.stages[s.i].target + 1 + k) % ON_SCREEN) });
    expect(s.phase).toBe('defeat');
  });
});
