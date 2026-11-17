/* Аркады слова (16.11.2026):
 *   rain  — «Жалғау жаңбыры»: падает существительное, ребёнок кидает его в корзину с окончанием множественного числа;
 *   snake — «Сөз жылан»: змейка собирает буквы слова по порядку; рядом лежат «двойники» особых букв (ә ↔ а, қ ↔ к).
 * Логика — web/rain-core.js (QRAIN) и web/snake-core.js (QSNAKE), формы — из grammar-core.js. */
(function () {
  'use strict';
  var W = window.QWORLD, ARC = window.QARCADE, R = window.QRAIN, Z = window.QSNAKE;
  if (!ARC || !R || !Z) return;
  function en(api) { return api.lang() === 'en'; }
  function hearts(n) { return new Array(Math.max(0, n) + 1).join('❤️') + new Array(Math.max(0, 3 - n) + 1).join('🤍'); }
  function introCard(api, host, title, text, go) {
    api.qs('.game').classList.add('neon');
    var ov = document.createElement('div'); ov.className = 'arc-intro';
    ov.innerHTML = W.hero(host, 'wow') + '<h2>' + api.esc(title) + '</h2><p>' + api.esc(text) + '</p><button class="btn gold" id="awgo">Бастау ▶</button>';
    api.qs('#gb').appendChild(ov);
    api.qs('#awgo').onclick = function () { api.sfx.tap(); ov.remove(); go(); };
  }

  /* ---------- «Жалғау жаңбыры» ---------- */
  ARC.rain = function (api) {
    var st = R.START, deck = R.deck(Math.random), k = 0, t = null, over = false, busy = true, raf = 0, t0 = 0, dur = 0, el = null, fieldH = 0;
    api.frame('Жалғау жаңбыры', '<div class="rn" id="rn"><div class="rn-hud" id="rnhud"></div><div class="rn-field" id="rnf"></div><div class="rn-baskets" id="rnb"></div></div>');
    api.onLeave(function () { over = true; cancelAnimationFrame(raf); });
    function hud() { api.stat('🌧 ' + st.score); api.qs('#rnhud').innerHTML = '<span>' + hearts(st.hearts) + '</span><b>' + st.score + '</b><span class="rn-mult' + (st.mult > 1 ? ' on' : '') + '">×' + st.mult + ' · 🔥' + st.streak + '</span>'; }
    function fall(now) {
      if (over || busy) return;
      var p = Math.min(1, (now - t0) / dur);
      el.style.transform = 'translate(-50%,' + Math.round(p * fieldH) + 'px)';
      if (p >= 1) { resolve(null); return; }
      raf = requestAnimationFrame(fall);
    }
    function next() {
      if (over) return;
      if (k >= deck.length) { deck = R.deck(Math.random); k = 0; }
      t = R.task(deck[k++], Math.random); busy = false;
      var f = api.qs('#rnf'); f.innerHTML = '<div class="rn-drop" id="rnd"><span>' + t.word.e + '</span><b>' + api.esc(t.word.kk) + '</b><small>' + api.esc(en(api) ? t.word.en : t.word.ru) + '</small></div>';
      el = api.qs('#rnd'); fieldH = f.clientHeight - el.offsetHeight;
      api.qs('#rnb').innerHTML = t.options.map(function (o) { return '<button class="rn-b" data-o="' + o + '"><i>🧺</i>-' + o + '</button>'; }).join('');
      api.qsa('.rn-b').forEach(function (b) { b.onclick = function () { resolve(b.getAttribute('data-o')); }; });
      if (api.TTS.file(t.word.kk)) api.TTS.speak(t.word.kk, true);
      dur = window.qFast ? 60000 : R.fallMs(st.right); t0 = performance.now(); raf = requestAnimationFrame(fall);
      hud();
    }
    function resolve(o) {
      if (busy || over) return; busy = true; cancelAnimationFrame(raf);
      var ok = o === t.answer; st = R.answer(st, ok);
      el.classList.add(ok ? 'ok' : 'bad');
      el.querySelector('b').innerHTML = api.esc(t.word.kk) + '<em>' + t.answer + '</em>';
      api.qsa('.rn-b').forEach(function (b) { var a = b.getAttribute('data-o'); if (a === t.answer) b.classList.add('right'); else if (a === o) b.classList.add('wrong'); });
      if (ok) { api.sfx.ok(); } else { api.sfx.bad(); api.vibrate(40); }
      hud();
      if (st.hearts <= 0) { setTimeout(end, 1100); return; }
      setTimeout(next, ok ? 450 : 1300);
    }
    function end() {
      if (over) return; over = true;
      api.end({ arcade: true, title: st.right >= 30 ? 'Керемет! Жалғау шебері!' : st.right >= 12 ? 'Жарайсың!' : 'Тағы байқап көр!', score: st.score,
        scoreText: st.score + ' 🌧 · ' + st.right + ' ✓', coins: Math.min(40, Math.floor(st.score / 20)), xp: Math.min(15, Math.floor(st.right / 2)),
        sub: (en(api) ? 'Right: ' : 'Верно: ') + st.right + ' · 🔥×' + st.best });
    }
    if (/[?&]e2e\b/.test(location.search)) window.__rain = function () { return { score: st.score, hearts: st.hearts, right: st.right, streak: st.streak, mult: st.mult, answer: t && t.answer, word: t && t.word.kk, busy: busy, over: over }; };
    introCard(api, 'azhe', '🌧 Жалғау жаңбыры', en(api)
      ? 'Words are falling! Drop each one into the basket with its plural ending: -лар/-лер after a vowel, -дар/-дер after л м н ң ж з, -тар/-тер after a voiceless sound. Three hearts; it gets faster!'
      : 'Слова падают! Отправь каждое в корзину с окончанием множественного числа: -лар/-лер после гласной, -дар/-дер после л м н ң ж з, -тар/-тер после глухой. Три сердечка, скорость растёт!', next);
  };

  /* ---------- «Сөз жылан» ---------- */
  ARC.snake = function (api) {
    var words = Z.shuffle(Z.usable(R.NOUNS), Math.random), wi = 0, s = null, hp = Z.HEARTS, score = 0, done = 0, clean = true, over = false, timer = 0, best = 0, cleanRun = 0, w = null;
    var COLS = 9, ROWS = 11;
    api.frame('Сөз жылан', '<div class="sn" id="sn"><div class="sn-hud" id="snhud"></div><div class="sn-word" id="snw"></div><div class="sn-board" id="snb" style="--c:' + COLS + '"></div>' +
      '<div class="sn-pad"><button data-d="up" aria-label="up">▲</button><button data-d="left" aria-label="left">◀</button><button data-d="down" aria-label="down">▼</button><button data-d="right" aria-label="right">▶</button></div></div>');
    api.onLeave(function () { over = true; clearTimeout(timer); document.removeEventListener('keydown', key); });
    function newWord() {
      if (wi >= words.length) { words = Z.shuffle(Z.usable(R.NOUNS), Math.random); wi = 0; }
      w = words[wi++]; clean = true;
      if (!s) s = Z.start(COLS, ROWS, w.kk, Math.random);
      else { s.word = w.kk; s.progress = 0; s.cells = Z.place(s, w.kk, Math.random); }
      if (api.TTS.file(w.kk)) api.TTS.speak(w.kk, true);
    }
    function draw() {
      api.stat('🐍 ' + score);
      api.qs('#snhud').innerHTML = '<span>' + hearts(hp) + '</span><b>' + score + '</b><span>📝 ' + done + '</span>';
      api.qs('#snw').innerHTML = '<span class="e">' + w.e + '</span><span class="tr">' + api.esc(en(api) ? w.en : w.ru) + '</span><span class="sl">' +
        w.kk.split('').map(function (c, i) { return '<i class="' + (i < s.progress ? 'on' : i === s.progress ? 'next' : '') + '">' + (i < s.progress ? c : '') + '</i>'; }).join('') + '</span>';
      var grid = {}; s.cells.forEach(function (c) { grid[c.x + ',' + c.y] = '<i class="l">' + c.ch + '</i>'; });
      var ch = {}; s.cells.forEach(function (c) { ch[c.x + ',' + c.y] = c.ch; });
      s.snake.forEach(function (p, i) { var k = p.x + ',' + p.y, l = i > 0 && ch[k]; grid[k] = '<i class="' + (i === 0 ? 'hd d-' + s.dir : 'bd') + (l ? ' l' : '') + '">' + (l || '') + '</i>'; });   // a letter under the body stays visible
      var h = ''; for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) h += grid[x + ',' + y] || '<i></i>';
      api.qs('#snb').innerHTML = h;
    }
    function tick() {
      if (over) return;
      var ev = Z.step(s);
      if (ev === 'eat') api.sfx.tap();
      if (ev === 'wrong' || ev === 'bite') { hp--; clean = false; cleanRun = 0; api.sfx.bad(); api.vibrate(40); api.qs('#snb').classList.add('hurt'); setTimeout(function () { var b = api.qs('#snb'); if (b) b.classList.remove('hurt'); }, 300); }
      if (ev === 'word') {
        score += Z.wordPoints(w.kk, clean); done++; api.sfx.ok(); cleanRun = clean ? cleanRun + 1 : 0; best = Math.max(best, cleanRun);
        api.qs('#snb').classList.add('win'); setTimeout(function () { var b = api.qs('#snb'); if (b) b.classList.remove('win'); }, 400);
        newWord();
      }
      draw();
      if (hp <= 0) { over = true; setTimeout(end, 700); return; }
      timer = setTimeout(tick, window.qSlowSnake ? 100000 : Z.tickMs(done));
    }
    function turn(d) { if (s) Z.turn(s, d); }
    function key(e) { var m = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[e.key]; if (m) { e.preventDefault(); turn(m); } }
    function end() {
      api.end({ arcade: true, title: done >= 8 ? 'Керемет! Сөз шебері!' : done >= 3 ? 'Жарайсың!' : 'Тағы байқап көр!', score: score,
        scoreText: score + ' 🐍 · ' + done + ' ' + (en(api) ? 'words' : 'слов'), coins: Math.min(40, Math.floor(score / 25)), xp: Math.min(15, done * 2),
        sub: (en(api) ? 'Words without a mistake in a row: ' : 'Слов без ошибок подряд: ') + best });
    }
    api.qsa('.sn-pad button').forEach(function (b) { b.onclick = function () { turn(b.getAttribute('data-d')); }; });
    document.addEventListener('keydown', key);
    var sx = 0, sy = 0, board = api.qs('#snb');
    board.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    board.addEventListener('touchend', function (e) { var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return; turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')); }, { passive: true });
    if (/[?&]e2e\b/.test(location.search)) window.__snake = function (manual) { if (manual === 'tick') { clearTimeout(timer); tick(); } return { head: s && s.snake[0], dir: s && s.dir, len: s && s.snake.length, cells: s && s.cells, word: s && s.word, progress: s && s.progress, hp: hp, score: score, done: done, over: over }; };
    introCard(api, 'tayson', '🐍 Сөз жылан', en(api)
      ? 'Eat the letters of the word in order. Careful: there are look-alike letters (ә and а, қ and к, ү and у…). Swipe or use the arrows; the walls let you through.'
      : 'Собери буквы слова по порядку. Осторожно: рядом буквы-двойники (ә и а, қ и к, ү и у…). Свайп или стрелки; через стены можно проходить.', function () { newWord(); draw(); timer = setTimeout(tick, 700); });
  };
})();
