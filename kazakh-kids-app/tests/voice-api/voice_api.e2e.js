// Contract test of web/voice.js against mock_server.py (same API as the QazaqVerse Voice guide).
// Fake microphone = a WAV with a spoken phrase. Run:
//   K=$(node -e "global.window={};require('./web/data.js');process.stdout.write(QDATA.audioKey('Сәлем, досым!'))")
//   ffmpeg -y -f lavfi -t 0.8 -i anullsrc=r=44100:cl=mono -i web/audio/$K.mp3 -filter_complex "[1]aresample=44100[s];[0][s]concat=n=2:v=0:a=1" -ac 1 -c:a pcm_s16le /tmp/mic.wav
//   python3 tests/voice-api/mock_server.py web/audio/$K.mp3 &      # listens on 127.0.0.1:8765, key «testkey»
//   MIC=/tmp/mic.wav node tests/voice-api/voice_api.e2e.js
const { chromium } = require('playwright');
const path = require('path');
const DIR = process.env.OUT || require('os').tmpdir(), MIC = process.env.MIC || path.join(DIR, 'mic.wav');
const URL = 'file://' + path.resolve(__dirname, '../../web/index.html'), KEY = 'qazaqsha-oyna-v1', M = 'http://127.0.0.1:8765';
const results = []; const check = (name, ok, info) => { results.push([ok ? 'PASS' : 'FAIL', name, info || '']); };
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${MIC}`, '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 400, height: 860 }, permissions: ['microphone'] });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  const mode = m => fetch(`${M}/_mode?m=${m}`);
  const log = async () => (await (await fetch(`${M}/_log`)).json());
  const tap = sel => p.evaluate(s => { const e = document.querySelector(s); if (e) { e.click(); return true; } return false; }, sel);
  const setState = async (s) => { await p.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [KEY, Object.assign({ onboarded: true, name: 'Айгерім', lang: 'ru', lvlSeen: 99, lgSeen: 9, giftDay: 'x', grade: 1, micOn: true, ach: { a_first: 1 } }, s)]); await p.reload(); await p.waitForTimeout(600); };
  const drain = async () => { for (let i = 0; i < 8 && await p.$('#rok'); i++) { await tap('#rok'); await p.waitForTimeout(120); } };
  await mode('ok');
  await p.goto(URL);

  // 1. health with key in the path → panel says online, key masked
  await setState({ sttUrl: `${M}/k/testkey/` });
  await drain(); await tap('[data-tab=me]'); await p.waitForTimeout(400);
  const panel = await p.evaluate(() => [...document.querySelectorAll('.panel')].map(x => x.innerText).find(t => /Микрофон/.test(t)) || '');
  check('health → online', /сервер QazaqVerse Voice/.test(panel) && /на связи/.test(panel), panel.split('\n')[0]);
  check('key masked in status', /\/k\/tes•••/.test(panel) && !/testkey —/.test(panel));
  await p.screenshot({ path: `${DIR}/panel.png` });

  // 2. assess from the profile «Проба»: WAV 16 kHz mono PCM16, target in the query, server score shown
  let n0 = (await log()).length;
  await tap('#vtry'); await p.waitForSelector('#vtryres .v-res', { timeout: 20000 }).catch(() => {});
  const L = (await log()).slice(n0).find(x => x.path === '/assess');
  check('POST /assess sent', !!L, JSON.stringify(L));
  check('WAV 16k mono PCM16', L && L.rate === 16000 && L.ch === 1 && L.bits === 16 && L.fmt === 1 && L.ctype === 'audio/wav', L && `${L.seconds}s`);
  check('target + lang in query', L && L.q.target === 'Сәлем, досым!' && L.q.lang === 'ru');
  const res = await p.$eval('#vtryres', e => e.innerText).catch(() => '');
  check('server score 85.5 → 86% shown, feedback shown', /86%/.test(res) && /Обрати внимание/.test(res), res.replace(/\s+/g, ' '));
  await p.screenshot({ path: `${DIR}/assess.png` });

  // 3. silence (HTTP 200 + error) → ask again
  await mode('silence'); await tap('#vtry'); await p.waitForFunction(() => /Не слышу/.test(document.querySelector('#vtryres').innerText), null, { timeout: 20000 }).catch(() => {});
  check('silence → «Не слышу»', /Не слышу/.test(await p.$eval('#vtryres', e => e.innerText)));

  // 4. 503 stt_unavailable → skip offered
  await mode('down'); await tap('#vtry'); await p.waitForFunction(() => /временно/.test(document.querySelector('#vtryres').innerText), null, { timeout: 20000 }).catch(() => {});
  check('503 → «временно недоступно»', /временно недоступно/.test(await p.$eval('#vtryres', e => e.innerText)));

  // 5. 429 → message, and no new requests for a minute
  await mode('ok'); await p.evaluate(() => window.QVOICE.ping()); await p.waitForTimeout(300);
  await mode('429'); await tap('[data-tab=me]'); await p.waitForTimeout(300);
  await tap('#vtry'); await p.waitForFunction(() => /Слишком много/.test((document.querySelector('#vtryres') || {}).innerText || ''), null, { timeout: 20000 }).catch(() => {});
  check('429 → «Слишком много»', /Слишком много/.test(await p.$eval('#vtryres', e => e.innerText).catch(() => '')));
  n0 = (await log()).length;
  await mode('ok'); await tap('#vtry'); await p.waitForTimeout(4000);
  check('429 cool-down: no retry loop', (await log()).slice(n0).filter(x => x.path === '/assess').length === 0);

  // 6. wrong key → 401 → clear message
  await p.evaluate(() => { document.querySelector('#vurl').value = 'http://127.0.0.1:8765/k/wrong'; });
  await tap('#vtest'); await p.waitForTimeout(800);
  const t401 = await p.$eval('#toast', e => e.innerText).catch(() => '');
  check('401 → «не принял ключ»', /не принял ключ/.test(t401), t401);
  await p.evaluate(() => { document.querySelector('#vurl').value = 'mac-mini.ts.net:8443'; }); await tap('#vtest'); await p.waitForTimeout(300);
  check('no scheme → hint', /https:\/\//.test(await p.$eval('#toast', e => e.innerText)));

  // 7. lesson «Айт!» task end-to-end: result shown and «Тексеру» enabled
  await setState({ sttUrl: `${M}/k/testkey` }); await drain();
  await p.evaluate(() => window.QVOICE.ping()); await p.waitForTimeout(300);
  let found = false;
  for (let attempt = 0; attempt < 6 && !found; attempt++) {
    await tap('[data-tab=path]'); await p.waitForTimeout(200);
    await tap('[data-l]'); await p.waitForTimeout(150); await tap('#go'); await p.waitForTimeout(200);
    await p.evaluate(() => window.qDebug.setHearts(99));
    for (let i = 0; i < 40; i++) {
      if (await p.$('#mic')) { found = true; break; }
      if (await p.$('.result')) break;
      if (await p.$('#learned')) { await tap('#learned'); continue; }
      if (await p.$('.match')) { const ks = await p.$$eval('.match [data-side=L]', els => els.map(e => e.dataset.k)); for (const k of ks) await p.evaluate(k => { document.querySelector(`.match [data-side=L][data-k="${k}"]`).click(); document.querySelector(`.match [data-side=R][data-k="${k}"]`).click(); }, k); await p.waitForTimeout(300); await tap('#next'); continue; }
      if (await p.$('.slots')) { for (let j = 0; j < 6; j++) await tap('.bank .tile:not(.ghost)'); } else if (await p.$('.bank')) await tap('.bank .tile:not(.ghost)');
      else await p.evaluate(() => { const c = [...document.querySelectorAll('.l-body .card')]; if (c.length) c[0].click(); });
      await tap('#lc'); await p.waitForTimeout(30); await tap('#next'); await p.waitForTimeout(30);
    }
  }
  check('lesson has «Айт!» task when server is online', found);
  if (found) {
    await tap('#mic'); await p.waitForSelector('#vres .v-res', { timeout: 20000 }).catch(() => {});
    check('lesson: score shown', !!(await p.$('#vres .v-res')));
    check('lesson: «Тексеру» enabled', await p.$eval('#lc', e => !e.disabled));
    await p.screenshot({ path: `${DIR}/lesson-speak.png` });
    await mode('down'); await tap('#mic'); await p.waitForTimeout(6000);
    check('lesson: after server error skip is a button', await p.$eval('#vskip', e => e.className === 'btn ghost'));
    await p.screenshot({ path: `${DIR}/lesson-skip.png` });
    await mode('ok');
  }

  // 8. /tts for a phrase that is not bundled; bundled phrases never hit the network
  await p.evaluate(() => window.QVOICE.ping()); await p.waitForTimeout(300);
  n0 = (await log()).length;
  await p.evaluate(() => { window.Q.api.TTS.speak('Бұл фраза ойында жоқ, оны сервер айтады', true); window.Q.api.TTS.speak('Сәлем, досым!', true); });
  await p.waitForTimeout(1200);
  const tts = (await log()).slice(n0).filter(x => x.path === '/tts');
  check('/tts only for the non-bundled phrase', tts.length === 1 && tts[0].q.voice === 'iseke' && tts[0].q.fmt === 'mp3', JSON.stringify(tts.map(x => x.q.text)));

  // 9. server off → app still works (no speak tasks, no errors)
  await setState({ sttUrl: 'http://127.0.0.1:9/k/testkey' }); await p.waitForTimeout(800);
  check('server unreachable → engine falls back', await p.evaluate(() => window.QVOICE.engine()) === 'none');

  check('no page errors', errs.length === 0, errs.join(' | '));
  results.forEach(r => console.log(r.join('  ')));
  console.log(results.filter(r => r[0] === 'PASS').length + '/' + results.length + ' passed');
  await b.close();
  process.exit(results.every(r => r[0] === 'PASS') ? 0 : 1);
})();
