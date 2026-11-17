// Kazakh lines in Freedom Speech catalog voices (the game's child heroes: Әнел → Айша, Әлібек → Арман).
// FS_API_KEY only from the environment — never written to a file. Writes .cache/tts/raw-kz-<scene>.wav, then
// `python3 scripts/tts.py --engine fs` applies the pitch (semitones from storyboard.json) and loudness.
// Every line is transcribed back with the FS recogniser; the similarity is printed (a swallowed word shows here).
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const req = createRequire(join(ROOT, '../kazakh-kids-app/package.json'));
const fsMod = await import(pathToFileURL(req.resolve('freedomspeech')).href);
const FreedomSpeech = fsMod.FreedomSpeech ?? fsMod.default?.FreedomSpeech ?? fsMod.default;
if (!process.env.FS_API_KEY) { console.error('FS_API_KEY is not set'); process.exit(1); }
const sb = JSON.parse(readFileSync(join(ROOT, 'storyboard/storyboard.json'), 'utf8'));
const client = new FreedomSpeech({ apiKey: process.env.FS_API_KEY, timeoutMs: 90_000 });
const out = join(ROOT, '.cache/tts'); mkdirSync(out, { recursive: true });
const norm = (s) => s.toLowerCase().replace(/[^a-zа-яёәіңғүұқөһ ]/g, ' ').replace(/\s+/g, ' ').trim();
function sim(a, b) {   // word-level similarity (share of reference words heard)
  const A = norm(a).split(' '), B = new Set(norm(b).split(' '));
  return A.filter((w) => B.has(w)).length / A.length;
}
for (const s of sb.scenes) {
  const v = sb.voices.kz[s.speaker], text = s.line.kz;
  const wav = await client.speak(text, { voice: v.voice, language: 'kk' });
  writeFileSync(join(out, `raw-kz-${s.id}.wav`), Buffer.from(wav));
  let heard = '';
  try { const t = await client.transcribe(wav, { language: 'kk', prettify: false, filename: s.id + '.wav' }); heard = typeof t === 'string' ? t : (t.text ?? ''); } catch (e) { heard = '(asr failed: ' + e.message + ')'; }
  console.log(`${s.id} ${s.speaker} ${v.voice}: ${(sim(text, heard) * 100).toFixed(0)}% | ${heard}`);
}
