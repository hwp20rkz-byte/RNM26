// Quality control of the rendered videos: format (ffprobe), loudness, and one control frame per scene (ffmpeg) plus a
// contact sheet per version — out/qc/<version>-sheet.png — to check by eye that no text is cut and the lines are crisp.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..'), QC = join(ROOT, 'out/qc');
mkdirSync(QC, { recursive: true });
const timing = JSON.parse(readFileSync(join(ROOT, 'src/timing.json'), 'utf8'));
const files = { bilingual: 'almaty_zoo_kz_pl_bilingual.mp4', kz: 'almaty_zoo_kz.mp4', pl: 'almaty_zoo_pl.mp4' };
for (const [v, f] of Object.entries(files)) {
  const path = join(ROOT, 'out', f);
  if (!existsSync(path)) { console.log('MISSING', f); process.exitCode = 1; continue; }
  const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height,avg_frame_rate:format=duration,size', '-of', 'json', path]).toString());
  const vid = probe.streams.find((s) => s.codec_type === 'video'), aud = probe.streams.find((s) => s.codec_type === 'audio');
  let lufs = '?';
  try { const err = execFileSync('sh', ['-c', `ffmpeg -hide_banner -i "${path}" -af loudnorm=print_format=json -f null - 2>&1 | tail -12`]).toString(); lufs = JSON.parse(err.slice(err.indexOf('{'))).input_i; } catch { /* keep ? */ }
  const ok = vid.width === Number(process.env.W ?? 720) && vid.height === Number(process.env.H ?? 1280) && vid.avg_frame_rate === '60/1' && !!aud && Math.abs(+probe.format.duration - timing[v].total) < 0.2;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${f}: ${vid.width}×${vid.height} ${vid.codec_name} ${vid.avg_frame_rate} fps, ${(+probe.format.duration).toFixed(2)} s (plan ${timing[v].total}), audio ${aud ? aud.codec_name : 'none'}, ${(probe.format.size / 1e6).toFixed(1)} MB, ${lufs} LUFS`);
  if (!ok) process.exitCode = 1;
  const shots = timing[v].scenes.map((s) => (s.from + Math.min(s.dur - 0.3, s.dur * 0.62)).toFixed(2));
  shots.forEach((t, i) => execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', t, '-i', path, '-frames:v', '1', join(QC, `${v}-s${i + 1}.png`)]));
  // a contact sheet at 1/4 size: 6 scenes in a 3×2 grid
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...shots.flatMap((_, i) => ['-i', join(QC, `${v}-s${i + 1}.png`)]), '-filter_complex',
    shots.map((_, i) => `[${i}:v]scale=540:960[s${i}]`).join(';') + ';' + shots.map((_, i) => `[s${i}]`).join('') + 'xstack=inputs=6:layout=0_0|540_0|1080_0|0_960|540_960|1080_960[o]', '-map', '[o]', join(QC, `${v}-sheet.png`)]);
}
console.log('control frames →', QC);
