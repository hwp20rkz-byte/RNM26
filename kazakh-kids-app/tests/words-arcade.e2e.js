// «Жалғау жаңбыры» and «Сөз жылан» on a phone.
// Rain: right baskets score with the streak multiplier, a wrong basket and a word that hits the ground cost hearts,
// three lost hearts end the round. Snake: driven by real arrow keys (BFS path to the next letter), two words in a
// row without a mistake score ×2, a decoy costs a heart. Run: node tests/words-arcade.e2e.js [shotDir]
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const OUT = process.argv[2]; if (OUT) fs.mkdirSync(OUT, { recursive: true });
const shot = (p, name) => (OUT ? p.screenshot({ path: path.join(OUT, name) }) : null);
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('ok -', m); };
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }, KEYS = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
// first move of the shortest wrap-around path from the head to the target, avoiding the body and other letters
function firstMove(s, target, W, H, avoidLetters) {
  const block = new Set(s.cells.filter((c) => avoidLetters && !(c.x === target.x && c.y === target.y)).map((c) => c.x + ',' + c.y));
  const body = new Set(); (s.body || []).forEach((p) => body.add(p.x + ',' + p.y));
  const q = [[s.head.x, s.head.y, null]], seen = new Set([s.head.x + ',' + s.head.y]);
  while (q.length) {
    const [x, y, first] = q.shift();
    for (const d of Object.keys(DIRS)) {
      if (!first && d === OPP[s.dir]) continue;
      const nx = (x + DIRS[d][0] + W) % W, ny = (y + DIRS[d][1] + H) % H, k = nx + ',' + ny;
      if (seen.has(k) || block.has(k) || body.has(k)) continue;
      if (nx === target.x && ny === target.y) return first || d;
      seen.add(k); q.push([nx, ny, first || d]);
    }
  }
  return null;
}
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 400, height: 860 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../web/index.html') + '?e2e=1');
  await p.evaluate(() => localStorage.setItem('qazaqsha-oyna-v1', JSON.stringify({ onboarded: true, name: 'T', lang: 'ru', lvlSeen: 99, lgSeen: 9, giftDay: 'x', grade: 1 })));
  await p.reload(); await p.waitForTimeout(400);
  for (let i = 0; i < 6 && await p.$('#rok'); i++) { await p.click('#rok'); await p.waitForTimeout(100); }
  await p.click('[data-tab=games]'); await p.waitForTimeout(300);
  assert(!!(await p.$('[data-arc=rain]')) && !!(await p.$('[data-arc=snake]')), 'both arcade cards are in the games tab');

  /* ---- rain ---- */
  await p.evaluate(() => { window.qFast = true; }); await p.click('[data-arc=rain]'); await p.waitForTimeout(300);
  await shot(p, 'rain-intro.png'); await p.click('#awgo'); await p.waitForTimeout(400);
  const y0 = await p.$eval('#rnd', (e) => e.getBoundingClientRect().top); await p.waitForTimeout(700);
  const y1 = await p.$eval('#rnd', (e) => e.getBoundingClientRect().top);
  assert(y1 > y0, 'the word falls (' + Math.round(y0) + ' → ' + Math.round(y1) + ')');
  await shot(p, 'rain-play.png');
  let expect = 0, streak = 0;
  for (let k = 0; k < 7; k++) {
    const s = await p.evaluate(() => window.__rain()); const wrong = k === 6;
    const pick = wrong ? await p.$$eval('.rn-b', (x, a) => x.map((e) => e.dataset.o).find((o) => o !== a), s.answer) : s.answer;
    await p.click(`.rn-b[data-o="${pick}"]`);
    if (wrong) { streak = 0; await p.waitForTimeout(150); await shot(p, 'rain-wrong.png'); } else { streak++; expect += 10 * (streak >= 10 ? 3 : streak >= 5 ? 2 : 1); }
    await p.waitForFunction(() => !window.__rain().busy, null, { timeout: 4000 }).catch(() => null);
  }
  const r1 = await p.evaluate(() => window.__rain());
  assert(r1.score === expect && r1.hearts === 2 && r1.right === 6, 'score ×2 from a streak of 5, a wrong basket costs a heart: ' + r1.score + ' = ' + expect);
  // a word that reaches the ground costs a heart
  await p.evaluate(() => { window.qFast = false; }); const s2 = await p.evaluate(() => window.__rain());
  await p.click(`.rn-b[data-o="${s2.answer}"]`); await p.waitForFunction(() => !window.__rain().busy, null, { timeout: 4000 });
  await p.waitForFunction(() => window.__rain().hearts === 1, null, { timeout: 9000 }).catch(() => null);
  assert((await p.evaluate(() => window.__rain().hearts)) === 1, 'a word that hits the ground costs a heart');
  await p.waitForFunction(() => !window.__rain().busy, null, { timeout: 4000 }).catch(() => null);
  const s3 = await p.evaluate(() => window.__rain());
  await p.click(`.rn-b:not([data-o="${s3.answer}"])`);
  await p.waitForSelector('.result', { timeout: 6000 }).catch(() => null);
  const res = await p.$eval('.result', (e) => e.innerText.replace(/\s+/g, ' ').slice(0, 120)).catch(() => 'NO RESULT');
  assert(/🌧/.test(res), 'three hearts lost → the result screen: ' + res);
  await shot(p, 'rain-end.png');
  await p.click('#out').catch(() => null); await p.waitForTimeout(200);

  /* ---- snake ---- */
  await p.evaluate(() => { window.qSlowSnake = true; window.Q.api.startGame('snake'); }); await p.waitForTimeout(300);
  await p.click('#awgo'); await p.waitForTimeout(300);
  await shot(p, 'snake-play.png');
  const state = () => p.evaluate(() => { const s = window.__snake(); return s; });
  let words = 0;
  for (let guard = 0; guard < 300 && words < 2; guard++) {
    const s = await state();
    const target = s.cells.find((c) => !c.decoy && c.ch === s.word[s.progress]);
    const body = await p.evaluate(() => [...document.querySelectorAll('#snb i')].map((e, i) => (e.classList.contains('bd') ? { x: i % 9, y: Math.floor(i / 9) } : null)).filter(Boolean));
    const d = firstMove({ ...s, body }, target, 9, 11, true);
    if (d && d !== s.dir) await p.keyboard.press(KEYS[d]);
    await p.evaluate(() => window.__snake('tick'));
    words = (await state()).done;
  }
  const z1 = await state();
  const pts = await p.evaluate(() => 0);
  assert(z1.done === 2 && z1.hp === 3, 'two words collected with the arrow keys, no hearts lost');
  assert(z1.score > 0 && z1.score % 20 === 0, 'clean words score ×2: ' + z1.score);
  assert(z1.len > 3, 'the snake grew: ' + z1.len);
  await shot(p, 'snake-words.png');
  // steer into a decoy
  for (let guard = 0; guard < 200; guard++) {
    const s = await state(); const dec = s.cells.find((c) => c.decoy); if (!dec || s.hp < 3) break;
    const body = await p.evaluate(() => [...document.querySelectorAll('#snb i')].map((e, i) => (e.classList.contains('bd') ? { x: i % 9, y: Math.floor(i / 9) } : null)).filter(Boolean));
    const d = firstMove({ ...s, body }, dec, 9, 11, true);
    if (d && d !== s.dir) await p.keyboard.press(KEYS[d]);
    await p.evaluate(() => window.__snake('tick'));
  }
  assert((await state()).hp === 2, 'a decoy letter costs a heart');
  // the on-screen arrows turn the snake too (tap targets ≥ 44 px)
  const pad = await p.$$eval('.sn-pad button', (x) => x.map((e) => e.getBoundingClientRect()).map((r) => Math.min(r.width, r.height)));
  assert(pad.length === 4 && pad.every((v) => v >= 44), 'four arrow buttons ≥ 44 px');
  const dirNow = (await state()).dir, side = dirNow === 'up' || dirNow === 'down' ? 'left' : 'up';
  await p.click('.sn-pad [data-d=' + side + ']'); await p.evaluate(() => window.__snake('tick'));
  assert((await state()).dir === side, 'the on-screen arrow turned the snake ' + side);
  assert(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close();
})();
