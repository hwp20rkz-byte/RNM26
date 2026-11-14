// Master plan sprint 5 end to end on a phone: the 4-сынып track (path, voicing, the БЖБ boss), «Мұғалім парағы»
// (pick a topic, reveal, mark, end with a class mark), the new workshop landmarks. Run: node tests/sprint5.e2e.js [shotDir]
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const OUT = process.argv[2]; if (OUT) fs.mkdirSync(OUT, { recursive: true });
const shot = (p, name) => (OUT ? p.screenshot({ path: path.join(OUT, name) }) : null);
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('ok -', m); };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 400, height: 860 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../web/index.html') + '?e2e=1');
  await p.evaluate(() => localStorage.setItem('qazaqsha-oyna-v1', JSON.stringify({ onboarded: true, name: 'T', lang: 'ru', lvlSeen: 99, lgSeen: 9, giftDay: 'x', grade: 6 })));
  await p.reload(); await p.waitForTimeout(500);
  for (let i = 0; i < 6 && await p.$('#rok'); i++) { await p.click('#rok'); await p.waitForTimeout(100); }
  const home = await p.evaluate(() => document.body.innerText);
  assert(home.includes('Салт-дәстүр мен мерекелер') && home.includes('Наурыз'), 'grade 4 path shows its first unit and lesson');
  await shot(p, 's5-path.png');
  const audio = await p.evaluate(() => { const g = window.QDATA.GRADES[5]; const t = g.units.flatMap((u) => u.lessons.filter((l) => !l.review).flatMap((l) => l.words.concat(l.sentences).map((x) => x.kk))); return { n: t.length, miss: t.filter((x) => !window.Q.api.TTS.file(x)) }; });
  assert(audio.miss.length === 0, 'all ' + audio.n + ' words and sentences of grade 4 are voiced' + (audio.miss.length ? ': ' + audio.miss.slice(0, 4).join(' | ') : ''));
  const bzb = await p.evaluate(() => { const l = window.Q.api.gradeLessons(5).find((x) => x.id === 'g4u1bzb'); return l && { boss: l.boss.seconds, assess: !!l.assess, module: l.unit.module }; });
  assert(bzb && bzb.boss === 300 && bzb.assess && bzb.module === 1, 'the БЖБ of unit 1 is a 5-minute assessed boss on its module');

  // «Мұғалім парағы»
  await p.click('[data-tab=games]'); await p.waitForTimeout(300);
  await p.click('[data-arc=teacher]'); await p.waitForTimeout(300);
  assert((await p.$$('.tch-g')).length === 6, 'the teacher can pick any of the 6 courses');
  await shot(p, 's5-teacher-setup.png');
  await p.click('.tch-t[data-u="g4u3"]'); await p.waitForTimeout(300);
  const t0 = await p.evaluate(() => window.__teach());
  assert(t0.n >= 10, 'a blitz of ' + t0.n + ' cards on «Қазақстанды аралаймыз»');
  await p.click('#tshow'); await p.waitForTimeout(150);
  assert((await p.$eval('#tans', (e) => e.textContent)) === t0.kk, 'the answer is revealed');
  await shot(p, 's5-teacher-card.png');
  for (let k = 0; k < t0.n; k++) {
    const s = await p.evaluate(() => window.__teach()); if (s.over) break;
    if (!s.shown) { await p.click('#tshow'); await p.waitForTimeout(60); }
    await p.click(k % 5 === 4 ? '#tno' : '#tyes'); await p.waitForTimeout(60);
  }
  await p.waitForSelector('.result', { timeout: 8000 }).catch(() => null);
  const res = await p.$eval('.result', (e) => e.innerText.replace(/\s+/g, ' ').slice(0, 160)).catch(() => 'NO RESULT');
  assert(/«[2-5]»/.test(res) && res.includes('Жарайсыңдар'), 'the blitz ends with a class mark: ' + res);
  await p.click('#out'); await p.waitForTimeout(300);

  // workshop: the new landmarks are offered and the scene builds
  await p.evaluate(() => window.Q.api.startGame('tg3d_workshop')); await p.waitForTimeout(800);
  const list = await p.evaluate(() => document.body.innerText);
  assert(['Байқоңыр', 'Шарын шатқалы', 'Бурабай'].every((x) => list.includes(x)), 'the workshop offers Байқоңыр, Шарын, Бурабай');
  const cards = await p.$$('[data-b]'); await cards[3].click(); await p.waitForTimeout(2500);
  await shot(p, 's5-workshop.png');
  assert(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close();
})();
