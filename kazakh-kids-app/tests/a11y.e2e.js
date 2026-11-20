// Run: node tests/a11y.e2e.js [shotDir]
// Accessibility check on a phone: grey hints meet WCAG AA; «Үлкен әріп» enlarges the type and survives a reload;
// no sideways scroll with large text on the home, profile and «Мектеп» screens.
const { chromium } = require('playwright'); const path = require('path');
const OUT = process.argv[2];
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('ok -', m); };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 400, height: 860 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../web/index.html') + '?e2e=1');
  await p.evaluate(() => localStorage.setItem('qazaqsha-oyna-v1', JSON.stringify({ onboarded: true, name: 'T', lang: 'ru', lvlSeen: 99, lgSeen: 9, giftDay: 'x', grade: 2 })));
  await p.reload(); await p.waitForTimeout(400);
  for (let i = 0; i < 6 && await p.$('#rok'); i++) { await p.click('#rok'); await p.waitForTimeout(100); }
  // contrast of .muted on white (WCAG relative luminance)
  const cr = await p.evaluate(() => {
    const el = document.createElement('span'); el.className = 'muted'; el.textContent = 'x'; document.body.appendChild(el);
    const m = getComputedStyle(el).color.match(/\d+/g).map(Number); el.remove();
    const L = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const lum = 0.2126 * L(m[0]) + 0.7152 * L(m[1]) + 0.0722 * L(m[2]);
    return 1.05 / (lum + 0.05);
  });
  assert(cr >= 4.5, 'grey hints contrast ' + cr.toFixed(2) + ':1 ≥ 4.5:1');
  const fs0 = await p.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fs-1')));
  await p.click('[data-tab=me]'); await p.waitForTimeout(300);
  await p.click('[data-bigtext="1"]'); await p.waitForTimeout(300);
  await p.reload(); await p.waitForTimeout(500);
  const fs1 = await p.evaluate(() => ({ fs: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fs-1')), big: document.documentElement.classList.contains('big-text') }));
  assert(fs1.big && fs1.fs > fs0, 'large text on and kept after a reload: ' + fs0 + ' → ' + fs1.fs + ' px');
  const wide = async (name) => { const w = await p.evaluate(() => document.documentElement.scrollWidth); assert(w <= 400, name + ': no sideways scroll (' + w + ' px)'); if (OUT) await p.screenshot({ path: OUT + '/big-' + name + '.png' }); };
  await wide('home');
  await p.click('[data-tab=me]'); await p.waitForTimeout(300); await wide('profile');
  await p.evaluate(() => window.Q.api.startGame('mektep')); await p.waitForTimeout(300);
  await p.click('[data-subj=cities]'); await p.waitForTimeout(150); await p.click('.mk-g[data-grade="3"]'); await p.click('[data-topic=c3guide]'); await p.waitForTimeout(300);
  await wide('mektep-task');
  assert(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close();
})();
