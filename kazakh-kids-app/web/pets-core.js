/* Питомцы (master plan, sprint 6) — pure logic (UMD: window.QPET in the game, require() in tests).
 * Three Kazakh companions grow with finished lessons, get hungry every day and are fed by winning «Дастархан Master»;
 * neon accessories are bought for Алтын асық (🪙). State lives in S.pet = { id, fedDay, acc: [] }. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.QPET = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var PETS = [
    { id: 'tazy', e: '🐕', kk: 'Құмай-тазы', ru: 'Тазы Кумай — быстрая охотничья собака', en: 'Kumai, the swift tazy hound', price: 0 },
    { id: 'tulpar', e: '🐎', kk: 'Тұлпар', ru: 'Тулпар — крылатый конь', en: 'Tulpar, the winged horse', price: 300 },
    { id: 'barys', e: '🐆', kk: 'Қар барысы', ru: 'Снежный барс', en: 'The snow leopard', price: 500 }
  ];
  // grows with finished lessons: 0, 5, 15, 30, 60
  var STAGES = [
    { min: 0, kk: 'Кішкентай', ru: 'малыш', en: 'baby', size: 0.6 },
    { min: 5, kk: 'Жас', ru: 'подросток', en: 'young', size: 0.75 },
    { min: 15, kk: 'Ширақ', ru: 'шустрый', en: 'nimble', size: 0.9 },
    { min: 30, kk: 'Ересек', ru: 'взрослый', en: 'grown-up', size: 1.05 },
    { min: 60, kk: 'Батыр', ru: 'богатырь', en: 'hero', size: 1.2 }
  ];
  var ACC = [
    { id: 'collar', e: '💠', kk: 'Неон қарғыбау', ru: 'Неоновый ошейник', en: 'Neon collar', price: 80 },
    { id: 'scarf', e: '🧣', kk: 'Неон орамал', ru: 'Неоновый шарф', en: 'Neon scarf', price: 120 },
    { id: 'cape', e: '🦸', kk: 'Неон шапан', ru: 'Неоновый чапан', en: 'Neon chapan', price: 200 },
    { id: 'crown', e: '👑', kk: 'Алтын тәж', ru: 'Золотая корона', en: 'Golden crown', price: 300 },
    { id: 'wings', e: '🪽', kk: 'Неон қанаттар', ru: 'Неоновые крылья', en: 'Neon wings', price: 450 }
  ];
  var LINES = {
    hungry: { kk: 'Қарным ашты! Дастарханға барайық!', ru: 'Я проголодался! Пойдём к дастархану!', en: 'I\'m hungry! Let\'s go to the dastarkhan!' },
    fed: { kk: 'Рақмет, тойдым! Енді ойнайық!', ru: 'Спасибо, я сыт! Теперь поиграем!', en: 'Thanks, I\'m full! Let\'s play now!' },
    grew: { kk: 'Қара, мен өстім!', ru: 'Смотри, я подрос!', en: 'Look, I\'ve grown!' }
  };
  function pet(id) { return PETS.filter(function (p) { return p.id === id; })[0] || null; }
  function stage(lessons) { var s = STAGES[0]; STAGES.forEach(function (x) { if (lessons >= x.min) s = x; }); return s; }
  /** Progress to the next stage: { next, left, pct } (next = null at the top). */
  function progress(lessons) {
    var i = STAGES.indexOf(stage(lessons)), nx = STAGES[i + 1];
    if (!nx) return { next: null, left: 0, pct: 100 };
    return { next: nx, left: nx.min - lessons, pct: Math.round((lessons - STAGES[i].min) / (nx.min - STAGES[i].min) * 100) };
  }
  function hungry(st, today) { return !st || st.fedDay !== today; }
  /** Adopt a pet (the first one is free). Returns { ok, st, coins, why }. */
  function adopt(st, id, coins) {
    var p = pet(id); if (!p) return { ok: false, st: st, coins: coins, why: 'unknown' };
    if (st && st.id === id) return { ok: false, st: st, coins: coins, why: 'already' };
    var owned = (st && st.owned) || [], price = owned.indexOf(id) >= 0 ? 0 : p.price;
    if (coins < price) return { ok: false, st: st, coins: coins, why: 'coins' };
    return { ok: true, coins: coins - price, st: { id: id, fedDay: st ? st.fedDay : '', acc: st ? st.acc.slice() : [], owned: owned.indexOf(id) >= 0 ? owned.slice() : owned.concat([id]) } };
  }
  function buyAcc(st, id, coins) {
    var a = ACC.filter(function (x) { return x.id === id; })[0];
    if (!st || !a) return { ok: false, st: st, coins: coins, why: 'nopet' };
    if (st.acc.indexOf(id) >= 0) return { ok: false, st: st, coins: coins, why: 'already' };
    if (coins < a.price) return { ok: false, st: st, coins: coins, why: 'coins' };
    return { ok: true, coins: coins - a.price, st: { id: st.id, fedDay: st.fedDay, acc: st.acc.concat([id]), owned: (st.owned || []).slice() } };
  }
  /** Feeding after a won «Дастархан Master»: once a day it gives a bonus. */
  function feed(st, today) {
    if (!st) return { st: st, bonus: 0 };
    var first = st.fedDay !== today;
    return { st: { id: st.id, fedDay: today, acc: st.acc.slice(), owned: (st.owned || []).slice() }, bonus: first ? 10 : 0 };
  }
  return { PETS: PETS, STAGES: STAGES, ACC: ACC, LINES: LINES, pet: pet, stage: stage, progress: progress, hungry: hungry, adopt: adopt, buyAcc: buyAcc, feed: feed };
});
