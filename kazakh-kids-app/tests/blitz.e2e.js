// «Жылдам аударма» on a phone: Kazakh → translation with two mistakes on purpose (score and streak follow the rules),
// listening mode and translation → Kazakh open, the round ends on the timer (qFast) with a result screen.
// Run: node tests/blitz.e2e.js [shotDir]
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const OUT = process.argv[2]; if (OUT) fs.mkdirSync(OUT, { recursive: true });
const shot = (p, name) => (OUT ? p.screenshot({ path: path.join(OUT, name) }) : null);
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('ok -', m); };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 400, height: 860 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../web/index.html') + '?e2e=1');
  await p.evaluate(() => localStorage.setItem('qazaqsha-oyna-v1', JSON.stringify({ onboarded: true, name: 'T', lang: 'ru', lvlSeen: 99, lgSeen: 9, giftDay: 'x', grade: 1 })));
  await p.reload(); await p.waitForTimeout(400);
  for (let i = 0; i < 6 && await p.$('#rok'); i++) { await p.click('#rok'); await p.waitForTimeout(100); }
  const open = async (mode) => {
    await p.evaluate(() => { window.qFast = true; window.Q.api.startGame('blitz'); }); await p.waitForTimeout(300);
    await p.click(`[data-bz="${mode}"]`); await p.waitForTimeout(300);
  };
  await p.click('[data-tab=games]'); await p.waitForTimeout(300);
  assert(!!(await p.$('[data-arc=blitz]')), 'the arcade card «Жылдам аударма» is in the games tab');
  await open('kk');
  const s0 = await p.evaluate(() => window.__blitz());
  assert(s0.n >= 300, 'a pool of ' + s0.n + ' voiced lesson words');
  await shot(p, 'blitz-q.png');
  let expect = 0, streak = 0, wrongDone = 0;
  for (let k = 0; k < 12; k++) {
    const s = await p.evaluate(() => window.__blitz()); if (s.over) break;
    const wrong = (k === 3 || k === 8);
    const sel = wrong ? await p.$$eval('.bz-o', (x, a) => x.map((e) => e.dataset.o).find((o) => o !== a), s.answer) : s.answer;
    await p.click(`.bz-o[data-o="${sel.replace(/"/g, '\\"')}"]`);
    if (wrong) { streak = 0; expect = Math.max(0, expect - 5); wrongDone++; if (wrongDone === 1) { await p.waitForTimeout(100); await shot(p, 'blitz-wrong.png'); } }
    else { streak++; expect += 10 + Math.min(streak - 1, 10); }
    await p.waitForFunction(() => !window.__blitz().busy || window.__blitz().over, null, { timeout: 4000 }).catch(() => null);
  }
  const s1 = await p.evaluate(() => window.__blitz());
  assert(s1.score === expect && s1.wrong === 2, 'score follows the rules: ' + s1.score + ' = ' + expect);
  await p.waitForSelector('.result', { timeout: 25000 }).catch(() => null);
  const res = await p.$eval('.result', (e) => e.innerText.replace(/\s+/g, ' ').slice(0, 140)).catch(() => 'NO RESULT');
  assert(/⚡/.test(res) && /ошибок: 2/.test(res), 'the timer ends the round with a result: ' + res);
  await shot(p, 'blitz-end.png');
  await p.click('#out'); await p.waitForTimeout(200);
  // listening: the prompt is 🎧, the options are translations (no Kazakh word shown)
  await open('ear');
  const ear = await p.evaluate(() => ({ prompt: document.querySelector('.bz-card b').textContent, ans: window.__blitz().answer, opts: [...document.querySelectorAll('.bz-o')].map((e) => e.dataset.o) }));
  assert(ear.prompt === '🎧' && ear.opts.includes(ear.ans) && ear.opts.every((o) => !/[әіңғүұқөһ]/.test(o)), 'listening mode: heard, not shown; Russian options');
  await shot(p, 'blitz-ear.png');
  await p.click('#gx'); await p.waitForTimeout(200);
  await open('tr');
  const tr = await p.evaluate(() => ({ ans: window.__blitz().answer, opts: [...document.querySelectorAll('.bz-o')].map((e) => e.dataset.o) }));
  assert(tr.opts.length === 4 && tr.opts.includes(tr.ans), 'translation → Kazakh: Kazakh options');
  await p.click('#gx');
  assert(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close();
})();
