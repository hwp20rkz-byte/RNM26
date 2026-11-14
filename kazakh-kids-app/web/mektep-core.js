/* Фаза 2 «Мектеп» — школьные предметы на казахском. Чистая логика (UMD: window.QMEKTEP; require() в тестах).
 * SUBJECTS — каркас «предмет → класс → тема»; у темы есть генератор заданий (gen) или «жақында» (day — день плана).
 * Математика: ответы вычисляются, числа называет движок QDATA.numToKk, падежи — grammar-core. Факты не нужны —
 * ошибиться в ответе нельзя; а темы и классы надо сверить с типовой программой (методичка, «на проверку»). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { require('./data.js'); module.exports = factory((global.window || global).QDATA, require('./grammar-core.js')); }
  else root.QMEKTEP = factory(root.QDATA, root.QGRAM);
})(typeof self !== 'undefined' ? self : this, function (D, G) {
  'use strict';
  var N = D.numToKk, ROUND = 10;
  var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
  function rint(r, a, b) { return a + Math.floor(r() * (b - a + 1)); }
  function shuffle(a, r) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  /** options: the answer + near misses, distinct, within [lo, hi] */
  function near(ans, r, lo, hi, n) {
    var set = [ans], d = [1, -1, 2, -2, 10, -10, 3, -3, 5, -5];
    shuffle(d, r);
    for (var i = 0; i < d.length && set.length < (n || 3); i++) { var x = ans + d[i]; if (x >= lo && x <= hi && set.indexOf(x) < 0) set.push(x); }
    for (var k = lo; set.length < (n || 3) && k <= hi; k++) if (set.indexOf(k) < 0) set.push(k);
    return shuffle(set, r);
  }
  var THINGS = [{ kk: 'алма', e: '🍎', ru: 'яблок', en: 'apples' }, { kk: 'доп', e: '⚽', ru: 'мячей', en: 'balls' }, { kk: 'құс', e: '🐦', ru: 'птиц', en: 'birds' },
    { kk: 'гүл', e: '🌷', ru: 'цветов', en: 'flowers' }, { kk: 'жұлдыз', e: '⭐', ru: 'звёзд', en: 'stars' }];
  var SHAPES = [
    { id: 'circle', kk: 'шеңбер', ru: 'круг', en: 'circle' }, { id: 'triangle', kk: 'үшбұрыш', ru: 'треугольник', en: 'triangle' },
    { id: 'square', kk: 'шаршы', ru: 'квадрат', en: 'square' }, { id: 'rect', kk: 'тіктөртбұрыш', ru: 'прямоугольник', en: 'rectangle' },
    { id: 'oval', kk: 'сопақша', ru: 'овал', en: 'oval' }, { id: 'pentagon', kk: 'бесбұрыш', ru: 'пятиугольник', en: 'pentagon' }, { id: 'rhombus', kk: 'ромб', ru: 'ромб', en: 'rhombus' }];
  var COINS = [1, 2, 5, 10, 20, 50, 100];
  /** Comparison read aloud with the engine's cases: «Отыз жеті қырық екіден кем.» / «Елу елуге тең.» */
  function compareSentence(a, b) {
    var wa = cap(N(a)), wb = N(b);
    if (a === b) return wa + ' ' + G.caseForm(wb, 'barys') + ' тең.';
    return wa + ' ' + G.caseForm(wb, 'shygys') + ' ' + (a < b ? 'кем' : 'артық') + '.';
  }
  var SIGN = { '+': 'қосу', '−': 'алу', '×': 'көбейту' };
  /** «Сегіз қосу бес тең он үш.» */
  function exprSentence(a, op, b, c) { return cap(N(a)) + ' ' + SIGN[op] + ' ' + N(b) + ' тең ' + N(c) + '.'; }

  var GEN = {
    count: function (r) {
      var t = THINGS[rint(r, 0, THINGS.length - 1)], n = rint(r, 1, 20);
      return { kk: 'Неше ' + t.kk + ' бар?', ru: 'Сколько ' + t.ru + '?', en: 'How many ' + t.en + '?', visual: { type: 'items', e: t.e, n: n },
        answer: N(n), options: near(n, r, 1, 20).map(N), say: N(n), full: cap(N(n)) + ' ' + t.kk + '.' };
    },
    tens: function (r) {
      var tt = rint(r, 1, 9), u = rint(r, 0, 9), n = tt * 10 + u;
      return { kk: tt + ' ондық, ' + u + ' бірлік. Бұл қай сан?', ru: tt + ' десятков и ' + u + ' единиц — какое это число?', en: tt + ' tens and ' + u + ' ones — which number?',
        visual: { type: 'tens', t: tt, u: u }, answer: String(n), options: near(n, r, 10, 99).map(String), say: N(n), full: cap(N(n)) + '.' };
    },
    add20: function (r) {
      var plus = r() < 0.55, a, b, c;
      if (plus) { a = rint(r, 2, 9); b = rint(r, 11 - a, 9); c = a + b; } else { c = rint(r, 2, 9); b = rint(r, 2, 9); a = c + b; if (a < 11) { a = 11 + rint(r, 0, 7); c = a - b; } }
      var op = plus ? '+' : '−';
      return { kk: a + ' ' + op + ' ' + b + ' = ?', ru: 'Посчитай', en: 'Work it out', visual: { type: 'expr', text: a + ' ' + op + ' ' + b }, answer: String(c),
        options: near(c, r, 0, 20).map(String), say: N(c), full: exprSentence(a, op, b, c) };
    },
    compare: function (r) {
      var a = rint(r, 1, 99), b = r() < 0.2 ? a : rint(r, 1, 99), ans = a === b ? '=' : a < b ? '<' : '>';
      return { kk: a + ' ? ' + b, ru: 'Больше, меньше или равно?', en: 'Greater, less or equal?', visual: { type: 'expr', text: a + ' ◻ ' + b }, answer: ans,
        options: ['<', '=', '>'], labels: { '<': 'кем', '=': 'тең', '>': 'артық' }, say: ans === '<' ? 'кем' : ans === '>' ? 'артық' : 'тең', full: compareSentence(a, b) };
    },
    shapes: function (r) {
      var s = SHAPES[rint(r, 0, SHAPES.length - 1)], others = shuffle(SHAPES.filter(function (x) { return x !== s; }), r).slice(0, 2);
      return { kk: 'Бұл қандай пішін?', ru: 'Что это за фигура?', en: 'What shape is it?', visual: { type: 'shape', id: s.id }, answer: s.kk,
        options: shuffle([s.kk, others[0].kk, others[1].kk], r), say: s.kk, full: 'Бұл — ' + s.kk + '.' };
    },
    add100: function (r) {
      var plus = r() < 0.5, a, b, c;
      if (plus) { a = rint(r, 11, 79); b = rint(r, 5, 99 - a); c = a + b; } else { a = rint(r, 21, 99); b = rint(r, 5, a - 10); c = a - b; }
      var op = plus ? '+' : '−';
      return { kk: a + ' ' + op + ' ' + b + ' = ?', ru: 'Посчитай', en: 'Work it out', visual: { type: 'expr', text: a + ' ' + op + ' ' + b }, answer: String(c),
        options: near(c, r, 0, 100).map(String), say: N(c), full: exprSentence(a, op, b, c) };
    },
    mul: function (r) {
      var a = rint(r, 2, 5), b = rint(r, 2, 10), c = a * b;
      return { kk: a + ' × ' + b + ' = ?', ru: 'Умножь', en: 'Multiply', visual: { type: 'expr', text: a + ' × ' + b }, answer: String(c),
        options: shuffle([c, c + a, Math.max(1, c - a)].filter(function (x, i, s) { return s.indexOf(x) === i; }), r).map(String), say: N(c), full: exprSentence(a, '×', b, c) };
    },
    money: function (r) {
      var k = rint(r, 2, 4), list = [], sum = 0;
      for (var i = 0; i < k; i++) { var c = COINS[rint(r, 0, 4)]; list.push(c); sum += c; }
      list.sort(function (x, y) { return y - x; });
      return { kk: 'Барлығы неше теңге?', ru: 'Сколько всего тенге?', en: 'How many tenge in total?', visual: { type: 'coins', list: list }, answer: String(sum),
        options: near(sum, r, 1, 200).map(String), say: N(sum) + ' теңге', full: cap(N(sum)) + ' теңге.' };
    }
  };

  // Предметы фазы 2 (plan-10-days.md). Классы и темы — по типовым программам РК; сверка с официальным текстом — в методичке.
  var SUBJECTS = [
    { id: 'math', icon: '🔢', kk: 'Математика', ru: 'Математика', en: 'Maths', hue: 'blue', topics: [
      { id: 'm1count', grade: 1, gen: 'count', kk: 'Санау 1–20', ru: 'Счёт до 20', en: 'Counting to 20' },
      { id: 'm1shapes', grade: 1, gen: 'shapes', kk: 'Геометриялық пішіндер', ru: 'Геометрические фигуры', en: 'Shapes' },
      { id: 'm1tens', grade: 1, gen: 'tens', kk: 'Ондықтар мен бірліктер', ru: 'Десятки и единицы', en: 'Tens and ones' },
      { id: 'm1add20', grade: 1, gen: 'add20', kk: 'Қосу және азайту 20 көлемінде', ru: 'Сложение и вычитание до 20', en: 'Adding and taking away to 20' },
      { id: 'm1compare', grade: 1, gen: 'compare', kk: 'Сандарды салыстыру', ru: 'Сравнение чисел', en: 'Comparing numbers' },
      { id: 'm2add100', grade: 2, gen: 'add100', kk: 'Қосу және азайту 100 көлемінде', ru: 'Сложение и вычитание до 100', en: 'Adding and taking away to 100' },
      { id: 'm2mul', grade: 2, gen: 'mul', kk: 'Көбейту кестесі (2–5)', ru: 'Таблица умножения (2–5)', en: 'Times tables (2–5)' },
      { id: 'm2money', grade: 2, gen: 'money', kk: 'Ақша: теңге', ru: 'Деньги: тенге', en: 'Money: tenge' }
    ] },
    { id: 'logic', icon: '🧩', kk: 'Логика', ru: 'Логика и алгоритмы', en: 'Logic', hue: 'purple', day: 4, topics: [] },
    { id: 'nature', icon: '🌿', kk: 'Жаратылыстану', ru: 'Естествознание', en: 'Science', hue: 'green', day: 5, topics: [] },
    { id: 'geo', icon: '🗺️', kk: 'География', ru: 'География Казахстана', en: 'Geography', hue: 'teal', day: 6, topics: [] },
    { id: 'cities', icon: '🏙️', kk: 'Қалалар', ru: 'Города и достопримечательности', en: 'Cities', hue: 'orange', day: 7, topics: [] },
    { id: 'history', icon: '📜', kk: 'Тарих', ru: 'История (5 класс)', en: 'History (grade 5)', hue: 'red', day: 8, topics: [] },
    { id: 'lit', icon: '📖', kk: 'Әдебиеттік оқу', ru: 'Литературное чтение', en: 'Reading', hue: 'pink', day: 9, topics: [] }
  ];
  /** A round of ROUND tasks for a topic; questions with the same visual are not repeated in a row. */
  function round(topic, r) {
    var out = [], seen = {};
    for (var guard = 0; out.length < ROUND && guard < 200; guard++) {
      var q = GEN[topic.gen](r), k = q.kk + '|' + JSON.stringify(q.visual);
      if (seen[k]) continue; seen[k] = 1; out.push(q);
    }
    return out;
  }
  function topicById(id) { var t = null; SUBJECTS.forEach(function (s) { s.topics.forEach(function (x) { if (x.id === id) t = x; }); }); return t; }
  /** Everything a topic can say aloud (for the voice pipeline): number words, prompts, labels. */
  function voiceLines() {
    var out = [];
    // only what the topics can say: results ≤ 100, coin sums ≤ 80 (≤ 4 coins of 1–20 ₸)
    for (var i = 0; i <= 100; i++) out.push(N(i));
    for (var s = 1; s <= 80; s++) out.push(N(s) + ' теңге');
    THINGS.forEach(function (t) { out.push('Неше ' + t.kk + ' бар?'); });
    SHAPES.forEach(function (s) { out.push(s.kk); });
    ['кем', 'тең', 'артық', 'Барлығы неше теңге?', 'Бұл қандай пішін?'].forEach(function (x) { out.push(x); });
    return out;
  }
  return { SUBJECTS: SUBJECTS, GEN: GEN, ROUND: ROUND, round: round, topicById: topicById, compareSentence: compareSentence, exprSentence: exprSentence, voiceLines: voiceLines, SHAPES: SHAPES };
});
