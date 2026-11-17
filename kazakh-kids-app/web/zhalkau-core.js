/* Жалқаубек Live-Ops — pure logic of the daily offline event (master plan, sprint 4).
 * Every day the lazybones Жалқаубек spoils words in one way (the theme rotates by date, no network needed):
 *   vowel   — ate a vowel that stays (қалмым) or kept a fleeting one (мұрыным);
 *   voice   — forgot to voice п / к / қ before a vowel (кітапым);
 *   harmony — put a hard ending on a soft word or the other way round (үйлар, балалер);
 *   ending  — hid the «where to» ending (Мен мектеп барамын.).
 * The blitz «Қатені тап» shows 12 items, half of them spoiled: «Дұрыс» or «Қате» in 60 s.
 * Right forms always come from grammar-core (UMD: window.QZHAL in the game, require() in tests). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./grammar-core.js'));
  else root.QZHAL = factory(root.QGRAM);
})(typeof self !== 'undefined' ? self : this, function (G) {
  'use strict';
  var ITEMS = 12, SECONDS = 60, PERSONS = ['men', 'sen', 'ol', 'biz'];
  var VOWELS = 'аәеиоөұүыіэюя';
  var THEMES = [
    { id: 'vowel', icon: '😋', kk: 'Жалқаубек дауысты дыбысты жеп қойды!', ru: 'Жалқаубек съел гласную!', en: 'Жалқаубек ate a vowel!',
      rule: { ru: 'Беглая гласная выпадает только в словах вроде ауыз → аузым, мұрын → мұрным; в остальных остаётся: қаламым.', en: 'A fleeting vowel drops only in words like ауыз → аузым, мұрын → мұрным; elsewhere it stays: қаламым.' } },
    { id: 'voice', icon: '🤐', kk: 'Жалқаубек дыбысты өзгертуді ұмытып кетті!', ru: 'Жалқаубек забыл поменять звук!', en: 'Жалқаубек forgot to change a sound!',
      rule: { ru: 'Перед гласной окончания п → б, к → г, қ → ғ: кітабым, жүрегім, құлағым.', en: 'Before a vowel ending п → б, к → г, қ → ғ: кітабым, жүрегім, құлағым.' } },
    { id: 'harmony', icon: '🔀', kk: 'Жалқаубек жалғауларды шатастырды!', ru: 'Жалқаубек перепутал окончания!', en: 'Жалқаубек mixed up the endings!',
      rule: { ru: 'Твёрдое слово — твёрдое окончание (балалар), мягкое — мягкое (үйлер).', en: 'A hard word takes a hard ending (балалар), a soft word a soft one (үйлер).' } },
    { id: 'ending', icon: '🙈', kk: 'Жалқаубек жалғауды жасырып қойды!', ru: 'Жалқаубек спрятал окончание!', en: 'Жалқаубек hid an ending!',
      rule: { ru: 'Куда? — барыс септік: мектепке, үйге, саябаққа барамын.', en: 'Where to? — the dative: мектепке, үйге, саябаққа барамын.' } }
  ];
  var VOICING = ['кітап', 'мектеп', 'құлақ', 'тарақ', 'етік', 'жүрек', 'ойыншық', 'тамақ', 'қасық', 'аяқ', 'табақ'];
  var FLEET = ['ауыз', 'мұрын', 'орын', 'ерін', 'мойын', 'қарын'];
  var PLACES = ['мектеп', 'үй', 'дүкен', 'саябақ', 'кітапхана', 'аурухана', 'базар', 'бақша', 'өзен', 'қала', 'ауыл', 'стадион', 'мұражай', 'асхана'];
  var SWAP = { 'а': 'е', 'е': 'а', 'ы': 'і', 'і': 'ы' };
  function label(p) { return G.POSS_LABEL[p]; }
  function lastVowel(w) { for (var i = w.length - 1; i >= 0; i--) if (VOWELS.indexOf(w[i]) >= 0) return i; return -1; }

  var right = {
    voice: function (w, p) { return G.possessive(w, p); },
    vowel: function (w, p) { return G.possessive(w, p); },
    harmony: function (w) { return G.plural(w); },
    ending: function (place) { return 'Мен ' + G.caseForm(place, 'barys') + ' барамын.'; }
  };
  var spoil = {
    /** кітабым → кітапым: the root is glued on unchanged */
    voice: function (w, p) { return w + G.possessive(w, p).slice(w.length); },
    /** мұрным → мұрыным (kept the fleeting vowel); қаламым → қалмым (ate the vowel) */
    vowel: function (w, p) {
      var r = G.possessive(w, p);
      if (G.FLEETING[w]) return w + r.slice(G.FLEETING[w].length);
      var i = lastVowel(w); return w.slice(0, i) + w.slice(i + 1) + r.slice(w.length);
    },
    /** үйлер → үйлар: the ending's vowels flip hard ↔ soft */
    harmony: function (w) { var r = G.plural(w); return w + r.slice(w.length).replace(/[аеыі]/g, function (c) { return SWAP[c]; }); },
    /** Мен мектепке барамын. → Мен мектеп барамын. */
    ending: function (place) { return 'Мен ' + place + ' барамын.'; }
  };

  /** Every candidate of a theme: { right, wrong } as shown on screen (possessives with менің / сенің …). */
  function all(theme) {
    var out = [];
    var nouns = G.NOUNS.map(function (n) { return n.kk; });
    if (theme === 'voice') VOICING.concat(nouns.filter(function (w) { return /[пкқ]$/.test(w) && VOICING.indexOf(w) < 0; })).forEach(function (w) {
      PERSONS.forEach(function (p) { var r = right.voice(w, p); if (r.indexOf(w) !== 0) out.push({ right: label(p) + ' ' + r, wrong: label(p) + ' ' + spoil.voice(w, p) }); });
    });
    if (theme === 'vowel') FLEET.concat(nouns.filter(function (w) {
      var i = lastVowel(w); return w.length >= 4 && i > 0 && i < w.length - 1 && !G.FLEETING[w] && right.vowel(w, 'men').indexOf(w) === 0;
    })).forEach(function (w) { PERSONS.forEach(function (p) { out.push({ right: label(p) + ' ' + right.vowel(w, p), wrong: label(p) + ' ' + spoil.vowel(w, p) }); }); });
    if (theme === 'harmony') nouns.concat(VOICING, FLEET).forEach(function (w) {
      var r = right.harmony(w), s = spoil.harmony(w); if (r !== s && !out.some(function (x) { return x.right === r; })) out.push({ right: r, wrong: s });
    });
    if (theme === 'ending') PLACES.forEach(function (w) { out.push({ right: right.ending(w), wrong: spoil.ending(w) }); });
    return out;
  }

  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function dayNumber(date) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date); return Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000); }
  function today(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  /** The event of a day (local date «YYYY-MM-DD»): its trick and 12 items, 5–7 of them spoiled. Same day — same event. */
  function daily(date) {
    var day = dayNumber(date), r = rng(day * 2654435761), theme = THEMES[day % THEMES.length];
    var pool = all(theme.id).map(function (x) { return { x: x, k: r() }; }).sort(function (a, b) { return a.k - b.k; }).slice(0, ITEMS).map(function (o) { return o.x; });
    var bad = 5 + Math.floor(r() * 3), order = pool.map(function (_, i) { return { i: i, k: r() }; }).sort(function (a, b) { return a.k - b.k; });
    var spoiledIdx = {}; order.slice(0, bad).forEach(function (o) { spoiledIdx[o.i] = true; });
    return { date: date, theme: theme, items: pool.map(function (x, i) { var ok = !spoiledIdx[i]; return { theme: theme.id, ok: ok, right: x.right, shown: ok ? x.right : x.wrong }; }) };
  }
  return { THEMES: THEMES, ITEMS: ITEMS, SECONDS: SECONDS, PLACES: PLACES, right: right, spoil: spoil, all: all, daily: daily, today: today };
});
