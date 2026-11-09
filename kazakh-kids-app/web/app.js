/* Қазақша Ойна — детская игра для изучения казахского языка.
 * Чистый JS без зависимостей: работает офлайн внутри Android WebView и в любом браузере. */
(function () {
  'use strict';

  var D = window.QDATA;
  var $app = document.getElementById('app');
  var KEY = 'qazaqsha-oyna-v1';
  var DAILY_GOAL = 30;
  var HEARTS = 5;
  var HOURS_RU_V = ['', 'в час', 'в два', 'в три', 'в четыре', 'в пять', 'в шесть', 'в семь', 'в восемь', 'в девять', 'в десять', 'в одиннадцать', 'в двенадцать'];
  var PRONOUNS = ['мен', 'сен', 'ол', 'сіз', 'біз', 'олар'];
  var LOC_VERBS = [
    { kk: 'тұрамын', ru: 'Я встаю' }, { kk: 'мектепке барамын', ru: 'Я иду в школу' },
    { kk: 'ұйықтаймын', ru: 'Я ложусь спать' }, { kk: 'түскі ас ішемін', ru: 'Я обедаю' },
    { kk: 'шахмат ойнаймын', ru: 'Я играю в шахматы' }, { kk: 'үйге келемін', ru: 'Я прихожу домой' }
  ];

  /* ---------- helpers ---------- */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function uniqBy(a, f) { var seen = {}; return a.filter(function (x) { var k = f(x); if (seen[k]) return false; seen[k] = 1; return true; }); }
  function norm(s) { return String(s).toLowerCase().replace(/[.,!?;:«»"—–-]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function tokens(s) { return s.replace(/[.,!?;:«»"]/g, '').split(/\s+/).filter(Boolean); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function qs(sel, el) { return (el || document).querySelector(sel); }
  function qsa(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function dayStr(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function today() { return dayStr(new Date()); }
  function yesterday() { var d = new Date(); d.setDate(d.getDate() - 1); return dayStr(d); }
  function isNumGlyph(e) { return /^[0-9₸½]/.test(e); }

  /* ---------- state ---------- */
  function load() {
    var d = { xp: 0, streak: 0, lastDay: '', done: {}, name: '', dayXp: 0, dayDate: '', sound: true, lessons: 0 };
    try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) for (var k in s) d[k] = s[k]; } catch (e) { /* storage blocked */ }
    if (d.lastDay && d.lastDay !== today() && d.lastDay !== yesterday()) d.streak = 0;
    if (d.dayDate !== today()) { d.dayXp = 0; d.dayDate = today(); }
    return d;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }
  var S = load();

  var ALL = [];
  D.UNITS.forEach(function (u, ui) { u.n = ui + 1; u.lessons.forEach(function (l) { l.unit = u; ALL.push(l); }); });
  var CONTENT = ALL.filter(function (l) { return !l.review; });
  var ALLWORDS = uniqBy([].concat.apply([], CONTENT.map(function (l) { return l.words || []; })), function (w) { return w.kk; });
  var ALLSENT = [].concat.apply([], CONTENT.map(function (l) { return l.sentences || []; }));
  function unlocked(l) { var i = ALL.indexOf(l); return i === 0 || !!S.done[ALL[i - 1].id]; }
  function currentLesson() { for (var i = 0; i < ALL.length; i++) if (!S.done[ALL[i].id]) return ALL[i]; return null; }

  /* ---------- sound effects (WebAudio, no files) ---------- */
  var AC = null;
  function tone(notes, dur, type, gain) {
    if (!S.sound) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === 'suspended') AC.resume();
      var t = AC.currentTime;
      notes.forEach(function (f, i) {
        var o = AC.createOscillator(), g = AC.createGain();
        o.type = type || 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + i * dur);
        g.gain.exponentialRampToValueAtTime(gain || 0.25, t + i * dur + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + (i + 1) * dur + 0.12);
        o.connect(g); g.connect(AC.destination);
        o.start(t + i * dur); o.stop(t + (i + 1) * dur + 0.15);
      });
    } catch (e) { /* no audio */ }
  }
  var sfx = {
    tap: function () { tone([520], 0.04, 'triangle', 0.12); },
    ok: function () { tone([660, 880], 0.09, 'sine', 0.3); },
    bad: function () { tone([240, 190], 0.12, 'triangle', 0.3); },
    win: function () { tone([523, 659, 784, 1047, 1319], 0.11, 'sine', 0.3); },
    pair: function () { tone([784], 0.07, 'sine', 0.22); }
  };

  /* ---------- Kazakh text-to-speech (Android bridge → Web Speech fallback) ---------- */
  var TTS = {
    state: function () {
      try { if (window.Android && window.Android.ttsState) return window.Android.ttsState(); } catch (e) { /* bridge missing */ }
      try {
        if (window.speechSynthesis && speechSynthesis.getVoices().some(function (v) { return /^kk/i.test(v.lang); })) return 'kk';
      } catch (e) { /* no speech */ }
      return 'nokk';
    },
    ok: function () { return TTS.state() === 'kk'; },
    speak: function (text, quiet) {
      if (!TTS.ok()) { if (!quiet) toast('🔇 На телефоне нет казахского голоса. Его можно установить: профиль → «Настроить озвучку».'); return; }
      try {
        if (window.Android && window.Android.speak) { window.Android.speak(text); return; }
        var u = new SpeechSynthesisUtterance(text);
        var v = speechSynthesis.getVoices().filter(function (x) { return /^kk/i.test(x.lang); })[0];
        if (v) u.voice = v; u.lang = 'kk-KZ'; u.rate = 0.85;
        speechSynthesis.cancel(); speechSynthesis.speak(u);
      } catch (e) { /* ignore */ }
    }
  };
  if (window.speechSynthesis) try { speechSynthesis.getVoices(); } catch (e) { /* ignore */ }

  var toastT;
  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 2600);
  }

  /* ---------- mascot: Барыс, a snow-leopard cub in a тақия ---------- */
  function mascot(mood, cls) {
    mood = mood || 'happy';
    var mouth = mood === 'sad'
      ? '<path d="M50 88 Q60 80 70 88" fill="none" stroke="#5b4a52" stroke-width="3.5" stroke-linecap="round"/>'
      : mood === 'wow'
        ? '<ellipse cx="60" cy="88" rx="7" ry="8" fill="#7a3446"/><ellipse cx="60" cy="91" rx="4" ry="3.5" fill="#ff8fa3"/>'
        : '<path d="M48 82 Q54 92 60 84 Q66 92 72 82" fill="#7a3446" stroke="#5b4a52" stroke-width="3" stroke-linejoin="round"/><path d="M53 86 Q60 92 67 86" fill="#ff8fa3"/>';
    var brows = mood === 'sad' ? '<path d="M36 50 L48 54 M84 50 L72 54" stroke="#5b4a52" stroke-width="3" stroke-linecap="round"/>' : '';
    return '<svg class="m ' + (cls || '') + '" viewBox="0 0 120 120" aria-hidden="true">' +
      '<ellipse cx="60" cy="114" rx="34" ry="5" fill="hsl(210 25% 92%)"/>' +
      '<circle cx="28" cy="34" r="15" fill="#e9eef3" stroke="#5b4a52" stroke-width="3"/><circle cx="28" cy="34" r="7" fill="#ffb3c1"/>' +
      '<circle cx="92" cy="34" r="15" fill="#e9eef3" stroke="#5b4a52" stroke-width="3"/><circle cx="92" cy="34" r="7" fill="#ffb3c1"/>' +
      '<ellipse cx="60" cy="68" rx="44" ry="40" fill="#f4f7fa" stroke="#5b4a52" stroke-width="3"/>' +
      '<g fill="#8b97a6"><circle cx="40" cy="44" r="3.5"/><circle cx="47" cy="38" r="2.5"/><circle cx="80" cy="44" r="3.5"/><circle cx="73" cy="38" r="2.5"/>' +
      '<circle cx="24" cy="70" r="3"/><circle cx="28" cy="80" r="2.4"/><circle cx="96" cy="70" r="3"/><circle cx="92" cy="80" r="2.4"/></g>' +
      // тақия (skullcap) with gold ornament
      '<path d="M36 34 Q60 6 84 34 Z" fill="hsl(199 84% 50%)" stroke="#5b4a52" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M44 29 q4 -6 8 0 q4 -6 8 0 q4 -6 8 0 q4 -6 8 0" fill="none" stroke="hsl(43 100% 55%)" stroke-width="2.5" stroke-linecap="round"/>' +
      '<circle cx="60" cy="13" r="4" fill="hsl(43 100% 55%)" stroke="#5b4a52" stroke-width="2"/>' +
      brows +
      '<g class="eye"><ellipse cx="44" cy="62" rx="11" ry="12" fill="#fff" stroke="#5b4a52" stroke-width="3"/><circle cx="46" cy="64" r="7" fill="hsl(170 55% 32%)"/><circle cx="46" cy="64" r="3.5" fill="#1d2430"/><circle cx="49" cy="60" r="2.5" fill="#fff"/></g>' +
      '<g class="eye"><ellipse cx="76" cy="62" rx="11" ry="12" fill="#fff" stroke="#5b4a52" stroke-width="3"/><circle cx="74" cy="64" r="7" fill="hsl(170 55% 32%)"/><circle cx="74" cy="64" r="3.5" fill="#1d2430"/><circle cx="77" cy="60" r="2.5" fill="#fff"/></g>' +
      '<ellipse cx="32" cy="80" rx="7" ry="4.5" fill="#ffc2cf" opacity=".8"/><ellipse cx="88" cy="80" rx="7" ry="4.5" fill="#ffc2cf" opacity=".8"/>' +
      '<path d="M55 74 L65 74 L60 80 Z" fill="#ff8fa3" stroke="#5b4a52" stroke-width="2.5" stroke-linejoin="round"/>' +
      mouth + '</svg>';
  }

  /* ---------- analogue clock ---------- */
  function clockSVG(h, m) {
    var ticks = '', nums = '';
    for (var i = 1; i <= 12; i++) {
      var a = i * 30 * Math.PI / 180;
      nums += '<text x="' + (50 + 33 * Math.sin(a)).toFixed(1) + '" y="' + (50 - 33 * Math.cos(a) + 4).toFixed(1) + '" text-anchor="middle" font-size="11" font-weight="900" fill="hsl(218 30% 18%)">' + i + '</text>';
    }
    for (var k = 0; k < 60; k += 5) {
      var b = k * 6 * Math.PI / 180;
      ticks += '<line x1="' + (50 + 42 * Math.sin(b)).toFixed(1) + '" y1="' + (50 - 42 * Math.cos(b)).toFixed(1) + '" x2="' + (50 + 45 * Math.sin(b)).toFixed(1) + '" y2="' + (50 - 45 * Math.cos(b)).toFixed(1) + '" stroke="hsl(214 14% 62%)" stroke-width="2" stroke-linecap="round"/>';
    }
    var ha = ((h % 12) + m / 60) * 30, ma = m * 6;
    return '<svg viewBox="0 0 100 100" class="clock" aria-label="' + h + ':' + (m ? '30' : '00') + '">' +
      '<circle cx="50" cy="50" r="48" fill="hsl(46 100% 90%)" stroke="hsl(38 95% 45%)" stroke-width="4"/>' +
      '<circle cx="50" cy="50" r="43" fill="#fff"/>' + ticks + nums +
      '<line x1="50" y1="50" x2="50" y2="27" stroke="hsl(218 30% 18%)" stroke-width="6" stroke-linecap="round" transform="rotate(' + ha + ' 50 50)"/>' +
      '<line x1="50" y1="50" x2="50" y2="15" stroke="hsl(356 85% 60%)" stroke-width="3.5" stroke-linecap="round" transform="rotate(' + ma + ' 50 50)"/>' +
      '<circle cx="50" cy="50" r="4.5" fill="hsl(218 30% 18%)"/></svg>';
  }
  function hm(t) { return t[0] + ':' + (t[1] ? '30' : '00'); }

  /* ---------- small view helpers ---------- */
  function glyph(e) { return isNumGlyph(e) ? '<span class="num">' + esc(e) + '</span>' : '<span class="em">' + esc(e) + '</span>'; }
  function spk(text, cls) { return '<button class="spk ' + (cls || '') + '" data-say="' + esc(text) + '" aria-label="Тыңдау — прослушать">🔊</button>'; }
  function prompt(text, kk) { return '<div class="prompt">' + mascot('happy') + '<div class="say">' + (kk ? spk(text) : '') + '<span>' + esc(text) + '</span></div></div>'; }
  function bindSpeak(el) { qsa('[data-say]', el).forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); TTS.speak(b.getAttribute('data-say')); }; }); }
  function autoSay(text) { if (TTS.ok()) setTimeout(function () { TTS.speak(text, true); }, 250); }
  function selectOne(el, onPick) {
    var cards = qsa('.card', el);
    cards.forEach(function (c) {
      c.onclick = function () {
        sfx.tap();
        cards.forEach(function (x) { x.classList.toggle('sel', x === c); });
        onPick(+c.getAttribute('data-i'), c);
      };
    });
  }
  function markCards(el, rightIdx, chosenIdx) {
    qsa('.card', el).forEach(function (c) {
      var i = +c.getAttribute('data-i');
      if (i === rightIdx) c.classList.add('right');
      else if (i === chosenIdx) c.classList.add('wrong');
    });
  }
  function distract(w, pool, n) {
    var bad = function (x) { return x.kk === w.kk || x.ru === w.ru; };
    var num = isNumGlyph(w.e);
    var from = function (src) { return shuffle(src.filter(function (x) { return !bad(x) && isNumGlyph(x.e) === num; })); };
    var out = uniqBy(from(pool).concat(from(ALLWORDS), shuffle(ALLWORDS.filter(function (x) { return !bad(x); }))), function (x) { return x.kk; });
    out = uniqBy(out, function (x) { return x.ru; });
    return out.slice(0, n);
  }

  /* ---------- exercise types ---------- */
  // 0. Word cards shown before a new lesson: learn first, then practise
  function exLearn(words) {
    return {
      noCheck: true, free: true,
      render: function (el, ctx) {
        el.innerHTML = '<span class="tag new">✨ Жаңа сөздер · новые слова</span><h2 class="task">Запомни слова этого урока</h2>' +
          '<div class="learn">' + words.map(function (w) {
            return '<div class="word-row"><span class="em' + (isNumGlyph(w.e) ? ' n' : '') + '">' + esc(w.e) + '</span><div class="w">' + esc(w.kk) + '<span>' + esc(w.ru) + '</span></div>' + spk(w.kk, 'sm') + '</div>';
          }).join('') + '</div><button class="btn" id="learned">Түсіндім · понятно!</button>';
        bindSpeak(el);
        qs('#learned', el).onclick = function () { ctx.done({ ok: true, silent: true }); };
      }
    };
  }
  // 1. Kazakh word → pick the picture card with the Russian meaning
  function exPick(w, pool, isNew) {
    var opts, sel, el;
    return {
      render: function (root, ctx) {
        el = root; sel = -1; opts = shuffle([w].concat(distract(w, pool, 3)));
        el.innerHTML = (isNew ? '<span class="tag new">✨ Жаңа сөз · новое слово</span>' : '') +
          '<h2 class="task">Что значит «' + esc(w.kk) + '»?</h2>' + prompt(w.kk, true) +
          '<div class="cards">' + opts.map(function (o, i) { return '<button class="card" data-i="' + i + '">' + glyph(o.e) + '<span>' + esc(o.ru) + '</span></button>'; }).join('') + '</div>';
        bindSpeak(el); autoSay(w.kk);
        selectOne(el, function (i) { sel = i; ctx.ready(true); });
      },
      check: function () {
        var right = opts.indexOf(w); markCards(el, right, sel);
        return { ok: sel === right, ans: w.kk + ' — ' + w.ru, say: w.kk };
      }
    };
  }
  // 2. Russian → pick the Kazakh word
  function exPickR(w, pool, isNew) {
    var opts, sel, el;
    return {
      render: function (root, ctx) {
        el = root; sel = -1; opts = shuffle([w].concat(distract(w, pool, 3)));
        el.innerHTML = (isNew ? '<span class="tag new">✨ Жаңа сөз · новое слово</span>' : '') +
          '<h2 class="task">Как по-казахски «' + esc(w.ru) + '»?</h2>' +
          '<div class="cards">' + opts.map(function (o, i) { return '<button class="card" data-i="' + i + '">' + glyph(o.e) + '<span>' + esc(o.kk) + '</span></button>'; }).join('') + '</div>';
        selectOne(el, function (i) { sel = i; ctx.ready(true); if (TTS.ok()) TTS.speak(opts[i].kk, true); });
      },
      check: function () {
        var right = opts.indexOf(w); markCards(el, right, sel);
        return { ok: sel === right, ans: w.kk + ' — ' + w.ru, say: w.kk };
      }
    };
  }
  // 3. Listen → choose what you heard (only offered when a Kazakh voice exists)
  function exListen(w, pool) {
    var opts, sel, el;
    return {
      render: function (root, ctx) {
        el = root; sel = -1; opts = shuffle([w].concat(distract(w, pool, 3)));
        el.innerHTML = '<span class="tag">🎧 Тыңда · слушай</span><h2 class="task">Что ты услышал?</h2>' + spk(w.kk, 'big') +
          '<div class="cards list">' + opts.map(function (o, i) { return '<button class="card" data-i="' + i + '"><span class="idx">' + (i + 1) + '</span><span>' + esc(o.kk) + '</span></button>'; }).join('') + '</div>';
        bindSpeak(el); autoSay(w.kk);
        selectOne(el, function (i) { sel = i; ctx.ready(true); });
      },
      check: function () {
        var right = opts.indexOf(w); markCards(el, right, sel);
        return { ok: sel === right, ans: w.kk + ' — ' + w.ru };
      }
    };
  }
  // 4. Match pairs — no hearts lost, finishes on its own
  function exMatch(words) {
    return {
      noCheck: true,
      render: function (el, ctx) {
        words = uniqBy(uniqBy(words, function (w) { return w.ru; }), function (w) { return w.kk; });
        var L = shuffle(words), R = shuffle(words), selL = null, selR = null, left = words.length;
        el.innerHTML = '<span class="tag">🧩 Жұптар · пары</span><h2 class="task">Найди пары</h2><div class="match">' +
          L.map(function (w, i) { return '<button class="card" data-side="L" data-k="' + esc(w.kk) + '" style="grid-column:1;grid-row:' + (i + 1) + '">' + esc(w.kk) + '</button>'; }).join('') +
          R.map(function (w, i) { return '<button class="card" data-side="R" data-k="' + esc(w.kk) + '" style="grid-column:2;grid-row:' + (i + 1) + '">' + esc(w.ru) + '</button>'; }).join('') + '</div>';
        qsa('.card', el).forEach(function (c) {
          c.onclick = function () {
            var side = c.getAttribute('data-side');
            if (side === 'L') { selL = c; if (TTS.ok()) TTS.speak(c.getAttribute('data-k'), true); } else selR = c;
            qsa('.card[data-side="' + side + '"]', el).forEach(function (x) { x.classList.toggle('sel', x === c); });
            sfx.tap();
            if (selL && selR) {
              var a = selL, b = selR; selL = selR = null;
              if (a.getAttribute('data-k') === b.getAttribute('data-k')) {
                sfx.pair();
                [a, b].forEach(function (x) { x.classList.remove('sel'); x.classList.add('right'); });
                setTimeout(function () { [a, b].forEach(function (x) { x.classList.remove('right'); x.classList.add('gone'); }); }, 280);
                if (--left === 0) setTimeout(function () { ctx.done({ ok: true, ans: 'Все пары найдены!' }); }, 420);
              } else {
                sfx.bad();
                [a, b].forEach(function (x) { x.classList.remove('sel'); x.classList.add('wrong', 'shake'); });
                setTimeout(function () { [a, b].forEach(function (x) { x.classList.remove('wrong', 'shake'); }); }, 450);
              }
            }
          };
        });
      }
    };
  }
  // 5. Build the Kazakh sentence from word tiles (the classic one)
  function exBuild(s, pool) {
    var el, tiles, picked;
    function draw(ctx) {
      var ans = qs('.answer-lines', el), bank = qs('.bank', el);
      ans.innerHTML = picked.map(function (id) { return '<button class="tile" data-id="' + id + '">' + esc(tiles[id]) + '</button>'; }).join('');
      bank.innerHTML = tiles.map(function (t, id) { return '<button class="tile' + (picked.indexOf(id) >= 0 ? ' ghost' : '') + '" data-id="' + id + '">' + esc(t) + '</button>'; }).join('');
      qsa('.tile', ans).forEach(function (b) { b.onclick = function () { sfx.tap(); picked.splice(picked.indexOf(+b.getAttribute('data-id')), 1); draw(ctx); }; });
      qsa('.tile', bank).forEach(function (b) {
        b.onclick = function () {
          var id = +b.getAttribute('data-id'); if (picked.indexOf(id) >= 0) return;
          sfx.tap(); picked.push(id); draw(ctx);
          if (TTS.ok()) TTS.speak(tiles[id], true);
        };
      });
      ctx.ready(picked.length > 0);
    }
    return {
      render: function (root, ctx) {
        el = root; picked = [];
        var own = tokens(s.kk);
        var lower = own.map(function (t) { return t.toLowerCase(); });
        var extra = uniqBy(shuffle([].concat.apply([], (pool.concat(ALLSENT)).filter(function (x) { return x !== s; }).map(function (x) { return tokens(x.kk); })))
          .map(function (t) { return t.toLowerCase(); }), function (t) { return t; })
          // pronouns are optional in Kazakh, so a spare «мен/ол» tile could form a second correct answer
          .filter(function (t) { return lower.indexOf(t) < 0 && PRONOUNS.indexOf(t) < 0; })
          .slice(0, Math.max(2, Math.min(4, 9 - own.length)));
        tiles = shuffle(own.concat(extra));
        el.innerHTML = '<span class="tag">🎯 Аудар · переведи</span><h2 class="task">Переведи предложение</h2>' + prompt(s.ru, false) +
          '<div class="answer-lines"></div><div class="bank"></div>';
        draw(ctx);
      },
      check: function () {
        var got = norm(picked.map(function (id) { return tiles[id]; }).join(' '));
        var ok = [s.kk].concat(s.alt || []).some(function (v) { return norm(v) === got; });
        return { ok: ok, ans: s.kk, tr: s.ru, say: s.kk };
      }
    };
  }
  // 6. Kazakh sentence → choose the Russian translation
  function exSent(s, pool) {
    var opts, sel, el;
    return {
      render: function (root, ctx) {
        el = root; sel = -1;
        var others = uniqBy(shuffle(pool.concat(shuffle(ALLSENT))).filter(function (x) { return x.ru !== s.ru; }), function (x) { return x.ru; }).slice(0, 2);
        opts = shuffle([s].concat(others));
        el.innerHTML = '<span class="tag">📖 Оқы · читай</span><h2 class="task">Выбери правильный перевод</h2>' + prompt(s.kk, true) +
          '<div class="cards list">' + opts.map(function (o, i) { return '<button class="card" data-i="' + i + '"><span class="idx">' + (i + 1) + '</span><span>' + esc(o.ru) + '</span></button>'; }).join('') + '</div>';
        bindSpeak(el); autoSay(s.kk);
        selectOne(el, function (i) { sel = i; ctx.ready(true); });
      },
      check: function () {
        var right = opts.indexOf(s); markCards(el, right, sel);
        return { ok: sel === right, ans: s.ru, tr: s.kk };
      }
    };
  }
  // 7. Fill the gap (words, case endings, possessive endings, tenses)
  function exFill(f) {
    var opts, sel, el;
    var suffix = f.pre && !/\s$/.test(f.pre) && f.ans.length <= 4;
    return {
      render: function (root, ctx) {
        el = root; sel = -1; opts = shuffle(f.opts);
        el.innerHTML = '<span class="tag">✏️ Толықтыр · дополни</span><h2 class="task">' + (suffix ? 'Выбери правильное окончание' : 'Заполни пропуск') + '</h2>' +
          '<div class="sentence">' + esc(f.pre) + '<span class="gap empty' + (suffix ? ' suf' : '') + '">' + esc(f.ans) + '</span>' + esc(f.post) + '<div class="hint">' + esc(f.ru) + '</div></div>' +
          '<div class="chips">' + opts.map(function (o, i) { return '<button class="card" data-i="' + i + '">' + (suffix ? '-' : '') + esc(o) + '</button>'; }).join('') + '</div>';
        selectOne(el, function (i) {
          sel = i; var g = qs('.gap', el); g.textContent = opts[i]; g.classList.remove('empty'); ctx.ready(true);
        });
      },
      check: function () {
        var right = opts.indexOf(f.ans); markCards(el, right, sel);
        var full = f.pre + f.ans + f.post;
        return { ok: opts[sel] === f.ans, ans: full.replace(/^— /, ''), tr: f.ru, say: full.replace(/—/g, '') };
      }
    };
  }
  // 8. Clock → «Сағат неше?»
  function exClock(t, set) {
    var opts, sel, el;
    return {
      render: function (root, ctx) {
        el = root; sel = -1;
        var pool = uniqBy(shuffle((set || []).concat(randTimes(6, t[1] === 30))), hm).filter(function (x) { return hm(x) !== hm(t); }).slice(0, 2);
        if (t[1] === 30) pool.push([t[0], 0]); // tricky neighbour: same hour without «жарым»
        opts = shuffle([t].concat(uniqBy(pool, hm).filter(function (x) { return hm(x) !== hm(t); }).slice(0, 3)));
        el.innerHTML = '<span class="tag">🕐 Уақыт · время</span><h2 class="task">Сағат неше? <span class="muted">Который час?</span></h2>' +
          '<div style="width:180px;margin:0 auto">' + clockSVG(t[0], t[1]) + '</div>' +
          '<div class="cards list">' + opts.map(function (o, i) { return '<button class="card" data-i="' + i + '"><span class="idx">' + (i + 1) + '</span><span>' + esc(D.timeKk(o[0], o[1])) + '</span></button>'; }).join('') + '</div>';
        selectOne(el, function (i) { sel = i; ctx.ready(true); if (TTS.ok()) TTS.speak(D.timeKk(opts[i][0], opts[i][1]), true); });
      },
      check: function () {
        var right = opts.indexOf(t); markCards(el, right, sel);
        return { ok: sel === right, ans: D.timeKk(t[0], t[1]) + ' (' + hm(t) + ')', say: D.timeKk(t[0], t[1]) };
      }
    };
  }
  // 9. «Сағат … жарым» → pick the right clock
  function exClockR(t, set) {
    var opts, sel, el;
    return {
      render: function (root, ctx) {
        el = root; sel = -1;
        var others = uniqBy(shuffle((set || []).concat(randTimes(5, t[1] === 30))), hm).filter(function (x) { return hm(x) !== hm(t); }).slice(0, 2);
        opts = shuffle([t].concat(others));
        var txt = D.timeKk(t[0], t[1]);
        el.innerHTML = '<span class="tag">🕐 Уақыт · время</span><h2 class="task">Найди часы</h2>' + prompt(txt, true) +
          '<div class="cards">' + opts.map(function (o, i) { return '<button class="card" data-i="' + i + '">' + clockSVG(o[0], o[1]) + '</button>'; }).join('') + '</div>';
        bindSpeak(el); autoSay(txt);
        selectOne(el, function (i) { sel = i; ctx.ready(true); });
      },
      check: function () {
        var right = opts.indexOf(t); markCards(el, right, sel);
        return { ok: sel === right, ans: D.timeKk(t[0], t[1]) + ' = ' + hm(t) };
      }
    };
  }
  // 10. Clock + «Мен ___ тұрамын» → locative «жетіде»
  function exClockLoc(t) {
    var opts, sel, el, v = LOC_VERBS[rnd(LOC_VERBS.length)];
    return {
      render: function (root, ctx) {
        el = root; sel = -1;
        var hs = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter(function (h) { return h !== t[0]; })).slice(0, 2);
        opts = shuffle([t[0]].concat(hs));
        el.innerHTML = '<span class="tag">⏰ Нешеде? · во сколько?</span><h2 class="task">Заполни пропуск</h2>' +
          '<div style="width:140px;margin:0 auto">' + clockSVG(t[0], 0) + '</div>' +
          '<div class="sentence">Мен <span class="gap empty">' + esc(D.hourLoc(t[0])) + '</span> ' + esc(v.kk) + '.<div class="hint">' + esc(v.ru + ' ' + HOURS_RU_V[t[0]]) + '.</div></div>' +
          '<div class="chips">' + opts.map(function (h, i) { return '<button class="card" data-i="' + i + '">' + esc(D.hourLoc(h)) + '</button>'; }).join('') + '</div>';
        selectOne(el, function (i) { sel = i; var g = qs('.gap', el); g.textContent = D.hourLoc(opts[i]); g.classList.remove('empty'); ctx.ready(true); });
      },
      check: function () {
        var right = opts.indexOf(t[0]); markCards(el, right, sel);
        var full = 'Мен ' + D.hourLoc(t[0]) + ' ' + v.kk + '.';
        return { ok: sel === right, ans: full, tr: v.ru + ' ' + HOURS_RU_V[t[0]] + '.', say: full };
      }
    };
  }
  // 11. Number in digits → Kazakh words
  function exNum(range) {
    var opts, sel, el, n;
    return {
      render: function (root, ctx) {
        el = root; sel = -1;
        var a = range[0], b = range[1], st = range[2] || 1;
        var pick = function () { return a + rnd(Math.floor((b - a) / st) + 1) * st; };
        n = pick();
        var near = [n + st, n - st, n + 10 * st, n - 10 * st, pick(), pick(), pick()].filter(function (x) { return x >= a && x <= b && x !== n; });
        var others = uniqBy(shuffle(near), function (x) { return x; }).slice(0, 3);
        opts = shuffle([n].concat(others));
        el.innerHTML = '<span class="tag">🔢 Сандар · числа</span><h2 class="task">Как это число по-казахски?</h2>' +
          '<div class="card" style="pointer-events:none;align-self:center;min-width:160px"><span class="num" style="font-size:44px">' + n + '</span></div>' +
          '<div class="cards list">' + opts.map(function (o, i) { return '<button class="card" data-i="' + i + '"><span class="idx">' + (i + 1) + '</span><span>' + esc(D.numToKk(o)) + '</span></button>'; }).join('') + '</div>';
        selectOne(el, function (i) { sel = i; ctx.ready(true); if (TTS.ok()) TTS.speak(D.numToKk(opts[i]), true); });
      },
      check: function () {
        var right = opts.indexOf(n); markCards(el, right, sel);
        return { ok: sel === right, ans: n + ' — ' + D.numToKk(n), say: D.numToKk(n) };
      }
    };
  }
  // 12. Put the day in order (textbook schedule)
  function exOrder(items) {
    var el, slots, bank, chosen;
    function draw(ctx) {
      qs('.slots', el).innerHTML = slots.map(function (it, i) {
        var c = chosen[i];
        return '<div class="slot"><span class="t">' + esc(it.t) + '</span><button class="v' + (c != null ? ' filled' : '') + '" data-s="' + i + '">' + (c != null ? esc(bank[c].kk) : '') + '</button></div>';
      }).join('');
      qs('.bank', el).innerHTML = bank.map(function (b, i) { return '<button class="tile' + (chosen.indexOf(i) >= 0 ? ' ghost' : '') + '" data-b="' + i + '">' + esc(b.kk) + '</button>'; }).join('');
      qsa('[data-s]', el).forEach(function (b) { b.onclick = function () { var i = +b.getAttribute('data-s'); if (chosen[i] == null) return; sfx.tap(); chosen[i] = null; draw(ctx); }; });
      qsa('[data-b]', el).forEach(function (b) {
        b.onclick = function () {
          var i = +b.getAttribute('data-b'); if (chosen.indexOf(i) >= 0) return;
          var free = chosen.indexOf(null); if (free < 0) return;
          sfx.tap(); chosen[free] = i; draw(ctx);
        };
      });
      ctx.ready(chosen.indexOf(null) < 0);
    }
    return {
      render: function (root, ctx) {
        el = root;
        var start = rnd(items.length - 3);
        slots = items.slice(start, start + 4);
        bank = shuffle(slots); chosen = [null, null, null, null];
        el.innerHTML = '<span class="tag">📋 Күн тәртібі</span><h2 class="task">Составь распорядок дня</h2><div class="slots"></div><div class="bank"></div>';
        draw(ctx);
      },
      check: function () {
        var ok = slots.every(function (s, i) { return bank[chosen[i]] === s; });
        return { ok: ok, ans: slots.map(function (s) { return s.t + ' — ' + s.kk; }).join('; ') };
      }
    };
  }
  function randTimes(n, half) {
    var out = [];
    for (var i = 0; i < n; i++) out.push([1 + rnd(12), half && Math.random() < 0.7 ? 30 : 0]);
    return out;
  }

  /* ---------- lesson generator ---------- */
  function contentOf(list) {
    var c = { words: [], sentences: [], fills: [], clocks: [], clocksLoc: [], order: null, nums: null };
    list.forEach(function (l) {
      c.words = c.words.concat(l.words || []); c.sentences = c.sentences.concat(l.sentences || []);
      c.fills = c.fills.concat(l.fills || []); c.clocks = c.clocks.concat(l.clocks || []);
      c.clocksLoc = c.clocksLoc.concat(l.clocksLoc || []); if (l.order) c.order = l.order;
      if (l.nums) c.nums = c.nums ? [Math.min(c.nums[0], l.nums[0]), Math.max(c.nums[1], l.nums[1]), 1] : l.nums;
    });
    c.words = uniqBy(c.words, function (w) { return w.kk; });
    c.clocks = shuffle(uniqBy(c.clocks, hm)).slice(0, 6);
    c.clocksLoc = shuffle(c.clocksLoc).slice(0, 3);
    c.fills = shuffle(c.fills).slice(0, 6);
    c.sentences = shuffle(c.sentences).slice(0, 8);
    return c;
  }
  function genLesson(c, count, opts) {
    opts = opts || {};
    var N = count || 10, tts = TTS.ok(), groups = {};
    function add(g, fn) { (groups[g] = groups[g] || []).push(fn); }
    var words = shuffle(c.words || []), intro = [];
    if (words.length && !opts.noIntro) {
      intro.push(function () { return exPick(words[0], c.words, true); });
      if (words[1]) intro.push(function () { return exPickR(words[1], c.words, true); });
    }
    words.slice(opts.noIntro ? 0 : 2).forEach(function (w, i) {
      add(i % 2 ? 'pickR' : 'pick', i % 2 ? function () { return exPickR(w, c.words); } : function () { return exPick(w, c.words); });
    });
    if (tts) words.slice(0, 3).forEach(function (w) { add('listen', function () { return exListen(w, c.words); }); });
    (c.sentences || []).forEach(function (s) { add('build', function () { return exBuild(s, c.sentences); }); });
    shuffle(c.sentences || []).slice(0, 2).forEach(function (s) { add('sent', function () { return exSent(s, c.sentences); }); });
    (c.fills || []).forEach(function (f) { add('fill', function () { return exFill(f); }); });
    (c.clocks || []).forEach(function (t, i) {
      add(i % 3 === 2 ? 'clockR' : 'clock', i % 3 === 2 ? function () { return exClockR(t, c.clocks); } : function () { return exClock(t, c.clocks); });
    });
    (c.clocksLoc || []).forEach(function (t) { add('clockLoc', function () { return exClockLoc(t); }); });
    if (c.nums) for (var k = 0; k < 4; k++) add('num', function () { return exNum(c.nums); });
    if (c.order) add('order', function () { return exOrder(c.order); });

    Object.keys(groups).forEach(function (g) { groups[g] = shuffle(groups[g]); });
    var matchable = uniqBy(c.words || [], function (w) { return w.ru; }).length >= 4 && !opts.noMatch;
    var target = N - (matchable ? 1 : 0), seq = intro.slice(), keys = Object.keys(groups), guard = 0;
    while (seq.length < target && guard++ < 50) {
      keys = shuffle(keys.filter(function (k) { return groups[k].length; }));
      if (!keys.length) break;
      for (var j = 0; j < keys.length && seq.length < target; j++) seq.push(groups[keys[j]].shift());
    }
    while (seq.length < target && words.length) {
      (function (w) { seq.push(Math.random() < 0.5 ? function () { return exPick(w, c.words); } : function () { return exPickR(w, c.words); }); })(words[rnd(words.length)]);
    }
    if (matchable) seq.splice(Math.min(3, seq.length), 0, function () { return exMatch(shuffle(c.words).slice(0, 5)); });
    if (!opts.noIntro && (c.words || []).length) seq.unshift(function () { return exLearn(c.words); });
    return seq.map(function (f) { return f(); });
  }

  /* ---------- views ---------- */
  var view = 'home', tab = 'path', L = null, sheetOpen = null;

  function topbar() {
    return '<header class="topbar"><div class="brand">' + mascot('happy') + '<span>Қазақша Ойна</span></div><div class="stats">' +
      '<span class="stat fire" title="Дней подряд"><span class="ico">🔥</span>' + S.streak + '</span>' +
      '<span class="stat xp" title="Очки опыта"><span class="ico">⚡</span>' + S.xp + '</span></div></header>';
  }
  function nav() {
    var items = [['path', '🏠', 'Жол'], ['dict', '📖', 'Сөздік'], ['practice', '🏋️', 'Жаттығу'], ['me', '🧒', 'Мен']];
    return '<nav class="nav">' + items.map(function (it) { return '<button data-tab="' + it[0] + '" class="' + (tab === it[0] ? 'on' : '') + '"><span class="ico">' + it[1] + '</span>' + it[2] + '</button>'; }).join('') + '</nav>';
  }
  function bindNav() {
    qsa('[data-tab]').forEach(function (b) { b.onclick = function () { sfx.tap(); tab = b.getAttribute('data-tab'); renderHome(); }; });
  }

  function renderHome() {
    view = 'home';
    var body = tab === 'dict' ? dictPage() : tab === 'practice' ? practicePage() : tab === 'me' ? mePage() : pathPage();
    $app.innerHTML = topbar() + '<main class="scroll" id="scroll">' + body + '</main>' + nav();
    bindNav(); bindSpeak($app);
    if (tab === 'path') bindPath();
    if (tab === 'practice') bindPractice();
    if (tab === 'me') bindMe();
    if (tab === 'path') {
      var cur = qs('.node-wrap.current');
      if (cur && cur.scrollIntoView) setTimeout(function () { cur.scrollIntoView({ block: 'center' }); }, 30);
    }
  }

  function pathPage() {
    var cur = currentLesson();
    var goal = Math.min(100, Math.round(S.dayXp / DAILY_GOAL * 100));
    var html = '<section class="hero">' + mascot(goal >= 100 ? 'wow' : 'happy') + '<div style="flex:1"><h1>Сәлем, ' + esc(S.name || 'досым') + '!</h1>' +
      '<p>' + (goal >= 100 ? 'Цель на сегодня выполнена! 🎉' : 'Цель на сегодня: ' + S.dayXp + ' / ' + DAILY_GOAL + ' ⚡') + '</p>' +
      '<div class="goal"><i style="width:' + goal + '%"></i></div></div></section>';
    D.UNITS.forEach(function (u) {
      var uc = 'var(--u-' + u.hue + ')', ucd = 'var(--u-' + u.hue + '-d)';
      html += '<section class="unit" style="--uc:' + uc + ';--ucd:' + ucd + '"><div class="unit-head"><div><small>' + u.n + '-бөлім</small><b>' + esc(u.kk) + '</b><div class="sub">' + esc(u.ru) + '</div></div><span class="badge">' + u.lessons[0].icon + '</span></div><div class="path">';
      u.lessons.forEach(function (l, i) {
        var done = S.done[l.id], open = unlocked(l), isCur = l === cur;
        var x = Math.round(Math.sin((i + u.n) * 1.3) * 64);
        html += '<div class="node-wrap' + (isCur ? ' current' : '') + '" style="transform:translateX(' + x + 'px)">' +
          (isCur ? '<span class="start-tip">БАСТАУ!</span>' : '') +
          '<button class="node' + (done ? ' done' : '') + (open ? '' : ' locked') + '" data-l="' + l.id + '" aria-label="' + esc(l.kk) + '">' +
          (isCur ? '<span class="ring"></span>' : '') + '<span>' + (open ? (done ? '⭐' : l.icon) : '🔒') + '</span></button>' +
          '<div class="stars">' + (done ? '⭐'.repeat(done) : '') + '</div>' +
          '<div class="node-label">' + esc(l.kk) + '<em>' + esc(l.ru) + '</em></div></div>';
      });
      html += '</div><div class="mascot-row">' + mascot('happy') + '<div class="bubble">' + esc(u.mascot) + '</div></div></section>';
    });
    return html + '<div style="height:24px"></div>';
  }
  function bindPath() {
    qsa('[data-l]').forEach(function (b) {
      b.onclick = function () {
        var l = ALL.filter(function (x) { return x.id === b.getAttribute('data-l'); })[0];
        if (!unlocked(l)) { sfx.bad(); toast('🔒 Сначала пройди предыдущий урок'); return; }
        sfx.tap(); lessonSheet(l);
      };
    });
  }
  function lessonSheet(l) {
    var done = S.done[l.id];
    sheet('<div style="font-size:56px">' + l.icon + '</div><h3>' + esc(l.kk) + '</h3><p>' + esc(l.ru) + (done ? ' · ' + '⭐'.repeat(done) : '') + '</p>' +
      '<p class="muted">' + (l.review ? '12 заданий из всех тем' : '10 заданий · ' + HEARTS + ' ❤️') + '</p>' +
      '<button class="btn ' + (done ? 'gold' : 'ok') + '" id="go">' + (done ? 'Қайталау · повторить' : 'Бастау · начать') + '</button>' +
      '<button class="btn ghost" id="cancel">Жабу · закрыть</button>');
    qs('#go').onclick = function () { closeSheet(); startLesson(l); };
    qs('#cancel').onclick = closeSheet;
  }

  function dictPage() {
    var html = '<div class="page"><p class="muted">Нажми 🔊, чтобы послушать слово.</p>';
    D.UNITS.forEach(function (u) {
      var words = uniqBy([].concat.apply([], u.lessons.map(function (l) { return l.words || []; })), function (w) { return w.kk; });
      if (!words.length) return;
      html += '<h2>' + esc(u.kk) + ' · <span class="muted" style="font-size:inherit">' + esc(u.ru) + '</span></h2>';
      words.forEach(function (w) {
        html += '<div class="word-row"><span class="em' + (isNumGlyph(w.e) ? ' n' : '') + '">' + esc(w.e) + '</span><div class="w">' + esc(w.kk) + '<span>' + esc(w.ru) + '</span></div>' + spk(w.kk, 'sm') + '</div>';
      });
    });
    return html + '</div>';
  }

  function practicePage() {
    var tts = TTS.ok();
    var items = [
      ['mix', '🏋️', 'Жаттығу', 'Смешанная тренировка из пройденных уроков'],
      ['clock', '🕐', 'Сағат неше?', 'Тренировка: часы и время'],
      ['num', '🔢', 'Сандар', 'Тренировка: числа до двух тысяч'],
      ['build', '🧱', 'Сөйлем құра', 'Собери предложения из слов']
    ];
    if (tts) items.push(['listen', '🎧', 'Тыңда', 'Слушай и выбирай']);
    return '<div class="page"><div class="hero" style="margin:0">' + mascot('wow') + '<div><h1>Жаттығу</h1><p>Тренировка без новых слов. Каждая даёт +10 ⚡</p></div></div>' +
      items.map(function (it) {
        return '<button class="card" data-p="' + it[0] + '" style="flex-direction:row;justify-content:flex-start;text-align:left;gap:16px"><span class="em">' + it[1] + '</span><span><b style="display:block;font-size:var(--fs-3)">' + it[2] + '</b><span class="muted">' + it[3] + '</span></span></button>';
      }).join('') + '</div>';
  }
  function bindPractice() {
    qsa('[data-p]').forEach(function (b) {
      b.onclick = function () {
        sfx.tap();
        var mode = b.getAttribute('data-p');
        var doneL = CONTENT.filter(function (l) { return S.done[l.id]; });
        if (!doneL.length) doneL = [CONTENT[0]];
        var c, exs;
        if (mode === 'clock') {
          var times = randTimes(8, false).concat(randTimes(6, true));
          c = { clocks: times, clocksLoc: randTimes(3, false) };
          exs = genLesson(c, 10, { noIntro: true, noMatch: true });
        } else if (mode === 'num') {
          var nums = [];
          for (var i = 0; i < 10; i++) nums.push(i < 4 ? exNum([1, 99, 1]) : i < 7 ? exNum([100, 990, 10]) : exNum([1000, 2000, 50]));
          exs = nums;
        } else if (mode === 'build') {
          exs = shuffle(ALLSENT.filter(function (s) { return doneL.some(function (l) { return (l.sentences || []).indexOf(s) >= 0; }); })).slice(0, 8)
            .map(function (s) { return exBuild(s, ALLSENT); });
          if (exs.length < 4) exs = shuffle(ALLSENT).slice(0, 8).map(function (s) { return exBuild(s, ALLSENT); });
        } else if (mode === 'listen') {
          var ws = shuffle(uniqBy([].concat.apply([], doneL.map(function (l) { return l.words || []; })), function (w) { return w.kk; }));
          if (ws.length < 4) ws = shuffle(ALLWORDS);
          exs = ws.slice(0, 10).map(function (w) { return exListen(w, ws); });
        } else {
          exs = genLesson(contentOf(doneL), 10, { noIntro: true });
        }
        startLesson({ id: 'practice', kk: 'Жаттығу', ru: 'Тренировка', icon: '🏋️', practice: true }, exs);
      };
    });
  }

  function mePage() {
    var lessonsDone = ALL.filter(function (l) { return S.done[l.id]; }).length;
    var stars = ALL.reduce(function (a, l) { return a + (S.done[l.id] || 0); }, 0);
    var st = TTS.state();
    var android = !!(window.Android && window.Android.openTtsSettings);
    return '<div class="page"><div class="me-head">' + mascot('wow') +
      '<div style="flex:1"><h2 style="margin:0">' + esc(S.name || 'Досым') + '</h2><span class="muted">Сенің жетістіктерің · твои успехи</span></div></div>' +
      '<label class="muted" for="nm">Атың кім? — Как тебя зовут?</label><input id="nm" class="name" maxlength="24" value="' + esc(S.name) + '" placeholder="Например, Айгерім" autocomplete="off">' +
      '<div class="kpis">' +
      '<div class="kpi"><span class="ico">⚡</span><div><b>' + S.xp + '</b><span>очков опыта</span></div></div>' +
      '<div class="kpi"><span class="ico">🔥</span><div><b>' + S.streak + '</b><span>дней подряд</span></div></div>' +
      '<div class="kpi"><span class="ico">📘</span><div><b>' + lessonsDone + ' / ' + ALL.length + '</b><span>уроков</span></div></div>' +
      '<div class="kpi"><span class="ico">⭐</span><div><b>' + stars + '</b><span>звёзд</span></div></div></div>' +
      '<div class="panel" style="display:flex;flex-direction:column;gap:16px">' +
      '<button class="btn ghost" id="snd">' + (S.sound ? '🔔 Звуки: включены' : '🔕 Звуки: выключены') + '</button>' +
      '<div><b>🗣️ Казахская озвучка: ' + (st === 'kk' ? '✅ есть' : st === 'init' ? '⏳ проверяем…' : '❌ не найдена') + '</b>' +
      (st === 'kk' ? '' : '<p class="muted" style="margin:8px 0 0">Чтобы слова звучали вслух, установи казахский голос в «Синтезе речи» телефона (например, в «Распознавание и синтез речи Google» → Установить голосовые данные → Қазақ тілі). Без него игра работает полностью, просто без звука слов.</p>') +
      '</div>' + (android ? '<button class="btn ghost" id="ttsset">⚙️ Настроить озвучку</button>' : '') + '</div>' +
      '<button class="btn ghost" id="reset" style="color:var(--bad-d)">Начать заново</button>' +
      '<p class="muted" style="text-align:center">По учебнику: раздел «3. Уақыт», тема «Менің күн тәртібім».</p></div>';
  }
  function bindMe() {
    var nm = qs('#nm');
    nm.oninput = function () { S.name = nm.value.trim().slice(0, 24); save(); };
    qs('#snd').onclick = function () { S.sound = !S.sound; save(); sfx.tap(); renderHome(); };
    var ts = qs('#ttsset'); if (ts) ts.onclick = function () { try { window.Android.openTtsSettings(); } catch (e) { /* ignore */ } };
    qs('#reset').onclick = function () {
      sheet(mascot('sad') + '<h3>Начать заново?</h3><p>Все очки, звёзды и уроки будут сброшены.</p>' +
        '<button class="btn bad" id="yes">Да, сбросить</button><button class="btn ghost" id="no">Нет</button>');
      qs('#yes').onclick = function () { var n = S.name; try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } S = load(); S.name = n; save(); closeSheet(); tab = 'path'; renderHome(); };
      qs('#no').onclick = closeSheet;
    };
  }

  /* ---------- sheet ---------- */
  function sheet(inner) {
    closeSheet();
    var bg = document.createElement('div');
    bg.className = 'sheet-bg';
    bg.innerHTML = '<div class="sheet" role="dialog">' + inner + '</div>';
    bg.onclick = function (e) { if (e.target === bg) closeSheet(); };
    document.body.appendChild(bg);
    sheetOpen = bg;
  }
  function closeSheet() { if (sheetOpen) { sheetOpen.remove(); sheetOpen = null; } }

  /* ---------- lesson runner ---------- */
  function startLesson(lesson, exs) {
    if (!exs) {
      if (lesson.review) exs = genLesson(contentOf(CONTENT), 12, { noIntro: true });
      else exs = genLesson(lesson, 10);
    }
    L = { lesson: lesson, q: exs, i: 0, total: exs.filter(function (e) { return !e.free; }).length, good: 0, mistakes: 0, hearts: HEARTS, retried: [] };
    renderLesson();
  }
  function renderLesson() {
    view = 'lesson';
    var pct = Math.round(L.good / L.total * 100);
    $app.innerHTML = '<div class="lesson"><div class="l-top"><button class="x" id="lx" aria-label="Выйти">✕</button>' +
      '<div class="bar"><i style="width:' + pct + '%"></i></div><span class="stat heart"><span class="ico">❤️</span>' + L.hearts + '</span></div>' +
      '<div class="l-body" id="lb"></div><div class="l-foot" id="lf"><button class="btn ok" id="lc" disabled>Тексеру</button></div></div>';
    var ex = L.q[L.i], lb = qs('#lb'), lc = qs('#lc');
    qs('#lx').onclick = confirmExit;
    var ctx = {
      ready: function (b) { lc.disabled = !b; },
      done: function (res) { feedback(res, ex); }
    };
    if (ex.noCheck) qs('#lf').style.display = 'none';
    ex.render(lb, ctx);
    lc.onclick = function () { feedback(ex.check(), ex); };
  }
  function feedback(r, ex) {
    if (r.silent) { L.i++; return renderLesson(); }
    var lb = qs('#lb'), lf = qs('#lf');
    lb.style.pointerEvents = 'none';
    qsa('[data-say]', lb).forEach(function (b) { b.style.pointerEvents = 'auto'; });
    lf.style.display = '';
    if (r.ok) {
      if (!ex._counted) { L.good++; ex._counted = true; }
      sfx.ok();
      if (r.say && TTS.ok()) TTS.speak(r.say, true);
    } else {
      sfx.bad(); L.mistakes++; L.hearts--;
      if (L.retried.indexOf(ex) < 0) { L.retried.push(ex); L.q.push(ex); }
      var hb = qs('.stat.heart'); if (hb) { hb.innerHTML = '<span class="ico">💔</span>' + L.hearts; hb.classList.add('shake'); }
    }
    qs('.bar > i').style.width = Math.round(L.good / L.total * 100) + '%';
    var praise = D.PRAISE[rnd(D.PRAISE.length)];
    lf.className = 'l-foot ' + (r.ok ? 'good' : 'fail');
    lf.innerHTML = '<div class="fb"><span class="ic">' + (r.ok ? '✅' : '❌') + '</span><div>' +
      (r.ok ? '<h3>' + praise[0] + '</h3><p class="tr">' + praise[1] + '</p>' + (r.tr ? '<p>' + esc(r.ans) + '</p><p class="tr">' + esc(r.tr) + '</p>' : '')
        : '<h3>Дұрыс жауап:</h3><p>' + esc(r.ans) + '</p>' + (r.tr ? '<p class="tr">' + esc(r.tr) + '</p>' : '') + '<p class="tr">Ничего страшного — это задание вернётся в конце.</p>') +
      '</div></div><button class="btn ' + (r.ok ? 'ok' : 'bad') + '" id="next">Жалғастыру</button>';
    qs('#next').onclick = next;
  }
  function next() {
    sfx.tap();
    if (L.hearts <= 0) return outOfHearts();
    L.i++;
    if (L.i >= L.q.length) return finish();
    renderLesson();
  }
  function confirmExit() {
    sheet(mascot('sad') + '<h3>Шынымен шығасың ба?</h3><p>Правда выйти? Прогресс этого урока пропадёт.</p>' +
      '<button class="btn" id="stay">Оқуды жалғастыру · учиться дальше</button><button class="btn ghost" id="quit" style="color:var(--bad-d)">Шығу · выйти</button>');
    qs('#stay').onclick = closeSheet;
    qs('#quit').onclick = function () { closeSheet(); L = null; renderHome(); };
  }
  function outOfHearts() {
    var lesson = L.lesson;
    sheet(mascot('sad') + '<h3>Жүректер бітті 💔</h3><p>Сердечки закончились. Не грусти — попробуй ещё раз!</p>' +
      '<button class="btn ok" id="again">Қайтадан · ещё раз</button><button class="btn ghost" id="home">Шығу · выйти</button>');
    qs('#again').onclick = function () { closeSheet(); if (lesson.practice) { L = null; tab = 'practice'; renderHome(); } else startLesson(lesson); };
    qs('#home').onclick = function () { closeSheet(); L = null; renderHome(); };
  }
  function finish() {
    var l = L.lesson;
    var stars = L.mistakes === 0 ? 3 : L.mistakes <= 2 ? 2 : 1;
    var xp = l.practice ? 10 : (l.review ? 20 : 10) + (stars === 3 ? 5 : 0);
    var acc = Math.round(L.good / Math.max(1, L.good + L.mistakes) * 100);
    var firstToday = S.lastDay !== today();
    if (firstToday) { S.streak = S.lastDay === yesterday() ? S.streak + 1 : 1; S.lastDay = today(); }
    if (S.dayDate !== today()) { S.dayXp = 0; S.dayDate = today(); }
    S.xp += xp; S.dayXp += xp; S.lessons++;
    if (!l.practice) S.done[l.id] = Math.max(S.done[l.id] || 0, stars);
    save();
    view = 'result';
    sfx.win(); confetti();
    var title = stars === 3 ? 'Керемет! Мінсіз!' : stars === 2 ? 'Жарайсың!' : 'Сабақ аяқталды!';
    var sub = stars === 3 ? 'Великолепно! Ни одной ошибки!' : stars === 2 ? 'Молодец! Почти без ошибок.' : 'Урок пройден! Повтори его, чтобы получить больше звёзд.';
    $app.innerHTML = '<div class="lesson"><div class="result">' + mascot('wow') +
      '<div class="big-stars">' + [1, 2, 3].map(function (i) { return '<span class="' + (i <= stars ? '' : 'off') + '">⭐</span>'; }).join('') + '</div>' +
      '<h2>' + title + '</h2><p>' + sub + '</p>' +
      '<div class="res-grid">' +
      '<div class="res-box" style="--c:var(--sun-500)"><small>Ұпай · XP</small><b>+' + xp + '</b></div>' +
      '<div class="res-box" style="--c:var(--ok)"><small>Дәлдік · точно</small><b>' + acc + '%</b></div>' +
      '<div class="res-box" style="--c:var(--sun-600)"><small>Күн · дни</small><b>🔥' + S.streak + '</b></div></div>' +
      (firstToday && S.streak > 1 ? '<p><b>🔥 ' + S.streak + ' дней подряд! Так держать!</b></p>' : '') +
      '</div><div class="l-foot"><button class="btn ok" id="cont">Жалғастыру</button></div></div>';
    qs('#cont').onclick = function () { sfx.tap(); L = null; if (l.practice) tab = 'practice'; renderHome(); };
  }
  function confetti() {
    var c = document.createElement('div'); c.className = 'confetti';
    var colors = ['hsl(199 84% 50%)', 'hsl(43 100% 52%)', 'hsl(102 64% 45%)', 'hsl(268 70% 62%)', 'hsl(350 90% 58%)'];
    var html = '';
    for (var i = 0; i < 70; i++) {
      html += '<i style="left:' + rnd(100) + '%;background:' + colors[i % colors.length] + ';animation-duration:' + (1.6 + Math.random() * 1.6).toFixed(2) + 's;animation-delay:' + (Math.random() * 0.5).toFixed(2) + 's;transform:rotate(' + rnd(360) + 'deg)"></i>';
    }
    c.innerHTML = html; document.body.appendChild(c);
    setTimeout(function () { c.remove(); }, 4000);
  }

  /* ---------- Android back button ---------- */
  window.qBack = function () {
    if (sheetOpen) { closeSheet(); return true; }
    if (view === 'lesson') { confirmExit(); return true; }
    if (view === 'result') { L = null; renderHome(); return true; }
    if (tab !== 'path') { tab = 'path'; renderHome(); return true; }
    return false;
  };
  // When the user returns from TTS settings, refresh the profile status.
  window.qResume = function () { if (view === 'home' && tab === 'me') renderHome(); };

  window.qDebug = { setHearts: function (n) { if (L) L.hearts = n; } };

  renderHome();
})();
