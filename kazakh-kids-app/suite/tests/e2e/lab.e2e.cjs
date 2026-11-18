// E2E for «Табиғат зертханасы»: sending 8 animals home on a phone (one wrong habitat costs a life; screenshots),
// food chains on desktop with ⏭ TEST.
// Usage: node tests/e2e/lab.e2e.cjs [outDir]   (needs: npm run build; Playwright + Chromium)
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const OUT = process.argv[2] || path.join(require('os').tmpdir(), 'qv3d-e2e'); fs.mkdirSync(OUT, { recursive: true });
const BASE = 'file://' + path.resolve(__dirname, '../../dist/index.html');

async function run(b, mode, vw, vh, test) {
  const p = await b.newPage({ viewport: { width: vw, height: vh } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  await p.goto(BASE + '?e2e=1' + (test ? '&test=1' : '') + '#/games/lab'); await p.waitForTimeout(3500);
  await p.click(`[data-mode="${mode}"]`); await p.waitForTimeout(1200);
  const st = () => p.evaluate(() => window.__lab());
  let missed = 0; const answers = [];
  const N = mode === 'homes' ? 8 : 6;
  for (let i = 0; i < N; i++) {
    await p.waitForFunction((i) => window.__lab().phase === 'aim' && window.__lab().i === i, i, { timeout: 15000 });
    const s = await st(); answers.push(s.answer);
    if (i === 0) {
      await p.click(`[data-opt="${s.options.find((o) => o !== s.answer)}"]`); await p.waitForTimeout(300);
      const w = await st(); if (w.phase !== 'miss' || w.lives !== 2) throw new Error('a wrong pick must cost a life'); missed++;
    }
    if (mode === 'chains' && i === 0) await p.screenshot({ path: `${OUT}/lab-chains-${vw}.png` });
    if (test) await p.click('[data-test-skip]'); else await p.click(`[data-opt="${s.answer}"]`);
    if (mode === 'homes' && [0, 3, 7].includes(i)) { await p.waitForTimeout(1300); await p.screenshot({ path: `${OUT}/lab-homes-${i + 1}-${vw}.png` }); }
  }
  await p.waitForFunction(() => ['victory', 'defeat'].includes(window.__lab().phase), null, { timeout: 15000 });
  await p.waitForTimeout(1500); await p.screenshot({ path: `${OUT}/lab-${mode}-end-${vw}.png` });
  const end = await p.$eval('#lab-sum', (e) => e.closest('[role=dialog]').innerText.replace(/\s+/g, ' ').slice(0, 100)).catch(() => 'NO END');
  const f = await st(); await p.close();
  const orderOk = mode !== 'homes' || f.placed === 8;
  const ok = f.phase === 'victory' && f.lives === 3 - missed && orderOk && !errs.length;
  console.log((ok ? 'PASS ' : 'FAIL ') + mode + ' ' + vw + 'x' + vh + (test ? ' ⏭TEST' : '') + ' answers ' + answers.join(',') + ' → ' + end + (errs.length ? ' | errors: ' + errs.join(' / ') : ''));
  return ok;
}

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const r = [await run(b, 'homes', 400, 860, false), await run(b, 'chains', 1280, 720, true)];
  await b.close(); if (!r.every(Boolean)) process.exit(1);
})();
