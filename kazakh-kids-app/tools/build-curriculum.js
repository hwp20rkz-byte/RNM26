// Validates src/data/curriculum.json (schema: src/data/types.ts) and emits web/curriculum.js.
// The emitted script runs after web/textbook.js: it inserts modules 2 and 4 into the «Оқулық» track
// in textbook order (1, 2, 3, 4) and merges the thematic games into QDATA.TOPIC_GAMES.
// Usage: node tools/build-curriculum.js   (exit code 1 on any validation error)
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const C = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/curriculum.json'), 'utf8'));
const errors = [];
const err = (where, msg) => errors.push(where + ': ' + msg);
const PERSONAS = Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT, 'src/voice/personas.json'), 'utf8')).personas);
const KZ = /[А-Яа-яӘәІіҢңҒғҮүҰұҚқӨөҺһЁё]/;

function need(o, keys, where) { keys.forEach((k) => { if (o[k] == null || o[k] === '') err(where, 'missing «' + k + '»'); }); }
function optsHave(x, where) {
  if (!Array.isArray(x.opts) || x.opts.length < 2) return err(where, 'needs ≥2 options');
  if (x.opts.indexOf(x.ans) < 0) err(where, 'answer «' + x.ans + '» is not among the options');
  if (new Set(x.opts).size !== x.opts.length) err(where, 'duplicate options');
}

const ids = new Set();
C.modules.forEach((m) => {
  need(m, ['id', 'module', 'kk', 'ru', 'en', 'hue', 'hero', 'mascot', 'lessons'], m.id);
  m.lessons.forEach((l, i) => {
    const w = m.id + '/' + l.id;
    if (ids.has(l.id)) err(w, 'duplicate lesson id'); ids.add(l.id);
    need(l, ['id', 'kk', 'ru', 'en', 'icon', 'page', 'unit', 'game', 'book', 'tip'], w);
    if (!C.topicGames[l.game]) err(w, 'game «' + l.game + '» is not defined in topicGames');
    if (l.review) { if (i !== m.lessons.length - 1) err(w, 'the checkpoint must be the last lesson'); return; }
    if ((l.words || []).length < 5) err(w, 'needs ≥5 words');
    if ((l.sentences || []).length < 3) err(w, 'needs ≥3 sentences');
    (l.words || []).forEach((x, k) => need(x, ['kk', 'e', 'ru', 'en'], w + ' word#' + k));
    (l.sentences || []).forEach((x, k) => { need(x, ['kk', 'ru', 'en'], w + ' sentence#' + k); if (/[.!?]$/.test(x.kk) && !/!$/.test(x.kk)) err(w + ' sentence#' + k, 'no final period (the sentence builder splits on spaces)'); });
    (l.fills || []).forEach((x, k) => { need(x, ['ans', 'ru', 'en'], w + ' fill#' + k); optsHave(x, w + ' fill#' + k); });
    (l.posts || []).forEach((x, k) => { need(x, ['ans', 'ru', 'en'], w + ' post#' + k); optsHave(x, w + ' post#' + k); });
    (l.affixes || []).forEach((x, k) => { need(x, ['root', 'ans', 'ru', 'en', 'why', 'whyEn'], w + ' affix#' + k); optsHave(x, w + ' affix#' + k); });
    (l.busters || []).forEach((x, k) => { need(x, ['ans', 'ru', 'en', 'why', 'whyEn'], w + ' buster#' + k); optsHave(x, w + ' buster#' + k); });
    if (!KZ.test(l.rule || l.kk)) err(w, 'rule is not Kazakh');
  });
});
Object.entries(C.topicGames).forEach(([id, g]) => {
  need(g, ['type', 'kk', 'ru', 'en', 'icon'], 'game ' + id);
  if (g.type === 'sort') {
    const bins = new Set(g.bins.map((b) => b.id));
    g.items.forEach((x) => { if (!bins.has(x.bin)) err('game ' + id, 'item «' + x.kk + '» has unknown bin ' + x.bin); });
    if (g.plural) g.items.forEach((x) => { if (!g.plural[x.kk]) err('game ' + id, 'no result form for «' + x.kk + '»'); });
  }
  if (g.type === 'dialogue' && !C.dialogues[g.dialogue]) err('game ' + id, 'unknown dialogue ' + g.dialogue);
});
Object.values(C.dialogues).forEach((d) => {
  if (!d.nodes[d.start]) err('dialogue ' + d.id, 'start node missing');
  let ends = 0;
  Object.entries(d.nodes).forEach(([nid, n]) => {
    const w = 'dialogue ' + d.id + '/' + nid;
    if (PERSONAS.indexOf(n.who) < 0) err(w, 'unknown persona ' + n.who);
    if (n.end) ends++;
    if (!n.end && !n.next && !n.choices) err(w, 'dead end: no next, choices or end');
    if (n.next && !d.nodes[n.next]) err(w, 'next → unknown node ' + n.next);
    (n.choices || []).forEach((c, k) => {
      if (!d.nodes[c.next]) err(w + ' choice#' + k, 'next → unknown node ' + c.next);
      if (!c.ok && !c.why) err(w + ' choice#' + k, 'a wrong choice needs a «why» explanation');
    });
    if (n.choices && !n.choices.some((c) => c.ok)) err(w, 'no correct choice');
  });
  if (!ends) err('dialogue ' + d.id, 'no end node');
});
C.riddles.forEach((r, k) => { need(r, ['answer', 'clue', 'ru', 'en', 'src'], 'riddle#' + k); if (r.answer !== r.answer.toUpperCase()) err('riddle#' + k, 'answer must be upper case'); });
C.riddles.forEach((r, k) => { if (['easy', 'textbook'].indexOf(r.level) < 0) err('riddle#' + k, 'level must be easy or textbook'); });
['easy', 'textbook'].forEach((lv) => { if (C.riddles.filter((r) => r.level === lv).length < 3) err('riddles', 'need ≥3 riddles of level ' + lv); });
if (new Set(C.riddles.map((r) => r.answer)).size !== C.riddles.length) err('riddles', 'duplicate answers');
const cont = new Set(C.room.containers.map((c) => c.id));
C.room.items.forEach((x) => { if (!cont.has(x.to)) err('room item ' + x.id, 'unknown container ' + x.to); });
C.workshop.forEach((b) => b.tiers.forEach((t) => optsHave(t, 'workshop ' + b.id + '/' + t.id)));

if (errors.length) { console.error(errors.length + ' error(s) in curriculum.json:\n  ' + errors.join('\n  ')); process.exit(1); }

const out = '/* generated by tools/build-curriculum.js from src/data/curriculum.json — do not edit by hand */\n' +
  '(function () {\n  \'use strict\';\n  var C = ' + JSON.stringify(C) + ';\n' +
  `  window.QCURRICULUM = C;
  var D = window.QDATA, T = D.GRADES.filter(function (g) { return g.textbook; })[0];
  if (!T) return;
  C.modules.forEach(function (m) {
    var unit = { id: m.id, kk: m.kk, ru: m.ru, en: m.en, hue: m.hue, hero: m.hero, module: m.module, mascot: m.mascot, mascotEn: m.mascotEn, lessons: m.lessons };
    var at = T.units.length;
    for (var i = 0; i < T.units.length; i++) if ((T.units[i].module || 0) > m.module) { at = i; break; }
    T.units.splice(at, 0, unit);
  });
  D.TOPIC_GAMES = D.TOPIC_GAMES || {};
  Object.keys(C.topicGames).forEach(function (k) { D.TOPIC_GAMES[k] = C.topicGames[k]; });
})();
`;
fs.writeFileSync(path.join(ROOT, 'web/curriculum.js'), out);
const n = C.modules.reduce((a, m) => a + m.lessons.length, 0);
console.log('curriculum OK: ' + C.modules.length + ' modules, ' + n + ' lessons, ' + Object.keys(C.topicGames).length + ' games, ' +
  Object.keys(C.dialogues).length + ' dialogues, ' + C.riddles.length + ' riddles → web/curriculum.js');
