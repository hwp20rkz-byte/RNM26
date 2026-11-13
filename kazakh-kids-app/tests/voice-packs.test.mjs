// tools/make-audio-fs.mjs against a local Freedom Speech mock (no network, no real key).
// Run: node tests/voice-packs.test.mjs
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { run, castLine, textFor, similarity, parseArgs } from '../tools/make-audio-fs.mjs';
import { startMock, KEY } from './fs-audio/fs-mock.mjs';

const require = createRequire(import.meta.url);
global.window = {};
require('../web/data.js');
const key = (t) => window.QDATA.audioKey(t);
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };

// pure parts
ok(castLine('NARR', { voice: 'tomiris' }).emotion === 'neutral', 'narrator: tomiris neutral');
ok(castLine('M1', { voice: 'tomiris' }) === null, 'characters are skipped without --cast');
ok(castLine('ALIBEK', { voice: 'tomiris', cast: true }).voice === 'taymas', 'boys → taymas');
ok(castLine('ANEL', { voice: 'taymas', cast: true }).emotion === 'happy', 'Әнел → tomiris happy');
ok(castLine('ATA', { voice: 'tomiris', cast: true }).slower && textFor('Сәлем', castLine('ATA', { voice: 'tomiris', cast: true })) === '<slower>Сәлем</slower>', 'elders speak <slower>');
ok(castLine('NARR', { voice: 'taymas' }).emotion === undefined, 'emotion is sent only to tomiris');
ok(castLine('ANEL', { voice: 'x', cast: true, clone: 'a.wav' }).voice === 'x', 'a cloned voice reads every line');
ok(similarity('Сәлем, досым!', 'сәлем досым') === 1 && similarity('кітап', 'китап') < 1, 'similarity ignores punctuation, not letters');
assert.throws(() => parseArgs(['p.json', '--pack', 'iseke']), /bad pack id/); checks++;
assert.throws(() => parseArgs(['p.json', '--clone', 'x.wav']), /needs --pack/); checks++;

const mock = await startMock();
const web = mkdtempSync(join(tmpdir(), 'qv-packs-'));
const phrases = join(web, 'phrases.json');
const P = [['Сәлем!', 'NARR'], ['Қайырлы таң!', 'NARR'], ['Бұл 429 сынақ', 'NARR'], ['boom сөйлем', 'NARR'], ['Мен Батырмын!', 'M1'], ['Өркенің өссін!', 'AZHE'], ['⚽', 'NARR']]
  .map(([text, voice]) => ({ key: key(text), text, voice }));
writeFileSync(phrases, JSON.stringify(P));
const logs = [], log = (s) => logs.push(s);
const env = { FS_API_KEY: KEY, QV_WEB_DIR: web, FS_RETRY_SCALE: '0.001' };
try {
  // 1) narrator pack over the WebSocket stream: 4 phrases, an upstream error is retried
  let code = await run([phrases, '--voice', 'tomiris', '--base-url', mock.url], env, log);
  ok(code === 0, 'stream run exits 0: ' + logs.join(' | '));
  const dir = join(web, 'audio-tomiris'), mp3 = readdirSync(dir).filter((f) => f.endsWith('.mp3'));
  ok(mp3.length === 4, 'narrator lines only: ' + mp3.length);
  ok(mock.log.ws.every((r) => r.voice === 'tomiris' && r.language === 'kk' && r.emotion === 'neutral'), 'stream requests carry voice, kk, emotion');
  ok(logs.some((l) => /retry 1\/5 «boom/.test(l)), 'upstream_failed is retried');
  const head = readFileSync(join(dir, mp3[0]));
  ok(head.length > 1000 && (head.slice(0, 3).toString() === 'ID3' || (head[0] === 0xff && (head[1] & 0xe0) === 0xe0)), 'output is mp3');
  const man = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
  ok(man.id === 'tomiris' && man.label === 'Томирис' && man.keys.length === 4, 'manifest lists the pack');
  const idx = readFileSync(join(web, 'audio-packs.js'), 'utf8');
  ok(/window\.QAUDIO_PACKS = /.test(idx) && idx.includes(key('Сәлем!')) && !idx.includes(KEY), 'audio-packs.js has keys and no API key');

  // 2) resume: nothing left to do, no new requests
  const before = mock.log.ws.length;
  logs.length = 0;
  code = await run([phrases, '--voice', 'tomiris', '--base-url', mock.url], env, log);
  ok(code === 0 && mock.log.ws.length === before && logs[0].includes('4 ready, 0 to synthesise'), 'second run resumes and skips existing files');

  // 3) cast over HTTP with --verify: characters get gender voices, 429 is retried, verify.csv written
  logs.length = 0;
  code = await run([phrases, '--voice', 'taymas', '--pack', 'cast', '--cast', '--transport', 'http', '--verify', '--base-url', mock.url], env, log);
  ok(code === 0, 'http cast run exits 0: ' + logs.join(' | '));
  const byText = Object.fromEntries(mock.log.speak.map((j) => [j.input ?? j.text, j]));
  ok(byText['Мен Батырмын!'].voice === 'taymas', 'Батыр-X → taymas');
  ok(byText['<slower>Өркенің өссін!</slower>'] && byText['<slower>Өркенің өссін!</slower>'].voice === 'tomiris', 'Әже → tomiris, slower');
  ok(logs.some((l) => /retry 1\/5 «Бұл 429/.test(l) && /429/.test(l)), '429 is retried with a wait');
  ok(existsSync(join(web, 'audio-cast', 'verify.csv')) && mock.log.asr === 6, 'every new file was transcribed back');
  ok(Object.keys(JSON.parse(readFileSync(join(web, 'audio-packs.js'), 'utf8').replace(/^[\s\S]*?= /, '').replace(/;\s*$/, ''))).sort().join() === 'cast,tomiris', 'index merges every pack');

  // 3b) verify.csv accumulates across runs (a killed run keeps its checks): a second --verify run in 2 steps
  const vcsv = join(web, 'audio-vv', 'verify.csv'), vargs = [phrases, '--voice', 'tomiris', '--pack', 'vv', '--transport', 'http', '--verify', '--base-url', mock.url];
  await run([...vargs, '--limit', '2'], env, log);
  const rows1 = readFileSync(vcsv, 'utf8').trim().split('\n').length - 1;
  await run(vargs, env, log);
  const rows2 = readFileSync(vcsv, 'utf8').trim().split('\n').length - 1;
  ok(rows1 === 2 && rows2 === 4, 'verify.csv keeps earlier rows: ' + rows1 + ' → ' + rows2);
  ok(JSON.parse(readFileSync(join(web, 'audio-vv', 'manifest.json'), 'utf8')).keys.length === 4, 'manifest covers both runs');

  // 3c) skip.json keeps a line this voice gets wrong out of the pack (and deletes its file)
  writeFileSync(join(web, 'audio-vv', 'skip.json'), JSON.stringify({ [key('Сәлем!')]: 'test' }));
  const asrBefore = mock.log.asr;
  await run(vargs, env, log);
  const vman = JSON.parse(readFileSync(join(web, 'audio-vv', 'manifest.json'), 'utf8'));
  ok(vman.keys.length === 3 && !vman.keys.includes(key('Сәлем!')) && !existsSync(join(web, 'audio-vv', key('Сәлем!') + '.mp3')) && mock.log.asr === asrBefore, 'skip.json drops the line and does not re-render it');

  // 3d) hero mode: cast tags are re-voiced into audio/<key>.mp3 with --verify, logged in heroes-fs.json, and a rerun skips them
  const castFile = join(web, 'cast.json');
  writeFileSync(castFile, JSON.stringify({ cast: { M1: { voice: 'taymas', pitchSt: 2 }, AZHE: { voice: 'tomiris', pitchSt: -1 } } }));
  logs.length = 0;
  code = await run([phrases, '--heroes', castFile, '--transport', 'http', '--verify', '--base-url', mock.url], env, log);
  const heroLog = JSON.parse(readFileSync(join(web, 'audio', 'heroes-fs.json'), 'utf8'));
  ok(code === 0 && Object.keys(heroLog).length === 2 && heroLog[key('Мен Батырмын!')].voice === 'taymas', 'hero lines rendered and logged: ' + logs.join(' | '));
  ok(existsSync(join(web, 'audio', key('Өркенің өссін!') + '.mp3')) && !logs.some((l) => /retry/.test(l)), 'hero files written with --verify and no retries');
  const speakBefore = mock.log.speak.length;
  await run([phrases, '--heroes', castFile, '--transport', 'http', '--base-url', mock.url], env, log);
  ok(mock.log.speak.length === speakBefore, 'a second hero run resumes: nothing re-rendered');

  // 4) a bad key stops at once with a clear message and keeps what was made
  await assert.rejects(run([phrases, '--voice', 'tomiris', '--pack', 'bad', '--transport', 'http', '--base-url', mock.url], { ...env, FS_API_KEY: 'nope' }, log), /key rejected \(401\)/); checks++;
  await assert.rejects(run([phrases, '--voice', 'tomiris'], { QV_WEB_DIR: web }, log), /FS_API_KEY is not set/); checks++;

  // 5) --prune drops phrases that left the list
  writeFileSync(phrases, JSON.stringify(P.slice(0, 2)));
  await run([phrases, '--voice', 'tomiris', '--prune', '--base-url', mock.url], env, log);
  ok(readdirSync(join(web, 'audio-tomiris')).filter((f) => f.endsWith('.mp3')).length === 2, '--prune removes stale files');
  ok(mock.log.keys.has(KEY) && ![...mock.log.keys].some((k) => k && k !== KEY && k !== 'nope'), 'only the given key is ever sent');
} finally {
  await mock.close();
  rmSync(web, { recursive: true, force: true });
}
console.log('voice packs: ' + checks + ' checks passed');
