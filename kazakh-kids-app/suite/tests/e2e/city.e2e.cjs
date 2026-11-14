// E2E for «Қала квесті»: «Бар!» on a phone by tapping the 3D buildings (one wrong building costs a life);
// «Жалқаубек» on desktop with the buttons — one wrong building and one wrong sign, the rest right.
// Usage: node tests/e2e/city.e2e.cjs [outDir]   (needs: npm run build; Playwright + Chromium)
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const OUT = process.argv[2] || path.join(require('os').tmpdir(), 'qv3d-e2e'); fs.mkdirSync(OUT, { recursive: true });
const URL = 'file://' + path.resolve(__dirname, '../../dist/index.html') + '?e2e=1#/games/city';

async function run(b, mode, vw, vh) {
  const p = await b.newPage({ viewport: { width: vw, height: vh } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  await p.goto(URL); await p.waitForTimeout(3500);
  await p.click(`[data-mode="${mode}"]`); await p.waitForTimeout(1500);
  const st = () => p.evaluate(() => window.__city());
  let slips = 0, tapped3d = 0;
  for (let i = 0; i < 8; i++) {
    await p.waitForFunction((i) => window.__city().phase === 'aim' && window.__city().i === i, i, { timeout: 15000 });
    let s = await st();
    if (mode === 'go') {
      const pos = await p.evaluate(() => window.__cityScreen());
      const tap = async (k) => { await p.mouse.click(pos[k].x, pos[k].y); await p.waitForTimeout(250); };
      if (i === 0) {
        await tap((s.target + 1) % 6); const w = await st();
        if (w.phase !== 'miss' || w.lives !== 2) throw new Error('a wrong building must cost a life: ' + JSON.stringify(w)); slips++;
        await p.screenshot({ path: `${OUT}/city-go-miss.png` });
      }
      await tap(s.target); s = await st();
      if (s.phase === 'hit') tapped3d++; else await p.click(`[data-opt="${(await st()).expected}"]`);
      if (i === 1) { await p.waitForTimeout(900); await p.screenshot({ path: `${OUT}/city-go-hit.png` }); }
    } else {
      if (i === 0) { await p.click(`[data-opt="b${(s.target + 1) % 6}"]`); await p.waitForTimeout(200); slips++; await p.screenshot({ path: `${OUT}/city-fix-find.png` }); }
      await p.click(`[data-opt="${s.expected}"]`); await p.waitForTimeout(250);
      s = await st(); if (s.phase !== 'fix' || s.step !== 'fix') throw new Error('the right building must open the fix step');
      if (i === 1) { const opts = await p.$$eval('[data-opt]', (x) => x.map((e) => e.dataset.opt)); const bad = opts.find((o) => o !== s.expected); await p.click(`[data-opt="${bad}"]`); await p.waitForTimeout(200); slips++; await p.screenshot({ path: `${OUT}/city-fix-sign.png` }); }
      await p.click(`[data-opt="${s.expected}"]`); await p.waitForTimeout(400);
      if (i === 2) await p.screenshot({ path: `${OUT}/city-fix-hit.png` });
    }
  }
  await p.waitForFunction(() => ['victory', 'defeat'].includes(window.__city().phase), null, { timeout: 15000 });
  await p.waitForTimeout(500);
  const end = await p.$eval('#city-sum', (e) => e.closest('[role=dialog]').innerText.replace(/\s+/g, ' ').slice(0, 100)).catch(() => 'NO END');
  const f = await st(); await p.screenshot({ path: `${OUT}/city-${mode}-end.png` }); await p.close();
  const ok = f.phase === 'victory' && f.lives === 3 - slips && (mode !== 'go' || tapped3d >= 6) && !errs.length;
  console.log((ok ? 'PASS ' : 'FAIL ') + mode + ' ' + vw + 'x' + vh + (mode === 'go' ? ` 3D taps ${tapped3d}/8` : '') + ' → ' + end + (errs.length ? ' | errors: ' + errs.join(' / ') : ''));
  return ok;
}

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const r = [await run(b, 'go', 400, 860), await run(b, 'fix', 1280, 720)];
  await b.close(); if (!r.every(Boolean)) process.exit(1);
})();
