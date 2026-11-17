/* Master plan, sprint 6 «Мета»: pets in the shop (web/pets-core.js), «Мектеп Бәйгесі» on the «Мен» tab
 * (web/baige-core.js + vendor/qrcode.js) and the «Көше тілі» switch on the «Тірі тіл» path.
 * Hooks into app.js extensions; the hooks set earlier (arena.js) are kept and called after ours. */
(function () {
  'use strict';
  var A = window.Q.api, E = window.Q.ext, P = window.QPET, B = window.QBAIGE, Z = window.QZHAL;
  function en() { return A.lang() === 'en'; }
  function T(o) { return en() ? o.en : o.ru; }
  function today() { return Z ? Z.today() : new Date().toISOString().slice(0, 10); }
  function lessonsDone() { return Object.keys(A.state().done || {}).length; }
  function chain(name, mine, after) { var prev = E[name]; E[name] = function (x) { var a = mine(x) || '', b = prev ? prev(x) || '' : ''; return after ? b + a : a + b; }; }
  function chainBind(name, mine) { var prev = E[name]; E[name] = function (x) { mine(x); if (prev) prev(x); }; }

  /* ---------------------------------------------------------------- pets (shop tab) */
  function petHtml() {
    var S = A.state(), st = S.pet, n = lessonsDone(), sg = P.stage(n), pr = P.progress(n), h = '<h2>' + (en() ? 'Pets · үй жануарлары' : 'Үй жануарлары · питомцы') + '</h2>';
    if (st) {
      var p = P.pet(st.id), hungry = P.hungry(st, today()), line = hungry ? P.LINES.hungry : P.LINES.fed;
      h += '<div class="pet-card' + (hungry ? ' hungry' : '') + '"><div class="pet-stage"><span class="pet-e" style="font-size:' + Math.round(64 * sg.size) + 'px">' + p.e + '</span>' +
        '<span class="pet-acc">' + st.acc.map(function (id) { return P.ACC.filter(function (a) { return a.id === id; })[0].e; }).join('') + '</span></div>' +
        '<div class="pet-info"><b>' + A.esc(p.kk) + ' · ' + A.esc(sg.kk) + '</b><span class="muted">' + A.esc(T(sg)) + ' · ' + (pr.next ? (en() ? pr.left + ' lessons to «' + pr.next.kk + '»' : 'ещё ' + pr.left + ' ур. до «' + pr.next.kk + '»') : (en() ? 'fully grown!' : 'вырос до конца!')) + '</span>' +
        '<div class="goal thin"><i style="width:' + pr.pct + '%"></i></div>' +
        '<button class="pet-say" data-psay="' + A.esc(line.kk) + '">🔊 «' + A.esc(line.kk) + '»</button>' +
        (hungry ? '' : '<span class="pill ok">😋 ' + A.esc(en() ? 'Fed today' : 'Накормлен сегодня') + '</span>') + '</div>' +
        (hungry ? '<button class="btn gold" id="petfeed">🍽️ ' + A.esc(en() ? 'Feed: play Дастархан Master' : 'Покормить: сыграй Дастархан Master') + '</button>' : '') + '</div>';
      h += '<h3>' + A.esc(en() ? 'Neon shop' : 'Неон-дүкен · неоновый магазин') + '</h3><div class="pet-shop">' + P.ACC.map(function (a) {
        var own = st.acc.indexOf(a.id) >= 0;
        return '<button class="shop-row" data-pacc="' + a.id + '"' + (own ? ' disabled' : '') + '><span class="em">' + a.e + '</span><span><b>' + A.esc(a.kk) + '</b><span class="muted">' + A.esc(T(a)) + '</span></span><span class="pill' + (own ? ' ok' : '') + '">' + (own ? '✓' : a.price + ' 🪙') + '</span></button>';
      }).join('') + '</div>';
    }
    h += '<div class="pet-pick">' + P.PETS.map(function (p) {
      var on = st && st.id === p.id, owned = st && (st.owned || []).indexOf(p.id) >= 0;
      return '<button class="pet-opt' + (on ? ' on' : '') + '" data-pet="' + p.id + '"><span class="pet-e">' + p.e + '</span><b>' + A.esc(p.kk) + '</b><small>' + A.esc(T(p)) + '</small><span class="pill' + (on || owned ? ' ok' : '') + '">' +
        (on ? '✓' : owned || !p.price ? (en() ? 'Choose' : 'Таңдау') : p.price + ' 🪙') + '</span></button>';
    }).join('') + '</div>';
    return '<section class="pets">' + h + '</section>';
  }
  function bindPets() {
    var S = A.state();
    A.qsa('[data-pet]').forEach(function (b) { b.onclick = function () {
      var r = P.adopt(S.pet, b.getAttribute('data-pet'), S.coins);
      if (!r.ok) { if (r.why === 'coins') { A.sfx.bad(); A.toast(en() ? 'Not enough 🪙' : 'Не хватает 🪙'); } return; }
      S.pet = r.st; S.coins = r.coins; A.sfx.coin(); A.save(); A.refresh();
    }; });
    A.qsa('[data-pacc]').forEach(function (b) { b.onclick = function () {
      var r = P.buyAcc(S.pet, b.getAttribute('data-pacc'), S.coins);
      if (!r.ok) { if (r.why === 'coins') { A.sfx.bad(); A.toast(en() ? 'Not enough 🪙' : 'Не хватает 🪙'); } return; }
      S.pet = r.st; S.coins = r.coins; A.sfx.coin(); A.save(); A.refresh();
    }; });
    A.qsa('[data-psay]').forEach(function (b) { b.onclick = function () { A.TTS.speak(b.getAttribute('data-psay'), true); }; });
    var f = A.qs('#petfeed'); if (f) f.onclick = function () { A.sfx.tap(); A.startGame('dastarkhan'); };
  }
  chain('shopTop', petHtml); chainBind('bindShop', bindPets);

  /* ---------------------------------------------------------------- «Мектеп Бәйгесі» (me tab) */
  function myCode() { var S = A.state(); return B.encode({ name: S.name || 'Оқушы', cls: S.cls || '', xp: S.xp || 0, lessons: lessonsDone(), day: today() }); }
  function qrSvg(text) { try { var q = window.qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); } catch (e) { return ''; } }
  function baigeHtml() {
    var S = A.state();
    return '<section class="baige"><h2>🏇 Мектеп Бәйгесі</h2><p class="muted">' + A.esc(en() ? 'Show this code to your teacher: the class race is counted on the teacher\'s phone, no internet needed.' : 'Покажи код учителю: бәйге классов считается на телефоне учителя, интернет не нужен.') + '</p>' +
      '<label class="baige-cls">' + A.esc(en() ? 'My class' : 'Мой класс') + ' <input id="bcls" maxlength="6" placeholder="4А" value="' + A.esc(S.cls || '') + '"></label>' +
      (S.cls ? '<div class="baige-qr">' + qrSvg(myCode()) + '</div><code class="baige-code" id="bcode">' + A.esc(myCode()) + '</code>' : '<p class="muted">' + A.esc(en() ? 'Type your class to get a code.' : 'Впиши класс, чтобы получить код.') + '</p>') +
      '<button class="btn ghost" id="bteach">👩‍🏫 ' + A.esc(en() ? 'Teacher: class board' : 'Учителю: таблица бәйге') + '</button></section>';
  }
  function boardHtml(text) {
    var bd = B.board(text);
    if (!bd.pupils.length) return '<p class="muted">' + A.esc(en() ? 'Paste the pupils\' codes above.' : 'Вставьте выше коды учеников.') + (bd.bad ? ' ⚠️ ' + bd.bad : '') + '</p>';
    return '<h3>' + A.esc(en() ? 'Classes' : 'Классы') + '</h3><ol class="baige-list">' + bd.classes.map(function (c) { return '<li><b>' + A.esc(c.cls || '—') + '</b> · ⚡ ' + c.avg + ' <small>(' + c.n + ')</small></li>'; }).join('') + '</ol>' +
      '<h3>' + A.esc(en() ? 'Pupils' : 'Ученики') + '</h3><ol class="baige-list">' + bd.pupils.map(function (p) { return '<li><b>' + A.esc(p.name) + '</b> ' + A.esc(p.cls) + ' · ⚡ ' + p.xp + ' · 📘 ' + p.lessons + '</li>'; }).join('') + '</ol>' +
      (bd.bad ? '<p class="muted">⚠️ ' + A.esc((en() ? 'Codes with a typo: ' : 'Кодов с опечаткой: ') + bd.bad) + '</p>' : '');
  }
  function bindBaige() {
    var S = A.state(), inp = A.qs('#bcls');
    if (inp) inp.onchange = function () { S.cls = inp.value.trim().toUpperCase().slice(0, 6); A.save(); A.refresh(); };
    var t = A.qs('#bteach'); if (t) t.onclick = function () {
      A.sheet('<h2>🏇 Мектеп Бәйгесі</h2><p class="muted">' + A.esc(en() ? 'Paste or type the pupils\' codes (one per line).' : 'Вставьте или наберите коды учеников (по одному в строке).') + '</p><textarea id="bcodes" rows="5" class="baige-in" placeholder="QV1-…"></textarea><div id="bboard">' + boardHtml('') + '</div>');
      var ta = A.qs('#bcodes'); ta.oninput = function () { A.qs('#bboard').innerHTML = boardHtml(ta.value); };
    };
  }
  chain('meTop', baigeHtml, true); chainBind('bindMe', bindBaige);

  /* ---------------------------------------------------------------- «Көше тілі» (Тірі тіл path) */
  var STREET = window.QSTREET || [];
  function streetHtml() {
    var S = A.state(), gi = A.gIdx(); if (A.D.GRADES[gi].kk !== 'Тірі тіл') return '';
    var on = !!S.street;
    return '<div class="pad"><section class="street' + (on ? ' on' : '') + '"><button class="street-tog" id="streettog" aria-pressed="' + on + '"><span class="sw"><i></i></span><b>🗣 Көше тілі</b><small>' +
      A.esc(en() ? 'Street talk — how friends really say it' : 'Уличная речь — как говорят друзья') + '</small></button>' +
      (on ? '<div class="street-list">' + STREET.map(function (x) {
        return '<div class="street-row"><button data-say="' + A.esc(x[0]) + '" class="st-f">' + A.esc(x[0]) + '</button><span>→</span><button data-say="' + A.esc(x[1]) + '" class="st-s">' + A.esc(x[1]) + ' 🔊</button><small>' + A.esc(en() ? x[3] : x[2]) + '</small></div>';
      }).join('') + '<p class="muted">' + A.esc(en() ? 'Use street talk with friends; with elders and teachers stay polite (сіз).' : 'С друзьями — уличная речь; со старшими и учителем — вежливо, на «сіз».') + '</p></div>' : '') + '</section></div>';
  }
  function bindStreet() {
    var t = A.qs('#streettog'); if (!t) return;
    t.onclick = function () { var S = A.state(); S.street = !S.street; A.sfx.tap(); A.save(); A.refresh(); };
    A.qsa('.street-row [data-say]').forEach(function (b) { b.onclick = function () { A.TTS.speak(b.getAttribute('data-say'), true); }; });
  }
  chain('homeCard', streetHtml); chainBind('bindHome', bindStreet);
})();
