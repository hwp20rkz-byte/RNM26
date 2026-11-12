// E2E for the «Сөздік» hub (phrasebook, grammar, dictionary, proverbs, idioms) in RU and EN.
// Run: node tests/phrasebook.e2e.js [screenshot dir]
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.argv[2] || null, BASE = 'file://' + path.resolve(__dirname, '../web/index.html');
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('ok -', m); };

async function run(lang, viewport) {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(BASE);
  await p.evaluate((lang) => localStorage.setItem('qazaqsha-oyna-v1', JSON.stringify({ onboarded: true, name: 'Тест', lang, lvlSeen: 99, lgSeen: 9, giftDay: 'x', grade: 1 })), lang);
  await p.reload(); await p.waitForTimeout(500);
  for (let i = 0; i < 6 && await p.$('#rok'); i++) { await p.click('#rok'); await p.waitForTimeout(120); }
  await p.click('[data-tab=dict]'); await p.waitForTimeout(200);
  assert(await p.$$eval('.ph-tabs button', (x) => x.length) === 5, lang + ': 5 sub-tabs');
  assert(await p.$$eval('[data-topic]', (x) => x.length) === 16, lang + ': 16 phrasebook topics');
  if (OUT) await p.screenshot({ path: `${OUT}/ph-${lang}-topics.png` });

  // a topic with a dialogue, then its quiz played to the end
  await p.click('[data-topic=shop]'); await p.waitForTimeout(150);
  assert(await p.$$eval('.ph-say', (x) => x.length) === 6, lang + ': shop dialogue has 6 lines');
  const missing = await p.evaluate(() => [...document.querySelectorAll('#phmain [data-say]')].map((b) => b.dataset.say).filter((t) => !window.Q.api.TTS.file(t)));
  assert(missing.length === 0, lang + ': every shop phrase has bundled audio' + (missing.length ? ' — missing: ' + missing.slice(0, 5).join(' | ') : ''));
  if (OUT) await p.screenshot({ path: `${OUT}/ph-${lang}-topic.png`, fullPage: false });
  const coins0 = await p.evaluate(() => window.qDebug.state().coins);
  await p.click('[data-train="t_shop"]'); await p.waitForTimeout(150);
  let n = 0;
  while (await p.$('.ph-opt') && n++ < 12) {
    const ans = await p.evaluate(() => { const q = document.querySelectorAll('.ph-opt'); return q.length; });
    await p.click('.ph-opt >> nth=0'); await p.waitForTimeout(60);
    if (n === 1 && OUT) await p.screenshot({ path: `${OUT}/ph-${lang}-quiz.png` });
    await p.click('#qn'); await p.waitForTimeout(60);
    if (!ans) break;
  }
  assert(!!(await p.$('.ph-result')), lang + ': quiz reaches the result screen after ' + n + ' questions');
  const coins1 = await p.evaluate(() => window.qDebug.state().coins);
  assert(coins1 >= coins0, lang + ': coins never drop (' + coins0 + ' → ' + coins1 + ')');
  await p.click('#qb'); await p.waitForTimeout(150);

  // grammar: open every card, change pickers, run every trainer one step
  await p.click('[data-ph=gram]'); await p.waitForTimeout(150);
  const cards = await p.$$eval('[data-card]', (x) => x.map((b) => b.dataset.card));
  for (const c of cards) { await p.click(`[data-card="${c}"]`); await p.waitForTimeout(40); }
  assert(cards.length === 13 && (await p.$$eval('.ph-card.open', (x) => x.length)) === 13, lang + ': 13 grammar cards open');
  await p.click('[data-noun="мектеп"]'); await p.waitForTimeout(60);
  assert((await p.$$eval('.ph-f', (x) => x.map((e) => e.textContent))).includes('мектебім'), lang + ': possessive table shows мектебім');
  await p.click('[data-verb="оқы"]'); await p.click('[data-tense="past"]'); await p.waitForTimeout(60);
  assert((await p.$$eval('.ph-f', (x) => x.map((e) => e.textContent))).includes('оқыдым'), lang + ': verb table shows оқыдым');
  const gm = await p.evaluate(() => [...document.querySelectorAll('#phmain [data-say]')].map((b) => b.dataset.say).filter((t) => !window.Q.api.TTS.file(t)));
  assert(gm.length === 0, lang + ': every grammar form on screen has audio' + (gm.length ? ' — missing: ' + gm.slice(0, 8).join(' | ') : ''));
  if (OUT) await p.screenshot({ path: `${OUT}/ph-${lang}-grammar.png` });
  for (const t of await p.$$eval('[data-train]', (x) => x.map((b) => b.dataset.train))) {
    await p.click(`[data-train="${t}"]`); await p.waitForTimeout(60);
    const ok = !!(await p.$('.ph-opt'));
    await p.click('.ph-opt >> nth=1'); await p.waitForTimeout(40);
    const fb = await p.$eval('.ph-fb', (e) => e.textContent).catch(() => '');
    assert(ok && fb.length > 3, lang + ': trainer ' + t + ' runs (' + fb.slice(0, 60) + ')');
    await p.click('#qx'); await p.waitForTimeout(60);
  }

  // dictionary search in both directions
  await p.click('[data-ph=words]'); await p.waitForTimeout(150);
  await p.fill('#phq', lang === 'en' ? 'apple' : 'яблок'); await p.waitForTimeout(100);
  assert((await p.$eval('#phres', (e) => e.textContent)).includes('алма'), lang + ': search finds алма');
  await p.fill('#phq', 'бауырсақ'); await p.waitForTimeout(100);
  assert((await p.$$eval('#phres .ph-row', (x) => x.length)) >= 2, lang + ': Kazakh search finds words and phrases');
  if (OUT) await p.screenshot({ path: `${OUT}/ph-${lang}-search.png` });
  await p.fill('#phq', '');
  await p.click('[data-vt=animals]'); await p.waitForTimeout(100);
  assert((await p.$$eval('.ph-row', (x) => x.length)) === 23, lang + ': animals list');
  await p.click('[data-wv=lessons]'); await p.waitForTimeout(100);
  assert((await p.$$eval('.word-row', (x) => x.length)) > 10, lang + ': lesson words still listed');

  // proverbs + game, idioms
  await p.click('[data-ph=prov]'); await p.waitForTimeout(150);
  assert((await p.$$eval('.ph-prov', (x) => x.length)) === 48, lang + ': 48 proverbs');
  await p.click('[data-theme=bilim]'); await p.waitForTimeout(60);
  assert((await p.$$eval('.ph-prov', (x) => x.length)) === 8, lang + ': knowledge filter');
  await p.click('[data-train=proverbs]'); await p.waitForTimeout(80);
  assert((await p.$eval('.ph-q b', (e) => e.textContent)).endsWith('…'), lang + ': proverb game shows a first half');
  if (OUT) await p.screenshot({ path: `${OUT}/ph-${lang}-proverb.png` });
  await p.click('#qx'); await p.waitForTimeout(60);
  await p.click('[data-ph=idiom]'); await p.waitForTimeout(150);
  assert((await p.$$eval('.ph-row', (x) => x.length)) === 32, lang + ': 32 idioms');
  const all = await p.evaluate(() => {
    const P = window.QPHRASE, t = [];
    P.topics.forEach((x) => { x.phrases.forEach((p) => t.push(p.kk)); (x.dialog || []).forEach((l) => t.push(l.kk)); });
    P.proverbs.forEach((p) => t.push(p.kk)); P.idioms.forEach((p) => t.push(p.kk)); P.twisters.forEach((p) => t.push(p.kk));
    P.vocab.forEach((v) => v.words.forEach((w) => t.push(w.kk)));
    return t.filter((x) => !window.Q.api.TTS.file(x));
  });
  assert(all.length === 0, lang + ': all section content is voiced' + (all.length ? ' — ' + all.length + ' missing, e.g. ' + all.slice(0, 4).join(' | ') : ''));
  if (lang === 'en') {
    const ru = await p.evaluate(() => (window.qUntranslated ? Object.keys(window.qUntranslated) : []));
    console.log('   (untranslated RU strings seen: ' + ru.length + ')');
  }
  assert(errs.length === 0, lang + ': no page errors ' + errs.slice(0, 3).join(' | '));
  await b.close();
}
(async () => {
  await run('ru', { width: 400, height: 860 });
  await run('en', { width: 1280, height: 800 });
})();
