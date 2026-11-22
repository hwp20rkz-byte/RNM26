/* Фаза 2 «Мектеп» — школьные предметы на казахском. Чистая логика (UMD: window.QMEKTEP; require() в тестах).
 * SUBJECTS — каркас «предмет → класс → тема»; у темы есть генератор заданий (gen) или «жақында» (day — день плана).
 * Математика: ответы вычисляются, числа называет движок QDATA.numToKk, падежи — grammar-core. Факты не нужны —
 * ошибиться в ответе нельзя; а темы и классы надо сверить с типовой программой (методичка, «на проверку»). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { require('./data.js'); module.exports = factory((global.window || global).QDATA, require('./grammar-core.js'), require('./kz-map.js')); }
  else root.QMEKTEP = factory(root.QDATA, root.QGRAM, root.QKZMAP);
})(typeof self !== 'undefined' ? self : this, function (D, G, MAP) {
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
  /* ---------- 21.11: «Базарда: сұхбат» — a pupil and the seller talk; the problem uses only what was said ----------
   * Game prices (not market facts), fixed so that every line can be voiced. Numbers in words and the cases — engine. */
  var BAZAAR = [{ kk: 'алма', unit: 'келі', price: 500, e: '🍎' }, { kk: 'картоп', unit: 'келі', price: 200, e: '🥔' },
    { kk: 'қызанақ', unit: 'келі', price: 600, e: '🍅' }, { kk: 'нан', unit: '', price: 150, e: '🍞' }, { kk: 'сүт', unit: 'литр', price: 400, e: '🥛' }];
  var SELLER = { who: 'E1', name: 'Сатушы', e: '🧔' }, NOTES = [1000, 2000, 5000], BZ_KIDS = [{ who: 'ANEL', kk: 'Әнел', e: '👧' }, { who: 'ALIBEK', kk: 'Әлібек', e: '👦' }];
  function bazaarAsk(good) { return 'Сәлеметсіз бе! ' + cap(G.caseForm(good, 'ilik')) + ' бағасы қанша?'; }
  function bazaarPrice(g) { return cap('бір ' + (g.unit || g.kk)) + ' — ' + N(g.price) + ' теңге.'; }
  function bazaarBuy(g, k) { return 'Маған ' + N(k) + ' ' + (g.unit ? g.unit + ' ' : '') + g.kk + ' беріңізші.'; }
  function bazaarPay(note) { return 'Ағай, мінеки, ' + N(note) + ' теңге.'; }   // the address first: Әнел's voice drops a short first word, and it must never be the number
  var BZ_THANKS = 'Рахмет! Қайтарымыңызды алыңыз.';
  function bazaarTotalQ(name) { return name + ' барлығы неше теңге төлейді?'; }
  function bazaarChangeQ(name) { return 'Сатушы ' + G.caseForm(name, 'barys') + ' неше теңге қайтарады?'; }
  GEN.bazaar = function (r) {
    var g = BAZAAR[rint(r, 0, BAZAAR.length - 1)], p = BZ_KIDS[rint(r, 0, 1)], k = rint(r, 2, 3), total = g.price * k;
    var ln = function (who, x, text) { return { who: who.who, name: who.name || who.kk, e: who.e, text: text }; };
    var scene = [ln(p, p, bazaarAsk(g.kk)), ln(SELLER, SELLER, bazaarPrice(g)), ln(p, p, bazaarBuy(g, k))];
    var paid = 0, ans, kk, near;
    if (r() < 0.5) { ans = total; kk = bazaarTotalQ(p.kk); near = [total + g.price, total - g.price, total + 100]; }
    else {
      var ok = NOTES.filter(function (x) { return x > total; }); paid = ok[rint(r, 0, ok.length - 1)];
      scene.push(ln(p, p, bazaarPay(paid)), ln(SELLER, SELLER, BZ_THANKS));
      ans = paid - total; kk = bazaarChangeQ(p.kk); near = [ans + g.price, ans - g.price, paid - g.price, ans + 100];
    }
    var opts = [ans].concat(shuffle(near.filter(function (x, i, a) { return x > 0 && x !== ans && a.indexOf(x) === i; }), r)).slice(0, 3);
    return { kk: kk, ru: paid ? 'Сколько сдачи даст продавец?' : 'Сколько всего заплатит?', en: paid ? 'How much change?' : 'How much in all?',
      scene: scene, visual: { type: 'scene', e: g.e, lines: scene }, data: { good: g.kk, k: k, paid: paid, pupil: p.who },
      answer: String(ans), options: shuffle(opts, r).map(String), say: N(ans) + ' теңге', full: cap(N(ans)) + ' теңге.' };
  };
  function bazaarLines() {
    var out = [];
    BAZAAR.forEach(function (g) { out.push({ who: 'E1', kk: bazaarPrice(g) });
      BZ_KIDS.forEach(function (p) { out.push({ who: p.who, kk: bazaarAsk(g.kk) }); [2, 3].forEach(function (k) { out.push({ who: p.who, kk: bazaarBuy(g, k) }); }); }); });
    BZ_KIDS.forEach(function (p) { NOTES.forEach(function (x) { out.push({ who: p.who, kk: bazaarPay(x) }); }); });
    out.push({ who: 'E1', kk: BZ_THANKS });
    return out;
  }
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
  // build order of a yurt (also the 3D «Киіз үй» in suite/: suite/src/lib/kiiz.test.ts checks it against this table);
  // done — what the narrator says when the part is in place
  var YURT = [{ kk: 'кереге', e: '🧱', ru: 'решётчатые стены', en: 'lattice walls', done: 'Кереге жайылды.' }, { kk: 'есік', e: '🚪', ru: 'дверь', en: 'door', done: 'Есік орнатылды.' },
    { kk: 'шаңырақ', e: '⭕', ru: 'купольный круг', en: 'roof crown', done: 'Шаңырақ көтерілді.' }, { kk: 'уық', e: '🥢', ru: 'жерди купола', en: 'roof poles', done: 'Уықтар шаншылды.' },
    { kk: 'киіз', e: '🧶', ru: 'войлочное покрытие', en: 'felt cover', done: 'Киіз жабылды.' }];
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

  /* ---------- day 5: nature (reference tables written by hand; sources in methodology/plan-10-days.md) ---------- */
  var MONTHS = ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'];
  var SEASONS = ['қыс', 'көктем', 'жаз', 'күз'], SEASON_OF = {};
  MONTHS.forEach(function (m, i) { SEASON_OF[m] = SEASONS[Math.floor(((i + 1) % 12) / 3)]; });
  var DOMESTIC = [['сиыр', '🐄'], ['қой', '🐑'], ['жылқы', '🐎'], ['түйе', '🐫'], ['ешкі', '🐐'], ['ит', '🐕'], ['мысық', '🐈']];
  var WILD_L = [['қасқыр', '🐺'], ['түлкі', '🦊'], ['аю', '🐻'], ['барыс', '🐆'], ['қоян', '🐇'], ['тиін', '🐿️'], ['бүркіт', '🦅']];
  var WILD = WILD_L.map(function (x) { return x[0]; });
  // who lives where: only unambiguous pairs; distractors per place are surely wrong (no «squirrel in the mountains»)
  var HOMES = [{ kk: 'балық', e: '🐟', home: G.caseForm('су', 'zhatys') }, { kk: 'барыс', e: '🐆', home: G.caseForm('тау', 'zhatys') },
    { kk: 'түйе', e: '🐫', home: G.caseForm('шөл', 'zhatys') }, { kk: 'тиін', e: '🐿️', home: G.caseForm('орман', 'zhatys') }];
  // 3D «Табиғат зертханасы» (suite/src/lib/labLogic.ts checks against these): two clear animals per habitat, and
  // three well-known food chains (plant → plant-eater → predator); facts for the teacher in plan-10-days.md
  var LAB_HOMES = [
    { kk: 'балық', e: '🐟', home: 'су' }, { kk: 'шаян', e: '🦞', home: 'су' },
    { kk: 'барыс', e: '🐆', home: 'тау' }, { kk: 'арқар', e: '🐏', home: 'тау' },
    { kk: 'түйе', e: '🐫', home: 'шөл' }, { kk: 'кесіртке', e: '🦎', home: 'шөл' },
    { kk: 'тиін', e: '🐿️', home: 'орман' }, { kk: 'тоқылдақ', e: '🐦', home: 'орман' }
  ].map(function (x) { return { kk: x.kk, e: x.e, home: x.home, at: G.caseForm(x.home, 'zhatys') }; });
  var CHAINS = [[{ kk: 'шөп', e: '🌿' }, { kk: 'қоян', e: '🐇' }, { kk: 'түлкі', e: '🦊' }],
    [{ kk: 'дән', e: '🌾' }, { kk: 'тышқан', e: '🐭' }, { kk: 'бүркіт', e: '🦅' }],
    [{ kk: 'шөп', e: '🌱' }, { kk: 'қой', e: '🐑' }, { kk: 'қасқыр', e: '🐺' }]];
  var HOME_NOT = { 'суда': ['барыс', 'түйе', 'тиін'], 'тауда': ['балық', 'түйе'], 'шөлде': ['балық', 'тиін'], 'орманда': ['балық', 'түйе'] };
  var SENSES = [
    { q: 'Біз немен көреміз?', organ: G.caseForm('көз', 'komektes'), ru: 'Чем мы видим?', en: 'What do we see with?' },
    { q: 'Біз немен естиміз?', organ: G.caseForm('құлақ', 'komektes'), ru: 'Чем мы слышим?', en: 'What do we hear with?' },
    { q: 'Иісті немен сеземіз?', organ: G.caseForm('мұрын', 'komektes'), ru: 'Чем мы чувствуем запах?', en: 'What do we smell with?' },
    { q: 'Дәмді немен сеземіз?', organ: G.caseForm('тіл', 'komektes'), ru: 'Чем мы чувствуем вкус?', en: 'What do we taste with?' },
    { q: 'Жылы мен суықты немен сеземіз?', organ: G.caseForm('тері', 'komektes'), ru: 'Чем мы чувствуем тепло и холод?', en: 'What do we feel warm and cold with?' }];
  // Қызыл кітап (Красная книга РК): only animals listed there; the distractors are common farm animals
  var REDBOOK = ['барыс', 'құлан', 'арқар', 'қарақұйрық'], COMMON = ['қой', 'сиыр', 'тауық', 'ит', 'мысық', 'жылқы'];
  var WATER = [{ kk: 'Су буланады', e: '♨️' }, { kk: 'Бұлт пайда болады', e: '☁️' }, { kk: 'Жаңбыр жауады', e: '🌧️' }, { kk: 'Су өзенге ағады', e: '🏞️' }];
  GEN.season = function (r) {
    var m = MONTHS[rint(r, 0, 11)], ans = SEASON_OF[m];
    return { kk: cap(m) + ' — қай мезгіл?', ru: 'Какое это время года?', en: 'Which season is it?', visual: { type: 'big', e: '📅', text: m }, answer: ans,
      options: shuffle([ans].concat(shuffle(SEASONS.filter(function (x) { return x !== ans; }), r).slice(0, 2)), r), say: ans, full: cap(m) + ' — ' + ans + '.' };
  };
  GEN.wild = function (r) {
    var askWild = r() < 0.5, one = (askWild ? WILD_L : DOMESTIC)[rint(r, 0, 6)], two = shuffle((askWild ? DOMESTIC : WILD_L).slice(), r).slice(0, 2), items = shuffle([one].concat(two), r);
    return { kk: askWild ? 'Қайсысы жабайы аң?' : 'Қайсысы үй жануары?', ru: askWild ? 'Кто из них дикий зверь?' : 'Кто из них домашнее животное?', en: askWild ? 'Which is a wild animal?' : 'Which is a farm animal?',
      visual: { type: 'odd', list: items.map(function (x) { return x[1]; }) }, answer: one[0], options: items.map(function (x) { return x[0]; }), say: one[0], full: cap(one[0]) + ' — ' + (askWild ? 'жабайы аң.' : 'үй жануары.') };
  };
  GEN.home = function (r) {
    var h = HOMES[rint(r, 0, HOMES.length - 1)], wrong = shuffle(HOME_NOT[h.home].slice(), r).slice(0, 2);
    var e = function (k) { return HOMES.filter(function (x) { return x.kk === k; })[0].e; };
    return { kk: cap(h.home) + ' кім тұрады?', ru: 'Кто живёт здесь?', en: 'Who lives here?', visual: { type: 'big', e: { 'суда': '🌊', 'тауда': '🏔️', 'шөлде': '🏜️', 'орманда': '🌲' }[h.home], text: h.home },
      answer: h.kk, options: shuffle([h.kk].concat(wrong), r), labels: null, say: h.kk, full: cap(h.kk) + ' ' + h.home + ' тұрады.', emo: [h.kk].concat(wrong).map(e) };
  };
  GEN.senses = function (r) {
    var s = SENSES[rint(r, 0, SENSES.length - 1)], others = shuffle(SENSES.filter(function (x) { return x !== s; }), r).slice(0, 2).map(function (x) { return x.organ; });
    return { kk: s.q, ru: s.ru, en: s.en, visual: { type: 'big', e: '🧒', text: '' }, answer: s.organ, options: shuffle([s.organ].concat(others), r), say: s.organ, full: s.q.replace('немен', s.organ).replace('?', '.') };
  };
  GEN.redbook = function (r) {
    var a = REDBOOK[rint(r, 0, REDBOOK.length - 1)], others = shuffle(COMMON.slice(), r).slice(0, 2);
    return { kk: 'Қайсысы Қызыл кітапқа енген?', ru: 'Кто из них в Красной книге?', en: 'Which one is in the Red Book?', visual: { type: 'big', e: '📕', text: 'Қызыл кітап' },
      answer: a, options: shuffle([a].concat(others), r), say: a, full: cap(a) + ' — Қызыл кітапқа енген.' };
  };
  GEN.water = function (r) {
    var step = rint(r, 1, WATER.length - 1), ans = WATER[step].kk, others = shuffle(WATER.filter(function (x, i) { return i !== step; }).map(function (x) { return x.kk; }), r).slice(0, 2);
    return { kk: 'Судың айналымы: келесі кезең қандай?', ru: 'Круговорот воды: что дальше?', en: 'The water cycle: what comes next?', visual: { type: 'yurt', step: step, done: WATER.slice(0, step).map(function (x) { return x.e + ' ' + x.kk; }) },
      answer: ans, options: shuffle([ans].concat(others), r), say: ans, full: WATER.slice(0, step + 1).map(function (x) { return x.kk; }).join(' → ') + '.' };
  };

  /* ---------- day 6: geography of Kazakhstan (reference tables by hand; sources in methodology/plan-10-days.md) ---------- */
  var REGION_CENTER = {
    'Абай облысы': 'Семей', 'Ақмола облысы': 'Көкшетау', 'Ақтөбе облысы': 'Ақтөбе', 'Алматы облысы': 'Қонаев', 'Атырау облысы': 'Атырау',
    'Батыс Қазақстан облысы': 'Орал', 'Жамбыл облысы': 'Тараз', 'Жетісу облысы': 'Талдықорған', 'Қарағанды облысы': 'Қарағанды',
    'Қостанай облысы': 'Қостанай', 'Қызылорда облысы': 'Қызылорда', 'Маңғыстау облысы': 'Ақтау', 'Павлодар облысы': 'Павлодар',
    'Солтүстік Қазақстан облысы': 'Петропавл', 'Түркістан облысы': 'Түркістан', 'Ұлытау облысы': 'Жезқазған', 'Шығыс Қазақстан облысы': 'Өскемен'
  };
  var REGIONS = Object.keys(REGION_CENTER);
  /** «Абай облысының орталығы қай қала?» (genitive from the engine) */
  function centerQuestion(reg) { return G.caseForm(reg, 'ilik') + ' орталығы қай қала?'; }
  var DIRS = [{ kk: 'солтүстік', ru: 'север', en: 'north' }, { kk: 'шығыс', ru: 'восток', en: 'east' }, { kk: 'оңтүстік', ru: 'юг', en: 'south' }, { kk: 'батыс', ru: 'запад', en: 'west' }];
  var FEATURE = {};   // rivers, lakes and mountains of Kazakhstan (seas left out: «sea or lake» is not a question for grade 3)
  ['Ертіс', 'Іле', 'Сырдария', 'Жайық', 'Есіл', 'Тобыл'].forEach(function (x) { FEATURE[x] = 'river'; });
  ['Балқаш', 'Алакөл', 'Зайсан', 'Марқакөл'].forEach(function (x) { FEATURE[x] = 'lake'; });
  ['Алтай', 'Алатау', 'Тарбағатай', 'Қаратау'].forEach(function (x) { FEATURE[x] = 'mountain'; });
  var KIND_KK = { river: 'өзен', lake: 'көл', mountain: 'тау' };
  var NEIGHBORS = ['Ресей', 'Қытай', 'Қырғызстан', 'Өзбекстан', 'Түрікменстан'], FAR = ['Жапония', 'Франция', 'Бразилия', 'Египет', 'Канада', 'Италия'];
  var REP_CITIES = ['Астана', 'Алматы', 'Шымкент'], OTHER_CITIES = ['Қарағанды', 'Ақтөбе', 'Тараз', 'Павлодар', 'Өскемен', 'Атырау'];
  function oneOf(list, others, r, n) { var a = list[rint(r, 0, list.length - 1)]; return { a: a, opts: shuffle([a].concat(shuffle(others.slice(), r).slice(0, n || 2)), r) }; }
  GEN.dirs = function (r) {
    var roll = r();
    if (roll < 0.25) {   // opposite side: «Солтүстіктің қарама-қарсы жағы қай жақ?»
      var j = rint(r, 0, 3), opp = DIRS[(j + 2) % 4].kk, o2 = shuffle(DIRS.filter(function (x, n) { return n !== (j + 2) % 4; }).map(function (x) { return x.kk; }), r).slice(0, 2);
      return { kk: cap(G.caseForm(DIRS[j].kk, 'ilik')) + ' қарама-қарсы жағы қай жақ?', ru: 'Какая сторона противоположна?', en: 'Which side is opposite?',
        visual: { type: 'big', e: '↕️', text: cap(DIRS[j].kk) }, answer: opp, options: shuffle([opp].concat(o2), r), say: opp, full: cap(DIRS[j].kk) + ' — ' + opp + '.' };
    }
    if (roll < 0.35) {   // northern hemisphere: the noon sun is in the south
      var o3 = shuffle(['солтүстік', 'шығыс', 'батыс'], r).slice(0, 2);
      return { kk: 'Түсте күн қай жақта тұрады?', ru: 'Где солнце в полдень?', en: 'Where is the sun at noon?', visual: { type: 'big', e: '☀️', text: '' },
        answer: 'оңтүстік', options: shuffle(['оңтүстік'].concat(o3), r), say: 'оңтүстік', full: 'Түсте күн оңтүстікте тұрады.' };
    }
    if (roll < 0.55) {
      var rise = r() < 0.5, ans = rise ? 'шығыс' : 'батыс', o = shuffle(DIRS.map(function (d) { return d.kk; }).filter(function (x) { return x !== ans; }), r).slice(0, 2);
      return { kk: rise ? 'Күн қай жақтан шығады?' : 'Күн қай жаққа батады?', ru: rise ? 'Где восходит солнце?' : 'Где садится солнце?', en: rise ? 'Where does the sun rise?' : 'Where does the sun set?',
        visual: { type: 'big', e: rise ? '🌅' : '🌇', text: '' }, answer: ans, options: shuffle([ans].concat(o), r), say: ans, full: rise ? 'Күн шығыстан шығады.' : 'Күн батысқа батады.' };
    }
    var k = rint(r, 0, 3), d = DIRS[k], others = shuffle(DIRS.filter(function (x) { return x !== d; }), r).slice(0, 2).map(function (x) { return x.kk; });
    return { kk: 'Нұсқар қай жаққа бағытталған?', ru: 'Куда показывает стрелка?', en: 'Which way does the arrow point?', visual: { type: 'compass', deg: k * 90 },
      answer: d.kk, options: shuffle([d.kk].concat(others), r), say: d.kk, full: cap(d.kk) + '.' };
  };
  GEN.feature = function (r) {
    var kinds = shuffle(['river', 'lake', 'mountain'], r), kind = kinds[0], names = Object.keys(FEATURE);
    var pick = function (kd) { var l = names.filter(function (x) { return FEATURE[x] === kd; }); return l[rint(r, 0, l.length - 1)]; };
    var a = pick(kind), opts = shuffle([a, pick(kinds[1]), pick(kinds[2])], r);
    return { kk: 'Қайсысы ' + KIND_KK[kind] + '?', ru: { river: 'Что из этого река?', lake: 'Что из этого озеро?', mountain: 'Что из этого горы?' }[kind], en: 'Which one is a ' + { river: 'river', lake: 'lake', mountain: 'mountain range' }[kind] + '?',
      visual: { type: 'big', e: { river: '🏞️', lake: '🌊', mountain: '🏔️' }[kind], text: '' }, answer: a, options: opts, say: a, full: a + ' — ' + KIND_KK[kind] + '.' };
  };
  GEN.repcity = function (r) {
    var roll = r();
    if (roll < 0.15) return { kk: 'Қазақстанның астанасы қай қала?', ru: 'Какой город — столица Казахстана?', en: 'Which city is the capital of Kazakhstan?', visual: { type: 'big', e: '🏛️', text: '' },
      answer: 'Астана', options: shuffle(['Астана'].concat(shuffle(['Алматы', 'Шымкент', 'Қарағанды'], r).slice(0, 2)), r), say: 'Астана', full: 'Қазақстанның астанасы — Астана.' };
    if (roll < 0.55) {
      var y = oneOf(OTHER_CITIES, REP_CITIES, r);
      return { kk: 'Қайсысы республикалық маңызы бар қала емес?', ru: 'Какой город НЕ республиканского значения?', en: 'Which is NOT a city of national significance?', visual: { type: 'big', e: '🏘️', text: '' },
        answer: y.a, options: y.opts, say: y.a, full: 'Республикалық маңызы бар қалалар: Астана, Алматы, Шымкент.' };
    }
    var x = oneOf(REP_CITIES, OTHER_CITIES, r);
    return { kk: 'Қайсысы республикалық маңызы бар қала?', ru: 'Какой город — республиканского значения?', en: 'Which is a city of national significance?', visual: { type: 'big', e: '🏙️', text: '' },
      answer: x.a, options: x.opts, say: x.a, full: 'Республикалық маңызы бар қалалар: Астана, Алматы, Шымкент.' };
  };
  GEN.center = function (r) {
    // 7 of 17 regions share the centre's name and answer themselves: 3 tasks in 4 go to the other 10
    var hard = REGIONS.filter(function (x) { return x.indexOf(REGION_CENTER[x] + ' ') !== 0; }), pool = r() < 0.75 ? hard : REGIONS;
    var reg = pool[rint(r, 0, pool.length - 1)], ans = REGION_CENTER[reg];
    var others = shuffle(REGIONS.filter(function (x) { return x !== reg; }).map(function (x) { return REGION_CENTER[x]; }), r).slice(0, 2);
    return { kk: centerQuestion(reg), ru: 'Какой город — центр этой области?', en: 'Which city is the centre of this region?', visual: { type: 'big', e: '🗺️', text: reg },
      answer: ans, options: shuffle([ans].concat(others), r), say: ans, full: G.caseForm(reg, 'ilik') + ' орталығы — ' + ans + '.' };
  };
  GEN.neighbor = function (r) {
    if (r() < 0.45) {
      var y = oneOf(FAR, NEIGHBORS, r);
      return { kk: 'Қайсысы Қазақстанмен шекараласпайды?', ru: 'Какая страна НЕ граничит с Казахстаном?', en: 'Which country does NOT border Kazakhstan?', visual: { type: 'big', e: '🌍', text: '' },
        answer: y.a, options: y.opts, say: y.a, full: y.a + ' — алыс ел.' };
    }
    var x = oneOf(NEIGHBORS, FAR, r);
    return { kk: 'Қайсысы Қазақстанмен шекаралас?', ru: 'Какая страна граничит с Казахстаном?', en: 'Which country borders Kazakhstan?', visual: { type: 'big', e: '🇰🇿', text: '' },
      answer: x.a, options: x.opts, say: x.a, full: 'Қазақстанның көршілері: ' + NEIGHBORS.join(', ') + '.' };
  };

  /* ---------- day 6 debt: «Қазақстан картасы» — where is the city? (outline: web/kz-map.js, Natural Earth) ---------- */
  // approximate coordinates (lon, lat) of the regional centres and the cities of national significance; Қонаев is left
  // out of the map game: 30 km from Алматы, the two dots would sit on top of each other
  var CITY_LL = { 'Астана': [71.45, 51.17], 'Алматы': [76.95, 43.24], 'Шымкент': [69.6, 42.32], 'Семей': [80.23, 50.41], 'Көкшетау': [69.4, 53.28],
    'Ақтөбе': [57.21, 50.28], 'Атырау': [51.92, 47.1], 'Орал': [51.37, 51.23], 'Тараз': [71.37, 42.9], 'Талдықорған': [78.37, 45.02], 'Қарағанды': [73.1, 49.8],
    'Қостанай': [63.62, 53.21], 'Қызылорда': [65.51, 44.85], 'Ақтау': [51.2, 43.65], 'Павлодар': [76.95, 52.29], 'Петропавл': [69.15, 54.87],
    'Түркістан': [68.25, 43.3], 'Жезқазған': [67.71, 47.78], 'Өскемен': [82.61, 49.95] };
  var MAP_GAP = 90;   // candidate dots at least this far apart on the 600 × 340 map
  function cityXY(c) { var ll = CITY_LL[c]; return MAP ? MAP.project(ll[0], ll[1]) : [0, 0]; }
  /** Where the city is: «Қазақстанның оңтүстік-шығысында» (possessive + case from the engine). Thresholds on the map
   *  follow the usual regions (Батыс, Солтүстік, Орталық, Шығыс, Оңтүстік Қазақстан); Астана is named the capital instead. */
  function cityWhere(c) {
    if (c === 'Астана') return 'Астана — Қазақстанның елордасы.';
    var p = cityXY(c), ns = p[1] < 85 ? 'солтүстік' : p[1] > 225 ? 'оңтүстік' : '', ew = p[0] < 180 ? 'батыс' : p[0] > 420 ? 'шығыс' : '';
    return c + ' — Қазақстанның ' + G.possessiveCase(ns && ew ? ns + '-' + ew : ns || ew || 'орталық', 'ol', 'zhatys') + '.';
  }
  GEN.map = function (r) {
    var names = Object.keys(CITY_LL), a = names[rint(r, 0, names.length - 1)], pick = [a];
    var far = function (c) { return pick.every(function (p) { var A = cityXY(c), B = cityXY(p); return Math.hypot(A[0] - B[0], A[1] - B[1]) >= MAP_GAP; }); };
    shuffle(names.slice(), r).forEach(function (c) { if (pick.length < 3 && pick.indexOf(c) < 0 && far(c)) pick.push(c); });
    return { kk: a + ' қай жерде?', ru: 'Где этот город на карте?', en: 'Where is this city on the map?',
      visual: { type: 'map', dots: shuffle(pick.slice(), r).map(function (c) { var p = cityXY(c); return { id: c, x: +p[0].toFixed(1), y: +p[1].toFixed(1) }; }) },
      answer: a, options: pick.slice().sort(), optType: 'map', say: a, full: cityWhere(a) };
  };

  /* ---------- 21.11: «Көлдер мен теңіздер» — the big water bodies on the map (Natural Earth outlines in kz-map.js) ----------
   * Sides of the country by hand (sources in methodology/plan-10-days.md); the forms come from the engine like cityWhere. */
  var SEAS = [{ id: 'Каспий теңізі', side: 'батыс' }, { id: 'Арал теңізі', side: 'оңтүстік-батыс' }, { id: 'Балқаш көлі', side: 'оңтүстік-шығыс' },
    { id: 'Зайсан көлі', side: 'шығыс' }, { id: 'Алакөл', side: 'оңтүстік-шығыс' }, { id: 'Теңіз көлі', side: 'орталық' }];
  var SIDES = ['батыс', 'шығыс', 'орталық', 'оңтүстік-батыс', 'оңтүстік-шығыс', 'солтүстік'];
  function sideForm(side) { return G.possessiveCase(side, 'ol', 'zhatys'); }
  function waterWhere(id) { var w = SEAS.filter(function (x) { return x.id === id; })[0]; return id + ' — Қазақстанның ' + sideForm(w.side) + '.'; }
  function waterWhereQ(id) { return id + ' Қазақстанның қай жағында?'; }
  GEN.seas = function (r) {
    var w = SEAS[rint(r, 0, SEAS.length - 1)];
    if (r() < 0.5) {
      var others = shuffle(SEAS.filter(function (x) { return x.id !== w.id; }), r).slice(0, 2).map(function (x) { return x.id; });
      return { kk: 'Белгіленген су айдыны қалай аталады?', ru: 'Как называется отмеченный водоём?', en: 'What is the marked body of water called?',
        visual: { type: 'water', mark: w.id }, answer: w.id, options: shuffle([w.id].concat(others), r), say: w.id, full: waterWhere(w.id) };
    }
    var wrong = shuffle(SIDES.filter(function (x) { return x !== w.side; }), r).slice(0, 2);
    return { kk: waterWhereQ(w.id), ru: 'В какой части Казахстана?', en: 'In which part of Kazakhstan is it?', visual: { type: 'water', mark: null },
      answer: sideForm(w.side), options: shuffle([w.side].concat(wrong), r).map(sideForm), say: sideForm(w.side), full: waterWhere(w.id) };
  };

  /* ---------- day 7: cities and landmarks (reference tables by hand; sources in methodology/plan-10-days.md) ---------- */
  var LANDMARK = { 'Бәйтерек': 'Астана', 'Хан Шатыр': 'Астана', 'Ақорда': 'Астана', 'Медеу': 'Алматы', 'Көктөбе': 'Алматы', 'Шымбұлақ': 'Алматы',
    'Қожа Ахмет Ясауи кесенесі': 'Түркістан', 'Абай мұражайы': 'Семей' };
  var NEAR = { 'Айша бибі кесенесі': 'Тараз', 'Үлкен Алматы көлі': 'Алматы' };   // outside the city itself: «қай қаланың маңында?»
  var LANDMARK_E = { 'Бәйтерек': '🗼', 'Хан Шатыр': '⛺', 'Ақорда': '🏛️', 'Медеу': '⛸️', 'Көктөбе': '🚡', 'Шымбұлақ': '🎿', 'Қожа Ахмет Ясауи кесенесі': '🕌',
    'Абай мұражайы': '📖', 'Айша бибі кесенесі': '🕌', 'Үлкен Алматы көлі': '🏞️' };
  var CITY_RIVER = { 'Семей': 'Ертіс', 'Павлодар': 'Ертіс', 'Өскемен': 'Ертіс', 'Орал': 'Жайық', 'Атырау': 'Жайық', 'Астана': 'Есіл', 'Петропавл': 'Есіл',
    'Қызылорда': 'Сырдария', 'Қостанай': 'Тобыл' };
  var RIVERS = ['Ертіс', 'Жайық', 'Есіл', 'Сырдария', 'Тобыл', 'Іле'];
  // Қонаев is left out: the spelling of its endings (Қонаевқа / Қонаевке) is not settled for a children's game
  var GUIDE_CITIES = REP_CITIES.concat(REGIONS.map(function (x) { return REGION_CENTER[x]; })).filter(function (c, i, a) { return c !== 'Қонаев' && a.indexOf(c) === i; });
  /** [locative, dative, ablative] from the engine: Алматыда, Алматыға, Алматыдан */
  function guideForms(c) { return [G.caseForm(c, 'zhatys'), G.caseForm(c, 'barys'), G.caseForm(c, 'shygys')]; }
  GEN.landmark = function (r) {
    var names = Object.keys(LANDMARK), cities = Object.keys(NEAR).map(function (x) { return NEAR[x]; }).concat(names.map(function (x) { return LANDMARK[x]; })).filter(function (c, i, a) { return a.indexOf(c) === i; });
    var roll = r();
    if (roll < 0.3) {   // «Қайсысы Астанада?» — one landmark of the city among others
      var city = ['Астана', 'Алматы'][rint(r, 0, 1)], mine = names.filter(function (x) { return LANDMARK[x] === city; }), other = names.filter(function (x) { return LANDMARK[x] !== city; });
      var a = mine[rint(r, 0, mine.length - 1)], loc = guideForms(city)[0];
      return { kk: 'Қайсысы ' + loc + '?', ru: 'Что из этого находится в городе ' + city + '?', en: 'Which one is in ' + city + '?', visual: { type: 'big', e: '🏙️', text: city },
        answer: a, options: shuffle([a].concat(shuffle(other, r).slice(0, 2)), r), say: a, full: a + ' ' + loc + '.' };
    }
    var near = roll < 0.45, list = near ? Object.keys(NEAR) : names, n = list[rint(r, 0, list.length - 1)], ans = near ? NEAR[n] : LANDMARK[n];
    var opts = shuffle([ans].concat(shuffle(cities.filter(function (c) { return c !== ans; }), r).slice(0, 2)), r);
    return { kk: n + (near ? ' қай қаланың маңында?' : ' қай қалада?'), ru: near ? 'Возле какого города?' : 'В каком городе?', en: near ? 'Near which city?' : 'In which city?',
      visual: { type: 'big', e: LANDMARK_E[n], text: n }, answer: ans, options: opts, say: ans, full: n + ' — ' + (near ? G.caseForm(ans, 'ilik') + ' маңында' : guideForms(ans)[0]) + '.' };
  };
  GEN.river = function (r) {
    var cities = Object.keys(CITY_RIVER), roll = r();
    if (roll < 0.12) {
      var o = shuffle(['Қарағанды', 'Тараз', 'Астана', 'Павлодар', 'Қостанай'], r).slice(0, 2);
      return { kk: 'Қай қала Каспий теңізінің жағасында тұр?', ru: 'Какой город стоит на берегу Каспийского моря?', en: 'Which city is on the Caspian Sea?', visual: { type: 'big', e: '🌊', text: 'Каспий' },
        answer: 'Ақтау', options: shuffle(['Ақтау'].concat(o), r), say: 'Ақтау', full: 'Ақтау Каспий теңізінің жағасында тұр.' };
    }
    if (roll < 0.45) {   // «Қай қала Ертіс өзенінің бойында тұр?»
      var rv = ['Ертіс', 'Жайық', 'Есіл'][rint(r, 0, 2)], on = cities.filter(function (c) { return CITY_RIVER[c] === rv; }), off = cities.filter(function (c) { return CITY_RIVER[c] !== rv; });
      var a = on[rint(r, 0, on.length - 1)];
      return { kk: 'Қай қала ' + rv + ' өзенінің бойында тұр?', ru: 'Какой город стоит на реке ' + rv + '?', en: 'Which city stands on the ' + rv + '?', visual: { type: 'big', e: '🏞️', text: rv },
        answer: a, options: shuffle([a].concat(shuffle(off, r).slice(0, 2)), r), say: a, full: a + ' ' + rv + ' өзенінің бойында тұр.' };
    }
    var c = cities[rint(r, 0, cities.length - 1)], ans = CITY_RIVER[c];
    return { kk: c + ' қай өзеннің бойында тұр?', ru: 'На какой реке стоит город?', en: 'Which river is the city on?', visual: { type: 'big', e: '🏙️', text: c },
      answer: ans, options: shuffle([ans].concat(shuffle(RIVERS.filter(function (x) { return x !== ans; }), r).slice(0, 2)), r), say: ans, full: c + ' ' + ans + ' өзенінің бойында тұр.' };
  };
  /* «Саяхат» (day 7 debt): the foreign architect (voice tag ARCH — a Freedom Speech catalog voice) wants to see a place;
     the child says where the train goes: «Мен Бәйтеректі көргім келеді. Қай қалаға барамыз?» — «Астанаға». */
  var TOUR = {}; Object.keys(LANDMARK).forEach(function (n) { TOUR[n] = LANDMARK[n]; }); Object.keys(NEAR).forEach(function (n) { TOUR[n] = NEAR[n]; });
  TOUR['Каспий теңізі'] = 'Ақтау';
  var POSS_STEM = { 'кесенесі': 'кесене', 'мұражайы': 'мұражай', 'көлі': 'көл', 'теңізі': 'теңіз' };
  /** Accusative of a place name from the engine; a possessive compound takes the pronominal «н»: Ясауи кесенесін. */
  function accusative(n) {
    var parts = n.split(' '), lastW = parts[parts.length - 1];
    if (POSS_STEM[lastW]) return parts.slice(0, -1).concat(G.possessiveCase(POSS_STEM[lastW], 'ol', 'tabys')).join(' ');
    return G.caseForm(n, 'tabys');
  }
  function tourLine(n) { return 'Мен ' + accusative(n) + ' көргім келеді. Қай қалаға барамыз?'; }
  GEN.tour = function (r) {
    var names = Object.keys(TOUR), n = names[rint(r, 0, names.length - 1)], city = TOUR[n];
    var cities = names.map(function (x) { return TOUR[x]; }).filter(function (c, i, a) { return a.indexOf(c) === i && c !== city; });
    var opts = [city].concat(shuffle(cities, r).slice(0, 2)).map(function (c) { return guideForms(c)[1]; });
    return { kk: tourLine(n), ru: 'Турист хочет увидеть это место. В какой город едем?', en: 'The tourist wants to see this place. Which city do we go to?', who: 'ARCH',
      visual: { type: 'big', e: '🚆 ' + (LANDMARK_E[n] || '🌊'), text: n }, answer: guideForms(city)[1], options: shuffle(opts, r), say: guideForms(city)[1],
      full: n + ' — ' + guideForms(city)[0] + '. Пойызбен ' + guideForms(city)[1] + ' барамыз!' };
  };
  /** 3D «Қазақстан саяхаты»: where the place is — «Бәйтерек — Астанада.»; near a city — «Айша бибі кесенесі — Тараздың маңында.» */
  function travelPlace(n) { var c = TOUR[n]; return n + ' — ' + (NEAR[n] || n === 'Каспий теңізі' ? G.caseForm(c, 'ilik') + ' маңында' : guideForms(c)[0]) + '.'; }
  var GUIDE_Q = { zhatys: ['Турист қазір қайда?', 'Где сейчас турист?', 'Where is the tourist now?', '📍'], barys: ['Турист қайда барады?', 'Куда едет турист?', 'Where is the tourist going?', '✈️'],
    shygys: ['Турист қайдан келді?', 'Откуда приехал турист?', 'Where did the tourist come from?', '🚆'] };
  GEN.guide = function (r) {
    var c = GUIDE_CITIES[rint(r, 0, GUIDE_CITIES.length - 1)], kase = ['zhatys', 'barys', 'shygys'][rint(r, 0, 2)], f = guideForms(c), q = GUIDE_Q[kase];
    var a = f[{ zhatys: 0, barys: 1, shygys: 2 }[kase]];
    return { kk: q[0], ru: q[1], en: q[2], visual: { type: 'big', e: q[3], text: kase === 'barys' ? '→ ' + c : kase === 'shygys' ? c + ' →' : c, city: c, kase: kase },
      answer: a, options: shuffle(f.slice(), r), say: a, full: 'Турист ' + a + (kase === 'zhatys' ? '.' : kase === 'barys' ? ' барады.' : ' келді.') };
  };

  /* ---------- day 8: history, grade 5 (only settled facts; sources in methodology/plan-10-days.md, teacher to check) ---------- */
  // a: the answer, d: distractors (real people / places / dates, but not the answer), e: picture; say: voice the answer (years and dates are shown, not voiced)
  var HISTORY_KZ = [
    { kk: 'Қазақ хандығын кімдер құрды?', ru: 'Кто основал Казахское ханство?', en: 'Who founded the Kazakh Khanate?', a: 'Керей мен Жәнібек', d: ['Абылай хан', 'Кенесары хан'], e: '🏇' },
    { kk: '«Қара сөздердің» авторы кім?', ru: 'Кто автор «Слов назидания»?', en: 'Who wrote the «Book of Words»?', a: 'Абай Құнанбайұлы', d: ['Ыбырай Алтынсарин', 'Әл-Фараби'], e: '✍️' },
    { kk: '«Екінші ұстаз» деп кімді атайды?', ru: 'Кого называют «Вторым учителем»?', en: 'Who is called «the Second Teacher»?', a: 'Әл-Фараби', d: ['Абай Құнанбайұлы', 'Қожа Ахмет Ясауи'], e: '📜' },
    { kk: 'Қазақ балаларына мектеп ашқан ағартушы кім?', ru: 'Какой просветитель открыл школу для казахских детей?', en: 'Which educator opened a school for Kazakh children?', a: 'Ыбырай Алтынсарин', d: ['Абай Құнанбайұлы', 'Әл-Фараби'], e: '🏫' },
    { kk: 'Түркістандағы кесене кімнің құрметіне салынған?', ru: 'В честь кого построен мавзолей в Туркестане?', en: 'Whom is the mausoleum in Turkistan built for?', a: 'Қожа Ахмет Ясауи', d: ['Әл-Фараби', 'Абай Құнанбайұлы'], e: '🕌' },
    { kk: 'Әл-Фараби қай қаладан шыққан?', ru: 'Из какого города аль-Фараби?', en: 'Which city was al-Farabi from?', a: 'Отырар', d: ['Тараз', 'Түркістан'], e: '🏺' },
    { kk: 'Алтын адам қай дәуірге жатады?', ru: 'К какой эпохе относится Золотой человек?', en: 'Which era does the Golden Man belong to?', a: 'Сақтар дәуірі', d: ['Қазақ хандығы', 'Тәуелсіздік жылдары'], e: '👑' },
    { kk: 'Алтын адам қай жерден табылды?', ru: 'Где нашли Золотого человека?', en: 'Where was the Golden Man found?', a: 'Есік қорғанынан', d: ['Отырардан', 'Тараздан'], e: '⛏️' },
    { kk: 'Қазақстан қай жылы тәуелсіздік алды?', ru: 'В каком году Казахстан стал независимым?', en: 'In which year did Kazakhstan become independent?', a: '1991', d: ['1995', '1465'], e: '🇰🇿', noSay: true },
    { kk: 'Тәуелсіздік күні қай күні?', ru: 'Когда День Независимости?', en: 'When is Independence Day?', a: '16 желтоқсан', d: ['30 тамыз', '22 наурыз'], e: '🎆', noSay: true },
    { kk: 'Қазақстан Конституциясы қай жылы қабылданды?', ru: 'В каком году принята Конституция Казахстана?', en: 'In which year was the Constitution adopted?', a: '1995', d: ['1991', '1997'], e: '📘', noSay: true },
    { kk: 'Қазақ хандығы қай ғасырда құрылды?', ru: 'В каком веке основано Казахское ханство?', en: 'In which century was the Kazakh Khanate founded?', a: 'XV ғасырда', d: ['XVIII ғасырда', 'X ғасырда'], e: '⏳', noSay: true }
  ];
  var HISTORY_WORLD = [
    { kk: 'Пирамидалар қай елде?', ru: 'В какой стране пирамиды?', en: 'Which country has the pyramids?', a: 'Мысыр', d: ['Грекия', 'Қытай'], e: '🔺' },
    { kk: 'Олимпиада ойындары қай елде басталды?', ru: 'Где начались Олимпийские игры?', en: 'Where did the Olympic Games begin?', a: 'Грекия', d: ['Мысыр', 'Рим'], e: '🏅' },
    { kk: 'Ұлы қорған қай елде?', ru: 'В какой стране Великая стена?', en: 'Which country has the Great Wall?', a: 'Қытай', d: ['Мысыр', 'Грекия'], e: '🧱' },
    { kk: 'Колизей қай қалада?', ru: 'В каком городе Колизей?', en: 'Which city has the Colosseum?', a: 'Рим', d: ['Афина', 'Каир'], e: '🏟️' },
    { kk: '1492 жылы Америкаға кім жетті?', ru: 'Кто в 1492 году доплыл до Америки?', en: 'Who reached America in 1492?', a: 'Колумб', d: ['Магеллан', 'Марко Поло'], e: '⛵' },
    { kk: 'Мысырда не бар?', ru: 'Что есть в Египте?', en: 'What is in Egypt?', a: 'Пирамидалар', d: ['Колизей', 'Ұлы Қытай қорғаны'], e: '🏜️' },
    { kk: 'Қытайда не бар?', ru: 'Что есть в Китае?', en: 'What is in China?', a: 'Ұлы Қытай қорғаны', d: ['Пирамидалар', 'Колизей'], e: '🐉' },
    { kk: 'Римде не бар?', ru: 'Что есть в Риме?', en: 'What is in Rome?', a: 'Колизей', d: ['Пирамидалар', 'Ұлы Қытай қорғаны'], e: '🏛️' },
    { kk: 'Ежелгі Грекияда не басталды?', ru: 'Что началось в Древней Греции?', en: 'What began in Ancient Greece?', a: 'Олимпиада ойындары', d: ['Ұлы Жібек жолы', 'Пирамидалар'], e: '🔥' },
    { kk: 'Ұлы Жібек жолы нені байланыстырды?', ru: 'Что связал Великий шёлковый путь?', en: 'What did the Great Silk Road connect?', a: 'Қытай мен Еуропаны', d: ['Америка мен Африканы', 'Австралия мен Жапонияны'], e: '🐫' }
  ];
  // approximate commonly accepted years (BC < 0); questions only compare events ≥ 300 years apart, so disputed datings never decide
  var EVENTS = [
    { kk: 'Мысыр пирамидалары салынды', y: -2600, e: '🔺' }, { kk: 'Алғашқы Олимпиада ойындары өтті', y: -776, e: '🏅' },
    { kk: 'Сақтар дәуірі: Алтын адам', y: -400, e: '👑' }, { kk: 'Ұлы Жібек жолы ашылды', y: -130, e: '🐫' },
    { kk: 'Әл-Фараби өмір сүрді', y: 900, e: '📜' }, { kk: 'Қожа Ахмет Ясауи кесенесі салынды', y: 1390, e: '🕌' },
    { kk: 'Қазақ хандығы құрылды', y: 1465, e: '🏇' }, { kk: 'Колумб Америкаға жетті', y: 1492, e: '⛵' },
    { kk: 'Абай дүниеге келді', y: 1845, e: '✍️' }, { kk: 'Қазақстан тәуелсіздік алды', y: 1991, e: '🇰🇿' }
  ];
  function factQ(list, r) {
    var f = list[rint(r, 0, list.length - 1)];
    return { kk: f.kk, ru: f.ru, en: f.en, visual: { type: 'big', e: f.e, text: '' }, answer: f.a, options: shuffle([f.a].concat(f.d), r), say: f.noSay ? '' : f.a, full: f.kk + ' — ' + f.a + '.' };
  }
  GEN.histkz = function (r) { return factQ(HISTORY_KZ, r); };
  GEN.histworld = function (r) { return factQ(HISTORY_WORLD, r); };
  GEN.timeline = function (r) {
    for (var g = 0; g < 200; g++) {
      var pick = shuffle(EVENTS.slice(), r).slice(0, 3), ys = pick.map(function (e) { return e.y; }).sort(function (a, b) { return a - b; });
      if (ys[1] - ys[0] < 300 || ys[2] - ys[1] < 300) continue;
      var first = pick.reduce(function (a, b) { return b.y < a.y ? b : a; });
      return { kk: 'Қайсысы бұрын болды?', ru: 'Что было раньше всех?', en: 'Which happened first?', visual: { type: 'big', e: '⏳', text: '', set: ys.join(',') },   // the set of events makes the task unique in a round
        answer: first.kk, options: pick.map(function (e) { return e.kk; }), say: first.kk, full: first.kk + ' — ең ертедегі оқиға.' };
    }
    return null;
  };

  /* ---------- day 9: reading, music and art (titles and authors only — no verses quoted; sources in plan-10-days.md) ---------- */
  var A3 = ['Абай Құнанбайұлы', 'Ыбырай Алтынсарин', 'Ахмет Байтұрсынұлы'];
  function byAuthor(kk, ru, en, a, e) { return { kk: kk, ru: ru, en: en, a: a, d: A3.filter(function (x) { return x !== a; }), e: e }; }
  var LIT_AUTHORS = [
    byAuthor('«Қара сөздерді» кім жазған?', 'Кто написал «Слова назидания»?', 'Who wrote the «Book of Words»?', A3[0], '📜'),
    byAuthor('«Қыс» өлеңін кім жазған?', 'Кто написал стихотворение «Зима»?', 'Who wrote the poem «Winter»?', A3[0], '❄️'),
    byAuthor('«Жаз» өлеңін кім жазған?', 'Кто написал стихотворение «Лето»?', 'Who wrote the poem «Summer»?', A3[0], '☀️'),
    byAuthor('«Ғылым таппай мақтанба» өлеңін кім жазған?', 'Кто написал «Не хвались, не найдя знаний»?', 'Who wrote «Do not boast without knowledge»?', A3[0], '🎓'),
    byAuthor('«Кел, балалар, оқылық» өлеңін кім жазған?', 'Кто написал «Давайте, дети, учиться»?', 'Who wrote «Come, children, let us learn»?', A3[1], '📚'),
    byAuthor('«Өнер-білім бар жұрттар» өлеңін кім жазған?', 'Кто написал «Народы, у которых есть знания»?', 'Who wrote «Nations with knowledge and skill»?', A3[1], '🔭'),
    byAuthor('«Бай мен жарлының балалары» әңгімесін кім жазған?', 'Кто написал рассказ «Дети богача и бедняка»?', 'Who wrote «The children of the rich man and the poor man»?', A3[1], '👦'),
    byAuthor('«Қыпшақ Сейітқұл» әңгімесін кім жазған?', 'Кто написал рассказ «Кипчак Сейиткул»?', 'Who wrote the story «Kipchak Seitkul»?', A3[1], '🌾'),
    byAuthor('«Маса» кітабын кім жазған?', 'Кто написал книгу «Комар»?', 'Who wrote the book «The Mosquito»?', A3[2], '🦟'),
    byAuthor('«Қырық мысал» кітабын кім жазған?', 'Кто написал книгу «Сорок басен»?', 'Who wrote «Forty Fables»?', A3[2], '🦊')
  ];
  var LIT_MUSIC = [
    { kk: 'Домбыраның неше ішегі бар?', ru: 'Сколько струн у домбры?', en: 'How many strings does a dombra have?', a: 'екі', d: ['үш', 'төрт'], e: '🎸' },
    { kk: 'Жетігеннің неше ішегі бар?', ru: 'Сколько струн у жетигена?', en: 'How many strings does a zhetigen have?', a: 'жеті', d: ['екі', 'бес'], e: '🎼' },
    { kk: 'Аңыз бойынша қобызды кім жасаған?', ru: 'Кто, по легенде, сделал кобыз?', en: 'Who made the kobyz, as the legend says?', a: 'Қорқыт ата', d: ['Құрманғазы', 'Абай Құнанбайұлы'], e: '🎻' },
    { kk: '«Сарыарқа» күйін кім шығарған?', ru: 'Кто сочинил кюй «Сарыарка»?', en: 'Who composed the kuy «Saryarka»?', a: 'Құрманғазы', d: ['Абай Құнанбайұлы', 'Ыбырай Алтынсарин'], e: '🎶' },
    { kk: '«Адай» күйінің авторы кім?', ru: 'Кто автор кюя «Адай»?', en: 'Who wrote the kuy «Adai»?', a: 'Құрманғазы', d: ['Қорқыт ата', 'Ахмет Байтұрсынұлы'], e: '🐎' },
    { kk: 'Күй деген не?', ru: 'Что такое кюй?', en: 'What is a kuy?', a: 'аспапта орындалатын шығарма', d: ['ертегі', 'мақал-мәтел'], e: '🎵' },
    { kk: 'Қошқар мүйіз деген не?', ru: 'Что такое «кошкар муйиз»?', en: 'What is «koshkar muiz»?', a: 'Ою-өрнек', d: ['Күй', 'Ертегі'], e: '🐏' },
    { kk: 'Қайсысы — ішекті аспап?', ru: 'Какой инструмент струнный?', en: 'Which instrument has strings?', a: 'Домбыра', d: ['Сыбызғы', 'Дауылпаз'], e: '🎼' },
    { kk: 'Қайсысы — үрмелі аспап?', ru: 'Какой инструмент духовой?', en: 'Which is a wind instrument?', a: 'Сыбызғы', d: ['Домбыра', 'Дауылпаз'], e: '🎼' },
    { kk: 'Қайсысы — ұрмалы аспап?', ru: 'Какой инструмент ударный?', en: 'Which is a percussion instrument?', a: 'Дауылпаз', d: ['Домбыра', 'Сыбызғы'], e: '🎼' }   // a neutral picture: 🥁 / 🌬️ / 🎸 would give the answer away
  ];
  // genre samples: folk proverbs, own riddles, the folk opening formula of a tale
  var GENRES = [
    { text: 'Отан — оттан да ыстық.', a: 'мақал-мәтел' }, { text: 'Бірлік бар жерде тірлік бар.', a: 'мақал-мәтел' },
    { text: 'Білекті бірді жығар, білімді мыңды жығар.', a: 'мақал-мәтел' }, { text: 'Ел іші — алтын бесік.', a: 'мақал-мәтел' },
    { text: 'Оқу — инемен құдық қазғандай.', a: 'мақал-мәтел' },
    { text: 'Қанаты бар, құс емес, көкте ұшады. Бұл не?', a: 'жұмбақ' }, { text: 'Аяғы жоқ, жүгіреді, суы мөлдір. Бұл не?', a: 'жұмбақ' },
    { text: 'Түнде жанады, күндіз сөнеді, көкте тұрады. Бұл не?', a: 'жұмбақ' }, { text: 'Бетін ашсаң, сөйлейді, тілі жоқ. Бұл не?', a: 'жұмбақ' },
    { text: 'Ерте, ерте, ертеде бір кемпір мен шал өмір сүріпті.', a: 'ертегі' }, { text: 'Ерте, ерте, ертеде ақылды бір бала болыпты.', a: 'ертегі' },
    { text: 'Ерте, ерте, ертеде бір түлкі орманда тұрыпты.', a: 'ертегі' }
  ];
  GEN.genre = function (r) {
    var g = GENRES[rint(r, 0, GENRES.length - 1)];
    return { kk: 'Бұл қай жанр?', ru: 'Какой это жанр?', en: 'Which genre is it?', visual: { type: 'big', e: '📖', text: g.text },
      answer: g.a, options: shuffle(['мақал-мәтел', 'жұмбақ', 'ертегі'], r), say: g.a, full: 'Бұл — ' + g.a + '.' };
  };
  GEN.authors = function (r) { return factQ(LIT_AUTHORS, r); };
  GEN.music = function (r) { return factQ(LIT_MUSIC, r); };

  /* ---------- 20.11: new topics (clock, health, safety, city → region, Ata's stories, legends) ---------- */
  // «Сағат неше?» — whole and half hours on a drawn clock; the words come from the engine (D.timeKk)
  GEN.clock = function (r) {
    var h = rint(r, 1, 12), m = r() < 0.5 ? 0 : 30, ans = D.timeKk(h, m);
    var alt = [D.timeKk(h, 30 - m), D.timeKk(h % 12 + 1, m), D.timeKk((h + 10) % 12 + 1, m)].filter(function (x) { return x !== ans; });
    return { kk: 'Сағат неше?', ru: 'Который час?', en: 'What time is it?', visual: { type: 'clock', h: h, m: m },
      answer: ans, options: shuffle([ans].concat(shuffle(alt, r).slice(0, 2)), r), say: ans, full: ans + '.' };
  };
  function quizList(list) { return function (r) { var f = list[rint(r, 0, list.length - 1)];
    return { kk: f.kk, ru: f.ru, en: f.en, visual: { type: 'big', e: f.e, text: '' }, answer: f.a, options: shuffle([f.a].concat(f.d), r), say: f.noSay ? '' : f.a, full: f.full || (f.kk + ' — ' + f.a + '.') }; }; }
  // health and safety: everyday rules a grade-2 child is taught (own wording; emergency numbers of Kazakhstan)
  var HEALTH = [
    { kk: 'Тісті күніне неше рет тазалау керек?', ru: 'Сколько раз в день чистить зубы?', en: 'How many times a day do we brush our teeth?', a: 'екі рет', d: ['ешқашан', 'он рет'], e: '🪥' },
    { kk: 'Тісті немен тазалаймыз?', ru: 'Чем чистим зубы?', en: 'What do we brush our teeth with?', a: 'тіс щеткасымен', d: ['қасықпен', 'қаламмен'], e: '🦷' },
    { kk: 'Тамақ алдында не істейміз?', ru: 'Что делаем перед едой?', en: 'What do we do before eating?', a: 'қолды жуамыз', d: ['ұйықтаймыз', 'жүгіреміз'], e: '🧼' },
    { kk: 'Қай тағам пайдалы?', ru: 'Какая еда полезная?', en: 'Which food is healthy?', a: 'алма', d: ['кәмпит', 'чипсы'], e: '🍽️' },
    { kk: 'Күн сайын не ішкен пайдалы?', ru: 'Что полезно пить каждый день?', en: 'What is good to drink every day?', a: 'таза су', d: ['тәтті газды су', 'қою кофе'], e: '🥤' },
    { kk: 'Таңертең не істейміз?', ru: 'Что делаем утром?', en: 'What do we do in the morning?', a: 'жаттығу жасаймыз', d: ['түні бойы ойнаймыз', 'тәтті жейміз'], e: '🌅' },
    { kk: 'Ауырып қалсақ, кімге барамыз?', ru: 'К кому идём, если заболели?', en: 'Who do we go to when we are ill?', a: 'дәрігерге', d: ['шаштаразға', 'дүкенге'], e: '🤒' },
    { kk: 'Көзге не зиян?', ru: 'Что вредно для глаз?', en: 'What is bad for the eyes?', a: 'телефонға ұзақ қарау', d: ['серуендеу', 'ұйықтау'], e: '👀' },
    { kk: 'Денсаулық үшін не керек?', ru: 'Что нужно для здоровья?', en: 'What do we need to stay healthy?', a: 'спорт', d: ['көп тәтті', 'ұйқысыз түн'], e: '⚽' },
    { kk: 'Көшеден келгенде не істейміз?', ru: 'Что делаем, придя с улицы?', en: 'What do we do when we come in from outside?', a: 'қолды жуамыз', d: ['бірден тамақ жейміз', 'төсекке жатамыз'], e: '🚿' }
  ];
  var SAFETY = [
    { kk: 'Қызыл шам жанса, не істейміз?', ru: 'Горит красный — что делаем?', en: 'The light is red — what do we do?', a: 'тоқтаймыз', d: ['жүреміз', 'жүгіреміз'], e: '🔴' },
    { kk: 'Жасыл шам жанса, не істейміз?', ru: 'Горит зелёный — что делаем?', en: 'The light is green — what do we do?', a: 'жүреміз', d: ['тоқтаймыз', 'отырамыз'], e: '🟢' },
    { kk: 'Көшені қай жерден кесіп өтеміз?', ru: 'Где переходим улицу?', en: 'Where do we cross the street?', a: 'жаяу жүргінші өткелінен', d: ['кез келген жерден', 'көліктің артынан'], e: '🚸' },
    { kk: 'Өрт болса, қай нөмірге қоңырау шаламыз?', ru: 'Пожар — какой номер?', en: 'A fire — which number?', a: '101', d: ['102', '103'], e: '🔥', noSay: true },
    { kk: 'Полицияның нөмірі қандай?', ru: 'Номер полиции?', en: 'The police number?', a: '102', d: ['101', '103'], e: '👮', noSay: true },
    { kk: 'Жедел жәрдемнің нөмірі қандай?', ru: 'Номер скорой помощи?', en: 'The ambulance number?', a: '103', d: ['101', '102'], e: '🚑', noSay: true },
    { kk: 'Бөтен адам шақырса, не істейміз?', ru: 'Зовёт незнакомец — что делаем?', en: 'A stranger calls you — what do you do?', a: 'бармаймыз', d: ['барамыз', 'соңынан ереміз'], e: '🙅' },
    { kk: 'Розеткаға саусақ салуға бола ма?', ru: 'Можно ли совать пальцы в розетку?', en: 'May we put a finger into a socket?', a: 'жоқ, болмайды', d: ['иә, болады', 'кейде болады'], e: '🔌' },
    { kk: 'Велосипед тепкенде не киеміз?', ru: 'Что надеваем на велосипед?', en: 'What do we wear on a bike?', a: 'дулыға', d: ['шляпа', 'орамал'], e: '🚲' },
    { kk: 'Мұз жұқа болса, не істейміз?', ru: 'Лёд тонкий — что делаем?', en: 'The ice is thin — what do we do?', a: 'мұзға шықпаймыз', d: ['сырғанаймыз', 'секіреміз'], e: '🧊' }
  ];
  GEN.health = quizList(HEALTH); GEN.safety = quizList(SAFETY);
  // «Қала қай облыстың орталығы?» — a card for each of the 17 regional centres
  function regionQuestion(c) { return c + ' — қай облыстың орталығы?'; }
  GEN.cityregion = function (r) {
    var reg = REGIONS[rint(r, 0, REGIONS.length - 1)], c = REGION_CENTER[reg];
    if (reg.indexOf(c + ' ') === 0 && r() < 0.7) { var hard = REGIONS.filter(function (x) { return x.indexOf(REGION_CENTER[x] + ' ') !== 0; }); reg = hard[rint(r, 0, hard.length - 1)]; c = REGION_CENTER[reg]; }
    var others = shuffle(REGIONS.filter(function (x) { return x !== reg; }), r).slice(0, 2);
    return { kk: regionQuestion(c), ru: 'Центром какой области является этот город?', en: 'Which region is this city the centre of?', visual: { type: 'big', e: '📍', text: c },
      answer: reg, options: shuffle([reg].concat(others), r), say: reg, full: c + ' — ' + G.caseForm(reg, 'ilik') + ' орталығы.' };
  };
  // «Атаның әңгімелері»: Ата tells (voice ATA), a pupil asks (ANEL / ALIBEK); facts only from the history table above
  var ATA_STORIES = [
    { id: 'khan', text: 'Ертеде Керей мен Жәнібек хандар қазақ елін біріктіріп, Қазақ хандығын құрды. Бұл он бесінші ғасырда болды.', e: '🏇',
      qs: [HISTORY_KZ[0], HISTORY_KZ[11]] },
    { id: 'silk', text: 'Ертеде керуендер Қытайдан Еуропаға жібек пен шай тасыды. Бұл жол Ұлы Жібек жолы деп аталды. Оның бойында Отырар, Тараз, Түркістан қалалары болды.', e: '🐫',
      qs: [HISTORY_WORLD[9], { kk: 'Қай қала Ұлы Жібек жолының бойында болған?', ru: 'Какой город стоял на Шёлковом пути?', en: 'Which city stood on the Silk Road?', a: 'Отырар', d: ['Ақтау', 'Петропавл'] }] },
    { id: 'gold', text: 'Есік қорғанынан алтын әшекейлі киім киген сақ жауынгері табылды. Оны Алтын адам деп атады. Ол сақтар дәуірінен қалған.', e: '👑',
      qs: [HISTORY_KZ[7], HISTORY_KZ[6]] },
    { id: 'indep', text: '1991 жылы Қазақстан тәуелсіз мемлекет болды. Тәуелсіздік күнін біз желтоқсанда тойлаймыз.', e: '🇰🇿',
      qs: [{ kk: 'Ата, Тәуелсіздік күні қай айда?', ru: 'В каком месяце День Независимости?', en: 'In which month is Independence Day?', a: 'желтоқсанда', d: ['наурызда', 'тамызда'] }, HISTORY_KZ[8]] },
    { id: 'farabi', text: 'Әл-Фараби Отырар қаласынан шыққан ұлы ғалым. Оны «Екінші ұстаз» деп атайды.', e: '📜',
      qs: [HISTORY_KZ[5], { kk: 'Әл-Фараби кім болған?', ru: 'Кем был аль-Фараби?', en: 'Who was al-Farabi?', a: 'ғалым', d: ['хан', 'күйші'] }] }
  ];
  // «Аңыздар»: two well-known legends in our own retelling (voice AZHE)
  var LEGENDS = [
    { id: 'aksak', text: 'Шыңғыс ханның ұлы Жошы аң аулап жүргенде, ақсақ құлан оны тебіп өлтірді. Хан: «Жаман хабар әкелгеннің аузына қорғасын құямын», — деген еді. Сонда күйші Кетбұға «Ақсақ құлан» күйін тартып, болған оқиғаны күймен жеткізді. Хан түсініп, қорғасынды домбыраға құйғызды.', e: '🎻',
      qs: [{ kk: 'Жаман хабарды ханға кім жеткізді?', ru: 'Кто сообщил хану плохую весть?', en: 'Who brought the bad news to the khan?', a: 'күйші Кетбұға', d: ['Жошы', 'Шыңғыс хан'] },
        { kk: 'Хабар немен жеткізілді?', ru: 'Чем была передана весть?', en: 'How was the news told?', a: 'күймен', d: ['хатпен', 'суретпен'] },
        { kk: 'Күйдің аты қалай?', ru: 'Как называется кюй?', en: 'What is the kuy called?', a: 'Ақсақ құлан', d: ['Сарыарқа', 'Адай'] },
        { kk: 'Қорғасынды неге құйды?', ru: 'Во что залили свинец?', en: 'What was the lead poured into?', a: 'домбыраға', d: ['күйшінің аузына', 'құдыққа'] }] },
    { id: 'korkyt', text: 'Қорқыт ата өлімнен қашып, қай жерге барса да өзіне қазылған көр көрді. Ол Сырдарияның үстіне кілем төсеп, қобыз тартты. Қобыз үні тұрғанда өлім оған жақындай алмады.', e: '🎶',
      qs: [{ kk: 'Қорқыт ата қай аспапта ойнады?', ru: 'На каком инструменте играл Коркыт?', en: 'Which instrument did Korkyt play?', a: 'қобызда', d: ['домбырада', 'сыбызғыда'] },
        { kk: 'Қорқыт ата кілемді қай өзеннің үстіне төседі?', ru: 'Над какой рекой Коркыт расстелил ковёр?', en: 'Over which river did Korkyt spread his carpet?', a: 'Сырдарияның', d: ['Ертістің', 'Жайықтың'] },
        { kk: 'Қобыз үні тұрғанда не болмады?', ru: 'Чего не случалось, пока звучал кобыз?', en: 'What could not happen while the kobyz played?', a: 'өлім жақындай алмады', d: ['жаңбыр жауды', 'хан келді'] }] }
  ];
  function storyGen(list, teller) { return function (r) {
    var s = list[rint(r, 0, list.length - 1)], k = rint(r, 0, s.qs.length - 1), f = s.qs[k], pupil = (k + s.id.length) % 2 ? 'ANEL' : 'ALIBEK';
    return { kk: f.kk, ru: f.ru, en: f.en, who: pupil, story: s.text, storyWho: teller, visual: { type: 'story', e: s.e, text: s.text },
      answer: f.a, options: shuffle([f.a].concat(f.d), r), say: f.noSay ? '' : f.a, full: f.kk + ' — ' + f.a + '.' };
  }; }
  GEN.atastory = storyGen(ATA_STORIES, 'ATA'); GEN.legend = storyGen(LEGENDS, 'AZHE');

  /* ---------- 20.11: heroes by situation — a host per subject, a pupil asks, the host explains the rule ---------- */
  var HOSTS = { math: { who: 'APAI', kk: 'Баян апай', e: '👩‍🏫', ask: 'Апай, бұл қалай шығады?' }, logic: { who: 'E4', kk: 'Әже-Bot 3000', hero: 'azhe', ask: 'Әже-Бот, көмектесші!' },
    nature: { who: 'T4', kk: 'Айсұлу', hero: 'aisulu', ask: 'Айсұлу, неге олай?' }, geo: { who: 'M1', kk: 'Батыр-X', hero: 'batyr', ask: 'Батыр, мұны қалай табамыз?' },
    cities: { who: 'ARCH', kk: 'Сәулетші', e: '🧑‍💼', ask: 'Қалай айтамыз, ағай?' }, history: { who: 'ATA', kk: 'Ата', e: '👴', ask: 'Ата, айтып беріңізші!' },
    lit: { who: 'AZHE', kk: 'Әже', e: '👵', ask: 'Айтып беріңізші, әже!', pupils: ['ALIBEK'] } };   // Әнел's voice swallows «Айтып» every time (ASR 0.68)
  var PUPILS = [{ who: 'ANEL', kk: 'Әнел', e: '👧' }, { who: 'ALIBEK', kk: 'Әлібек', e: '👦' }];
  // the rule of each topic, as the host says it (own wording)
  var TIPS = {
    m1count: 'Әр затты бір-бірден санаймыз: бір, екі, үш.', m1shapes: 'Шеңбердің бұрышы жоқ, үшбұрыштың үш бұрышы бар, шаршының төрт қабырғасы тең.',
    m1tens: 'Бір ондық — он бірлік. Алдымен ондықтарды, сосын бірліктерді санаймыз.', m1add20: 'Алдымен онға дейін толықтырамыз, сосын қалғанын қосамыз.',
    m1compare: 'Үлкен сан артық, кіші сан кем, бірдей болса — тең.', m2add100: 'Ондықтарды ондықтарға, бірліктерді бірліктерге қосамыз.',
    m2mul: 'Көбейту — бірдей сандарды бірнеше рет қосу.', m2money: 'Тиындарды қосамыз, ең үлкенінен бастаймыз.', m2clock: 'Қысқа тіл сағатты, ұзын тіл минутты көрсетеді.',
    m3mul69: 'Көбейткіштердің орнын ауыстырсақ, көбейтінді өзгермейді.', m3div: 'Бөлу — көбейтуге кері амал.', m3frac: 'Бөлшектің асты — неше тең бөлік, үсті — нешеуі алынды.',
    m4shop: 'Бағасын санына көбейтеміз, қалдықты табу үшін азайтамыз.',
    m4bazaar: 'Алдымен барлығы қанша тұратынын табамыз, сосын берген ақшадан азайтамыз.', m4place: 'Үш таңбалы санда жүздіктер, ондықтар және бірліктер бар.',
    l1pattern: 'Қайталанатын бөлікті тап та, ары қарай жалғастыр.', l1odd: 'Қайсысы басқа топқа жатады? Соны таңда.', l2algo: 'Нұсқарларды ретімен орында: әр қадам — бір шаршы.',
    l2yurt: 'Киіз үй ретімен тігіледі: алдымен кереге, соңында киіз.', l3sym: 'Айнадағыдай: сол жақ пен оң жақ бірдей болуы керек.',
    n1season: 'Желтоқсан, қаңтар, ақпан — қыс. Наурыз, сәуір, мамыр — көктем.', n1wild: 'Үй жануарлары адаммен бірге тұрады, жабайы аңдар табиғатта тұрады.',
    n2home: 'Әр жануар өзіне ыңғайлы жерде тұрады: балық — суда, барыс — тауда.', n2water: 'Су буланады, бұлт болады, сосын жаңбыр болып жауады.',
    n2senses: 'Көзбен көреміз, құлақпен естиміз, мұрынмен иіс сеземіз.', n2health: 'Таза қол, таза тіс және спорт — денсаулықтың кілті.',
    n2safety: 'Қызыл — тоқта, жасыл — жүр. Көшені өткелден ғана кесіп өт.', n3redbook: 'Сирек жануарлар Қызыл кітапқа енгізіледі, оларды қорғаймыз.',
    g2dirs: 'Картада жоғары — солтүстік, төмен — оңтүстік, оң жақ — шығыс, сол жақ — батыс.', g3feature: 'Өзен ағады, көлдің суы бір жерде тұрады, тау биік болады.',
    g3repcity: 'Республикалық маңызы бар қалалар: Астана, Алматы, Шымкент.', g4center: 'Әр облыстың орталығы бар: Абай облысының орталығы — Семей.',
    g4map: 'Картада жоғары — солтүстік. Алматы мен Шымкент оңтүстікте.', g4neighbor: 'Қазақстанның көршілері: Ресей, Қытай, Қырғызстан, Өзбекстан, Түрікменстан.',
    g4water: 'Каспий мен Арал — батыста, Балқаш пен Алакөл — оңтүстік-шығыста, Зайсан — шығыста.',
    c2landmark: 'Бәйтерек пен Ақорда — Астанада, Медеу мен Көктөбе — Алматыда.', c3river: 'Ертістің бойында — Семей, Павлодар, Өскемен. Жайықтың бойында — Орал мен Атырау.',
    c3guide: 'Қайда? — Алматыда. Қайда барады? — Алматыға. Қайдан? — Алматыдан.', c3region: 'Әр облыстың бір орталығы бар: Қарағанды облысының орталығы — Қарағанды.',
    c4tour: 'Қай қалаға? — деп сұрасақ: Астанаға, Алматыға, Түркістанға.',
    h5timeline: 'Ерте заманнан бүгінге қарай ретімен қой: пирамидалар — ең ертедегісі.', h5kz: 'Қазақ хандығын Керей мен Жәнібек құрды.',
    h5world: 'Пирамидалар — Мысырда, Колизей — Римде, Ұлы қорған — Қытайда.', h5ata: 'Әңгімені мұқият тыңда, сосын сұраққа жауап бер.',
    r2genre: 'Мақал — қысқа ақыл сөз. Жұмбақтың шешуі болады. Ертегі «Ерте, ерте, ертеде» деп басталады.', r3music: 'Домбыраның екі ішегі бар, күйді аспаппен орындайды.',
    r3legend: 'Аңызды мұқият тыңда: кім, не істеді, не болды?', r4authors: '«Қара сөздер» — Абайдікі, «Кел, балалар, оқылық» — Алтынсариндікі.'
  };
  function subjectOf(topic) { var out = null; SUBJECTS.forEach(function (s) { if (s.topics.indexOf(topic) >= 0) out = s; }); return out; }
  /** The two opening lines of a topic: a pupil asks the host, the host says the rule. */
  function intro(topic) {
    var s = subjectOf(topic); if (!s) return [];
    var h = HOSTS[s.id], ps = PUPILS.filter(function (x) { return !h.pupils || h.pupils.indexOf(x.who) >= 0; }), p = ps[s.topics.indexOf(topic) % ps.length];
    return [{ who: p.who, name: p.kk, e: p.e, kk: h.ask }, { who: h.who, name: h.kk, e: h.e, hero: h.hero, kk: TIPS[topic.id] }];
  }
  function hostOf(topic) { var s = subjectOf(topic); return s ? HOSTS[s.id] : null; }
  /** Every hero line with its voice tag (for tools/collect-phrases.js → Freedom Speech). */
  function heroLines() {
    var out = [];
    SUBJECTS.forEach(function (s) { PUPILS.forEach(function (p) { if (!HOSTS[s.id].pupils || HOSTS[s.id].pupils.indexOf(p.who) >= 0) out.push({ who: p.who, kk: HOSTS[s.id].ask }); }); s.topics.forEach(function (t) { out.push({ who: HOSTS[s.id].who, kk: TIPS[t.id] }); }); });
    ATA_STORIES.forEach(function (st) { out.push({ who: 'ATA', kk: st.text }); st.qs.forEach(function (q) { PUPILS.forEach(function (p) { out.push({ who: p.who, kk: q.kk }); }); }); });
    bazaarLines().forEach(function (x) { out.push(x); });
    LEGENDS.forEach(function (st) { out.push({ who: 'AZHE', kk: st.text }); st.qs.forEach(function (q) { PUPILS.forEach(function (p) { out.push({ who: p.who, kk: q.kk }); }); }); });
    return out;
  }

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
      { id: 'm2clock', grade: 2, gen: 'clock', kk: 'Сағат неше?', ru: 'Который час?', en: 'What time is it?' },
      { id: 'm2money', grade: 2, gen: 'money', kk: 'Ақша: теңге', ru: 'Деньги: тенге', en: 'Money: tenge' },
      { id: 'm3mul69', grade: 3, gen: 'mul69', kk: 'Көбейту кестесі (6–9)', ru: 'Таблица умножения (6–9)', en: 'Times tables (6–9)' },
      { id: 'm3div', grade: 3, gen: 'div', kk: 'Бөлу', ru: 'Деление', en: 'Division' },
      { id: 'm3frac', grade: 3, gen: 'frac', kk: 'Бөлшектер', ru: 'Доли и дроби', en: 'Fractions' },
      { id: 'm4shop', grade: 4, gen: 'shop', kk: 'Базарда: есептер', ru: 'Задачи: покупки и сдача', en: 'Word problems: shopping' },
      { id: 'm4bazaar', grade: 4, gen: 'bazaar', kk: 'Базарда: сұхбат', ru: 'На базаре: диалог', en: 'At the bazaar: a dialogue' },
      { id: 'm4place', grade: 4, gen: 'place', kk: 'Үш таңбалы сандар', ru: 'Трёхзначные числа', en: 'Three-digit numbers' }
    ] },
    { id: 'logic', icon: '🧩', kk: 'Логика', ru: 'Логика и алгоритмы', en: 'Logic', hue: 'purple', topics: [
      { id: 'l1pattern', grade: 1, gen: 'pattern', kk: 'Заңдылық', ru: 'Закономерности', en: 'Patterns' },
      { id: 'l1odd', grade: 1, gen: 'odd', kk: 'Артығын тап', ru: 'Найди лишнее', en: 'Odd one out' },
      { id: 'l2algo', grade: 2, gen: 'algo', kk: 'Әже-Bot бағдарламасы', ru: 'Программа для робота', en: 'Program the robot' },
      { id: 'l2yurt', grade: 2, gen: 'yurt', kk: 'Киіз үй құрастыр', ru: 'Собери юрту', en: 'Put up a yurt' },
      { id: 'l3sym', grade: 3, gen: 'sym', kk: 'Ою-өрнек: симметрия', ru: 'Орнамент: симметрия', en: 'Ornament: symmetry' }
    ] },
    { id: 'nature', icon: '🌿', kk: 'Жаратылыстану', ru: 'Естествознание', en: 'Science', hue: 'green', topics: [
      { id: 'n1season', grade: 1, gen: 'season', kk: 'Жыл мезгілдері', ru: 'Времена года', en: 'Seasons' },
      { id: 'n1wild', grade: 1, gen: 'wild', kk: 'Үй жануары ма, жабайы ма?', ru: 'Домашние и дикие', en: 'Farm or wild?' },
      { id: 'n2home', grade: 2, gen: 'home', kk: 'Кім қайда тұрады?', ru: 'Кто где живёт?', en: 'Who lives where?' },
      { id: 'n2water', grade: 2, gen: 'water', kk: 'Судың айналымы', ru: 'Круговорот воды', en: 'The water cycle' },
      { id: 'n2health', grade: 2, gen: 'health', kk: 'Денсаулық', ru: 'Здоровье', en: 'Health' },
      { id: 'n2safety', grade: 2, gen: 'safety', kk: 'Қауіпсіздік', ru: 'Безопасность', en: 'Safety' },
      { id: 'n2senses', grade: 2, gen: 'senses', kk: 'Сезім мүшелері', ru: 'Органы чувств', en: 'The senses' },
      { id: 'n3redbook', grade: 3, gen: 'redbook', kk: 'Қызыл кітап', ru: 'Красная книга', en: 'The Red Book' }
    ] },
    { id: 'geo', icon: '🗺️', kk: 'География', ru: 'География Казахстана', en: 'Geography', hue: 'teal', topics: [
      { id: 'g2dirs', grade: 2, gen: 'dirs', kk: 'Дүние тараптары', ru: 'Стороны света', en: 'Compass directions' },
      { id: 'g3feature', grade: 3, gen: 'feature', kk: 'Өзен, көл, тау', ru: 'Реки, озёра, горы', en: 'Rivers, lakes, mountains' },
      { id: 'g3repcity', grade: 3, gen: 'repcity', kk: 'Республикалық қалалар', ru: 'Города республиканского значения', en: 'Cities of national significance' },
      { id: 'g4center', grade: 4, gen: 'center', kk: 'Облыс орталықтары', ru: 'Центры областей', en: 'Regional centres' },
      { id: 'g4map', grade: 4, gen: 'map', kk: 'Қазақстан картасы', ru: 'Карта Казахстана', en: 'Map of Kazakhstan' },
      { id: 'g4neighbor', grade: 4, gen: 'neighbor', kk: 'Көрші елдер', ru: 'Соседние страны', en: 'Neighbouring countries' },
      { id: 'g4water', grade: 4, gen: 'seas', kk: 'Көлдер мен теңіздер', ru: 'Озёра и моря', en: 'Lakes and seas' }
    ] },
    { id: 'cities', icon: '🏙️', kk: 'Қалалар', ru: 'Города и достопримечательности', en: 'Cities', hue: 'orange', topics: [
      { id: 'c2landmark', grade: 2, gen: 'landmark', kk: 'Көрікті жерлер', ru: 'Достопримечательности', en: 'Landmarks' },
      { id: 'c3river', grade: 3, gen: 'river', kk: 'Қалалар мен өзендер', ru: 'Города на реках', en: 'Cities and rivers' },
      { id: 'c4tour', grade: 4, gen: 'tour', kk: 'Саяхат: турист сұрайды', ru: 'Путешествие: спрашивает турист', en: 'A journey: the tourist asks' },
      { id: 'c3region', grade: 3, gen: 'cityregion', kk: 'Қала қай облыстың орталығы?', ru: 'Центр какой области?', en: 'Which region is it the centre of?' },
      { id: 'c3guide', grade: 3, gen: 'guide', kk: 'Гид бол: қайда? қайдан?', ru: 'Будь гидом: где? куда? откуда?', en: 'Be a guide: where to / from?' }
    ] },
    { id: 'history', icon: '📜', kk: 'Тарих', ru: 'История (5 класс)', en: 'History (grade 5)', hue: 'red', topics: [
      { id: 'h5timeline', grade: 5, gen: 'timeline', kk: 'Уақыт өзені: қайсысы бұрын?', ru: 'Река времени: что раньше?', en: 'River of time: what came first?' },
      { id: 'h5kz', grade: 5, gen: 'histkz', kk: 'Қазақстан тарихы: кім? қашан? қайда?', ru: 'История Казахстана: кто? когда? где?', en: 'History of Kazakhstan' },
      { id: 'h5ata', grade: 5, gen: 'atastory', kk: 'Атаның әңгімелері', ru: 'Рассказы дедушки', en: 'Grandpa\'s stories' },
      { id: 'h5world', grade: 5, gen: 'histworld', kk: 'Ежелгі әлем', ru: 'Древний мир', en: 'The ancient world' }
    ] },
    { id: 'lit', icon: '📖', kk: 'Әдебиеттік оқу', ru: 'Литературное чтение, музыка, искусство', en: 'Reading, music, art', hue: 'pink', topics: [
      { id: 'r2genre', grade: 2, gen: 'genre', kk: 'Мақал, жұмбақ, ертегі', ru: 'Пословица, загадка, сказка', en: 'Proverb, riddle, tale' },
      { id: 'r3legend', grade: 3, gen: 'legend', kk: 'Аңыздар: Ақсақ құлан, Қорқыт', ru: 'Легенды', en: 'Legends' },
      { id: 'r3music', grade: 3, gen: 'music', kk: 'Музыка және өнер', ru: 'Музыка и искусство', en: 'Music and art' },
      { id: 'r4authors', grade: 4, gen: 'authors', kk: 'Кім жазған?', ru: 'Кто написал?', en: 'Who wrote it?' }
    ] }
  ];
  /** A round of ROUND tasks for a topic; questions with the same visual are not repeated in a row. */
  function round(topic, r) {
    var out = [], seen = {};
    for (var guard = 0; out.length < ROUND && guard < 200; guard++) {
      var q = GEN[topic.gen](r), k = q.kk + '|' + JSON.stringify(q.visual) + '|' + q.answer;
      if (seen[k]) continue; seen[k] = 1; out.push(q);
    }
    return out;
  }
  /* ---------- day 10: «Мектеп күнделігі» — the diary for the child and the report for the teacher / parent ---------- */
  /** Stars for a best score out of 10: 9–10 ★★★, 6–8 ★★, 1–5 ★, not played or 0 — none. */
  function stars(best) { return best == null || best <= 0 ? 0 : best >= 9 ? 3 : best >= 6 ? 2 : 1; }
  /** Per subject: topics done, total, stars earned / possible, and the topics to repeat (played, best < 6). */
  function diary(best) {
    best = best || {};
    return SUBJECTS.map(function (s) {
      var done = 0, st = 0, weak = [];
      s.topics.forEach(function (t) { var b = best[t.id]; if (b != null) { done++; if (b < 6) weak.push(t); } st += stars(b); });
      return { id: s.id, icon: s.icon, kk: s.kk, ru: s.ru, en: s.en, done: done, total: s.topics.length, stars: st, maxStars: s.topics.length * 3, weak: weak };
    });
  }
  /** Plain-text report (copied and sent to the teacher or a parent). */
  function reportText(best, name, lang, date, grade) {
    var en = lang === 'en', d = diary(best), all = d.reduce(function (a, x) { return a + x.total; }, 0), done = d.reduce(function (a, x) { return a + x.done; }, 0);
    var lines = ['🏫 Мектеп күнделігі' + (name ? ' — ' + name : '') + (date ? ' · ' + date : ''),
      (en ? 'Topics done: ' : 'Пройдено тем: ') + done + ' / ' + all + ' · ★ ' + d.reduce(function (a, x) { return a + x.stars; }, 0) + ' / ' + d.reduce(function (a, x) { return a + x.maxStars; }, 0), ''];
    d.forEach(function (x) { var tr = en ? x.en : x.ru; lines.push(x.icon + ' ' + x.kk + (tr && tr !== x.kk ? ' — ' + tr : '') + ': ' + x.done + ' / ' + x.total + ' · ★ ' + x.stars + ' / ' + x.maxStars); });
    var weak = []; d.forEach(function (x) { x.weak.forEach(function (t) { weak.push(t.kk + ' — ' + (en ? t.en : t.ru) + ' (' + best[t.id] + ' / ' + ROUND + ')'); }); });
    lines.push(''); lines.push(weak.length ? (en ? 'Worth repeating:' : 'Стоит повторить:') : (en ? 'Nothing to repeat — well done!' : 'Повторять нечего — молодец!'));
    weak.forEach(function (w) { lines.push('• ' + w); });
    lines.push(''); lines.push((en ? 'Code for the teacher: ' : 'Код для учителя: ') + encodeReport(best, name, grade));
    return lines.join('\n');
  }
  /* ---------- «Бүгінгі жаттығу»: today's mix of 10 tasks (spaced review, no penalty for a missed day) ---------- */
  function dayDiff(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000); }
  /** Review interval after the best score: 9–10 → 7 days, 6–8 → 3 days (below 6 the topic is «weak» and comes every day). */
  function reviewDays(best) { return best >= 9 ? 7 : 3; }
  /** Five topics × 2 tasks: up to 3 weak topics (played, best < 6), then topics due for review (oldest first), then one
   *  new topic of the child's grade, then any topic of that grade. `seen` maps a topic id to its last day (YYYY-MM-DD). */
  function dailyMix(best, seen, today, grade, r) {
    best = best || {}; seen = seen || {};
    var all = []; SUBJECTS.forEach(function (s) { s.topics.forEach(function (t) { all.push(t); }); });
    var played = all.filter(function (t) { return best[t.id] != null; });
    var weak = shuffle(played.filter(function (t) { return best[t.id] < 6; }), r).slice(0, 3);
    var due = played.filter(function (t) { return best[t.id] >= 6 && (!seen[t.id] || dayDiff(seen[t.id], today) >= reviewDays(best[t.id])); })
      .sort(function (a, b) { return (seen[a.id] || '').localeCompare(seen[b.id] || ''); });
    var fresh = shuffle(all.filter(function (t) { return best[t.id] == null && t.grade === grade; }), r);
    // the fill-up never brings back a topic done today or one that is not due yet, unless nothing else is left
    var rest = function (t) { return seen[t.id] !== today && !(best[t.id] >= 6 && due.indexOf(t) < 0); };
    var gradeAll = shuffle(all.filter(function (t) { return t.grade === grade && rest(t); }), r), anyRest = shuffle(all.filter(rest), r);
    var pick = [], why = {};
    function take(list, n, tag) { list.forEach(function (t) { if (pick.length < 5 && n > 0 && pick.indexOf(t) < 0) { pick.push(t); why[t.id] = tag; n--; } }); }
    take(weak, 3, 'weak'); take(due, 5 - pick.length - (fresh.length ? 1 : 0), 'review'); take(fresh, 1, 'new'); take(gradeAll, 5, 'practice'); take(anyRest, 5, 'practice'); take(all, 5, 'practice');
    var out = [];
    pick.forEach(function (t) { round(t, r).slice(0, 2).forEach(function (q) { out.push({ topic: t, why: why[t.id], q: q }); }); });
    return out;
  }
  /* ---------- «Сынып есебі»: a compact diary code the teacher pastes in bulk → a class table (offline, no server) ---------- */
  // QVD1:<name>:<grade>:<one char per topic in SUBJECTS order: '-' not played, 0–9, 'A' = 10>:<checksum>
  // Topics are only ever appended to SUBJECTS, so old codes keep their meaning; a shorter code reads as «not played».
  function allTopics() { var a = []; SUBJECTS.forEach(function (s) { s.topics.forEach(function (t) { a.push(t); }); }); return a; }
  // The code's own fixed order (the screen order of SUBJECTS may change): the 40 topics of 19.11, then appended ones only.
  var CODE_ORDER = ['m1count', 'm1shapes', 'm1tens', 'm1add20', 'm1compare', 'm2add100', 'm2mul', 'm2money', 'm3mul69', 'm3div', 'm3frac', 'm4shop', 'm4place',
    'l1pattern', 'l1odd', 'l2algo', 'l2yurt', 'l3sym', 'n1season', 'n1wild', 'n2home', 'n2water', 'n2senses', 'n3redbook',
    'g2dirs', 'g3feature', 'g3repcity', 'g4center', 'g4map', 'g4neighbor', 'c2landmark', 'c3river', 'c4tour', 'c3guide',
    'h5timeline', 'h5kz', 'h5world', 'r2genre', 'r3music', 'r4authors',
    'm2clock', 'n2health', 'n2safety', 'c3region', 'h5ata', 'r3legend', 'g4water', 'm4bazaar'];
  function codeTopics() { return CODE_ORDER.map(function (id) { return { id: id }; }); }
  function check(str) { var h = 0; for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 36; return h.toString(36); }
  function encodeReport(best, name, grade) {
    var digits = codeTopics().map(function (t) { var b = best && best[t.id]; return b == null ? '-' : b >= 10 ? 'A' : String(Math.max(0, b)); }).join('');
    var body = 'QVD1:' + String(name || '').replace(/[:\s]+/g, '_').slice(0, 24) + ':' + (grade || '') + ':' + digits;
    return body + ':' + check(body);
  }
  /** Every valid code in a pasted text (messages, notes…); wrong or damaged codes are skipped. */
  function decodeReports(text) {
    var out = [], re = /QVD1:([^:\s]*):(\d?):([0-9A\-]+):([0-9a-z])/g, m, topics = codeTopics();
    while ((m = re.exec(String(text || '')))) {
      var body = 'QVD1:' + m[1] + ':' + m[2] + ':' + m[3];
      if (check(body) !== m[4]) continue;
      var best = {}; topics.forEach(function (t, i) { var c = m[3][i]; if (c && c !== '-') best[t.id] = c === 'A' ? 10 : +c; });
      out.push({ name: m[1].replace(/_/g, ' '), grade: m[2] ? +m[2] : null, best: best });
    }
    // one pupil sending twice: keep the last code
    var seenN = {}; return out.reverse().filter(function (r) { var k = r.name.toLowerCase(); if (seenN[k]) return false; seenN[k] = 1; return true; }).reverse();
  }
  /** Per topic: how many played, the average, how many are weak (< 6); the weakest topics first. */
  function classSummary(reports) {
    return allTopics().map(function (t) {
      var sc = reports.map(function (r) { return r.best[t.id]; }).filter(function (b) { return b != null; });
      return { topic: t, played: sc.length, avg: sc.length ? Math.round(sc.reduce(function (a, b) { return a + b; }, 0) / sc.length * 10) / 10 : null,
        weak: sc.filter(function (b) { return b < 6; }).length, weakNames: reports.filter(function (r) { return r.best[t.id] != null && r.best[t.id] < 6; }).map(function (r) { return r.name; }) };
    }).filter(function (x) { return x.played > 0; }).sort(function (a, b) { return (b.weak / b.played) - (a.weak / a.played) || a.avg - b.avg; });
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
    MONTHS.concat(SEASONS, WILD, DOMESTIC.map(function (x) { return x[0]; }), HOMES.map(function (x) { return x.kk; }), REDBOOK, COMMON).forEach(function (x) { out.push(x); });
    SENSES.forEach(function (x) { out.push(x.q); out.push(x.organ); }); WATER.forEach(function (x) { out.push(x.kk); });
    MONTHS.forEach(function (m) { out.push(cap(m) + ' — қай мезгіл?'); }); HOMES.forEach(function (h) { out.push(cap(h.home) + ' кім тұрады?'); });
    Object.keys(LANDMARK).concat(Object.keys(NEAR)).forEach(function (x) { out.push(x); out.push(x + ' қай қалада?'); });
    Object.keys(NEAR).forEach(function (x) { out.push(x + ' қай қаланың маңында?'); });
    ['Астана', 'Алматы'].forEach(function (c) { out.push('Қайсысы ' + guideForms(c)[0] + '?'); });
    Object.keys(CITY_RIVER).forEach(function (c) { out.push(c + ' қай өзеннің бойында тұр?'); out.push(c); });
    ['Ертіс', 'Жайық', 'Есіл'].forEach(function (x) { out.push('Қай қала ' + x + ' өзенінің бойында тұр?'); }); RIVERS.forEach(function (x) { out.push(x); });
    out.push('Қай қала Каспий теңізінің жағасында тұр?'); out.push('Ақтау'); out.push('Түркістан'); out.push('Тараз');
    GUIDE_CITIES.forEach(function (c) { guideForms(c).forEach(function (x) { out.push(x); }); });
    ['zhatys', 'barys', 'shygys'].forEach(function (k) { out.push(GUIDE_Q[k][0]); });
    LIT_AUTHORS.concat(LIT_MUSIC).forEach(function (f) { out.push(f.kk); out.push(f.a); });
    ['мақал-мәтел', 'жұмбақ', 'ертегі', 'Бұл қай жанр?'].forEach(function (x) { out.push(x); }); GENRES.forEach(function (g) { out.push(g.text); });
    HISTORY_KZ.concat(HISTORY_WORLD).forEach(function (f) { out.push(f.kk); if (!f.noSay) out.push(f.a); });
    EVENTS.forEach(function (e) { out.push(e.kk); }); out.push('Қайсысы бұрын болды?');
    Object.keys(CITY_LL).forEach(function (c) { out.push(c + ' қай жерде?'); out.push(c); });
    out.push('Белгіленген су айдыны қалай аталады?');
    Object.keys(TOUR).forEach(function (n) { out.push(travelPlace(n)); out.push(tourLine(n)); });
    Object.keys(CITY_LL).forEach(function (c) { out.push(cityWhere(c)); });
    BZ_KIDS.forEach(function (p) { out.push(bazaarTotalQ(p.kk)); out.push(bazaarChangeQ(p.kk)); });
    BAZAAR.forEach(function (g) { [2, 3].forEach(function (k) { var t = g.price * k; out.push(N(t) + ' теңге'); NOTES.forEach(function (x) { if (x > t) out.push(N(x - t) + ' теңге'); }); }); });
    SEAS.forEach(function (w) { out.push(w.id); out.push(waterWhere(w.id)); out.push(waterWhereQ(w.id)); });
    SIDES.forEach(function (x) { out.push(sideForm(x)); });
    for (var hh = 1; hh <= 12; hh++) { out.push(D.timeKk(hh, 0)); out.push(D.timeKk(hh, 30)); } out.push('Сағат неше?');
    HEALTH.concat(SAFETY).forEach(function (f) { out.push(f.kk); if (!f.noSay) out.push(f.a); });
    REGIONS.forEach(function (g) { out.push(regionQuestion(REGION_CENTER[g])); });
    ATA_STORIES.concat(LEGENDS).forEach(function (st) { st.qs.forEach(function (q) { if (!q.noSay) out.push(q.a); }); });
    LAB_HOMES.forEach(function (x) { out.push(x.kk); out.push(x.at); out.push(cap(x.kk) + ' ' + x.at + ' тұрады.'); });
    CHAINS.forEach(function (c) { c.forEach(function (x) { out.push(x.kk); }); out.push(c.map(function (x) { return x.kk; }).join(' — ')); });
    ['Бұл жануар қайда тұрады?', 'Тізбекте не жетіспейді?'].forEach(function (x) { out.push(x); });
    YURT.forEach(function (y) { out.push(y.kk); out.push(y.done); }); out.push('Енді не керек?'); out.push('Бұл не?'); out.push('Киіз үй дайын!');
    REGIONS.forEach(function (g) { out.push(centerQuestion(g)); out.push(REGION_CENTER[g]); out.push(g); });
    DIRS.forEach(function (d) { out.push(d.kk); out.push(cap(G.caseForm(d.kk, 'ilik')) + ' қарама-қарсы жағы қай жақ?'); }); Object.keys(FEATURE).concat(NEIGHBORS, FAR, REP_CITIES, OTHER_CITIES).forEach(function (x) { out.push(x); });
    ['Күн қай жақтан шығады?', 'Күн қай жаққа батады?', 'Нұсқар қай жаққа бағытталған?', 'Қайсысы өзен?', 'Қайсысы көл?', 'Қайсысы тау?', 'Қайсысы республикалық маңызы бар қала?', 'Қайсысы Қазақстанмен шекаралас?', 'Қайсысы Қазақстанмен шекараласпайды?', 'Қайсысы республикалық маңызы бар қала емес?', 'Қазақстанның астанасы қай қала?', 'Түсте күн қай жақта тұрады?'].forEach(function (x) { out.push(x); });
    ['Қайсысы жабайы аң?', 'Қайсысы үй жануары?', 'Қайсысы Қызыл кітапқа енген?', 'Судың айналымы: келесі кезең қандай?'].forEach(function (x) { out.push(x); });
    ['Келесісі қандай?', 'Қайсысы артық?', 'Әже-Bot батареяға қалай жетеді?', 'Ою-өрнекті симметриялы етіп аяқта.', 'Киіз үй тігу: келесі қадам қандай?'].forEach(function (x) { out.push(x); });
    return out;
  }
  return { travelPlace: travelPlace, N: N, BAZAAR: BAZAAR, bazaarAsk: bazaarAsk, bazaarPrice: bazaarPrice, bazaarBuy: bazaarBuy, bazaarTotalQ: bazaarTotalQ, bazaarChangeQ: bazaarChangeQ, SEAS: SEAS, waterWhere: waterWhere, CODE_ORDER: CODE_ORDER, HEALTH: HEALTH, SAFETY: SAFETY, ATA_STORIES: ATA_STORIES, LEGENDS: LEGENDS, HOSTS: HOSTS, TIPS: TIPS, intro: intro, hostOf: hostOf, heroLines: heroLines, regionQuestion: regionQuestion, encodeReport: encodeReport, decodeReports: decodeReports, classSummary: classSummary, dayDiff: dayDiff, reviewDays: reviewDays, dailyMix: dailyMix, TOUR: TOUR, accusative: accusative, tourLine: tourLine, tourLines: function () { return Object.keys(TOUR).map(tourLine); }, cityWhere: cityWhere, CITY_LL: CITY_LL, MAP_GAP: MAP_GAP, cityXY: cityXY, LAB_HOMES: LAB_HOMES, CHAINS: CHAINS, stars: stars, diary: diary, reportText: reportText, LIT_AUTHORS: LIT_AUTHORS, LIT_MUSIC: LIT_MUSIC, GENRES: GENRES, HISTORY_KZ: HISTORY_KZ, HISTORY_WORLD: HISTORY_WORLD, EVENTS: EVENTS, LANDMARK: LANDMARK, NEAR: NEAR, CITY_RIVER: CITY_RIVER, GUIDE_CITIES: GUIDE_CITIES, guideForms: guideForms, REGIONS: REGIONS, REGION_CENTER: REGION_CENTER, centerQuestion: centerQuestion, NEIGHBORS: NEIGHBORS, DIRS: DIRS, FEATURE: FEATURE, REP_CITIES: REP_CITIES, SEASON_OF: SEASON_OF, SENSES: SENSES, HOMES: HOMES, HOME_NOT: HOME_NOT, WATER: WATER, REDBOOK: REDBOOK, WILD: WILD, runProgram: runProgram, mirror: mirror, ARROW_KK: ARROW_KK, ODD_CAT: ODD_CAT, ODD_E: ODD_E, YURT: YURT, fractionKk: fractionKk, buyText: buyText, changeText: changeText, SUBJECTS: SUBJECTS, GEN: GEN, ROUND: ROUND, round: round, topicById: topicById, compareSentence: compareSentence, exprSentence: exprSentence, voiceLines: voiceLines, SHAPES: SHAPES };
});
