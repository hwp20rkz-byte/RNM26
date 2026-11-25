// @ts-expect-error -- Node builtin; @types/node is not installed in the suite
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { CITIES, COMPASS_Q, LEGS, MAP_GAP, SIDES, TOUR } from '../data/travelData';
import { V_LIVES, V_TASKS, buildTravelRound, candidates, cityOf, initialTravel, legChain, sideOptions, travelReducer } from './travelLogic';

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

describe('compass', () => {
  const M = require('../../../web/mektep-core.js') as { lines3d(): string[] };
  it('reference (written by hand) and every spoken line is voiced', () => {
    const l = LEGS.find((x) => x.from === 'Астана' && x.to === 'Шымкент')!;
    expect([l.dir, l.ask, l.say]).toEqual(['оңтүстік', 'Астанадан Шымкентке қай жаққа ұшамыз?', 'Оңтүстікке ұшамыз!']);
    const spoken = new Set(M.lines3d()); expect(spoken.has(COMPASS_Q)).toBe(true);
    for (const x of LEGS) expect(spoken.has(x.say)).toBe(true);
  });
  it('the side agrees with the map: within 15° of its angle (x east, y south)', () => {
    for (const x of LEGS) {
      const A = cityOf(x.from), B = cityOf(x.to), ang = (Math.atan2(A.y - B.y, B.x - A.x) * 180) / Math.PI, d = SIDES.find((s) => s.dir === x.dir)!.deg;
      expect(Math.abs((((ang - d + 540) % 360) - 180))).toBeLessThanOrEqual(15);
    }
  });
  it('options: the side, its opposite and a side at 90° — never a neighbour', () => {
    for (const s of SIDES) for (let k = 1; k < 20; k++) {
      const o = sideOptions(s.dir, seeded(k)), deg = o.map((x) => SIDES.find((y) => y.dir === x)!.deg);
      expect(o).toContain(s.dir); expect(new Set(o).size).toBe(3);
      for (const g2 of deg) { const diff = Math.abs((((g2 - s.deg) % 360) + 540) % 360 - 180); expect([0, 90, 180]).toContain(diff); }
    }
  });
  it('eight different legs, mostly chained; the plane starts at the first leg and flies on', () => {
    let chained = 0, total = 0;
    for (let k = 1; k < 60; k++) {
      const legs = legChain(seeded(k)); expect(legs).toHaveLength(V_TASKS); expect(new Set(legs.map((l) => l.from + '>' + l.to)).size).toBe(V_TASKS);
      legs.forEach((l, i) => { if (i) { total++; if (l.from === legs[i - 1].to) chained++; } });
      const r = buildTravelRound('compass', seeded(k)); let s = travelReducer(initialTravel(), { type: 'start', round: r });
      expect(s.from).toBe(r.stages[0].start);
      for (const st of r.stages) { s = travelReducer(s, { type: 'pick', option: st.answer }); s = travelReducer(s, { type: 'next' }); if (s.phase !== 'victory') expect(s.from).toBe(r.stages[s.i].start); }
      expect(s.phase).toBe('victory');
    }
    expect(chained / total).toBeGreaterThan(0.8);
  });
});
