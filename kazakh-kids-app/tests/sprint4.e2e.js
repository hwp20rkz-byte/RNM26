// Master plan sprint 4 end to end on a phone: the Жалқаубек event of the day (banner → blitz → «done today»),
// the two-player duels from the bazaar and aitys intros (both halves tap, a wrong tap locks), Айтыс 2.0 punchlines.
// Run: node tests/sprint4.e2e.js [shotDir]
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
  const games = async () => { await p.click('[data-tab=games]'); await p.waitForTimeout(300); };
  const voiced = (texts) => p.evaluate((t) => t.filter((x) => !window.Q.api.TTS.file(x)), texts);

  // 1. Жалқаубек: banner of the day → 12 answers (two wrong on purpose) → the banner says «done today»
  await games();
  assert(!!(await p.$('.zh-banner:not(.done)')), 'the event of the day is offered on the games tab');
  if (OUT) await p.screenshot({ path: `${OUT}/s4-banner.png` });
  await p.click('.zh-banner'); await p.waitForTimeout(300); await p.click('#arcgo'); await p.waitForTimeout(300);
  const ev = await p.evaluate(() => window.QZHAL.daily(window.QZHAL.today()));
  const miss = await voiced(ev.items.map((x) => x.right));
  assert(miss.length === 0, 'every right form of today is voiced' + (miss.length ? ': ' + miss.join(' | ') : ''));
  for (let k = 0; k < 12; k++) {
    const s = await p.evaluate(() => window.__zhal()); if (s.over) break;
    const wrongOnPurpose = k < 2;
    await p.click((s.ok !== wrongOnPurpose) ? '#zhok' : '#zhbad');
    if (k === 1 && OUT) { await p.waitForTimeout(150); await p.screenshot({ path: `${OUT}/s4-zhalkau-fb.png` }); }
    await p.waitForFunction((i) => window.__zhal().i !== i || window.__zhal().over, s.i, { timeout: 5000 });
    await p.waitForTimeout(80);
  }
  await p.waitForSelector('.result', { timeout: 8000 }).catch(() => null);
  const zres = await p.$eval('.result', (e) => e.innerText.replace(/\s+/g, ' ').slice(0, 160)).catch(() => 'NO RESULT');
  assert(zres.includes('Жалқаубекті ұстадың') && zres.includes('10/12') && zres.includes('+15'), 'blitz: 10/12, caught, daily bonus: ' + zres);
  await p.click('#out'); await p.waitForTimeout(300); await games();
  assert(!!(await p.$('.zh-banner.done')), 'the banner shows the event is done today');

  // 2. duel from the bazaar intro: wrong tap locks a player, the other takes the point; play to the end
  await p.click('[data-arc=bazaar]'); await p.waitForTimeout(300);
  assert(!!(await p.$('#arcduo')), 'the bazaar intro offers «Екеулеп»'); await p.click('#arcduo'); await p.waitForTimeout(300);
  await p.click('#arcgo'); await p.waitForTimeout(400);
  const rot = await p.$eval('.duo-half.top', (e) => getComputedStyle(e).transform);
  assert(rot.startsWith('matrix(-1'), 'the top half is turned to the player across the table');
  let d = await p.evaluate(() => window.__duel());
  const wrong1 = await p.$$eval('#duo1 .duo-opt', (x, a) => x.map((e) => e.dataset.o).find((o) => o !== a), d.answer);
  await p.click(`#duo1 [data-o="${wrong1}"]`); await p.waitForTimeout(150);
  d = await p.evaluate(() => window.__duel());
  assert(d.locked[1] && !d.locked[0], 'a wrong tap locks only that player');
  if (OUT) await p.screenshot({ path: `${OUT}/s4-duel-locked.png` });
  await p.click(`#duo0 [data-o="${d.answer}"]`); await p.waitForTimeout(200);
  d = await p.evaluate(() => window.__duel());
  assert(d.score[0] === 1 && d.last === 'point', 'the bottom player takes the point');
  if (OUT) await p.screenshot({ path: `${OUT}/s4-duel-point.png` });
  for (let k = 0; k < 300; k++) {
    d = await p.evaluate(() => window.__duel()); if (d.done) break;
    if (d.last) { await p.waitForTimeout(300); continue; }
    await p.click(`#duo${k % 2} [data-o="${d.answer}"]`); await p.waitForTimeout(200);
  }
  await p.waitForSelector('.result', { timeout: 10000 }).catch(() => null);
  const dres = await p.$eval('.result', (e) => e.innerText.replace(/\s+/g, ' ').slice(0, 160)).catch(() => 'NO RESULT');
  assert(/ойыншы жеңді|Тең түсті/.test(dres) && /🟠 \d+ : \d+ 🔵/.test(dres), 'the duel ends with a winner and the score: ' + dres);
  await p.click('#out'); await p.waitForTimeout(300); await games();

  // 3. proverb duel from the aitys intro: the first halves are voiced; one point
  await p.click('[data-arc=aitys]'); await p.waitForTimeout(300); await p.click('#arcduo'); await p.waitForTimeout(300); await p.click('#arcgo'); await p.waitForTimeout(400);
  const halves = await p.evaluate(() => window.QPHRASE.proverbs.filter((x) => x.a).flatMap((x) => [x.a, x.kk]));
  const hm = await voiced(halves);
  assert(hm.length === 0, 'every proverb half and whole proverb is voiced' + (hm.length ? ': ' + hm.slice(0, 3).join(' | ') : ''));
  d = await p.evaluate(() => window.__duel());
  await p.click(`#duo1 [data-o="${d.answer}"]`); await p.waitForTimeout(200);
  d = await p.evaluate(() => window.__duel()); assert(d.score[1] === 1, 'the top player scores in the proverb duel');
  if (OUT) await p.screenshot({ path: `${OUT}/s4-duel-aitys.png` });
  await p.click('#gx'); await p.waitForTimeout(300); await games();

  // 4. Айтыс 2.0: the second verse is a punchline — the rival's half is shown, words of the second half fall
  await p.evaluate(() => { window.qFast = true; });
  await p.click('[data-arc=aitys]'); await p.waitForTimeout(300); await p.click('#arcgo');
  await p.waitForSelector('.v-rival', { timeout: 20000 }).catch(() => null);
  const rival = await p.$eval('.verse', (e) => e.innerText.replace(/\s+/g, ' ')).catch(() => '');
  assert(rival.includes('🤖') && rival.includes('Панчлайн'), 'Айтыс 2.0 punchline verse: ' + rival.slice(0, 120));
  if (OUT) await p.screenshot({ path: `${OUT}/s4-aitys-punch.png` });
  assert(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close();
})();
