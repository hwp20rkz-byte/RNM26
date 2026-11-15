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
const calc = (t) => { const m = /^(\d+) ([+−×÷]) (\d+)$/.exec(t); const a = +m[1], b = +m[3]; return m[2] === '+' ? a + b : m[2] === '−' ? a - b : m[2] === '÷' ? a / b : a * b; };
for (const s of M.SUBJECTS) for (const t of s.topics) for (let k = 0; k < 30; k++) for (const q of M.round(t, rnd)) {
  assert.ok(q.options.includes(q.answer) && new Set(q.options).size === q.options.length && q.options.length >= 3, t.id + ': distinct options with the answer'); n++;
  assert.ok(q.kk && q.ru && q.en && (q.say || ['pattern', 'algo', 'sym'].includes(t.gen)) && q.full && !/undefined|NaN/.test(q.full + q.say), t.id + ': texts ' + q.full); n++;
  const v = q.visual;
  if (v.type === 'expr' && t.gen !== 'compare') { const c = calc(v.text); eq(q.answer, String(c), t.id + ' ' + v.text); assert.ok(c >= 0 && c <= 100, 'within range'); if (t.gen === 'add20') assert.ok(c <= 20 && +v.text.split(' ')[0] <= 20); }
  if (t.gen === 'compare') { const [a, , b] = v.text.split(' ').map((x) => +x || x); eq(q.answer, a === b ? '=' : a < b ? '<' : '>', 'compare ' + v.text); }
  if (v.type === 'items') eq(q.answer, window.QDATA.numToKk(v.n), 'count ' + v.n);
  if (v.type === 'tens') eq(q.answer, String(v.t * 10 + v.u), 'tens');
  if (v.type === 'coins') eq(q.answer, String(v.list.reduce((a, b) => a + b, 0)), 'coins');
  if (t.gen === 'add20' && q.kk.includes('+')) { const [a, , b] = v.text.split(' ').map(Number); assert.ok(a + b > 10, 'add20 crosses ten: ' + v.text); n++; }
}
// grades 3–4 (hand-written expected texts, then the generators)
eq(M.fractionKk(3, 4), 'төрттен үш', 'fraction 3/4'); eq(M.fractionKk(1, 2), 'екіден бір', 'fraction 1/2'); eq(M.fractionKk(5, 8), 'сегізден бес', 'fraction 5/8');
eq(M.exprSentence(12, '÷', 3, 4), 'Он екі бөлу үш тең төрт.', 'division');
eq(M.buyText({ e: '🍎', kk: 'алма' }, 120, 3, 'Әнел'), 'Бір алма — 120 теңге. Әнел 3 алма алды. Барлығы неше теңге?', 'shopping total');
eq(M.changeText({ e: '📕', kk: 'кітап' }, 500, 320, 'Әлібек'), 'Әлібекте 500 теңге бар. Ол 320 теңгеге кітап алды. Қанша теңге қалды?', 'change');
for (const t of M.SUBJECTS[0].topics.filter((x) => x.grade >= 3)) for (let k = 0; k < 40; k++) for (const q of M.round(t, rnd)) {
  const v = q.visual;
  if (t.gen === 'mul69') { const [a, , b] = v.text.split(' ').map(Number); eq(q.answer, String(a * b), 'mul ' + v.text); assert.ok(a >= 6 && a <= 9); }
  if (t.gen === 'div') { const [a, , b] = v.text.split(' ').map(Number); assert.ok(a % b === 0, 'exact division ' + v.text); eq(q.answer, String(a / b), 'div ' + v.text); }
  if (t.gen === 'frac') {
    eq(q.answer, M.fractionKk(v.n, v.d), 'fraction picture ' + v.n + '/' + v.d); assert.ok(v.n < v.d);
    // no distractor may be the same amount (2/4 and 1/2 are both right): compare values
    const val = {}; for (const d of [2, 3, 4, 5, 6, 8]) for (let k = 1; k < d; k++) val[M.fractionKk(k, d)] = k / d;
    assert.ok(q.options.filter((o) => Math.abs(val[o] - v.n / v.d) < 1e-9).length === 1, 'one right amount among ' + q.options.join(', ')); n++;
  }
  if (t.gen === 'shop') { const m = /— (\d+) теңге\. \S+ (\d+) /.exec(q.kk); const ch = /^\S+(?:да|де|та|те) (\d+) теңге бар\. Ол (\d+) теңгеге/.exec(q.kk);
    if (m) eq(q.answer, String(+m[1] * +m[2]), 'shop total'); else eq(q.answer, String(+ch[1] - +ch[2]), 'change'); assert.ok(+q.answer % 10 === 0 && +q.answer <= 1000, 'round sums ≤ 1000'); }
  if (t.gen === 'place') { eq(q.answer, String(v.h * 100 + v.t * 10 + v.u), 'place value'); }
  assert.ok(q.options.includes(q.answer) && new Set(q.options).size === q.options.length, t.id + ' options'); n++;
}
// day 4 — logic: hand-written cases first, then every generated task is re-checked
eq(M.runProgram({ x: 0, y: 0 }, ['R', 'R', 'D']).x, 2, 'robot moves right twice'); eq(M.runProgram({ x: 0, y: 0 }, ['R', 'R', 'D']).y, 1, 'then down');
eq(M.mirror(['100', '010']).join('|'), '001|010', 'mirror of a half pattern');
eq(M.ARROW_KK.R + ' ' + M.ARROW_KK.L + ' ' + M.ARROW_KK.U + ' ' + M.ARROW_KK.D, 'оңға солға жоғары төмен', 'direction words');
eq(M.YURT.map((x) => x.kk).join(' → '), 'кереге → есік → шаңырақ → уық → киіз', 'yurt assembly order');
const logic = M.SUBJECTS.find((x) => x.id === 'logic');
for (const t of logic.topics) for (let k = 0; k < 40; k++) for (const q of M.round(t, rnd)) {
  assert.ok(q.options.includes(q.answer) && new Set(q.options).size === q.options.length && q.options.length >= 3, t.id + ' options'); n++;
  const v = q.visual;
  if (t.gen === 'pattern') eq(q.answer, v.unit[v.seq.length % v.unit.length], 'pattern continues ' + v.seq.join(''));
  if (t.gen === 'odd') { const cats = q.options.map((o) => M.ODD_CAT[o]); assert.ok(cats.filter((c) => c === M.ODD_CAT[q.answer]).length === 1 && new Set(cats).size === 2, 'odd one: one of a kind ' + q.options); n++; }
  if (t.gen === 'algo') { q.options.forEach((o) => { const end = M.runProgram(v.start, o.split(' '), v.size, v.walls); assert.ok((end.x === v.goal.x && end.y === v.goal.y && !end.crash) === (o === q.answer), 'only the answer reaches the battery: ' + o); n++; }); }
  if (t.gen === 'sym') { q.options.forEach((o) => { assert.ok((o === M.mirror(v.left).join('|')) === (o === q.answer), 'only the mirror is right'); n++; }); }
  if (t.gen === 'yurt') eq(q.answer, M.YURT[v.step].kk, 'next yurt step');
}
const lines = M.voiceLines(); assert.ok(lines.every((x) => x && !/undefined/.test(x)), 'voice lines'); n++;
assert.ok(M.SUBJECTS.length === 7 && M.SUBJECTS[0].topics.length === 13 && M.SUBJECTS.slice(2).every((s) => s.day >= 5) && M.SUBJECTS[1].topics.length === 5, 'skeleton: 7 subjects, maths 13 topics, logic 5, the rest planned'); n++;
module.exports = { checks: () => n };
if (require.main === module) console.log('mektep numbers: ' + n + ' checks passed');
