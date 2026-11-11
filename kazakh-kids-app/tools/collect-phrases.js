// Prints every Kazakh phrase the game can speak as JSON [{key, text, voice}].
// voice = tag from the voice matrix (backend/qv_audio/voices.py); "NARR" is the lesson narrator.
// Usage: node tools/collect-phrases.js > phrases.json
const path = require('path');
global.window = {};
const web = path.resolve(__dirname, '../web');
['data', 'grade1', 'grade2', 'grade3', 'life', 'textbook', 'curriculum', 'world'].forEach((f) => require(path.join(web, f + '.js')));
const C = window.QCURRICULUM, VOICES = require('../src/voice/personas.json');
const tagOf = (who) => (VOICES.personas[who] && VOICES.personas[who].piper.tag) || who;
// arcade.js only needs a stub of the app API to expose its word lists
window.Q = { api: { state: () => ({}) }, ext: {} };
require(path.join(web, 'arcade.js'));
const D = window.QDATA, W = window.QWORLD, ARC = window.QARCADE_DATA;

const out = new Map();
function add(t, voice) {
  if (!t) return;
  t = String(t).replace(/^—\s*/, '').replace(/\s+/g, ' ').trim();
  if (!t) return;
  const k = D.audioKey(t);
  if (!out.has(k)) out.set(k, { key: k, text: t, voice: voice || 'NARR' });
}
function tokens(s) { return s.replace(/[.,!?;:«»"]/g, '').split(/\s+/).filter((t) => t && t !== '—' && t !== '–'); }
function sentence(s) { add(s); tokens(s).forEach((t) => add(t.toLowerCase())); }

const LOC_VERBS = ['тұрамын', 'мектепке барамын', 'ұйықтаймын', 'түскі ас ішемін', 'шахмат ойнаймын', 'үйге келемін'];

// character lines first, so they keep their own voice even if a narrator phrase has the same text
Object.keys(W.LINES).forEach((who) => Object.values(W.LINES[who]).forEach((l) => add(l.kk, W.LINE_VOICE[who])));
// modules 2 & 4: persona lines (dialogues; the player's answers are Әлібек's), game host lines
Object.values(C.dialogues).forEach((d) => Object.values(d.nodes).forEach((n) => {
  add(n.kk, tagOf(n.who));
  (n.choices || []).forEach((c) => add(c.kk, 'ALIBEK'));
}));
Object.entries(VOICES.lines).forEach(([who, lines]) => Object.values(lines).forEach((t) => add(t, tagOf(who))));
add(C.room.start, 'ZHALKAU'); add(C.room.end, 'ZHALKAU');

D.GRADES.forEach((g) => g.units.forEach((u) => u.lessons.forEach((l) => {
  (l.words || []).forEach((w) => add(w.kk));
  (l.sentences || []).forEach((s) => sentence(s.kk));
  (l.fills || []).forEach((f) => { add((f.pre + f.ans + f.post).replace(/—/g, ' ')); f.opts.forEach((o) => { if (o.length > 4) add(o); }); });
  (l.order || []).forEach((o) => add(o.kk));
})));
for (let h = 1; h <= 12; h++) {
  add(D.timeKk(h, 0)); add(D.timeKk(h, 30)); add(D.hourLoc(h));
  LOC_VERBS.forEach((v) => add('Мен ' + D.hourLoc(h) + ' ' + v + '.'));
}
D.NUM_RANGES.forEach(([a, b, st]) => { for (let n = a; n <= b; n += st) add(D.numToKk(n)); });
for (let n = 100; n <= 2000; n += 50) add(D.numToKk(n));

// arcade
ARC.SELLER.forEach(sentence);
ARC.GOODS.forEach((g) => sentence(g.kk.charAt(0).toUpperCase() + g.kk.slice(1) + ' қанша тұрады?'));
ARC.CMD.forEach((c) => add(c.kk));
ARC.RESPECT.forEach(add);
ARC.NEEDS.forEach((n) => add(n.kk));
ARC.VERSES.forEach((v) => { sentence(v.a); sentence(v.b); });
['кездескенше', 'қымбат', 'арзан', 'рақмет', 'қолма-қол', 'келістік', 'тәтті', 'ба'].forEach((t) => add(t));

// textbook track: rules, poems, riddles + thematic games
D.GRADES.forEach((g) => g.units.forEach((u) => u.lessons.forEach((l) => {
  if (l.rule) add(l.rule);
  if (l.poem) add(l.poem.kk.replace(/\n/g, ' '));
})));
Object.values(D.TOPIC_GAMES || {}).forEach((g) => {
  (g.items || []).forEach((x) => add(Array.isArray(x) ? x[1] : x.kk));
  Object.values(g.plural || {}).forEach((x) => add(x));
  (g.pairs || []).forEach((p) => { add(p.a); add(p.b); if (g.say) add(g.say(p)); });
});
for (let h = 1; h <= 12; h++) [0, 10, 15, 20, 30, 40, 45, 50].forEach((m) => add(D.clockPhrase(h, m)));
// modules 2 & 4: new exercise kinds, riddles, 3D games (narrator voice)
C.modules.forEach((m) => m.lessons.forEach((l) => {
  (l.affixes || []).forEach((x) => add((x.person ? x.person + ' ' : '') + x.root + x.ans));
  (l.busters || []).forEach((x) => add(x.ans));
  (l.posts || []).forEach((x) => add(x.pre + x.ans + x.post));
}));
C.riddles.forEach((r) => { add(r.clue); add(r.answer.toLowerCase()); });
C.room.items.forEach((x) => { add(x.kk); add(x.say); });
C.room.containers.forEach((x) => add(x.kk));
C.workshop.forEach((b) => { add(b.done); b.tiers.forEach((t) => { add(t.q); add(t.ans); }); });
add('Сәлем! Мен сенің дауысыңмын.');

process.stdout.write(JSON.stringify([...out.values()], null, 0));
