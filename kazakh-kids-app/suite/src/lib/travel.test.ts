// @ts-expect-error -- Node builtin; @types/node is not installed in the suite
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { CITIES, MAP_GAP, TOUR } from '../data/travelData';
import { V_LIVES, V_TASKS, buildTravelRound, candidates, cityOf, initialTravel, travelReducer } from './travelLogic';

const require = createRequire(import.meta.url);
const g = globalThis as unknown as { window: Record<string, unknown>; self: unknown };
g.window = g.window || {}; g.self = g.window;
const { build, render } = require('../../../tools/build-travel.js') as { build(): unknown; render(d: unknown): string };
const { readFileSync } = require('node:fs') as { readFileSync(p: string, e: string): string };
const seeded = (seed: number) => () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };

describe('the data = the main game (generated, never edited by hand)', () => {
  it('travelData.ts is up to date with web/kz-map.js and web/mektep-core.js', () => {
    const file = readFileSync(new URL('../data/travelData.ts', import.meta.url).pathname, 'utf8');
    expect(file).toBe(render(build()));
  });
  it('reference sentences (written by hand)', () => {
    const b = TOUR.find((t) => t.landmark === 'Бәйтерек')!;
    expect([b.city, b.line, b.place]).toEqual(['Астана', 'Мен Бәйтеректі көргім келеді. Қай қалаға барамыз?', 'Бәйтерек — Астанада.']);
    expect(TOUR.find((t) => t.landmark === 'Каспий теңізі')!.place).toBe('Каспий теңізі — Ақтаудың маңында.');
    expect(cityOf('Шымкент').ask).toBe('Шымкент қай жерде?');
    expect(cityOf('Алматы').where).toBe('Алматы — Қазақстанның оңтүстік-шығысында.');
  });
  it('19 cities inside the 600 × 340 map; every landmark city is one of them', () => {
    expect(CITIES).toHaveLength(19);
    for (const c of CITIES) { expect(c.x).toBeGreaterThan(0); expect(c.x).toBeLessThan(600); expect(c.y).toBeGreaterThan(0); expect(c.y).toBeLessThan(340); }
    for (const t of TOUR) expect(CITIES.some((c) => c.name === t.city)).toBe(true);
  });
});

describe('rounds', () => {
  it('8 different tasks; three candidate cities ≥ MAP_GAP apart, the answer among them', () => {
    for (const mode of ['tour', 'map'] as const) for (let s = 1; s < 80; s++) {
      const r = buildTravelRound(mode, seeded(s));
      expect(r.stages).toHaveLength(V_TASKS);
      expect(new Set(r.stages.map((x) => x.prompt)).size).toBe(V_TASKS);
      for (const st of r.stages) {
        expect(st.options).toHaveLength(3); expect(st.options).toContain(st.answer);
        for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
          const A = cityOf(st.options[i]), B = cityOf(st.options[j]); expect(Math.hypot(A.x - B.x, A.y - B.y)).toBeGreaterThanOrEqual(MAP_GAP);
        }
        if (mode === 'tour') { const t = TOUR.find((x) => x.landmark === st.landmark)!; expect(st.answer).toBe(t.city); expect(st.say).toBe(t.place); expect(st.prompt).toBe(t.line); }
        else { expect(st.landmark).toBeNull(); expect(st.say).toBe(cityOf(st.answer).where); }
      }
    }
  });
  it('every city can find two far partners (no candidate set ever falls short)', () => {
    for (const c of CITIES) for (let s = 1; s < 30; s++) expect(candidates(c.name, seeded(s))).toHaveLength(3);
  });
});

describe('reducer', () => {
  it('a wrong city costs a life; the plane flies on from each right answer; eight right answers win', () => {
    const r = buildTravelRound('tour', seeded(3));
    let s = travelReducer(initialTravel(), { type: 'start', round: r });
    expect(s.from).toBe('Астана');
    s = travelReducer(s, { type: 'pick', option: r.stages[0].options.find((o) => o !== r.stages[0].answer)! }); expect(s.lives).toBe(V_LIVES - 1); expect(s.phase).toBe('miss');
    s = travelReducer(s, { type: 'pick', option: 'Not a candidate' }); expect(s.lives).toBe(V_LIVES - 1);
    for (const st of r.stages) { s = travelReducer(s, { type: 'pick', option: st.answer }); expect(s.phase).toBe('hit'); s = travelReducer(s, { type: 'next' }); expect(s.from).toBe(st.answer); }
    expect(s.phase).toBe('victory'); expect(s.firstTry).toBe(V_TASKS - 1);
  });
});
