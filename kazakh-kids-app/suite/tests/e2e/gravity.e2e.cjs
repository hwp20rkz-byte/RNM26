// E2E for «Грави-тир»: мынау/анау on a phone (one wrong pick costs a life, the rest right), аламын on desktop with
// ?test — the ⏭ TEST button must solve every target. Usage: node tests/e2e/gravity.e2e.cjs [outDir]  (needs npm run build)
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const OUT = process.argv[2] || path.join(require('os').tmpdir(), 'qv3d-e2e'); fs.mkdirSync(OUT, { recursive: true });
const BASE = 'file://' + path.resolve(__dirname, '../../dist/index.html');

async function run(b, mode, vw, vh, test) {
  const p = await b.newPage({ viewport: { width: vw, height: vh } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  await p.goto(BASE + '?e2e=1' + (test ? '&test=1' : '') + '#/games/gravity'); await p.waitForTimeout(3500);
  await p.click(`[data-mode="${mode}"]`); await p.waitForTimeout(1200);
  const st = () => p.evaluate(() => window.__grav());
  let missed = 0, sawNear = false, sawFar = false;
  for (let i = 0; i < 10; i++) {
    await p.waitForFunction((i) => window.__grav().phase === 'aim' && window.__grav().i === i, i, { timeout: 15000 });
    const s = await st(); if (s.near) sawNear = true; else sawFar = true;
    if (i === 0 && !test) {
      await p.click(`[data-opt="${s.options.find((o) => o !== s.answer)}"]`); await p.waitForTimeout(300);
      const w = await st(); if (w.phase !== 'miss' || w.lives !== 2) throw new Error('a wrong pick must cost a life'); missed++;
      await p.screenshot({ path: `${OUT}/grav-${mode}-miss.png` });
    }
    if (test) await p.click('[data-test-skip]'); else await p.click(`[data-opt="${s.answer}"]`);
    await p.waitForTimeout(mode === 'demo' && !s.near ? 700 : 400);
    if (i === 1 || (mode === 'demo' && !s.near && !fs.existsSync(`${OUT}/grav-${mode}-far.png`))) await p.screenshot({ path: `${OUT}/grav-${mode}-${i === 1 ? 'hit' : 'far'}.png` });
  }
  await p.waitForFunction(() => ['victory', 'defeat'].includes(window.__grav().phase), null, { timeout: 15000 });
  await p.waitForTimeout(500);
  const end = await p.$eval('#grav-sum', (e) => e.closest('[role=dialog]').innerText.replace(/\s+/g, ' ').slice(0, 100)).catch(() => 'NO END');
  const f = await st(); await p.screenshot({ path: `${OUT}/grav-${mode}-end.png` }); await p.close();
  const ok = f.phase === 'victory' && f.lives === 3 - missed && (mode !== 'demo' || (sawNear && sawFar)) && !errs.length;
  console.log((ok ? 'PASS ' : 'FAIL ') + mode + ' ' + vw + 'x' + vh + (test ? ' ⏭TEST' : '') + ' → ' + end + (errs.length ? ' | errors: ' + errs.join(' / ') : ''));
  return ok;
}

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const r = [await run(b, 'demo', 400, 860, false), await run(b, 'can', 1280, 720, true)];
  // hero gallery renders all eight heroes without errors
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(BASE + '#/heroes'); await p.waitForTimeout(4000); await p.screenshot({ path: `${OUT}/heroes.png` });
  const txt = await p.innerText('body'); const ok = txt.includes('Жалқаубек') && txt.includes('Әже') && !errs.length;
  console.log((ok ? 'PASS ' : 'FAIL ') + 'heroes gallery' + (errs.length ? ' | ' + errs.join(' / ') : '')); r.push(ok);
  await b.close(); if (!r.every(Boolean)) process.exit(1);
})();
