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
  assert.ok(q.kk && q.ru && q.en && (q.say || ['pattern', 'algo', 'sym'].includes(t.gen) || /\d|^[IVX]+ /.test(q.answer)) && q.full && !/undefined|NaN/.test(q.full + q.say), t.id + ': texts ' + q.full); n++;
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
// day 5 — nature: reference tables written by hand (sources in methodology/plan-10-days.md), forms from the engine
eq(M.SEASON_OF['наурыз'], 'көктем', 'March is spring'); eq(M.SEASON_OF['желтоқсан'], 'қыс', 'December is winter'); eq(M.SEASON_OF['қыркүйек'], 'күз', 'September is autumn');
eq(M.SENSES.map((x) => x.organ).join(' '), 'көзбен құлақпен мұрынмен тілмен терімен', 'sense organs with «немен?» (instrumental)');
eq(M.HOMES.map((x) => x.kk + ' — ' + x.home).join(', '), 'балық — суда, барыс — тауда, түйе — шөлде, тиін — орманда', 'where animals live (locative)');
eq(M.WATER.map((x) => x.kk).join(' → '), 'Су буланады → Бұлт пайда болады → Жаңбыр жауады → Су өзенге ағады', 'water cycle order');
eq(M.REDBOOK.join(' '), 'барыс құлан арқар қарақұйрық', 'Red Book animals in the game');
const nature = M.SUBJECTS.find((x) => x.id === 'nature');
for (const t of nature.topics) for (let k = 0; k < 40; k++) for (const q of M.round(t, rnd)) {
  assert.ok(q.options.includes(q.answer) && new Set(q.options).size === q.options.length && q.options.length >= 3, t.id + ' options'); n++;
  const v = q.visual;
  if (t.gen === 'season') eq(q.answer, M.SEASON_OF[v.text], 'season of ' + v.text);
  if (t.gen === 'wild') { const w = q.options.filter((o) => M.WILD.includes(o)); assert.ok(q.kk.includes('жабайы') ? w.length === 1 && w[0] === q.answer : w.length === 2 && !w.includes(q.answer), 'wild/domestic ' + q.options); n++; }
  if (t.gen === 'home') { eq(M.HOMES.find((x) => x.kk === q.answer).home, v.text, 'lives ' + v.text); assert.ok(q.options.filter((o) => o !== q.answer).every((o) => M.HOME_NOT[v.text].includes(o)), 'distractors are surely wrong: ' + q.options); n++; }
  if (t.gen === 'senses') eq(q.answer, M.SENSES.find((x) => x.q === q.kk).organ, 'organ for ' + q.kk);
  if (t.gen === 'redbook') { assert.ok(M.REDBOOK.includes(q.answer) && q.options.filter((o) => M.REDBOOK.includes(o)).length === 1, 'one Red Book animal'); n++; }
  if (t.gen === 'water') eq(q.answer, M.WATER[v.step].kk, 'water step');
}
// day 6 — geography: reference tables by hand (sources in plan-10-days.md)
eq(M.REGIONS.length, 17, '17 regions'); eq(M.REGION_CENTER['Абай облысы'], 'Семей', 'Abai → Semey'); eq(M.REGION_CENTER['Ұлытау облысы'], 'Жезқазған', 'Ulytau → Zhezkazgan');
eq(M.REGION_CENTER['Жетісу облысы'], 'Талдықорған', 'Zhetisu → Taldykorgan'); eq(M.REGION_CENTER['Алматы облысы'], 'Қонаев', 'Almaty region → Konaev');
eq(M.centerQuestion('Абай облысы'), 'Абай облысының орталығы қай қала?', 'genitive from the engine');
eq(M.NEIGHBORS.join(' '), 'Ресей Қытай Қырғызстан Өзбекстан Түрікменстан', 'five neighbours');
eq(M.DIRS.map((d) => d.kk).join(' '), 'солтүстік шығыс оңтүстік батыс', 'directions clockwise from north');
const geo = M.SUBJECTS.find((x) => x.id === 'geo');
for (const t of geo.topics) { eq(M.round(t, rnd).length, 10, t.id + ': a full round of 10 different tasks'); n++; }
for (const t of geo.topics) for (let k = 0; k < 40; k++) for (const q of M.round(t, rnd)) {
  assert.ok(q.options.includes(q.answer) && new Set(q.options).size === q.options.length && q.options.length >= 3, t.id + ' options'); n++;
  const v = q.visual;
  if (t.gen === 'dirs') { if (v.type === 'compass') eq(q.answer, M.DIRS[v.deg / 90].kk, 'arrow ' + v.deg); else if (q.kk.includes('қарама-қарсы')) eq(M.DIRS.findIndex((d) => d.kk === q.answer), (M.DIRS.findIndex((d) => d.kk === v.text.toLowerCase()) + 2) % 4, 'opposite of ' + v.text); else if (q.kk.startsWith('Түсте')) eq(q.answer, 'оңтүстік', 'noon sun'); else eq(q.answer, q.kk.includes('шығады') ? 'шығыс' : 'батыс', 'the sun'); }
  if (t.gen === 'center') eq(q.answer, M.REGION_CENTER[v.text], 'center of ' + v.text);
  if (t.gen === 'feature') { const kind = q.kk.includes('өзен') ? 'river' : q.kk.includes('көл') ? 'lake' : 'mountain'; assert.ok(q.options.filter((o) => M.FEATURE[o] === kind).length === 1 && M.FEATURE[q.answer] === kind, 'one ' + kind); n++; }
  if (t.gen === 'neighbor' && q.kk.includes('шекараласпайды')) { assert.ok(q.options.filter((o) => !M.NEIGHBORS.includes(o)).length === 1 && !M.NEIGHBORS.includes(q.answer), 'one non-neighbour'); n++; }
  else if (t.gen === 'neighbor') { assert.ok(q.options.filter((o) => M.NEIGHBORS.includes(o)).length === 1 && M.NEIGHBORS.includes(q.answer), 'one neighbour'); n++; }
  if (t.gen === 'repcity' && q.kk.includes('астанасы')) eq(q.answer, 'Астана', 'the capital');
  else if (t.gen === 'repcity' && q.kk.includes('емес')) { assert.ok(q.options.filter((o) => !M.REP_CITIES.includes(o)).length === 1 && !M.REP_CITIES.includes(q.answer), 'one ordinary city'); n++; }
  else if (t.gen === 'repcity') { assert.ok(q.options.filter((o) => M.REP_CITIES.includes(o)).length === 1 && M.REP_CITIES.includes(q.answer), 'one city of republican significance'); n++; }
}
// day 7: cities — reference case forms written by hand (locative / dative / ablative)
const GUIDE_REF = { Алматы: ['Алматыда', 'Алматыға', 'Алматыдан'], Шымкент: ['Шымкентте', 'Шымкентке', 'Шымкенттен'], Тараз: ['Таразда', 'Таразға', 'Тараздан'],
  Өскемен: ['Өскеменде', 'Өскеменге', 'Өскеменнен'], Ақтау: ['Ақтауда', 'Ақтауға', 'Ақтаудан'], Ақтөбе: ['Ақтөбеде', 'Ақтөбеге', 'Ақтөбеден'],
  Семей: ['Семейде', 'Семейге', 'Семейден'], Көкшетау: ['Көкшетауда', 'Көкшетауға', 'Көкшетаудан'], Орал: ['Оралда', 'Оралға', 'Оралдан'], Астана: ['Астанада', 'Астанаға', 'Астанадан'] };
for (const c of Object.keys(GUIDE_REF)) { eq(M.guideForms(c).join(' '), GUIDE_REF[c].join(' '), 'case forms of ' + c); }
eq(M.LANDMARK['Бәйтерек'], 'Астана', 'Бәйтерек'); eq(M.LANDMARK['Медеу'], 'Алматы', 'Медеу'); eq(M.LANDMARK['Қожа Ахмет Ясауи кесенесі'], 'Түркістан', 'Ясауи');
eq(M.CITY_RIVER['Орал'], 'Жайық', 'Орал on the Жайық'); eq(M.CITY_RIVER['Астана'], 'Есіл', 'Астана on the Есіл'); eq(M.CITY_RIVER['Семей'], 'Ертіс', 'Семей on the Ертіс');
assert.ok(!M.GUIDE_CITIES.includes('Қонаев'), 'Қонаев is left out of the guide (spelling of its endings varies)'); n++;
const cities = M.SUBJECTS.find((x) => x.id === 'cities');
eq(cities.topics.length, 5, 'five city topics');
for (const t of cities.topics) { eq(M.round(t, rnd).length, 10, t.id + ': a full round of 10'); }
for (const t of cities.topics) for (let k = 0; k < 40; k++) for (const q of M.round(t, rnd)) {
  assert.ok(q.options.includes(q.answer) && new Set(q.options).size === q.options.length && q.options.length >= 3, t.id + ' options'); n++;
  const v = q.visual;
  if (t.gen === 'landmark') {
    if (q.kk.endsWith('қай қалада?')) eq(q.answer, M.LANDMARK[v.text], 'city of ' + v.text);
    else if (q.kk.endsWith('маңында?')) eq(q.answer, M.NEAR[v.text], 'near ' + v.text);
    else { const city = q.kk.replace('Қайсысы ', '').replace(/да\?$|де\?$|та\?$|те\?$/, ''); assert.ok(q.options.filter((o) => M.LANDMARK[o] && q.kk.includes(M.guideForms(M.LANDMARK[o])[0])).length === 1 && q.kk.includes(M.guideForms(M.LANDMARK[q.answer])[0]), 'one landmark in ' + city); n++; }
  }
  if (t.gen === 'river') {
    if (q.kk.startsWith('Қай қала')) { if (q.kk.includes('Каспий')) eq(q.answer, 'Ақтау', 'the Caspian city'); else { const r = Object.values(M.CITY_RIVER).find((x) => q.kk.includes(x)); assert.ok(q.options.filter((o) => M.CITY_RIVER[o] === r).length === 1 && M.CITY_RIVER[q.answer] === r, 'one city on ' + r); n++; } }
    else eq(q.answer, M.CITY_RIVER[v.text], 'river of ' + v.text);
  }
  if (t.gen === 'guide') { const f = M.guideForms(v.city); eq(q.options.slice().sort().join(' '), f.slice().sort().join(' '), 'three case forms'); eq(q.answer, f[{ zhatys: 0, barys: 1, shygys: 2 }[v.kase]], 'right case for ' + q.kk); }
}
// day 8: history (grade 5) — the reference facts written by hand; the game data must agree with them
const HIST_REF = { 'Қазақ хандығын кімдер құрды?': 'Керей мен Жәнібек', '«Қара сөздердің» авторы кім?': 'Абай Құнанбайұлы', 'Қазақстан қай жылы тәуелсіздік алды?': '1991',
  'Қазақстан Конституциясы қай жылы қабылданды?': '1995', 'Қазақ хандығы қай ғасырда құрылды?': 'XV ғасырда', 'Тәуелсіздік күні қай күні?': '16 желтоқсан',
  'Пирамидалар қай елде?': 'Мысыр', 'Олимпиада ойындары қай елде басталды?': 'Грекия', 'Колизей қай қалада?': 'Рим', '1492 жылы Америкаға кім жетті?': 'Колумб' };
const allHist = M.HISTORY_KZ.concat(M.HISTORY_WORLD);
for (const k of Object.keys(HIST_REF)) { const f = allHist.find((x) => x.kk === k); assert.ok(f, 'fact present: ' + k); eq(f.a, HIST_REF[k], k); }
for (const f of allHist) { assert.ok(f.d.length >= 2 && !f.d.includes(f.a) && new Set(f.d).size === f.d.length, 'distractors of ' + f.kk); n++; }
// timeline: years are the commonly accepted ones; the game only compares events at least 300 years apart
assert.ok(M.EVENTS.length >= 8 && M.EVENTS.every((e) => typeof e.y === 'number' && e.kk && e.e), 'events'); n++;
eq(M.EVENTS.find((e) => /хандығы/.test(e.kk)).y, 1465, 'the Kazakh Khanate'); eq(M.EVENTS.find((e) => /тәуелсіздік/.test(e.kk)).y, 1991, 'independence');
const hist = M.SUBJECTS.find((x) => x.id === 'history');
eq(hist.topics.length, 4, 'four history topics'); assert.ok(hist.topics.every((t) => t.grade === 5), 'grade 5'); n++;
for (const t of hist.topics) { eq(M.round(t, rnd).length, 10, t.id + ': a full round of 10'); }
for (const t of hist.topics) for (let k = 0; k < 40; k++) for (const q of M.round(t, rnd)) {
  assert.ok(q.options.includes(q.answer) && new Set(q.options).size === 3, t.id + ' options'); n++;
  if (t.gen === 'timeline') {
    const ev = q.options.map((o) => M.EVENTS.find((e) => e.kk === o)), ys = ev.map((e) => e.y).sort((a, b) => a - b);
    eq(q.answer, ev.reduce((a, b) => (b.y < a.y ? b : a)).kk, 'earliest event');
    assert.ok(ys[1] - ys[0] >= 300 && ys[2] - ys[1] >= 300, 'events far apart: ' + ys.join(' ')); n++;
  } else if (!q.story) { const f = allHist.find((x) => x.kk === q.kk); eq(q.answer, f.a, q.kk); }   // stories have their own check
}
// day 9: reading, music and art — reference answers written by hand
const LIT_REF = { '«Қара сөздерді» кім жазған?': 'Абай Құнанбайұлы', '«Кел, балалар, оқылық» өлеңін кім жазған?': 'Ыбырай Алтынсарин', '«Маса» кітабын кім жазған?': 'Ахмет Байтұрсынұлы',
  '«Қырық мысал» кітабын кім жазған?': 'Ахмет Байтұрсынұлы', '«Қыпшақ Сейітқұл» әңгімесін кім жазған?': 'Ыбырай Алтынсарин',
  'Домбыраның неше ішегі бар?': 'екі', '«Сарыарқа» күйін кім шығарған?': 'Құрманғазы', 'Қайсысы — үрмелі аспап?': 'Сыбызғы', 'Қошқар мүйіз деген не?': 'Ою-өрнек' };
const allLit = M.LIT_AUTHORS.concat(M.LIT_MUSIC);
for (const k of Object.keys(LIT_REF)) { const f = allLit.find((x) => x.kk === k); assert.ok(f, 'fact present: ' + k); eq(f.a, LIT_REF[k], k); }
for (const f of allLit) { assert.ok(f.d.length >= 2 && !f.d.includes(f.a) && f.en && f.ru, 'distractors and texts of ' + f.kk); n++; }
for (const g of M.GENRES) { assert.ok(['мақал-мәтел', 'жұмбақ', 'ертегі'].includes(g.a) && g.text.length > 10, 'genre sample ' + g.text); n++; }
assert.ok(M.GENRES.filter((g) => g.a === 'ертегі').every((g) => /^Ерте, ерте, ертеде/.test(g.text)), 'every tale sample opens with the folk formula'); n++;
assert.ok(M.GENRES.filter((g) => g.a === 'жұмбақ').every((g) => /\?$/.test(g.text)), 'every riddle asks'); n++;
const lit = M.SUBJECTS.find((x) => x.id === 'lit');
eq(lit.topics.length, 4, 'four reading topics');
for (const t of lit.topics) if (t.id !== 'r3legend') { eq(M.round(t, rnd).length, 10, t.id + ': a full round of 10'); }   // the legends have 7 questions (checked below)
for (const t of lit.topics) for (let k = 0; k < 40; k++) for (const q of M.round(t, rnd)) {
  assert.ok(q.options.includes(q.answer) && new Set(q.options).size === 3, t.id + ' options'); n++;
  if (t.gen === 'genre') eq(q.answer, M.GENRES.find((g) => g.text === q.visual.text).a, 'genre of ' + q.visual.text);
  else if (!q.story) eq(q.answer, allLit.find((x) => x.kk === q.kk).a, q.kk);
}
// day 10: the diary — stars, progress per subject, topics to repeat, the report text
eq([undefined, 0, 1, 5, 6, 8, 9, 10].map(M.stars).join(''), '00112233', 'stars for a best score');
const best = { m1count: 9, m1tens: 4, l1pattern: 10, g2dirs: 6 };
const dia = M.diary(best), mathD = dia.find((x) => x.id === 'math');
eq(mathD.done, 2, 'maths: two topics played'); eq(mathD.stars, 4, 'maths: 3 + 1 stars'); eq(mathD.maxStars, 42, 'maths: 14 topics × 3');
eq(mathD.weak.map((t) => t.id).join(), 'm1tens', 'below 6 is worth repeating');
eq(dia.find((x) => x.id === 'geo').weak.length, 0, '6 / 10 is not weak');
eq(dia.length, 7, 'seven subjects'); eq(M.diary({}).every((x) => x.done === 0 && x.stars === 0), true, 'an empty diary');
const rep = M.reportText(best, 'Әнел', 'ru', '17.11.2026');
assert.ok(rep.startsWith('🏫 Мектеп күнделігі — Әнел · 17.11.2026') && rep.includes('Пройдено тем: 4 / 47') && rep.includes('🔢 Математика: 2 / 14 · ★ 4 / 42') && rep.includes('📜 Тарих — История (5 класс): 0 / 4') && rep.includes('Стоит повторить:') && rep.includes('(4 / 10)'), 'report text:\n' + rep); n++;
assert.ok(M.reportText({ m1count: 10 }, '', 'en').includes('Nothing to repeat'), 'nothing to repeat'); n++;
// the map: the cities sit where a child expects them (checked by hand against a school atlas)
const xy = (c) => M.cityXY(c);
assert.ok(xy('Ақтау')[0] < 80 && xy('Орал')[0] < 80, 'Ақтау and Орал in the far west'); n++;
assert.ok(xy('Өскемен')[0] > 520, 'Өскемен in the far east'); n++;
assert.ok(xy('Алматы')[1] > 230 && xy('Шымкент')[1] > 240 && xy('Петропавл')[1] < 60, 'Алматы and Шымкент in the south, Петропавл in the north'); n++;
assert.ok(xy('Астана')[0] > 300 && xy('Астана')[0] < 420 && xy('Астана')[1] < 140, 'Астана in the north of the centre'); n++;
assert.ok(Object.keys(M.CITY_LL).every((c) => { const [x, y] = xy(c); return x > 10 && x < 590 && y > 10 && y < 330; }), 'every city on the map'); n++;
eq(M.cityWhere('Алматы'), 'Алматы — Қазақстанның оңтүстік-шығысында.', 'Алматы in the south-east');
eq(M.cityWhere('Петропавл'), 'Петропавл — Қазақстанның солтүстігінде.', 'Петропавл in the north');
eq(M.cityWhere('Атырау'), 'Атырау — Қазақстанның батысында.', 'Атырау in the west'); eq(M.cityWhere('Өскемен'), 'Өскемен — Қазақстанның шығысында.', 'Өскемен in the east');
eq(M.cityWhere('Қарағанды'), 'Қарағанды — Қазақстанның орталығында.', 'Қарағанды in the centre'); eq(M.cityWhere('Талдықорған'), 'Талдықорған — Қазақстанның оңтүстік-шығысында.', 'Талдықорған SE');
// «Саяхат»: reference accusatives written by hand, the line, the dative answer
eq(M.accusative('Бәйтерек'), 'Бәйтеректі', 'Бәйтеректі'); eq(M.accusative('Хан Шатыр'), 'Хан Шатырды', 'Хан Шатырды'); eq(M.accusative('Ақорда'), 'Ақорданы', 'Ақорданы');
eq(M.accusative('Қожа Ахмет Ясауи кесенесі'), 'Қожа Ахмет Ясауи кесенесін', 'кесенесін'); eq(M.accusative('Абай мұражайы'), 'Абай мұражайын', 'мұражайын');
eq(M.accusative('Үлкен Алматы көлі'), 'Үлкен Алматы көлін', 'көлін'); eq(M.accusative('Каспий теңізі'), 'Каспий теңізін', 'теңізін');
eq(M.tourLine('Бәйтерек'), 'Мен Бәйтеректі көргім келеді. Қай қалаға барамыз?', 'the tourist line');
const tourT = M.topicById('c4tour'); eq(M.round(tourT, rnd).length, 10, 'tour: a round of 10');
for (let k = 0; k < 40; k++) for (const q of M.round(tourT, rnd)) {
  eq(q.answer, M.guideForms(M.TOUR[q.visual.text])[1], 'tour answer for ' + q.visual.text); eq(q.who, 'ARCH', 'the architect speaks');
  assert.ok(new Set(q.options).size === 3 && q.options.includes(q.answer), 'tour options'); n++;
}
const mapT = M.topicById('g4map'); eq(M.round(mapT, rnd).length, 10, 'map: a round of 10');
for (let k = 0; k < 60; k++) for (const q of M.round(mapT, rnd)) {
  const d = q.visual.dots; assert.ok(d.length === 3 && q.options.length === 3 && q.options.includes(q.answer), 'three dots'); n++;
  const a = d.find((p) => p.id === q.answer); assert.ok(a && Math.abs(a.x - xy(q.answer)[0]) < 0.1, 'the answer dot is at its city'); n++;
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) assert.ok(Math.hypot(d[i].x - d[j].x, d[i].y - d[j].y) >= M.MAP_GAP, 'dots far apart'); n++;
}
// «Бүгінгі жаттығу»: weak topics first, then spaced review, then one new topic of the child's grade
eq(M.dayDiff('2026-11-10', '2026-11-18'), 8, 'days between'); eq(M.reviewDays(10), 7, 'mastered: a week'); eq(M.reviewDays(7), 3, 'good: three days');
{
  const today = '2026-11-18';
  const bestD = { m1count: 4, m1tens: 3, l1pattern: 10, n1season: 7, g2dirs: 9 };
  const seenD = { m1count: today, m1tens: today, l1pattern: '2026-11-15', n1season: '2026-11-14', g2dirs: '2026-11-10' };
  for (let k = 0; k < 30; k++) {
    const mix = M.dailyMix(bestD, seenD, today, 1, rnd), ids = [...new Set(mix.map((x) => x.topic.id))];
    eq(mix.length, 10, 'ten tasks');
    assert.ok(ids.includes('m1count') && ids.includes('m1tens'), 'weak topics come every day'); n++;
    assert.ok(ids.includes('n1season') && ids.includes('g2dirs'), 'due for review: 4 days after 7/10, 8 days after 9/10'); n++;
    assert.ok(!ids.includes('l1pattern'), 'not due: 10/10 three days ago'); n++;
    assert.ok(mix.some((x) => x.why === 'new' && x.topic.grade === 1 && bestD[x.topic.id] == null), 'one new topic of grade 1'); n++;
    assert.ok(mix.every((x) => x.topic.gen && x.q.options.includes(x.q.answer)), 'real tasks'); n++;
  }
  // one topic played today (9/10): the fill-up takes other topics of the grade, not that one
  for (let k = 0; k < 30; k++) { const m2 = M.dailyMix({ m1count: 9 }, { m1count: today }, today, 1, rnd); assert.ok(m2.length === 10 && !m2.some((x) => x.topic.id === 'm1count'), 'a topic done today is not repeated'); n++; }
  const empty = M.dailyMix({}, {}, today, 3, rnd);
  eq(empty.length, 10, 'a first-day mix'); assert.ok(empty.every((x) => x.topic.grade === 3), 'a first-day mix is of the child\'s grade'); n++;
}
// «Сынып есебі»: the diary code survives copying through a messenger; damaged codes are skipped; a class table
{
  const c1 = M.encodeReport({ m1count: 10, m1tens: 4, g4map: 7 }, 'Әнел Б', 4), c2 = M.encodeReport({ m1count: 9, m1tens: 3 }, 'Арман', 4);
  const c3 = M.encodeReport({ m1count: 2 }, 'Әнел Б', 4);   // the same pupil again, later
  assert.ok(/^QVD1:Әнел_Б:4:[0-9A-]+:[0-9a-z]$/.test(c1), 'code shape: ' + c1); n++;
  const chat = '[18.11 10:02] Әнел: 🏫 Мектеп күнделігі…\nКод для учителя: ' + c1 + '\n[18.11 10:05] Арман: ' + c2 + ' рахмет!\nсломанный: ' + c2.replace(/.$/, (x) => (x === '0' ? '1' : '0'));
  const rs = M.decodeReports(chat);
  eq(rs.length, 2, 'two valid codes, the damaged one skipped'); eq(rs[0].name, 'Әнел Б', 'name back'); eq(rs[0].best.m1count, 10, '10 survives'); eq(rs[0].best.g4map, 7, 'a late topic survives');
  eq(rs[1].best.m1tens, 3, 'second pupil'); eq(Object.keys(rs[1].best).length, 2, 'unplayed stay unplayed');
  eq(M.decodeReports(chat + '\n' + c3).find((r) => r.name === 'Әнел Б').best.m1count, 2, 'a pupil sending twice: the last code counts');
  const sum = M.classSummary(rs);
  eq(sum[0].topic.id, 'm1tens', 'the weakest topic of the class first'); eq(sum[0].weak, 2, 'both pupils weak'); eq(sum[0].weakNames.join(','), 'Әнел Б,Арман', 'who is weak');
  eq(sum.find((x) => x.topic.id === 'm1count').avg, 9.5, 'average');
  assert.ok(M.reportText({ m1count: 9 }, 'T', 'ru', '19.11.2026', 1).includes('Код для учителя: QVD1:T:1:'), 'the report carries the code'); n++;
}
// 20.11 — new topics: the clock (words from the engine), health, safety, city → region, Ata's stories, legends
{
  const ck = M.topicById('m2clock'); eq(M.round(ck, rnd).length, 10, 'clock: a round of 10');
  for (let k = 0; k < 40; k++) for (const q of M.round(ck, rnd)) { eq(q.answer, ((global.window && global.window.QDATA) || global.QDATA).timeKk(q.visual.h, q.visual.m), 'clock answer'); assert.ok(new Set(q.options).size === 3 && q.options.includes(q.answer), 'clock options'); n++; }
  eq(((global.window && global.window.QDATA) || global.QDATA).timeKk(3, 30), 'Сағат үш жарым', 'reference: half past three');
  for (const id of ['n2health', 'n2safety']) { const t = M.topicById(id); eq(M.round(t, rnd).length, 10, id + ': a round of 10'); for (let k = 0; k < 20; k++) for (const q of M.round(t, rnd)) { assert.ok(new Set(q.options).size === 3 && q.options.includes(q.answer), id + ' options'); n++; } }
  eq(M.SAFETY.find((f) => /Өрт/.test(f.kk)).a, '101', 'fire: 101'); eq(M.SAFETY.find((f) => /Полиция/.test(f.kk)).a, '102', 'police: 102'); eq(M.SAFETY.find((f) => /Жедел/.test(f.kk)).a, '103', 'ambulance: 103');
  const cr = M.topicById('c3region'); eq(M.round(cr, rnd).length, 10, 'city → region: a round of 10');
  for (let k = 0; k < 40; k++) for (const q of M.round(cr, rnd)) { eq(M.REGION_CENTER[q.answer], q.visual.text, 'region of ' + q.visual.text); assert.ok(!/undefined/.test(q.full) && q.full.includes(' облысының орталығы'), 'genitive from the engine: ' + q.full); n++; }
  for (const [id, list, teller] of [['h5ata', M.ATA_STORIES, 'ATA'], ['r3legend', M.LEGENDS, 'AZHE']]) {
    const t = M.topicById(id), r1 = M.round(t, rnd); assert.ok(r1.length >= 7, id + ': at least 7 different questions'); n++;
    for (let k = 0; k < 40; k++) for (const q of M.round(t, rnd)) {
      const st = list.find((s) => s.text === q.story); assert.ok(st && q.storyWho === teller && ['ANEL', 'ALIBEK'].includes(q.who), id + ': a story, its teller, a pupil asks'); n++;
      const f = st.qs.find((x) => x.kk === q.kk); eq(q.answer, f.a, id + ' answer');
      // the answer is told in the story (a year or a word of it), so the question is fair
      const core = String(f.a).replace(/(ғасырда|ның|нің|да|де|ға|ге|нан|нен|ны|ні|ды|ді|ке|қа)$/u, '').split(' ')[0].slice(0, 4).toLowerCase();
      assert.ok(q.story.toLowerCase().includes(core) || /XV/.test(f.a) && /он бесінші/.test(q.story), id + ': the story tells «' + f.a + '»'); n++;
    }
  }
  // heroes: every topic has its host and a tip; the intro is a pupil, then the host
  const allT = []; M.SUBJECTS.forEach((s) => s.topics.forEach((t) => allT.push(t)));
  for (const t of allT) { const it = M.intro(t); assert.ok(it.length === 2 && ['ANEL', 'ALIBEK'].includes(it[0].who) && it[1].kk === M.TIPS[t.id] && M.TIPS[t.id].length > 10, 'intro of ' + t.id); n++; }
  eq(M.hostOf(M.topicById('h5kz')).who, 'ATA', 'history: Ата'); eq(M.hostOf(M.topicById('m1count')).who, 'APAI', 'maths: Баян апай');
  const hl = M.heroLines(); assert.ok(hl.length > 80 && hl.every((x) => x.who && x.kk && !/undefined/.test(x.kk)), 'hero lines: ' + hl.length); n++;
}
const lines = M.voiceLines(); assert.ok(lines.every((x) => x && !/undefined/.test(x)), 'voice lines'); n++;
assert.ok(M.SUBJECTS.length === 7 && M.SUBJECTS[0].topics.length === 14 && M.SUBJECTS.every((s) => !s.day) && M.SUBJECTS[1].topics.length === 5 && M.SUBJECTS[2].topics.length === 8 && M.SUBJECTS[3].topics.length === 7 && M.SUBJECTS[4].topics.length === 5 && M.SUBJECTS[5].topics.length === 4 && M.SUBJECTS[6].topics.length === 4, 'all 7 subjects open: maths 14, logic 5, nature 8, geography 7, cities 5, history 4, reading 4'); n++;

// 21.11 — «Көлдер мен теңіздер» (4 кл.): Natural Earth water on the map; where-forms from the engine (reference by hand)
eq(M.waterWhere('Каспий теңізі'), 'Каспий теңізі — Қазақстанның батысында.', 'the Caspian in the west');
eq(M.waterWhere('Арал теңізі'), 'Арал теңізі — Қазақстанның оңтүстік-батысында.', 'the Aral in the south-west');
eq(M.waterWhere('Балқаш көлі'), 'Балқаш көлі — Қазақстанның оңтүстік-шығысында.', 'Balkhash in the south-east');
eq(M.waterWhere('Зайсан көлі'), 'Зайсан көлі — Қазақстанның шығысында.', 'Zaysan in the east');
eq(M.waterWhere('Теңіз көлі'), 'Теңіз көлі — Қазақстанның орталығында.', 'Tengiz in the centre');
{
  const KZ = require('../web/kz-map.js'), W = Object.fromEntries(KZ.water.map((w) => [w.id, w]));
  eq(Object.keys(W).sort().join(','), M.SEAS.map((w) => w.id).sort().join(','), 'every water body of the topic is on the map');
  // the hand table agrees with the geometry: west < 180 < centre < 420 < east (the thresholds of cityWhere)
  assert.ok(W['Каспий теңізі'].c[0] < 180 && W['Арал теңізі'].c[0] < 250 && W['Арал теңізі'].c[1] > 200, 'the Caspian and the Aral lie west'); n++;
  assert.ok(['Балқаш көлі', 'Зайсан көлі', 'Алакөл'].every((x) => W[x].c[0] > 420), 'Balkhash, Zaysan, Alakol lie east'); n++;
  assert.ok(W['Теңіз көлі'].c[0] > 180 && W['Теңіз көлі'].c[0] < 420, 'Tengiz in the middle'); n++;
  const wt = M.topicById('g4water'); assert.ok(wt && wt.grade === 4 && M.SUBJECTS[3].topics.includes(wt), 'g4water is a grade-4 geography topic'); n++;
  const both = new Set();
  for (let k = 0; k < 80; k++) { const qs = M.round(wt, rnd); eq(qs.length, 10, 'water: a round of 10');
    for (const q of qs) {
      assert.ok(new Set(q.options).size === 3 && q.options.includes(q.answer), 'water: three different options'); n++;
      if (q.visual.mark) { both.add('name'); eq(q.answer, q.visual.mark, 'the marked water is the answer'); eq(q.full, M.waterWhere(q.answer), 'the full answer says where'); }
      else { both.add('where'); const w = M.SEAS.find((x) => q.kk.startsWith(x.id + ' ')); assert.ok(w, 'the question names a water body: ' + q.kk); n++;
        eq(q.answer, M.waterWhere(w.id).split('Қазақстанның ')[1].replace('.', ''), 'the direction answer comes from the table');
        assert.ok(q.options.every((o) => o === q.answer || M.waterWhere(w.id) !== w.id + ' — Қазақстанның ' + o + '.'), 'no second right direction'); n++; }
    } }
  eq([...both].sort().join(','), 'name,where', 'both kinds of questions appear');
  assert.ok(M.TIPS.g4water && M.hostOf(wt).who === 'M1', 'Батыр-X has a rule for the water topic'); n++;
  const vl = M.voiceLines(); assert.ok(M.SEAS.every((w) => vl.includes(w.id) && vl.includes(M.waterWhere(w.id))), 'water names and answers are voiced'); n++;
}
// the teacher code keeps a fixed topic order: 19.11 order, then appended topics; every topic has a place
eq(M.CODE_ORDER.slice(0, 7).join(','), 'm1count,m1shapes,m1tens,m1add20,m1compare,m2add100,m2mul', 'code order is pinned');
eq(M.CODE_ORDER.slice(40).join(','), 'm2clock,n2health,n2safety,c3region,h5ata,r3legend,g4water', 'new topics only appended to the code');
eq([...M.CODE_ORDER].sort().join(','), M.SUBJECTS.flatMap((x) => x.topics.map((t) => t.id)).sort().join(','), 'every topic is in the code exactly once');
{ const old = 'QVD1:Арман:1:3-A' ; const body = old; const code = body + ':' + (() => { let h = 0; for (const ch of body) h = (h * 31 + ch.charCodeAt(0)) % 36; return h.toString(36); })();
  const r = M.decodeReports(code)[0]; assert.ok(r && r.best.m1count === 3 && r.best.m1tens === 10 && r.best.m1shapes == null, 'a short (older) code still reads'); n++; }
module.exports = { checks: () => n };
if (require.main === module) console.log('mektep numbers: ' + n + ' checks passed');
