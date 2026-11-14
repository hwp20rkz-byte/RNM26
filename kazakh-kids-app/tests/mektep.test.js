// Фаза 2 «Мектеп»: числа по-казахски до миллиона (эталоны написаны вручную ДО исправления движка) и математика
const assert = require('assert'); global.window = {}; require('../web/data.js');
const N = window.QDATA.numToKk; let n = 0; const eq = (a, b, m) => { assert.strictEqual(a, b, m + ': ' + a + ' ≠ ' + b); n++; };
const NUM = {
  0: 'нөл', 7: 'жеті', 11: 'он бір', 40: 'қырық', 99: 'тоқсан тоғыз', 100: 'жүз', 110: 'жүз он', 999: 'тоғыз жүз тоқсан тоғыз',
  1000: 'мың', 1001: 'мың бір', 1500: 'мың бес жүз', 2026: 'екі мың жиырма алты',
  10000: 'он мың', 12345: 'он екі мың үш жүз қырық бес', 21000: 'жиырма бір мың', 99999: 'тоқсан тоғыз мың тоғыз жүз тоқсан тоғыз',
  100000: 'жүз мың', 100100: 'жүз мың жүз', 101000: 'жүз бір мың', 250000: 'екі жүз елу мың',
  999999: 'тоғыз жүз тоқсан тоғыз мың тоғыз жүз тоқсан тоғыз', 1000000: 'бір миллион'
};
for (const [k, v] of Object.entries(NUM)) eq(N(+k), v, 'numToKk ' + k);
for (let i = 0; i <= 1000000; i += 997) { const w = N(i); assert.ok(w && !/undefined/.test(w), 'no gaps: ' + i + ' → ' + w); n++; }

// maths: sentences written by hand first, then every generated task is checked by recomputing it
const M = require('../web/mektep-core.js');
eq(M.compareSentence(37, 42), 'Отыз жеті қырық екіден кем.', 'compare <');
eq(M.compareSentence(60, 10), 'Алпыс оннан артық.', 'compare >');
eq(M.compareSentence(50, 50), 'Елу елуге тең.', 'compare =');
eq(M.exprSentence(8, '+', 5, 13), 'Сегіз қосу бес тең он үш.', 'plus');
eq(M.exprSentence(15, '−', 7, 8), 'Он бес алу жеті тең сегіз.', 'minus');
eq(M.exprSentence(3, '×', 4, 12), 'Үш көбейту төрт тең он екі.', 'times');
let seed = 11; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };
const calc = (t) => { const m = /^(\d+) ([+−×]) (\d+)$/.exec(t); const a = +m[1], b = +m[3]; return m[2] === '+' ? a + b : m[2] === '−' ? a - b : a * b; };
for (const s of M.SUBJECTS) for (const t of s.topics) for (let k = 0; k < 30; k++) for (const q of M.round(t, rnd)) {
  assert.ok(q.options.includes(q.answer) && new Set(q.options).size === q.options.length && q.options.length >= 3, t.id + ': distinct options with the answer'); n++;
  assert.ok(q.kk && q.ru && q.en && q.say && q.full && !/undefined|NaN/.test(q.full + q.say), t.id + ': texts ' + q.full); n++;
  const v = q.visual;
  if (v.type === 'expr' && t.gen !== 'compare') { const c = calc(v.text); eq(q.answer, String(c), t.id + ' ' + v.text); assert.ok(c >= 0 && c <= 100, 'within range'); if (t.gen === 'add20') assert.ok(c <= 20 && +v.text.split(' ')[0] <= 20); }
  if (t.gen === 'compare') { const [a, , b] = v.text.split(' ').map((x) => +x || x); eq(q.answer, a === b ? '=' : a < b ? '<' : '>', 'compare ' + v.text); }
  if (v.type === 'items') eq(q.answer, window.QDATA.numToKk(v.n), 'count ' + v.n);
  if (v.type === 'tens') eq(q.answer, String(v.t * 10 + v.u), 'tens');
  if (v.type === 'coins') eq(q.answer, String(v.list.reduce((a, b) => a + b, 0)), 'coins');
  if (t.gen === 'add20' && q.kk.includes('+')) { const [a, , b] = v.text.split(' ').map(Number); assert.ok(a + b > 10, 'add20 crosses ten: ' + v.text); n++; }
}
const lines = M.voiceLines(); assert.ok(lines.every((x) => x && !/undefined/.test(x)), 'voice lines'); n++;
assert.ok(M.SUBJECTS.length === 7 && M.SUBJECTS[0].topics.length === 8 && M.SUBJECTS.slice(1).every((s) => s.day >= 4), 'skeleton: 7 subjects, maths has 8 topics, the rest are planned'); n++;
module.exports = { checks: () => n };
if (require.main === module) console.log('mektep numbers: ' + n + ' checks passed');
