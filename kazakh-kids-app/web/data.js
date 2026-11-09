/* Общие помощники и каркас курса по классам.
 * Контент лежит в grade1.js, grade2.js, grade3.js — каждый файл добавляет свои разделы.
 *
 * Раздел (unit):  {id, kk, ru, hue, hero, mascot, lessons:[…]}
 * Урок (lesson):  {id, kk, ru, icon, words, sentences, fills, clocks, clocksLoc, nums, order, review}
 *   words     — {kk, ru, e}  e = эмодзи, цифра, короткая подпись («Пн») или цвет «c:hsl(…)»
 *   sentences — {kk, ru, alt?}  alt = другие верные порядки слов
 *   fills     — {pre, ans, post, opts, ru, task?, letter?}  пропуск в предложении
 *   clocks    — [часы, минуты];  nums — [от, до, шаг];  order — [{t, kk}] по порядку
 */
(function () {
  'use strict';

  var HOURS = ['', 'бір', 'екі', 'үш', 'төрт', 'бес', 'алты', 'жеті', 'сегіз', 'тоғыз', 'он', 'он бір', 'он екі'];
  // «нешеде?» — местный падеж: жеті → жетіде, үш → үште, алты → алтыда …
  var HOURS_LOC = ['', 'бірде', 'екіде', 'үште', 'төртте', 'бесте', 'алтыда', 'жетіде', 'сегізде', 'тоғызда', 'онда', 'он бірде', 'он екіде'];

  var UNITS_KK = ['', 'бір', 'екі', 'үш', 'төрт', 'бес', 'алты', 'жеті', 'сегіз', 'тоғыз'];
  var TENS_KK = ['', 'он', 'жиырма', 'отыз', 'қырық', 'елу', 'алпыс', 'жетпіс', 'сексен', 'тоқсан'];

  function numToKk(n) {
    if (n === 0) return 'нөл';
    var out = [];
    var th = Math.floor(n / 1000), h = Math.floor((n % 1000) / 100), t = Math.floor((n % 100) / 10), u = n % 10;
    if (th) out.push(th === 1 ? 'мың' : UNITS_KK[th] + ' мың');
    if (h) out.push(h === 1 ? 'жүз' : UNITS_KK[h] + ' жүз');
    if (t) out.push(TENS_KK[t]);
    if (u) out.push(UNITS_KK[u]);
    return out.join(' ');
  }
  function timeKk(h, m) { return 'Сағат ' + HOURS[h] + (m === 30 ? ' жарым' : ''); }
  function hourLoc(h) { return HOURS_LOC[h]; }

  // Ключ озвучки: одинаково считается в игре и в генераторе tools/make-audio.js (FNV-1a).
  function audioKey(t) {
    var k = String(t).toLowerCase().replace(/[—–]/g, ' ').replace(/[«»"]/g, '').replace(/\s+/g, ' ').trim();
    var h = 0x811c9dc5;
    for (var i = 0; i < k.length; i++) { h ^= k.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(36);
  }

  // Диапазоны чисел, для которых есть готовая озвучка (используются в заданиях «число → слова»).
  var NUM_RANGES = [[1, 99, 1], [100, 990, 10], [1000, 2000, 50]];

  window.QDATA = {
    GRADES: [
      { n: 1, kk: '1-сынып', ru: '1 класс', units: [] },
      { n: 2, kk: '2-сынып', ru: '2 класс', units: [] },
      { n: 3, kk: '3-сынып', ru: '3 класс', units: [] }
    ],
    HOURS: HOURS,
    HOURS_LOC: HOURS_LOC,
    NUM_RANGES: NUM_RANGES,
    numToKk: numToKk,
    timeKk: timeKk,
    hourLoc: hourLoc,
    audioKey: audioKey,
    PRAISE: [
      ['Керемет!', 'Великолепно!'], ['Жарайсың!', 'Молодец!'], ['Тамаша!', 'Чудесно!'],
      ['Өте жақсы!', 'Очень хорошо!'], ['Дұрыс!', 'Правильно!'], ['Бәрекелді!', 'Браво!']
    ]
  };
})();
