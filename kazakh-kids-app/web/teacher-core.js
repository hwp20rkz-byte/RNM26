/* «Мұғалім парағы» — pure logic of the 5-minute class blitz (master plan, sprint 5). The teacher picks a grade and a
 * topic; the projector shows a picture (say the word) or a translation (say the sentence); the class answers aloud,
 * the teacher reveals and the answer is spoken, then marks «class got it» or not (UMD: window.QTEACH). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.QTEACH = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var SECONDS = 300, MAX = 30;
  /** Topics a teacher can pick: every unit with ordinary lessons. */
  function topics(grade) { return grade.units.filter(function (u) { return u.lessons.some(function (l) { return !l.review && (l.words || l.sentences); }); }); }
  /** Blitz cards from a unit (or the whole grade): two words for every sentence, shuffled, no repeats. */
  function build(units, rnd) {
    var words = [], sents = [], seen = {};
    units.forEach(function (u) { u.lessons.forEach(function (l) {
      if (l.review) return;
      (l.words || []).forEach(function (x) { if (!seen[x.kk]) { seen[x.kk] = 1; words.push({ type: 'word', kk: x.kk, e: x.e || '', ru: x.ru, en: x.en || x.ru }); } });
      (l.sentences || []).forEach(function (x) { if (!seen[x.kk]) { seen[x.kk] = 1; sents.push({ type: 'sentence', kk: x.kk, e: '', ru: x.ru, en: x.en || x.ru }); } });
    }); });
    shuffle(words, rnd); shuffle(sents, rnd);
    var out = [];
    while ((words.length || sents.length) && out.length < MAX) {
      if (words.length) out.push(words.shift()); if (words.length) out.push(words.shift());
      if (sents.length) out.push(sents.shift());
    }
    return out.slice(0, MAX);
  }
  function shuffle(a, rnd) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  /** Class result as a school mark (criteria assessment: 85 % — 5, 65 % — 4, 40 % — 3). */
  function mark(right, total) { var p = total ? right / total : 0; return p >= 0.85 ? 5 : p >= 0.65 ? 4 : p >= 0.4 ? 3 : 2; }
  return { SECONDS: SECONDS, MAX: MAX, topics: topics, build: build, mark: mark };
});
