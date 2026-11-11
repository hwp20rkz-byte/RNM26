/* Аркады QazaqVerse: быстрые сессии по 60–90 секунд на живой бытовой речи.
 *   bazaar      — Көк Базар Rush: спроси цену, расслышь её, поторгуйся, ударь по рукам;
 *   drift       — Аул Cyber-Drift: 3D-раннер, навигатор командует по-казахски;
 *   dastarkhan  — Дастархан Master: рассади гостей по статусу и скажи нужные слова уважения;
 *   aitys       — Айтыс Beat Battle: ритм-дуэль, слова строчки нужно ловить в бит.
 * Каждая игра получает api от app.js (см. startGame) и заканчивается вызовом api.end({...}). */
(function () {
  'use strict';
  var W = window.QWORLD, V = window.QV3D, D = window.QDATA;
  var ARC = {};

  /* ---------- shared helpers ---------- */
  function L(api, o) { return api.lang() === 'en' ? o.en : o.ru; }
  function say(api, host, name) { var l = W.LINES[host][name]; api.TTS.speak(l.kk, true); return l; }
  function neon(api) { api.qs('.game').classList.add('neon'); }
  // Intro card with the host; resolves when the player taps «Бастау».
  function intro(api, host, title, how, start) {
    var l = W.LINES[host].intro, body = api.qs('#gb');
    var ov = document.createElement('div'); ov.className = 'arc-intro';
    ov.innerHTML = W.hero(host, 'wow') + '<h2>' + api.esc(title) + '</h2><p class="kk">«' + api.esc(l.kk) + '»</p><p class="muted">' + api.esc(L(api, l)) + '</p><p>' + api.esc(how) + '</p><button class="btn gold" id="arcgo">Бастау ▶</button>';
    body.appendChild(ov);
    api.TTS.speak(l.kk, true);
    api.qs('#arcgo').onclick = function () { api.sfx.tap(); ov.remove(); start(); };
  }
  function hostPop(api, host, name) {
    var l = say(api, host, name), el = api.qs('#gb'); if (!el) return;
    var p = document.createElement('div'); p.className = 'host-pop';
    p.innerHTML = W.hero(host, name === 'lose' ? 'sad' : 'wow') + '<span>' + api.esc(l.kk) + '</span>';
    el.appendChild(p); setTimeout(function () { p.remove(); }, 1800);
  }
  function countdown(api, secs, onTick, onEnd) {
    var left = window.qFast ? Math.min(secs, 16) : secs, id = setInterval(function () { left--; onTick(left); if (left <= 0) { clearInterval(id); onEnd(); } }, 1000);
    onTick(left);
    return { stop: function () { clearInterval(id); }, add: function (d) { left = Math.max(1, left + d); onTick(left); }, left: function () { return left; } };
  }
  function finish(api, host, o) {
    var win = o.win !== false;
    say(api, host, win ? 'win' : 'lose');
    o.arcade = true; o.title = o.title || (win ? W.LINES[host].win.kk : W.LINES[host].lose.kk);
    api.end(o);
  }
  // Phrase from bubbles: tap the words in order. Calls done(ok).
  function bubbles(api, el, phrase, extra, done) {
    var want = phrase.replace(/[.,!?]/g, '').split(/\s+/), got = [];
    var all = api.shuffle(want.map(function (w, i) { return { w: w, k: i }; }).concat(extra.map(function (w) { return { w: w, k: -1 }; })));
    function draw() {
      el.innerHTML = '<div class="bub-line">' + want.map(function (w, i) { return '<span class="' + (i < got.length ? 'on' : '') + '">' + (i < got.length ? api.esc(w) : '•••') + '</span>'; }).join(' ') + '</div>' +
        '<div class="bubs">' + all.map(function (b, i) { return '<button class="bub' + (b.used ? ' used' : '') + '" data-b="' + i + '" data-k="' + b.k + '" style="animation-delay:' + (i * 0.12).toFixed(2) + 's">' + api.esc(b.w) + '</button>'; }).join('') + '</div>';
      api.qsa('.bub', el).forEach(function (btn) {
        btn.onclick = function () {
          var b = all[+btn.getAttribute('data-b')]; if (b.used) return;
          if (b.w.toLowerCase() === want[got.length].toLowerCase()) {
            b.used = true; got.push(b.w); api.sfx.tap(); api.TTS.speak(b.w.toLowerCase(), true);
            if (got.length === want.length) { el.innerHTML = '<div class="bub-line done">' + api.esc(phrase) + '</div>'; return done(true); }
            draw();
          } else { api.sfx.bad(); btn.classList.add('shake'); api.vibrate(40); done(false); setTimeout(function () { btn.classList.remove('shake'); }, 350); }
        };
      });
    }
    draw();
  }

  /* ============================================================ Көк Базар Rush */
  var GOODS = [
    { kk: 'алма', e: '🍎', p: 600, sweet: 1 }, { kk: 'алмұрт', e: '🍐', p: 700, sweet: 1 }, { kk: 'қарбыз', e: '🍉', p: 1500, sweet: 1 }, { kk: 'қауын', e: '🍈', p: 1200, sweet: 1 },
    { kk: 'жүзім', e: '🍇', p: 900, sweet: 1 }, { kk: 'нан', e: '🍞', p: 200 }, { kk: 'сәбіз', e: '🥕', p: 300 }, { kk: 'қызанақ', e: '🍅', p: 800 }, { kk: 'бал', e: '🍯', p: 2000, sweet: 1 }, { kk: 'ет', e: '🥩', p: 1900 }
  ];
  var SELLERS = ['tulki', 'ayu', 'botaqan', 'kulyn', 'qoyan'];
  ARC.bazaar = function (api) {
    var score = 0, deals = 0, combo = 0, best = 0, T = null, over = false, step = 0, good = null, price = 0, seller = '';
    var body = api.frame('Көк Базар Rush', '<div class="stall" id="stall"></div><div class="arc-task" id="task"></div><div id="inp"></div>'); neon(api);
    api.onLeave(function () { over = true; if (T) T.stop(); if (window.QVOICE) window.QVOICE.stop(); });
    function hud(left) { api.stat('⏱ ' + (left != null ? left : T.left()) + ' · 🧺 ' + deals + ' · ⭐ ' + score + (combo > 1 ? ' · 🔥×' + combo : '')); }
    function stall(line, tr, tag) {
      var el = api.qs('#stall'); if (!el || over) return;     // a pending timer can fire after the round ended
      el.innerHTML = '<div class="seller">' + W.hero(seller, 'happy') + '</div><div class="good"><span class="em">' + good.e + '</span><b>' + api.esc(good.kk) + '</b>' + (tag ? '<span class="price">' + tag + '</span>' : '') + '</div>' +
        (line ? '<div class="say-b"><b>' + api.esc(line) + '</b>' + (tr ? '<small>' + api.esc(tr) + '</small>' : '') + '</div>' : '');
    }
    function ok(mult) { combo++; best = Math.max(best, combo); score += 10 * Math.min(4, 1 + Math.floor(combo / 3)) * (mult || 1); api.sfx.ok(); if (combo === 10) hostPop(api, 'batyr', 'combo'); hud(); }
    function miss() { combo = 0; T.add(-3); hud(); }
    function task(ru, en) { var el = api.qs('#task'); if (el && !over) el.innerHTML = api.esc(api.lang() === 'en' ? en : ru); }
    function phrase(text, extra, next) {
      var el = api.qs('#inp'), mic = window.QVOICE && window.QVOICE.ready();
      el.innerHTML = '<div id="bubs"></div>' + (mic ? '<button class="btn ghost mic-btn" id="bmic">🎙️ Айту · сказать вслух (×2)</button>' : '');
      bubbles(api, api.qs('#bubs'), text, extra, function (good2) { if (over) return; if (good2) { ok(1); setTimeout(next, 500); } else miss(); });
      if (mic) api.qs('#bmic').onclick = function () {
        api.qs('#bmic').textContent = '🎙️ Слушаю…';
        window.QVOICE.listen(text).then(function (r) {
          if (over || !api.qs('#bmic')) return;
          if (r.passed) { api.qs('#inp').innerHTML = window.QVOICE.resultHtml(r); ok(2); setTimeout(next, 900); }
          else { api.qs('#bmic').textContent = '🎙️ ' + (r.error ? window.QVOICE.errText(r.error) : Math.round(r.score) + '% — ещё раз'); api.sfx.bad(); }
        });
      };
    }
    function deal() {
      if (over) return;
      good = GOODS[api.rnd(GOODS.length)]; seller = SELLERS[api.rnd(SELLERS.length)]; price = good.p; step = 0;
      ask();
    }
    function ask() {                                   // 1. ask the price
      stall('Сәлеметсіз бе! Келіңіз!', api.lang() === 'en' ? 'Hello! Come in!' : 'Здравствуйте! Подходите!');
      task('Спроси, сколько стоит', 'Ask how much it costs');
      phrase(good.kk.charAt(0).toUpperCase() + good.kk.slice(1) + ' қанша тұрады?', ['келістік', 'тәтті'], hear);
    }
    function hear() {                                  // 2. catch the price by ear
      if (over) return;
      var words = D.numToKk(price);
      stall('… теңге!', null, '🔊 ???');
      api.TTS.speak(words, true);
      task('Расслышь цену и выбери её', 'Listen to the price and pick it');
      var opts = api.shuffle([price, price + (price >= 1000 ? 100 : 50), Math.max(50, price - (price >= 1000 ? 200 : 100))]);
      api.qs('#inp').innerHTML = '<button class="btn ghost" id="relisten">🔊 ' + (api.lang() === 'en' ? 'Listen again' : 'Ещё раз') + '</button><div class="prices">' + opts.map(function (p) { return '<button class="ptag" data-p="' + p + '">' + p + ' ₸</button>'; }).join('') + '</div>';
      api.qs('#relisten').onclick = function () { api.TTS.speak(words, true); };
      api.qsa('.ptag').forEach(function (b) {
        b.onclick = function () {
          if (+b.getAttribute('data-p') === price) { ok(1); stall(words.charAt(0).toUpperCase() + words.slice(1) + ' теңге', null, price + ' ₸'); setTimeout(good.sweet && Math.random() < 0.45 ? sweet : haggle, 600); }
          else { api.sfx.bad(); b.classList.add('shake'); b.disabled = true; miss(); }
        };
      });
    }
    function sweet() {                                 // optional: «Тәтті ме өзі?»
      if (over) return;
      task('Уточни: а оно сладкое?', 'Check: is it actually sweet?');
      phrase('Тәтті ме өзі?', ['қымбат', 'ба'], function () { stall('Әрине, бал татиды!', api.lang() === 'en' ? 'Of course, sweet as honey!' : 'Конечно, как мёд!', price + ' ₸'); setTimeout(haggle, 900); });
    }
    function haggle() {                                // 3. ask for a discount
      if (over) return;
      task('Дорого! Попроси скидку', 'Too expensive! Ask for a discount');
      phrase(Math.random() < 0.5 ? 'Түсіріп беріңізші!' : 'Бұл тым қымбат', ['арзан', 'рақмет'], function () {
        price = Math.max(50, price - (price >= 1000 ? 200 : 100));
        var w2 = D.numToKk(price);
        stall('Жарайды! ' + w2.charAt(0).toUpperCase() + w2.slice(1) + ' теңге.', api.lang() === 'en' ? 'All right! ' + price + ' tenge.' : 'Ладно! ' + price + ' тенге.', price + ' ₸');
        api.TTS.speak(w2, true);
        setTimeout(close, 900);
      });
    }
    function close() {                                 // 4. shake hands, then pay
      if (over) return;
      task('Ударь по рукам!', 'Seal the deal!');
      phrase('Келістік!', ['кездескенше', 'қымбат'], function () {
        stall('Қолма-қол ма, аударым ба?', api.lang() === 'en' ? 'Cash or transfer?' : 'Наличными или переводом?', price + ' ₸');
        api.TTS.speak('Қолма-қол ма, аударым ба?', true);
        task('Ответь: оплачу переводом', 'Answer: I will pay by transfer');
        setTimeout(function () { phrase('Аударыммен төлеймін', ['қолма-қол', 'келістік'], function () { deals++; score += 20; api.sfx.coin(); api.vibrate(30); hud(); stall('Рақмет! Тағы келіңіз!', api.lang() === 'en' ? 'Thank you! Come again!' : 'Спасибо! Приходите ещё!', '✅'); setTimeout(deal, 700); }); }, 500);
      });
    }
    function end() {
      if (over) return; over = true; T.stop();
      finish(api, 'batyr', { score: score, scoreText: deals + ' 🧺 · ' + score + ' ⭐', coins: Math.min(40, deals * 6 + Math.floor(score / 40)), xp: Math.min(15, 4 + deals * 3), win: deals > 0,
        sub: (api.lang() === 'en' ? 'Deals closed: ' : 'Сделок заключено: ') + deals + (best >= 5 ? ' · комбо ×' + best : '') });
    }
    intro(api, 'batyr', 'Көк Базар Rush', api.lang() === 'en' ? 'Buy food for your guests in 75 seconds: ask the price, catch it by ear, haggle and seal the deal. Build each phrase from bubbles.' : 'За 75 секунд закупи продукты для гостей: спроси цену, расслышь её, поторгуйся и ударь по рукам. Каждую фразу собирай из бабблов.', function () {
      T = countdown(api, 75, hud, end); deal();
    });
  };

  /* ============================================================ Аул Cyber-Drift */
  var CMD = [
    { id: 'right', kk: 'Оңға бұрыл!', ru: 'Поверни направо!', en: 'Turn right!', ic: '▶' },
    { id: 'left', kk: 'Солға бұрыл!', ru: 'Поверни налево!', en: 'Turn left!', ic: '◀' },
    { id: 'straight', kk: 'Тура жүр!', ru: 'Езжай прямо!', en: 'Go straight!', ic: '▲' },
    { id: 'stop', kk: 'Тоқта, бағдаршам қызыл!', ru: 'Стой, светофор красный!', en: 'Stop, the light is red!', ic: '■' }
  ];
  ARC.drift = function (api) {
    var score = 0, okN = 0, combo = 0, best = 0, lives = 3, parcels = 0, over = false, cur = null, answered = null, started = false;
    var body = api.frame('Аул Cyber-Drift', '<div class="drift-stage" id="dst"></div><div class="nav-cmd" id="cmd"><span class="muted">…</span></div>' +
      '<div class="drift-pad"><button data-d="left">◀</button><button data-d="straight">▲</button><button data-d="right">▶</button><button data-d="stop" class="stop">■</button></div>'); neon(api);
    var stage = null, player = null, lane = 0, laneX = 0, speed = 26, gate = null, shake = 0, movers = [], brake = 0, nextAt = 0, win = 3.6;
    api.onLeave(function () { over = true; if (stage) stage.dispose(); });
    function hud() { api.stat('📦 ' + parcels + ' · ⭐ ' + score + ' · ' + '❤️'.repeat(Math.max(0, lives)) + (combo > 2 ? ' · 🔥×' + combo : '')); }
    function build() {
      if (!(V && V.ok())) { api.qs('#dst').innerHTML = '<div class="drift-flat">🛵</div>'; return; }
      stage = V.stage(api.qs('#dst'), { camPos: [0, 4.4, 9], camLook: [0, 1.2, -8], fov: 55, fog: 0x0b1030, fogNear: 30, fogFar: 95 });
      if (!stage) return;
      var T3 = V.THREE, sc = stage.scene;
      sc.background = new T3.Color(0x0b1030);
      sc.add(V.box(60, 0.1, 240, 0x121a44, 0, -0.1, -90), V.box(8, 0.12, 240, 0x232a52, 0, -0.04, -90));
      sc.add(V.box(0.18, 0.14, 240, V.glow(V.NEON.cyan), -4.1, 0, -90), V.box(0.18, 0.14, 240, V.glow(V.NEON.pink), 4.1, 0, -90));
      for (var i = 0; i < 24; i++) {                                  // lane dashes
        [-1.35, 1.35].forEach(function (x) { var d = V.box(0.14, 0.02, 2.4, V.glow(0xffffff), x, 0.04, -i * 8); sc.add(d); movers.push({ o: d, span: 192 }); });
      }
      var cols = [0x2a3a8c, 0x3b2a7a, 0x1f5c7a, 0x6a2a6a, 0x254a9c], glows = [V.NEON.cyan, V.NEON.pink, V.NEON.gold, V.NEON.lime, V.NEON.violet];
      for (var k = 0; k < 28; k++) {                                  // the city: blocks with neon window bands
        var side = k % 2 ? 1 : -1, h = 4 + Math.random() * 12, w = 4 + Math.random() * 3, x = side * (8 + Math.random() * 6);
        var g = V.group(x, 0, -Math.floor(k / 2) * 14 - Math.random() * 4, V.box(w, h, 6, cols[k % cols.length], 0, h / 2, 0));
        for (var f = 1; f < h / 2.4; f++) g.add(V.box(w + 0.06, 0.16, 6.06, V.glow(glows[(k + f) % glows.length]), 0, f * 2.4, 0));
        sc.add(g); movers.push({ o: g, span: 196 });
      }
      player = V.group(0, 0, 2);
      var horse = V.make('pet_tay'); horse.scale.setScalar(1.5); horse.rotation.y = Math.PI / 2;
      var rider = V.make('tayson'); rider.scale.setScalar(0.55); rider.position.set(0, 1.55, 0.1); rider.rotation.y = Math.PI;
      player.add(horse, rider, V.box(1.2, 0.06, 2.6, V.glow(V.NEON.lime), 0, 0.03, 0)); sc.add(player);
      stage.onTick(function (t, dt) {
        var v = over || !started ? 0 : speed * (brake > 0 ? Math.max(0, 1 - brake * 3) : 1);
        if (brake > 0) brake = Math.max(0, brake - dt * 0.6);
        movers.forEach(function (m) { m.o.position.z += v * dt; if (m.o.position.z > 14) m.o.position.z -= m.span; });
        laneX += (lane * 2.7 - laneX) * Math.min(1, dt * 9);
        player.position.x = laneX; player.rotation.z = (lane * 2.7 - laneX) * -0.12; player.position.y = Math.abs(Math.sin(t * 9)) * 0.08;
        if (shake > 0) { shake -= dt; stage.camera.position.x = (Math.random() - 0.5) * 0.5; } else stage.camera.position.x = laneX * 0.25;
        if (gate) { gate.position.z += v * dt + (brake > 0 ? 18 * dt : 0); if (gate.position.z > 4) { sc.remove(gate); gate = null; } }
      });
    }
    function spawnGate(c) {
      if (!stage) return;
      var g = V.group(0, 0, -speed * win + 2);
      if (c.id === 'stop') g.add(V.cyl(0.14, 0.14, 5, 0x22262e, 4.6, 2.5, 0), V.box(0.8, 2, 0.6, 0x16181f, 4.6, 5, 0), V.ball(0.3, V.glow(V.NEON.red), 4.6, 5.6, 0.35), V.box(8.4, 0.5, 0.4, V.glow(V.NEON.red), 0, 0.3, 0));
      else g.add(V.box(8.6, 0.4, 0.4, V.glow(V.NEON.gold), 0, 5.2, 0), V.cyl(0.14, 0.14, 5.2, 0x22262e, -4.3, 2.6, 0), V.cyl(0.14, 0.14, 5.2, 0x22262e, 4.3, 2.6, 0));
      stage.scene.add(g); gate = g;
    }
    function ask() {
      if (over) return;
      var pool = CMD.filter(function (c) { return !cur || c.id !== cur.id; });
      cur = pool[api.rnd(pool.length)]; answered = null; lane = 0;
      var hint = okN < 5, blind = okN >= 12;
      api.qs('#cmd').innerHTML = '<b>' + (blind ? '🔊 ???' : api.esc(cur.kk)) + '</b>' + (hint ? '<small>' + api.esc(L(api, cur)) + '</small>' : '') + '<i class="cmd-bar" style="animation-duration:' + win.toFixed(2) + 's"></i>';
      api.TTS.speak(cur.kk, true);
      spawnGate(cur);
      nextAt = setTimeout(resolve, win * 1000);
    }
    function input(d) {
      if (over || !cur || answered) return;
      answered = d; api.sfx.tap();
      if (d === 'left') lane = -1; else if (d === 'right') lane = 1; else if (d === 'stop') brake = 1;
      clearTimeout(nextAt); nextAt = setTimeout(resolve, 380);
    }
    function resolve() {
      if (over || !cur) return;
      var c = cur, good = answered === c.id; cur = null;
      if (good) {
        okN++; combo++; best = Math.max(best, combo); score += 10 * (okN > 12 ? 2 : 1) * Math.min(3, 1 + Math.floor(combo / 4)); api.sfx.ok();
        api.qs('#cmd').innerHTML = '<b class="good">✓ ' + api.esc(c.kk) + '</b><small>' + api.esc(L(api, c)) + '</small>';
        if (combo === 8) hostPop(api, 'tayson', 'combo');
        if (okN % 6 === 0) { parcels++; score += 30; api.sfx.coin(); api.TTS.speak('Жеттік, осы жерде қалдырыңыз', true); api.qs('#cmd').innerHTML = '<b class="good">📦 Жеттік, осы жерде қалдырыңыз</b><small>' + (api.lang() === 'en' ? "We've arrived, leave it here" : 'Доехали, оставьте здесь') + '</small>'; }
        speed = Math.min(46, speed + 1.2); win = Math.max(2.1, win - 0.09);
      } else {
        combo = 0; lives--; shake = 0.5; api.sfx.bad(); api.vibrate(120);
        api.qs('#cmd').innerHTML = '<b class="bad">✗ ' + api.esc(c.kk) + '</b><small>' + api.esc(L(api, c)) + ' → ' + c.ic + '</small>';
        if (lives <= 0) return end();
      }
      hud(); lane = c.id === 'left' && good ? -1 : c.id === 'right' && good ? 1 : 0;
      setTimeout(function () { lane = 0; ask(); }, okN % 6 === 0 && good ? 1700 : 1000);
    }
    function end() {
      if (over) return; over = true; clearTimeout(nextAt); T.stop();
      finish(api, 'tayson', { score: score, scoreText: parcels + ' 📦 · ' + score + ' ⭐', coins: Math.min(40, Math.floor(okN * 1.5) + parcels * 5), xp: Math.min(15, okN), win: okN >= 6,
        sub: (api.lang() === 'en' ? 'Commands understood: ' : 'Понято команд: ') + okN + (best >= 5 ? ' · комбо ×' + best : '') });
    }
    api.qsa('[data-d]').forEach(function (b) { b.onclick = function () { input(b.getAttribute('data-d')); }; });
    var sx = 0, sy = 0, st = api.qs('#dst');                           // swipes on the stage
    st.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    st.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      input(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'stop' : 'straight'));
    }, { passive: true });
    var T = null;
    build(); hud();
    intro(api, 'tayson', 'Аул Cyber-Drift', api.lang() === 'en' ? 'You deliver orders on an electric tulpar. The navigator speaks Kazakh: swipe or tap ◀ ▲ ▶, and ■ for a red light. Three crashes and the ride is over.' : 'Ты везёшь заказы на электро-тулпаре. Навигатор говорит по-казахски: свайпай или жми ◀ ▲ ▶, а на красный — ■. Три аварии — и поездка окончена.', function () {
      started = true; T = countdown(api, 80, function () { }, end); setTimeout(ask, 900);
    });
  };

  /* ============================================================ Дастархан Master */
  var GUESTS = [
    { id: 'ata', e: '👴', kk: 'Ата', elder: 1 }, { id: 'azhe', e: '👵', kk: 'Әже', elder: 1 }, { id: 'aga', e: '🧔', kk: 'Аға' },
    { id: 'apke', e: '👩', kk: 'Әпке' }, { id: 'bala', e: '👦', kk: 'Бала' }, { id: 'qonaq', e: '🧑', kk: 'Қонақ' }
  ];
  var NEEDS = [
    { id: 'tea', ic: '🫖', ru: 'хочет чаю', en: 'wants tea', kk: 'Шай ішіңіз, ыстықтай!' },
    { id: 'food', ic: '🍖', ru: 'перед гостем угощение', en: 'food is served', kk: 'Дәмнен ауыз тиіңіз' },
    { id: 'eat', ic: '😋', ru: 'гость ест', en: 'the guest is eating', kk: 'Ас болсын!' },
    { id: 'cup', ic: '🥣', ru: 'пиала пуста', en: 'the bowl is empty', kk: 'Тағы шай құяйын ба?' },
    { id: 'bata', ic: '🤲', ru: 'старший готов дать бата', en: 'the elder will give a blessing', kk: 'Бата беріңіз', elder: 1 }
  ];
  var RESPECT = ['Қош келдіңіз!', 'Төрлетіңіз!', 'Шай ішіңіз, ыстықтай!', 'Дәмнен ауыз тиіңіз', 'Ас болсын!', 'Тағы шай құяйын ба?', 'Бата беріңіз', 'Кездескенше!'];
  ARC.dastarkhan = function (api) {
    var score = 0, served = 0, combo = 0, hearts = 3, over = false, T = null, seats = [null, null, null, null], queue = [], waiting = null, spawnT = null, tickT = null;
    api.frame('Дастархан Master', '<div class="dk" id="dk"></div><div class="arc-task" id="task"></div><div id="inp"></div>'); neon(api);
    api.onLeave(function () { over = true; if (T) T.stop(); clearTimeout(spawnT); clearInterval(tickT); });
    function hud(left) { api.stat('⏱ ' + (left != null ? left : T.left()) + ' · 🍽️ ' + served + ' · ⭐ ' + score + ' · ' + '❤️'.repeat(Math.max(0, hearts))); }
    function task(ru, en) { var el = api.qs('#task'); if (el && !over) el.innerHTML = api.esc(api.lang() === 'en' ? en : ru); }
    function draw() {
      var seat = function (i) {
        var g = seats[i];
        return '<button class="seat s' + i + (i === 0 ? ' tor' : '') + (g ? ' taken' : '') + (g && g.need ? ' need' : '') + '" data-seat="' + i + '">' + (i === 0 ? '<i class="tor-l">ТӨР 👑</i>' : '') +
          (g ? '<span class="g">' + g.e + '</span><small>' + g.kk + '</small>' + (g.need ? '<span class="nb">' + g.need.ic + '<u style="animation-duration:' + g.pat + 's"></u></span>' : '') : '<span class="g empty">＋</span>') + '</button>';
      };
      api.qs('#dk').innerHTML = '<div class="door">' + (waiting ? '<span class="g knock">' + waiting.e + '</span><small>' + waiting.kk + '</small>' : '🚪') + '</div>' +
        '<div class="table"><div class="cloth">🫖 🍞 🍯 🍇 🥣</div>' + seat(0) + seat(1) + seat(2) + seat(3) + '</div>';
      api.qsa('[data-seat]').forEach(function (b) { b.onclick = function () { tapSeat(+b.getAttribute('data-seat')); }; });
    }
    function good(pts) { combo++; score += pts * Math.min(3, 1 + Math.floor(combo / 4)); api.sfx.ok(); if (combo === 8) hostPop(api, 'azhe', 'combo'); hud(); }
    function bad() { combo = 0; hearts--; api.sfx.bad(); api.vibrate(80); hud(); if (hearts <= 0) end(); }
    function pick(correct, then) {                       // choose the right words of respect
      var opts = api.shuffle([correct].concat(api.shuffle(RESPECT.filter(function (p) { return p !== correct; })).slice(0, 2)));
      api.qs('#inp').innerHTML = '<div class="cards list">' + opts.map(function (o, i) { return '<button class="card" data-i="' + i + '">' + api.esc(o) + '</button>'; }).join('') + '</div>';
      api.qsa('#inp .card').forEach(function (c) {
        c.onclick = function () {
          var o = opts[+c.getAttribute('data-i')];
          if (o === correct) { c.classList.add('right'); api.TTS.speak(correct, true); good(10); setTimeout(function () { if (!over) { api.qs('#inp').innerHTML = ''; then(); } }, 450); }
          else { c.classList.add('wrong'); c.disabled = true; bad(); }
        };
      });
    }
    function arrive() {
      if (over || waiting) return;
      if (seats.indexOf(null) < 0) return;
      waiting = queue.shift() || null;
      if (!waiting) return;
      api.sfx.pair(); draw();
      task(waiting.elder ? 'Пришёл старший! Посади его на почётное место — төр' : 'Гость у двери. Посади его за дастархан (төр — только для старших)', waiting.elder ? 'An elder has come! Seat them at the төр — the place of honour' : 'A guest is at the door. Seat them at the table (the төр is for elders only)');
    }
    function tapSeat(i) {
      if (over) return;
      var g = seats[i];
      if (waiting && !g) {
        var elderTaken = seats[0] && seats[0].elder;
        var right = waiting.elder ? (i === 0 || elderTaken) : i !== 0;
        if (!right) { bad(); api.qs('.seat.s' + i).classList.add('shake'); return; }
        var w = waiting; waiting = null; seats[i] = w; draw(); good(5);
        task('Скажи гостю нужные слова', 'Say the right words to the guest');
        pick(i === 0 ? 'Төрлетіңіз!' : 'Қош келдіңіз!', function () { task('Следи за гостями: нажми на того, кому что-то нужно', 'Watch your guests: tap the one who needs something'); setTimeout(arrive, 600); });
        return;
      }
      if (g && g.need) {
        var n = g.need;
        task(g.kk + ': ' + n.ru + ' — что сказать?', g.kk + ': ' + n.en + ' — what do you say?');
        pick(n.kk, function () {
          g.need = null; served++; hud(); draw();
          if (n.id === 'bata') { score += 30; api.confetti(); hostPop(api, 'azhe', 'win'); }
          task('Следи за гостями: нажми на того, кому что-то нужно', 'Watch your guests: tap the one who needs something');
        });
      }
    }
    function spawnNeed() {
      if (over) return;
      var cand = seats.filter(function (g) { return g && !g.need; });
      if (cand.length && !waiting) {
        var g = cand[api.rnd(cand.length)], pool = NEEDS.filter(function (n) { return !n.elder || (g.elder && served >= 4); });
        g.need = pool[api.rnd(pool.length)]; g.pat = Math.max(5, 9 - served * 0.15); g.t0 = Date.now(); api.sfx.tap(); draw();
      }
      spawnT = setTimeout(spawnNeed, Math.max(2200, 4200 - served * 90));
    }
    function end() {
      if (over) return; over = true; T.stop(); clearTimeout(spawnT); clearInterval(tickT);
      finish(api, 'azhe', { score: score, scoreText: served + ' 🍽️ · ' + score + ' ⭐', coins: Math.min(40, served * 3 + Math.floor(score / 50)), xp: Math.min(15, 3 + served), win: served >= 3 && hearts > 0,
        sub: (api.lang() === 'en' ? 'Guests honoured: ' : 'Оказано уважения гостям: ') + served });
    }
    intro(api, 'azhe', 'Дастархан Master', api.lang() === 'en' ? 'Guests are coming! Seat elders at the төр, greet everyone and answer each need with the right words before their patience runs out.' : 'Идут гости! Старших сажай на төр, всех приветствуй и на каждую просьбу отвечай нужными словами, пока хватает терпения.', function () {
      queue = api.shuffle(GUESTS).slice(0, 4);
      if (!queue.some(function (g) { return g.elder; })) queue[0] = GUESTS[0];
      T = countdown(api, 80, hud, end); draw(); arrive();
      spawnT = setTimeout(spawnNeed, 9000);
      tickT = setInterval(function () {                 // patience check
        seats.forEach(function (g) { if (g && g.need && Date.now() - g.t0 > g.pat * 1000) { g.need = null; bad(); if (!over) { api.qs('#inp').innerHTML = ''; draw(); } } });
      }, 400);
    });
  };

  /* ============================================================ Айтыс Beat Battle */
  var VERSES = [
    { a: 'Таңертең тұрамын', b: 'Бетімді жуамын', ru: 'Утром я встаю, лицо своё умываю', en: 'In the morning I get up, I wash my face' },
    { a: 'Мектепке барамын', b: 'Көп білім аламын', ru: 'В школу я иду, много знаний получаю', en: 'I go to school, I gain much knowledge' },
    { a: 'Досыммен ойнаймын', b: 'Ешқашан тоймаймын', ru: 'С другом я играю — и всё мне мало', en: 'I play with my friend and never get enough' },
    { a: 'Әжем шай құяды', b: 'Бауырсақ қояды', ru: 'Бабушка чай наливает, баурсаки ставит', en: 'Grandma pours the tea and sets out baursaks' },
    { a: 'Атам ән салады', b: 'Домбыра тартады', ru: 'Дедушка песню поёт, на домбре играет', en: 'Grandpa sings a song and plays the dombra' },
    { a: 'Аспанда күн күледі', b: 'Балалар жүгіреді', ru: 'В небе солнце смеётся, дети бегают', en: 'The sun laughs in the sky, the children run' },
    { a: 'Көктемде гүл өседі', b: 'Құстар ұшып келеді', ru: 'Весной цветы растут, птицы прилетают', en: 'In spring flowers grow and birds fly home' },
    { a: 'Қазақша сөйлеймін', b: 'Тілімді сүйемін', ru: 'По-казахски говорю, язык свой люблю', en: 'I speak Kazakh, I love my language' }
  ];
  ARC.aitys = function (api) {
    var bpm = 96, beat = 60 / bpm, AC = null, over = false, raf = 0, sched = 0, score = 0, hype = 50, combo = 0, best = 0, hits = 0, total = 0;
    var words = [], rows = [], vi = 0, wi = 0, t0 = 0, nextBeat = 0, beatN = 0, LEAD = 2.6, HITY = 0.8;
    var allWords = api.uniqBy([].concat.apply([], VERSES.map(function (v) { return (v.a + ' ' + v.b).split(' '); })), function (w) { return w.toLowerCase(); });
    api.frame('Айтыс Beat Battle', '<div class="duel"><span>🎤 Сен</span><div class="duel-bar"><i id="hype"></i></div><span>Қарсылас 🤖</span></div>' +
      '<div class="verse" id="verse"></div><div class="lanes" id="lanes"><div class="hitline"></div></div><div class="judge" id="judge"></div>'); neon(api);
    api.onLeave(function () { over = true; cancelAnimationFrame(raf); closeAudio(); });
    function closeAudio() { try { if (AC && AC.state !== 'closed') AC.close().catch(function () { /* already closed */ }); } catch (e) { /* ignore */ } }
    function hud() { api.stat('⭐ ' + score + (combo > 2 ? ' · 🔥×' + combo : '')); var h = api.qs('#hype'); if (h) h.style.width = Math.max(4, Math.min(96, hype)) + '%'; }
    function drum(t, f0, f1, dur, vol, type) { var o = AC.createOscillator(), g = AC.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dur + 0.02); }
    function hat(t, vol) { var n = AC.createBufferSource(), b = AC.createBuffer(1, 2205, 44100), d = b.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length); n.buffer = b; var g = AC.createGain(); g.gain.value = vol; var f = AC.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6000; n.connect(f); f.connect(g); g.connect(AC.destination); n.start(t); }
    var RIFF = [196, 0, 247, 196, 294, 0, 247, 220];   // dombyra-like two-string riff (G3 B3 D4 A3)
    function scheduleBeats() {
      if (!api.S.sound) return;
      while (nextBeat < AC.currentTime + 0.25) {
        var half = beatN % 2 === 0, q = Math.floor(beatN / 2) % 4;
        if (half && (q === 0 || q === 2)) drum(nextBeat, 150, 45, 0.22, 0.5);
        if (half && (q === 1 || q === 3)) { hat(nextBeat, 0.35); drum(nextBeat, 220, 160, 0.08, 0.18, 'triangle'); }
        hat(nextBeat, 0.08);
        var n = RIFF[beatN % 8]; if (n) { drum(nextBeat, n, n * 0.995, 0.24, 0.16, 'sawtooth'); drum(nextBeat + 0.02, n * 2, n * 1.99, 0.12, 0.05, 'triangle'); }
        nextBeat += beat / 2; beatN++;
      }
    }
    function loadVerse() {
      var v = VERSES[vi % VERSES.length]; words = (v.a + ' ' + v.b).split(' '); wi = 0;
      var cut = v.a.split(' ').length;
      api.qs('#verse').innerHTML = '<div class="v-kk">' + words.map(function (w, i) { return (i === cut ? '<br>' : '') + '<span data-w="' + i + '">' + api.esc(w) + '</span>'; }).join(' ') + '</div><small>' + api.esc(L(api, v)) + '</small>';
      for (var i = 0; i < words.length; i++) addRow(i, t0 + (i * 2 + 1) * beat);
      t0 += (words.length * 2 + 2) * beat;
    }
    function addRow(idx, hitAt) {
      var w = words[idx], lane = api.rnd(3), opts = api.shuffle(allWords.filter(function (x) { return x.toLowerCase() !== w.toLowerCase(); })).slice(0, 2);
      opts.splice(lane, 0, w);
      var el = document.createElement('div'); el.className = 'row';
      el.innerHTML = opts.map(function (o, i) { return '<button class="note" data-ok="' + (i === lane ? 1 : 0) + '">' + api.esc(o) + '</button>'; }).join('');
      api.qs('#lanes').appendChild(el);
      var r = { el: el, hitAt: hitAt, idx: idx, done: false, w: w }; rows.push(r); total++;
      api.qsa('.note', el).forEach(function (b) { b.onclick = function () { tap(r, b); }; });
    }
    function judge(txt, cls) { var j = api.qs('#judge'); if (!j) return; j.textContent = txt; j.className = 'judge ' + cls; clearTimeout(judge.t); judge.t = setTimeout(function () { j.className = 'judge'; }, 500); }
    function tap(r, b) {
      if (over || r.done) return;
      var dt = Math.abs(AC.currentTime - r.hitAt), right = b.getAttribute('data-ok') === '1';
      if (!right || dt > 0.42) return miss(r, right ? 'ЕРТЕ / КЕШ' : 'ҚАТЕ СӨЗ');
      r.done = true; r.el.classList.add('hit'); hits++; combo++; best = Math.max(best, combo);
      var perfect = dt < 0.14; score += (perfect ? 15 : 10) * Math.min(4, 1 + Math.floor(combo / 5)); hype += perfect ? 4 : 3;
      judge(perfect ? 'КЕРЕМЕТ!' : 'ЖАҚСЫ!', perfect ? 'perfect' : 'good'); api.vibrate(15);
      api.TTS.speak(r.w.toLowerCase(), true);
      var s = api.qs('[data-w="' + r.idx + '"]'); if (s) s.classList.add('on');
      if (combo === 10) hostPop(api, 'aisulu', 'combo');
      next(r); hud();
    }
    function miss(r, why) {
      r.done = true; r.el.classList.add('missed'); combo = 0; hype -= 5; judge(why || 'ӨТІП КЕТТІ', 'miss'); api.sfx.bad();
      var s = api.qs('[data-w="' + r.idx + '"]'); if (s) s.classList.add('lost');
      next(r); hud();
    }
    function next(r) { if (r.idx === words.length - 1) { vi++; setTimeout(function () { if (!over) loadVerse(); }, 300); } }
    function frame() {
      if (over) return;
      scheduleBeats();
      var now = AC.currentTime, H = api.qs('#lanes').clientHeight;
      rows = rows.filter(function (r) {
        var p = 1 - (r.hitAt - now) / LEAD;                              // 0 = top, 1 = hit line
        r.el.style.transform = 'translateY(' + (p * HITY * H - 26).toFixed(1) + 'px)';
        if (!r.done && now - r.hitAt > 0.42) miss(r);
        if (p > 1.35) { r.el.remove(); return false; }
        return true;
      });
      hype -= 0.012;                                                     // the rival keeps rhyming
      if (now - sched > (window.qFast ? 16 : 75) || hype <= 0) return end();
      raf = requestAnimationFrame(frame);
    }
    function end() {
      if (over) return; over = true; cancelAnimationFrame(raf);
      closeAudio();
      var acc = total ? Math.round(hits / Math.max(1, total - rows.filter(function (r) { return !r.done; }).length) * 100) : 0;
      finish(api, 'aisulu', { score: score, scoreText: score + ' ⭐ · ' + acc + '%', coins: Math.min(40, Math.floor(hits * 0.8) + (hype >= 50 ? 8 : 0)), xp: Math.min(15, Math.floor(hits / 2)), win: hype >= 50,
        sub: (hype >= 50 ? (api.lang() === 'en' ? 'You won the duel! ' : 'Дуэль выиграна! ') : (api.lang() === 'en' ? 'The rival was louder. ' : 'Соперник был громче. ')) + (api.lang() === 'en' ? 'Hits: ' : 'Попаданий: ') + hits + (best >= 5 ? ' · комбо ×' + best : '') });
    }
    intro(api, 'aisulu', 'Айтыс Beat Battle', api.lang() === 'en' ? 'A rhythm duel! Words of each line fall to the beat. Tap the correct next word exactly when it reaches the glowing line. Keep your hype bar above the rival’s.' : 'Ритм-дуэль! Слова строчки падают в бит. Жми верное следующее слово точно в момент, когда оно доходит до светящейся линии. Держи свою шкалу выше соперника.', function () {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      sched = AC.currentTime; nextBeat = AC.currentTime + 0.1; t0 = AC.currentTime + 1.2;
      loadVerse(); hud(); frame();
    });
  };

  window.QARCADE = ARC;
  window.QARCADE_DATA = { VERSES: VERSES, CMD: CMD, RESPECT: RESPECT, GOODS: GOODS, NEEDS: NEEDS,
    SELLER: ['Сәлеметсіз бе! Келіңіз!', 'Әрине, бал татиды!', 'Рақмет! Тағы келіңіз!', 'Жарайды!', 'Түсіріп беріңізші!', 'Бұл тым қымбат', 'Келістік!', 'Қолма-қол ма, аударым ба?', 'Аударыммен төлеймін', 'Тәтті ме өзі?', 'Жеттік, осы жерде қалдырыңыз'] };

  /* ---------- arcade section at the top of the games tab ---------- */
  var A = window.Q.api;
  window.Q.ext.gamesTop = function () {
    var st = A.state();
    return '<h2 class="arc-h">Аркада · QazaqVerse</h2><div class="arc-grid">' + W.ARCADE.map(function (g) {
      var bestS = (st.arcade || {})[g.id];
      return '<button class="arc-card" data-arc="' + g.id + '" style="--uc:var(--u-' + g.hue + ');--ucd:var(--u-' + g.hue + '-d)">' + W.hero(g.host, 'happy') +
        '<span class="ai">' + g.icon + '</span><b>' + A.esc(g.kk) + '</b><small>' + A.esc(A.tr(g)) + '</small>' + (bestS ? '<i>🏅 ' + bestS + '</i>' : '<i>NEW</i>') + '</button>';
    }).join('') + '</div>';
  };
  window.Q.ext.bindGames = function () {
    A.qsa('[data-arc]').forEach(function (b) { b.onclick = function () { A.sfx.tap(); A.startGame(b.getAttribute('data-arc')); }; });
  };
})();
