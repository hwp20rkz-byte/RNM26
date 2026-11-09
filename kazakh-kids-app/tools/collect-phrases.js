// Prints every Kazakh phrase the game can speak as JSON [{key, text}].
// Usage: node tools/collect-phrases.js > phrases.json
const path = require('path');
global.window = {};
const web = path.resolve(__dirname, '../web');
['data', 'grade1', 'grade2', 'grade3'].forEach((f) => require(path.join(web, f + '.js')));
const D = window.QDATA;

const out = new Map();
function add(t) {
  if (!t) return;
  t = String(t).replace(/^—\s*/, '').replace(/\s+/g, ' ').trim();
  if (!t) return;
  const k = D.audioKey(t);
  if (!out.has(k)) out.set(k, t);
}
function tokens(s) { return s.replace(/[.,!?;:«»"]/g, '').split(/\s+/).filter((t) => t && t !== '—' && t !== '–'); }

const LOC_VERBS = ['тұрамын', 'мектепке барамын', 'ұйықтаймын', 'түскі ас ішемін', 'шахмат ойнаймын', 'үйге келемін'];

D.GRADES.forEach((g) => g.units.forEach((u) => u.lessons.forEach((l) => {
  (l.words || []).forEach((w) => add(w.kk));
  (l.sentences || []).forEach((s) => { add(s.kk); tokens(s.kk).forEach((t) => add(t.toLowerCase())); });
  (l.fills || []).forEach((f) => { add((f.pre + f.ans + f.post).replace(/—/g, ' ')); f.opts.forEach((o) => { if (o.length > 4) add(o); }); });
  (l.order || []).forEach((o) => add(o.kk));
})));
for (let h = 1; h <= 12; h++) {
  add(D.timeKk(h, 0)); add(D.timeKk(h, 30)); add(D.hourLoc(h));
  LOC_VERBS.forEach((v) => add('Мен ' + D.hourLoc(h) + ' ' + v + '.'));
}
D.NUM_RANGES.forEach(([a, b, st]) => { for (let n = a; n <= b; n += st) add(D.numToKk(n)); });
for (let n = 100; n <= 2000; n += 50) add(D.numToKk(n));

process.stdout.write(JSON.stringify([...out].map(([key, text]) => ({ key, text })), null, 0));
