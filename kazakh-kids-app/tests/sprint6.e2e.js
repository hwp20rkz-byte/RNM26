// Master plan sprint 6 end to end on a phone: pets in the shop (adopt, buy an accessory, hungry → fed by a won
// «Дастархан Master»), «Мектеп Бәйгесі» (class → QR + code → teacher board), «Көше тілі» on the Тірі тіл path.
// Run: node tests/sprint6.e2e.js [shotDir]
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const OUT = process.argv[2]; if (OUT) fs.mkdirSync(OUT, { recursive: true });
const shot = (p, name) => (OUT ? p.screenshot({ path: path.join(OUT, name), fullPage: false }) : null);
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('ok -', m); };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 400, height: 860 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../web/index.html') + '?e2e=1');
  await p.evaluate(() => localStorage.setItem('qazaqsha-oyna-v1', JSON.stringify({ onboarded: true, name: 'Әлібек', lang: 'ru', lvlSeen: 99, lgSeen: 9, giftDay: 'x', grade: 4, coins: 600, xp: 777, done: { a: 1, b: 1, c: 1, d: 1, e: 1, f: 1 } })));
  await p.reload(); await p.waitForTimeout(500);
  for (let i = 0; i < 6 && await p.$('#rok'); i++) { await p.click('#rok'); await p.waitForTimeout(100); }

  // «Көше тілі» — grade 4 in data.js numbering is «Тірі тіл»
  assert(!!(await p.$('#streettog')), 'the «Көше тілі» switch is on the Тірі тіл path');
  await p.click('#streettog'); await p.waitForTimeout(200);
  const rows = await p.$$('.street-row'); assert(rows.length === 14, '14 formal → street pairs shown');
  const sm = await p.evaluate(() => window.QSTREET.flatMap((x) => [x[0], x[1]]).filter((t) => !window.Q.api.TTS.file(t)));
  assert(sm.length === 0, 'every pair is voiced' + (sm.length ? ': ' + sm.join(' | ') : ''));
  await p.evaluate(() => document.querySelector('.street').scrollIntoView()); await shot(p, 's6-street.png');

  // pets
  await p.click('[data-tab=shop]'); await p.waitForTimeout(300);
  await p.click('[data-pet=tazy]'); await p.waitForTimeout(200);
  let st = await p.evaluate(() => window.qDebug.state());
  assert(st.pet && st.pet.id === 'tazy' && st.coins === 600, 'Құмай-тазы adopted for free');
  assert((await p.innerText('.pet-card')).includes('Жас'), 'six lessons done — the pet is «Жас»');
  assert(!!(await p.$('.pet-card.hungry #petfeed')), 'the pet is hungry and offers Дастархан Master');
  await p.click('[data-pacc=crown]'); await p.waitForTimeout(200);
  st = await p.evaluate(() => window.qDebug.state());
  assert(st.coins === 300 && st.pet.acc.includes('crown'), 'the golden crown bought for 300 🪙');
  await p.evaluate(() => document.querySelector('.pets').scrollIntoView()); await shot(p, 's6-pet-hungry.png');
  // feeding = the same path the arcade uses after a won dinner
  await p.evaluate(() => { const S = window.qDebug.state(), f = window.QPET.feed(S.pet, window.QZHAL.today()); S.pet = f.st; S.coins += f.bonus; window.Q.api.save(); window.Q.api.refresh(); });
  await p.waitForTimeout(200);
  assert(!(await p.$('.pet-card.hungry')) && (await p.innerText('.pet-card')).includes('Накормлен'), 'after the dinner the pet is fed today');
  await p.evaluate(() => document.querySelector('.pets').scrollIntoView()); await shot(p, 's6-pet-fed.png');

  // Бәйге
  await p.click('[data-tab=me]'); await p.waitForTimeout(300);
  await p.fill('#bcls', '4ә'); await p.dispatchEvent('#bcls', 'change'); await p.waitForTimeout(300);
  const code = await p.$eval('#bcode', (e) => e.textContent).catch(() => '');
  const dec = await p.evaluate((c) => window.QBAIGE.decode(c), code);
  assert(dec && dec.name === 'Әлібек' && dec.cls === '4Ә' && dec.xp === 777 && dec.lessons === 6, 'the pupil code carries name, class, XP, lessons');
  assert(!!(await p.$('.baige-qr svg')), 'a QR of the code is drawn (offline)');
  await p.evaluate(() => document.querySelector('.baige').scrollIntoView()); await shot(p, 's6-baige.png');
  await p.click('#bteach'); await p.waitForTimeout(300);
  const other = await p.evaluate(() => window.QBAIGE.encode({ name: 'Дана', cls: '4А', xp: 500, lessons: 9, day: 'd' }));
  await p.fill('#bcodes', code + '\n' + other + '\nQV1-oops-AAA'); await p.waitForTimeout(200);
  const board = await p.innerText('#bboard');
  assert(board.includes('4Ә') && board.indexOf('Әлібек') < board.indexOf('Дана') && board.includes('опечаткой: 1'), 'the teacher board ranks pupils and classes and flags a typo');
  await shot(p, 's6-board.png');
  assert(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close();
})();
