// E2E for «Лего-Сөз»: blocks on a phone (one wrong ending costs a life; a voiced and a dropped-vowel task are
// screenshotted after the snap), the pose animator on desktop with ⏭ TEST and one wrong pick.
// Usage: node tests/e2e/lego.e2e.cjs [outDir]   (needs: npm run build; Playwright + Chromium)
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const OUT = process.argv[2] || path.join(require('os').tmpdir(), 'qv3d-e2e'); fs.mkdirSync(OUT, { recursive: true });
const BASE = 'file://' + path.resolve(__dirname, '../../dist/index.html');

async function run(b, mode, vw, vh, test) {
  const p = await b.newPage({ viewport: { width: vw, height: vh } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  await p.goto(BASE + '?e2e=1' + (test ? '&test=1' : '') + '#/games/lego'); await p.waitForTimeout(3500);
  await p.click(`[data-mode="${mode}"]`); await p.waitForTimeout(1200);
  const st = () => p.evaluate(() => window.__lego());
  let missed = 0; const seen = new Set();
  for (let i = 0; i < 10; i++) {
    await p.waitForFunction((i) => window.__lego().phase === 'aim' && window.__lego().i === i, i, { timeout: 15000 });
    const s = await st(); seen.add(mode === 'blocks' ? s.change : s.pose);
    if (i === 0) {
      await p.click(`[data-opt="${s.options.find((o) => o !== s.answer)}"]`); await p.waitForTimeout(300);
      const w = await st(); if (w.phase !== 'miss' || w.lives !== 2) throw new Error('a wrong pick must cost a life'); missed++;
    }
    if (test) await p.click('[data-test-skip]'); else await p.click(`[data-opt="${s.answer}"]`);
    const shot = mode === 'blocks' ? s.change : s.pose;
    if (!fs.existsSync(`${OUT}/lego-${mode}-${shot}.png`)) { await p.waitForTimeout(1100); await p.screenshot({ path: `${OUT}/lego-${mode}-${shot}.png` }); }
  }
  await p.waitForFunction(() => ['victory', 'defeat'].includes(window.__lego().phase), null, { timeout: 15000 });
  await p.waitForTimeout(500);
  const end = await p.$eval('#lego-sum', (e) => e.closest('[role=dialog]').innerText.replace(/\s+/g, ' ').slice(0, 100)).catch(() => 'NO END');
  const f = await st(); await p.close();
  const ok = f.phase === 'victory' && f.lives === 3 - missed && (mode !== 'blocks' || (seen.has('voiced') || seen.has('dropped'))) && !errs.length;
  console.log((ok ? 'PASS ' : 'FAIL ') + mode + ' ' + vw + 'x' + vh + (test ? ' ⏭TEST' : '') + ' seen ' + [...seen].join('/') + ' → ' + end + (errs.length ? ' | errors: ' + errs.join(' / ') : ''));
  return ok;
}

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const r = [await run(b, 'blocks', 400, 860, false), await run(b, 'pose', 1280, 720, true)];
  await b.close(); if (!r.every(Boolean)) process.exit(1);
})();
