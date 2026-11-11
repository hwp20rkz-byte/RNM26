/* Қазақша Ойна — детская игра для изучения казахского языка (1–3 класс).
 * Чистый JS без зависимостей: работает офлайн внутри Android WebView и в любом браузере. */
(function () {
  'use strict';

  var D = window.QDATA, W = window.QWORLD;
  var $app = document.getElementById('app');
  var KEY = 'qazaqsha-oyna-v1';
  var DAILY_GOAL = 30;
  var HEARTS = 5;
  var HOURS_RU_V = ['', 'в час', 'в два', 'в три', 'в четыре', 'в пять', 'в шесть', 'в семь', 'в восемь', 'в девять', 'в десять', 'в одиннадцать', 'в двенадцать'];
  var PRONOUNS = ['мен', 'сен', 'ол', 'сіз', 'біз', 'олар'];
  var LOC_VERBS = [
    { kk: 'тұрамын', ru: 'Я встаю', en: 'I get up' }, { kk: 'мектепке барамын', ru: 'Я иду в школу', en: 'I go to school' },
    { kk: 'ұйықтаймын', ru: 'Я ложусь спать', en: 'I go to bed' }, { kk: 'түскі ас ішемін', ru: 'Я обедаю', en: 'I have lunch' },
    { kk: 'шахмат ойнаймын', ru: 'Я играю в шахматы', en: 'I play chess' }, { kk: 'үйге келемін', ru: 'Я прихожу домой', en: 'I come home' }
  ];
  var HOURS_EN_V = ['', 'at one', 'at two', 'at three', 'at four', 'at five', 'at six', 'at seven', 'at eight', 'at nine', 'at ten', 'at eleven', 'at twelve'];

  /* ---------- helpers ---------- */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function uniqBy(a, f) { var seen = {}; return a.filter(function (x) { var k = f(x); if (seen[k]) return false; seen[k] = 1; return true; }); }
  function norm(s) { return String(s).toLowerCase().replace(/[.,!?;:«»"—–-]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function tokens(s) { return s.replace(/[.,!?;:«»"]/g, '').split(/\s+/).filter(function (t) { return t && t !== '—' && t !== '–'; }); }
  function qs(sel, el) { return (el || document).querySelector(sel); }
  function qsa(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function dayStr(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function today() { return dayStr(new Date()); }
  function yesterday() { var d = new Date(); d.setDate(d.getDate() - 1); return dayStr(d); }
  function daysAgo(n) { var d = new Date(); d.setDate(d.getDate() - n); return dayStr(d); }
  function isNumGlyph(e) { return /^[0-9₸½]/.test(e); }
  function isLabelGlyph(e) { return /^[А-Яа-яЁё]{2,3}$/.test(e); }
  function isColorGlyph(e) { return e.indexOf('c:') === 0; }
  function isTextGlyph(e) { return isNumGlyph(e) || isLabelGlyph(e); }

  /* ---------- learning mode: RU → KK or EN → KK ---------- */
  function lang() { return S && S.lang === 'en' ? 'en' : 'ru'; }
  // Translation of a content item (word, sentence, fill, unit, lesson…) into the learner's language.
  function tr(x) {
    if (!x) return '';
    if (lang() === 'en') return x.en || (D.EN && D.EN[x.ru]) || x.ru || '';
    return x.ru || '';
  }
  function locHint(v, h) { return lang() === 'en' ? v.en + ' ' + HOURS_EN_V[h] + '.' : v.ru + ' ' + HOURS_RU_V[h] + '.'; }
  function mascotLine(u) {
    if (lang() !== 'en') return u.mascot;
    return u.mascotEn || (D.MASCOT_EN && D.MASCOT_EN[u.id]) || u.mascot.split(' — ')[0];
  }

  /* ---------- state ---------- */
  function load() {
    var d = {
      xp: 0, streak: 0, lastDay: '', done: {}, name: '', dayXp: 0, dayDate: '', sound: true, lessons: 0,
      coins: 0, grade: 1, onboarded: false, heroes: ['bars'], heroSel: 'bars', stickers: {}, games: [],
      ach: {}, perfects: 0, quizBest: 0, gamesPlayed: 0, freeze: 0, bonusHearts: 0, giftDay: '', lvlSeen: 1,
      // v3 — QazaqVerse
      lang: 'ru', inv: {}, eq: { skin: '', pet: '', trail: '' }, arcade: {}, auctionSlot: '', auctionWins: 0, tossDay: '', jackpots: 0,
      xpBoostUntil: 0, xpBoost: 1, weekId: '', weekXp: 0, lgSeen: 0, spoken: 0, sttUrl: '', micOn: true,
      voice: 'iseke', topic: {}, assess: {}
    };
    var fresh = true;
    try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) { fresh = false; for (var k in s) d[k] = s[k]; } } catch (e) { /* storage blocked */ }
    if (fresh) d.heroSel = 'batyr';
    W.HEROES.forEach(function (h) { if (!h.price && d.heroes.indexOf(h.id) < 0) d.heroes.push(h.id); });
    if (!d.eq) d.eq = { skin: '', pet: '', trail: '' };
    // A streak freeze covers one missed day.
    if (d.lastDay && d.lastDay !== today() && d.lastDay !== yesterday()) {
      if (d.freeze > 0 && d.lastDay === daysAgo(2)) { d.freeze--; d.lastDay = yesterday(); } else d.streak = 0;
    }
    if (d.dayDate !== today()) { d.dayXp = 0; d.dayDate = today(); }
    W.GAMES.forEach(function (g) { if (!g.price && d.games.indexOf(g.id) < 0) d.games.push(g.id); });
    return d;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }
  var S = load();

  /* ---------- course index ---------- */
  var ALL = [], GALL = D.GRADES.map(function () { return []; });
  D.GRADES.forEach(function (g, gi) {
    g.units.forEach(function (u, ui) {
      u.n = ui + 1; u.grade = gi;
      u.lessons.forEach(function (l) { l.unit = u; ALL.push(l); GALL[gi].push(l); });
    });
  });
  var CONTENT = ALL.filter(function (l) { return !l.review; });
  var ALLWORDS = uniqBy([].concat.apply([], CONTENT.map(function (l) { return l.words || []; })), function (w) { return w.kk; });
  var ALLSENT = [].concat.apply([], CONTENT.map(function (l) { return l.sentences || []; }));
  function gIdx() { return Math.min(D.GRADES.length - 1, Math.max(0, (S.grade || 1) - 1)); }
  function unlocked(l) { var list = GALL[l.unit.grade], i = list.indexOf(l); return i === 0 || !!S.done[list[i - 1].id]; }
  function currentLesson(gi) { var list = GALL[gi]; for (var i = 0; i < list.length; i++) if (!S.done[list[i].id]) return list[i]; return null; }
  function gradeWords(gi) {
    var done = GALL[gi].filter(function (l) { return S.done[l.id] && !l.review; });
    var src = done.length >= 3 ? done : GALL[gi].filter(function (l) { return !l.review; });
    return uniqBy([].concat.apply([], src.map(function (l) { return l.words || []; })), function (w) { return w.kk; });
  }
  function level() { return Math.floor(S.xp / 100) + 1; }

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
    pair: function () { tone([784], 0.07, 'sine', 0.22); },
    coin: function () { tone([988, 1319], 0.07, 'square', 0.12); },
    pop: function () { tone([880, 440], 0.05, 'triangle', 0.2); }
  };

  /* ---------- Kazakh voice: bundled recordings first, then the phone's TTS ---------- */
  var AUD = window.QAUDIO || {}, AUD_ISEKE = window.QAUDIO_ISEKE || {};
  var curAudio = null;
  function sysKk() { try { return !!(window.Android && window.Android.ttsState && window.Android.ttsState() === 'kk'); } catch (e) { return false; } }
  var TTS = {
    // Narrator voice: ISEKE (default) or ISSAI; character lines and anything ISEKE lacks fall back to ISSAI.
    file: function (text) {
      var k = D.audioKey(text);
      if (S.voice !== 'issai' && AUD_ISEKE[k]) return 'audio-iseke/' + k;
      return AUD[k] ? 'audio/' + k : null;
    },
    remote: function (text) { return window.QVOICE && window.QVOICE.ttsUrl ? window.QVOICE.ttsUrl(text, S.voice || 'iseke') : null; },
    has: function (text) { return !!TTS.file(text) || sysKk() || !!TTS.remote(text); },
    ok: function () { return Object.keys(AUD).length > 0 || sysKk(); },
    speak: function (text, quiet) {
      var k = TTS.file(text);
      if (k) {
        try {
          if (curAudio) curAudio.pause();
          curAudio = new Audio(k + '.mp3');
          var p = curAudio.play(); if (p && p.catch) p.catch(function () { /* autoplay blocked */ });
        } catch (e) { /* ignore */ }
        return;
      }
      (window.qMissing = window.qMissing || []).push(text);
      // not bundled: the voice server's /tts (cached by the WebView forever), then the phone's own TTS
      var u = TTS.remote(text);
      if (u) {
        try {
          if (curAudio) curAudio.pause();
          curAudio = new Audio(u);
          curAudio.onerror = function () { if (sysKk()) { try { window.Android.speak(text); } catch (e) { /* ignore */ } } };
          var pr = curAudio.play(); if (pr && pr.catch) pr.catch(function () { /* autoplay blocked */ });
        } catch (e) { /* ignore */ }
        return;
      }
      if (sysKk()) { try { window.Android.speak(text); } catch (e) { /* ignore */ } return; }
      if (!quiet) toast('🔇 Для этой фразы нет озвучки');
    }
  };

  var toastT;
  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 2600);
  }

  /* ---------- heroes ---------- */
  var curHero = 'bars';
  function mascot(mood, cls) { return W.hero(curHero, mood, cls); }
  function myHero(mood, cls) { return W.hero(S.heroSel, mood, cls); }
  function heroInfo(id) { return W.HEROES.filter(function (h) { return h.id === id; })[0] || W.HEROES[0]; }

  /* ---------- analogue clock ---------- */
  function clockSVG(h, m) {
    var nums = '', ticks = '';
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
  function glyph(e) {
    if (isColorGlyph(e)) return '<span class="swatch" style="background:' + esc(e.slice(2)) + '"></span>';
    return isTextGlyph(e) ? '<span class="num">' + esc(e) + '</span>' : '<span class="em">' + esc(e) + '</span>';
  }
  function spk(text, cls) { return '<button class="spk ' + (cls || '') + '" data-say="' + esc(text) + '" aria-label="Тыңдау — прослушать">🔊</button>'; }
  function prompt(text, kk) { return '<div class="prompt">' + mascot('happy') + '<div class="say">' + (kk ? spk(text) : '') + '<span>' + esc(text) + '</span></div></div>'; }
  function bindSpeak(el) { qsa('[data-say]', el).forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); TTS.speak(b.getAttribute('data-say')); }; }); }
  function autoSay(text) { if (TTS.has(text)) setTimeout(function () { TTS.speak(text, true); }, 250); }
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
    var bad = function (x) { return x.kk === w.kk || tr(x) === tr(w) || x.e === w.e; };
    var kind = function (x) { return isColorGlyph(x.e) ? 'c' : isTextGlyph(x.e) ? 't' : 'e'; };
    var from = function (src) { return shuffle(src.filter(function (x) { return !bad(x) && kind(x) === kind(w); })); };
    var out = uniqBy(from(pool).concat(from(ALLWORDS), shuffle(ALLWORDS.filter(function (x) { return !bad(x); }))), function (x) { return x.kk; });
    out = uniqBy(uniqBy(out, function (x) { return tr(x); }), function (x) { return x.e; });
    return out.slice(0, n);
  }

  /* ---------- exercise types ---------- */
  function rowGlyph(e) { return '<span class="em' + (isTextGlyph(e) ? ' n' : '') + '">' + (isColorGlyph(e) ? glyph(e) : esc(e)) + '</span>'; }
  // 0. Word cards shown before a new lesson: learn first, then practise
  function exLearn(words, tip, extra) {
    return {
      noCheck: true, free: true,
      render: function (el, ctx) {
        el.innerHTML = '<span class="tag new">✨ Жаңа сөздер · новые слова</span><h2 class="task">Запомни слова этого урока</h2>' +
          (tip ? '<div class="tip"><b>💡 ' + (lang() === 'en' ? 'Grammar tip' : 'Подсказка') + '</b>' + esc(lang() === 'en' ? tip.en : tip.ru) + '</div>' : '') +
          '<div class="learn">' + words.map(function (w) {
            return '<div class="word-row">' + rowGlyph(w.e) + '<div class="w">' + esc(w.kk) + '<span>' + esc(tr(w)) + '</span></div>' + spk(w.kk, 'sm') + '</div>';
          }).join('') + '</div>' + learnExtras(extra) + '<button class="btn" id="learned">Түсіндім · понятно!</button>';
        bindSpeak(el);
        qs('#learned', el).onclick = function () { ctx.done({ ok: true, silent: true }); };
      }
    };
  }
  // «Есте сақта» and «Кел, жаттайық» boxes from the textbook, each with its own voice-over.
  function learnExtras(x) {
    if (!x) return '';
    var h = '';
    if (x.rule) h += '<div class="tb-box rule"><b>📌 Есте сақта!</b><p>' + esc(x.rule) + '</p>' + spk(x.rule, 'sm') + '</div>';
    if (x.poem) h += '<div class="tb-box poem"><b>🎵 Кел, жаттайық!</b><p>' + esc(x.poem.kk).replace(/\n/g, '<br>') + '</p>' + (x.poem.author ? '<i>' + esc(x.poem.author) + '</i>' : '') + spk(x.poem.kk.replace(/\n/g, ' '), 'sm') + '</div>';
    return h;
  }
  // 1. Kazakh word → pick the picture card with the Russian meaning
  function exPick(w, pool, isNew) {
    var opts, sel, el;
    return {
      render: function (root, ctx) {
        el = root; sel = -1; opts = shuffle([w].concat(distract(w, pool, 3)));
        el.innerHTML = (isNew ? '<span class="tag new">✨ Жаңа сөз · новое слово</span>' : '') +
          '<h2 class="task">Что значит «' + esc(w.kk) + '»?</h2>' + prompt(w.kk, true) +
          '<div class="cards">' + opts.map(function (o, i) { return '<button class="card" data-i="' + i + '">' + glyph(o.e) + '<span>' + esc(tr(o)) + '</span></button>'; }).join('') + '</div>';
        bindSpeak(el); autoSay(w.kk);
        selectOne(el, function (i) { sel = i; ctx.ready(true); });
      },
      check: function () {
        var right = opts.indexOf(w); markCards(el, right, sel);
        return { ok: sel === right, ans: w.kk + ' — ' + tr(w), say: w.kk };
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
          '<h2 class="task">Как по-казахски «' + esc(tr(w)) + '»?</h2>' +
          '<div class="cards">' + opts.map(function (o, i) { return '<button class="card" data-i="' + i + '">' + glyph(o.e) + '<span>' + esc(o.kk) + '</span></button>'; }).join('') + '</div>';
        selectOne(el, function (i) { sel = i; ctx.ready(true); TTS.speak(opts[i].kk, true); });
      },
      check: function () {
        var right = opts.indexOf(w); markCards(el, right, sel);
        return { ok: sel === right, ans: w.kk + ' — ' + tr(w), say: w.kk };
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
        return { ok: sel === right, ans: w.kk + ' — ' + tr(w) };
      }
    };
  }
  // 4. Match pairs — no hearts lost, finishes on its own
  function exMatch(words) {
    return {
      noCheck: true,
      render: function (el, ctx) {
        words = uniqBy(uniqBy(words, function (w) { return tr(w); }), function (w) { return w.kk; });
        var L = shuffle(words), R = shuffle(words), selL = null, selR = null, left = words.length;
        el.innerHTML = '<span class="tag">🧩 Жұптар · пары</span><h2 class="task">Найди пары</h2><div class="match">' +
          L.map(function (w, i) { return '<button class="card" data-side="L" data-k="' + esc(w.kk) + '" style="grid-column:1;grid-row:' + (i + 1) + '">' + esc(w.kk) + '</button>'; }).join('') +
          R.map(function (w, i) { return '<button class="card" data-side="R" data-k="' + esc(w.kk) + '" style="grid-column:2;grid-row:' + (i + 1) + '">' + esc(tr(w)) + '</button>'; }).join('') + '</div>';
        qsa('.card', el).forEach(function (c) {
          c.onclick = function () {
            var side = c.getAttribute('data-side');
            if (side === 'L') { selL = c; TTS.speak(c.getAttribute('data-k'), true); } else selR = c;
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
          TTS.speak(tiles[id], true);
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
        el.innerHTML = '<span class="tag">🎯 Аудар · переведи</span><h2 class="task">Переведи предложение</h2>' + prompt(tr(s), false) +
          '<div class="answer-lines"></div><div class="bank"></div>';
        draw(ctx);
      },
      check: function () {
        var got = norm(picked.map(function (id) { return tiles[id]; }).join(' '));
        var ok = [s.kk].concat(s.alt || []).some(function (v) { return norm(v) === got; });
        return { ok: ok, ans: s.kk, tr: tr(s), say: s.kk };
      }
    };
  }
  // 6. Kazakh sentence → choose the Russian translation
  function exSent(s, pool) {
    var opts, sel, el;
    return {
      render: function (root, ctx) {
        el = root; sel = -1;
        var others = uniqBy(shuffle(pool.concat(shuffle(ALLSENT))).filter(function (x) { return tr(x) !== tr(s); }), function (x) { return tr(x); }).slice(0, 2);
        opts = shuffle([s].concat(others));
        el.innerHTML = '<span class="tag">📖 Оқы · читай</span><h2 class="task">Выбери правильный перевод</h2>' + prompt(s.kk, true) +
          '<div class="cards list">' + opts.map(function (o, i) { return '<button class="card" data-i="' + i + '"><span class="idx">' + (i + 1) + '</span><span>' + esc(tr(o)) + '</span></button>'; }).join('') + '</div>';
        bindSpeak(el); autoSay(s.kk);
        selectOne(el, function (i) { sel = i; ctx.ready(true); });
      },
      check: function () {
        var right = opts.indexOf(s); markCards(el, right, sel);
        return { ok: sel === right, ans: tr(s), tr: s.kk };
      }
    };
  }
  // 7. Fill the gap (words, case endings, possessive endings, tenses)
  function exFill(f) {
    var opts, sel, el;
    var letter = !!f.letter;
    var suffix = !letter && f.pre && !/\s$/.test(f.pre) && f.ans.length <= 4;
    return {
      render: function (root, ctx) {
        el = root; sel = -1; opts = shuffle(f.opts);
        el.innerHTML = '<span class="tag">✏️ Толықтыр · дополни</span><h2 class="task">' + (letter ? 'Вставь казахскую букву' : suffix ? 'Выбери правильное окончание' : 'Заполни пропуск') + '</h2>' +
          '<div class="sentence' + (letter ? ' letter' : '') + '">' + esc(f.pre) + '<span class="gap empty' + (suffix || letter ? ' suf' : '') + '">' + esc(f.ans) + '</span>' + esc(f.post) + '<div class="hint">' + esc(tr(f)) + '</div></div>' +
          '<div class="chips">' + opts.map(function (o, i) { return '<button class="card" data-i="' + i + '">' + (suffix ? '-' : '') + esc(o) + '</button>'; }).join('') + '</div>';
        selectOne(el, function (i) {
          sel = i; var g = qs('.gap', el); g.textContent = opts[i]; g.classList.remove('empty'); ctx.ready(true);
        });
      },
      check: function () {
        var right = opts.indexOf(f.ans); markCards(el, right, sel);
        var full = f.pre + f.ans + f.post;
        return { ok: opts[sel] === f.ans, ans: full.replace(/^— /, ''), tr: tr(f), say: full.replace(/—/g, ' ') };
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
        selectOne(el, function (i) { sel = i; ctx.ready(true); TTS.speak(D.timeKk(opts[i][0], opts[i][1]), true); });
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
          '<div class="sentence">Мен <span class="gap empty">' + esc(D.hourLoc(t[0])) + '</span> ' + esc(v.kk) + '.<div class="hint">' + esc(locHint(v, t[0])) + '</div></div>' +
          '<div class="chips">' + opts.map(function (h, i) { return '<button class="card" data-i="' + i + '">' + esc(D.hourLoc(h)) + '</button>'; }).join('') + '</div>';
        selectOne(el, function (i) { sel = i; var g = qs('.gap', el); g.textContent = D.hourLoc(opts[i]); g.classList.remove('empty'); ctx.ready(true); });
      },
      check: function () {
        var right = opts.indexOf(t[0]); markCards(el, right, sel);
        var full = 'Мен ' + D.hourLoc(t[0]) + ' ' + v.kk + '.';
        return { ok: sel === right, ans: full, tr: locHint(v, t[0]), say: full };
      }
    };
  }
  // 11. Number in digits → Kazakh words
  function exNum(ranges) {
    var opts, sel, el, n;
    var range = typeof ranges[0] === 'number' ? ranges : ranges[rnd(ranges.length)];
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
        selectOne(el, function (i) { sel = i; ctx.ready(true); TTS.speak(D.numToKk(opts[i]), true); });
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
        el.innerHTML = '<span class="tag">📋 Рет · порядок</span><h2 class="task">Расставь по порядку</h2><div class="slots"></div><div class="bank"></div>';
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
    var c = { words: [], sentences: [], fills: [], clocks: [], clocksLoc: [], order: null, nums: null, affixes: [], busters: [], posts: [] };
    list.forEach(function (l) {
      c.affixes = c.affixes.concat(l.affixes || []); c.busters = c.busters.concat(l.busters || []); c.posts = c.posts.concat(l.posts || []);
      c.words = c.words.concat(l.words || []); c.sentences = c.sentences.concat(l.sentences || []);
      c.fills = c.fills.concat(l.fills || []); c.clocks = c.clocks.concat(l.clocks || []);
      c.clocksLoc = c.clocksLoc.concat(l.clocksLoc || []); if (l.order) c.order = l.order;
      if (l.nums) (c.nums = c.nums || []).push(l.nums);
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
    var N = count || 10, groups = {};
    function add(g, fn) { (groups[g] = groups[g] || []).push(function () { var e = fn(); e.kind = g; return e; }); }
    var words = shuffle(c.words || []), intro = [];
    if (words.length && !opts.noIntro) {
      intro.push(function () { var e = exPick(words[0], c.words, true); e.kind = 'pick'; return e; });
      if (words[1]) intro.push(function () { var e = exPickR(words[1], c.words, true); e.kind = 'pickR'; return e; });
    }
    words.slice(opts.noIntro ? 0 : 2).forEach(function (w, i) {
      add(i % 2 ? 'pickR' : 'pick', i % 2 ? function () { return exPickR(w, c.words); } : function () { return exPick(w, c.words); });
    });
    words.filter(function (w) { return TTS.has(w.kk); }).slice(0, 3).forEach(function (w) { add('listen', function () { return exListen(w, c.words); }); });
    (c.sentences || []).forEach(function (s) { add('build', function () { return exBuild(s, c.sentences); }); });
    shuffle(c.sentences || []).slice(0, 2).forEach(function (s) { add('sent', function () { return exSent(s, c.sentences); }); });
    (c.fills || []).forEach(function (f) { add('fill', function () { return exFill(f); }); });
    (c.clocks || []).forEach(function (t, i) {
      add(i % 3 === 2 ? 'clockR' : 'clock', i % 3 === 2 ? function () { return exClockR(t, c.clocks); } : function () { return exClock(t, c.clocks); });
    });
    (c.clocksLoc || []).forEach(function (t) { add('clockLoc', function () { return exClockLoc(t); }); });
    if (c.nums) for (var k = 0; k < 4; k++) add('num', function () { return exNum(c.nums); });
    if (c.order) add('order', function () { return exOrder(c.order); });
    if (window.Q.ext.extraEx) window.Q.ext.extraEx(c, add);     // Жалғау шебері, Қатені тап, шылаулар (src/exercises)
    if (X('voiceReady')) shuffle(c.sentences || []).slice(0, 2).forEach(function (s) { add('speak', function () { return window.Q.ext.exSpeak(s); }); });

    Object.keys(groups).forEach(function (g) { groups[g] = shuffle(groups[g]); });
    var matchable = uniqBy(c.words || [], function (w) { return tr(w); }).length >= 4 && !opts.noMatch;
    var target = N - (matchable ? 1 : 0), seq = intro.slice(), keys = Object.keys(groups), guard = 0;
    while (seq.length < target && guard++ < 50) {
      keys = shuffle(keys.filter(function (k) { return groups[k].length; }));
      if (!keys.length) break;
      for (var j = 0; j < keys.length && seq.length < target; j++) seq.push(groups[keys[j]].shift());
    }
    while (seq.length < target && words.length) {
      (function (w) { seq.push(Math.random() < 0.5 ? function () { return exPick(w, c.words); } : function () { return exPickR(w, c.words); }); })(words[rnd(words.length)]);
    }
    if (matchable) seq.splice(Math.min(3, seq.length), 0, function () { var e = exMatch(shuffle(c.words).slice(0, 5)); e.kind = 'match'; return e; });
    if (!opts.noIntro && (c.words || []).length) seq.unshift(function () { return exLearn(c.words, c.tip, c.rule || c.poem ? { rule: c.rule, poem: c.poem } : null); });
    return seq.map(function (f) { return f(); });
  }


  /* ---------- progress, coins, rewards ---------- */
  var view = 'home', tab = 'path', L = null, sheetOpen = null, rewards = [], G = null;

  function bumpStreak() {
    if (S.lastDay === today()) return false;
    S.streak = S.lastDay === yesterday() ? S.streak + 1 : 1; S.lastDay = today();
    return true;
  }
  function xpBoost() { return Date.now() < (S.xpBoostUntil || 0) ? (S.xpBoost || 2) : 1; }
  function weekId() { var d = new Date(), j = new Date(d.getFullYear(), 0, 1); return d.getFullYear() + '-' + Math.ceil(((d - j) / 864e5 + j.getDay() + 1) / 7); }
  function addXp(n) {
    n = Math.round(n * xpBoost());
    if (S.dayDate !== today()) { S.dayXp = 0; S.dayDate = today(); }
    if (S.weekId !== weekId()) { S.weekId = weekId(); S.weekXp = 0; }
    S.xp += n; S.dayXp += n; S.weekXp += n;
    return n;
  }
  function league() { var i = 0; W.LEAGUES.forEach(function (l, k) { if (S.xp >= l.xp) i = k; }); return i; }
  function vibrate(ms) { try { if (window.Android && window.Android.vibrate) window.Android.vibrate(ms); else if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* no haptics */ } }
  function X(name, arg) { var f = window.Q && window.Q.ext[name]; return f ? f(arg) : ''; }
  function addReward(r) { rewards.push(r); }
  function levelCheck() {
    while (level() > S.lvlSeen) {
      S.lvlSeen++; S.coins += 50;
      addReward({ icon: '🆙', title: S.lvlSeen + '-деңгей!', sub: 'Новый уровень! Подарок — 50 асыков.', coins: 50 });
    }
    while (league() > (S.lgSeen || 0)) {
      S.lgSeen = (S.lgSeen || 0) + 1; S.coins += 100;
      var lg = W.LEAGUES[S.lgSeen];
      addReward({ icon: lg.icon, title: lg.kk + '!', sub: 'Новая лига Шежіре! Подарок — 100 асыков.', coins: 100 });
    }
  }
  function checkAch() {
    var X = { doneCount: ALL.filter(function (l) { return S.done[l.id]; }).length, gradeDone: GALL.map(function (list) { return list.every(function (l) { return S.done[l.id]; }); }) };
    W.ACH.forEach(function (a) {
      if (!S.ach[a.id] && a.t(S, X)) {
        S.ach[a.id] = 1; S.coins += a.coins;
        addReward({ icon: a.icon, title: 'Жетістік: ' + a.kk, sub: tr(a), coins: a.coins });
      }
    });
    save();
  }
  function flushRewards() {
    if (sheetOpen || !rewards.length) return;
    var r = rewards.shift();
    sfx.win(); confetti();
    sheet('<div class="reward-ic">' + r.icon + '</div><h3>' + esc(r.title) + '</h3><p>' + esc(r.sub) + '</p>' +
      (r.coins ? '<p class="coins-big">+' + r.coins + ' 🪙</p>' : '') + '<button class="btn gold" id="rok">Керемет!</button>');
    qs('#rok').onclick = function () { closeSheet(); refresh(); flushRewards(); };
  }
  function refresh() { if (view === 'home') { var y = qs('#scroll') ? qs('#scroll').scrollTop : 0; renderHome(true); if (qs('#scroll')) qs('#scroll').scrollTop = y; } }

  function pickSticker() {
    var bag = [];
    W.STICKERS.forEach(function (s) { var w = s.r === 1 ? 6 : s.r === 2 ? 3 : 1; for (var i = 0; i < w; i++) bag.push(s); });
    return bag[rnd(bag.length)];
  }
  // Gift chest: shake → open → reveal a sticker (or coins for a duplicate).
  function openChest(title, extraCoins, stickerChance) {
    sheet('<div class="chest">🎁</div><h3>' + esc(title) + '</h3><p>Нажми, чтобы открыть!</p><button class="btn gold" id="open">Ашу · открыть</button>');
    qs('#open').onclick = function () {
      var st = Math.random() < stickerChance ? pickSticker() : null, coins = extraCoins || 0, isNew = false;
      if (st) { isNew = !S.stickers[st.id]; S.stickers[st.id] = (S.stickers[st.id] || 0) + 1; if (!isNew) coins += 15; }
      S.coins += coins; save();
      sfx.win(); confetti();
      qs('.sheet').innerHTML = (st ? '<div class="sticker-big r' + st.r + '">' + st.e + '</div><h3>' + esc(st.kk) + '</h3><p>' + esc(tr(st)) + ' · ' + '★'.repeat(st.r) + (isNew ? ' · новая наклейка!' : ' · уже есть') + '</p>' : '<div class="sticker-big">🪙</div><h3>Алтын!</h3>') +
        (coins ? '<p class="coins-big">+' + coins + ' 🪙</p>' : '') + '<button class="btn gold" id="rok">Керемет!</button>';
      qs('#rok').onclick = function () { closeSheet(); checkAch(); refresh(); flushRewards(); };
    };
  }
  function buy(price, what, fn) {
    if (S.coins < price) { sfx.bad(); toast('Алтын жетпейді: нужно ' + price + ' 🪙, а у тебя ' + S.coins + ' 🪙. Проходи уроки и игры!'); return; }
    sheet(myHero('wow') + '<h3>' + esc(what) + '</h3><p>Купить за <b>' + price + ' 🪙</b>?</p>' +
      '<button class="btn ok" id="yes">Сатып алу · купить</button><button class="btn ghost" id="no">Жоқ · нет</button>');
    qs('#yes').onclick = function () { S.coins -= price; sfx.coin(); fn(); save(); closeSheet(); checkAch(); refresh(); flushRewards(); };
    qs('#no').onclick = closeSheet;
  }

  /* ---------- shell ---------- */
  function topbar() {
    return '<header class="topbar"><div class="brand">' + myHero('happy') + '<span>QazaqVerse</span></div><div class="stats">' +
      '<span class="stat fire" title="Дней подряд"><span class="ico">🔥</span>' + S.streak + '</span>' +
      '<span class="stat coin" title="Монеты"><span class="ico">🪙</span>' + S.coins + '</span>' +
      '<span class="stat xp" title="Очки опыта"><span class="ico">⚡</span>' + S.xp + '</span></div></header>';
  }
  function nav() {
    var items = [['path', '🏠', 'Жол'], ['games', '🎮', 'Ойындар'], ['shop', '🛍️', 'Дүкен'], ['dict', '📖', 'Сөздік'], ['me', '🧒', 'Мен']];
    return '<nav class="nav">' + items.map(function (it) { return '<button data-tab="' + it[0] + '" class="' + (tab === it[0] ? 'on' : '') + '"><span class="ico">' + it[1] + '</span>' + it[2] + '</button>'; }).join('') + '</nav>';
  }
  function gradeSwitch() {
    return '<div class="seg">' + D.GRADES.map(function (g) { return '<button data-grade="' + g.n + '" class="' + (S.grade === g.n ? 'on' : '') + '">' + g.kk + '</button>'; }).join('') + '</div>';
  }
  function langSwitch() {
    return '<div class="seg two">' + [['ru', 'Русский → Қазақша'], ['en', 'English → Қазақша']].map(function (l) { return '<button data-lang="' + l[0] + '" class="' + (lang() === l[0] ? 'on' : '') + '">' + l[1] + '</button>'; }).join('') + '</div>';
  }
  function renderHome(keep) {
    view = 'home';
    var body = tab === 'dict' ? dictPage() : tab === 'games' ? gamesPage() : tab === 'shop' ? shopPage() : tab === 'me' ? mePage() : pathPage();
    $app.innerHTML = topbar() + '<main class="scroll" id="scroll">' + body + '</main>' + nav();
    qsa('[data-tab]').forEach(function (b) { b.onclick = function () { sfx.tap(); tab = b.getAttribute('data-tab'); renderHome(); }; });
    qsa('[data-voice]').forEach(function (b) { b.onclick = function () { S.voice = b.getAttribute('data-voice'); save(); TTS.speak('Сәлем! Мен сенің дауысыңмын.'); refresh(); }; });
    qsa('[data-lang]').forEach(function (b) { b.onclick = function () { sfx.tap(); S.lang = b.getAttribute('data-lang'); save(); renderHome(true); }; });
    qsa('[data-grade]').forEach(function (b) { b.onclick = function () { sfx.tap(); S.grade = +b.getAttribute('data-grade'); save(); renderHome(); }; });
    bindSpeak($app);
    if (tab === 'path') { bindPath(keep); X('bindHome'); }
    if (tab === 'games') bindGames();
    if (tab === 'shop') bindShop();
    if (tab === 'me') bindMe();
    if (!S.onboarded) onboarding(); else flushRewards();
  }

  /* ---------- path ---------- */
  function pathPage() {
    var gi = gIdx(), cur = currentLesson(gi);
    var goal = Math.min(100, Math.round(S.dayXp / DAILY_GOAL * 100));
    var lv = level(), lvPct = S.xp % 100;
    var gift = S.giftDay !== today();
    var html = '<div class="pad">' + gradeSwitch() + '</div>' +
      '<section class="hero">' + myHero(goal >= 100 ? 'wow' : 'happy') + '<div style="flex:1"><h1>Сәлем, ' + esc(S.name || 'досым') + '!</h1>' +
      '<p>' + (goal >= 100 ? 'Цель на сегодня выполнена! 🎉' : 'Цель на сегодня: ' + S.dayXp + ' / ' + DAILY_GOAL + ' ⚡') + '</p>' +
      '<div class="goal"><i style="width:' + goal + '%"></i></div>' +
      '<p class="lv">' + lv + '-деңгей · уровень ' + lv + ' <span>' + lvPct + '/100</span></p><div class="goal thin"><i style="width:' + lvPct + '%;background:hsl(0 0% 100%)"></i></div>' +
      '</div></section>' +
      (gift ? '<div class="pad"><button class="btn gold gift-btn" id="gift">🎁 Күнделікті сыйлық · подарок дня</button></div>' : '') + X('homeCard');
    D.GRADES[gi].units.forEach(function (u) {
      var uc = 'var(--u-' + u.hue + ')', ucd = 'var(--u-' + u.hue + '-d)';
      html += '<section class="unit" style="--uc:' + uc + ';--ucd:' + ucd + '"><div class="unit-head"><div><small>' + u.n + '-бөлім</small><b>' + esc(u.kk) + '</b><div class="sub">' + esc(tr(u)) + '</div></div>' + W.hero(u.hero, 'happy', 'uh') + '</div><div class="path">';
      u.lessons.forEach(function (l, i) {
        var done = S.done[l.id], open = unlocked(l), isCur = l === cur;
        var x = Math.round(Math.sin((i + u.n) * 1.3) * 64);
        html += '<div class="node-wrap' + (isCur ? ' current' : '') + '" style="transform:translateX(' + x + 'px)">' +
          (isCur ? '<span class="start-tip">БАСТАУ!</span>' : '') +
          '<button class="node' + (done ? ' done' : '') + (open ? '' : ' locked') + (l.review ? ' review' : '') + '" data-l="' + l.id + '" aria-label="' + esc(l.kk) + '">' +
          (isCur ? '<span class="ring"></span>' : '') + '<span>' + (open ? (done ? (l.review ? '🏆' : '⭐') : l.icon) : '🔒') + '</span></button>' +
          '<div class="stars">' + (done ? '⭐'.repeat(done) : '') + '</div>' +
          '<div class="node-label">' + esc(l.kk) + '<em>' + esc(tr(l)) + '</em></div></div>';
      });
      html += '</div><div class="mascot-row">' + W.hero(u.hero, 'happy') + '<div class="bubble">' + esc(mascotLine(u)) + '</div></div></section>';
    });
    return html + '<div style="height:24px"></div>';
  }
  function bindPath(keep) {
    qsa('[data-l]').forEach(function (b) {
      b.onclick = function () {
        var l = ALL.filter(function (x) { return x.id === b.getAttribute('data-l'); })[0];
        if (!unlocked(l)) { sfx.bad(); toast('🔒 Сначала пройди предыдущий урок'); return; }
        sfx.tap(); lessonSheet(l);
      };
    });
    var g = qs('#gift');
    if (g) g.onclick = function () { S.giftDay = today(); save(); openChest('Күнделікті сыйлық', 10 + rnd(31), 0.35); };
    var first = GALL[gIdx()][0];
    if (!keep && S.done[first.id]) {
      var cur = qs('.node-wrap.current');
      if (cur && cur.scrollIntoView) setTimeout(function () { cur.scrollIntoView({ block: 'center' }); }, 30);
    }
  }
  function lessonSheet(l) {
    var done = S.done[l.id];
    sheet(W.hero(l.unit.hero, 'wow') + '<div style="font-size:40px">' + l.icon + '</div><h3>' + esc(l.kk) + '</h3><p>' + esc(tr(l)) + (done ? ' · ' + '⭐'.repeat(done) : '') + '</p>' +
      (l.page ? '<p class="muted">📖 Оқулық, ' + l.page + '-бет</p>' : '') +
      (l.game && D.TOPIC_GAMES[l.game] ? '<p class="muted">🎮 ' + esc(D.TOPIC_GAMES[l.game].kk) + (S.done[l.id] ? '' : ' — откроется после урока') + '</p>' : '') +
      (l.boss ? '<p class="muted">⏱ ' + Math.round(l.boss.seconds / 60) + ' мин · ' + l.boss.hearts + ' ❤️ · чекпоинт</p>' : '') + '<p class="muted">' + (l.assess ? '14 заданий по модулю · оценка 2–5 · +30 🪙' : l.review ? '12 заданий из всех тем класса · +30 🪙' : '10 заданий · ' + (HEARTS + S.bonusHearts) + ' ❤️ · до +20 🪙') + '</p>' +
      '<button class="btn ' + (done ? 'gold' : 'ok') + '" id="go">' + (done ? 'Қайталау · повторить' : 'Бастау · начать') + '</button>' +
      '<button class="btn ghost" id="cancel">Жабу · закрыть</button>');
    qs('#go').onclick = function () { closeSheet(); startLesson(l); };
    qs('#cancel').onclick = closeSheet;
  }

  /* ---------- dictionary ---------- */
  function dictPage() {
    var gi = gIdx();
    var html = '<div class="page">' + gradeSwitch() + '<p class="muted">Нажми 🔊, чтобы послушать слово.</p>';
    D.GRADES[gi].units.forEach(function (u) {
      var words = uniqBy([].concat.apply([], u.lessons.map(function (l) { return l.words || []; })), function (w) { return w.kk; });
      if (!words.length) return;
      html += '<h2>' + esc(u.kk) + ' · <span class="muted" style="font-size:inherit">' + esc(tr(u)) + '</span></h2>';
      words.forEach(function (w) {
        html += '<div class="word-row"><span class="em' + (isTextGlyph(w.e) ? ' n' : '') + '">' + (isColorGlyph(w.e) ? glyph(w.e) : esc(w.e)) + '</span><div class="w">' + esc(w.kk) + '<span>' + esc(tr(w)) + '</span></div>' + spk(w.kk, 'sm') + '</div>';
      });
    });
    return html + '</div>';
  }

  /* ---------- thematic games (textbook track) ---------- */
  function topicGamesHtml() {
    var tb = D.GRADES.filter(function (g) { return g.textbook; })[0];
    if (!tb) return '';
    var h = '<h2>Оқулық ойындары · по темам учебника</h2><div class="tg-list">';
    tb.units.forEach(function (u) {
      u.lessons.forEach(function (l, i) {
        var g = l.game && D.TOPIC_GAMES[l.game]; if (!g) return;
        var open = !!S.done[l.id], best = S.topic[l.game];
        h += '<button class="tg-row' + (open ? '' : ' locked') + '" data-tg="' + l.game + '" data-tl="' + l.id + '"><span class="e">' + (open ? g.icon : '🔒') + '</span><span><b>' + esc(g.kk) + '</b><small>' + esc(u.module + '.' + (i + 1) + ' ' + l.kk) + '</small></span>' +
          (best != null ? '<span class="pill ok">' + best + '%</span>' : open ? '<span class="pill">▶</span>' : '') + '</button>';
      });
    });
    return h + '</div>';
  }

  /* ---------- games tab ---------- */
  function gamesPage() {
    var gi = gIdx();
    var html = '<div class="page">' + X('gamesTop') + gradeSwitch() +
      '<div class="hero" style="margin:0">' + myHero('wow') + '<div><h1>Ойындар</h1><p>Слова раздела «' + esc(D.GRADES[gi].kk) + '». Играй и зарабатывай 🪙</p></div></div>' +
      (window.QSUITE ? '<button class="suite-card" id="suite3d"><span class="em">🔮</span><span><b>3D-зал · Неостепь</b><small>Септік тотемі — 7 падежей и жіктік в 3D</small></span><span class="pill ok">β</span></button>' : '') +
      '<div class="game-grid">';
    W.GAMES.forEach(function (g) {
      var own = S.games.indexOf(g.id) >= 0;
      html += '<button class="game-card' + (own ? '' : ' locked') + '" data-game="' + g.id + '"><span class="gi">' + g.icon + '</span><b>' + esc(g.kk) + '</b><span class="muted">' + esc(tr(g)) + '</span>' +
        (own ? '<span class="pill ok">Ойнау ▶</span>' : '<span class="pill">🔒 ' + g.price + ' 🪙</span>') + '</button>';
    });
    html += '</div>' + topicGamesHtml() + '<h2>Жаттығулар · тренировки</h2>';
    var items = [
      ['mix', '🏋️', 'Аралас жаттығу', 'Смешанная тренировка из пройденного'],
      ['clock', '🕐', 'Сағат неше?', 'Часы и время'],
      ['num', '🔢', 'Сандар', 'Числа до двух тысяч'],
      ['build', '🧱', 'Сөйлем құра', 'Собери предложения из слов'],
      ['listen', '🎧', 'Тыңда', 'Слушай и выбирай']
    ];
    return html + items.map(function (it) {
      return '<button class="card" data-p="' + it[0] + '" style="flex-direction:row;justify-content:flex-start;text-align:left;gap:16px"><span class="em">' + it[1] + '</span><span><b style="display:block;font-size:var(--fs-3)">' + it[2] + '</b><span class="muted">' + it[3] + '</span></span></button>';
    }).join('') + '</div>';
  }
  function bindGames() {
    qsa('[data-game]').forEach(function (b) {
      b.onclick = function () {
        var g = W.GAMES.filter(function (x) { return x.id === b.getAttribute('data-game'); })[0];
        if (S.games.indexOf(g.id) >= 0) { sfx.tap(); startGame(g.id); return; }
        buy(g.price, 'Ойын «' + g.kk + '»', function () { S.games.push(g.id); });
      };
    });
    qsa('[data-p]').forEach(function (b) { b.onclick = function () { sfx.tap(); startPractice(b.getAttribute('data-p')); }; });
    var s3 = qs('#suite3d'); if (s3) s3.onclick = function () { sfx.tap(); save(); window.location.href = 'suite/index.html#/games/totem-cases'; };
    qsa('[data-tg]').forEach(function (b) {
      b.onclick = function () {
        if (!S.done[b.getAttribute('data-tl')]) { sfx.bad(); toast('🔒 Сначала пройди урок — игра закрепляет его материал'); return; }
        sfx.tap(); startGame(b.getAttribute('data-tg'));
      };
    });
    X('bindGames');
  }
  function startPractice(mode) {
    var gi = gIdx();
    var doneL = GALL[gi].filter(function (l) { return S.done[l.id] && !l.review; });
    if (!doneL.length) doneL = [GALL[gi][0]];
    var exs;
    curHero = S.heroSel;
    if (mode === 'clock') {
      exs = genLesson({ clocks: randTimes(8, false).concat(randTimes(6, true)), clocksLoc: randTimes(3, false) }, 10, { noIntro: true, noMatch: true });
    } else if (mode === 'num') {
      exs = []; for (var i = 0; i < 10; i++) exs.push(exNum(D.NUM_RANGES[i < 4 ? 0 : i < 7 ? 1 : 2]));
    } else if (mode === 'build') {
      var ss = [].concat.apply([], doneL.map(function (l) { return l.sentences || []; }));
      if (ss.length < 4) ss = [].concat.apply([], GALL[gi].map(function (l) { return l.sentences || []; }));
      exs = shuffle(ss).slice(0, 8).map(function (s) { return exBuild(s, ss); });
    } else if (mode === 'listen') {
      var ws = shuffle(gradeWords(gi).filter(function (w) { return TTS.has(w.kk); }));
      if (ws.length < 4) { toast('Нет озвучки для этих слов'); return; }
      exs = ws.slice(0, 10).map(function (w) { return exListen(w, ws); });
    } else {
      exs = genLesson(contentOf(doneL), 10, { noIntro: true });
    }
    startLesson({ id: 'practice', kk: 'Жаттығу', ru: 'Тренировка', icon: '🏋️', practice: true }, exs);
  }

  /* ---------- shop ---------- */
  function shopPage() {
    var html = '<div class="page"><div class="balance">' + myHero('wow') + '<div><small>Алтын асық · золотые асыки</small><b>' + S.coins + ' 🪙</b></div></div>' +
      X('shopTop') + '<button class="shop-gift" id="box"><span class="chest-sm">🎁</span><span><b>Сыйлық қорабы</b><span class="muted">Случайная наклейка для альбома</span></span><span class="pill">' + W.SHOP.giftBox + ' 🪙</span></button>' +
      '<h2>Кейіпкерлер · герои</h2><div class="hero-grid">';
    W.HEROES.forEach(function (h) {
      var own = S.heroes.indexOf(h.id) >= 0, sel = S.heroSel === h.id;
      html += '<button class="hero-card' + (sel ? ' sel' : '') + (own ? '' : ' locked') + '" data-hero="' + h.id + '">' + W.hero(h.id, sel ? 'wow' : 'happy') +
        '<b>' + esc(h.kk) + '</b><span class="muted">' + esc(tr(h)) + '</span>' +
        '<span class="pill' + (own ? ' ok' : '') + '">' + (sel ? '✓ Сенің досың' : own ? 'Таңдау' : h.price + ' 🪙') + '</span></button>';
    });
    html += '</div><h2>Ойындар · игры</h2>';
    W.GAMES.filter(function (g) { return g.price; }).forEach(function (g) {
      var own = S.games.indexOf(g.id) >= 0;
      html += '<button class="shop-row" data-sgame="' + g.id + '"' + (own ? ' disabled' : '') + '><span class="em">' + g.icon + '</span><span><b>' + esc(g.kk) + '</b><span class="muted">' + esc(tr(g)) + '</span></span><span class="pill' + (own ? ' ok' : '') + '">' + (own ? 'Ашық ✓' : g.price + ' 🪙') + '</span></button>';
    });
    html += '<h2>Бонустар</h2>' +
      '<button class="shop-row" id="bhearts"><span class="em">❤️</span><span><b>+2 жүрек</b><span class="muted">Два лишних сердечка на следующий урок (сейчас: +' + S.bonusHearts + ')</span></span><span class="pill">' + W.SHOP.hearts + ' 🪙</span></button>' +
      '<button class="shop-row" id="bfreeze"' + (S.freeze >= W.SHOP.maxFreeze ? ' disabled' : '') + '><span class="em">🧊</span><span><b>Серияны қорғау</b><span class="muted">Сохранит серию 🔥, если пропустишь один день (есть: ' + S.freeze + ' из ' + W.SHOP.maxFreeze + ')</span></span><span class="pill">' + W.SHOP.freeze + ' 🪙</span></button>' +
      X('shopBottom') + '<h2>Стикерлер · наклейки</h2>' + albumHtml() + '</div>';
    return html;
  }
  function albumHtml() {
    var n = Object.keys(S.stickers).length;
    return '<p class="muted">Собрано ' + n + ' из ' + W.STICKERS.length + '. Наклейки выпадают из подарков.</p><div class="album">' + W.STICKERS.map(function (s) {
      var c = S.stickers[s.id];
      return '<div class="stk' + (c ? ' r' + s.r : ' off') + '"><span class="e">' + (c ? s.e : '❔') + '</span><span class="n">' + (c ? esc(s.kk) : '???') + '</span>' + (c > 1 ? '<i>×' + c + '</i>' : '') + '</div>';
    }).join('') + '</div>';
  }
  function bindShop() {
    qs('#box').onclick = function () { buy(W.SHOP.giftBox, 'Сыйлық қорабы', function () { setTimeout(function () { openChest('Сыйлық қорабы', 0, 1); }, 50); }); };
    qsa('[data-hero]').forEach(function (b) {
      b.onclick = function () {
        var h = heroInfo(b.getAttribute('data-hero'));
        if (S.heroes.indexOf(h.id) >= 0) { S.heroSel = h.id; save(); sfx.pair(); toast(h.kk + ': ' + (lang() === 'en' ? h.sayEn : h.say)); refresh(); return; }
        buy(h.price, 'Кейіпкер: ' + h.kk + ' (' + tr(h) + ')', function () { S.heroes.push(h.id); S.heroSel = h.id; });
      };
    });
    qsa('[data-sgame]').forEach(function (b) {
      b.onclick = function () { var g = W.GAMES.filter(function (x) { return x.id === b.getAttribute('data-sgame'); })[0]; buy(g.price, 'Ойын «' + g.kk + '»', function () { S.games.push(g.id); }); };
    });
    qs('#bhearts').onclick = function () { buy(W.SHOP.hearts, '+2 жүрек', function () { S.bonusHearts += 2; }); };
    qs('#bfreeze').onclick = function () { buy(W.SHOP.freeze, 'Серияны қорғау', function () { S.freeze++; }); };
    X('bindShop');
  }

  /* ---------- profile ---------- */
  function mePage() {
    var lessonsDone = ALL.filter(function (l) { return S.done[l.id]; }).length;
    var stars = ALL.reduce(function (a, l) { return a + (S.done[l.id] || 0); }, 0);
    var android = !!(window.Android && window.Android.openTtsSettings);
    var nAud = Object.keys(AUD).length;
    return '<div class="page"><div class="me-head">' + myHero('wow') +
      '<div style="flex:1"><h2 style="margin:0">' + esc(S.name || 'Досым') + '</h2><span class="muted">' + level() + '-деңгей · ' + esc(heroInfo(S.heroSel).kk) + ' — сенің досың</span></div></div>' +
      '<label class="muted" for="nm">Атың кім? — Как тебя зовут?</label><input id="nm" class="name" maxlength="24" value="' + esc(S.name) + '" placeholder="Например, Айгерім" autocomplete="off">' +
      '<label class="muted">Нешінші сынып? — В каком ты классе?</label>' + gradeSwitch() +
      '<label class="muted">Оқу режимі — режим обучения</label>' + langSwitch() +
      '<label class="muted">Дауыс — голос диктора</label><div class="seg two">' + [['iseke', '🎙️ ISEKE'], ['issai', '🎙️ ISSAI']].map(function (v) { return '<button data-voice="' + v[0] + '" class="' + ((S.voice || 'iseke') === v[0] ? 'on' : '') + '">' + v[1] + '</button>'; }).join('') + '</div>' +
      '<div class="kpis">' +
      '<div class="kpi"><span class="ico">⚡</span><div><b>' + S.xp + '</b><span>Шежіре XP</span></div></div>' +
      '<div class="kpi"><span class="ico">🪙</span><div><b>' + S.coins + '</b><span>алтын асық</span></div></div>' +
      '<div class="kpi"><span class="ico">🔥</span><div><b>' + S.streak + '</b><span>дней подряд</span></div></div>' +
      '<div class="kpi"><span class="ico">📘</span><div><b>' + lessonsDone + ' / ' + ALL.length + '</b><span>уроков</span></div></div>' +
      '<div class="kpi"><span class="ico">⭐</span><div><b>' + stars + '</b><span>звёзд</span></div></div>' +
      '<div class="kpi"><span class="ico">🎮</span><div><b>' + S.gamesPlayed + '</b><span>игр сыграно</span></div></div></div>' +
      teacherSheet() + X('meTop') + '<h2>Жетістіктер · достижения</h2><div class="ach">' + W.ACH.map(function (a) {
        return '<div class="a' + (S.ach[a.id] ? ' on' : '') + '"><span class="i">' + a.icon + '</span><b>' + esc(a.kk) + '</b><span>' + esc(tr(a)) + '</span><i>+' + a.coins + ' 🪙</i></div>';
      }).join('') + '</div>' +
      '<h2>Стикер альбомы</h2>' + albumHtml() +
      '<div class="panel" style="display:flex;flex-direction:column;gap:16px">' +
      '<button class="btn ghost" id="snd">' + (S.sound ? '🔔 Звуки: включены' : '🔕 Звуки: выключены') + '</button>' +
      '<div><b>🗣️ Казахская озвучка: ' + (nAud ? '✅ встроена (' + nAud + ' фраз)' : sysKk() ? '✅ голос телефона' : '❌ нет') + '</b>' +
      '<p class="muted" style="margin:8px 0 0">Озвучка: ISSAI KazakhTTS2 (CC BY 4.0) и ISEKE (Piper), синтез Piper. Работает без интернета на любом телефоне, включая Huawei.</p></div>' +
      (android ? '<button class="btn ghost" id="ttsset">⚙️ Системный синтез речи</button>' : '') + '</div>' +
      '<button class="btn ghost" id="reset" style="color:var(--bad-d)">Начать заново</button>' +
      '<p class="muted" style="text-align:center">QazaqVerse: Tíl Quest · v3.4 · темы по программе «Қазақ тілі» для 1–3 классов и живая речь.</p></div>';
  }
  function bindMe() {
    var nm = qs('#nm');
    nm.oninput = function () { S.name = nm.value.trim().slice(0, 24); save(); };
    qs('#snd').onclick = function () { S.sound = !S.sound; save(); sfx.tap(); refresh(); };
    X('bindMe');
    var ts = qs('#ttsset'); if (ts) ts.onclick = function () { try { window.Android.openTtsSettings(); } catch (e) { /* ignore */ } };
    qs('#reset').onclick = function () {
      sheet(myHero('sad') + '<h3>Начать заново?</h3><p>Все очки, асыки, герои, наклейки, скины и уроки будут сброшены.</p>' +
        '<button class="btn bad" id="yes">Да, сбросить</button><button class="btn ghost" id="no">Нет</button>');
      qs('#yes').onclick = function () { var n = S.name, g = S.grade; try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } S = load(); S.name = n; S.grade = g; S.onboarded = true; save(); closeSheet(); tab = 'path'; renderHome(); };
      qs('#no').onclick = closeSheet;
    };
  }

  function onboarding() {
    if (sheetOpen) return;
    sheet(W.hero('batyr', 'wow') + '<h3>QazaqVerse: Tíl Quest</h3><p>Сәлем! Давай учить казахский вместе!</p>' + langSwitch() +
      '<input id="onm" class="name" maxlength="24" placeholder="Атың кім? — Как тебя зовут?" value="' + esc(S.name) + '">' +
      '<p class="muted">Нешінші сыныпта оқисың? — В каком ты классе?</p>' +
      '<div class="seg big">' + D.GRADES.map(function (g) { return '<button data-og="' + g.n + '">' + g.kk + '</button>'; }).join('') + '</div>');
    qsa('.sheet [data-lang]').forEach(function (b) { b.onclick = function () { S.lang = b.getAttribute('data-lang'); S.name = qs('#onm').value.trim().slice(0, 24); save(); closeSheet(); onboarding(); }; });
    qsa('[data-og]').forEach(function (b) {
      b.onclick = function () {
        S.name = qs('#onm').value.trim().slice(0, 24); S.grade = +b.getAttribute('data-og'); S.onboarded = true;
        S.coins += 50; addReward({ icon: '🎁', title: 'Қош келдің!', sub: 'Добро пожаловать! Вот 50 золотых асыков для базара.', coins: 50 });
        save(); closeSheet(); renderHome();
      };
    });
  }

  /* ---------- sheet ---------- */
  function sheet(inner) {
    closeSheet();
    var bg = document.createElement('div');
    bg.className = 'sheet-bg';
    bg.innerHTML = '<div class="sheet" role="dialog">' + inner + '</div>';
    document.body.appendChild(bg);
    sheetOpen = bg;
  }
  function closeSheet() { if (sheetOpen) { sheetOpen.remove(); sheetOpen = null; } }

  /* ---------- lesson runner ---------- */
  function startLesson(lesson, exs) {
    if (lesson.unit) curHero = lesson.unit.hero;
    if (!exs) {
      if (lesson.review) exs = genLesson(contentOf((lesson.unit.module ? lesson.unit.lessons : GALL[lesson.unit.grade]).filter(function (l) { return !l.review; })), lesson.assess ? 14 : 12, { noIntro: true });
      else exs = genLesson(lesson, 10);
    }
    var boss = lesson.boss, hearts = boss ? boss.hearts : HEARTS + S.bonusHearts;
    if (!boss) S.bonusHearts = 0;
    save();
    exs.forEach(function (e, i) { e._id = 't' + i; });
    L = { lesson: lesson, q: exs, i: 0, total: exs.filter(function (e) { return !e.free; }).length, good: 0, mistakes: 0, hearts: hearts, retried: [] };
    // LessonEngine (src/engine): combo multiplier, mistake categories, boss time limit
    if (window.QLE) {
      var eng = L.eng = new window.QLE.LessonEngine({ total: L.total, hearts: hearts, seconds: boss ? boss.seconds : 0 });
      if (eng.timed) {
        var tm = setInterval(function () {
          if (!L || L.eng !== eng) return clearInterval(tm);
          var t = qs('#ltimer'), ms = eng.remainingMs();
          if (t) { t.textContent = '⏱ ' + Math.floor(ms / 60000) + ':' + ('0' + Math.floor(ms / 1000) % 60).slice(-2); t.classList.toggle('low', ms < 30000); }
          if (eng.tick() === 'timeup') { clearInterval(tm); timeUp(); }
        }, 500);
      }
    }
    renderLesson();
  }
  function renderLesson() {
    view = 'lesson';
    var pct = Math.round(L.good / L.total * 100);
    $app.innerHTML = '<div class="lesson"><div class="l-top"><button class="x" id="lx" aria-label="Выйти">✕</button>' +
      '<div class="bar"><i style="width:' + pct + '%"></i></div>' + ((L.combo || 0) >= 3 ? '<span class="stat fire">🔥' + L.combo + (L.mult > 1 ? ' ×' + L.mult : '') + '</span>' : '') + (L.eng && L.eng.timed ? '<span class="stat timer" id="ltimer">⏱</span>' : '') + '<span class="stat heart"><span class="ico">❤️</span>' + L.hearts + '</span></div>' +
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
    if (r.neutral) {                 // e.g. the recogniser did not understand: no heart lost, nothing to repeat
      lb.style.pointerEvents = 'none'; lf.style.display = ''; lf.className = 'l-foot';
      lf.innerHTML = '<div class="fb"><span class="ic">💬</span><div><h3>' + esc(r.title || 'Жарайды!') + '</h3><p>' + esc(r.ans) + '</p>' + (r.tr ? '<p class="tr">' + esc(r.tr) + '</p>' : '') +
        '<p class="tr">Сердечко не потеряно: микрофон иногда ошибается.</p></div></div><button class="btn" id="next">Жалғастыру</button>';
      qs('#next').onclick = next;
      return;
    }
    lb.style.pointerEvents = 'none';
    qsa('[data-say]', lb).forEach(function (b) { b.style.pointerEvents = 'auto'; });
    lf.style.display = '';
    if (L.eng && L.eng.phase === 'question') { var er = L.eng.answer(ex._id || ('x' + L.i), ex.kind || 'pick', !!r.ok); L.mult = er.multiplier; }
    if (r.ok) {
      if (!ex._counted) { L.good++; ex._counted = true; }
      sfx.ok();
      L.combo = (L.combo || 0) + 1;
      if (L.combo === 5 || L.combo === 10) comboPop(L.combo);
      if (r.say) setTimeout(function () { TTS.speak(r.say, true); }, 150);
    } else {
      sfx.bad(); L.mistakes++; L.hearts--; L.combo = 0; ex._missed = true;
      if (L.retried.indexOf(ex) < 0) { L.retried.push(ex); L.q.push(ex); }
      var hb = qs('.stat.heart'); if (hb) { hb.innerHTML = '<span class="ico">💔</span>' + L.hearts; hb.classList.add('shake'); }
    }
    qs('.bar > i').style.width = Math.round(L.good / L.total * 100) + '%';
    var praise = D.PRAISE[rnd(D.PRAISE.length)];
    lf.className = 'l-foot ' + (r.ok ? 'good' : 'fail');
    lf.innerHTML = '<div class="fb"><span class="ic">' + (r.ok ? '✅' : '❌') + '</span><div>' +
      (r.ok ? '<h3>' + praise[0] + '</h3><p class="tr">' + praise[1] + '</p>' + (r.tr ? '<p>' + esc(r.ans) + '</p><p class="tr">' + esc(r.tr) + '</p>' : '')
        : '<h3>Дұрыс жауап:</h3><p>' + esc(r.ans) + '</p>' + (r.tr ? '<p class="tr">' + esc(r.tr) + '</p>' : '') + (r.why ? '<p class="why">💡 ' + esc(r.why) + '</p>' : '') + '<p class="tr">Ничего страшного — это задание вернётся в конце.</p>') +
      '</div></div><button class="btn ' + (r.ok ? 'ok' : 'bad') + '" id="next">Жалғастыру</button>';
    qs('#next').onclick = next;
  }
  // 5 in a row → a cheer; 10 in a row → the hero's signature «Shattyq Slam» and bonus asyks.
  function comboPop(n) {
    var big = n >= 10, h = heroInfo(curHero), line = W.LINES[curHero] ? W.LINES[curHero].combo : W.LINES.batyr.combo;
    var p = document.createElement('div'); p.className = 'combo-pop' + (big ? ' big' : '');
    p.innerHTML = mascot('wow') + '<div><b>🔥 ×' + n + (big ? ' · Shattyq Slam!' : '') + '</b><span>' + esc(big ? line.kk : 'Керемет! Так держать!') + (big ? ' +5 🪙' : '') + '</span></div>';
    document.body.appendChild(p);
    if (big) { S.coins += 5; save(); vibrate(60); setTimeout(function () { TTS.speak(line.kk, true); }, 500); }
    setTimeout(function () { p.remove(); }, big ? 2200 : 1500);
    return h;
  }
  function next() {
    sfx.tap();
    if (L.hearts <= 0) return outOfHearts();
    L.i++;
    if (L.eng) { L.eng.next(L.i < L.q.length); if (L.eng.phase === 'timeup') return timeUp(); }
    if (L.i >= L.q.length) return finish();
    renderLesson();
  }
  function confirmExit() {
    sheet(mascot('sad') + '<h3>Шынымен шығасың ба?</h3><p>Правда выйти? Прогресс этого урока пропадёт.</p>' +
      '<button class="btn" id="stay">Оқуды жалғастыру · учиться дальше</button><button class="btn ghost" id="quit" style="color:var(--bad-d)">Шығу · выйти</button>');
    qs('#stay').onclick = closeSheet;
    qs('#quit').onclick = function () { var p = L && L.lesson.practice; closeSheet(); L = null; if (p) tab = 'games'; renderHome(); };
  }
  function timeUp() {
    if (!L || view !== 'lesson') return;
    var lesson = L.lesson, sm = L.eng ? L.eng.summary() : null;
    sheet(mascot('sad') + '<h3>Уақыт бітті ⏰</h3><p>Время вышло. Чекпоинт не пройден' + (sm ? ': с первой попытки ' + sm.firstTry + ' из ' + sm.total : '') + '. Повтори уроки модуля и попробуй ещё раз!</p>' +
      '<button class="btn ok" id="again">Қайтадан · ещё раз</button><button class="btn ghost" id="home">Шығу · выйти</button>');
    qs('#again').onclick = function () { closeSheet(); startLesson(lesson); };
    qs('#home').onclick = function () { closeSheet(); L = null; renderHome(); };
  }
  function outOfHearts() {
    var lesson = L.lesson;
    sheet(mascot('sad') + '<h3>Жүректер бітті 💔</h3><p>Сердечки закончились. Не грусти — попробуй ещё раз! В магазине можно купить +2 ❤️.</p>' +
      '<button class="btn ok" id="again">Қайтадан · ещё раз</button><button class="btn ghost" id="home">Шығу · выйти</button>');
    qs('#again').onclick = function () { closeSheet(); if (lesson.practice) { L = null; tab = 'games'; renderHome(); } else startLesson(lesson); };
    qs('#home').onclick = function () { closeSheet(); L = null; renderHome(); };
  }
  /* ---------- assessment (критериальное оценивание) ----------
   * First-try correct answers / all graded tasks → percent → mark by the thresholds used for summative
   * assessment in Kazakhstan schools: 85–100 % «5», 65–84 % «4», 40–64 % «3», below 40 % «2». */
  var SKILL = { listen: 'tyn', pick: 'oqy', pickR: 'oqy', sent: 'oqy', match: 'oqy', clock: 'oqy', clockR: 'oqy', build: 'zhaz', fill: 'zhaz', order: 'zhaz', clockLoc: 'zhaz', num: 'zhaz', speak: 'ait', affix: 'zhaz', post: 'zhaz', buster: 'tyn' };
  var SKILL_NAME = { tyn: ['Тыңдалым', 'Аудирование', 'Listening'], oqy: ['Оқылым', 'Чтение и лексика', 'Reading & vocabulary'], zhaz: ['Жазылым', 'Письмо и грамматика', 'Writing & grammar'], ait: ['Айтылым', 'Говорение', 'Speaking'] };
  function markOf(p) { return p >= 85 ? 5 : p >= 65 ? 4 : p >= 40 ? 3 : 2; }
  function assessResult(Ls) {
    var seen = [], sk = {};
    Ls.q.forEach(function (e) { if (!e.free && seen.indexOf(e) < 0) seen.push(e); });
    seen.forEach(function (e) {
      var k = SKILL[e.kind] || 'oqy'; sk[k] = sk[k] || [0, 0];
      sk[k][1]++; if (!e._missed && e._counted) sk[k][0]++;
    });
    var ok = seen.filter(function (e) { return !e._missed && e._counted; }).length, pct = Math.round(ok / Math.max(1, seen.length) * 100);
    return { pct: pct, mark: markOf(pct), ok: ok, total: seen.length, skills: sk, date: today() };
  }
  function gradeCard(g) {
    var col = g.mark >= 5 ? 'var(--ok)' : g.mark === 4 ? 'var(--sky-500)' : g.mark === 3 ? 'var(--sun-600)' : 'var(--bad)';
    return '<div class="grade-card"><div class="mark" style="--c:' + col + '"><b>' + g.mark + '</b><small>Баға · оценка</small></div><div class="gk">' +
      '<p><b>' + g.ok + ' / ' + g.total + '</b> · ' + g.pct + '% · ' + esc(lang() === 'en' ? 'first try' : 'с первой попытки') + '</p>' +
      Object.keys(SKILL_NAME).filter(function (k) { return g.skills[k]; }).map(function (k) {
        var v = g.skills[k], p = Math.round(v[0] / v[1] * 100);
        return '<div class="sk"><span>' + SKILL_NAME[k][0] + '</span><div class="goal dark"><i style="width:' + p + '%"></i></div><em>' + v[0] + '/' + v[1] + '</em></div>';
      }).join('') + '</div></div>';
  }
  // «Мұғалім парағы» — a one-screen report for the teacher or parent: stars per textbook lesson, module tests.
  function teacherSheet() {
    var tb = D.GRADES.filter(function (g) { return g.textbook; })[0];
    if (!tb) return '';
    return '<h2>Мұғалім парағы · для учителя</h2><div class="panel tsheet">' + tb.units.map(function (u) {
      return '<b>' + esc(u.module + '-модуль «' + u.kk + '»') + '</b><table>' + u.lessons.map(function (l, i) {
        var a = S.assess[l.id], st = S.done[l.id], tp = l.game ? S.topic[l.game] : null;
        return '<tr><td>' + (i + 1) + '</td><td>' + esc(l.kk) + '</td><td>' + (a ? '<span class="mk m' + a.mark + '">' + a.mark + '</span> ' + a.pct + '%' : st ? '⭐'.repeat(st) : '—') + '</td><td>' + (tp != null ? '🎮 ' + tp + '%' : '') + '</td></tr>';
      }).join('') + '</table>';
    }).join('') + '<p class="muted">Баға: 85–100% «5», 65–84% «4», 40–64% «3», &lt;40% «2» — по доле заданий, выполненных с первой попытки.</p></div>';
  }
  function finish() {
    var l = L.lesson;
    var stars = L.mistakes === 0 ? 3 : L.mistakes <= 2 ? 2 : 1;
    var xp = l.practice ? 10 : (l.review ? 20 : 10) + (stars === 3 ? 5 : 0);
    var coins = l.practice ? 5 : l.review ? 30 : 5 + stars * 5;
    var acc = Math.round(L.good / Math.max(1, L.good + L.mistakes) * 100);
    var firstToday = bumpStreak();
    var sm = L.eng ? L.eng.summary() : null;
    if (sm) xp += sm.xp;                          // combo-multiplied XP for every answer
    xp = addXp(xp); S.coins += coins; S.lessons++;
    if (!l.practice) { S.done[l.id] = Math.max(S.done[l.id] || 0, stars); if (stars === 3) S.perfects++; }
    var grade = l.assess ? assessResult(L) : null;
    if (grade) S.assess[l.id] = grade;
    X('event', { t: 'lesson', stars: stars, practice: !!l.practice });
    levelCheck(); checkAch(); save();
    view = 'result';
    sfx.win(); confetti();
    var title = stars === 3 ? 'Керемет! Мінсіз!' : stars === 2 ? 'Жарайсың!' : 'Сабақ аяқталды!';
    var sub = stars === 3 ? 'Великолепно! Ни одной ошибки!' : stars === 2 ? 'Молодец! Почти без ошибок.' : 'Урок пройден! Повтори его, чтобы получить больше звёзд.';
    $app.innerHTML = '<div class="lesson"><div class="result">' + mascot('wow') +
      '<div class="big-stars">' + [1, 2, 3].map(function (i) { return '<span class="' + (i <= stars ? '' : 'off') + '">⭐</span>'; }).join('') + '</div>' +
      '<h2>' + title + '</h2><p>' + sub + '</p>' +
      '<div class="res-grid">' +
      '<div class="res-box" style="--c:var(--sky-600)"><small>Ұпай · XP</small><b>+' + xp + '</b></div>' +
      '<div class="res-box" style="--c:var(--sun-600)"><small>Алтын</small><b>+' + coins + '🪙</b></div>' +
      '<div class="res-box" style="--c:var(--ok)"><small>Дәлдік</small><b>' + acc + '%</b></div></div>' +
      (grade ? gradeCard(grade) : '') +
      (sm && sm.weakest && window.QLE.ADVICE[sm.weakest] ? '<p class="why">💡 ' + esc(window.QLE.ADVICE[sm.weakest][lang() === 'en' ? 'en' : 'ru']) + '</p>' : '') +
      (l.boss && sm ? '<p class="muted">⏱ ' + Math.round(sm.timeUsedMs / 1000) + ' с · ❤️ ' + L.hearts + ' / ' + l.boss.hearts + ' · 🔥 ' + sm.bestCombo + '</p>' : '') +
      '<p><b>🔥 ' + S.streak + (firstToday && S.streak > 1 ? ' дней подряд! Так держать!' : ' · серия дней') + '</b></p>' +
      '</div><div class="l-foot">' + (l.game && D.TOPIC_GAMES[l.game] ? '<button class="btn gold" id="tgame">🎮 ' + esc(D.TOPIC_GAMES[l.game].kk) + ' · закрепим!</button>' : '') +
      '<button class="btn ok" id="cont">Жалғастыру</button></div></div>';
    qs('#cont').onclick = function () { sfx.tap(); L = null; if (l.practice) tab = 'games'; renderHome(); };
    var tg = qs('#tgame'); if (tg) tg.onclick = function () { sfx.tap(); L = null; startGame(l.game); };
  }
  function confetti() {
    var c = document.createElement('div'); c.className = 'confetti';
    var colors = ['hsl(199 84% 50%)', 'hsl(43 100% 52%)', 'hsl(102 64% 45%)', 'hsl(268 70% 62%)', 'hsl(350 90% 58%)'];
    var html = '', emo = { tr_tulip: '🌷', tr_stars: '⭐', tr_spark: '✨' }[S.eq && S.eq.trail];
    for (var i = 0; i < 70; i++) {
      if (emo && i % 3 === 0) { html += '<i class="emo" style="left:' + rnd(100) + '%;animation-duration:' + (1.8 + Math.random() * 1.6).toFixed(2) + 's;animation-delay:' + (Math.random() * 0.5).toFixed(2) + 's">' + emo + '</i>'; continue; }
      html += '<i style="left:' + rnd(100) + '%;background:' + colors[i % colors.length] + ';animation-duration:' + (1.6 + Math.random() * 1.6).toFixed(2) + 's;animation-delay:' + (Math.random() * 0.5).toFixed(2) + 's;transform:rotate(' + rnd(360) + 'deg)"></i>';
    }
    c.innerHTML = html; document.body.appendChild(c);
    setTimeout(function () { c.remove(); }, 4000);
  }

  /* ---------- mini-games host ---------- */
  function startGame(id) {
    if (G && G.cleanup) G.cleanup();
    view = 'game'; G = { id: id, cleanup: null };
    var api = {
      words: gradeWords(gIdx()), allWords: ALLWORDS,
      esc: esc, shuffle: shuffle, rnd: rnd, uniqBy: uniqBy, qs: qs, qsa: qsa, glyph: glyph, isColor: isColorGlyph,
      sfx: sfx, TTS: TTS, toast: toast, hero: myHero, tr: tr, lang: lang, S: S, vibrate: vibrate, sheet: sheet, closeSheet: closeSheet, confetti: confetti, heroSvg: W.hero,
      frame: function (title, inner) {
        $app.innerHTML = '<div class="game"><div class="g-top"><button class="x" id="gx" aria-label="Выйти">✕</button><b class="g-title">' + esc(title) + '</b><span class="g-stat" id="gstat"></span></div><div class="g-body" id="gb">' + inner + '</div></div>';
        qs('#gx').onclick = exitGame;
        return qs('#gb');
      },
      stat: function (html) { var s = qs('#gstat'); if (s) s.innerHTML = html; },
      onLeave: function (fn) { G.cleanup = fn; },
      end: function (res) { endGame(id, res); }
    };
    (window.QGAMES[id] || window.QARCADE[id])(api);
  }
  function exitGame() { if (G && G.cleanup) G.cleanup(); G = null; tab = 'games'; renderHome(); }
  function endGame(id, res) {
    if (G && G.cleanup) G.cleanup();
    G = null; view = 'gameover';
    var coins = Math.max(0, res.coins | 0);
    S.gamesPlayed++; S.coins += coins; addXp(res.xp != null ? res.xp : Math.min(10, res.score | 0)); bumpStreak();
    if (res.arcade) { S.arcade = S.arcade || {}; S.arcade[id] = Math.max(S.arcade[id] || 0, res.score | 0); }
    if (id === 'quiz') S.quizBest = Math.max(S.quizBest, res.score | 0);
    X('event', { t: 'game', arcade: !!res.arcade });
    levelCheck(); checkAch(); save();
    sfx.win(); confetti();
    $app.innerHTML = '<div class="lesson"><div class="result">' + myHero('wow') + '<h2>' + esc(res.title || 'Ойын аяқталды!') + '</h2>' +
      '<p>' + esc(res.sub || '') + '</p><div class="res-grid two">' +
      '<div class="res-box" style="--c:var(--sky-600)"><small>Нәтиже · счёт</small><b>' + esc(res.scoreText || String(res.score)) + '</b></div>' +
      '<div class="res-box" style="--c:var(--sun-600)"><small>Алтын</small><b>+' + coins + '🪙</b></div></div></div>' +
      '<div class="l-foot" style="display:flex;flex-direction:column;gap:12px"><button class="btn ok" id="again">Тағы ойнау · ещё раз</button><button class="btn ghost" id="out">Шығу · выйти</button></div></div>';
    qs('#again').onclick = function () { sfx.tap(); startGame(id); };
    qs('#out').onclick = function () { sfx.tap(); tab = 'games'; renderHome(); };
  }

  /* ---------- Android back button ---------- */
  window.qBack = function () {
    if (sheetOpen) { if (!S.onboarded) return true; closeSheet(); flushRewards(); return true; }
    if (view === 'lesson') { confirmExit(); return true; }
    if (view === 'game') { exitGame(); return true; }
    if (view === 'arena') { X('arenaBack'); return true; }
    if (view === 'result' || view === 'gameover') { L = null; renderHome(); return true; }
    if (tab !== 'path') { tab = 'path'; renderHome(); return true; }
    return false;
  };
  window.qResume = function () { if (view === 'home' && tab === 'me') refresh(); };
  window.qDebug = { setHearts: function (n) { if (L) L.hearts = n; }, state: function () { return S; } };

  window.Q = {
    ext: {},
    api: {
      D: D, W: W, state: function () { return S; }, save: save, esc: esc, rnd: rnd, shuffle: shuffle, uniqBy: uniqBy, qs: qs, qsa: qsa, norm: norm, tokens: tokens,
      tr: tr, lang: lang, glyph: glyph, sfx: sfx, TTS: TTS, toast: toast, sheet: sheet, closeSheet: closeSheet, confetti: confetti, vibrate: vibrate,
      hero: W.hero, myHero: myHero, heroInfo: heroInfo, addXp: addXp, addReward: addReward, levelCheck: levelCheck, checkAch: checkAch, flushRewards: flushRewards,
      refresh: refresh, renderHome: renderHome, buy: buy, openChest: openChest, league: league, xpBoost: xpBoost, today: today, startGame: startGame, bumpStreak: bumpStreak,
      setTab: function (t) { tab = t; }, setView: function (v) { view = v; }, app: $app, selectOne: selectOne, markCards: markCards, spk: spk, bindSpeak: bindSpeak,
      prompt: prompt, mascot: mascot, allSentences: function () { return ALLSENT; }, gradeLessons: function (gi) { return GALL[gi]; }, gIdx: gIdx
    },
    boot: function () { renderHome(); }
  };
})();
