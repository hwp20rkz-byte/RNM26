// E2E for «Уақыт өзені»: four rivers of four events. Phone: one wrong (too new) event costs a life and places nothing,
// then the right order; desktop: ⏭ TEST. Screenshots after the first river. Usage: node tests/e2e/river.e2e.cjs [outDir]
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const OUT = process.argv[2] || path.join(require('os').tmpdir(), 'qv3d-e2e'); fs.mkdirSync(OUT, { recursive: true });
const BASE = 'file://' + path.resolve(__dirname, '../../dist/index.html');

async function run(b, vw, vh, test) {
  const p = await b.newPage({ viewport: { width: vw, height: vh } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  await p.goto(BASE + '?e2e=1' + (test ? '&test=1' : '') + '#/games/river'); await p.waitForTimeout(3500);
  await p.click('[data-mode="river"]'); await p.waitForTimeout(1200);
  const st = () => p.evaluate(() => window.__river());
  let missed = 0;
  for (let i = 0; i < 4; i++) {
    await p.waitForFunction((i) => window.__river().i === i && window.__river().placed === 0 && window.__river().phase === 'aim', i, { timeout: 15000 });
    if (i === 0 && !test) {
      const s = await st(); await p.click(`[data-ev="${s.order[3]}"]`); await p.waitForTimeout(300);
      const w = await st(); if (w.phase !== 'miss' || w.lives !== 2 || w.placed !== 0) throw new Error('a too-new event must cost a life'); missed++;
    }
    for (let k = 0; k < 4; k++) { const s = await st(); if (test) await p.click('[data-test-skip]'); else await p.click(`[data-ev="${s.next}"]`); await p.waitForTimeout(350); }
    if (i === 0) { await p.waitForTimeout(900); await p.screenshot({ path: `${OUT}/river-${vw}.png` }); }
  }
  await p.waitForFunction(() => ['victory', 'defeat'].includes(window.__river().phase), null, { timeout: 15000 });
  await p.waitForTimeout(800); await p.screenshot({ path: `${OUT}/river-end-${vw}.png` });
  const end = await p.$eval('#river-sum', (e) => e.closest('[role=dialog]').innerText.replace(/\s+/g, ' ').slice(0, 100)).catch(() => 'NO END');
  const f = await st(); await p.close();
  const ok = f.phase === 'victory' && f.lives === 3 - missed && !errs.length;
  console.log((ok ? 'PASS ' : 'FAIL ') + vw + 'x' + vh + (test ? ' ⏭TEST' : '') + ' → ' + end + (errs.length ? ' | errors: ' + errs.join(' / ') : ''));
  return ok;
}
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const r = [await run(b, 400, 860, false), await run(b, 1280, 720, true)];
  await b.close(); if (!r.every(Boolean)) process.exit(1);
})();
