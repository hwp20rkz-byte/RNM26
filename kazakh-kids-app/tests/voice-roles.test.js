// Who speaks what: Әнел and Баян апай have their own lines and voices, shared sentences get speaker-qualified
// files, and the narrator packs never hold a persona line. Run: node tests/voice-roles.test.js
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const phrases = JSON.parse(execFileSync('node', [path.join(ROOT, 'tools/collect-phrases.js')], { maxBuffer: 64 << 20 }).toString());
global.window = {};
require(path.join(ROOT, 'web/data.js'));
require(path.join(ROOT, 'web/curriculum.js'));
require(path.join(ROOT, 'web/audio/index.js'));
require(path.join(ROOT, 'web/audio-iseke/index.js'));
const key = window.QDATA.audioKey, C = window.QCURRICULUM, AUD = window.QAUDIO, ISEKE = window.QAUDIO_ISEKE;
const P = require(path.join(ROOT, 'src/voice/personas.json'));
const byKey = new Map(phrases.map((p) => [p.key, p]));
let n = 0;
const voiceOf = (text, who) => { const q = byKey.get(key(text + ' @' + who)); return q ? q.voice : (byKey.get(key(text)) || {}).voice; };
const eq = (a, b, m) => { assert.strictEqual(a, b, m); n++; };

// roles from personas.json
eq(P.roles['riddle.clue'], 'APAI', 'Баян апай reads the riddles');
eq(P.roles['workshop.question'], 'ANEL', 'Әнел reads the blueprint questions');
assert.ok(!P.personas.APAI.piper.tag, 'Баян апай no longer borrows the narrator tag'); n++;
assert.ok(P.personas.APAI.piper.speaker !== undefined && P.personas.ANEL.piper.speaker !== undefined); n++;

C.riddles.forEach((r) => eq(voiceOf(r.clue, 'APAI'), 'APAI', 'riddle clue → APAI: ' + r.clue));
C.workshop.forEach((b) => {
  b.tiers.forEach((t) => eq(voiceOf(t.q, 'ANEL'), 'ANEL', 'blueprint question → ANEL: ' + t.q));
  eq(voiceOf(b.done, P.roles['workshop.done'][b.id]), P.roles['workshop.done'][b.id], 'finale line of ' + b.id);
});
Object.values(C.dialogues).forEach((d) => Object.values(d.nodes).filter((x) => x.who === 'APAI').forEach((x) => eq(voiceOf(x.kk, 'APAI'), 'APAI', 'dialogue narration → APAI')));
Object.values(P.lines.APAI).forEach((t) => eq(voiceOf(t, 'APAI'), 'APAI', 'APAI line ' + t));
Object.values(P.lines.ANEL).forEach((t) => eq(voiceOf(t, 'ANEL'), 'ANEL', 'ANEL line ' + t));
C.room.items.forEach((x) => eq(voiceOf(x.say, 'ZHALKAU'), 'ZHALKAU', 'room item → Жалқаубек (his room): ' + x.say));

// the architect asks «Оның биіктігі қанша?» too: one file per speaker
const shared = 'Оның биіктігі қанша?';
eq(byKey.get(key(shared)).voice, 'ARCH', 'the first speaker keeps the plain key');
eq(byKey.get(key(shared + ' @ANEL')).voice, 'ANEL', 'the second speaker gets a qualified key');
eq(byKey.get(key(shared + ' @ANEL')).text, shared, 'qualified entries synthesise the plain text');

const counts = phrases.reduce((m, p) => (m[p.voice] = (m[p.voice] || 0) + 1, m), {});
assert.ok(counts.ANEL >= 15 && counts.APAI >= 30, 'both heroines speak: ' + JSON.stringify({ ANEL: counts.ANEL, APAI: counts.APAI })); n++;

// audio (ISSAI retired 13.11.2026): a narrator line has an ISEKE file, a character line a Freedom Speech file in audio/
const has = (dir, k) => fs.existsSync(path.join(ROOT, 'web', dir, k + '.mp3'));
const missing = phrases.filter((p) => (p.voice === 'NARR' ? !ISEKE[p.key] || !has('audio-iseke', p.key) : !AUD[p.key] || !has('audio', p.key)));
assert.deepStrictEqual(missing.map((p) => p.voice + ': ' + p.text), [], 'every phrase has bundled audio'); n++;
const heroLog = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/audio/heroes-fs.json'), 'utf8'));
const notFs = phrases.filter((p) => p.voice !== 'NARR' && !heroLog[p.key]);
assert.deepStrictEqual(notFs.map((p) => p.voice + ': ' + p.text), [], 'every character line is a Freedom Speech take'); n++;
const issai = Object.keys(AUD).filter((k) => !heroLog[k]);
assert.deepStrictEqual(issai, [], 'audio/ holds no narrator (ISSAI) file'); n++;
const leaked = phrases.filter((p) => p.voice !== 'NARR' && ISEKE[p.key]);
assert.deepStrictEqual(leaked.map((p) => p.voice + ': ' + p.text), [], 'ISEKE (narrator) pack holds no persona line'); n++;
console.log('voice roles: ' + n + ' checks passed (ANEL ' + counts.ANEL + ' lines, APAI ' + counts.APAI + ' lines)');
