/* «Екеулеп» — pure logic of a duel for two on one phone (master plan, sprint 4).
 * Both players see the same question on their half of the screen (the top half is turned 180°); whoever taps the right
 * answer first takes the point. A wrong tap locks that player out of this question; if both are wrong, nobody scores.
 * First to WIN_AT points, or the higher score after QUESTIONS questions / the time limit (UMD: window.QDUEL). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.QDUEL = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var QUESTIONS = 15, WIN_AT = 8, SECONDS = 90;
  /** questions: [{ answer, options:[…] }]; returns the match state. */
  function create(questions) {
    return { qs: questions.slice(0, QUESTIONS), i: 0, score: [0, 0], locked: [false, false], winner: null, last: null, done: false };
  }
  /** Player 0 (bottom) or 1 (top) taps an option. Returns a new state; `last` says what happened. */
  function tap(s, player, option) {
    if (s.done || s.locked[player] || s.last && s.last.type === 'point') return s;
    var q = s.qs[s.i], n = clone(s);
    if (option === q.answer) {
      n.score[player]++; n.last = { type: 'point', player: player, answer: q.answer };
      if (n.score[player] >= WIN_AT) finish(n);
      return n;
    }
    n.locked[player] = true; n.last = { type: 'wrong', player: player, option: option };
    if (n.locked[0] && n.locked[1]) n.last = { type: 'nobody', answer: q.answer };
    return n;
  }
  /** Next question (after the point / nobody animation); finishes the match when questions run out. */
  function next(s) {
    if (s.done) return s;
    var n = clone(s); n.i++; n.locked = [false, false]; n.last = null;
    if (n.i >= n.qs.length) finish(n);
    return n;
  }
  /** Time is up. */
  function timeUp(s) { var n = clone(s); finish(n); return n; }
  function finish(n) { n.done = true; n.winner = n.score[0] === n.score[1] ? -1 : n.score[0] > n.score[1] ? 0 : 1; }
  function clone(s) { return { qs: s.qs, i: s.i, score: s.score.slice(), locked: s.locked.slice(), winner: s.winner, last: s.last, done: s.done }; }
  /** Each half gets its own order of the options, so a player can't just copy the other's finger. */
  function sides(q, rnd) {
    var a = q.options.slice(), b = q.options.slice();
    for (var i = b.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = b[i]; b[i] = b[j]; b[j] = t; }
    if (b.join('|') === a.join('|') && b.length > 1) b.push(b.shift());
    return [a, b];
  }
  return { QUESTIONS: QUESTIONS, WIN_AT: WIN_AT, SECONDS: SECONDS, create: create, tap: tap, next: next, timeUp: timeUp, sides: sides };
});
