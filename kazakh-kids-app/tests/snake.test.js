// «Сөз жылан»: decoys are twins and never letters of the word; layout; eating in order; wrong letters; bites; wrap.
const assert = require('assert');
const Z = require('../web/snake-core.js'); const R = require('../web/rain-core.js');
let n = 0; const eq = (a, b, m) => { assert.strictEqual(a, b, m + ': ' + a + ' ≠ ' + b); n++; };
const rnd = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const words = Z.usable(R.NOUNS);
assert.ok(words.length >= 50 && words.every((w) => w.kk.length <= 7), 'board-sized words: ' + words.length); n++;
for (const w of words) for (let k = 0; k < 20; k++) {
  const d = Z.decoys(w.kk, rnd);
  assert.ok(d.length === 2 && d.every((c) => !w.kk.includes(c)) && d[0] !== d[1], w.kk + ': 2 decoys not in the word ' + d); n++;
  if (w.kk.split('').some((c) => Z.TWINS[c] && !w.kk.includes(Z.TWINS[c]))) { assert.ok(d.some((c) => w.kk.split('').some((x) => Z.TWINS[x] === c)), w.kk + ': a twin decoy ' + d); n++; }
  const s = Z.start(9, 11, w.kk, rnd);
  const cells = new Set(s.cells.map((c) => c.x + ',' + c.y)), body = new Set(s.snake.map((p) => p.x + ',' + p.y));
  eq(s.cells.length, w.kk.length + 2, w.kk + ': letters and decoys on the board');
  assert.ok(cells.size === s.cells.length && [...cells].every((c) => !body.has(c)), w.kk + ': no overlap'); n++;
  assert.ok(s.cells.every((c) => c.x >= 0 && c.x < 9 && c.y >= 0 && c.y < 11), 'inside the board'); n++;
}
// a scripted run: eat «ит» in order on a 5×5 board
const s = Z.start(5, 5, 'ит', rnd); s.cells = [{ x: 2, y: 1, ch: 'и', decoy: false }, { x: 2, y: 0, ch: 'т', decoy: false }, { x: 0, y: 0, ch: 'ы', decoy: true }];
// snake head at (2,2) going up
eq(Z.step(s), 'eat', 'eats и'); eq(s.progress, 1, 'progress 1');
eq(Z.step(s), 'word', 'eats т and finishes the word'); eq(s.snake.length, 3 + 1, 'grew by one so far (growth applies on the next ticks)');
Z.step(s); eq(s.snake.length, 5, 'grew by two letters');
// reversing is ignored; wrap-around through the top wall
Z.turn(s, 'down'); eq(s.dir, 'up', 'no reverse'); eq(s.snake[0].y, 4, 'wrapped to the bottom');
// a decoy costs a heart in the UI and disappears; a letter out of order stays
const t = Z.start(5, 5, 'ат', rnd); t.cells = [{ x: 2, y: 1, ch: 'т', decoy: false }, { x: 2, y: 0, ch: 'ә', decoy: true }, { x: 4, y: 4, ch: 'а', decoy: false }];
eq(Z.step(t), 'wrong', 'т before а is wrong'); eq(t.cells.length, 3, 'the real letter stays');
eq(Z.step(t), 'wrong', 'the decoy ә is wrong'); eq(t.cells.length, 2, 'the decoy disappears');
// biting: a long snake turning into itself loses its tail, never below 3
const b = Z.start(7, 7, 'ит', rnd); b.cells = []; b.snake = [{ x: 3, y: 3 }, { x: 3, y: 4 }, { x: 4, y: 4 }, { x: 4, y: 3 }, { x: 4, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 2 }]; b.dir = 'up';
eq(Z.step(b), 'bite', 'bit itself at (3,2)'); assert.ok(b.snake.length >= 3 && b.snake.length < 7, 'tail cut: ' + b.snake.length); n++;
// speed and points
assert.ok(Z.tickMs(0) === Z.START_MS && Z.tickMs(3) < Z.tickMs(2) && Z.tickMs(999) === Z.MIN_MS, 'speed curve'); n++;
eq(Z.wordPoints('мысық', true), 100, 'clean word ×2'); eq(Z.wordPoints('мысық', false), 50, 'word with a mistake');
console.log('snake: ' + n + ' checks passed');
