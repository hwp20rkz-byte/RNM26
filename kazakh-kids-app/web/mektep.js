/* Фаза 2 «Мектеп»: экран предметов и тренажёр тем (логика — web/mektep-core.js). Вход — баннер на вкладке «Ойындар».
 * Предмет → класс → тема → 10 заданий с картинкой (предметы для счёта, ондықтар, фигуры, монеты); после ответа
 * звучит число / слово, на экране — полная фраза (*Сегіз қосу бес тең он үш.*). Лучший результат — S.mektep[тема]. */
(function () {
  'use strict';
  var M = window.QMEKTEP, A = window.Q.api, E = window.Q.ext, W = window.QWORLD;
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
    if (v.type === 'map') {   // the outline (Natural Earth) with three tappable dots; the names show after the answer
      var K = window.QKZMAP;
      return '<svg class="mk-map" viewBox="0 0 ' + K.W + ' ' + K.H + '" role="group"><path class="land" d="' + K.path + '"/>' + (K.water || []).map(function (w) { return '<path class="wt" d="' + w.path + '"/>'; }).join('') + v.dots.map(function (d) {
        return '<g class="mk-o mk-dot" data-o="' + A.esc(d.id) + '" transform="translate(' + d.x + ' ' + d.y + ')" role="button" aria-label="' + A.esc(d.id) + '">' +
          '<circle class="hit" r="44"/><circle class="dot" r="15"/><text class="lbl" y="-24" text-anchor="middle">' + A.esc(d.id) + '</text></g>';
      }).join('') + '</svg>';
    }
    if (v.type === 'water') {   // all big lakes and seas in blue; the asked one is circled (no names: they would be the answer)
      var KM = window.QKZMAP, on = (KM.water || []).filter(function (w) { return w.id === v.mark; })[0];
      return '<svg class="mk-map mk-water" viewBox="0 0 ' + KM.W + ' ' + KM.H + '" aria-hidden="true"><path class="land" d="' + KM.path + '"/>' +
        (KM.water || []).map(function (w) { return '<path class="wt' + (w.id === v.mark ? ' on' : '') + '" d="' + w.path + '"/>'; }).join('') +
        (on ? '<circle class="mk-ring" cx="' + on.c[0] + '" cy="' + on.c[1] + '" r="30"/>' : '') + '</svg>';
    }
    if (v.type === 'clock') {   // the short hand points between the hours at half past
      var ha = (v.h % 12 + v.m / 60) * 30, ma = v.m * 6, ticks = '';
      for (var k = 0; k < 12; k++) { var a = k * Math.PI / 6; ticks += '<text x="' + (50 + Math.sin(a) * 37).toFixed(1) + '" y="' + (54 - Math.cos(a) * 37).toFixed(1) + '">' + (k || 12) + '</text>'; }
      return '<svg class="mk-clock" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46"/>' + ticks +
        '<line class="h" x1="50" y1="50" x2="' + (50 + Math.sin(ha * Math.PI / 180) * 22).toFixed(1) + '" y2="' + (50 - Math.cos(ha * Math.PI / 180) * 22).toFixed(1) + '"/>' +
        '<line class="mm" x1="50" y1="50" x2="' + (50 + Math.sin(ma * Math.PI / 180) * 33).toFixed(1) + '" y2="' + (50 - Math.cos(ma * Math.PI / 180) * 33).toFixed(1) + '"/><circle class="c" cx="50" cy="50" r="3.5"/></svg>';
    }
    if (v.type === 'scene') return '<div class="mk-scene">' + v.lines.map(function (l) {   // the bazaar talk: the pupil on the right, the seller on the left
      return '<div class="mk-bub' + (l.who === 'E1' ? '' : ' me') + '"><span class="mk-face e">' + l.e + '</span><p><b>' + A.esc(l.name) + '</b>' + A.esc(l.text) + '</p></div>'; }).join('') + '</div>';
    if (v.type === 'story') return '<div class="mk-story"><span class="i">' + v.e + '</span><p>' + A.esc(v.text) + '</p></div>';
    if (v.type === 'sym') return ornament(v.left, null);
    if (v.type === 'coins') return '<div class="mk-coins">' + v.list.map(function (c) { return '<span class="c' + (c >= 100 ? ' big' : '') + '">' + c + '<small>₸</small></span>'; }).join('') + '</div>';
    return '';
  }

  /** A hero's face: the drawn neo-heroes, or an emoji for Баян апай, Ата, Әже, the pupils and the architect. */
  function face(x) { return x.hero ? W.hero(x.hero, 'happy', 'mk-face') : '<span class="mk-face e">' + x.e + '</span>'; }
  function bubble(x) { return '<div class="mk-bub">' + face(x) + '<p><b>' + A.esc(x.name || x.kk) + '</b>' + A.esc(x.text) + '</p></div>'; }
  /** Say lines one after another in their heroes' voices (each waits for the previous recording to end). */
  function sayChain(lines, isOver) {
    var k = 0;
    (function next() {
      if (k >= lines.length || isOver()) return;
      var l = lines[k++], au = A.TTS.speak(l.text, true, l.who);
      if (au && au.addEventListener) au.addEventListener('ended', function () { setTimeout(next, 250); }); else setTimeout(next, 600 + l.text.length * 60);
    })();
  }
  window.QARCADE.mektep = function (api) {
    var S = api.S, grade = S.mkGrade || 1, subj = null, topic = null, qs = [], i = 0, right = 0, busy = false, over = false;
    S.mektep = S.mektep || {};
    api.frame('Мектеп', '<div class="mkt" id="mk"></div>');
    api.onLeave(function () { over = true; });
    function home() {
      topic = null;
      var html = '<h2>🏫 Мектеп · ' + A.esc(en() ? 'school subjects in Kazakh' : 'школьные предметы на казахском') + '</h2>' +
        '<button class="mk-mix-btn" id="mkmix">🎯 ' + A.esc(en() ? 'Today\'s practice · 10 tasks' : 'Бүгінгі жаттығу · 10 заданий') + '<small>' + A.esc(en() ? 'weak topics, review and one new topic' : 'слабые темы, повторение и одна новая') + '</small></button>' +
        '<button class="mk-diary-btn" id="mkdiary">📒 ' + A.esc(en() ? 'Diary · Мектеп күнделігі' : 'Дневник · Мектеп күнделігі') + '</button><div class="mk-subj">' + M.SUBJECTS.map(function (s) {
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
      api.qs('#mk').innerHTML = html; api.stat('');
      api.qs('#mkdiary').onclick = function () { api.sfx.tap(); diaryView(); };
      api.qs('#mkmix').onclick = function () { api.sfx.tap(); startMix(); };
      api.qsa('[data-subj]').forEach(function (b) { b.onclick = function () { api.sfx.tap(); subj = M.SUBJECTS.filter(function (s) { return s.id === b.getAttribute('data-subj'); })[0]; home(); }; });
      api.qsa('.mk-g').forEach(function (b) { b.onclick = function () { api.sfx.tap(); grade = +b.getAttribute('data-grade'); S.mkGrade = grade; home(); }; });
      api.qsa('[data-topic]').forEach(function (b) { b.onclick = function () { api.sfx.tap(); start(M.topicById(b.getAttribute('data-topic'))); }; });
    }
    // «Мектеп күнделігі»: stars and progress per subject, topics worth repeating, a text report to copy for the teacher / parent
    function diaryView() {
      var d = M.diary(S.mektep), lang = en() ? 'en' : 'ru';
      var rep = M.reportText(S.mektep, S.name || '', lang, new Date().toLocaleDateString('ru-RU'), S.grade || 1);
      api.qs('#mk').innerHTML = '<div class="mk-diary"><h2>📒 Мектеп күнделігі</h2>' + d.map(function (x) {
        return '<div class="mk-row"><span class="i">' + x.icon + '</span><b>' + A.esc(x.kk) + '</b><span class="mk-bar"><i style="width:' + Math.round(x.done / Math.max(1, x.total) * 100) + '%"></i></span>' +
          '<small>' + x.done + ' / ' + x.total + ' · ★ ' + x.stars + '</small></div>' +
          (x.weak.length ? '<div class="mk-weak">' + x.weak.map(function (t) { return '<button class="mk-redo" data-topic="' + t.id + '">↻ ' + A.esc(t.kk) + ' · ' + S.mektep[t.id] + ' / ' + M.ROUND + '</button>'; }).join('') + '</div>' : '');
      }).join('') +
        '<h3>' + A.esc(en() ? 'Report for the teacher or a parent' : 'Отчёт для учителя или родителей') + '</h3><pre class="mk-report" id="mkrep">' + A.esc(rep) + '</pre>' +
        '<div class="mk-acts"><button class="btn gold" id="mkcopy">📋 ' + A.esc(en() ? 'Copy' : 'Скопировать') + '</button><button class="btn ghost" id="mkback">← ' + A.esc(en() ? 'Subjects' : 'Предметы') + '</button></div>' +
        '<button class="mk-diary-btn" id="mkclass">👩‍🏫 ' + A.esc(en() ? 'For the teacher: class report' : 'Для учителя: сынып есебі — отчёт класса') + '</button></div>';
      api.stat('');
      api.qs('#mkback').onclick = function () { api.sfx.tap(); home(); };
      api.qs('#mkclass').onclick = function () { api.sfx.tap(); classView(); };
      api.qsa('.mk-redo').forEach(function (b) { b.onclick = function () { api.sfx.tap(); start(M.topicById(b.getAttribute('data-topic'))); }; });
      api.qs('#mkcopy').onclick = function () {
        var done = function () { var b = api.qs('#mkcopy'); if (b) b.textContent = '✓ ' + (en() ? 'Copied' : 'Скопировано'); };
        try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(rep).then(done, select); return; } } catch (e) { /* old WebView */ }
        select();
        function select() { var r = document.createRange(), el = api.qs('#mkrep'); r.selectNodeContents(el); var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r); try { document.execCommand('copy'); done(); } catch (e) { /* the text stays selected */ } }
      };
    }
    var mix = null;
    function todayStr() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
    // «Сынып есебі»: the teacher pastes the pupils' messages (each carries a QVD1 code) and gets the class table
    function classView(text) {
      var rs = text ? M.decodeReports(text) : [], sum = M.classSummary(rs);
      api.qs('#mk').innerHTML = '<div class="mk-diary"><h2>👩‍🏫 Сынып есебі</h2><p class="muted">' + A.esc(en() ? 'Paste the pupils\' diary messages (all at once). Only the codes are read; nothing leaves the phone.' : 'Вставьте сообщения учеников с отчётами (можно все сразу). Читаются только коды, ничего не уходит с телефона.') + '</p>' +
        '<textarea class="mk-paste" id="mkpaste" rows="5" placeholder="QVD1:…">' + A.esc(text || '') + '</textarea>' +
        '<div class="mk-acts"><button class="btn gold" id="mkbuild">📊 ' + A.esc(en() ? 'Build the table' : 'Построить таблицу') + '</button><button class="btn ghost" id="mkback2">← ' + A.esc(en() ? 'Diary' : 'Дневник') + '</button></div>' +
        (text ? '<h3>' + A.esc((en() ? 'Pupils: ' : 'Учеников: ') + rs.length) + '</h3>' + (sum.length ? '<table class="mk-class"><tr><th>' + A.esc(en() ? 'Topic' : 'Тема') + '</th><th>' + A.esc(en() ? 'weak' : 'слабо') + '</th><th>' + A.esc(en() ? 'avg' : 'ср.') + '</th></tr>' +
          sum.map(function (x) { return '<tr class="' + (x.weak * 2 >= x.played ? 'bad' : '') + '"><td><b>' + A.esc(x.topic.kk) + '</b><small>' + A.esc(x.weakNames.join(', ')) + '</small></td><td>' + x.weak + ' / ' + x.played + '</td><td>' + x.avg + '</td></tr>'; }).join('') + '</table>'
          : '<p class="muted">' + A.esc(en() ? 'No codes found.' : 'Коды не найдены.') + '</p>') : '') + '</div>';
      api.qs('#mkbuild').onclick = function () { api.sfx.tap(); classView(api.qs('#mkpaste').value || ' '); };
      api.qs('#mkback2').onclick = function () { api.sfx.tap(); diaryView(); };
    }
    function start(t) { mix = null; topic = t; qs = M.round(t, Math.random); i = 0; right = 0; introView(); }
    // the topic opens with its heroes: a pupil asks, the host says the rule (both in their own voices)
    function introView() {
      var it = M.intro(topic);
      if (!it.length) return show();
      api.stat('');
      api.qs('#mk').innerHTML = '<div class="mk-intro"><small>' + A.esc(topic.kk) + '</small>' +
        it.map(function (x) { return bubble({ hero: x.hero, e: x.e, name: x.name, text: x.kk }); }).join('') +
        '<button class="btn gold" id="mkgo">' + A.esc(en() ? 'Start ▶' : 'Бастау ▶') + '</button></div>';
      sayChain(it.map(function (x) { return { text: x.kk, who: x.who }; }), function () { return over || !api.qs('#mkgo'); });
      api.qs('#mkgo').onclick = function () { api.sfx.tap(); show(); };
    }
    // «Бүгінгі жаттығу»: 10 tasks from weak topics, topics due for review and one new topic (no penalty for a missed day)
    function startMix() {
      S.mkSeen = S.mkSeen || {};
      mix = M.dailyMix(S.mektep, S.mkSeen, todayStr(), S.grade || 1, Math.random);
      topic = { id: 'mix', kk: 'Бүгінгі жаттығу', ru: 'Тренировка дня', en: 'Today\'s practice' };
      qs = mix.map(function (x) { return x.q; }); i = 0; right = 0; show();
    }
    function show() {
      if (over) return;
      var q = qs[i]; busy = false;
      api.stat((i + 1) + ' / ' + qs.length + ' · ✅ ' + right);
      var label = mix ? { weak: '↻ ', review: '🔁 ', 'new': '✨ ', practice: '' }[mix[i].why] + mix[i].topic.kk : topic.kk;
      api.qs('#mk').innerHTML = '<div class="mk-q"><small>' + A.esc(label) + '</small><div class="mk-vis">' + visual(q.visual) + '</div>' +
        '<p class="mk-ask' + (q.kk.length > 40 ? ' long' : '') + '"><b>' + A.esc(q.kk) + '</b> ' + (A.TTS.file(q.kk, q.who) ? '<button class="mk-say" data-s="' + A.esc(q.kk) + '" aria-label="🔊">🔊</button>' : '') + '<span class="muted">' + A.esc(T(q)) + '</span></p>' +
        (q.optType === 'map' ? '' : '<div class="mk-opts' + (q.options.length > 3 ? ' four' : '') + (q.options.some(function (o) { return typeof o === 'string' && o.length > 9; }) ? ' long' : '') + '">' + q.options.map(function (o) {
          var face = q.optType === 'sym' ? ornament(q.visual.left, o.split('|')) : A.esc(o);   // symmetry: the whole ornament per option
          return '<button class="mk-o' + (q.optType ? ' pic' : '') + '" data-o="' + A.esc(o) + '">' + face + (q.labels ? '<small>' + A.esc(q.labels[o]) + '</small>' : '') + '</button>';
        }).join('') + '</div>') + '<div class="mk-fb" id="mkfb"></div></div>';
      var sb = api.qs('.mk-say'); if (sb) sb.onclick = function () { api.TTS.speak(q.kk, true, q.who); };
      if (q.scene) { var mq = q; sayChain(q.scene.map(function (l) { return { text: l.text, who: l.who }; }).concat([{ text: q.kk, who: null }]), function () { return over || qs[i] !== mq; }); }   // the talk, then the narrator asks
      else if (q.story) { var mine = q; sayChain([{ text: q.story, who: q.storyWho }, { text: q.kk, who: q.who }], function () { return over || qs[i] !== mine; }); }   // Ата / Әже tells, a pupil asks
      else if (q.who) setTimeout(function () { if (!over && qs[i] === q) api.TTS.speak(q.kk, true, q.who); }, 300);   // a character (the tourist) speaks first, in their own voice
      api.qsa('.mk-o').forEach(function (b) { b.onclick = function () { answer(b.getAttribute('data-o'), b); }; });
    }
    function answer(o, btn) {
      if (busy || over) return; busy = true;
      var q = qs[i], ok = o === q.answer;
      var qb = api.qs('.mk-q'); if (qb) qb.classList.add('done');   // the map shows the city names after an answer
      if (ok) { right++; api.sfx.ok(); btn.classList.add('right'); } else { api.sfx.bad(); api.vibrate(40); btn.classList.add('wrong'); api.qsa('.mk-o').forEach(function (b) { if (b.getAttribute('data-o') === q.answer) b.classList.add('right'); }); }
      var tp = mix ? mix[i].topic : topic, host = M.hostOf(tp), tip = M.TIPS[tp.id];
      api.qs('#mkfb').innerHTML = '<div class="ph-fb ' + (ok ? 'ok' : 'bad') + '"><b>' + (ok ? 'Дұрыс!' : (en() ? 'Answer: ' : 'Ответ: ') + A.esc(q.answer)) + '</b> ' + A.esc(q.full) + '</div>' +
        (!ok && host && tip ? bubble({ hero: host.hero, e: host.e, name: host.kk, text: tip }) : '');
      if (!ok && host && tip) sayChain([{ text: q.say, who: null }, { text: tip, who: host.who }].filter(function (x) { return x.text && A.TTS.file(x.text, x.who); }), function () { return over; });   // the host explains after a mistake
      else if (A.TTS.file(q.say)) api.TTS.speak(q.say, true);   // only recorded answers (three-digit numbers are shown, not spoken)
      setTimeout(function () { if (over) return; i++; if (i >= qs.length) end(); else show(); }, ok ? 1300 : (host && tip ? 2200 + tip.length * 45 : 2200));   // time to hear the host's rule
    }
    function end() {
      S.mkSeen = S.mkSeen || {};
      if (mix) mix.forEach(function (x) { S.mkSeen[x.topic.id] = todayStr(); });   // the mix counts as a review of its topics
      else { S.mektep[topic.id] = Math.max(S.mektep[topic.id] || 0, right); S.mkSeen[topic.id] = todayStr(); }
      api.end({ title: right >= 9 ? 'Керемет!' : right >= 6 ? 'Жарайсың!' : 'Тағы жаттығайық!', score: right, scoreText: right + ' / ' + qs.length, coins: right * 2, xp: Math.min(10, right),
        sub: topic.kk + ' · ' + T(topic) });
    }
    if (/[?&]e2e\b/.test(location.search)) window.__mk = function () { var q = qs[i]; return { i: i, n: qs.length, right: right, answer: q && q.answer, topic: topic && topic.id, busy: busy, mix: mix && mix.map(function (x) { return x.topic.id + ':' + x.why; }) }; };
    home();
  };

  // entry: a banner on the games tab, under Жалқаубек's event
  var prev = E.gamesTop;
  E.gamesTop = function () {
    var s = A.state().mektep || {}, done = Object.keys(s).length, all = M.SUBJECTS.reduce(function (a, x) { return a + x.topics.length; }, 0);
    var b = '<button class="mk-banner" data-arc="mektep"><span class="i">🏫</span><span><b>Мектеп · ' + A.esc(en() ? 'school subjects' : 'школьные предметы') + '</b><small>' +
      A.esc((en() ? '7 subjects in Kazakh · topics done: ' : '7 предметов на казахском · тем пройдено: ') + done + ' / ' + all) + '</small></span></button>';
    var rest = prev ? prev() : '';
    var cut = rest.indexOf('<h2 class="arc-h">');
    return cut >= 0 ? rest.slice(0, cut) + b + rest.slice(cut) : b + rest;
  };
})();
