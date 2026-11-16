/* Фаза 2 «Мектеп»: экран предметов и тренажёр тем (логика — web/mektep-core.js). Вход — баннер на вкладке «Ойындар».
 * Предмет → класс → тема → 10 заданий с картинкой (предметы для счёта, ондықтар, фигуры, монеты); после ответа
 * звучит число / слово, на экране — полная фраза (*Сегіз қосу бес тең он үш.*). Лучший результат — S.mektep[тема]. */
(function () {
  'use strict';
  var M = window.QMEKTEP, A = window.Q.api, E = window.Q.ext;
  if (!M) return;
  function en() { return A.lang() === 'en'; }
  function T(o) { return en() ? o.en : o.ru; }
  var SHAPE_SVG = {
    circle: '<circle cx="50" cy="50" r="38"/>', oval: '<ellipse cx="50" cy="50" rx="42" ry="26"/>',
    triangle: '<polygon points="50,10 92,86 8,86"/>', square: '<rect x="15" y="15" width="70" height="70"/>',
    rect: '<rect x="6" y="26" width="88" height="48"/>', rhombus: '<polygon points="50,6 90,50 50,94 10,50"/>',
    pentagon: '<polygon points="50,8 92,40 76,90 24,90 8,40"/>'
  };
  /** Kazakh ornament on a 6×5 grid: the left half given, the right half either empty («?») or an option. */
  function ornament(left, right) {
    var cells = '';
    left.forEach(function (row, y) {
      var full = row + (right ? right[y] : '???');
      for (var x = 0; x < 6; x++) cells += '<rect x="' + x * 10 + '" y="' + y * 10 + '" width="9" height="9" class="' + (full[x] === '1' ? 'on' : full[x] === '?' ? 'q' : '') + '"/>';
    });
    return '<svg class="mk-orn" viewBox="0 0 59 49" aria-hidden="true">' + cells + '<line x1="29.5" y1="0" x2="29.5" y2="49"/></svg>';
  }
  function visual(v) {
    if (v.type === 'items') return '<div class="mk-items">' + new Array(v.n + 1).join('<span>' + v.e + '</span>') + '</div>';
    if (v.type === 'tens') return '<div class="mk-tens">' + new Array(v.t + 1).join('<i class="rod"></i>') + new Array(v.u + 1).join('<i class="one"></i>') + '</div>';
    if (v.type === 'expr') return '<div class="mk-expr">' + A.esc(v.text) + '</div>';
    if (v.type === 'shape') return '<svg class="mk-shape" viewBox="0 0 100 100" aria-hidden="true">' + SHAPE_SVG[v.id] + '</svg>';
    if (v.type === 'good') return '<div class="mk-good">' + v.e + '<span>🧾</span></div>';
    if (v.type === 'place') return '<div class="mk-tens">' + new Array(v.h + 1).join('<i class="flat"></i>') + new Array(v.t + 1).join('<i class="rod"></i>') + new Array(v.u + 1).join('<i class="one"></i>') + '</div>';
    if (v.type === 'frac') {   // a circle cut into d equal slices, n of them shaded
      var out = '<svg class="mk-frac" viewBox="-52 -52 104 104" aria-hidden="true">';
      for (var k = 0; k < v.d; k++) {
        var a0 = k / v.d * 2 * Math.PI - Math.PI / 2, a1 = (k + 1) / v.d * 2 * Math.PI - Math.PI / 2;
        out += '<path class="' + (k < v.n ? 'on' : '') + '" d="M0 0 L' + (48 * Math.cos(a0)).toFixed(2) + ' ' + (48 * Math.sin(a0)).toFixed(2) + ' A48 48 0 ' + (a1 - a0 > Math.PI ? 1 : 0) + ' 1 ' + (48 * Math.cos(a1)).toFixed(2) + ' ' + (48 * Math.sin(a1)).toFixed(2) + ' Z"/>';
      }
      return out + '</svg>';
    }
    if (v.type === 'big') return '<div class="mk-big"><span>' + v.e + '</span>' + (v.text ? '<b>' + A.esc(v.text) + '</b>' : '') + '</div>';
    if (v.type === 'pattern') return '<div class="mk-pat">' + v.seq.map(function (e) { return '<span>' + e + '</span>'; }).join('') + '<span class="q">?</span></div>';
    if (v.type === 'odd') return '<div class="mk-odd">' + v.list.map(function (e) { return '<span>' + e + '</span>'; }).join('') + '</div>';
    if (v.type === 'yurt') return '<ol class="mk-yurt">' + v.done.map(function (x) { return '<li>✅ ' + A.esc(x) + '</li>'; }).join('') + '<li class="q">❓</li></ol>';
    if (v.type === 'grid') {
      var g = '<div class="mk-grid" style="--n:' + v.size + '">';
      for (var y = 0; y < v.size; y++) for (var x = 0; x < v.size; x++) {
        var c = x === v.start.x && y === v.start.y ? '🤖' : x === v.goal.x && y === v.goal.y ? '🔋' : v.walls.some(function (w) { return w.x === x && w.y === y; }) ? '🧱' : '';
        g += '<i>' + c + '</i>';
      }
      return g + '</div>';
    }
    if (v.type === 'compass') {   // map convention: up = north; no letters on the dial, the arrow alone carries the question
      return '<svg class="mk-cmp" viewBox="-50 -50 100 100" aria-hidden="true"><circle r="46"/>' +
        [0, 90, 180, 270].map(function (d) { return '<line class="tk" y1="-46" y2="-38" transform="rotate(' + d + ')"/>'; }).join('') +
        '<g transform="rotate(' + v.deg + ')"><path class="ar" d="M0 -34 L9 2 L0 -4 L-9 2 Z"/><path class="tl" d="M0 -4 L9 2 L0 30 L-9 2 Z"/></g><circle class="hub" r="4"/></svg>';
    }
    if (v.type === 'sym') return ornament(v.left, null);
    if (v.type === 'coins') return '<div class="mk-coins">' + v.list.map(function (c) { return '<span class="c' + (c >= 100 ? ' big' : '') + '">' + c + '<small>₸</small></span>'; }).join('') + '</div>';
    return '';
  }

  window.QARCADE.mektep = function (api) {
    var S = api.S, grade = S.mkGrade || 1, subj = null, topic = null, qs = [], i = 0, right = 0, busy = false, over = false;
    S.mektep = S.mektep || {};
    api.frame('Мектеп', '<div class="mkt" id="mk"></div>');
    api.onLeave(function () { over = true; });
    function home() {
      topic = null;
      var html = '<h2>🏫 Мектеп · ' + A.esc(en() ? 'school subjects in Kazakh' : 'школьные предметы на казахском') + '</h2><div class="mk-subj">' + M.SUBJECTS.map(function (s) {
        var ready = s.topics.length > 0;
        return '<button class="mk-s' + (ready ? '' : ' soon') + (subj === s ? ' on' : '') + '" data-subj="' + s.id + '"' + (ready ? '' : ' disabled') + ' style="--uc:var(--u-' + s.hue + ');--ucd:var(--u-' + s.hue + '-d)">' +
          '<span class="i">' + s.icon + '</span><b>' + A.esc(s.kk) + '</b><small>' + A.esc(ready ? T(s) : (en() ? 'coming soon' : 'скоро')) + '</small></button>';
      }).join('') + '</div>';
      if (subj) {
        var gs = subj.topics.map(function (t) { return t.grade; }).filter(function (g, k, a) { return a.indexOf(g) === k; });
        if (gs.indexOf(grade) < 0) grade = gs[0];
        html += '<div class="mk-grades">' + gs.map(function (g) { return '<button class="mk-g' + (g === grade ? ' on' : '') + '" data-grade="' + g + '">' + g + '-сынып</button>'; }).join('') + '</div>' +
          '<div class="mk-topics">' + subj.topics.filter(function (t) { return t.grade === grade; }).map(function (t) {
            var best = S.mektep[t.id];
            return '<button class="mk-t" data-topic="' + t.id + '"><b>' + A.esc(t.kk) + '</b><small>' + A.esc(T(t)) + '</small>' + (best != null ? '<span class="pill ok">' + best + ' / ' + M.ROUND + '</span>' : '<span class="pill">NEW</span>') + '</button>';
          }).join('') + '</div>';
      }
      html += '<p class="muted">' + A.esc(en() ? 'Maths, logic and science are open; geography, cities, history and reading come next.' : 'Открыты математика, логика и естествознание; география, города, история и чтение — следующие.') + '</p>';
      api.qs('#mk').innerHTML = html; api.stat('');
      api.qsa('[data-subj]').forEach(function (b) { b.onclick = function () { api.sfx.tap(); subj = M.SUBJECTS.filter(function (s) { return s.id === b.getAttribute('data-subj'); })[0]; home(); }; });
      api.qsa('.mk-g').forEach(function (b) { b.onclick = function () { api.sfx.tap(); grade = +b.getAttribute('data-grade'); S.mkGrade = grade; home(); }; });
      api.qsa('[data-topic]').forEach(function (b) { b.onclick = function () { api.sfx.tap(); start(M.topicById(b.getAttribute('data-topic'))); }; });
    }
    function start(t) { topic = t; qs = M.round(t, Math.random); i = 0; right = 0; show(); }
    function show() {
      if (over) return;
      var q = qs[i]; busy = false;
      api.stat((i + 1) + ' / ' + qs.length + ' · ✅ ' + right);
      api.qs('#mk').innerHTML = '<div class="mk-q"><small>' + A.esc(topic.kk) + '</small><div class="mk-vis">' + visual(q.visual) + '</div>' +
        '<p class="mk-ask' + (q.kk.length > 40 ? ' long' : '') + '"><b>' + A.esc(q.kk) + '</b> ' + (A.TTS.file(q.kk) ? '<button class="mk-say" data-s="' + A.esc(q.kk) + '" aria-label="🔊">🔊</button>' : '') + '<span class="muted">' + A.esc(T(q)) + '</span></p>' +
        '<div class="mk-opts' + (q.options.length > 3 ? ' four' : '') + '">' + q.options.map(function (o) {
          var face = q.optType === 'sym' ? ornament(q.visual.left, o.split('|')) : A.esc(o);   // symmetry: the whole ornament per option
          return '<button class="mk-o' + (q.optType ? ' pic' : '') + '" data-o="' + A.esc(o) + '">' + face + (q.labels ? '<small>' + A.esc(q.labels[o]) + '</small>' : '') + '</button>';
        }).join('') + '</div><div class="mk-fb" id="mkfb"></div></div>';
      var sb = api.qs('.mk-say'); if (sb) sb.onclick = function () { api.TTS.speak(q.kk, true); };
      api.qsa('.mk-o').forEach(function (b) { b.onclick = function () { answer(b.getAttribute('data-o'), b); }; });
    }
    function answer(o, btn) {
      if (busy || over) return; busy = true;
      var q = qs[i], ok = o === q.answer;
      if (ok) { right++; api.sfx.ok(); btn.classList.add('right'); } else { api.sfx.bad(); api.vibrate(40); btn.classList.add('wrong'); api.qsa('.mk-o').forEach(function (b) { if (b.getAttribute('data-o') === q.answer) b.classList.add('right'); }); }
      api.qs('#mkfb').innerHTML = '<div class="ph-fb ' + (ok ? 'ok' : 'bad') + '"><b>' + (ok ? 'Дұрыс!' : (en() ? 'Answer: ' : 'Ответ: ') + A.esc(q.answer)) + '</b> ' + A.esc(q.full) + '</div>';
      if (A.TTS.file(q.say)) api.TTS.speak(q.say, true);   // only recorded answers (three-digit numbers are shown, not spoken)
      setTimeout(function () { if (over) return; i++; if (i >= qs.length) end(); else show(); }, ok ? 1300 : 2200);
    }
    function end() {
      S.mektep[topic.id] = Math.max(S.mektep[topic.id] || 0, right);
      api.end({ title: right >= 9 ? 'Керемет!' : right >= 6 ? 'Жарайсың!' : 'Тағы жаттығайық!', score: right, scoreText: right + ' / ' + qs.length, coins: right * 2, xp: Math.min(10, right),
        sub: topic.kk + ' · ' + T(topic) });
    }
    if (/[?&]e2e\b/.test(location.search)) window.__mk = function () { var q = qs[i]; return { i: i, n: qs.length, right: right, answer: q && q.answer, topic: topic && topic.id, busy: busy }; };
    home();
  };

  // entry: a banner on the games tab, under Жалқаубек's event
  var prev = E.gamesTop;
  E.gamesTop = function () {
    var s = A.state().mektep || {}, done = Object.keys(s).length, all = M.SUBJECTS.reduce(function (a, x) { return a + x.topics.length; }, 0);
    var b = '<button class="mk-banner" data-arc="mektep"><span class="i">🏫</span><span><b>Мектеп · ' + A.esc(en() ? 'school subjects' : 'школьные предметы') + '</b><small>' +
      A.esc((en() ? 'Maths in Kazakh · topics done: ' : 'Математика на казахском · тем пройдено: ') + done + ' / ' + all) + '</small></span></button>';
    var rest = prev ? prev() : '';
    var cut = rest.indexOf('<h2 class="arc-h">');
    return cut >= 0 ? rest.slice(0, cut) + b + rest.slice(cut) : b + rest;
  };
})();
