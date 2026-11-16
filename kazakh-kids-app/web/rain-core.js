/* «Жалғау жаңбыры» — plural endings rain (UMD: window.QRAIN; require() in tests).
 * A noun falls; the child drops it into the basket with its plural ending (-лар/-лер/-дар/-дер/-тар/-тер).
 * The three baskets are the right ending, its vowel-harmony twin (лар ↔ лер) and its consonant twin
 * (лар ↔ дар / тар), so every mistake is a real rule confusion, not a random guess. Three hearts; each right
 * answer makes the next word fall a little faster; a streak multiplies the points. Forms come from grammar-core. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./grammar-core.js'));
  else root.QRAIN = factory(root.QGRAM);
})(typeof self !== 'undefined' ? self : this, function (G) {
  'use strict';
  // Concrete nouns a 1–4 grader knows (own list; the plural forms are built by the engine and checked in the tests)
  var NOUNS = [
    ['кітап', 'книга', 'book', '📕'], ['дәптер', 'тетрадь', 'notebook', '📓'], ['қалам', 'ручка', 'pen', '🖊️'], ['үстел', 'стол', 'table', '🪑'],
    ['мысық', 'кошка', 'cat', '🐱'], ['ит', 'собака', 'dog', '🐶'], ['жылқы', 'лошадь', 'horse', '🐴'], ['сиыр', 'корова', 'cow', '🐮'],
    ['қой', 'овца', 'sheep', '🐑'], ['түйе', 'верблюд', 'camel', '🐫'], ['балық', 'рыба', 'fish', '🐟'], ['құс', 'птица', 'bird', '🐦'],
    ['алма', 'яблоко', 'apple', '🍎'], ['нан', 'хлеб', 'bread', '🍞'], ['сүт', 'молоко', 'milk', '🥛'], ['ет', 'мясо', 'meat', '🥩'],
    ['үй', 'дом', 'house', '🏠'], ['есік', 'дверь', 'door', '🚪'], ['терезе', 'окно', 'window', '🪟'], ['көше', 'улица', 'street', '🛣️'],
    ['қала', 'город', 'city', '🏙️'], ['ауыл', 'аул', 'village', '🏡'], ['мектеп', 'школа', 'school', '🏫'], ['дүкен', 'магазин', 'shop', '🏪'],
    ['бала', 'ребёнок', 'child', '🧒'], ['қыз', 'девочка', 'girl', '👧'], ['ұл', 'мальчик', 'boy', '👦'], ['дос', 'друг', 'friend', '🤝'],
    ['көз', 'глаз', 'eye', '👁️'], ['қол', 'рука', 'hand', '✋'], ['аяқ', 'нога', 'leg', '🦵'], ['тіс', 'зуб', 'tooth', '🦷'],
    ['гүл', 'цветок', 'flower', '🌷'], ['ағаш', 'дерево', 'tree', '🌳'], ['тау', 'гора', 'mountain', '⛰️'], ['өзен', 'река', 'river', '🏞️'],
    ['жұлдыз', 'звезда', 'star', '⭐'], ['бұлт', 'облако', 'cloud', '☁️'], ['күн', 'день', 'day', '📅'], ['ай', 'месяц', 'month', '🌙'],
    ['доп', 'мяч', 'ball', '⚽'], ['ойыншық', 'игрушка', 'toy', '🧸'], ['көлік', 'машина', 'car', '🚗'], ['кеме', 'корабль', 'ship', '🚢'],
    ['әже', 'бабушка', 'grandmother', '👵'], ['ата', 'дедушка', 'grandfather', '👴'], ['мұғалім', 'учитель', 'teacher', '🧑‍🏫'], ['дәрігер', 'врач', 'doctor', '🧑‍⚕️'],
    ['сөз', 'слово', 'word', '💬'], ['сабақ', 'урок', 'lesson', '📚'], ['сурет', 'картинка', 'picture', '🖼️'], ['өлең', 'стихотворение', 'poem', '📜'],
    ['жұмыртқа', 'яйцо', 'egg', '🥚'], ['қасық', 'ложка', 'spoon', '🥄'], ['кесе', 'пиала', 'cup', '🍵'], ['шай', 'чай', 'tea', '🫖'],
    ['бөрі', 'волк', 'wolf', '🐺'], ['түлкі', 'лиса', 'fox', '🦊'], ['аю', 'медведь', 'bear', '🐻'], ['қоян', 'заяц', 'hare', '🐰']
  ].map(function (a) { return { kk: a[0], ru: a[1], en: a[2], e: a[3] }; });
  var SUFFIXES = ['лар', 'лер', 'дар', 'дер', 'тар', 'тер'];
  var HEARTS = 3, START_MS = 5200, MIN_MS = 1700, STEP_MS = 140;
  function shuffle(a, r) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  /** лар → лер (vowel harmony twin) */
  function harmonyTwin(s) { return s[0] + (s[1] === 'а' ? 'ер' : 'ар'); }
  /** лар → дар or тар (same harmony, another first consonant) */
  function consonantTwin(s, r) { var other = ['л', 'д', 'т'].filter(function (c) { return c !== s[0]; }); return other[Math.floor(r() * 2)] + s.slice(1); }
  /** One falling word: { word, answer, options (3 baskets), plural } */
  function task(w, r) {
    var a = G.pluralSuffix(w.kk);
    return { word: w, answer: a, options: shuffle([a, harmonyTwin(a), consonantTwin(a, r)], r), plural: w.kk + a };
  }
  /** Falling time for the next word: faster with each right answer, never below MIN_MS. */
  function fallMs(right) { return Math.max(MIN_MS, START_MS - right * STEP_MS); }
  /** State after an answer (ok=false also for a word that reached the ground). */
  function answer(s, ok) {
    if (ok) { var streak = s.streak + 1, mult = streak >= 10 ? 3 : streak >= 5 ? 2 : 1; return { score: s.score + 10 * mult, streak: streak, best: Math.max(s.best, streak), right: s.right + 1, wrong: s.wrong, hearts: s.hearts, mult: mult }; }
    return { score: s.score, streak: 0, best: s.best, right: s.right, wrong: s.wrong + 1, hearts: s.hearts - 1, mult: 1 };
  }
  var START = { score: 0, streak: 0, best: 0, right: 0, wrong: 0, hearts: HEARTS, mult: 1 };
  /** A queue that does not repeat a word until all have fallen. */
  function deck(r) { return shuffle(NOUNS.slice(), r); }
  return { NOUNS: NOUNS, SUFFIXES: SUFFIXES, HEARTS: HEARTS, START_MS: START_MS, MIN_MS: MIN_MS, task: task, fallMs: fallMs, answer: answer, START: START, deck: deck,
    harmonyTwin: harmonyTwin, consonantTwin: consonantTwin, shuffle: shuffle };
});
