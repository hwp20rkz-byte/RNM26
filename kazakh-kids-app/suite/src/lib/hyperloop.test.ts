import { describe, expect, it } from 'vitest';
import { SENTENCES, type SentenceMode } from '../data/sentenceCorpus';
import { buildHyperRound, buildStage, hyperReducer, initialHyper, isValidPrefix, missHint, orders, HYPER_LIVES, SENTENCES_PER_ROUND, XP_CLEAN_SENTENCE, XP_PER_DOCK, type HyperState } from './hyperloopLogic';

const seeded = (seed: number) => () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };
const MODES: SentenceMode[] = ['basic', 'place', 'commands'];
const strip = (t: string) => t.replace(/[.!?,]/g, '').toLowerCase().split(/\s+/);

describe('sentence corpus', () => {
  it('every sentence is its words, every alternative uses the same words, no word twice', () => {
    for (const m of MODES) for (const s of SENTENCES[m]) {
      expect(strip(s.kk)).toEqual(s.words.map((w) => w.toLowerCase()));
      for (const o of orders(s)) expect([...o].sort()).toEqual(s.words.map((w) => w.toLowerCase()).sort());
      expect(new Set(s.words.map((w) => w.toLowerCase())).size).toBe(s.words.length);
      expect(s.ru.length * s.en.length).toBeGreaterThan(0);
    }
  });
  it('the verb is last in every accepted order (SOV)', () => {
    for (const m of MODES) for (const s of SENTENCES[m]) {
      const last = s.words[s.words.length - 1].toLowerCase();
      for (const o of orders(s)) expect(o[o.length - 1]).toBe(last);
    }
  });
  it('commands end in an imperative and carry a non-imperative decoy of the same verb', () => {
    for (const s of SENTENCES.commands) {
      expect(s.kk.endsWith('!')).toBe(true);
      expect(s.decoy).toBeTruthy();
      expect(s.words.map((w) => w.toLowerCase())).not.toContain(s.decoy!.toLowerCase());
    }
  });
  it('each mode has enough sentences for a round', () => {
    for (const m of MODES) expect(SENTENCES[m].length).toBeGreaterThanOrEqual(SENTENCES_PER_ROUND);
  });
});

describe('prefix check', () => {
  const s = SENTENCES.place.find((x) => x.kk.startsWith('Мен кеше'))!;
  it('accepts the canonical and the alternative order, case-insensitively', () => {
    expect(isValidPrefix(s, ['мен', 'кеше'])).toBe(true);
    expect(isValidPrefix(s, ['кеше', 'мен', 'дүкенге', 'бардым'])).toBe(true);
    expect(isValidPrefix(s, ['дүкенге'])).toBe(false);
    expect(isValidPrefix(s, ['мен', 'бардым'])).toBe(false);
  });
});

describe('round building', () => {
  it('6 stages; pods are the words (+ decoy) in lower case, never pre-solved', () => {
    for (const m of MODES) for (let seed = 1; seed < 30; seed++) {
      const r = buildHyperRound(m, seeded(seed));
      expect(r.stages).toHaveLength(SENTENCES_PER_ROUND);
      for (const st of r.stages) {
        expect(st.pods.filter((p) => !p.decoy).map((p) => p.text).sort()).toEqual(st.sentence.words.map((w) => w.toLowerCase()).sort());
        expect(st.pods.some((p) => p.decoy)).toBe(m === 'commands');
        st.pods.forEach((p, i) => { expect(p.id).toBe(i); expect(p.text).toBe(p.text.toLowerCase()); });
      }
    }
  });
});

/** Dock every pod of the current stage in canonical order. */
function solveStage(s: HyperState): HyperState {
  const st = s.round!.stages[s.stage];
  for (const w of st.sentence.words) s = hyperReducer(s, { type: 'pick', pod: st.pods.find((p) => !p.decoy && p.text === w.toLowerCase())!.id });
  return s;
}

describe('reducer', () => {
  const start = (m: SentenceMode, seed = 7) => hyperReducer(initialHyper(), { type: 'start', round: buildHyperRound(m, seeded(seed)) });

  it('a clean sentence docks every pod, departs and pays the bonus; the round ends in victory', () => {
    let s = start('basic');
    s = solveStage(s);
    expect(s.phase).toBe('departing');
    expect(s.xp).toBe(3 * XP_PER_DOCK + XP_CLEAN_SENTENCE);
    expect(s.cleanSentences).toBe(1);
    s = hyperReducer(s, { type: 'arrive' });
    expect(s.stage).toBe(1); expect(s.docked).toEqual([]);
    for (let i = 1; i < SENTENCES_PER_ROUND; i++) { s = solveStage(s); s = hyperReducer(s, { type: 'arrive' }); }
    expect(s.phase).toBe('victory'); expect(s.cleanSentences).toBe(SENTENCES_PER_ROUND);
  });

  it('a wrong pod costs a life and resets the combo; the sentence then earns no bonus', () => {
    let s = start('place');
    const st = s.round!.stages[0], wrong = st.pods.find((p) => !isValidPrefix(st.sentence, [p.text]))!;
    s = hyperReducer(s, { type: 'pick', pod: wrong.id });
    expect(s.phase).toBe('resolving'); expect(s.lives).toBe(HYPER_LIVES - 1); expect(s.combo).toBe(0);
    expect(hyperReducer(s, { type: 'pick', pod: 0 })).toBe(s);             // input ignored while resolving
    s = hyperReducer(s, { type: 'settle' });
    s = solveStage(s);
    expect(s.cleanSentences).toBe(0);
    expect(s.xp).toBe(st.sentence.words.length * XP_PER_DOCK);
  });

  it('the decoy is a mistake with an explanation; three mistakes end the round', () => {
    let s = start('commands');
    const st = s.round!.stages[0], decoy = st.pods.find((p) => p.decoy)!;
    expect(missHint(s.round!, st, decoy, 'ru')).toContain('не команда');
    for (let i = 0; i < HYPER_LIVES; i++) { s = hyperReducer(s, { type: 'pick', pod: decoy.id }); s = hyperReducer(s, { type: 'settle' }); }
    expect(s.phase).toBe('defeat');
  });

  it('a docked pod cannot be picked twice', () => {
    let s = start('basic');
    const st = s.round!.stages[0], first = st.pods.find((p) => p.text === st.sentence.words[0].toLowerCase())!;
    s = hyperReducer(s, { type: 'pick', pod: first.id });
    expect(hyperReducer(s, { type: 'pick', pod: first.id })).toBe(s);
  });

  it('the alternative order is accepted (time first)', () => {
    const sent = SENTENCES.place.find((x) => x.alts)!;
    let s = hyperReducer(initialHyper(), { type: 'start', round: { mode: 'place', stages: [buildStage(sent, seeded(3))] } });
    for (const w of sent.alts![0]) s = hyperReducer(s, { type: 'pick', pod: s.round!.stages[0].pods.find((p) => p.text === w.toLowerCase())!.id });
    expect(s.phase).toBe('departing');
  });
});
