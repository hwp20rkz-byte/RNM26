#!/usr/bin/env node
/**
 * Voice packs from the Freedom Speech API (npm «freedomspeech», https://freedomspeech.kz/docs).
 *
 * Runs on a developer machine, never in the app: the API key stays here and the APK ships plain mp3
 * files, so the game keeps working offline. Same file keys as tools/make-audio.py (FNV of the text).
 *
 *   node tools/collect-phrases.js > /tmp/phrases.json
 *   export FS_API_KEY=...                                   # from console.freedomspeech.kz, never committed
 *   node tools/make-audio-fs.mjs /tmp/phrases.json --voice tomiris --limit 20     # listen first
 *   node tools/make-audio-fs.mjs /tmp/phrases.json --voice tomiris                # the whole narrator pack
 *   node tools/make-audio-fs.mjs /tmp/phrases.json --voice tomiris --cast         # + characters with emotions
 *   node tools/make-audio-fs.mjs /tmp/phrases.json --voice taymas
 *   node tools/make-audio-fs.mjs --list-voices
 *   node tools/make-audio-fs.mjs /tmp/phrases.json --clone teacher.wav --pack apai --label "Баян апай" \
 *        --base-url https://<host where /api/voice-clone is published>          # only with the speaker's consent
 *
 * Output: web/audio-<pack>/<key>.mp3 + manifest.json; web/audio-packs.js is rebuilt from every manifest
 * (the game lists those packs in Profile → Voice). Only missing files are synthesised, so a run can be
 * stopped and resumed. --prune deletes files no longer in the phrase list. --verify transcribes each new
 * file back with the API's recogniser and writes web/audio-<pack>/verify.csv with the similarity.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FreedomSpeech, AuthenticationError, FreedomSpeechError, concatBytes, pcm16ToWav } from 'freedomspeech';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WEB = join(ROOT, 'web');

/* ------------------------------------------------------------------ options */
const HELP = `usage: make-audio-fs.mjs <phrases.json> [--voice tomiris|taymas|<catalog id>] [--pack <id>] [--label <name>]
  [--cast] [--model freedomspeech|freedomspeech-flash] [--transport stream|http] [--clone <ref audio>]
  [--limit N] [--verify] [--prune] [--dry-run] [--base-url <url>] [--list-voices]
  [--heroes <cast.json>]   hero lines in catalog voices, written over web/audio/<key>.mp3 (see tools/voice_studio/fs-cast.json)`;
export function parseArgs(argv) {
  const o = { voice: 'tomiris', transport: 'stream', model: 'freedomspeech', cast: false, verify: false, prune: false, dry: false, limit: Infinity, list: false };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], v = () => { if (i + 1 >= argv.length) throw new Error(a + ' needs a value'); return argv[++i]; };
    switch (a) {
      case '--voice': o.voice = v().toLowerCase(); break;
      case '--pack': o.pack = v().toLowerCase(); break;
      case '--label': o.label = v(); break;
      case '--model': o.model = v(); break;
      case '--transport': o.transport = v(); break;
      case '--clone': o.clone = v(); break;
      case '--limit': o.limit = +v(); break;
      case '--base-url': o.baseUrl = v(); break;
      case '--cast': o.cast = true; break;
      case '--verify': o.verify = true; break;
      case '--prune': o.prune = true; break;
      case '--dry-run': o.dry = true; break;
      case '--list-voices': o.list = true; break;
      case '--heroes': o.heroes = v(); break;
      case '-h': case '--help': o.help = true; break;
      default: if (a.startsWith('--')) throw new Error('unknown option ' + a); rest.push(a);
    }
  }
  o.phrases = rest[0];
  if (o.clone && !o.pack) throw new Error('--clone needs --pack <id> (a name for the cloned voice)');
  o.pack = o.pack || o.voice;
  if (!/^[a-z0-9_-]{2,24}$/.test(o.pack) || ['iseke', 'issai'].includes(o.pack)) throw new Error('bad pack id «' + o.pack + '» (a-z, 0-9; not iseke/issai)');
  if (!['stream', 'http'].includes(o.transport)) throw new Error('--transport is stream or http');
  return o;
}

/* ------------------------------------------------------------------ casting */
// Voice tags from collect-phrases.js → Freedom Speech voice, emotion (tomiris only) and prosody.
// Elders speak <slower>; children and heroes keep the narrator speed. Without --cast only NARR lines are
// rendered and the characters keep their bundled ISSAI voices (like the ISEKE pack).
export const CAST = {
  NARR: { gender: 'f', emotion: 'neutral' }, APAI: { gender: 'f', emotion: 'neutral' },
  ANEL: { gender: 'f', emotion: 'happy' }, T4: { gender: 'f', emotion: 'happy' },                 // Әнел, Айсұлу Neon
  AZHE: { gender: 'f', emotion: 'neutral', slower: true }, E4: { gender: 'f', emotion: 'neutral', slower: true },   // Әже, Әже-Bot
  ALIBEK: { gender: 'm' }, ZHALKAU: { gender: 'm', slower: true }, M1: { gender: 'm' }, K1: { gender: 'm' },
  ATA: { gender: 'm', slower: true }, E1: { gender: 'm' }, ARCH: { gender: 'm' }
};
const FEMALE = 'tomiris', MALE = 'taymas';
/** What to send for one phrase, or null when the phrase is not part of this pack. */
export function castLine(tag, opts) {
  tag = tag || 'NARR';
  if (!opts.cast && tag !== 'NARR') return null;
  const c = CAST[tag] || CAST.NARR;
  let voice = opts.voice;
  if (opts.cast && tag !== 'NARR' && !opts.clone) voice = c.gender === 'm' ? MALE : FEMALE;
  return { voice, emotion: voice === 'tomiris' ? c.emotion || 'neutral' : undefined, slower: !!c.slower };
}
export function textFor(text, line) { return line.slower ? '<slower>' + text + '</slower>' : text; }

/* ------------------------------------------------------------------ helpers */
const TRIM = 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse';
function encode(wavBytes, dst, pitchSt = 0) {
  const tmp = join(tmpdir(), 'fs-' + process.pid + '-' + Math.random().toString(36).slice(2) + '.wav');
  writeFileSync(tmp, wavBytes);
  const chain = [TRIM];
  if (Math.abs(pitchSt) > 0.01) {                 // same pitch shaping as tools/make-audio.py (tempo kept)
    const rate = Buffer.from(wavBytes).readUInt32LE(24) || 24000, k = 2 ** (pitchSt / 12);
    chain.push(`asetrate=${Math.round(rate * k)},aresample=${rate},atempo=${(1 / k).toFixed(5)}`);
  }
  chain.push('loudnorm=I=-16:TP=-1.5');
  const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', tmp, '-af', chain.join(','), '-ac', '1', '-ar', '22050', '-b:a', '32k', dst]);
  rmSync(tmp, { force: true });
  if (r.status !== 0) throw new Error('ffmpeg: ' + String(r.stderr || r.error));
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Normalised similarity 0..1 (Levenshtein on letters only) for --verify. */
export function similarity(a, b) {
  const n = (s) => String(s).toLowerCase().replace(/[^a-zа-яёәғқңөұүһі0-9 ]/gi, '').replace(/\s+/g, ' ').trim();
  a = n(a); b = n(b);
  if (!a && !b) return 1;
  const d = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0]; d[0] = i;
    for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = t; }
  }
  return 1 - d[b.length] / Math.max(a.length, b.length);
}

/** Rebuild web/audio-packs.js from every web/audio-<id>/manifest.json (keys inline: file:// can't fetch JSON). */
export function writePacksIndex(web = WEB) {
  const packs = {};
  for (const d of readdirSync(web)) {
    const m = join(web, d, 'manifest.json');
    if (!d.startsWith('audio-') || !existsSync(m)) continue;
    const j = JSON.parse(readFileSync(m, 'utf8'));
    const keys = {}; j.keys.forEach((k) => { keys[k] = 1; });
    packs[j.id] = { label: j.label, by: j.by, gender: j.gender, keys };
  }
  writeFileSync(join(web, 'audio-packs.js'), '/* generated by tools/make-audio-fs.mjs — voice packs offered in Profile → Voice */\nwindow.QAUDIO_PACKS = ' + JSON.stringify(packs) + ';\n');
  return packs;
}

/* ------------------------------------------------------------------ main */
export async function run(argv, env = process.env, log = console.log) {
  const o = parseArgs(argv);
  if (o.help) { log(HELP); return 0; }
  const client = new FreedomSpeech({ apiKey: env.FS_API_KEY, baseUrl: o.baseUrl || env.FS_BASE_URL || undefined, timeoutMs: 90_000 });
  if (o.list) {
    const vs = await client.voices();
    vs.forEach((v) => log([v.id, v.name, v.type, v.language].filter(Boolean).join('\t')));
    return 0;
  }
  if (!o.phrases) { log(HELP); return 2; }
  if (!env.FS_API_KEY && !o.dry) throw new Error('FS_API_KEY is not set (key from console.freedomspeech.kz; keep it out of the repo)');

  const all = JSON.parse(readFileSync(o.phrases, 'utf8'));
  const web = env.QV_WEB_DIR || WEB;      // tests point this at a temp copy
  if (o.heroes) return runHeroes(o, all, web, client, log, env);
  const out = join(web, 'audio-' + o.pack);
  mkdirSync(out, { recursive: true });
  const ref = o.clone ? readFileSync(o.clone) : null;
  const wanted = [];
  // a line with no letters (an emoji card such as ⚽) has nothing to say: the service answers 502 to it
  for (const p of all) { const line = castLine(p.voice, o); if (line && /\p{L}/u.test(p.text)) wanted.push({ ...p, line }); }
  const missing = wanted.filter((p) => !existsSync(join(out, p.key + '.mp3'))), todo = missing.slice(0, o.limit);
  log(`pack «${o.pack}»: ${wanted.length} phrases, ${wanted.length - missing.length} ready, ${todo.length} to synthesise` + (o.dry ? ' (dry run)' : ''));
  if (o.dry) { todo.slice(0, 10).forEach((p) => log('  ' + p.key + '  ' + JSON.stringify(p.line) + '  ' + textFor(p.text, p.line))); return 0; }

  let stream = null;
  async function synth(p) {
    const text = textFor(p.text, p.line);
    if (ref) return client.cloneVoice(text, { referenceAudio: ref, language: 'kk' });
    if (o.transport === 'http') return client.speak(text, { voice: p.line.voice, language: 'kk', emotion: p.line.emotion, model: o.model });
    if (!stream) stream = await client.ttsStream();
    const chunks = [];
    for await (const c of stream.synthesize(text, p.line.voice, { model: o.model, language: 'kk', emotion: p.line.emotion })) chunks.push(c);
    return pcm16ToWav(concatBytes(chunks), stream.sampleRate || 24000);
  }

  // Manifest and verify.csv are flushed every 50 files, so a run that is killed keeps what it made and checked.
  const keep = new Set(wanted.map((p) => p.key)), csvPath = join(out, 'verify.csv');
  const verify = new Map(readVerifyCsv(csvPath).filter((r) => keep.has(r[0])).map((r) => [r[0], r]));
  const label = o.label || (o.pack === 'tomiris' ? 'Томирис' : o.pack === 'taymas' ? 'Таймас' : o.pack);
  function flush() {
    const keys = readdirSync(out).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4)).filter((k) => keep.has(k)).sort();
    writeFileSync(join(out, 'manifest.json'), JSON.stringify({
      id: o.pack, label, by: 'Freedom Speech' + (o.clone ? ' (voice clone)' : ''), gender: o.voice === 'taymas' ? 'm' : 'f',
      voice: o.clone ? 'clone' : o.voice, model: o.model, transport: o.transport, cast: o.cast, generated: new Date().toISOString().slice(0, 10), keys
    }, null, 1) + '\n');
    if (verify.size) {
      const rows = [...verify.values()].sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));
      const csv = ['key,similarity,text,heard'].concat(rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(',')));
      writeFileSync(csvPath, csv.join('\n') + '\n');
    }
    return keys;
  }
  let made = 0, failed = 0;
  for (const p of todo) {
    let ok = false;
    for (let attempt = 0; attempt < 5 && !ok; attempt++) {
      try {
        const wav = await synth(p);
        if (!wav || wav.length < 1000) throw Object.assign(new Error('empty audio'), { status: 502 });
        encode(wav, join(out, p.key + '.mp3'));
        if (o.verify) {
          const t = await client.transcribe(wav, { language: 'kk', prettify: false, filename: p.key + '.wav' });
          verify.set(p.key, [p.key, similarity(p.text, t.text).toFixed(2), p.text, t.text]);
        }
        ok = true; made++;
      } catch (e) {
        if (e instanceof AuthenticationError || (e instanceof FreedomSpeechError && e.status === 402)) {
          throw new Error((e.status === 402 ? 'payment required (402)' : 'key rejected (401)') + ' — stopped after ' + made + ' files; rerun resumes');
        }
        const status = e && e.status, code = e && e.code;
        if (stream) { try { stream.close(); } catch { /* ignore */ } stream = null; }
        const wait = status === 429 ? 15000 * (attempt + 1) : 1000 * 2 ** attempt;
        log(`  retry ${attempt + 1}/5 «${p.text.slice(0, 40)}»: ${status || code || ''} ${e && e.message} — waiting ${wait / 1000}s`);
        await sleep(env.FS_RETRY_SCALE ? wait * +env.FS_RETRY_SCALE : wait);
      }
    }
    if (!ok) failed++;
    if (made && made % 50 === 0) { log(`  ${made} / ${todo.length}`); flush(); }
  }
  if (stream) stream.close();

  if (o.prune) for (const f of readdirSync(out)) if (f.endsWith('.mp3') && !keep.has(f.slice(0, -4))) rmSync(join(out, f));
  const keys = flush();
  if (verify.size) {
    const low = [...verify.values()].filter((r) => +r[1] < 0.8).length;
    log(`verify: ${verify.size} checked, ${low} below 0.80 similarity → ${join(out, 'verify.csv')}`);
  }
  const packs = writePacksIndex(web);
  log(`done: ${made} new, ${failed} failed, ${keys.length} in pack «${o.pack}»; packs: ${Object.keys(packs).join(', ') || '—'}`);
  return failed ? 1 : 0;
}

/** Parse a verify.csv written by flush() back into rows (quoted CSV, "" escapes). */
function readVerifyCsv(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8').split('\n').slice(1).filter(Boolean)
    .map((line) => [...line.matchAll(/"((?:[^"]|"")*)"/g)].map((m) => m[1].replace(/""/g, '"')))
    .filter((r) => r.length === 4);
}

/**
 * Hero mode: every line whose voice tag is in the cast file is spoken by that catalog voice (optionally pitch-
 * shifted, e.g. to make an adult voice sound like a 10-year-old) and replaces web/audio/<key>.mp3 — the file the
 * game plays for that hero whichever narrator is chosen. web/audio/heroes-fs.json records what was rendered with
 * which voice, so reruns skip done lines and a changed cast re-renders only that hero.
 */
async function runHeroes(o, all, web, client, log, env) {
  const cast = JSON.parse(readFileSync(o.heroes, 'utf8')).cast;
  const out = join(web, 'audio'), logPath = join(out, 'heroes-fs.json');
  mkdirSync(out, { recursive: true });
  const done = existsSync(logPath) ? JSON.parse(readFileSync(logPath, 'utf8')) : {};
  const sig = (c) => c.voice + '|' + (c.pitchSt || 0) + '|' + (c.emotion || '') + '|' + (c.slower ? 1 : 0);
  const wanted = all.filter((p) => cast[p.voice]);
  const todo = wanted.filter((p) => !done[p.key] || done[p.key].sig !== sig(cast[p.voice])).slice(0, o.limit);
  log(`heroes ${Object.keys(cast).join(', ')}: ${wanted.length} lines, ${todo.length} to synthesise` + (o.dry ? ' (dry run)' : ''));
  if (o.dry) { todo.slice(0, 10).forEach((p) => log('  ' + p.voice + '  ' + p.text)); return 0; }
  // Manifest and verify.csv are flushed every 50 files, so a run that is killed keeps what it made and checked.
  const keep = new Set(wanted.map((p) => p.key)), csvPath = join(out, 'verify.csv');
  const verify = new Map(readVerifyCsv(csvPath).filter((r) => keep.has(r[0])).map((r) => [r[0], r]));
  const label = o.label || (o.pack === 'tomiris' ? 'Томирис' : o.pack === 'taymas' ? 'Таймас' : o.pack);
  function flush() {
    const keys = readdirSync(out).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4)).filter((k) => keep.has(k)).sort();
    writeFileSync(join(out, 'manifest.json'), JSON.stringify({
      id: o.pack, label, by: 'Freedom Speech' + (o.clone ? ' (voice clone)' : ''), gender: o.voice === 'taymas' ? 'm' : 'f',
      voice: o.clone ? 'clone' : o.voice, model: o.model, transport: o.transport, cast: o.cast, generated: new Date().toISOString().slice(0, 10), keys
    }, null, 1) + '\n');
    if (verify.size) {
      const rows = [...verify.values()].sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));
      const csv = ['key,similarity,text,heard'].concat(rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(',')));
      writeFileSync(csvPath, csv.join('\n') + '\n');
    }
    return keys;
  }
  let made = 0, failed = 0;
  for (const p of todo) {
    const c = cast[p.voice], text = c.slower ? '<slower>' + p.text + '</slower>' : p.text;
    let ok = false;
    for (let attempt = 0; attempt < 5 && !ok; attempt++) {
      try {
        const wav = await client.speak(text, { voice: c.voice, language: 'kk', emotion: c.emotion });
        if (!wav || wav.length < 1000) throw Object.assign(new Error('empty audio'), { status: 502 });
        encode(wav, join(out, p.key + '.mp3'), c.pitchSt || 0);
        if (o.verify) {
          const t = await client.transcribe(wav, { language: 'kk', prettify: false, filename: p.key + '.wav' });
          verify.push([p.key, p.voice, similarity(p.text, t.text).toFixed(2), p.text, t.text]);
        }
        done[p.key] = { tag: p.voice, voice: c.voice, sig: sig(c) };
        ok = true; made++;
      } catch (e) {
        if (e instanceof AuthenticationError || (e instanceof FreedomSpeechError && e.status === 402)) {
          writeFileSync(logPath, JSON.stringify(done, null, 0));
          throw new Error((e.status === 402 ? 'payment required (402)' : 'key rejected (401)') + ' — stopped after ' + made + ' lines; rerun resumes');
        }
        const wait = e && e.status === 429 ? 15000 * (attempt + 1) : 1000 * 2 ** attempt;
        log(`  retry ${attempt + 1}/5 «${p.text.slice(0, 40)}»: ${(e && e.status) || ''} ${e && e.message} — waiting ${wait / 1000}s`);
        await sleep(env.FS_RETRY_SCALE ? wait * +env.FS_RETRY_SCALE : wait);
      }
    }
    if (!ok) failed++;
  }
  writeFileSync(logPath, JSON.stringify(done, null, 0) + '\n');
  if (verify.length) {
    const csv = ['key,hero,similarity,text,heard'].concat(verify.sort((a, b) => a[2] - b[2]).map((r) => r.map((x) => '"' + String(x).replace(/"/g, '""') + '"').join(',')));
    writeFileSync(join(web, '..', 'voice_studio', 'heroes-fs-verify.csv'), csv.join('\n') + '\n');
    log(`verify: ${verify.length} checked, ${verify.filter((r) => +r[2] < 0.8).length} below 0.80`);
  }
  log(`done: ${made} hero lines, ${failed} failed`);
  return failed ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run(process.argv.slice(2)).then((c) => { process.exitCode = c; }, (e) => { console.error('error:', e.message); process.exitCode = 1; });
}
