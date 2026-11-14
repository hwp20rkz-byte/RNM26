// «Мұғалім айтады» arcade end to end on a phone: real commands tapped, traps left alone (one trap tapped on purpose),
// the voice of each line is a bundled hero take, the result screen appears. Run: node tests/simon.e2e.js [shotDir]
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const OUT = process.argv[2]; if (OUT) fs.mkdirSync(OUT, { recursive: true });
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('ok -', m); };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 400, height: 860 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../web/index.html') + '?e2e=1');
  await p.evaluate(() => localStorage.setItem('qazaqsha-oyna-v1', JSON.stringify({ onboarded: true, name: 'T', lang: 'ru', lvlSeen: 99, lgSeen: 9, giftDay: 'x', grade: 1 })));
  await p.reload(); await p.waitForTimeout(400);
  for (let i = 0; i < 6 && await p.$('#rok'); i++) { await p.click('#rok'); await p.waitForTimeout(100); }
  await p.click('[data-tab=games]'); await p.waitForTimeout(300);
  assert(!!(await p.$('[data-arc=simon]')), 'the arcade card is in the games tab');
  await p.click('[data-arc=simon]'); await p.waitForTimeout(300);
  if (OUT) await p.screenshot({ path: `${OUT}/simon-intro.png` });
  await p.click('#arcgo'); await p.waitForTimeout(600);
  const voiced = await p.evaluate(() => { const S = window.QSIMON; return S.ACTIONS.every((a) => window.Q.api.TTS.file(S.line({ action: a, real: true }), 'APAI') && window.Q.api.TTS.file(S.line({ action: a, real: false }), 'E4')); });
  assert(voiced, 'every command line has a hero take (Баян апай / Әже-Bot)');
  let trapTapped = false, shot = false;
  for (let k = 0; k < 400; k++) {
    const s = await p.evaluate(() => window.__simon && window.__simon());
    if (!s || s.over) break;
    if (s.busy || !s.cmd) { await p.waitForTimeout(200); continue; }
    if (s.cmd.real) await p.click(`[data-act="${s.cmd.id}"]`);
    else if (!trapTapped) { trapTapped = true; await p.click(`[data-act="${s.cmd.id}"]`); if (OUT) { await p.waitForTimeout(150); await p.screenshot({ path: `${OUT}/simon-fooled.png` }); } }
    else { await p.waitForFunction((i) => window.__simon().busy || window.__simon().i !== i, s.i, { timeout: 5000 }); }
    if (process.env.DEBUG) { await p.waitForTimeout(120); console.log(k, JSON.stringify(s.cmd), await p.$eval('#simj', (e) => e.textContent).catch(() => '')); }
    if (!shot && OUT && s.cmd.real) { shot = true; await p.waitForTimeout(100); await p.screenshot({ path: `${OUT}/simon-hit.png` }); }
    await p.waitForTimeout(250);
  }
  await p.waitForSelector('.result', { timeout: 8000 }).catch(() => null);
  const res = await p.$eval('.result', (e) => e.innerText.replace(/\s+/g, ' ').slice(0, 140)).catch(() => 'NO RESULT');
  if (OUT) await p.screenshot({ path: `${OUT}/simon-end.png` });
  assert(res.includes('Жарайсыңдар'), 'won with one trap tapped: ' + res);
  assert(trapTapped, 'a trap appeared and was tested');
  assert(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close();
})();
