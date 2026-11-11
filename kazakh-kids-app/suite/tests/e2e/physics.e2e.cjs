// E2E: the physical interaction on the canvas — drag a crystal into the core with the mouse (gravity
// tether) and tap another to fire the beam. Screen positions come from the ?e2e probe.
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const OUT = process.argv[2] || path.join(require('os').tmpdir(), 'qv3d-e2e'); fs.mkdirSync(OUT, { recursive: true });
const URL = 'file://' + path.resolve(__dirname, '../../dist/index.html') + '?e2e=1#/games/totem-cases';
let failed = 0;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(3500);
  await p.click('button.btn-solar'); await p.waitForTimeout(4000);
  const shot = (n) => p.screenshot({ path: `${OUT}/drag-${n}.png` });
  for (const mode of ['drag', 'tap']) {
    const pos = await p.evaluate(() => window.__totemScreen && window.__totemScreen());
    if (!pos) { console.log('no screen hook'); break; }
    const answer = await p.evaluate(() => window.__totemAnswer());
    const target = pos.crystals.find((c) => c.option === answer);
    if (mode === 'drag') {
      await p.mouse.move(target.x, target.y); await p.mouse.down();
      for (let k = 1; k <= 20; k++) { await p.mouse.move(target.x + (pos.core.x - target.x) * k / 20, target.y + (pos.core.y - target.y) * k / 20); await p.waitForTimeout(30); }
      await shot('mid'); await p.waitForTimeout(500); await p.mouse.up();
    } else {
      await p.mouse.click(target.x, target.y);
    }
    await p.waitForTimeout(700);
    const verdict = await p.$eval('section p span', (e) => e.textContent).catch(() => '?');
    const ok = verdict.trim() === answer; if (!ok) failed++;
    console.log(mode, 'answer', answer, '→ slot shows', verdict, ok ? 'OK' : 'NOT SUBMITTED');
    await shot(mode);
    await p.waitForTimeout(1800);
  }
  console.log('errors', errs.length, errs.slice(0, 5).join('\n'));
  await b.close();
  if (failed || errs.length) process.exit(1);
})();
