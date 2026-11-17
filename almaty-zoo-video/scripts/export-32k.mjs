// Key frames as pure vector .svg files, plus 32K rasters (17280×30720) to check that the line art stays razor sharp.
//   npm run export:32k-frames                 → frames-32k/*.svg (every scene, every version) + 32K PNG of two key frames
//   npm run export:32k-frames -- --all-png    → a 32K PNG for every key frame (≈ 1–2 min and 30–80 MB each)
// The SVG comes from the same component the video uses (FrameSVG), rendered with react-dom/server; the raster from
// sharp (librsvg) at density 16 × 72 dpi. A 1600×1600 crop of each 32K PNG is saved for a quick look at the lines.
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..'), OUT = join(ROOT, 'frames-32k'), CACHE = join(ROOT, '.cache');
mkdirSync(OUT, { recursive: true }); mkdirSync(CACHE, { recursive: true });
const allPng = process.argv.includes('--all-png');
const entry = join(CACHE, 'svg-entry.tsx');
writeFileSync(entry, `
import { renderToStaticMarkup } from 'react-dom/server';
import { FrameSVG } from '../src/Video';
export const svgOf = (mode: 'bilingual' | 'kz' | 'pl', frame: number, fps: number) => renderToStaticMarkup(<FrameSVG mode={mode} frame={frame} fps={fps} />);
`);
const bundle = join(CACHE, 'svg-entry.mjs');
await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', outfile: bundle, jsx: 'automatic', loader: { '.json': 'json' }, logLevel: 'error',
  banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" } });
const { svgOf } = await import(pathToFileURL(bundle).href);
const timing = JSON.parse(readFileSync(join(ROOT, 'src/timing.json'), 'utf8')), fps = timing.fps;

const keys = [];
for (const mode of ['bilingual', 'kz', 'pl']) for (const s of timing[mode].scenes) keys.push({ mode, id: s.id, frame: Math.round((s.from + Math.min(s.dur - 0.3, s.dur * 0.62)) * fps) });
for (const k of keys) {
  // explicit size + xmlns so any SVG viewer (and Inkscape) opens it at 1080×1920 units with infinite resolution
  const svg = svgOf(k.mode, k.frame, fps).replace('width="100%" height="100%"', 'width="1080" height="1920"');
  writeFileSync(join(OUT, `${k.mode}-${k.id}.svg`), '<?xml version="1.0" encoding="UTF-8"?>\n' + svg);
}
console.log('svg', keys.length, 'files →', OUT);

// 32K = 16 × the design size. librsvg would need ~8 GB to draw 530 Mpx at once, so the frame is drawn in a 4×4 grid of
// 4320×7680 tiles (each tile is the same SVG with a smaller viewBox — still pure vector maths) and stitched losslessly.
const GX = 4, GY = 4, TW = 17280 / GX, TH = 30720 / GY;
const png = allPng ? keys.filter((k) => k.mode === 'bilingual') : keys.filter((k) => k.mode === 'bilingual' && ['s2', 's4'].includes(k.id));
for (const k of png) {
  const t0 = Date.now(), svg = readFileSync(join(OUT, `${k.mode}-${k.id}.svg`), 'utf8'), tiles = [];
  for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++) {
    const vb = `${(1080 / GX) * gx} ${(1920 / GY) * gy} ${1080 / GX} ${1920 / GY}`;
    const part = svg.replace('width="1080" height="1920"', `width="${TW}" height="${TH}"`).replace('viewBox="0 0 1080 1920"', `viewBox="${vb}"`);
    tiles.push({ input: await sharp(Buffer.from(part), { limitInputPixels: false }).png().toBuffer(), left: gx * TW, top: gy * TH });
  }
  const out = join(OUT, `${k.mode}-${k.id}-32k.png`);
  await sharp({ create: { width: 17280, height: 30720, channels: 4, background: '#ffffff' }, limitInputPixels: false }).composite(tiles).png({ compressionLevel: 6 }).toFile(out);
  const meta = await sharp(out, { limitInputPixels: false }).metadata();
  // crops for a quick look at the line quality: the whole 1080p frame would be 16× smaller than this
  await sharp(out, { limitInputPixels: false }).extract({ left: 6400, top: 8600, width: 1600, height: 1600 }).toFile(join(OUT, `${k.mode}-${k.id}-32k-crop.png`));
  console.log(`${k.mode}-${k.id}: ${meta.width}×${meta.height} (${GX * GY} tiles) in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
