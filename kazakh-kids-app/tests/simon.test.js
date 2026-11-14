// «Мұғалім айтады» arcade logic (web/simon-core.js). Run: node tests/simon.test.js
const assert = require('assert');
const S = require('../web/simon-core.js');
let n = 0; const eq = (a, b, m) => { assert.strictEqual(a, b, m + ': got «' + a + '», want «' + b + '»'); n++; };
const seeded = (seed) => () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };

// class commands come from the engine (сендер imperative) — expected forms written by hand
const want = { sit: 'Отырыңдар!', stand: 'Тұрыңдар!', jump: 'Секіріңдер!', clap: 'Шапалақтаңдар!', turn: 'Айналыңдар!', hands: 'Қолдарыңды көтеріңдер!' };
for (const a of S.ACTIONS) eq(S.command(a), want[a.id], 'command ' + a.id);
eq(S.line({ action: S.ACTIONS[0], real: true }), 'Мұғалім айтады: отырыңдар!', 'real line has the prefix');
eq(S.line({ action: S.ACTIONS[0], real: false }), 'Отырыңдар!', 'trap line has no prefix');

// rounds: 20 commands, first two real, ≤ 2 traps in a row, no repeated action, some traps
for (let seed = 1; seed < 60; seed++) {
  const r = S.buildRound(seeded(seed));
  eq(r.length, S.ROUND, 'round length');
  assert.ok(r[0].real && r[1].real, 'first two real'); n++;
  for (let i = 2; i < r.length; i++) assert.ok(r[i].real || r[i - 1].real || r[i - 2].real, 'never 3 traps in a row');
  for (let i = 1; i < r.length; i++) assert.ok(r[i].action !== r[i - 1].action, 'no repeated action');
  n += 2;
}
const traps = Array.from({ length: 40 }, (_, k) => S.buildRound(seeded(k + 1)).filter((c) => !c.real).length).reduce((a, b) => a + b, 0) / 40;
assert.ok(traps > 3 && traps < 8, 'about 30 % traps: ' + traps); n++;

// resolve and step
const real = { action: S.ACTIONS[2], real: true }, trap = { action: S.ACTIONS[2], real: false };
eq(S.resolve(real, 'jump'), 'hit', 'right action'); eq(S.resolve(real, null), 'late', 'nothing'); eq(S.resolve(real, 'sit'), 'wrong', 'wrong action');
eq(S.resolve(trap, null), 'held', 'held still on a trap'); eq(S.resolve(trap, 'jump'), 'fooled', 'moved on a trap');
let s = S.initial();
for (let i = 0; i < 6; i++) s = S.step(s, 'hit');
eq(s.score, 10 * 5 + 20, 'combo bonus after 5'); eq(s.best, 6, 'best combo');
s = S.step(s, 'fooled'); eq(s.lives, 2, 'fooled costs a life'); eq(s.combo, 0, 'combo reset');
s = S.step(s, 'held'); eq(s.score, 70 + 8, 'held pays');
s = S.step(S.step(s, 'late'), 'wrong'); eq(s.over, true, 'three mistakes end the round'); eq(s.won, false, 'lost');
let w = S.initial(); for (let i = 0; i < S.ROUND; i++) w = S.step(w, i % 4 ? 'hit' : 'held');
eq(w.over && w.won, true, 'a full clean round is a win');
eq(S.windowFor(0), 3, 'first window 3 s'); eq(S.windowFor(30), 1.8, 'window floor 1.8 s');
console.log('simon: ' + n + ' checks passed');
