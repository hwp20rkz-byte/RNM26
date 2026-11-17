/* «Жылдам аударма» — 90-second translation blitz (UMD: window.QBLITZ; require() in tests).
 * A stream of words from the lessons; 4 options; +10 and a streak bonus for each right answer (+11, +12 … up to +20),
 * −5 and the streak resets on a mistake (never below 0). Three modes: kk → translation, translation → kk, and
 * listening (the Kazakh word is only heard). The words are the game's own lesson vocabulary. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.QBLITZ = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var SECONDS = 90, OPTIONS = 4;
  function shuffle(a, r) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  /** Words usable in the blitz: a Kazakh form and a translation, unique by both (no two «час, часы»). */
  function pool(words, tr) {
    var seenK = {}, seenT = {};
    return words.filter(function (w) {
      var t = tr(w); if (!w || !w.kk || !t || seenK[w.kk] || seenT[t]) return false;
      if (t.toLowerCase().replace(/[^а-яәіңғүұқөһё]/g, '') === w.kk.toLowerCase().replace(/[^а-яәіңғүұқөһё]/g, '')) return false;   // футбол = футбол: nothing to translate
      seenK[w.kk] = 1; seenT[t] = 1; return true;
    });
  }
  /** One question. mode: 'kk' (show Kazakh), 'tr' (show translation, pick Kazakh), 'ear' (hear Kazakh). */
  function question(words, i, mode, tr, r) {
    var w = words[i % words.length], others = shuffle(words.filter(function (x) { return x !== w; }), r).slice(0, OPTIONS - 1);
    var kkSide = mode === 'tr';
    var opts = shuffle([w].concat(others), r).map(function (x) { return kkSide ? x.kk : tr(x); });
    return { word: w, prompt: kkSide ? tr(w) : (mode === 'ear' ? '🎧' : w.kk), say: w.kk, options: opts, answer: kkSide ? w.kk : tr(w), e: w.e || '' };
  }
  /** Score after an answer: { score, streak, best, right, wrong, gained } */
  function answer(s, ok) {
    if (ok) { var streak = s.streak + 1, gain = 10 + Math.min(streak - 1, 10); return { score: s.score + gain, streak: streak, best: Math.max(s.best, streak), right: s.right + 1, wrong: s.wrong, gained: gain }; }
    return { score: Math.max(0, s.score - 5), streak: 0, best: s.best, right: s.right, wrong: s.wrong + 1, gained: -Math.min(5, s.score) };
  }
  var START = { score: 0, streak: 0, best: 0, right: 0, wrong: 0, gained: 0 };
  return { SECONDS: SECONDS, OPTIONS: OPTIONS, pool: pool, question: question, answer: answer, START: START, shuffle: shuffle };
});
