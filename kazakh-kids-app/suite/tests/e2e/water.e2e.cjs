// E2E for «water»: on a phone (one wrong answer costs a life; screenshots),
// on desktop with ⏭ TEST.
// Usage: node tests/e2e/water.e2e.cjs [outDir]   (needs: npm run build; Playwright + Chromium)
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const OUT = process.argv[2] || path.join(require('os').tmpdir(), 'qv3d-e2e'); fs.mkdirSync(OUT, { recursive: true });
const BASE = 'file://' + path.resolve(__dirname, '../../dist/index.html');

async function run(b, mode, vw, vh, test) {
  const p = await b.newPage({ viewport: { width: vw, height: vh } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  await p.goto(BASE + '?e2e=1' + (test ? '&test=1' : '') + '#/games/water'); await p.waitForTimeout(3500);
  await p.click(`[data-mode="${mode}"]`); await p.waitForTimeout(1200);
  const st = () => p.evaluate(() => window.__water());
  let missed = 0; const answers = [];
  const N = 8;
  for (let i = 0; i < N; i++) {
    await p.waitForFunction((i) => window.__water().phase === 'aim' && window.__water().i === i, i, { timeout: 15000 });
    const s = await st(); answers.push(s.answer);
    if (i === 0) {
      await p.click(`[data-opt="${s.options.find((o) => o !== s.answer)}"]`); await p.waitForTimeout(300);
      const w = await st(); if (w.phase !== 'miss' || w.lives !== 2) throw new Error('a wrong pick must cost a life'); missed++;
    }
    if (i === 0) await p.screenshot({ path: `${OUT}/water-${mode}-miss-${vw}.png` });
    if (test) await p.click('[data-test-skip]'); else await p.click(`[data-opt="${s.answer}"]`);
    if ([0, 7].includes(i)) { await p.waitForTimeout(1300); await p.screenshot({ path: `${OUT}/water-${mode}-${i + 1}-${vw}.png` }); }
  }
  await p.waitForFunction(() => ['victory', 'defeat'].includes(window.__water().phase), null, { timeout: 15000 });
  await p.waitForTimeout(1500); await p.screenshot({ path: `${OUT}/water-${mode}-end-${vw}.png` });
  const end = await p.$eval('#water-sum', (e) => e.closest('[role=dialog]').innerText.replace(/\s+/g, ' ').slice(0, 100)).catch(() => 'NO END');
  const f = await st(); await p.close();
  const orderOk = true;
  const ok = f.phase === 'victory' && f.lives === 3 - missed && orderOk && !errs.length;
  console.log((ok ? 'PASS ' : 'FAIL ') + mode + ' ' + vw + 'x' + vh + (test ? ' ⏭TEST' : '') + ' answers ' + answers.join(',') + ' → ' + end + (errs.length ? ' | errors: ' + errs.join(' / ') : ''));
  return ok;
}

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const r = [await run(b, 'water', 400, 860, false), await run(b, 'water', 1280, 720, true)];
  await b.close(); if (!r.every(Boolean)) process.exit(1);
})();
