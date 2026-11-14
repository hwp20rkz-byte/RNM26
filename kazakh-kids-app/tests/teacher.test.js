// «Мұғалім парағы» — 5-minute class blitz (master plan, sprint 5)
const assert = require('assert'); global.window = {};
for (const f of ['data', 'grade1', 'grade2', 'grade3', 'life', 'textbook', 'grade4']) require('../web/' + f + '.js');
const T = require('../web/teacher-core.js'), G = window.QDATA.GRADES; let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };
for (const g of G) {
  const tp = T.topics(g); ok(tp.length > 0, g.kk + ': has topics');
  for (const u of tp) {
    const cards = T.build([u], rnd);
    ok(cards.length >= 4 && cards.length <= T.MAX, u.id + ': 4–30 cards, got ' + cards.length);
    ok(new Set(cards.map((c) => c.kk)).size === cards.length, u.id + ': no repeats');
    ok(cards.every((c) => c.kk && c.ru && c.en && (c.type === 'sentence' || c.e !== undefined)), u.id + ': every card has kk, ru, en');
  }
  const whole = T.build(g.units, rnd); ok(whole.length === Math.min(T.MAX, whole.length) && whole.some((c) => c.type === 'sentence') && whole.some((c) => c.type === 'word'), g.kk + ': whole grade mixes words and sentences');
}
ok(T.mark(17, 20) === 5 && T.mark(13, 20) === 4 && T.mark(8, 20) === 3 && T.mark(7, 20) === 2 && T.mark(0, 0) === 2, 'school marks 2–5');
console.log('teacher blitz: ' + n + ' checks passed');
