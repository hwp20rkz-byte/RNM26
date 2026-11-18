// @ts-expect-error -- Node builtin; @types/node is not installed in the suite
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { CHAINS, HABITATS, L_LIVES, LAB_ANIMALS, buildLabRound, initialLab, labReducer } from './labLogic';

const require = createRequire(import.meta.url);
const g = globalThis as unknown as { window: Record<string, unknown>; self: unknown };
g.window = g.window || {}; g.self = g.window;
require('../../../web/data.js'); require('../../../web/grammar-core.js');
const M = require('../../../web/mektep-core.js') as { LAB_HOMES: { kk: string; home: string; at: string }[]; CHAINS: { kk: string }[][] };
const seeded = (seed: number) => () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };

describe('the lab = the «Мектеп» tables (one source for the 2D topic and the 3D lab)', () => {
  it('animals, habitats and the locative forms from the engine', () => {
    expect(LAB_ANIMALS.map((a) => a.kk + ':' + a.home + ':' + a.at)).toEqual(M.LAB_HOMES.map((a) => a.kk + ':' + a.home + ':' + a.at));
  });
  it('food chains', () => { expect(CHAINS.map((c) => c.map((x) => x.kk).join('>'))).toEqual(M.CHAINS.map((c) => c.map((x) => x.kk).join('>'))); });
  it('two animals per habitat, four habitats', () => {
    expect(HABITATS.map((h) => h.at)).toEqual(['суда', 'тауда', 'шөлде', 'орманда']);
    for (const h of HABITATS) expect(LAB_ANIMALS.filter((a) => a.home === h.id)).toHaveLength(2);
  });
});

describe('rounds', () => {
  it('homes: 8 animals once each; the answer is its habitat; four habitat options', () => {
    for (let s = 1; s < 40; s++) {
      const r = buildLabRound('homes', seeded(s));
      expect(r.stages.map((st) => st.animal).sort()).toEqual(LAB_ANIMALS.map((a) => a.kk).sort());
      for (const st of r.stages) { expect(st.answer).toBe(LAB_ANIMALS.find((a) => a.kk === st.animal)!.at); expect([...st.options].sort()).toEqual(HABITATS.map((h) => h.at).sort()); }
    }
  });
  it('chains: 6 tasks, a missing link, 3 options with exactly one from the same chain position', () => {
    for (let s = 1; s < 40; s++) {
      const r = buildLabRound('chains', seeded(s));
      expect(r.stages).toHaveLength(6);
      for (const st of r.stages) {
        const chain = CHAINS[st.chain!];
        expect(st.answer).toBe(chain[st.gap!].kk); expect(st.options).toContain(st.answer); expect(new Set(st.options).size).toBe(3);
        // a wrong option is never a valid filler: it is not this chain's item at that position
        for (const o of st.options) if (o !== st.answer) expect(chain.map((x) => x.kk)).not.toContain(o);
      }
      expect(new Set(r.stages.map((st) => st.chain + ':' + st.gap)).size).toBe(6);
    }
  });
});

describe('reducer', () => {
  it('a wrong pick costs a life; the right one scores; the round ends in victory', () => {
    const r = buildLabRound('homes', seeded(2));
    let s = labReducer(initialLab(), { type: 'start', round: r });
    const wrong = r.stages[0].options.find((o) => o !== r.stages[0].answer)!;
    s = labReducer(s, { type: 'pick', option: wrong }); expect(s.phase).toBe('miss'); expect(s.lives).toBe(L_LIVES - 1);
    for (let i = 0; i < r.stages.length; i++) { s = labReducer(s, { type: 'pick', option: r.stages[i].answer }); expect(s.phase).toBe('hit'); s = labReducer(s, { type: 'next' }); }
    expect(s.phase).toBe('victory'); expect(s.placed).toHaveLength(8);
  });
});
