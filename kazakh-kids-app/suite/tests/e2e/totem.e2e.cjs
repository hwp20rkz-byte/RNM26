// E2E: plays a full Totem of Cases round from file:// (as in the APK) via the accessible answer buttons.
// Usage: node tests/e2e/totem.e2e.cjs [outDir] [width] [height]   (needs: npm run build; Playwright + Chromium)
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const OUT = process.argv[2] || path.join(require('os').tmpdir(), 'qv3d-e2e'); fs.mkdirSync(OUT, { recursive: true });
const URL = 'file://' + path.resolve(__dirname, '../../dist/index.html') + '?e2e=1', VW = +(process.argv[3] || 400), VH = +(process.argv[4] || 860);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: VW, height: VH } });
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGE ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/net::ERR_FILE_NOT_FOUND|Failed to load resource/.test(m.text())) errs.push('CON ' + m.text().slice(0, 300)); });
  const tag = VW + 'x' + VH;
  await p.goto(URL); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/${tag}-hub.png` });
  await p.click('text=Септік тотемі'); await p.waitForTimeout(4000);
  await p.screenshot({ path: `${OUT}/${tag}-intro.png` });
  await p.click('button.btn-solar'); await p.waitForTimeout(3500);
  await p.screenshot({ path: `${OUT}/${tag}-task.png` });
  let step = 0, wrongDone = false;
  while (step++ < 30) {
    if (await p.$('#sum-title')) break;
    if (await p.$('#fb-title')) { await p.screenshot({ path: `${OUT}/${tag}-rule.png` }); await p.click('[role=dialog] .btn-solar'); await p.waitForTimeout(800); continue; }
    const chips = await p.$$('section .chip:not([disabled])');
    if (!chips.length) { await p.waitForTimeout(500); continue; }
    const answer = await p.evaluate(() => window.__totemAnswer && window.__totemAnswer());
    const labels = await Promise.all(chips.map((c) => c.textContent()));
    const norm = (l) => l.replace(/^-/, '');
    let idx = labels.findIndex((l) => norm(l) === answer);
    if (!wrongDone && labels.length > 1) { idx = labels.findIndex((l) => norm(l) !== answer); wrongDone = true; }
    await chips[Math.max(0, idx)].click();
    await p.waitForTimeout(600);
    if (step === 2) await p.screenshot({ path: `${OUT}/${tag}-beam.png` });
    await p.waitForTimeout(1600);
  }
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${OUT}/${tag}-summary.png` });
  const summary = await p.$eval('[role=dialog]', (e) => e.innerText.replace(/\s+/g, ' ')).catch(() => 'NO SUMMARY');
  const info = await p.evaluate(() => ({ canvas: !!document.querySelector('canvas'), store: localStorage.getItem('qv3d-game') }));
  console.log('summary:', summary.slice(0, 200));
  console.log('canvas/store:', JSON.stringify(info));
  console.log('errors', errs.length, errs.slice(0, 8).join('\n'));
  await b.close();
  if (errs.length || !/с 1-й попытки|first try/.test(summary)) process.exit(1);
})();
