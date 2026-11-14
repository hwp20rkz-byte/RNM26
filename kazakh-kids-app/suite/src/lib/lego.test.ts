// @ts-expect-error -- Node builtin; @types/node is not installed in the suite
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { LEGO_NOUNS, POSE_VERBS } from '../data/legoForms';
import { ENDINGS, L_LIVES, L_TASKS, POSE_KEYS, buildLegoRound, initialLego, legoReducer, splitForm } from './legoLogic';

const require = createRequire(import.meta.url);
type Eng = { possessive(w: string, p: string): string; plural(w: string): string; aux(v: string, a: string, p: string): string; done(v: string, p: string): string; caseForm(w: string, c: string): string };
const G = require('../../../web/grammar-core.js') as Eng;
const seeded = (seed: number) => () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };

describe('generated data = the engine (run tools/build-lego.js after engine changes)', () => {
  it('nouns', () => {
    for (const n of LEGO_NOUNS) {
      for (const p of ['men', 'sen', 'ol', 'biz'] as const) expect(n.forms[p]).toBe(G.possessive(n.kk, p));
      expect(n.forms.pl).toBe(G.plural(n.kk));
    }
  });
  it('verbs', () => {
    for (const v of POSE_VERBS) {
      for (const a of ['отыр', 'тұр', 'жатыр'] as const) expect(v.forms[a]).toBe(G.aux(v.stem, a, 'ol'));
      expect(v.forms.тастады).toBe(G.done(v.stem, 'ol')); expect(v.objAcc).toBe(G.caseForm(v.obj, 'tabys'));
    }
  });
});

describe('splitting into blocks', () => {
  it('sound changes are recognised', () => {
    expect(splitForm('кітап', 'кітабым')).toEqual({ stem: 'кітаб', ending: 'ым', change: 'voiced' });
    expect(splitForm('ауыз', 'аузым')).toEqual({ stem: 'ауз', ending: 'ым', change: 'dropped' });
    expect(splitForm('бала', 'баласы')).toEqual({ stem: 'бала', ending: 'сы', change: 'none' });
    expect(splitForm('құлақ', 'құлақтар').change).toBe('none');
  });
  it('100 random builds: stem + ending is exactly the engine form, and the ending is a known block', () => {
    let changed = 0;
    for (let seed = 1; seed <= 10; seed++) for (const st of buildLegoRound('blocks', seeded(seed)).stages) {
      const engine = st.key === 'pl' ? G.plural(st.noun!.kk) : G.possessive(st.noun!.kk, st.key!);
      expect(st.split!.stem + st.split!.ending).toBe(engine);
      expect(ENDINGS[st.key!]).toContain(st.answer);
      expect(new Set(st.options).size).toBe(3); expect(st.options).toContain(st.answer);
      if (st.split!.change !== 'none') changed++;
    }
    expect(changed).toBeGreaterThanOrEqual(40);
  });
});

describe('pose rounds and reducer', () => {
  it('four different sentences, one per pose; the finished action takes the definite object', () => {
    for (const st of buildLegoRound('pose', seeded(3)).stages) {
      expect(new Set(st.options).size).toBe(4);
      expect(st.answer.includes(st.verb!.forms[st.pose!])).toBe(true);
      if (st.pose === 'тастады') expect(st.answer.includes(st.verb!.objAcc)).toBe(true);
    }
    expect(POSE_KEYS).toHaveLength(4);
  });
  it('a clean round wins; wrong picks cost lives', () => {
    let s = legoReducer(initialLego(), { type: 'start', round: buildLegoRound('blocks', seeded(5)) });
    const wrong = s.round!.stages[0].options.find((o) => o !== s.round!.stages[0].answer)!;
    s = legoReducer(s, { type: 'pick', option: wrong }); expect(s.lives).toBe(L_LIVES - 1);
    for (let i = 0; i < L_TASKS; i++) { s = legoReducer(s, { type: 'pick', option: s.round!.stages[i].answer }); s = legoReducer(s, { type: 'next' }); }
    expect(s.phase).toBe('victory'); expect(s.firstTry).toBe(L_TASKS - 1);
  });
});
