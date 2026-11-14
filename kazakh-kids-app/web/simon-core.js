/* «Мұғалім айтады» — pure logic of the Simon-says rhythm arcade (UMD: window.QSIMON in the game, require() in tests).
 * Баян апай gives real commands that start with «Мұғалім айтады:» — do them; Әже-Bot 3000 slips in the same command
 * without the prefix — a trap: don't move. Class commands are the сендер imperative built by grammar-core.
 * 20 commands, 3 lives; the reaction window shrinks from 3 s to 1.8 s. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./grammar-core.js'));
  else root.QSIMON = factory(root.QGRAM);
})(typeof self !== 'undefined' ? self : this, function (G) {
  'use strict';
  var ACTIONS = [
    { id: 'sit', stem: 'отыр', e: '🪑', ru: 'Садитесь', en: 'Sit down' },
    { id: 'stand', stem: 'тұр', e: '🧍', ru: 'Встаньте', en: 'Stand up' },
    { id: 'jump', stem: 'секір', e: '🦘', ru: 'Прыгайте', en: 'Jump' },
    { id: 'clap', stem: 'шапалақта', e: '👏', ru: 'Хлопайте', en: 'Clap' },
    { id: 'turn', stem: 'айнал', e: '🔄', ru: 'Повернитесь кругом', en: 'Turn around' },
    { id: 'hands', phrase: 'Қолдарыңды көтеріңдер', e: '🙌', ru: 'Поднимите руки', en: 'Raise your hands' }
  ];
  /** The class command («сендер» imperative from the engine), capitalised: «Отырыңдар!» */
  function command(a) { var w = a.phrase || G.imperative(a.stem, 'sender'); return w.charAt(0).toUpperCase() + w.slice(1) + '!'; }
  var PREFIX = 'Мұғалім айтады: ';
  /** What is heard: a real command (Баян апай) or a trap (Әже-Bot, no prefix). */
  function line(c) { var t = command(c.action); return c.real ? PREFIX + t.charAt(0).toLowerCase() + t.slice(1) : t; }
  var LINES = {
    intro: { who: 'E4', kk: 'Сәлем! Мен Әже-Бот. Апай айтса — істе, мен айтсам — қозғалма!', ru: 'Привет! Я Әже-Bot. Скажет апай — делай, скажу я — не двигайся!', en: 'Hi! I am Әже-Bot. If Apai says it — do it; if I say it — don’t move!' },
    win: { who: 'APAI', kk: 'Жарайсыңдар! Бүгін бәрің мұқият болдыңдар.', ru: 'Молодцы! Сегодня вы все были внимательны.', en: 'Well done! You were all very attentive today.' },
    lose: { who: 'E4', kk: 'Хи-хи, алдап кеттім! Тағы ойнайық!', ru: 'Хи-хи, обманул! Сыграем ещё!', en: 'Hee-hee, I fooled you! Let’s play again!' }
  };
  var ROUND = 20, LIVES = 3;
  var windowFor = function (i) { return Math.max(1.8, 3 - i * 0.06); };   // seconds to react

  /** 20 commands, ~30 % traps, the first two real, never three traps in a row, never the same action twice running. */
  function buildRound(rng) {
    rng = rng || Math.random;
    var out = [], prev = null, traps = 0;
    for (var i = 0; i < ROUND; i++) {
      var real = i < 2 || traps >= 2 ? true : rng() >= 0.3;
      traps = real ? 0 : traps + 1;
      var pool = ACTIONS.filter(function (a) { return a !== prev; }), a = pool[Math.floor(rng() * pool.length)];
      out.push({ action: a, real: real }); prev = a;
    }
    return out;
  }
  /** tapped: an action id or null (did nothing before the window closed). */
  function resolve(c, tapped) {
    if (c.real) return tapped === c.action.id ? 'hit' : tapped === null ? 'late' : 'wrong';
    return tapped === null ? 'held' : 'fooled';
  }
  function initial() { return { i: 0, lives: LIVES, score: 0, combo: 0, best: 0, hits: 0, held: 0, over: false, won: false }; }
  function step(s, outcome) {
    var good = outcome === 'hit' || outcome === 'held', combo = good ? s.combo + 1 : 0, lives = good ? s.lives : s.lives - 1;
    var gain = outcome === 'hit' ? 10 * (1 + Math.floor(s.combo / 5)) : outcome === 'held' ? 8 : 0, i = s.i + 1;
    var over = lives <= 0 || i >= ROUND;
    return { i: i, lives: lives, score: s.score + gain, combo: combo, best: Math.max(s.best, combo), hits: s.hits + (outcome === 'hit' ? 1 : 0),
      held: s.held + (outcome === 'held' ? 1 : 0), over: over, won: over && lives > 0 };
  }
  return { ACTIONS: ACTIONS, PREFIX: PREFIX, LINES: LINES, ROUND: ROUND, LIVES: LIVES, command: command, line: line, windowFor: windowFor, buildRound: buildRound, resolve: resolve, initial: initial, step: step };
});
