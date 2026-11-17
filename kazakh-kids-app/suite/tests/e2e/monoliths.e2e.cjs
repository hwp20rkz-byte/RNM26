// E2E for «Ұшқыр монолиттер»: antonyms played by clicking the 3D monoliths on the canvas (phone portrait,
// grid layout) incl. one wrong pair; translate + memory played via the keyboard mirror (desktop, ring layout).
// Usage: node tests/e2e/monoliths.e2e.cjs [outDir]   (needs: npm run build; Playwright + Chromium)
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const OUT = process.argv[2] || path.join(require('os').tmpdir(), 'qv3d-e2e'); fs.mkdirSync(OUT, { recursive: true });
const URL = 'file://' + path.resolve(__dirname, '../../dist/index.html') + '?e2e=1#/games/monoliths';

async function run(b, mode, vw, vh, viaCanvas) {
  const p = await b.newPage({ viewport: { width: vw, height: vh } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  await p.goto(URL); await p.waitForTimeout(3500);
  const btn = { antonyms: 'Антонимдер', translate: 'Аударма', memory: 'Жад' }[mode];
  await p.click('text=' + btn); await p.waitForTimeout(3000);
  await p.screenshot({ path: `${OUT}/mono-${mode}-start.png` });
  const { tiles } = await p.evaluate(() => window.__mono());
  const click = async (id) => {
    if (viaCanvas) {
      const pos = (await p.evaluate(() => window.__monoScreen())).find((x) => x.id === id);
      await p.mouse.click(pos.x, pos.y);
    } else await p.evaluate((id) => document.querySelector(`[data-mono="${id}"]`).click(), id);
    await p.waitForTimeout(250);
  };
  // one deliberate wrong pair, then every pair correctly
  const a = tiles[0], wrong = tiles.find((t) => t.pair !== a.pair);
  await click(a.id); await click(wrong.id); await p.waitForTimeout(350);
  await p.screenshot({ path: `${OUT}/mono-${mode}-miss.png` });
  await p.waitForTimeout(800);
  for (let pair = 0; pair < 6; pair++) {
    const [x, y] = tiles.filter((t) => t.pair === pair);
    await click(x.id); await click(y.id);
    if (pair === 1) { await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/mono-${mode}-bridge.png` }); }
    await p.waitForTimeout(1300);
  }
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/mono-${mode}-end.png` });
  const end = await p.$eval('#mono-sum', (e) => e.closest('[role=dialog]').innerText.replace(/\s+/g, ' ').slice(0, 120)).catch(() => 'NO END');
  const st = await p.evaluate(() => window.__mono());
  await p.close();
  const ok = st.phase === 'victory' && st.matched.length === 12 && !errs.length;
  console.log((ok ? 'PASS ' : 'FAIL ') + mode + ' ' + vw + 'x' + vh + (viaCanvas ? ' canvas' : ' keyboard') + ' → ' + end + (errs.length ? ' | errors: ' + errs.join(' / ') : ''));
  return ok;
}

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const results = [await run(b, 'antonyms', 400, 860, true), await run(b, 'translate', 1280, 720, false), await run(b, 'memory', 1280, 720, true)];
  await b.close();
  if (!results.every(Boolean)) process.exit(1);
})();
