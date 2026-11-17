// Fit every scene to its voiced lines (ffprobe) → src/timing.json, for the three versions.
//  kz / pl:     lead-in, the line, a tail; a scene is never shorter than the storyboard's nominal length
//  bilingual:   the Kazakh line, a short pause, the Polish line (paired phrases) — longer than 32 s by design
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const sb = JSON.parse(readFileSync(join(ROOT, 'storyboard/storyboard.json'), 'utf8'));
const dur = (f) => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', join(ROOT, 'public', f)]).toString());
const LEAD = 0.55, TAIL = 0.65, GAP = 0.4, r2 = (x) => Math.round(x * 100) / 100;

function version(langs) {
  let t = 0;
  const scenes = sb.scenes.map((s) => {
    const lines = []; let at = LEAD;
    langs.forEach((lang, k) => {
      const file = `audio/${lang}/${s.id}.wav`, d = dur(file);
      lines.push({ lang, file, at: r2(at), dur: r2(d), text: s.line[lang], speaker: s.speaker });
      at += d + (k < langs.length - 1 ? GAP : 0);
    });
    const nominal = s.nominal[1] - s.nominal[0], length = r2(Math.max(langs.length === 1 ? nominal : 0, at + TAIL + (s.id === 's6' ? 0.6 : 0)));
    const out = { id: s.id, from: r2(t), dur: length, lines };
    t += length; return out;
  });
  return { total: r2(t), scenes };
}
const timing = { fps: sb.format.fps, kz: version(['kz']), pl: version(['pl']), bilingual: version(['kz', 'pl']) };
writeFileSync(join(ROOT, 'src/timing.json'), JSON.stringify(timing, null, 2) + '\n');
for (const v of ['kz', 'pl', 'bilingual']) console.log(v.padEnd(10), timing[v].total + ' s', timing[v].scenes.map((s) => s.id + ' ' + s.dur).join(' · '));

// lip-sync: loudness envelope of every line at the video fps (0..1), from the 16-bit PCM of the WAV
function envelope(file, fps) {
  const b = readFileSync(join(ROOT, 'public', file));
  let o = 12; while (o < b.length && b.toString('ascii', o, o + 4) !== 'data') o += 8 + b.readUInt32LE(o + 4);
  const sr = b.readUInt32LE(24), ch = b.readUInt16LE(22), start = o + 8, n = (b.length - start) / 2 / ch, step = Math.round(sr / fps), out = [];
  for (let i = 0; i < n; i += step) { let s = 0, c = 0; for (let j = i; j < Math.min(n, i + step); j++) { const v = b.readInt16LE(start + j * 2 * ch) / 32768; s += v * v; c++; } out.push(Math.sqrt(s / Math.max(1, c))); }
  const max = Math.max(...out) || 1;
  return out.map((v) => Math.round(Math.min(1, v / max * 1.4) * 100) / 100);
}
const lips = {};
for (const lang of ['kz', 'pl']) for (const s of sb.scenes) lips[`audio/${lang}/${s.id}.wav`] = envelope(`audio/${lang}/${s.id}.wav`, timing.fps);
writeFileSync(join(ROOT, 'src/lipsync.json'), JSON.stringify(lips) + '\n');
console.log('lipsync', Object.keys(lips).length, 'lines');
