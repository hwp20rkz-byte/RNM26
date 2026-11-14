// 4-сынып track (master plan, sprint 5): 30 lessons in 6 themes, a БЖБ (СОР) after each unit, a ТЖБ (СОЧ) at the end;
// all courses together reach 130+ lessons. Run after web/grade4.js changes.
const assert = require('assert');
global.window = {};
for (const f of ['data', 'grade1', 'grade2', 'grade3', 'life', 'textbook', 'curriculum', 'grade4']) require('../web/' + f + '.js');
const G = window.QDATA.GRADES; let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const g4 = G[G.length - 1];
ok(g4.kk === '4-сынып' && G.indexOf(g4) === 5, 'grade 4 is pushed last — saved grade indexes of existing players do not move');
const lessons = g4.units.flatMap((u) => u.lessons), plain = lessons.filter((l) => !l.review);
ok(plain.length === 30, '30 lessons: ' + plain.length);
const bzb = lessons.filter((l) => l.review && l.assess && l.unit !== 'x' && l.id.endsWith('bzb')), tzb = lessons.filter((l) => l.id === 'g4tzb');
ok(bzb.length === 6 && bzb.every((l) => l.boss.seconds === 300), 'a БЖБ (СОР, 5 min) after each of the 6 units');
ok(tzb.length === 1 && tzb[0].boss.seconds === 600, 'a ТЖБ (СОЧ, 10 min) at the end');
g4.units.forEach((u) => { if (u.id !== 'g4tzb') ok(u.module && u.lessons[u.lessons.length - 1].assess, u.id + ': a module — its БЖБ covers only this unit'); else ok(!u.module, 'the ТЖБ unit is not a module — it covers the whole grade'); });
const ids = new Set(), all = G.flatMap((g) => g.units.flatMap((u) => u.lessons));
all.forEach((l) => { ok(!ids.has(l.id), 'unique lesson id ' + l.id); ids.add(l.id); });
ok(all.length >= 130, 'all courses: ' + all.length + ' lessons (master plan: 130+)');
for (const l of plain) {
  ok(l.words.length === 5 && l.sentences.length === 3, l.id + ': 5 words, 3 sentences');
  for (const x of l.words.concat(l.sentences)) {
    ok(x.kk && x.ru && x.en && !/[a-z]/i.test(x.kk), l.id + ': translated, no Latin in «' + x.kk + '»');
    ok(!/[.!]$/.test(x.kk), l.id + ': sentences without a final dot (the lesson engine adds punctuation): ' + x.kk);
  }
  ok(l.words.every((w) => w.e), l.id + ': every word has a picture');
}
console.log('grade 4: ' + n + ' checks passed (' + all.length + ' lessons in all courses)');
