/* Pronunciation scoring — pure logic shared by the game and the Node tests; the Python backend
 * (backend/qv_audio/scoring.py) implements exactly the same algorithm and the same test vectors.
 *
 *   Score = (1 − WLev(H, T) / max(|H|w, |T|w)) × Confidence        (0–100 %)
 *
 * WLev is a Levenshtein distance over graphemes where an error on one of the nine specifically
 * Kazakh letters (Ә І Ң Ғ Ү Ұ Қ Ө Һ) costs 1.5 instead of 1; |x|w is the length with the same weights. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.QScore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SPECIAL = 'әіңғүұқөһ';
  var SPECIAL_W = 1.5;
  var PASS = 70;

  var UNITS = ['', 'бір', 'екі', 'үш', 'төрт', 'бес', 'алты', 'жеті', 'сегіз', 'тоғыз'];
  var TENS = ['', 'он', 'жиырма', 'отыз', 'қырық', 'елу', 'алпыс', 'жетпіс', 'сексен', 'тоқсан'];
  // 0–9999 in Kazakh words (recognisers like Whisper write «730» where the child said «жеті жүз отыз»).
  function numToKk(n) {
    if (n === 0) return 'нөл';
    if (n > 9999) return String(n);
    var th = Math.floor(n / 1000), h = Math.floor(n % 1000 / 100), t = Math.floor(n % 100 / 10), u = n % 10, out = [];
    if (th) out.push(th === 1 ? 'мың' : UNITS[th] + ' мың');
    if (h) out.push(h === 1 ? 'жүз' : UNITS[h] + ' жүз');
    if (t) out.push(TENS[t]);
    if (u) out.push(UNITS[u]);
    return out.join(' ');
  }
  function normalize(t) {
    return String(t || '').toLowerCase().replace(/ё/g, 'е')
      .replace(/\d+/g, function (d) { return ' ' + numToKk(parseInt(d, 10)) + ' '; })
      .replace(/[^a-zа-яәіңғүұқөһ0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function w(ch) { return SPECIAL.indexOf(ch) >= 0 ? SPECIAL_W : 1; }
  function wlen(s) { var n = 0; for (var i = 0; i < s.length; i++) n += w(s[i]); return n; }

  /** Weighted alignment of hypothesis against target. @returns {{dist: number, ops: Array}} */
  function align(hyp, tgt) {
    var n = hyp.length, m = tgt.length, i, j;
    var d = [], bt = [];
    for (i = 0; i <= n; i++) { d.push(new Array(m + 1)); bt.push(new Array(m + 1)); }
    d[0][0] = 0;
    for (i = 1; i <= n; i++) { d[i][0] = d[i - 1][0] + 1; bt[i][0] = 'ins'; }
    for (j = 1; j <= m; j++) { d[0][j] = d[0][j - 1] + w(tgt[j - 1]); bt[0][j] = 'del'; }
    for (i = 1; i <= n; i++) {
      for (j = 1; j <= m; j++) {
        var same = hyp[i - 1] === tgt[j - 1];
        var sub = d[i - 1][j - 1] + (same ? 0 : w(tgt[j - 1]));
        var del = d[i][j - 1] + w(tgt[j - 1]);   // target letter was not said
        var ins = d[i - 1][j] + 1;               // an extra sound was said
        var best = Math.min(sub, del, ins);
        d[i][j] = best;
        bt[i][j] = best === sub ? (same ? 'ok' : 'sub') : best === del ? 'del' : 'ins';
      }
    }
    var ops = [];
    i = n; j = m;
    while (i > 0 || j > 0) {
      var op = bt[i][j];
      if (op === 'ok' || op === 'sub') { ops.push({ op: op, t: tgt[j - 1], h: hyp[i - 1] }); i--; j--; }
      else if (op === 'del') { ops.push({ op: 'del', t: tgt[j - 1], h: '' }); j--; }
      else { ops.push({ op: 'ins', t: '', h: hyp[i - 1] }); i--; }
    }
    ops.reverse();
    return { dist: d[n][m], ops: ops };
  }

  /**
   * @param {string} hypothesis  what the recogniser heard
   * @param {string} target      the phrase the learner had to say
   * @param {number} [confidence] mean token confidence of the recogniser, 0–1 (default 1)
   */
  function assess(hypothesis, target, confidence) {
    var h = normalize(hypothesis), t = normalize(target);
    var conf = confidence == null ? 1 : Math.max(0, Math.min(1, confidence));
    var a = align(h, t), denom = Math.max(wlen(h), wlen(t));
    var acc = denom > 0 ? Math.max(0, 1 - a.dist / denom) : 1;
    var missed = [];
    a.ops.forEach(function (o) {
      if (o.t && SPECIAL.indexOf(o.t) >= 0 && o.op !== 'ok' && missed.indexOf(o.t) < 0) missed.push(o.t);
    });
    var score = Math.round(acc * conf * 1000) / 10;
    return {
      target: t, hypothesis: h, accuracy: Math.round(acc * 1000) / 10, confidence: conf, score: score,
      passed: score >= PASS, missed: missed, ops: a.ops, feedback: feedback(score, missed)
    };
  }

  function feedback(score, missed) {
    if (missed.length) {
      var L = missed.join(', ').toUpperCase();
      return {
        kk: 'Назар аудар! Мына дыбыстарды анығырақ айт: ' + L,
        ru: 'Обрати внимание! Произнеси чётче звуки: ' + L,
        en: 'Listen closely! Say these sounds more clearly: ' + L
      };
    }
    if (score >= 90) return { kk: 'Керемет айтылым!', ru: 'Отличное произношение!', en: 'Excellent pronunciation!' };
    if (score >= PASS) return { kk: 'Жақсы! Тағы сәл анығырақ.', ru: 'Хорошо! Ещё чуть-чуть чётче.', en: 'Good! Just a little clearer.' };
    return { kk: 'Тағы бір рет айтып көр.', ru: 'Попробуй сказать ещё раз.', en: 'Try saying it once more.' };
  }

  return { assess: assess, align: align, normalize: normalize, SPECIAL: SPECIAL, SPECIAL_W: SPECIAL_W, PASS: PASS };
});
