// E2E for «Сөйлем экспресі»: «basic» played by tapping the 3D pods on a phone (portrait) incl. one wrong pod;
// «commands» played via the keyboard mirror on desktop incl. the non-imperative decoy; «place» via canvas on desktop.
// Usage: node tests/e2e/hyperloop.e2e.cjs [outDir]   (needs: npm run build; Playwright + Chromium)
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const OUT = process.argv[2] || path.join(require('os').tmpdir(), 'qv3d-e2e'); fs.mkdirSync(OUT, { recursive: true });
const URL = 'file://' + path.resolve(__dirname, '../../dist/index.html') + '?e2e=1#/games/hyperloop';

async function run(b, mode, vw, vh, viaCanvas) {
  const p = await b.newPage({ viewport: { width: vw, height: vh } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  await p.goto(URL); await p.waitForTimeout(3500);
  const btn = { basic: 'Кім? Не?', place: 'Қашан? Қайда?', commands: 'Бұйрық' }[mode];
  await p.click('text=' + btn); await p.waitForTimeout(2500);
  await p.screenshot({ path: `${OUT}/hyper-${mode}-start.png` });
  const tap = async (id) => {
    if (viaCanvas) {
      const pos = (await p.evaluate(() => window.__hyperScreen())).find((x) => x.id === id);
      await p.mouse.click(pos.x, pos.y);
    } else await p.evaluate((id) => document.querySelector(`[data-pod="${id}"]`).click(), id);
    await p.waitForTimeout(450);
  };
  let livesLost = 0;
  for (let stage = 0; stage < 6; stage++) {
    const s = await p.evaluate(() => window.__hyper());
    if (s.stage !== stage || s.phase !== 'playing') throw new Error(`stage ${stage}: ${JSON.stringify(s).slice(0, 200)}`);
    if (stage === 0) {
      // one deliberate mistake: the decoy in «commands», otherwise the verb (always last) first
      const bad = s.pods.find((x) => x.decoy) || s.pods.find((x) => x.text === s.words[s.words.length - 1].toLowerCase());
      await tap(bad.id); await p.waitForTimeout(250);
      await p.screenshot({ path: `${OUT}/hyper-${mode}-miss.png` });
      await p.waitForTimeout(700); livesLost++;
    }
    for (let i = 0; i < s.words.length; i++) {
      const pod = s.pods.find((x) => !x.decoy && x.text === s.words[i].toLowerCase());
      await tap(pod.id);
      if (stage === 1 && i === s.words.length - 2) await p.screenshot({ path: `${OUT}/hyper-${mode}-docking.png` });
    }
    if (stage === 1) { await p.waitForTimeout(900); await p.screenshot({ path: `${OUT}/hyper-${mode}-depart.png` }); await p.waitForTimeout(1700); }
    else await p.waitForTimeout(2600);
  }
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/hyper-${mode}-end.png` });
  const end = await p.$eval('#hyper-sum', (e) => e.closest('[role=dialog]').innerText.replace(/\s+/g, ' ').slice(0, 110)).catch(() => 'NO END');
  const st = await p.evaluate(() => window.__hyper());
  await p.close();
  const ok = st.phase === 'victory' && st.lives === 3 - livesLost && !errs.length;
  console.log((ok ? 'PASS ' : 'FAIL ') + mode + ' ' + vw + 'x' + vh + (viaCanvas ? ' canvas' : ' keyboard') + ' → ' + end + (errs.length ? ' | errors: ' + errs.join(' / ') : ''));
  return ok;
}

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const results = [await run(b, 'basic', 400, 860, true), await run(b, 'commands', 1280, 720, false), await run(b, 'place', 1280, 720, true)];
  await b.close();
  if (!results.every(Boolean)) process.exit(1);
})();
