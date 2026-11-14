// «Жылдам аударма» — 90-second translation blitz
const assert = require('assert'); global.window = {};
for (const f of ['data', 'grade1', 'grade2', 'grade3', 'life', 'textbook', 'grade4']) require('../web/' + f + '.js');
const B = require('../web/blitz-core.js'); let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
let seed = 5; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };
const words = [].concat(...window.QDATA.GRADES.map((g) => g.units.flatMap((u) => u.lessons.flatMap((l) => l.words || []))));
const tr = (w) => w.ru;
const P = B.pool(words, tr);
ok(P.length >= 300, 'a large pool from all lessons: ' + P.length);
ok(new Set(P.map((w) => w.kk)).size === P.length && new Set(P.map(tr)).size === P.length, 'unique Kazakh forms and translations');
for (const mode of ['kk', 'tr', 'ear']) for (let i = 0; i < 300; i++) {
  const q = B.question(P, i, mode, tr, rnd);
  ok(q.options.length === 4 && new Set(q.options).size === 4 && q.options.includes(q.answer), mode + ': 4 distinct options with the answer');
  ok(mode === 'tr' ? q.answer === q.word.kk && q.prompt === tr(q.word) : q.answer === tr(q.word) && q.say === q.word.kk, mode + ': right direction');
  if (mode === 'ear') ok(!q.options.includes(q.word.kk) && q.prompt === '🎧', 'ear: the Kazakh word is only heard');
}
// scoring as specified: +10, +11, +12 … (cap +20); −5 resets the streak; never below 0
let s = B.START; const seq = [];
for (let i = 0; i < 3; i++) { s = B.answer(s, true); seq.push(s.score); }
ok(seq.join() === '10,21,33', 'streak bonus: 10, 21, 33');
s = B.answer(s, false); ok(s.score === 28 && s.streak === 0 && s.best === 3 && s.wrong === 1, 'a mistake: −5, streak 0, best kept');
let t = B.START; for (let i = 0; i < 15; i++) t = B.answer(t, true); ok(t.gained === 20, 'the bonus is capped at +20');
ok(B.answer(B.START, false).score === 0, 'never below zero');
console.log('blitz: ' + n + ' checks passed');
