// Жалқаубек Live-Ops (master plan, sprint 4): the daily offline «пакость». Spoiled forms below are written by hand
// first (TDD); the correct forms always come from web/grammar-core.js.
const assert = require('assert');
const Z = require('../web/zhalkau-core.js'), G = require('../web/grammar-core.js');
let n = 0; const eq = (a, b, m) => { assert.strictEqual(a, b, m + ': ' + a + ' ≠ ' + b); n++; };

// 1. the tricks themselves
eq(Z.spoil.voice('кітап', 'men'), 'кітапым', 'forgot to voice п');          // right: кітабым
eq(Z.spoil.voice('құлақ', 'sen'), 'құлақың', 'forgot to voice қ');          // right: құлағың
eq(Z.spoil.vowel('мұрын', 'men'), 'мұрыным', 'kept the fleeting vowel');     // right: мұрным
eq(Z.spoil.vowel('ауыз', 'ol'), 'ауызы', 'kept the fleeting vowel');         // right: аузы
eq(Z.spoil.vowel('қалам', 'men'), 'қалмым', 'ate a vowel that stays');       // right: қаламым
eq(Z.spoil.harmony('үй'), 'үйлар', 'hard ending on a soft word');            // right: үйлер
eq(Z.spoil.harmony('бала'), 'балалер', 'soft ending on a hard word');        // right: балалар
eq(Z.spoil.ending('мектеп'), 'Мен мектеп барамын.', 'hid the dative');       // right: Мен мектепке барамын.
eq(Z.right.ending('мектеп'), 'Мен мектепке барамын.', 'dative sentence');
eq(Z.right.voice('кітап', 'men'), G.possessive('кітап', 'men'), 'right form = engine');

// 2. the daily event: deterministic offline, rotates the theme day by day, half right / half spoiled
const a = Z.daily('2026-11-14'), b = Z.daily('2026-11-14'), c = Z.daily('2026-11-15');
assert.deepStrictEqual(a, b, 'same day — same event'); n++;
assert.notStrictEqual(a.theme.id, c.theme.id, 'next day — another trick'); n++;
const seen = new Set();
for (let d = 1; d <= 60; d++) {
  const day = '2026-' + String(11 + Math.floor((d - 1) / 30)).padStart(2, '0') + '-' + String(((d - 1) % 30) + 1).padStart(2, '0');
  const ev = Z.daily(day); seen.add(ev.theme.id);
  eq(ev.items.length, Z.ITEMS, day + ' items');
  const spoiled = ev.items.filter((x) => !x.ok).length;
  assert.ok(spoiled >= 4 && spoiled <= 8, day + ': 4–8 spoiled items, got ' + spoiled); n++;
  for (const it of ev.items) {
    assert.ok(it.right && it.shown && it.theme === ev.theme.id, 'item fields'); n++;
    if (it.ok) eq(it.shown, it.right, 'a «right» item shows the engine form');
    else assert.notStrictEqual(it.shown, it.right, 'a spoiled item differs from the right form: ' + it.shown), n++;
  }
  assert.strictEqual(new Set(ev.items.map((x) => x.right)).size, ev.items.length, day + ': no repeated items'); n++;
}
eq(seen.size, Z.THEMES.length, 'all tricks appear over two months');
for (const t of Z.THEMES) { assert.ok(t.kk && t.ru && t.en && t.rule.ru && t.rule.en, 'theme texts ' + t.id); n++; }

// 3. every candidate of every theme spoils into something different from the engine's form
for (const t of Z.THEMES) for (const it of Z.all(t.id)) { assert.notStrictEqual(it.wrong, it.right, t.id + ' ' + it.right); n++; }
console.log('zhalkau: ' + n + ' checks passed');
