/* Kazakh morphology for the «Грамматика» section (plain JS, no build step; the same school tables as
 * suite/src/lib/morphology.ts, plus plural, possessive, question particle, negation and verb tenses).
 *
 * Two rules drive almost every ending:
 *   1. Сингармонизм — the LAST vowel decides back (жуан: а о ұ ы) or front (жіңішке: ә е ө ү і) endings.
 *   2. Assimilation — the LAST sound decides the first consonant of the ending.
 * The trainers only use the curated words below; tests/grammar.test.js checks every generated form
 * against a hand-written answer, so a rule gap (vowel drop in ауыз → аузы etc.) cannot reach a child.
 */
(function (root) {
  'use strict';
  var BACK = 'аоұыяюё', FRONT = 'әеөүіэ', AMB = 'уи', VOWELS = BACK + FRONT + AMB;
  var SONORANT = 'лрйуи', NASAL = 'мнң', ZH_Z = 'жз';

  function head(w) { var p = String(w).trim().toLowerCase().split(/[\s-]+/); return p[p.length - 1]; }
  function harmony(w) {
    w = head(w); var amb = null;
    for (var i = w.length - 1; i >= 0; i--) {
      var c = w[i];
      if (BACK.indexOf(c) >= 0) return 'back';
      if (FRONT.indexOf(c) >= 0) return 'front';
      if (AMB.indexOf(c) >= 0 && amb === null) amb = c === 'у' ? 'back' : 'front';
    }
    return amb || 'back';
  }
  function lastVowel(w) { w = head(w); for (var i = w.length - 1; i >= 0; i--) if ((BACK + FRONT).indexOf(w[i]) >= 0) return w[i]; return null; }
  function last(w) { w = head(w); return w[w.length - 1]; }
  /** vowel | sonorant (л р й у и) | nasal (м н ң) | zhz (ж з) | voiceless */
  function finalClass(w) {
    var f = last(w);
    if (SONORANT.indexOf(f) >= 0) return 'sonorant';
    if (VOWELS.indexOf(f) >= 0) return 'vowel';
    if (NASAL.indexOf(f) >= 0) return 'nasal';
    if (ZH_Z.indexOf(f) >= 0) return 'zhz';
    return 'voiceless';
  }
  function pick(w, back, front) { return harmony(w) === 'back' ? back : front; }

  /* ---------------- cases (септіктер) ---------------- */
  var CASES = ['atau', 'ilik', 'barys', 'tabys', 'zhatys', 'shygys', 'komektes'];
  var CASE_INFO = {
    atau: { kk: 'Атау', q: 'кім? не?', ru: 'именительный', en: 'nominative' },
    ilik: { kk: 'Ілік', q: 'кімнің? ненің?', ru: 'родительный (чей?)', en: 'genitive (whose?)' },
    barys: { kk: 'Барыс', q: 'кімге? неге? қайда?', ru: 'дательно-направительный (кому? куда?)', en: 'dative (to whom? where to?)' },
    tabys: { kk: 'Табыс', q: 'кімді? нені?', ru: 'винительный (кого? что?)', en: 'accusative (whom? what?)' },
    zhatys: { kk: 'Жатыс', q: 'кімде? неде? қайда?', ru: 'местный (где? у кого?)', en: 'locative (where? at whom?)' },
    shygys: { kk: 'Шығыс', q: 'кімнен? неден? қайдан?', ru: 'исходный (откуда? от кого?)', en: 'ablative (from where? from whom?)' },
    komektes: { kk: 'Көмектес', q: 'кіммен? немен?', ru: 'творительный (с кем? чем?)', en: 'instrumental (with whom? with what?)' }
  };
  //            vowel           sonorant        nasal           ж з             voiceless
  var CASE_TABLE = {
    ilik:     [['ның', 'нің'], ['дың', 'дің'], ['ның', 'нің'], ['дың', 'дің'], ['тың', 'тің']],
    barys:    [['ға', 'ге'], ['ға', 'ге'], ['ға', 'ге'], ['ға', 'ге'], ['қа', 'ке']],
    tabys:    [['ны', 'ні'], ['ды', 'ді'], ['ды', 'ді'], ['ды', 'ді'], ['ты', 'ті']],
    zhatys:   [['да', 'де'], ['да', 'де'], ['да', 'де'], ['да', 'де'], ['та', 'те']],
    shygys:   [['дан', 'ден'], ['дан', 'ден'], ['нан', 'нен'], ['дан', 'ден'], ['тан', 'тен']],
    komektes: [['мен', 'мен'], ['мен', 'мен'], ['мен', 'мен'], ['бен', 'бен'], ['пен', 'пен']]
  };
  var CLS = ['vowel', 'sonorant', 'nasal', 'zhz', 'voiceless'];
  // personal pronouns decline irregularly
  var PRONOUNS = {
    'мен': ['мен', 'менің', 'маған', 'мені', 'менде', 'менен', 'менімен'],
    'сен': ['сен', 'сенің', 'саған', 'сені', 'сенде', 'сенен', 'сенімен'],
    'ол': ['ол', 'оның', 'оған', 'оны', 'онда', 'одан', 'онымен']
  };
  function caseSuffix(w, c) {
    if (c === 'atau') return '';
    var row = CASE_TABLE[c][CLS.indexOf(finalClass(w))];
    return pick(w, row[0], row[1]);
  }
  function caseForm(w, c) {
    var p = PRONOUNS[String(w).toLowerCase()];
    if (p) return p[CASES.indexOf(c)];
    return w + caseSuffix(w, c);
  }

  /* ---------------- plural (көптік жалғау) ---------------- */
  // after a vowel or р й у и → лар/лер; after л м н ң ж з → дар/дер; after voiceless → тар/тер
  function pluralSuffix(w) {
    var f = last(w);
    var k = (VOWELS.indexOf(f) >= 0 || 'рйуи'.indexOf(f) >= 0) ? 'л' : ('лмнңжз'.indexOf(f) >= 0 ? 'д' : 'т');
    return k + pick(w, 'ар', 'ер');
  }
  function plural(w) { return w + pluralSuffix(w); }

  /* ---------------- possessive (тәуелдік жалғау) ---------------- */
  var VOICE = { 'п': 'б', 'к': 'г', 'қ': 'ғ' };
  var POSS_PERSONS = ['men', 'sen', 'siz', 'ol', 'biz'];
  var POSS_LABEL = { men: 'менің', sen: 'сенің', siz: 'сіздің', ol: 'оның', biz: 'біздің' };
  // Беглые гласные: the last narrow vowel drops before a vowel-initial ending — ауыз → аузым, мұрын → мұрны.
  var FLEETING = { 'ауыз': 'ауз', 'мұрын': 'мұрн', 'орын': 'орн', 'ерін': 'ерн', 'қарын': 'қарн', 'мойын': 'мойн',
    'халық': 'халқ', 'қойын': 'қойн', 'ұлық': 'ұлқ', 'бөрік': 'бөрк' };
  function possessive(w, p) {
    var v = finalClass(w) === 'vowel', b = harmony(w) === 'back';
    if (FLEETING[w]) { var y0 = b ? 'ы' : 'і', st = FLEETING[w]; return st + { men: y0 + 'м', sen: y0 + 'ң', siz: y0 + 'ң' + y0 + 'з', ol: y0, biz: y0 + 'м' + y0 + 'з' }[p]; }
    var y = b ? 'ы' : 'і';
    if (v) return w + { men: 'м', sen: 'ң', siz: 'ң' + y + 'з', ol: 'с' + y, biz: 'м' + y + 'з' }[p];
    // a voiceless п к қ at the end becomes voiced before a vowel: кітап → кітабым, мектеп → мектебім
    var f = last(w), stem = VOICE[f] ? w.slice(0, -1) + VOICE[f] : w;
    return stem + { men: y + 'м', sen: y + 'ң', siz: y + 'ң' + y + 'з', ol: y, biz: y + 'м' + y + 'з' }[p];
  }

  /* ---------------- personal endings after nouns (жіктік жалғау): Мен оқушымын ---------------- */
  var PERSONS = ['men', 'sen', 'siz', 'ol', 'biz', 'sender', 'sizder', 'olar'];
  var PERSON_KK = { men: 'Мен', sen: 'Сен', siz: 'Сіз', ol: 'Ол', biz: 'Біз', sender: 'Сендер', sizder: 'Сіздер', olar: 'Олар' };
  function personSuffix(w, p) {
    var c = finalClass(w), b = harmony(w) === 'back', y = b ? 'ы' : 'і';
    var hard = c === 'voiceless' ? 'п' : c === 'zhz' ? 'б' : 'м';
    switch (p) {
      case 'men': return hard + y + 'н';
      case 'sen': return 'с' + y + 'ң';
      case 'siz': return 'с' + y + 'з';
      case 'biz': return mbp(w) + y + 'з';                 // nasal → б: дайынбыз, мұғалімбіз (but мен дайынМЫН)
      case 'sender': return b ? 'сыңдар' : 'сіңдер';
      case 'sizder': return b ? 'сыздар' : 'сіздер';
      default: return '';
    }
  }

  /* ---------------- question particle ма/ме · ба/бе · па/пе (written separately) ---------------- */
  // the same consonant choice as negation: vowel/л р й у → м, м н ң ж з → б, voiceless → п
  function mbp(w) { var c = finalClass(w); return c === 'voiceless' ? 'п' : (c === 'nasal' || c === 'zhz') ? 'б' : 'м'; }
  function question(w) { return mbp(w) + pick(w, 'а', 'е'); }

  /* ---------------- verbs ---------------- */
  // stem → present (-а/-е/-й), past (-ды/-ты), continuous (-ып жатыр), negation (-ма/-ба/-па), wish (-ғым келеді)
  function presentBase(stem) {
    if (finalClass(stem) === 'vowel') {
      var f = last(stem);
      if (f === 'ы' || f === 'і') return stem.slice(0, -1) + 'и';     // оқы + й → оқи-
      return stem + 'й';                                                // ойна + й → ойнай-
    }
    return stem + pick(stem, 'а', 'е');                                 // бар → бара-
  }
  var PRESENT_END = { men: ['мын', 'мін'], sen: ['сың', 'сің'], siz: ['сыз', 'сіз'], ol: ['ды', 'ді'], biz: ['мыз', 'міз'] };
  function present(stem, p) { var e = PRESENT_END[p]; return presentBase(stem) + pick(stem, e[0], e[1]); }
  function negStem(stem) { return stem + mbp(stem) + pick(stem, 'а', 'е'); }
  function presentNeg(stem, p) { var e = PRESENT_END[p]; return negStem(stem) + 'й' + pick(stem, e[0], e[1]); }
  function pastBase(stem) { return stem + (finalClass(stem) === 'voiceless' ? 'т' : 'д') + pick(stem, 'ы', 'і'); }
  function pastEnd(stem, p) { return { men: 'м', sen: 'ң', siz: 'ң' + pick(stem, 'ыз', 'із'), ol: '', biz: pick(stem, 'қ', 'к') }[p]; }
  function past(stem, p) { return pastBase(stem) + pastEnd(stem, p); }
  function pastNeg(stem, p) { var n = negStem(stem); return n + 'д' + pick(stem, 'ы', 'і') + pastEnd(stem, p); }
  // motion verbs use the -а/-е converb: бара жатырмын, келе жатырмын
  var MOTION = { 'бар': 'бара', 'кел': 'келе' };
  function converb(stem) { return MOTION[stem] || (finalClass(stem) === 'vowel' ? stem + 'п' : stem + pick(stem, 'ып', 'іп')); }
  var ZHATYR = { men: 'жатырмын', sen: 'жатырсың', siz: 'жатырсыз', ol: 'жатыр', biz: 'жатырмыз' };
  function continuous(stem, p) { return converb(stem) + ' ' + ZHATYR[p]; }
  function wish(stem) { return stem + (finalClass(stem) === 'voiceless' ? pick(stem, 'қы', 'кі') : pick(stem, 'ғы', 'гі')) + 'м келеді'; }
  var TENSES = ['present', 'presentNeg', 'past', 'pastNeg', 'continuous'];
  function conj(stem, tense, p) { return { present: present, presentNeg: presentNeg, past: past, pastNeg: pastNeg, continuous: continuous }[tense](stem, p); }

  /* ---------------- numerals ---------------- */
  function ordinal(n) { return n + (finalClass(n) === 'vowel' ? pick(n, 'ншы', 'нші') : pick(n, 'ыншы', 'інші')); }

  /* ---------------- explanations ---------------- */
  var CLASS_RU = { vowel: 'гласная', sonorant: 'сонорный (л, р, й, у)', nasal: 'носовой (м, н, ң)', zhz: 'звонкий ж/з', voiceless: 'глухой' };
  var CLASS_EN = { vowel: 'a vowel', sonorant: 'a sonorant (л, р, й, у)', nasal: 'a nasal (м, н, ң)', zhz: 'a voiced ж/з', voiceless: 'voiceless' };
  function why(w, suffix, lang) {
    if (!suffix) return lang === 'en' ? 'No ending.' : 'Без окончания.';
    var h = harmony(w), v = lastVowel(w), c = finalClass(w);
    if (lang === 'en') return w + ' + ' + suffix + ': last sound «' + last(w) + '» is ' + CLASS_EN[c] + '; last vowel «' + (v || '—') + '» is ' + (h === 'back' ? 'back (hard)' : 'front (soft)') + '.';
    return w + ' + ' + suffix + ': последний звук «' + last(w) + '» — ' + CLASS_RU[c] + '; последняя гласная «' + (v || '—') + '» — ' + (h === 'back' ? 'твёрдая' : 'мягкая') + '.';
  }

  /* ---------------- curated words for tables and trainers ---------------- */
  var NOUNS = [
    { kk: 'кітап', ru: 'книга', en: 'book', e: '📕' }, { kk: 'мектеп', ru: 'школа', en: 'school', e: '🏫' },
    { kk: 'бала', ru: 'ребёнок', en: 'child', e: '🧒' }, { kk: 'қалам', ru: 'ручка', en: 'pen', e: '🖊️' },
    { kk: 'үй', ru: 'дом', en: 'house', e: '🏠' }, { kk: 'гүл', ru: 'цветок', en: 'flower', e: '🌷' },
    { kk: 'қыз', ru: 'девочка', en: 'girl', e: '👧' }, { kk: 'мысық', ru: 'кошка', en: 'cat', e: '🐱' },
    { kk: 'дәптер', ru: 'тетрадь', en: 'notebook', e: '📓' }, { kk: 'дос', ru: 'друг', en: 'friend', e: '🤝' },
    { kk: 'қала', ru: 'город', en: 'city', e: '🏙️' }, { kk: 'сөмке', ru: 'сумка', en: 'bag', e: '👜' },
    { kk: 'ағаш', ru: 'дерево', en: 'tree', e: '🌳' }, { kk: 'көз', ru: 'глаз', en: 'eye', e: '👁️' },
    { kk: 'ата', ru: 'дедушка', en: 'grandpa', e: '👴' }, { kk: 'әже', ru: 'бабушка', en: 'grandma', e: '👵' },
    { kk: 'көйлек', ru: 'платье, рубашка', en: 'dress, shirt', e: '👗' }, { kk: 'ойыншық', ru: 'игрушка', en: 'toy', e: '🧸' },
    { kk: 'ит', ru: 'собака', en: 'dog', e: '🐶' }, { kk: 'сағат', ru: 'часы', en: 'clock', e: '⏰' },
    { kk: 'бөлме', ru: 'комната', en: 'room', e: '🚪' }, { kk: 'жер', ru: 'земля', en: 'land', e: '🌍' }
  ];
  var VERBS = [
    { kk: 'бар', ru: 'идти', en: 'to go' }, { kk: 'кел', ru: 'приходить', en: 'to come' },
    { kk: 'жаз', ru: 'писать', en: 'to write' }, { kk: 'оқы', ru: 'читать, учиться', en: 'to read, to study' },
    { kk: 'ойна', ru: 'играть', en: 'to play' }, { kk: 'сөйле', ru: 'говорить', en: 'to speak' },
    { kk: 'айт', ru: 'сказать', en: 'to say' }, { kk: 'іш', ru: 'пить', en: 'to drink' },
    { kk: 'же', ru: 'есть (кушать)', en: 'to eat' }, { kk: 'біл', ru: 'знать', en: 'to know' },
    { kk: 'көр', ru: 'видеть', en: 'to see' }, { kk: 'тыңда', ru: 'слушать', en: 'to listen' },
    { kk: 'жүгір', ru: 'бегать', en: 'to run' }, { kk: 'ұйықта', ru: 'спать', en: 'to sleep' },
    { kk: 'күл', ru: 'смеяться', en: 'to laugh' }, { kk: 'жүз', ru: 'плавать', en: 'to swim' }
  ];
  var NUMBERS = ['бір', 'екі', 'үш', 'төрт', 'бес', 'алты', 'жеті', 'сегіз', 'тоғыз', 'он'];

  var G = {
    harmony: harmony, lastVowel: lastVowel, finalClass: finalClass, last: last,
    CASES: CASES, CASE_INFO: CASE_INFO, CASE_TABLE: CASE_TABLE, caseSuffix: caseSuffix, caseForm: caseForm,
    pluralSuffix: pluralSuffix, plural: plural, POSS_PERSONS: POSS_PERSONS, POSS_LABEL: POSS_LABEL, possessive: possessive,
    PERSONS: PERSONS, PERSON_KK: PERSON_KK, personSuffix: personSuffix, question: question,
    presentBase: presentBase, present: present, presentNeg: presentNeg, past: past, pastNeg: pastNeg, continuous: continuous, wish: wish,
    negStem: negStem, converb: converb, TENSES: TENSES, conj: conj, ordinal: ordinal, why: why,
    NOUNS: NOUNS, VERBS: VERBS, NUMBERS: NUMBERS, FLEETING: FLEETING
  };
  root.QGRAM = G;
  if (typeof module !== 'undefined' && module.exports) module.exports = G;
})(typeof window !== 'undefined' ? window : globalThis);
