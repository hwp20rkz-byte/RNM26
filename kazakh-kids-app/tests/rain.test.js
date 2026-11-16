// «Жалғау жаңбыры»: plural endings from the engine vs reference forms written by hand; baskets; speed; scoring.
const assert = require('assert');
const R = require('../web/rain-core.js');
let n = 0; const eq = (a, b, m) => { assert.strictEqual(a, b, m + ': ' + a + ' ≠ ' + b); n++; };
// reference plurals (written by a person, not by the engine)
const REF = {
  кітап: 'кітаптар', дәптер: 'дәптерлер', қалам: 'қаламдар', үстел: 'үстелдер', мысық: 'мысықтар', ит: 'иттер', жылқы: 'жылқылар', сиыр: 'сиырлар',
  қой: 'қойлар', түйе: 'түйелер', балық: 'балықтар', құс: 'құстар', алма: 'алмалар', нан: 'нандар', сүт: 'сүттер', ет: 'еттер',
  үй: 'үйлер', есік: 'есіктер', терезе: 'терезелер', көше: 'көшелер', қала: 'қалалар', ауыл: 'ауылдар', мектеп: 'мектептер', дүкен: 'дүкендер',
  бала: 'балалар', қыз: 'қыздар', ұл: 'ұлдар', дос: 'достар', көз: 'көздер', қол: 'қолдар', аяқ: 'аяқтар', тіс: 'тістер',
  гүл: 'гүлдер', ағаш: 'ағаштар', тау: 'таулар', өзен: 'өзендер', жұлдыз: 'жұлдыздар', бұлт: 'бұлттар', күн: 'күндер', ай: 'айлар',
  доп: 'доптар', ойыншық: 'ойыншықтар', көлік: 'көліктер', кеме: 'кемелер', әже: 'әжелер', ата: 'аталар', мұғалім: 'мұғалімдер', дәрігер: 'дәрігерлер',
  сөз: 'сөздер', сабақ: 'сабақтар', сурет: 'суреттер', өлең: 'өлеңдер', жұмыртқа: 'жұмыртқалар', қасық: 'қасықтар', кесе: 'кеселер', шай: 'шайлар',
  бөрі: 'бөрілер', түлкі: 'түлкілер', аю: 'аюлар', қоян: 'қояндар'
};
eq(R.NOUNS.length, Object.keys(REF).length, 'every noun has a reference form');
const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
for (const w of R.NOUNS) {
  for (let k = 0; k < 30; k++) {
    const t = R.task(w, rnd);
    eq(t.plural, REF[w.kk], 'plural of ' + w.kk);
    assert.ok(R.SUFFIXES.includes(t.answer) && t.options.includes(t.answer) && new Set(t.options).size === 3, w.kk + ': 3 different baskets with the answer'); n++;
    assert.ok(t.options.includes(R.harmonyTwin(t.answer)), w.kk + ': the vowel-harmony twin is a basket'); n++;
    assert.ok(t.options.every((o) => R.SUFFIXES.includes(o)), w.kk + ': only real endings'); n++;
  }
  assert.ok(w.ru && w.en && w.e, w.kk + ' has translations and a picture'); n++;
}
eq(R.harmonyTwin('лар'), 'лер', 'harmony twin'); eq(R.harmonyTwin('тер'), 'тар', 'harmony twin back');
// speed: faster with each right answer, never below the floor
assert.ok(R.fallMs(0) === R.START_MS && R.fallMs(5) < R.fallMs(4) && R.fallMs(500) === R.MIN_MS, 'speed curve'); n++;
// scoring: ×2 from a streak of 5, ×3 from 10; a miss costs a heart and the streak
let s = R.START; for (let k = 0; k < 10; k++) s = R.answer(s, true);
eq(s.score, 4 * 10 + 5 * 20 + 1 * 30, 'streak multiplier'); eq(s.mult, 3, '×3 at 10');
s = R.answer(s, false); eq(s.hearts, R.HEARTS - 1, 'a miss costs a heart'); eq(s.streak, 0, 'streak reset'); eq(s.best, 10, 'best streak kept');
const d = R.deck(rnd); eq(new Set(d.map((w) => w.kk)).size, R.NOUNS.length, 'the deck holds every word once');
console.log('rain: ' + n + ' checks passed');
// every noun is voiced by the ISEKE narrator (the games say the word when it appears)
{ global.window = global; global.self = global; require('../web/data.js'); require('../web/audio-iseke/index.js');
  const miss = R.NOUNS.filter((w) => !global.QAUDIO_ISEKE[global.QDATA.audioKey(w.kk)]).map((w) => w.kk);
  assert.ok(miss.length === 0, 'unvoiced nouns: ' + miss.join(' ')); console.log('rain: all ' + R.NOUNS.length + ' nouns voiced'); }
