// «Екеулеп» — duel for two on one phone (master plan, sprint 4)
const assert = require('assert'); const D = require('../web/duel-core.js');
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const qs = Array.from({ length: 20 }, (_, i) => ({ answer: 'a' + i, options: ['a' + i, 'b' + i, 'c' + i] }));
let s = D.create(qs);
ok(s.qs.length === D.QUESTIONS && s.score.join() === '0,0', 'match of 15 questions, 0:0');
s = D.tap(s, 1, 'b0'); ok(s.locked[1] && s.last.type === 'wrong' && s.score.join() === '0,0', 'a wrong tap locks the player');
ok(D.tap(s, 1, 'a0') === s, 'a locked player cannot answer this question');
s = D.tap(s, 0, 'a0'); ok(s.score.join() === '1,0' && s.last.type === 'point' && s.last.player === 0, 'the other player takes the point');
ok(D.tap(s, 1, 'a0') === s, 'after a point nobody can tap until the next question');
s = D.next(s); ok(s.i === 1 && !s.locked[0] && !s.locked[1] && s.last === null, 'next question unlocks both');
s = D.tap(D.tap(s, 0, 'b1'), 1, 'c1'); ok(s.last.type === 'nobody' && s.score.join() === '1,0', 'both wrong — nobody scores');
// first to 8 wins early
s = D.create(qs); for (let i = 0; i < 8; i++) { s = D.tap(s, 1, 'a' + i); if (!s.done) s = D.next(s); }
ok(s.done && s.winner === 1 && s.score[1] === D.WIN_AT, 'first to 8 points wins');
// questions run out: higher score wins, equal is a draw
s = D.create(qs.slice(0, 2)); s = D.next(D.tap(s, 0, 'a0')); s = D.next(D.tap(s, 1, 'a1'));
ok(s.done && s.winner === -1, 'questions over at 1:1 — a draw');
s = D.timeUp(D.tap(D.create(qs), 0, 'a0')); ok(s.done && s.winner === 0, 'time is up — the leader wins');
// each half has its own order of the same options
let seed = 3; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };
for (let i = 0; i < 50; i++) { const [a, b] = D.sides(qs[i % 20], rnd); ok(a.join('|') !== b.join('|') && [...b].sort().join() === [...a].sort().join(), 'sides: same options, another order'); }
console.log('duel: ' + n + ' checks passed');
