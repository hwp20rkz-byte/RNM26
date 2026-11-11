// Unit tests for src/engine/LessonEngine.ts, the dialogue engine and the riddle board (compiled on the fly with esbuild).
// Run: node tests/engine.test.js
const assert = require('assert');
const path = require('path');
const esbuild = require('esbuild');

function load(entry) {
  const out = esbuild.buildSync({ entryPoints: [path.join(__dirname, '..', entry)], bundle: true, format: 'cjs', platform: 'node', write: false, external: ['three'] });
  const m = { exports: {} };
  new Function('module', 'exports', 'require', out.outputFiles[0].text)(m, m.exports, require);
  return m.exports;
}
const E = load('src/engine/LessonEngine.ts');
let clock = 0; const now = () => clock;

// marks and multipliers
assert.deepStrictEqual([100, 85, 84, 65, 64, 40, 39, 0].map(E.markOf), [5, 5, 4, 4, 3, 3, 2, 2]);
assert.deepStrictEqual([0, 2, 3, 5, 6, 9, 10].map(E.comboMultiplier), [1, 1, 1.5, 1.5, 2, 2, 3]);
// streak
assert.strictEqual(E.nextStreak('2026-11-10', '2026-11-11', 4), 5);
assert.strictEqual(E.nextStreak('2026-11-11', '2026-11-11', 4), 4);
assert.strictEqual(E.nextStreak('2026-11-08', '2026-11-11', 4), 1);
assert.strictEqual(E.nextStreak(null, '2026-11-11', 0), 1);
assert.strictEqual(E.nextStreak('2026-02-28', '2026-03-01', 2), 3);

// a normal lesson: retries never count as first try; summary by skill and category
{
  const e = new E.LessonEngine({ total: 4, hearts: 5, now });
  let r = e.answer('t0', 'affix', false); assert.strictEqual(r.heartsLeft, 4); assert.strictEqual(e.next(true), 'question');
  r = e.answer('t1', 'pick', true); assert.ok(r.firstTry); e.next(true);
  e.answer('t2', 'buster', true); e.next(true);
  r = e.answer('t3', 'post', true); assert.strictEqual(r.combo, 3); assert.strictEqual(r.multiplier, 1.5); e.next(true);
  r = e.answer('t0', 'affix', true); assert.strictEqual(r.firstTry, false); e.next(false);
  const s = e.summary();
  assert.strictEqual(s.outcome, 'finished'); assert.strictEqual(s.firstTry, 3); assert.strictEqual(s.total, 4); assert.strictEqual(s.pct, 75); assert.strictEqual(s.mark, 4);
  assert.deepStrictEqual(s.skills.zhaz, [1, 2]); assert.deepStrictEqual(s.skills.tyn, [1, 1]); assert.deepStrictEqual(s.skills.oqy, [1, 1]);
  assert.strictEqual(s.weakest, 'harmony'); assert.ok(E.ADVICE[s.weakest].ru.includes('Сингармонизм'));
  assert.ok(s.xp > 0);
}
// boss: 3 hearts → failed
{
  const e = new E.LessonEngine({ total: 10, hearts: 3, seconds: 300, now });
  ['a', 'b', 'c'].forEach((id, i) => { const r = e.answer(id, 'fill', false); if (i < 2) e.next(true); else assert.strictEqual(r.phase, 'failed'); });
  assert.strictEqual(e.summary().outcome, 'failed');
  assert.throws(() => e.answer('d', 'fill', true));
}
// boss: time limit
{
  clock = 1000;
  const e = new E.LessonEngine({ total: 10, hearts: 3, seconds: 60, now });
  assert.ok(e.timed); assert.strictEqual(e.remainingMs(), 60000);
  e.answer('a', 'pick', true); clock += 30000; assert.strictEqual(e.next(true), 'question');
  clock += 31000; assert.strictEqual(e.tick(), 'timeup'); assert.strictEqual(e.remainingMs(), 0);
  const s = e.summary(); assert.strictEqual(s.outcome, 'timeup'); assert.strictEqual(s.timeUsedMs, 61000); assert.strictEqual(s.mark, 2);
}
assert.throws(() => new E.LessonEngine({ total: 3, hearts: 0 }));

// dialogue engine against the real bus dialogue
const C = require('../src/data/curriculum.json');
global.window = {};
const DLG = load('src/dialogue/BranchingDialogue.ts');
{
  const d = new DLG.DialogueEngine(C.dialogues.bus);
  d.advance(); d.advance(); d.advance();                         // n1 → n2 → n3 → c1
  assert.strictEqual(d.node, 'c1');
  let r = d.choose(0); assert.strictEqual(r.ok, false); assert.ok(r.why.ru.length > 10); assert.strictEqual(d.hearts, 2);
  d.advance();                                                   // «bad» → back to c1
  r = d.choose(1); assert.ok(r.ok); assert.strictEqual(r.firstTry, false); assert.strictEqual(r.xp, 25);
  d.advance();                                                   // blessing → c2
  r = d.choose(0); assert.ok(r.firstTry);
  assert.ok(d.finished); assert.deepStrictEqual(d.score, { firstTry: 1, total: 2 });
}
// every dialogue can be completed by always picking the correct answer
Object.values(C.dialogues).forEach((dl) => {
  const d = new DLG.DialogueEngine(dl); let guard = 0;
  while (!d.finished && guard++ < 50) { const n = d.current; if (n.choices) d.choose(n.choices.findIndex((c) => c.ok)); else d.advance(); }
  assert.ok(d.current.end, dl.id + ' reaches an end node'); assert.strictEqual(d.score.firstTry, d.score.total);
});

// riddle board
const TK = load('src/games/TilKeremeti3D.ts');
{
  const b = new TK.RiddleBoard({ answer: 'АСПА ЖОЛ', clue: '', ru: '', en: '', src: '' });
  assert.strictEqual(b.hidden(), 7);
  assert.strictEqual(b.guess('А'), 2); assert.strictEqual(b.guess('Ы'), 0);
  const q = new TK.RiddleBoard({ answer: 'СУБҰРҚАҚ', clue: '', ru: '', en: '', src: '' });
  assert.ok(TK.SPECIAL.includes(q.hint()));                     // ҚАРІП opens a Kazakh-specific letter first
  q.solve(); assert.ok(q.solved);
  C.riddles.forEach((r) => assert.ok(/^[А-ЯӘІҢҒҮҰҚӨҺЁ -]+$/.test(r.answer), r.answer));
}
console.log('engine: LessonEngine, DialogueEngine, RiddleBoard — all assertions passed');
