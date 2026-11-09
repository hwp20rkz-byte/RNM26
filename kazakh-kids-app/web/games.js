/* Мини-игры. Каждая получает api от app.js и в конце вызывает api.end({score, coins, ...}). */
(function () {
  'use strict';

  // Words that make a clear picture card (no generic «?» icons, unique pictures).
  function pictureWords(api, n) {
    var bad = ['❓', '❔'];
    var pool = api.words.filter(function (w) { return bad.indexOf(w.e) < 0; });
    if (pool.length < n) pool = pool.concat(api.allWords.filter(function (w) { return bad.indexOf(w.e) < 0; }));
    pool = api.uniqBy(api.uniqBy(api.uniqBy(api.shuffle(pool), function (w) { return w.e; }), function (w) { return w.kk; }), function (w) { return w.ru; });
    return pool.slice(0, n);
  }
  function others(api, w, pool, n) {
    return api.shuffle(pool.filter(function (x) { return x.kk !== w.kk && x.ru !== w.ru && x.e !== w.e; })).slice(0, n);
  }
  function timer(api, secs, onTick, onEnd) {
    var left = secs, id = setInterval(function () {
      left--; onTick(left);
      if (left <= 0) { clearInterval(id); onEnd(); }
    }, 1000);
    onTick(left);
    return { stop: function () { clearInterval(id); }, add: function (d) { left = Math.max(0, left + d); onTick(left); } };
  }

  var GAMES = {};

  /* ⚡ Кім жылдам? — 10 вопросов, на каждый 10 секунд */
  GAMES.quiz = function (api) {
    var pool = pictureWords(api, 30), qn = 0, score = 0, t = null, locked = false;
    var body = api.frame('Кім жылдам?', '<div class="qbar"><i id="qt"></i></div><div id="qq"></div>');
    api.onLeave(function () { clearTimeout(t); });
    function round() {
      if (qn >= 10) return api.end({ score: score, scoreText: score + ' / 10', coins: score * 2 + (score === 10 ? 10 : 0), title: score >= 8 ? 'Чемпион!' : 'Жарайсың!', sub: 'Правильных ответов: ' + score + ' из 10' });
      qn++; locked = false;
      var w = pool[(qn - 1) % pool.length], mode = qn % 2;
      var opts = api.shuffle([w].concat(others(api, w, pool, 3)));
      api.stat(qn + '/10 · ⭐ ' + score);
      api.qs('#qq').innerHTML = mode
        ? '<div class="g-word">' + api.esc(w.kk) + '</div><p class="muted center">Что это значит?</p><div class="cards">' + opts.map(function (o, i) { return '<button class="card" data-i="' + i + '">' + api.glyph(o.e) + '<span>' + api.esc(o.ru) + '</span></button>'; }).join('') + '</div>'
        : '<div class="g-pic">' + api.glyph(w.e) + '<span>' + api.esc(w.ru) + '</span></div><p class="muted center">Как по-казахски?</p><div class="cards list">' + opts.map(function (o, i) { return '<button class="card" data-i="' + i + '">' + api.esc(o.kk) + '</button>'; }).join('') + '</div>';
      if (mode) api.TTS.speak(w.kk, true);
      var bar = api.qs('#qt'); bar.style.transition = 'none'; bar.style.transform = 'scaleX(1)';
      setTimeout(function () { bar.style.transition = 'transform 10s linear'; bar.style.transform = 'scaleX(0)'; }, 30);
      clearTimeout(t); t = setTimeout(function () { answer(-1); }, 10000);
      api.qsa('#qq .card').forEach(function (c) { c.onclick = function () { answer(+c.getAttribute('data-i')); }; });
      function answer(i) {
        if (locked) return; locked = true; clearTimeout(t);
        var right = opts.indexOf(w);
        api.qsa('#qq .card').forEach(function (c) { var k = +c.getAttribute('data-i'); if (k === right) c.classList.add('right'); else if (k === i) c.classList.add('wrong'); });
        if (i === right) { score++; api.sfx.ok(); } else api.sfx.bad();
        if (!mode) api.TTS.speak(w.kk, true);
        setTimeout(round, 900);
      }
    }
    round();
  };

  /* 🃏 Жұбын тап — карточки-пары «картинка ↔ слово» */
  GAMES.memory = function (api) {
    var ws = pictureWords(api, 6), moves = 0, found = 0, open = [], busy = false;
    var cards = api.shuffle(ws.map(function (w, i) { return { k: i, face: api.glyph(w.e), w: w }; }).concat(ws.map(function (w, i) { return { k: i, face: '<span class="mw">' + api.esc(w.kk) + '</span>', w: w, word: true }; })));
    var body = api.frame('Жұбын тап', '<p class="muted center">Найди пары: картинка и казахское слово</p><div class="mem">' + cards.map(function (c, i) {
      return '<button class="mcard" data-c="' + i + '" data-k="' + c.k + '"><span class="back">?</span><span class="front">' + c.face + '</span></button>';
    }).join('') + '</div>');
    api.stat('Ходы: 0');
    api.qsa('.mcard', body).forEach(function (b) {
      b.onclick = function () {
        var i = +b.getAttribute('data-c'), c = cards[i];
        if (busy || b.classList.contains('up')) return;
        b.classList.add('up'); api.sfx.tap(); if (c.word) api.TTS.speak(c.w.kk, true);
        open.push(b);
        if (open.length < 2) return;
        moves++; api.stat('Ходы: ' + moves);
        var a = cards[+open[0].getAttribute('data-c')], d = cards[+open[1].getAttribute('data-c')];
        if (a.k === d.k) {
          open.forEach(function (x) { x.classList.add('done'); }); open = []; found++; api.sfx.pair();
          if (found === ws.length) setTimeout(function () {
            api.end({ score: moves, scoreText: moves + ' ходов', coins: moves <= 8 ? 15 : moves <= 12 ? 10 : 5, title: 'Барлық жұп табылды!', sub: 'Все пары найдены за ' + moves + ' ходов' });
          }, 700);
        } else {
          busy = true; api.sfx.bad();
          setTimeout(function () { open.forEach(function (x) { x.classList.remove('up'); }); open = []; busy = false; }, 850);
        }
      };
    });
  };

  /* 📇 Карточкалар — учим слова: переверни, послушай, отметь */
  GAMES.cards = function (api) {
    var deck = pictureWords(api, 10), known = 0, total = deck.length;
    var body = api.frame('Карточкалар', '<div id="fc"></div>');
    function show() {
      api.stat('Выучено: ' + known + '/' + total);
      if (!deck.length) return api.end({ score: total, scoreText: total + ' слов', coins: 8, title: 'Барлығын білесің!', sub: 'Ты повторил ' + total + ' слов' });
      var w = deck[0];
      api.qs('#fc').innerHTML = '<button class="flash" id="flip"><span class="f1">' + api.glyph(w.e) + '<b>' + api.esc(w.kk) + '</b><span class="muted">Нажми, чтобы перевернуть</span></span><span class="f2"><b>' + api.esc(w.ru) + '</b><span class="muted">' + api.esc(w.kk) + '</span></span></button>' +
        '<div class="fc-btns"><button class="btn ghost" id="again">↻ Тағы · ещё</button><button class="btn ok" id="know">✓ Білемін · знаю</button></div>';
      api.TTS.speak(w.kk, true);
      api.qs('#flip').onclick = function () { api.sfx.tap(); api.qs('#flip').classList.toggle('flipped'); api.TTS.speak(w.kk, true); };
      api.qs('#know').onclick = function () { api.sfx.ok(); known++; deck.shift(); show(); };
      api.qs('#again').onclick = function () { api.sfx.tap(); deck.push(deck.shift()); show(); };
    }
    show();
  };

  /* 🎈 Шарлар — лопни шарик с правильным словом (45 секунд, 3 жизни) */
  GAMES.balloons = function (api) {
    var pool = pictureWords(api, 24), score = 0, lives = 3, T = null, over = false, w = null;
    var colors = ['hsl(356 85% 60%)', 'hsl(199 84% 50%)', 'hsl(43 100% 52%)', 'hsl(146 62% 44%)', 'hsl(268 70% 62%)'];
    var body = api.frame('Шарлар', '<div class="b-target" id="bt"></div><div class="sky" id="sky"></div>');
    var leftNow = 45;
    function hud(left) { if (left != null) leftNow = left; api.stat('⏱ ' + leftNow + ' · ⭐ ' + score + ' · ' + '❤️'.repeat(Math.max(0, lives))); }
    T = timer(api, 45, hud, finish);
    api.onLeave(function () { over = true; T.stop(); });
    function finish() {
      if (over) return; over = true; T.stop();
      api.end({ score: score, scoreText: score + ' ⭐', coins: score, title: score >= 10 ? 'Тамаша!' : 'Жарайсың!', sub: 'Лопнуто правильных шариков: ' + score });
    }
    function round() {
      if (over) return;
      w = pool[api.rnd(pool.length)];
      var opts = api.shuffle([w].concat(others(api, w, pool, 2)));
      api.qs('#bt').innerHTML = api.glyph(w.e) + '<b>' + api.esc(w.ru) + '</b>';
      var lanes = api.shuffle([8, 38, 68]);
      api.qs('#sky').innerHTML = opts.map(function (o, i) {
        return '<button class="balloon" data-ok="' + (o === w ? 1 : 0) + '" style="left:' + lanes[i] + '%;--bc:' + colors[api.rnd(colors.length)] + ';animation-duration:' + (6 + Math.random() * 1.5).toFixed(2) + 's;animation-delay:' + (i * 0.25).toFixed(2) + 's"><span>' + api.esc(o.kk) + '</span></button>';
      }).join('');
      api.qsa('.balloon', body).forEach(function (b) {
        b.onclick = function () {
          if (over || b.classList.contains('popped')) return;
          if (b.getAttribute('data-ok') === '1') {
            score++; api.sfx.pop(); b.classList.add('popped'); api.TTS.speak(w.kk, true); hud();
            setTimeout(round, 350);
          } else { api.sfx.bad(); b.classList.add('shake'); lose(); }
        };
        b.addEventListener('animationend', function (e) {
          if (e.animationName === 'rise' && b.getAttribute('data-ok') === '1' && !b.classList.contains('popped') && !over) { lose(); round(); }
        });
      });
    }
    function lose() { lives--; hud(); if (lives <= 0) finish(); }
    round();
  };

  /* 🔤 Әріп аулау — вставь особую казахскую букву */
  var LOOK = { 'ә': ['а', 'е'], 'ғ': ['г', 'х'], 'қ': ['к', 'х'], 'ң': ['н', 'г'], 'ө': ['о', 'е'], 'ұ': ['у', 'ү'], 'ү': ['у', 'ұ'], 'һ': ['х', 'к'], 'і': ['и', 'ы'] };
  GAMES.letters = function (api) {
    var re = /[әғқңөұүһі]/;
    var pool = api.uniqBy(api.shuffle(api.words.concat(api.allWords).filter(function (w) { return re.test(w.kk) && w.kk.length <= 12 && w.e !== '❓'; })), function (w) { return w.kk; });
    var qn = 0, score = 0;
    api.frame('Әріп аулау', '<div id="lq"></div>');
    function round() {
      if (qn >= 10) return api.end({ score: score, scoreText: score + ' / 10', coins: score + (score === 10 ? 5 : 0), title: 'Әріптерді білесің!', sub: 'Ты знаешь казахские буквы: ' + score + ' из 10' });
      qn++;
      var w = pool[(qn - 1) % pool.length], idx = [];
      for (var i = 0; i < w.kk.length; i++) if (re.test(w.kk[i])) idx.push(i);
      var p = idx[api.rnd(idx.length)], ch = w.kk[p];
      var opts = api.shuffle([ch].concat(LOOK[ch]));
      api.stat(qn + '/10 · ⭐ ' + score);
      api.qs('#lq').innerHTML = '<div class="g-pic">' + api.glyph(w.e) + '<span>' + api.esc(w.ru) + '</span></div>' +
        '<div class="g-word letters">' + api.esc(w.kk.slice(0, p)) + '<span class="gap">?</span>' + api.esc(w.kk.slice(p + 1)) + '</div>' +
        '<div class="chips big">' + opts.map(function (o, i) { return '<button class="card" data-i="' + i + '">' + o + '</button>'; }).join('') + '</div>';
      api.qsa('#lq .card').forEach(function (c) {
        c.onclick = function () {
          var k = +c.getAttribute('data-i'), ok = opts[k] === ch;
          api.qsa('#lq .card').forEach(function (x) { x.onclick = null; if (opts[+x.getAttribute('data-i')] === ch) x.classList.add('right'); else if (x === c) x.classList.add('wrong'); });
          api.qs('#lq .gap').textContent = ch;
          if (ok) { score++; api.sfx.ok(); } else api.sfx.bad();
          api.TTS.speak(w.kk, true);
          setTimeout(round, 1100);
        };
      });
    }
    round();
  };

  /* ✅ Дұрыс па? — картинка и слово совпадают? 40 секунд */
  GAMES.truefalse = function (api) {
    var pool = pictureWords(api, 30), score = 0, T = null, over = false, cur = null;
    api.frame('Дұрыс па?', '<div id="tf"></div><div class="fc-btns"><button class="btn bad" id="no">❌ Бұрыс</button><button class="btn ok" id="yes">✅ Дұрыс</button></div>');
    function hud(left) { api.stat('⏱ ' + left + ' · ⭐ ' + score); }
    T = timer(api, 40, hud, finish);
    api.onLeave(function () { over = true; T.stop(); });
    function finish() {
      if (over) return; over = true; T.stop();
      api.end({ score: score, scoreText: score + ' ⭐', coins: Math.ceil(score / 2), title: 'Уақыт бітті!', sub: 'Время вышло! Верных ответов: ' + score });
    }
    function round() {
      var w = pool[api.rnd(pool.length)], truth = Math.random() < 0.5;
      var shown = truth ? w : others(api, w, pool, 1)[0] || w;
      cur = { truth: shown === w };
      api.qs('#tf').innerHTML = '<div class="g-pic tf">' + api.glyph(w.e) + '</div><div class="g-word">' + api.esc(shown.kk) + '</div>';
    }
    function answer(yes) {
      if (over) return;
      if (yes === cur.truth) { score++; api.sfx.ok(); } else { api.sfx.bad(); T.add(-3); api.qs('#tf').classList.add('shake'); setTimeout(function () { var e = api.qs('#tf'); if (e) e.classList.remove('shake'); }, 350); }
      round();
    }
    api.qs('#yes').onclick = function () { answer(true); };
    api.qs('#no').onclick = function () { answer(false); };
    round();
  };

  window.QGAMES = GAMES;
})();
