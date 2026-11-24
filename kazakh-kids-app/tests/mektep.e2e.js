// Фаза 2 «Мектеп» на телефоне: баннер на вкладке игр → математика → 1 класс → тема «Санау 1–20» до конца
// (одна ошибка нарочно); каждая тема 1–2 классов открывается, у всех её ответов есть озвучка; скриншоты картинок.
// Run: node tests/mektep.e2e.js [shotDir]
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const OUT = process.argv[2]; if (OUT) fs.mkdirSync(OUT, { recursive: true });
const shot = (p, name) => (OUT ? p.screenshot({ path: path.join(OUT, name) }) : null);
const go = async (p) => { if (await p.$('#mkgo')) { await p.click('#mkgo'); await p.waitForTimeout(150); } };
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
  assert(soon === 0, 'all seven subjects are open');
  await p.click('[data-subj=math]'); await p.waitForTimeout(200);
  await shot(p, 'mk-home.png');
  // every topic's spoken answers are voiced (many rounds)
  const miss = await p.evaluate(() => { const M = window.QMEKTEP, out = new Set(); M.SUBJECTS.flatMap((x) => x.topics).forEach((t) => { for (let k = 0; k < 40; k++) M.round(t, Math.random).forEach((q) => { if (q.say && q.visual.type !== 'place' && !window.Q.api.TTS.file(q.say)) out.add(q.say); if (!window.Q.api.TTS.file(q.kk) && /[а-яәіңғүұқөһ]/i.test(q.kk) && !/\d/.test(q.kk) && q.visual.type !== 'good') out.add(q.kk); }); }); return [...out]; });
  assert(miss.length === 0, 'every spoken answer and prompt is voiced' + (miss.length ? ': ' + miss.slice(0, 5).join(' | ') : ''));
  // a full round of «Санау 1–20» with one wrong answer
  await p.click('[data-topic=m1count]'); await p.waitForTimeout(200);
  // heroes: a pupil asks, the host answers with the topic's rule, then «Бастау ▶»
  const intro = await p.evaluate(() => ({ bubs: document.querySelectorAll('.mk-intro .mk-bub').length, faces: document.querySelectorAll('.mk-intro .mk-face').length, go: !!document.querySelector('#mkgo'), opts: document.querySelectorAll('.mk-o').length, wide: document.documentElement.scrollWidth }));
  assert(intro.bubs === 2 && intro.faces === 2 && intro.go && intro.opts === 0 && intro.wide <= 400, 'the topic opens with the pupil and the host, then «Бастау»: ' + JSON.stringify(intro));
  await shot(p, 'mk-intro.png');
  await go(p);
  await shot(p, 'mk-count.png');
  for (let k = 0; k < 10; k++) {
    const s = await p.evaluate(() => window.__mk());
    const sel = k === 0 ? await p.$$eval('.mk-o', (x, a) => x.map((e) => e.dataset.o).find((o) => o !== a), s.answer) : s.answer;
    await p.click(`.mk-o[data-o="${sel}"]`); await p.waitForTimeout(100);
    if (k === 0) {
      const tip = await p.evaluate(() => { const r = window.QMEKTEP.TIPS.m1count, b = [...document.querySelectorAll('.mk-bub')].find((e) => e.textContent.includes(r)); return b ? b.textContent : ''; });
      assert(tip.length > 10, 'a wrong answer brings the host with the rule: ' + tip.slice(0, 80));
      await shot(p, 'mk-wrong.png');
    }
    await p.waitForFunction((i) => !window.__mk() || window.__mk().i !== i || !document.querySelector('.mk-o'), s.i, { timeout: 5000 }).catch(() => null);
    await p.waitForTimeout(150);
  }
  await p.waitForSelector('.result', { timeout: 8000 }).catch(() => null);
  const res = await p.$eval('.result', (e) => e.innerText.replace(/\s+/g, ' ').slice(0, 120)).catch(() => 'NO RESULT');
  assert(res.includes('9 / 10'), 'the round ends 9 / 10: ' + res);
  const best = await p.evaluate(() => window.qDebug.state().mektep);
  assert(best && best.m1count === 9, 'the best result is saved');
  // «Мектеп күнделігі»: 3 stars for 9 / 10, the report for the teacher, «copy» works
  await p.evaluate(() => window.Q.api.startGame('mektep')); await p.waitForTimeout(200);
  await p.click('#mkdiary'); await p.waitForTimeout(200);
  const diary = await p.evaluate(() => ({ math: document.querySelector('.mk-row small').textContent, rep: document.querySelector('#mkrep').textContent, wide: document.documentElement.scrollWidth }));
  assert(diary.math === '1 / 16 · ★ 3', 'diary: maths 1 / 16 topics, 3 stars: ' + diary.math);
  assert(diary.rep.startsWith('🏫 Мектеп күнделігі — T') && diary.rep.includes('Пройдено тем: 1 / 49') && diary.rep.includes('Повторять нечего'), 'the report text for the teacher');
  assert(diary.wide <= 400, 'the diary fits a phone (' + diary.wide + ' px)');
  await shot(p, 'mk-diary.png');
  await p.click('#mkcopy'); await p.waitForTimeout(300);
  assert(/✓/.test(await p.textContent('#mkcopy')), 'the report is copied');
  await p.click('#mkback'); await p.waitForTimeout(150);
  // «Бүгінгі жаттығу»: 10 tasks; the 9/10 topic played today is not due; a new grade-1 topic is in; all right → 10 / 10
  await p.click('#mkmix'); await p.waitForTimeout(250);
  const mx = await p.evaluate(() => window.__mk());
  assert(mx.n === 10 && mx.topic === 'mix' && !mx.mix.some((x) => x.startsWith('m1count:')) && mx.mix.some((x) => x.endsWith(':new')), 'today\'s mix: 10 tasks, a new topic, no topic that is not due: ' + [...new Set(mx.mix)].join(' '));
  await shot(p, 'mk-mix.png');
  for (let k = 0; k < 10; k++) {
    const s = await p.evaluate(() => window.__mk());
    await p.evaluate((a) => { const b = [...document.querySelectorAll('.mk-o')].find((e) => e.dataset.o === a); b.dispatchEvent(new MouseEvent('click', { bubbles: true })); }, s.answer);
    await p.waitForFunction((i) => !window.__mk() || window.__mk().i !== i || !!document.querySelector('.result'), s.i, { timeout: 5000 }).catch(() => null);
    await p.waitForTimeout(120);
  }
  await p.waitForSelector('.result', { timeout: 8000 }).catch(() => null);
  const mres = await p.$eval('.result', (e) => e.innerText.replace(/\s+/g, ' ').slice(0, 120)).catch(() => 'NO RESULT');
  const st2 = await p.evaluate(() => window.qDebug.state());
  assert(mres.includes('10 / 10') && st2.mektep.m1count === 9 && Object.keys(st2.mkSeen || {}).length >= 4, 'the mix ends 10 / 10, keeps the bests, marks its topics as reviewed today: ' + mres);
  // open each other topic and screenshot its first task
  for (const [g, t] of [[1, 'm1tens'], [1, 'm1shapes'], [1, 'm1add20'], [1, 'm1compare'], [2, 'm2add100'], [2, 'm2mul'], [2, 'm2money'], [3, 'm3mul69'], [3, 'm3div'], [3, 'm3frac'], [3, 'm3perim'], [2, 'm2clock'], [4, 'm4shop'], [4, 'm4place'], [4, 'm4bazaar']]) {
    await p.evaluate(() => window.Q.api.startGame('mektep')); await p.waitForTimeout(200);
    await p.click('[data-subj=math]'); await p.waitForTimeout(100);
    await p.click(`.mk-g[data-grade="${g}"]`); await p.waitForTimeout(100);
    await p.click(`[data-topic=${t}]`); await p.waitForTimeout(200); await go(p);
    const ok = await p.evaluate(() => window.__mk().topic);
    assert(ok === t && (await p.$$('.mk-o')).length >= 3, t + ' opens with options');
    await shot(p, 'mk-' + t + '.png');
  }
  // «Сынып есебі»: the pupil's report carries a code; the teacher pastes two messages and gets the class table
  await p.evaluate(() => window.Q.api.startGame('mektep')); await p.waitForTimeout(200);
  await p.click('#mkdiary'); await p.waitForTimeout(200);
  const myRep = await p.$eval('#mkrep', (e) => e.textContent);
  assert(/Код для учителя: QVD1:T:1:[0-9A-]+:[0-9a-z]/.test(myRep), 'the diary report carries the teacher code');
  await p.click('#mkclass'); await p.waitForTimeout(200);
  const other = await p.evaluate(() => window.QMEKTEP.encodeReport({ m1count: 3, m1shapes: 10 }, 'Арман', 1));
  await p.fill('#mkpaste', '[Әнел] ' + myRep + '\n[Арман] ' + other + ' рахмет');
  await p.click('#mkbuild'); await p.waitForTimeout(250);
  const cls = await p.evaluate(() => ({ h: document.querySelector('.mk-diary h3').textContent, rows: [...document.querySelectorAll('.mk-class tr')].slice(1).map((r) => r.innerText.replace(/\s+/g, ' ')), wide: document.documentElement.scrollWidth }));
  assert(cls.h.includes('2') && cls.rows.some((r) => r.includes('Арман') && r.includes('1 / 2')) && cls.wide <= 400, 'class table: 2 pupils, the weak topic names who: ' + cls.rows.slice(0, 2).join(' | '));
  await shot(p, 'mk-class.png');
  // logic (phase 2, day 4): each topic opens and its right option is accepted
  for (const [subj, g, t] of [['logic', 1, 'l1pattern'], ['logic', 1, 'l1odd'], ['logic', 2, 'l2algo'], ['logic', 2, 'l2yurt'], ['logic', 3, 'l3sym'],
    ['nature', 1, 'n1season'], ['nature', 1, 'n1wild'], ['nature', 2, 'n2home'], ['nature', 2, 'n2water'], ['nature', 2, 'n2senses'], ['nature', 2, 'n2health'], ['nature', 2, 'n2safety'], ['nature', 3, 'n3redbook'],
    ['geo', 2, 'g2dirs'], ['geo', 3, 'g3feature'], ['geo', 3, 'g3repcity'], ['geo', 4, 'g4center'], ['geo', 4, 'g4map'], ['geo', 4, 'g4neighbor'], ['geo', 4, 'g4water'],
    ['cities', 2, 'c2landmark'], ['cities', 3, 'c3river'], ['cities', 3, 'c3guide'], ['cities', 3, 'c3region'], ['cities', 4, 'c4tour'],
    ['history', 5, 'h5timeline'], ['history', 5, 'h5kz'], ['history', 5, 'h5world'], ['history', 5, 'h5ata'],
    ['lit', 2, 'r2genre'], ['lit', 3, 'r3music'], ['lit', 3, 'r3legend'], ['lit', 4, 'r4authors']]) {
    await p.evaluate(() => window.Q.api.startGame('mektep')); await p.waitForTimeout(200);
    await p.click('[data-subj=' + subj + ']'); await p.waitForTimeout(100);
    await p.click(`.mk-g[data-grade="${g}"]`); await p.waitForTimeout(100);
    await p.click(`[data-topic=${t}]`); await p.waitForTimeout(200);
    const hosts = await p.$$eval('.mk-intro .mk-bub', (x) => x.length);
    assert(hosts === 2, t + ': the intro has the pupil and the host');
    await go(p);
    const s = await p.evaluate(() => window.__mk());
    assert(s.topic === t && (await p.$$('.mk-o')).length >= 3, t + ' opens with options');
    const wide = await p.evaluate(() => document.documentElement.scrollWidth);
    assert(wide <= 400, t + ': no sideways scroll on a phone (' + wide + ' px)');
    await shot(p, 'mk-' + t + '.png');
    await p.evaluate((a) => { const b = [...document.querySelectorAll('.mk-o')].find((e) => e.dataset.o === a); b.dispatchEvent(new MouseEvent('click', { bubbles: true })); }, s.answer); await p.waitForTimeout(150);
    assert(!!(await p.$('.mk-o.right')) && !(await p.$('.mk-o.wrong')), t + ': the right option is accepted');
  }
  assert(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close();
})();
