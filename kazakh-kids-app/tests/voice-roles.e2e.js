// In the real games: Баян апай reads riddles and asks in the room, Әнел reads the blueprint, each line is
// labelled with the speaker and played with the speaker's take (even with the ISEKE narrator selected).
// Run: node tests/voice-roles.e2e.js [screenshot dir]
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.argv[2] || null, BASE = 'file://' + path.resolve(__dirname, '../web/index.html');
const ok = (c, m) => { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('ok -', m); };

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 420, height: 880 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(BASE);
  await p.evaluate(() => localStorage.setItem('qazaqsha-oyna-v1', JSON.stringify({ onboarded: true, name: 'T', lang: 'ru', voice: 'iseke', lvlSeen: 99, lgSeen: 9, giftDay: 'x', grade: 1 })));
  await p.reload(); await p.waitForTimeout(500);
  for (let i = 0; i < 6 && await p.$('#rok'); i++) { await p.click('#rok'); await p.waitForTimeout(100); }
  // record what is spoken and which file it resolves to
  await p.evaluate(() => {
    const T = window.Q.api.TTS, orig = T.speak;
    window.__said = [];
    T.speak = function (text, quiet, who) { window.__said.push({ text, who: who || null, file: T.file(text, who) }); return orig.call(T, text, true, who); };
  });
  const said = () => p.evaluate(() => window.__said.splice(0));
  const C = await p.evaluate(() => window.QCURRICULUM);

  // Тіл Кереметі: the clue is Баян апай's, from audio/ (not the ISEKE narrator pack)
  await p.evaluate(() => window.Q.api.startGame('tg3d_wheel')); await p.waitForTimeout(2600);
  let s = await said();
  const clue = s.find((x) => C.riddles.some((r) => r.clue === x.text));
  ok(clue && clue.who === 'APAI' && /^audio\//.test(clue.file), 'riddle clue spoken by Баян апай from her own file: ' + JSON.stringify(clue));
  ok(s.some((x) => x.who === 'ATA'), 'Ата still hosts the wheel');
  ok((await p.$eval('#whc', (e) => e.textContent).catch(() => '')).includes('Баян апай:'), 'the clue is labelled «Баян апай:»');
  if (OUT) await p.screenshot({ path: `${OUT}/roles-wheel.png` });
  await p.evaluate(() => window.Q.api.renderHome()); await said();

  // Сәулетші шеберханасы: Баян апай asks to choose, Әлібек invites, Әнел reads the blueprint questions
  await p.evaluate(() => window.Q.api.startGame('tg3d_workshop')); await p.waitForTimeout(600);
  s = await said();
  ok(s.some((x) => x.who === 'APAI' && /саламыз/.test(x.text)), 'Баян апай: «Қай ғимаратты саламыз?»');
  await p.click('[data-b="0"]'); await p.waitForTimeout(4600);
  s = await said();
  const order = s.map((x) => x.who).join(',');
  ok(/^ALIBEK,ANEL,ANEL/.test(order), 'Әлібек → Әнел (blueprint) → Әнел (question): ' + order);
  const q = s[2];
  ok(q && /^audio\//.test(q.file), 'blueprint question plays from audio/: ' + JSON.stringify(q));
  const panel = await p.$eval('#wsp', (e) => e.innerText);
  ok(panel.includes('Әнел:'), 'question labelled «Әнел:»');
  if (OUT) await p.screenshot({ path: `${OUT}/roles-workshop.png` });
  // a question the architect also asks resolves to Әнел's own take
  const shared = await p.evaluate(() => ({ anel: window.Q.api.TTS.file('Оның биіктігі қанша?', 'ANEL'), arch: window.Q.api.TTS.file('Оның биіктігі қанша?', 'ARCH') }));
  ok(shared.anel !== shared.arch && shared.anel.startsWith('audio/') && shared.arch.startsWith('audio/'), 'shared sentence: separate files for Әнел and the architect ' + JSON.stringify(shared));
  // 🔊 on the line replays the same speaker
  await p.click('#wsp [data-who="ANEL"]'); s = await said();
  ok(s.length === 1 && s[0].who === 'ANEL', '🔊 replays Әнел');
  await p.evaluate(() => window.Q.api.renderHome()); await said();

  // Жақсы істер бөлмесі: Баян апай asks «Оны қайда қоямыз?», Жалқаубек says where his things go
  await p.evaluate(() => window.Q.api.startGame('tg3d_room')); await p.waitForTimeout(400);
  await p.click('#rgo'); await p.waitForTimeout(1500);
  s = await said();
  ok(s.some((x) => x.who === 'APAI' && /қайда қоямыз/.test(x.text)), 'Баян апай asks where to put it');
  const item = await p.evaluate(() => { const C = window.QCURRICULUM; return C.room.items; });
  const label = await p.$eval('#rmp', (e) => e.innerText);
  const cur = item.find((x) => label.includes(x.kk));
  await p.click(`#rmp [data-c="${cur.to}"]`); await p.waitForTimeout(300);
  s = await said();
  ok(s.some((x) => x.who === 'ZHALKAU' && x.text === cur.say), 'Жалқаубек: «' + cur.say + '»');
  if (OUT) await p.screenshot({ path: `${OUT}/roles-room.png` });
  await p.evaluate(() => window.Q.api.renderHome()); await said();

  // Dialogue: narration by Баян апай
  await p.evaluate(() => window.Q.api.startGame('dlg_bus')); await p.waitForTimeout(500);
  s = await said();
  ok(s[0] && s[0].who === 'APAI' && (await p.$eval('.dlg-who', (e) => e.textContent)) === 'Баян апай', 'dialogue narration: Баян апай');
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 3).join(' | '));
  await b.close();
})();
