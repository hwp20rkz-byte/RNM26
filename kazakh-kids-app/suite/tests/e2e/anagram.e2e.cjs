// E2E for «Әріп кубтары»: «build» by tapping the 3D cubes on a phone incl. the Russian look-alike decoy;
// «missing» via canvas on desktop incl. one wrong letter; «build» via the keyboard mirror on desktop.
// Usage: node tests/e2e/anagram.e2e.cjs [outDir]   (needs: npm run build; Playwright + Chromium)
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const OUT = process.argv[2] || path.join(require('os').tmpdir(), 'qv3d-e2e'); fs.mkdirSync(OUT, { recursive: true });
const URL = 'file://' + path.resolve(__dirname, '../../dist/index.html') + '?e2e=1#/games/anagram';

async function run(b, mode, vw, vh, viaCanvas) {
  const p = await b.newPage({ viewport: { width: vw, height: vh } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  await p.goto(URL); await p.waitForTimeout(3500);
  await p.click('text=' + (mode === 'build' ? 'Құрастыр' : 'Жетпейтін әріп')); await p.waitForTimeout(2500);
  await p.screenshot({ path: `${OUT}/cubes-${mode}-${vw}-start.png` });
  const tap = async (id) => {
    if (viaCanvas) { const pos = (await p.evaluate(() => window.__cubeScreen())).find((x) => x.id === id); await p.mouse.click(pos.x, pos.y); }
    else await p.evaluate((id) => document.querySelector(`[data-cube="${id}"]`).click(), id);
    await p.waitForTimeout(420);
  };
  for (let stage = 0; stage < 6; stage++) {
    const s = await p.evaluate(() => window.__cubes());
    if (s.stage !== stage || s.phase !== 'playing') throw new Error(`stage ${stage}: ${JSON.stringify(s).slice(0, 240)}`);
    if (stage === 0) {
      await tap(s.cubes.find((c) => c.decoy).id); await p.waitForTimeout(200);
      await p.screenshot({ path: `${OUT}/cubes-${mode}-${vw}-miss.png` }); await p.waitForTimeout(700);
    }
    const used = new Set();
    for (const t of s.target) { const c = s.cubes.find((x) => !x.decoy && x.text === t && !used.has(x.id)); used.add(c.id); await tap(c.id); }
    if (stage === 1) { await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/cubes-${mode}-${vw}-done.png` }); await p.waitForTimeout(1700); }
    else await p.waitForTimeout(2100);
  }
  await p.waitForTimeout(600);
  const end = await p.$eval('#cube-sum', (e) => e.closest('[role=dialog]').innerText.replace(/\s+/g, ' ').slice(0, 100)).catch(() => 'NO END');
  const st = await p.evaluate(() => window.__cubes());
  await p.screenshot({ path: `${OUT}/cubes-${mode}-${vw}-end.png` });
  await p.close();
  const ok = st.phase === 'victory' && st.lives === 2 && !errs.length;
  console.log((ok ? 'PASS ' : 'FAIL ') + mode + ' ' + vw + 'x' + vh + (viaCanvas ? ' canvas' : ' keyboard') + ' → ' + end + (errs.length ? ' | errors: ' + errs.join(' / ') : ''));
  return ok;
}

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const results = [await run(b, 'build', 400, 860, true), await run(b, 'missing', 1280, 720, true), await run(b, 'build', 1280, 720, false)];
  await b.close();
  if (!results.every(Boolean)) process.exit(1);
})();
