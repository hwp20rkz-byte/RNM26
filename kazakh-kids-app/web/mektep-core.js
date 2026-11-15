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
  var SIGN = { '+': 'қосу', '−': 'алу', '×': 'көбейту', '÷': 'бөлу' };
  /** «Сегіз қосу бес тең он үш.» */
  function exprSentence(a, op, b, c) { return cap(N(a)) + ' ' + SIGN[op] + ' ' + N(b) + ' тең ' + N(c) + '.'; }

  /** Fractions read with the engine: 3/4 → «төрттен үш» (the denominator in the ablative). */
  function fractionKk(n, d) { return G.caseForm(N(d), 'shygys') + ' ' + N(n); }
  var GOODS4 = [{ kk: 'алма', e: '🍎' }, { kk: 'нан', e: '🍞' }, { kk: 'дәптер', e: '📒' }, { kk: 'қалам', e: '🖊️' }, { kk: 'кітап', e: '📕' }, { kk: 'доп', e: '⚽' }];
  var KIDS = ['Әнел', 'Әлібек', 'Айсұлу', 'Тайсон'];
  /** «Бір алма — 120 теңге. Әнел 3 алма алды. Барлығы неше теңге?» */
  function buyText(g, price, k, who) { return 'Бір ' + g.kk + ' — ' + price + ' теңге. ' + who + ' ' + k + ' ' + g.kk + ' алды. Барлығы неше теңге?'; }
  /** «Әлібекте 500 теңге бар. Ол 320 теңгеге кітап алды. Қанша теңге қалды?» (locative and dative from the engine) */
  function changeText(g, have, price, who) { return G.caseForm(who, 'zhatys') + ' ' + have + ' теңге бар. Ол ' + G.caseForm(price + ' теңге', 'barys') + ' ' + g.kk + ' алды. Қанша теңге қалды?'; }
  var FRAC_D = [2, 3, 4, 5, 6, 8];
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

  GEN.mul69 = function (r) {
    var a = rint(r, 6, 9), b = rint(r, 2, 10), c = a * b;
    return { kk: a + ' × ' + b + ' = ?', ru: 'Умножь', en: 'Multiply', visual: { type: 'expr', text: a + ' × ' + b }, answer: String(c),
      options: shuffle([c, c + a, c - a].filter(function (x, i, s2) { return x > 0 && s2.indexOf(x) === i; }), r).map(String), say: N(c), full: exprSentence(a, '×', b, c) };
  };
  GEN.div = function (r) {
    var b = rint(r, 2, 9), c = rint(r, 2, 10), a = b * c;
    return { kk: a + ' ÷ ' + b + ' = ?', ru: 'Раздели', en: 'Divide', visual: { type: 'expr', text: a + ' ÷ ' + b }, answer: String(c),
      options: near(c, r, 1, 12).map(String), say: N(c), full: exprSentence(a, '÷', b, c) };
  };
  GEN.frac = function (r) {
    var d = FRAC_D[rint(r, 0, FRAC_D.length - 1)], n = rint(r, 1, d - 1), ans = fractionKk(n, d), opts = [ans];
    // distractors must be a different amount: 1/2 is not «wrong» next to 2/4
    for (var g = 0, vals = [n / d]; opts.length < 3 && g < 80; g++) { var d2 = FRAC_D[rint(r, 0, FRAC_D.length - 1)], n2 = rint(r, 1, d2 - 1), f = fractionKk(n2, d2);
      if (opts.indexOf(f) < 0 && vals.every(function (x) { return Math.abs(x - n2 / d2) > 1e-9; })) { opts.push(f); vals.push(n2 / d2); } }
    return { kk: 'Шеңбердің қанша бөлігі боялған?', ru: 'Какая часть круга закрашена?', en: 'What part of the circle is shaded?', visual: { type: 'frac', n: n, d: d },
      answer: ans, options: shuffle(opts, r), say: ans, full: n + '/' + d + ' — ' + ans + '.' };
  };
  GEN.shop = function (r) {
    var g = GOODS4[rint(r, 0, GOODS4.length - 1)], who = KIDS[rint(r, 0, KIDS.length - 1)], text, ans;
    if (r() < 0.5) { var k = rint(r, 2, 4), price = rint(r, 5, Math.floor(1000 / k / 10)) * 10; ans = price * k; text = buyText(g, price, k, who); }
    else { var have = [200, 500, 1000][rint(r, 0, 2)], p = rint(r, 5, have / 10 - 1) * 10; ans = have - p; text = changeText(g, have, p, who); }
    var opts = shuffle([ans, ans + 10, Math.max(10, ans - 10), ans + 100].filter(function (x, i, s2) { return s2.indexOf(x) === i; }).slice(0, 3), r);
    if (opts.indexOf(ans) < 0) opts[0] = ans;
    return { kk: text, ru: 'Реши задачу', en: 'Solve the problem', visual: { type: 'good', e: g.e }, answer: String(ans), options: opts.map(String), say: N(ans) + ' теңге', full: cap(N(ans)) + ' теңге.' };
  };
  GEN.place = function (r) {
    var h = rint(r, 1, 9), t = rint(r, 0, 9), u = rint(r, 0, 9), n = h * 100 + t * 10 + u;
    return { kk: h + ' жүздік, ' + t + ' ондық, ' + u + ' бірлік. Бұл қай сан?', ru: h + ' сотен, ' + t + ' десятков, ' + u + ' единиц — какое это число?', en: h + ' hundreds, ' + t + ' tens, ' + u + ' ones — which number?',
      visual: { type: 'place', h: h, t: t, u: u }, answer: String(n), options: (function () {   // the classic slip first: digits swapped (u·100 + t·10 + h), then near misses
      var c = [u * 100 + t * 10 + h, n + 10, n - 10, n + 100, n - 100, n + 1, n - 1].filter(function (x) { return x >= 100 && x <= 999 && x !== n; });
      var o = [n]; c.forEach(function (x) { if (o.length < 3 && o.indexOf(x) < 0) o.push(x); }); return shuffle(o, r).map(String); })(), say: N(n), full: cap(N(n)) + '.' };
  };

  /* ---------- day 4: logic ---------- */
  var ARROW = { R: '→', L: '←', U: '↑', D: '↓' }, FROM_ARROW = { '→': 'R', '←': 'L', '↑': 'U', '↓': 'D' };
  var ARROW_KK = { R: 'оңға', L: 'солға', U: 'жоғары', D: 'төмен' };
  /** Runs a program (letters R/L/U/D or arrows) on a size×size grid; a wall or the edge stops it with crash. */
  function runProgram(start, steps, size, walls) {
    size = size || 4; walls = walls || [];
    var x = start.x, y = start.y;
    for (var i = 0; i < steps.length; i++) {
      var d = FROM_ARROW[steps[i]] || steps[i], nx = x + (d === 'R' ? 1 : d === 'L' ? -1 : 0), ny = y + (d === 'D' ? 1 : d === 'U' ? -1 : 0);
      if (nx < 0 || ny < 0 || nx >= size || ny >= size || walls.some(function (w) { return w.x === nx && w.y === ny; })) return { x: x, y: y, crash: true };
      x = nx; y = ny;
    }
    return { x: x, y: y, crash: false };
  }
  /** Mirror of the left half of an ornament (rows of 0/1): the right half reads the row backwards. */
  function mirror(left) { return left.map(function (row) { return row.split('').reverse().join(''); }); }
  var ODD_SETS = {
    fruit: [['алма', '🍎'], ['алмұрт', '🍐'], ['жүзім', '🍇'], ['қарбыз', '🍉'], ['құлпынай', '🍓']],
    animal: [['сиыр', '🐄'], ['жылқы', '🐎'], ['қой', '🐑'], ['түйе', '🐫'], ['ит', '🐕']],
    transport: [['автобус', '🚌'], ['ұшақ', '✈️'], ['велосипед', '🚲'], ['пойыз', '🚂'], ['кеме', '🚢']]
  };
  var ODD_CAT = {}, ODD_E = {};
  Object.keys(ODD_SETS).forEach(function (c) { ODD_SETS[c].forEach(function (x) { ODD_CAT[x[0]] = c; ODD_E[x[0]] = x[1]; }); });
  // Киіз үй тігу — the usual order (to be checked by the teacher, see methodology/plan-10-days.md)
  var YURT = [{ kk: 'кереге', e: '🧱', ru: 'решётчатые стены', en: 'lattice walls' }, { kk: 'есік', e: '🚪', ru: 'дверь', en: 'door' },
    { kk: 'шаңырақ', e: '⭕', ru: 'купольный круг', en: 'roof crown' }, { kk: 'уық', e: '🥢', ru: 'жерди купола', en: 'roof poles' }, { kk: 'киіз', e: '🧶', ru: 'войлочное покрытие', en: 'felt cover' }];
  var PAT_E = ['🍎', '🍐', '⭐', '🌙', '🔺', '🔵', '🌷', '🐟'], PAT_UNITS = ['AB', 'AAB', 'ABB', 'ABC', 'AABB'];
  GEN.pattern = function (r) {
    var u = PAT_UNITS[rint(r, 0, PAT_UNITS.length - 1)], es = shuffle(PAT_E.slice(), r), map = { A: es[0], B: es[1], C: es[2] };
    var unit = u.split('').map(function (c) { return map[c]; }), len = rint(r, 5, 8), seq = [];
    for (var i = 0; i < len; i++) seq.push(unit[i % unit.length]);
    var ans = unit[len % unit.length], opts = shuffle([ans].concat(shuffle(es.slice(0, 4).filter(function (e) { return e !== ans; }), r).slice(0, 2)), r);
    return { kk: 'Келесісі қандай?', ru: 'Что дальше?', en: 'What comes next?', visual: { type: 'pattern', unit: unit, seq: seq }, answer: ans, options: opts, say: '', full: 'Заңдылық: ' + unit.join(' ') + ' …' };
  };
  GEN.odd = function (r) {
    var cats = shuffle(Object.keys(ODD_SETS), r), main = shuffle(ODD_SETS[cats[0]].slice(), r).slice(0, 3), odd = ODD_SETS[cats[1]][rint(r, 0, 4)];
    var items = shuffle(main.concat([odd]), r);
    return { kk: 'Қайсысы артық?', ru: 'Что лишнее?', en: 'Which is the odd one out?', visual: { type: 'odd', list: items.map(function (x) { return x[1]; }) }, answer: odd[0],
      options: items.map(function (x) { return x[0]; }), say: odd[0], full: 'Артығы — ' + odd[0] + '.' };
  };
  /** Shortest path by BFS; null if none. */
  function path(size, start, goal, walls) {
    var q = [[start.x, start.y, []]], seen = {}; seen[start.x + ',' + start.y] = 1;
    while (q.length) {
      var c = q.shift();
      if (c[0] === goal.x && c[1] === goal.y) return c[2];
      [['R', 1, 0], ['D', 0, 1], ['L', -1, 0], ['U', 0, -1]].forEach(function (d) {
        var nx = c[0] + d[1], ny = c[1] + d[2], k = nx + ',' + ny;
        if (nx < 0 || ny < 0 || nx >= size || ny >= size || seen[k] || walls.some(function (w) { return w.x === nx && w.y === ny; })) return;
        seen[k] = 1; q.push([nx, ny, c[2].concat([d[0]])]);
      });
    }
    return null;
  }
  GEN.algo = function (r) {
    var size = 4;
    for (var g = 0; g < 200; g++) {
      var start = { x: rint(r, 0, 3), y: rint(r, 0, 3) }, goal = { x: rint(r, 0, 3), y: rint(r, 0, 3) }, walls = [];
      for (var k = 0; k < 2; k++) { var w = { x: rint(r, 0, 3), y: rint(r, 0, 3) }; if (!(w.x === start.x && w.y === start.y) && !(w.x === goal.x && w.y === goal.y)) walls.push(w); }
      var p = path(size, start, goal, walls); if (!p || p.length < 3 || p.length > 5) continue;
      var ans = p.map(function (d) { return ARROW[d]; }).join(' '), wrong = [];
      for (var t = 0; t < 60 && wrong.length < 2; t++) {
        var m = p.slice(), i = rint(r, 0, m.length - 1), kind = rint(r, 0, 2);
        if (kind === 0) m[i] = ['R', 'L', 'U', 'D'][rint(r, 0, 3)]; else if (kind === 1) m.pop(); else if (i + 1 < m.length) { var tmp = m[i]; m[i] = m[i + 1]; m[i + 1] = tmp; }
        var str = m.map(function (d) { return ARROW[d]; }).join(' '), end = runProgram(start, m, size, walls);
        if (str !== ans && wrong.indexOf(str) < 0 && m.length && !(end.x === goal.x && end.y === goal.y && !end.crash)) wrong.push(str);
      }
      if (wrong.length < 2) continue;
      return { kk: 'Әже-Bot батареяға қалай жетеді?', ru: 'Какая программа приведёт робота к батарейке?', en: 'Which program takes the robot to the battery?',
        visual: { type: 'grid', size: size, start: start, goal: goal, walls: walls }, answer: ans, options: shuffle([ans].concat(wrong), r), say: '', full: p.map(function (d) { return ARROW_KK[d]; }).join(', ') + '.' };
    }
    return GEN.algo(Math.random);
  };
  GEN.sym = function (r) {
    for (var g = 0; g < 100; g++) {
      var left = []; for (var y = 0; y < 5; y++) { var row = ''; for (var x = 0; x < 3; x++) row += r() < 0.5 ? '1' : '0'; left.push(row); }
      var mir = mirror(left).join('|'), same = left.join('|');
      if (mir === same) continue;                           // a palindromic half would make the copy right too
      var flip = mirror(left).map(function (row, i) { return i === 2 ? (row[0] === '1' ? '0' : '1') + row.slice(1) : row; }).join('|');
      var opts = [mir, same, flip].filter(function (x, i, a) { return a.indexOf(x) === i; });
      if (opts.length < 3) continue;
      return { kk: 'Ою-өрнекті симметриялы етіп аяқта.', ru: 'Дорисуй орнамент симметрично', en: 'Complete the ornament symmetrically', visual: { type: 'sym', left: left }, answer: mir, options: shuffle(opts, r), optType: 'sym', say: '', full: 'Оң жағы — сол жағының айнадағы бейнесі.' };
    }
    return GEN.sym(Math.random);
  };
  GEN.yurt = function (r) {
    var step = rint(r, 1, YURT.length - 1), ans = YURT[step].kk;
    var others = shuffle(YURT.filter(function (x, i) { return i !== step; }).map(function (x) { return x.kk; }), r).slice(0, 2);
    return { kk: 'Киіз үй тігу: келесі қадам қандай?', ru: 'Ставим юрту: что дальше?', en: 'Putting up a yurt: what comes next?', visual: { type: 'yurt', step: step, done: YURT.slice(0, step).map(function (x) { return x.e + ' ' + x.kk; }) },
      answer: ans, options: shuffle([ans].concat(others), r), say: ans, full: YURT.slice(0, step + 1).map(function (x) { return x.kk; }).join(' → ') + '.' };
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
      { id: 'm2money', grade: 2, gen: 'money', kk: 'Ақша: теңге', ru: 'Деньги: тенге', en: 'Money: tenge' },
      { id: 'm3mul69', grade: 3, gen: 'mul69', kk: 'Көбейту кестесі (6–9)', ru: 'Таблица умножения (6–9)', en: 'Times tables (6–9)' },
      { id: 'm3div', grade: 3, gen: 'div', kk: 'Бөлу', ru: 'Деление', en: 'Division' },
      { id: 'm3frac', grade: 3, gen: 'frac', kk: 'Бөлшектер', ru: 'Доли и дроби', en: 'Fractions' },
      { id: 'm4shop', grade: 4, gen: 'shop', kk: 'Базарда: есептер', ru: 'Задачи: покупки и сдача', en: 'Word problems: shopping' },
      { id: 'm4place', grade: 4, gen: 'place', kk: 'Үш таңбалы сандар', ru: 'Трёхзначные числа', en: 'Three-digit numbers' }
    ] },
    { id: 'logic', icon: '🧩', kk: 'Логика', ru: 'Логика и алгоритмы', en: 'Logic', hue: 'purple', topics: [
      { id: 'l1pattern', grade: 1, gen: 'pattern', kk: 'Заңдылық', ru: 'Закономерности', en: 'Patterns' },
      { id: 'l1odd', grade: 1, gen: 'odd', kk: 'Артығын тап', ru: 'Найди лишнее', en: 'Odd one out' },
      { id: 'l2algo', grade: 2, gen: 'algo', kk: 'Әже-Bot бағдарламасы', ru: 'Программа для робота', en: 'Program the robot' },
      { id: 'l2yurt', grade: 2, gen: 'yurt', kk: 'Киіз үй құрастыр', ru: 'Собери юрту', en: 'Put up a yurt' },
      { id: 'l3sym', grade: 3, gen: 'sym', kk: 'Ою-өрнек: симметрия', ru: 'Орнамент: симметрия', en: 'Ornament: symmetry' }
    ] },
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
    for (var m = 10; m <= 1000; m += 10) out.push(N(m) + ' теңге');             // shopping answers: round sums, change can be under 100
    for (var hh = 200; hh <= 900; hh += 100) out.push(N(hh));
    FRAC_D.forEach(function (d) { for (var nn = 1; nn < d; nn++) out.push(fractionKk(nn, d)); });
    out.push('Шеңбердің қанша бөлігі боялған?');
    Object.keys(ODD_CAT).forEach(function (k) { out.push(k); }); YURT.forEach(function (x) { out.push(x.kk); });
    ['Келесісі қандай?', 'Қайсысы артық?', 'Әже-Bot батареяға қалай жетеді?', 'Ою-өрнекті симметриялы етіп аяқта.', 'Киіз үй тігу: келесі қадам қандай?'].forEach(function (x) { out.push(x); });
    return out;
  }
  return { runProgram: runProgram, mirror: mirror, ARROW_KK: ARROW_KK, ODD_CAT: ODD_CAT, ODD_E: ODD_E, YURT: YURT, fractionKk: fractionKk, buyText: buyText, changeText: changeText, SUBJECTS: SUBJECTS, GEN: GEN, ROUND: ROUND, round: round, topicById: topicById, compareSentence: compareSentence, exprSentence: exprSentence, voiceLines: voiceLines, SHAPES: SHAPES };
});
