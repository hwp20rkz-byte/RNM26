// Voice lab (TEST build): three tabs render from web/voice-lab/lab-data.js, every listed take exists, a preset is really
// rendered on the device (WSOLA + Web Audio graph), and the profile shows the lab button only when window.QTEST is set.
// Run: node tests/voice-lab.e2e.mjs [screenshotDir]
import { existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const WEB = resolve(dirname(fileURLToPath(import.meta.url)), '../web');
const SHOTS = process.argv[2]; if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const fail = (m) => { console.error('FAIL:', m); process.exitCode = 1; };
const ok = (c, m) => (c ? console.log('ok -', m) : fail(m));

global.window = {}; require(join(WEB, 'voice-lab', 'lab-data.js'));
const L = window.QVLAB;
const files = [...L.voices.flatMap((v) => v.takes.map((t) => t.file)), ...L.features.map((f) => f.file)].filter(Boolean);
ok(files.every((f) => existsSync(join(WEB, 'voice-lab', f + '.mp3'))), 'every take listed in lab-data.js exists: ' + files.length + ' files');
ok(L.voices.filter((v) => v.ok).length >= 15, 'at least 15 catalog voices work: ' + L.voices.filter((v) => v.ok).length);

const b = await chromium.launch({ args: ['--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required'] });
try {
  const p = await b.newPage({ viewport: { width: 400, height: 860 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + join(WEB, 'voice-lab.html')); await p.waitForTimeout(400);
  const cards = await p.$$eval('[data-tune]', (x) => x.length);
  ok(cards === L.voices.filter((v) => v.ok).length, 'voices tab: one card per working voice (' + cards + ')');
  if (SHOTS) await p.screenshot({ path: join(SHOTS, 'lab-voices.png') });
  await p.click('[data-tab=features]'); await p.waitForTimeout(200);
  const rows = await p.$$eval('main .row', (x) => x.length);
  ok(rows >= L.features.length, 'features tab lists every option (' + rows + ')');
  ok(await p.$eval('main', (m) => /не принято: HTTP 400/.test(m.textContent)), 'rejected options are shown with their HTTP status');
  if (SHOTS) await p.screenshot({ path: join(SHOTS, 'lab-features.png'), fullPage: false });
  await p.click('[data-tab=tune]'); await p.waitForTimeout(200);
  await p.click('[data-preset="3"]');                                 // «Добрый великан»: pitch −4, tempo 0.9, bass, reverb
  await p.waitForFunction(() => window.__labRendered, null, { timeout: 20000 }).catch(() => null);
  const r = await p.evaluate(() => window.__labRendered);
  ok(r && r.seconds > 1 && r.params.pitch === -4, 'a preset is rendered on the device: ' + JSON.stringify(r));
  const cast = await p.$eval('#t-cast', (e) => e.textContent);
  ok(/"pitchSt":\s*-4/.test(cast) && /"tempo":\s*0\.9/.test(cast) && /bass=g=6/.test(cast) && /aecho=/.test(cast), 'cast line for fs-cast.json: ' + cast.slice(0, 120));
  const tiny = await p.$$eval('button, a.btn, select, input[type=range]', (x) => x.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height < 43.5; }).length);
  ok(tiny === 0, 'every control is at least 44 px tall on a phone');
  const wide = await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  ok(wide, 'no horizontal scroll on a phone');
  if (SHOTS) await p.screenshot({ path: join(SHOTS, 'lab-tune.png') });
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));

  // profile: the lab button only in the TEST build
  const g = await b.newPage({ viewport: { width: 400, height: 860 } });
  const seed = () => localStorage.setItem('qazaqsha-oyna-v1', JSON.stringify({ onboarded: true, name: 'T', lang: 'ru', lvlSeen: 99, lgSeen: 9, giftDay: 'x', grade: 1 }));
  for (const test of [false, true]) {
    if (test) await g.addInitScript(() => { window.QTEST = true; });
    await g.goto('file://' + join(WEB, 'index.html')); await g.evaluate(seed); await g.reload(); await g.waitForTimeout(400);
    for (let i = 0; i < 6 && await g.$('#rok'); i++) { await g.click('#rok'); await g.waitForTimeout(100); }
    await g.click('[data-tab=me]'); await g.waitForTimeout(200);
    ok(!!(await g.$('#voicelab')) === test, (test ? 'TEST build shows' : 'normal build hides') + ' the voice lab button');
  }
} finally { await b.close(); }
