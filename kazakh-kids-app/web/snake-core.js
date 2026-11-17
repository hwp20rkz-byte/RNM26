/* «Сөз жылан» — a word snake (UMD: window.QSNAKE; require() in tests).
 * The snake eats the letters of a word in order (the picture and translation tell which word). Next to the real
 * letters lie decoys: the «twin» of one of its letters (ә ↔ а, қ ↔ к, ү ↔ у …), so the game trains exactly the
 * special Kazakh letters. Walls wrap around (gentle for small children); biting yourself cuts the tail and costs a
 * heart; a decoy or a letter out of order costs a heart. Each finished word speeds the snake up a little. Pure logic. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.QSNAKE = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var TWINS = { 'ә': 'а', 'а': 'ә', 'і': 'ы', 'ы': 'і', 'ң': 'н', 'н': 'ң', 'ғ': 'г', 'г': 'ғ', 'ү': 'у', 'у': 'ү', 'ұ': 'у', 'қ': 'к', 'к': 'қ', 'ө': 'о', 'о': 'ө', 'һ': 'х', 'х': 'һ' };
  var SPECIAL = ['ә', 'і', 'ң', 'ғ', 'ү', 'ұ', 'қ', 'ө', 'һ'];
  var DIRS = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
  var OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
  var HEARTS = 3, START_MS = 330, MIN_MS = 150;
  function shuffle(a, r) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  /** Words that fit the board: letters only, 2–7 letters. */
  function usable(words) { return words.filter(function (w) { return /^[а-яәіңғүұқөһё]{2,7}$/.test(w.kk); }); }
  /** Up to 2 decoy letters for a word: twins of its letters first, never a letter the word contains. */
  function decoys(word, r) {
    var has = {}, out = []; word.split('').forEach(function (c) { has[c] = 1; });
    shuffle(word.split(''), r).forEach(function (c) { var t = TWINS[c]; if (t && !has[t] && out.indexOf(t) < 0 && out.length < 2) out.push(t); });
    shuffle(SPECIAL.slice(), r).forEach(function (c) { if (!has[c] && out.indexOf(c) < 0 && out.length < 2) out.push(c); });
    return out;
  }
  function key(p) { return p.x + ',' + p.y; }
  function wrap(p, s) { return { x: (p.x + s.W) % s.W, y: (p.y + s.H) % s.H }; }
  /** Lay out a word: its letters and decoys on free cells, never on the snake or the 3 cells in front of the head. */
  function place(s, word, r) {
    var busy = {}; s.snake.forEach(function (p) { busy[key(p)] = 1; });
    var d = DIRS[s.dir], h = s.snake[0];
    for (var k = 1; k <= 3; k++) busy[key(wrap({ x: h.x + d.x * k, y: h.y + d.y * k }, s))] = 1;
    var free = []; for (var y = 0; y < s.H; y++) for (var x = 0; x < s.W; x++) if (!busy[x + ',' + y]) free.push({ x: x, y: y });
    shuffle(free, r);
    var letters = word.split('').map(function (c) { return { ch: c, decoy: false }; }).concat(decoys(word, r).map(function (c) { return { ch: c, decoy: true }; }));
    return letters.map(function (l, i) { return { x: free[i].x, y: free[i].y, ch: l.ch, decoy: l.decoy }; });
  }
  function start(W, H, word, r) {
    var cx = Math.floor(W / 2), cy = H - 3;
    var s = { W: W, H: H, dir: 'up', snake: [{ x: cx, y: cy }, { x: cx, y: cy + 1 }, { x: cx, y: cy + 2 }], grow: 0, word: word, progress: 0, cells: [] };
    s.cells = place(s, word, r); return s;
  }
  /** Turn (ignored if it reverses the snake onto itself). */
  function turn(s, dir) { if (!DIRS[dir] || (OPP[dir] === s.dir && s.snake.length > 1)) return s; s.dir = dir; return s; }
  /** One tick. Returns the event: 'move' | 'eat' | 'word' | 'wrong' | 'bite'. Mutates and returns via s. */
  function step(s) {
    var d = DIRS[s.dir], head = wrap({ x: s.snake[0].x + d.x, y: s.snake[0].y + d.y }, s), ev = 'move';
    var tailMoves = s.grow === 0, body = s.snake.slice(0, tailMoves ? -1 : s.snake.length);
    var hit = -1; body.forEach(function (p, i) { if (hit < 0 && p.x === head.x && p.y === head.y) hit = i; });
    s.snake.unshift(head);
    if (s.grow > 0) s.grow--; else s.snake.pop();
    if (hit >= 0) { s.snake = s.snake.slice(0, Math.max(3, hit + 1)); return 'bite'; }
    var ci = -1; s.cells.forEach(function (c, i) { if (c.x === head.x && c.y === head.y) ci = i; });
    if (ci >= 0) {
      var c = s.cells[ci];
      if (!c.decoy && c.ch === s.word[s.progress]) { s.cells.splice(ci, 1); s.progress++; s.grow++; ev = s.progress === s.word.length ? 'word' : 'eat'; }
      else { if (c.decoy) s.cells.splice(ci, 1); ev = 'wrong'; }
    }
    return ev;
  }
  /** Tick length after n finished words. */
  function tickMs(n) { return Math.max(MIN_MS, START_MS - n * 15); }
  /** Points for a finished word: 10 per letter, ×2 without a mistake in it. */
  function wordPoints(word, clean) { return word.length * 10 * (clean ? 2 : 1); }
  return { TWINS: TWINS, SPECIAL: SPECIAL, DIRS: DIRS, HEARTS: HEARTS, START_MS: START_MS, MIN_MS: MIN_MS, usable: usable, decoys: decoys, place: place,
    start: start, turn: turn, step: step, tickMs: tickMs, wordPoints: wordPoints, shuffle: shuffle };
});
