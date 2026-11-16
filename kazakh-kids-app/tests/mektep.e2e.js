// Фаза 2 «Мектеп» на телефоне: баннер на вкладке игр → математика → 1 класс → тема «Санау 1–20» до конца
// (одна ошибка нарочно); каждая тема 1–2 классов открывается, у всех её ответов есть озвучка; скриншоты картинок.
// Run: node tests/mektep.e2e.js [shotDir]
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
  await p.reload(); await p.waitForTimeout(500);
  for (let i = 0; i < 6 && await p.$('#rok'); i++) { await p.click('#rok'); await p.waitForTimeout(100); }
  await p.click('[data-tab=games]'); await p.waitForTimeout(300);
  assert(!!(await p.$('.mk-banner')), 'the «Мектеп» banner is on the games tab');
  await p.click('.mk-banner'); await p.waitForTimeout(300);
  const soon = await p.$$eval('.mk-s.soon', (x) => x.length);
  assert(soon === 3, 'maths, logic, science and geography are open, the other 3 subjects are marked «скоро»');
  await p.click('[data-subj=math]'); await p.waitForTimeout(200);
  await shot(p, 'mk-home.png');
  // every topic's spoken answers are voiced (many rounds)
  const miss = await p.evaluate(() => { const M = window.QMEKTEP, out = new Set(); M.SUBJECTS.slice(0, 4).flatMap((x) => x.topics).forEach((t) => { for (let k = 0; k < 40; k++) M.round(t, Math.random).forEach((q) => { if (q.say && q.visual.type !== 'place' && !window.Q.api.TTS.file(q.say)) out.add(q.say); if (!window.Q.api.TTS.file(q.kk) && /[а-яәіңғүұқөһ]/i.test(q.kk) && !/\d/.test(q.kk) && q.visual.type !== 'good') out.add(q.kk); }); }); return [...out]; });
  assert(miss.length === 0, 'every spoken answer and prompt is voiced' + (miss.length ? ': ' + miss.slice(0, 5).join(' | ') : ''));
  // a full round of «Санау 1–20» with one wrong answer
  await p.click('[data-topic=m1count]'); await p.waitForTimeout(200);
  await shot(p, 'mk-count.png');
  for (let k = 0; k < 10; k++) {
    const s = await p.evaluate(() => window.__mk());
    const sel = k === 0 ? await p.$$eval('.mk-o', (x, a) => x.map((e) => e.dataset.o).find((o) => o !== a), s.answer) : s.answer;
    await p.click(`.mk-o[data-o="${sel}"]`); await p.waitForTimeout(100);
    if (k === 0) await shot(p, 'mk-wrong.png');
    await p.waitForFunction((i) => !window.__mk() || window.__mk().i !== i || !document.querySelector('.mk-o'), s.i, { timeout: 5000 }).catch(() => null);
    await p.waitForTimeout(150);
  }
  await p.waitForSelector('.result', { timeout: 8000 }).catch(() => null);
  const res = await p.$eval('.result', (e) => e.innerText.replace(/\s+/g, ' ').slice(0, 120)).catch(() => 'NO RESULT');
  assert(res.includes('9 / 10'), 'the round ends 9 / 10: ' + res);
  const best = await p.evaluate(() => window.qDebug.state().mektep);
  assert(best && best.m1count === 9, 'the best result is saved');
  // open each other topic and screenshot its first task
  for (const [g, t] of [[1, 'm1tens'], [1, 'm1shapes'], [1, 'm1add20'], [1, 'm1compare'], [2, 'm2add100'], [2, 'm2mul'], [2, 'm2money'], [3, 'm3mul69'], [3, 'm3div'], [3, 'm3frac'], [4, 'm4shop'], [4, 'm4place']]) {
    await p.evaluate(() => window.Q.api.startGame('mektep')); await p.waitForTimeout(200);
    await p.click('[data-subj=math]'); await p.waitForTimeout(100);
    await p.click(`.mk-g[data-grade="${g}"]`); await p.waitForTimeout(100);
    await p.click(`[data-topic=${t}]`); await p.waitForTimeout(200);
    const ok = await p.evaluate(() => window.__mk().topic);
    assert(ok === t && (await p.$$('.mk-o')).length >= 3, t + ' opens with options');
    await shot(p, 'mk-' + t + '.png');
  }
  // logic (phase 2, day 4): each topic opens and its right option is accepted
  for (const [subj, g, t] of [['logic', 1, 'l1pattern'], ['logic', 1, 'l1odd'], ['logic', 2, 'l2algo'], ['logic', 2, 'l2yurt'], ['logic', 3, 'l3sym'],
    ['nature', 1, 'n1season'], ['nature', 1, 'n1wild'], ['nature', 2, 'n2home'], ['nature', 2, 'n2water'], ['nature', 2, 'n2senses'], ['nature', 3, 'n3redbook'],
    ['geo', 2, 'g2dirs'], ['geo', 3, 'g3feature'], ['geo', 3, 'g3repcity'], ['geo', 4, 'g4center'], ['geo', 4, 'g4neighbor']]) {
    await p.evaluate(() => window.Q.api.startGame('mektep')); await p.waitForTimeout(200);
    await p.click('[data-subj=' + subj + ']'); await p.waitForTimeout(100);
    await p.click(`.mk-g[data-grade="${g}"]`); await p.waitForTimeout(100);
    await p.click(`[data-topic=${t}]`); await p.waitForTimeout(200);
    const s = await p.evaluate(() => window.__mk());
    assert(s.topic === t && (await p.$$('.mk-o')).length >= 3, t + ' opens with options');
    await shot(p, 'mk-' + t + '.png');
    await p.evaluate((a) => { const b = [...document.querySelectorAll('.mk-o')].find((e) => e.dataset.o === a); b.click(); }, s.answer); await p.waitForTimeout(150);
    assert(!!(await p.$('.mk-o.right')) && !(await p.$('.mk-o.wrong')), t + ': the right option is accepted');
  }
  assert(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close();
})();
