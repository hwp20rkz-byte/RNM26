/* Тематические игры для закрепления уроков учебника (данные — QDATA.TOPIC_GAMES в textbook.js).
 * Четыре движка: sort (разложи по корзинам), pairs (соедини пары), seq (расставь по порядку),
 * clock (выставь стрелки по казахской фразе). Каждая игра регистрируется в QGAMES под своим id. */
(function () {
  'use strict';
  var D = window.QDATA, CFG = D.TOPIC_GAMES || {};
  window.QGAMES = window.QGAMES || {};

  function T(api, o) { return api.tr(o) || o.kk; }
  function done(api, id, cfg, score, total, extra) {
    var pct = total ? Math.round(score / total * 100) : 0;
    var st = api.S; st.topic = st.topic || {};
    st.topic[id] = Math.max(st.topic[id] || 0, pct);
    api.end(Object.assign({
      score: score, scoreText: score + ' / ' + total, coins: Math.round(score * 1.5) + (pct === 100 ? 5 : 0), xp: Math.min(12, score),
      title: pct === 100 ? 'Керемет! Мінсіз!' : pct >= 70 ? 'Жарайсың!' : 'Тағы жаттық!',
      sub: (api.lang() === 'en' ? 'First-try answers: ' : 'С первой попытки: ') + pct + '%', topic: true
    }, extra || {}));
  }

  /* ---------------- sort ---------------- */
  function sortGame(id, cfg, api) {
    var items = api.shuffle(cfg.items), i = 0, score = 0, missed = false, busy = false;
    var body = api.frame(cfg.kk, '<p class="muted center tg-task">' + api.esc(api.lang() === 'en' ? 'Put each one in the right basket' : 'Разложи по корзинам') + '</p>' +
      '<div class="tg-card" id="tgc"></div><div class="tg-bins b' + cfg.bins.length + '" id="tgb">' + cfg.bins.map(function (b) {
        return '<button class="tg-bin" data-bin="' + b.id + '"><span class="e">' + api.esc(b.e) + '</span><b>' + api.esc(b.kk) + '</b><i class="cnt">0</i></button>';
      }).join('') + '</div>');
    var counts = {};
    function show() {
      if (i >= items.length) return done(api, id, cfg, score, items.length);
      var x = items[i]; missed = false; busy = false;
      api.stat((i + 1) + '/' + items.length + ' · ⭐ ' + score);
      api.qs('#tgc').innerHTML = '<span class="tg-e' + (cfg.wide ? ' small' : '') + '">' + api.esc(x.e) + '</span><b class="tg-w' + (cfg.wide ? ' wide' : '') + '">' + api.esc(x.kk) + '</b><small>' + api.esc(T(api, x)) + '</small>';
      api.qs('#tgc').className = 'tg-card pop';
      api.TTS.speak(x.kk, true);
    }
    api.qsa('[data-bin]', body).forEach(function (b) {
      b.onclick = function () {
        if (busy || i >= items.length) return;
        var x = items[i];
        if (b.getAttribute('data-bin') === x.bin) {
          busy = true;
          if (!missed) score++;
          counts[x.bin] = (counts[x.bin] || 0) + 1; b.querySelector('.cnt').textContent = counts[x.bin];
          b.classList.add('right'); api.sfx.ok();
          if (cfg.plural && cfg.plural[x.kk]) { api.qs('#tgc').querySelector('.tg-w').textContent = cfg.plural[x.kk]; api.TTS.speak(cfg.plural[x.kk], true); }
          api.qs('#tgc').className = 'tg-card fly';
          setTimeout(function () { b.classList.remove('right'); i++; show(); }, cfg.plural ? 900 : 550);
        } else {
          missed = true; api.sfx.bad(); api.vibrate(40);
          b.classList.add('wrong', 'shake');
          var good = api.qs('[data-bin="' + x.bin + '"]', body); good.classList.add('hint');
          setTimeout(function () { b.classList.remove('wrong', 'shake'); good.classList.remove('hint'); }, 700);
        }
      };
    });
    show();
  }

  /* ---------------- pairs ---------------- */
  function pairsGame(id, cfg, api) {
    var P = cfg.pairs, L = api.shuffle(P.map(function (p, k) { return k; })), R = api.shuffle(P.map(function (p, k) { return k; }));
    var selL = null, selR = null, left = P.length, score = P.length, missedK = {};
    var body = api.frame(cfg.kk, '<p class="muted center tg-task">' + api.esc(api.lang() === 'en' ? 'Match the pairs' : 'Соедини пары') + '</p><div class="tg-pairs">' +
      L.map(function (k, r) { var p = P[k]; return '<button class="tg-p" data-side="L" data-k="' + k + '" style="grid-column:1;grid-row:' + (r + 1) + '"><span class="e">' + api.esc(p.ae) + '</span>' + (cfg.iconsLeft ? '' : '<b>' + api.esc(p.a) + '</b>') + '</button>'; }).join('') +
      R.map(function (k, r) { var p = P[k]; return '<button class="tg-p" data-side="R" data-k="' + k + '" style="grid-column:2;grid-row:' + (r + 1) + '"><b>' + api.esc(p.b) + '</b></button>'; }).join('') + '</div>');
    api.stat('0/' + P.length);
    function check() {
      if (selL == null || selR == null) return;
      var a = api.qs('.tg-p[data-side=L][data-k="' + selL + '"]', body), b = api.qs('.tg-p[data-side=R][data-k="' + selR + '"]', body);
      if (selL === selR) {
        var p = P[selL]; a.className = b.className = 'tg-p done'; api.sfx.pair();
        api.TTS.speak(cfg.say ? cfg.say(p) : p.a + ' ' + p.b, true);
        left--; api.stat((P.length - left) + '/' + P.length);
        if (!left) setTimeout(function () { done(api, id, cfg, score, P.length); }, 1300);
      } else {
        if (!missedK[selL]) { missedK[selL] = 1; score--; }
        api.sfx.bad(); a.classList.add('wrong', 'shake'); b.classList.add('wrong', 'shake');
        setTimeout(function () { a.classList.remove('wrong', 'shake', 'sel'); b.classList.remove('wrong', 'shake', 'sel'); }, 500);
      }
      selL = selR = null;
    }
    api.qsa('.tg-p', body).forEach(function (btn) {
      btn.onclick = function () {
        if (btn.classList.contains('done')) return;
        var side = btn.getAttribute('data-side'), k = +btn.getAttribute('data-k');
        api.qsa('.tg-p[data-side=' + side + ']', body).forEach(function (x) { x.classList.toggle('sel', x === btn); });
        api.sfx.tap();
        if (side === 'L') { selL = k; if (!cfg.iconsLeft) api.TTS.speak(P[k].a, true); } else { selR = k; api.TTS.speak(P[k].b, true); }
        check();
      };
    });
  }

  /* ---------------- seq ---------------- */
  function seqGame(id, cfg, api) {
    var all = cfg.items, n = cfg.chunk || all.length, rounds = [], score = 0, total = all.length;
    for (var s = 0; s < all.length; s += n) rounds.push(all.slice(s, s + n));
    var r = 0;
    api.frame(cfg.kk, '<p class="muted center tg-task">' + api.esc(api.lang() === 'en' ? 'Put them in order' : 'Расставь по порядку') + '</p><div class="tg-slots" id="tgs"></div><div class="tg-bank" id="tgk"></div>');
    function round() {
      if (r >= rounds.length) return done(api, id, cfg, score, total);
      var items = rounds[r], bank = api.shuffle(items.map(function (x, k) { return k; })), pos = 0, missed = {};
      api.qs('#tgs').innerHTML = items.map(function (x, k) { return '<div class="tg-slot"><span class="t">' + api.esc(x[0]) + '</span><span class="v" data-s="' + k + '"></span></div>'; }).join('');
      api.qs('#tgk').innerHTML = bank.map(function (k) { return '<button class="tile" data-b="' + k + '"><span>' + api.esc(items[k][2]) + '</span> ' + api.esc(items[k][1]) + '</button>'; }).join('');
      api.stat((r + 1) + '/' + rounds.length + ' · ⭐ ' + score);
      api.qsa('#tgk [data-b]').forEach(function (b) {
        b.onclick = function () {
          var k = +b.getAttribute('data-b');
          if (k === pos) {
            if (!missed[k]) score++;
            api.sfx.ok(); b.classList.add('ghost');
            var v = api.qs('[data-s="' + k + '"]'); v.textContent = items[k][2] + ' ' + items[k][1]; v.parentNode.classList.add('filled');
            api.TTS.speak(items[k][1], true);
            pos++; api.stat((r + 1) + '/' + rounds.length + ' · ⭐ ' + score);
            if (pos >= items.length) { r++; setTimeout(round, 900); }
          } else { missed[pos] = 1; api.sfx.bad(); b.classList.add('shake'); setTimeout(function () { b.classList.remove('shake'); }, 350); }
        };
      });
    }
    round();
  }

  /* ---------------- clock ---------------- */
  var CLOCK_MIN = [0, 10, 15, 20, 30, 40, 45, 50];
  function clockFace(h, m) {
    var t = '';
    for (var i = 1; i <= 12; i++) { var a = i * Math.PI / 6; t += '<text x="' + (50 + 33 * Math.sin(a)).toFixed(1) + '" y="' + (54 - 33 * Math.cos(a)).toFixed(1) + '" text-anchor="middle" font-size="11" font-weight="900" fill="hsl(218 30% 18%)">' + i + '</text>'; }
    for (var k = 0; k < 60; k++) { var b = k * Math.PI / 30, r1 = k % 5 ? 43 : 41; t += '<line x1="' + (50 + r1 * Math.sin(b)).toFixed(1) + '" y1="' + (50 - r1 * Math.cos(b)).toFixed(1) + '" x2="' + (50 + 45 * Math.sin(b)).toFixed(1) + '" y2="' + (50 - 45 * Math.cos(b)).toFixed(1) + '" stroke="hsl(214 14% 62%)" stroke-width="' + (k % 5 ? 0.8 : 2) + '"/>'; }
    return '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="hsl(46 100% 90%)" stroke="hsl(38 95% 45%)" stroke-width="4"/><circle cx="50" cy="50" r="43" fill="#fff"/>' + t +
      '<line x1="50" y1="50" x2="50" y2="27" stroke="hsl(218 30% 18%)" stroke-width="6" stroke-linecap="round" transform="rotate(' + (((h % 12) + m / 60) * 30) + ' 50 50)"/>' +
      '<line x1="50" y1="50" x2="50" y2="14" stroke="hsl(356 85% 60%)" stroke-width="3.5" stroke-linecap="round" transform="rotate(' + (m * 6) + ' 50 50)"/><circle cx="50" cy="50" r="4.5" fill="hsl(218 30% 18%)"/></svg>';
  }
  function clockGame(id, cfg, api) {
    var rounds = [], seen = {};
    while (rounds.length < 8) {
      var h = 1 + api.rnd(12), m = rounds.length < 2 ? 0 : CLOCK_MIN[api.rnd(CLOCK_MIN.length)], key = h + ':' + m;
      if (!seen[key]) { seen[key] = 1; rounds.push([h, m]); }
    }
    var r = 0, score = 0, ch = 12, cm = 0, tries = 0;
    var body = api.frame(cfg.kk, '<div class="tg-phrase" id="tgph"></div><div class="tg-clock" id="tgcl"></div>' +
      '<div class="tg-ctrl"><div><small>' + api.esc(api.lang() === 'en' ? 'Hour' : 'Час') + '</small><button class="btn ghost" data-c="h-">−</button><button class="btn ghost" data-c="h+">+</button></div>' +
      '<div><small>' + api.esc(api.lang() === 'en' ? 'Minutes' : 'Минуты') + '</small><button class="btn ghost" data-c="m-">−</button><button class="btn ghost" data-c="m+">+</button></div></div>' +
      '<button class="btn ok" id="tgok">Тексеру</button>');
    function draw() { api.qs('#tgcl').innerHTML = clockFace(ch, cm) + '<b class="tg-digital">' + ch + ':' + ('0' + cm).slice(-2) + '</b>'; }
    function show() {
      if (r >= rounds.length) return done(api, id, cfg, score, rounds.length);
      var t = rounds[r], ph = D.clockPhrase(t[0], t[1]); tries = 0;
      api.qs('#tgph').innerHTML = '<button class="spk sm" id="tgsay">🔊</button><b>' + api.esc(ph) + '</b>';
      api.qs('#tgsay').onclick = function () { api.TTS.speak(ph); };
      api.TTS.speak(ph, true);
      api.stat((r + 1) + '/' + rounds.length + ' · ⭐ ' + score);
      draw();
    }
    api.qsa('[data-c]', body).forEach(function (b) {
      b.onclick = function () {
        var c = b.getAttribute('data-c'); api.sfx.tap();
        if (c === 'h+') ch = ch % 12 + 1; else if (c === 'h-') ch = (ch + 10) % 12 + 1;
        else if (c === 'm+') cm = (cm + 5) % 60; else cm = (cm + 55) % 60;
        draw();
      };
    });
    api.qs('#tgok').onclick = function () {
      var t = rounds[r];
      if (ch === t[0] && cm === t[1]) {
        if (!tries) score++;
        api.sfx.ok(); api.qs('#tgcl').classList.add('ok-glow');
        setTimeout(function () { api.qs('#tgcl').classList.remove('ok-glow'); r++; show(); }, 700);
      } else {
        tries++; api.sfx.bad(); api.qs('#tgcl').classList.add('shake');
        setTimeout(function () { api.qs('#tgcl').classList.remove('shake'); }, 400);
        if (tries >= 3) { ch = t[0]; cm = t[1]; draw(); api.toast(api.lang() === 'en' ? 'Look: this is the right time' : 'Смотри: вот правильное время'); setTimeout(function () { r++; show(); }, 1600); }
      }
    };
    show();
  }

  var ENGINE = { sort: sortGame, pairs: pairsGame, seq: seqGame, clock: clockGame };
  Object.keys(CFG).forEach(function (id) {
    window.QGAMES[id] = function (api) { ENGINE[CFG[id].type](id, CFG[id], api); };
  });
  window.QTOPIC = { CFG: CFG, CLOCK_MIN: CLOCK_MIN, clockFace: clockFace };
})();
