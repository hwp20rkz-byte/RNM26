// A voice pack made by tools/make-audio-fs.mjs shows up in Profile → Voice and the game plays from it.
// Uses a throw-away pack (a copy of one ISEKE file) and restores web/audio-packs.js afterwards.
// ISSAI was retired on 13.11.2026: the choice is ISEKE or a pack; a stored «issai» reads as ISEKE.
// Run: node tests/voice-packs.e2e.mjs
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writePacksIndex } from '../tools/make-audio-fs.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const WEB = resolve(dirname(fileURLToPath(import.meta.url)), '../web');
global.window = {}; require('../web/data.js');
const key = (t) => window.QDATA.audioKey(t);
const fail = (m) => { console.error('FAIL:', m); process.exitCode = 1; };
const ok = (c, m) => (c ? console.log('ok -', m) : fail(m));

const IN = 'Сәлем! Мен сенің дауысыңмын.', OUT = 'Қайырлы таң!';
const pack = join(WEB, 'audio-e2etest'), saved = readFileSync(join(WEB, 'audio-packs.js'));
mkdirSync(pack, { recursive: true });
copyFileSync(join(WEB, 'audio-iseke', key(IN) + '.mp3'), join(pack, key(IN) + '.mp3'));
writeFileSync(join(pack, 'manifest.json'), JSON.stringify({ id: 'e2etest', label: 'Тест-дауыс', by: 'Freedom Speech', gender: 'f', keys: [key(IN)] }));
writePacksIndex(WEB);
const b = await chromium.launch();
try {
  const p = await b.newPage({ viewport: { width: 400, height: 860 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + join(WEB, 'index.html'));
  // an old profile that had chosen ISSAI
  await p.evaluate(() => localStorage.setItem('qazaqsha-oyna-v1', JSON.stringify({ onboarded: true, name: 'T', lang: 'ru', lvlSeen: 99, lgSeen: 9, giftDay: 'x', grade: 1, voice: 'issai' })));
  await p.reload(); await p.waitForTimeout(400);
  for (let i = 0; i < 6 && await p.$('#rok'); i++) { await p.click('#rok'); await p.waitForTimeout(100); }
  await p.click('[data-tab=me]'); await p.waitForTimeout(200);
  const labels = await p.$$eval('[data-voice]', (x) => x.map((e) => e.textContent));
  ok(labels.length === 2 && labels[0].includes('ISEKE') && labels[1].includes('Тест-дауыс') && !labels.join().includes('ISSAI'), 'profile offers ISEKE and the pack, no ISSAI: ' + labels.join(' | '));
  ok(await p.$eval('[data-voice=iseke]', (e) => e.classList.contains('on')), 'a stored ISSAI choice shows as ISEKE');
  const path = (t) => p.evaluate((t) => window.Q.api.TTS.file(t), t);
  ok((await path(IN)) === 'audio-iseke/' + key(IN), 'the old ISSAI profile plays ISEKE');
  await p.click('[data-voice=e2etest]'); await p.waitForTimeout(200);
  ok(await p.$eval('[data-voice=e2etest]', (e) => e.classList.contains('on')), 'pack button is selected');
  ok((await path(IN)) === 'audio-e2etest/' + key(IN), 'phrase in the pack plays from it');
  ok((await path(OUT)) === 'audio-iseke/' + key(OUT), 'phrase missing from the pack falls back to ISEKE');
  const plays = await p.evaluate((u) => new Promise((r) => { const a = new Audio(u + '.mp3'); a.oncanplaythrough = () => r(true); a.onerror = () => r(false); setTimeout(() => r(false), 4000); }), 'audio-e2etest/' + key(IN));
  ok(plays, 'the pack file loads in the WebView');
  await p.click('[data-voice=iseke]'); await p.waitForTimeout(100);
  ok((await path(IN)) === 'audio-iseke/' + key(IN), 'switching back to ISEKE works');
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
} finally {
  await b.close();
  rmSync(pack, { recursive: true, force: true });
  writeFileSync(join(WEB, 'audio-packs.js'), saved);
}
