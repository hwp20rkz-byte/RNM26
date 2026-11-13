// E2E for «Бәйтерек қорғаны»: pictures mode on a phone — one wrong word (combo breaks, no shield lost), one meteor left
// to hit the tower (a shield lost), the rest answered; the falling meteor must be inside the screen. Words mode on desktop.
// Usage: node tests/e2e/baiterek.e2e.cjs [outDir]   (needs: npm run build; Playwright + Chromium)
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const OUT = process.argv[2] || path.join(require('os').tmpdir(), 'qv3d-e2e'); fs.mkdirSync(OUT, { recursive: true });
const URL = 'file://' + path.resolve(__dirname, '../../dist/index.html') + '?e2e=1#/games/baiterek';

async function run(b, mode, vw, vh) {
  const p = await b.newPage({ viewport: { width: vw, height: vh } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  await p.goto(URL); await p.waitForTimeout(3500);
  await p.click('text=' + (mode === 'pictures' ? 'Суреттер' : 'Сөздер')); await p.waitForTimeout(1500);
  const st = () => p.evaluate(() => window.__bt());
  let lost = 0, onScreen = false;
  for (let i = 0; i < 12; i++) {
    await p.waitForFunction((i) => window.__bt().phase === 'falling' && window.__bt().i === i, i, { timeout: 15000 });
    const s = await st();
    if (i === 2) {
      await p.waitForTimeout(2500);
      const pos = await p.evaluate(() => window.__btScreen());
      onScreen = pos.x > 0 && pos.x < vw && pos.y > 0 && pos.y < vh;
      await p.screenshot({ path: `${OUT}/bt-${mode}-falling.png` });
    }
    if (i === 0) {
      await p.click(`[data-opt="${s.options.find((o) => o !== s.kk)}"]`); await p.waitForTimeout(200);
      const w = await st(); if (w.shields !== 3 || w.wrong.length !== 1) throw new Error('a wrong word must not cost a shield');
    }
    if (mode === 'pictures' && i === 1) {
      await p.waitForFunction(() => window.__bt().phase === 'impact', null, { timeout: 15000 }); lost++;
      await p.screenshot({ path: `${OUT}/bt-${mode}-impact.png` });
      continue;
    }
    await p.click(`[data-opt="${s.kk}"]`); await p.waitForTimeout(250);
    if (i === 3) await p.screenshot({ path: `${OUT}/bt-${mode}-hit.png` });
  }
  await p.waitForFunction(() => ['victory', 'defeat'].includes(window.__bt().phase), null, { timeout: 15000 });
  await p.waitForTimeout(500);
  const end = await p.$eval('#bt-sum', (e) => e.closest('[role=dialog]').innerText.replace(/\s+/g, ' ').slice(0, 100)).catch(() => 'NO END');
  const f = await st();
  await p.screenshot({ path: `${OUT}/bt-${mode}-end.png` });
  await p.close();
  const ok = f.phase === 'victory' && f.shields === 3 - lost && onScreen && !errs.length;
  if (!ok) console.log('debug', JSON.stringify({ phase: f.phase, shields: f.shields, lost, onScreen, errs }));
  console.log((ok ? 'PASS ' : 'FAIL ') + mode + ' ' + vw + 'x' + vh + ' → ' + end + (onScreen ? '' : ' | meteor off screen') + (errs.length ? ' | errors: ' + errs.join(' / ') : ''));
  return ok;
}

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const only = process.env.ONLY; const results = [];
  if (!only || only === 'pictures') results.push(await run(b, 'pictures', 400, 860));
  if (!only || only === 'words') results.push(await run(b, 'words', 1280, 720));
  await b.close();
  if (!results.every(Boolean)) process.exit(1);
})();
