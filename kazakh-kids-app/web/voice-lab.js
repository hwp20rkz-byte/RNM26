/* Дауыс зертханасы — voice lab of the TEST build.
 * Voices: every Freedom Speech catalog voice on the same three Kazakh phrases (pre-rendered by tools/make-voice-lab.mjs).
 * Features: what each API option really does with our key (emotion, prosody tags, non-speech sounds, models, ASR).
 * Tuning: pitch (tempo kept, WSOLA), tempo, bass/treble, phone band, drive, robot (ring modulation), echo, reverb —
 * rendered on the phone with Web Audio; the result is shown as an ffmpeg chain for tools/voice_studio/fs-cast.json,
 * which tools/make-audio-fs.mjs --heroes applies when it re-voices a hero. */
(function () {
  'use strict';
  var L = window.QVLAB || { voices: [], features: [], phrases: [], notAvailable: [] };
  var main = document.getElementById('lab');
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var cur = null;
  function play(file) { try { if (cur) cur.pause(); cur = new Audio('voice-lab/' + file + '.mp3'); cur.play().catch(function () {}); } catch (e) { /* no audio */ } }

  /* ------------------------------------------------------------ voices */
  function voicesTab() {
    var ok = L.voices.filter(function (v) { return v.ok; });
    var h = '<p class="muted">' + ok.length + ' голосов из каталога Freedom Speech читают одни и те же фразы. Высота — медиана основного тона по трём записям. «Услышано» — что распознавание Freedom Speech разобрало обратно (проверка разборчивости).</p>';
    ['f', 'm'].forEach(function (g) {
      h += '<h2>' + (g === 'f' ? '👩 Женские' : '🧑 Мужские') + '</h2><div class="grid">';
      L.voices.filter(function (v) { return v.gender === g; }).sort(function (a, b) { return (b.f0 || 0) - (a.f0 || 0); }).forEach(function (v) {
        h += '<div class="card"><div class="row"><span class="name">' + esc(v.label) + '</span><span class="tag">' + esc(v.id) + '</span>' +
          (v.f0 ? '<span class="tag">' + v.f0 + ' Гц</span>' : '') + '</div><p class="muted">' + esc(v.note) + '</p>';
        if (!v.ok) { h += '<p class="bad">Недоступен: сервис отвечает ' + esc(v.status || '—') + '</p></div>'; return; }
        v.takes.forEach(function (t, i) {
          var p = L.phrases[i];
          h += '<div class="row" style="margin-top:8px"><button class="btn" data-play="' + esc(t.file) + '" aria-label="Слушать: ' + esc(p.kk) + '">▶</button>' +
            '<div style="flex:1;min-width:0"><div>' + esc(p.kk) + '</div><div class="muted">Услышано: «' + esc(t.heard) + '» · <span class="' + (t.sim >= 0.9 ? 'ok' : t.sim >= 0.75 ? 'warn' : 'bad') + '">' + Math.round((t.sim || 0) * 100) + '%</span></div></div></div>';
        });
        h += '<div class="row" style="margin-top:8px"><button class="btn" data-tune="' + esc(v.id) + '">🎛️ В тюнинг</button></div></div>';
      });
      h += '</div>';
    });
    return h;
  }

  /* ------------------------------------------------------------ features */
  function featuresTab() {
    var h = '<p class="muted">Каждая запись — реальный запрос к api.freedomspeech.kz с нашим ключом. Результат честный: принят ли параметр и меняет ли он звук.</p>', group = null;
    L.features.forEach(function (f) {
      if (f.group !== group) { if (group) h += '</div>'; group = f.group; h += '<h2>' + esc(group) + '</h2><div class="card">'; }
      var r = f.result || {};
      var status = !r.ok ? '<span class="bad">не принято: HTTP ' + esc(r.status || '—') + (r.error ? ' · ' + esc(r.error) : '') + '</span>'
        : r.sameAsNeutral ? '<span class="warn">принято, но звук не отличается от neutral</span>' : '<span class="ok">работает</span>';
      h += '<div class="row" style="padding:8px 0;border-bottom:1px solid var(--line)">' +
        (f.file ? '<button class="btn" data-play="' + esc(f.file) + '" aria-label="Слушать ' + esc(f.label) + '">▶</button>' : '<span class="btn" aria-hidden="true" style="display:grid;place-items:center;opacity:.4">✕</span>') +
        '<div style="flex:1;min-width:0"><div><b>' + esc(f.label) + '</b> · ' + esc(f.voice) + '</div><div class="muted">' + esc(f.kk) + (f.ru ? ' — ' + esc(f.ru) : '') + '</div><div class="muted">' + status +
        (r.ok ? ' · услышано: «' + esc(r.heard) + '»' : '') + '</div></div></div>';
    });
    if (group) h += '</div>';
    h += '<h2>Недоступно с нашим ключом</h2><div class="card">' + L.notAvailable.map(function (n) { return '<p><b>' + esc(n.what) + '</b><br><span class="muted">' + esc(n.why) + '</span></p>'; }).join('') + '</div>';
    return h;
  }

  /* ------------------------------------------------------------ tuning */
  var P = { voice: 'tomiris', phrase: 0, pitch: 0, tempo: 1, bass: 0, treble: 0, phone: 0, drive: 0, robot: 0, echo: 0, reverb: 0 };
  // Archetypes, not imitations: no preset copies a real actor or a known film / game / cartoon character.
  var PRESETS = [
    ['🧒 Мальчик-герой', { voice: 'daniyar_kz', pitch: 4 }], ['👧 Девочка-героиня', { voice: 'assel_call_center_kz', pitch: 3, tempo: 1.03 }],
    ['🐿️ Шустрый зверёк', { voice: 'anara_call_center_kz', pitch: 7, tempo: 1.15, treble: 3 }], ['🗿 Добрый великан', { voice: 'bauyrzhan_audiobook_kz', pitch: -4, tempo: 0.9, bass: 6, reverb: 0.3 }],
    ['🤖 Космический робот', { voice: 'kanat_lecture_kz', robot: 0.7, echo: 0.15, treble: 2 }], ['🧙 Мудрый старец', { voice: 'bauyrzhan_audiobook_kz', pitch: -1, tempo: 0.86, reverb: 0.25 }],
    ['🦹 Злой колдун', { voice: 'alikhan_kz', pitch: -3, tempo: 0.9, drive: 0.35, reverb: 0.5, bass: 4 }], ['👻 Привидение', { voice: 'saltanat', pitch: 2, tempo: 0.85, reverb: 0.85, treble: 5 }],
    ['🦸 Супергерой', { voice: 'arman_call_center_kz', pitch: -1, bass: 4, echo: 0.2 }], ['🐉 Дракон', { voice: 'zhanbatyr_kz', pitch: -6, drive: 0.5, bass: 8, reverb: 0.4 }],
    ['📻 Рация', { voice: 'taymas', phone: 1, drive: 0.2 }], ['👵 Сказочная бабушка', { voice: 'guldana_audiobook_kz', pitch: -2, tempo: 0.9 }]
  ];
  var SL = [['pitch', 'Высота, пт', -12, 12, 0.5], ['tempo', 'Темп', 0.6, 1.5, 0.01], ['bass', 'Бас, дБ', -12, 12, 1], ['treble', 'Яркость, дБ', -12, 12, 1],
    ['drive', 'Хрип', 0, 1, 0.05], ['robot', 'Робот', 0, 1, 0.05], ['echo', 'Эхо', 0, 1, 0.05], ['reverb', 'Зал', 0, 1, 0.05]];

  function tuneTab() {
    var vs = L.voices.filter(function (v) { return v.ok; });
    var h = '<p class="muted">Тюнинг считается прямо на телефоне. Высота меняется без изменения темпа. Подходящий вариант переносится в <b>tools/voice_studio/fs-cast.json</b> (поля pitchSt, tempo, filter) — и герой переозвучивается тем же звучанием.</p>' +
      '<div class="card"><div class="grid"><label>Голос<select id="t-voice">' + vs.map(function (v) { return '<option value="' + esc(v.id) + '"' + (v.id === P.voice ? ' selected' : '') + '>' + esc(v.label) + ' · ' + (v.f0 || '?') + ' Гц</option>'; }).join('') + '</select></label>' +
      '<label>Фраза<select id="t-phrase">' + L.phrases.map(function (p, i) { return '<option value="' + i + '"' + (i === +P.phrase ? ' selected' : '') + '>' + esc(p.kk) + '</option>'; }).join('') + '</select></label></div>';
    SL.forEach(function (s) { h += '<div class="slider"><label for="s-' + s[0] + '">' + s[1] + '</label><input id="s-' + s[0] + '" type="range" min="' + s[2] + '" max="' + s[3] + '" step="' + s[4] + '" value="' + P[s[0]] + '"><output id="o-' + s[0] + '">' + P[s[0]] + '</output></div>'; });
    h += '<label class="row" style="min-height:44px"><input id="s-phone" type="checkbox"' + (P.phone ? ' checked' : '') + ' style="width:24px;height:24px"> Телефон / рация (полоса 300–3400 Гц)</label>' +
      '<div class="row" style="margin-top:8px"><button class="btn primary" id="t-play">▶ Слушать</button><button class="btn" id="t-orig">▶ Оригинал</button><button class="btn" id="t-reset">Сброс</button><span class="muted" id="t-status"></span></div></div>' +
      '<h2>Пресеты-архетипы</h2><div class="presets">' + PRESETS.map(function (p, i) { return '<button class="btn" data-preset="' + i + '">' + esc(p[0]) + '</button>'; }).join('') + '</div>' +
      '<p class="muted">Голоса конкретных актёров и узнаваемых персонажей фильмов, сериалов, игр и мультфильмов не копируются: это чужая внешность и голос, использовать их в приложении без разрешения нельзя. Пресеты — типажи, которые можно сделать своими.</p>' +
      '<h2>Для fs-cast.json</h2><pre id="t-cast"></pre>';
    return h;
  }
  function castLine() {
    var f = [];
    if (P.bass) f.push('bass=g=' + P.bass + ':f=250');
    if (P.treble) f.push('treble=g=' + P.treble + ':f=3000');
    if (P.phone) f.push('highpass=f=300,lowpass=f=3400');
    if (P.drive) f.push('volume=' + (1 + P.drive * 4).toFixed(2) + ',asoftclip=type=tanh');
    if (P.robot) f.push('aecho=0.8:0.9:6:' + (0.6 * P.robot).toFixed(2) + ',flanger=delay=1:depth=2:regen=' + Math.round(40 * P.robot));
    if (P.echo) f.push('aecho=0.8:0.7:250:' + (0.45 * P.echo).toFixed(2));
    if (P.reverb) f.push('aecho=0.8:0.85:40|73|113|167:' + [0.5, 0.4, 0.3, 0.2].map(function (k) { return (k * P.reverb).toFixed(2); }).join('|'));
    var o = { voice: P.voice, pitchSt: P.pitch };
    if (P.tempo !== 1) o.tempo = P.tempo;
    if (f.length) o.filter = f.join(',');
    o.why = 'подобрано в «Дауыс зертханасы»' + (P.robot ? '; робот в ffmpeg — приближение (флэнджер), в лаборатории — кольцевая модуляция' : '');
    return '"ГЕРОЙ": ' + JSON.stringify(o, null, 1).replace(/\n\s*/g, ' ');
  }

  /* ---------- DSP: WSOLA time stretch (factor s), then resample by r in the offline graph ---------- */
  function wsola(x, s) {
    var N = 1024, Hs = 256, tol = 160, Ha = Hs / s, outLen = Math.floor(x.length * s) + N, y = new Float32Array(outLen), w = new Float32Array(outLen), win = new Float32Array(N), k, i;
    for (i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
    var prev = 0, frames = Math.floor((outLen - N) / Hs);
    for (k = 0; k < frames; k++) {
      var ideal = Math.round(k * Ha), best = ideal;
      if (k > 0) {
        var nat = prev + Hs, bestC = -Infinity;
        for (var d = -tol; d <= tol; d += 4) {
          var c = 0, p = ideal + d; if (p < 0 || p + N >= x.length) continue;
          for (i = 0; i < 256; i += 2) c += x[p + i] * (x[nat + i] || 0);
          if (c > bestC) { bestC = c; best = p; }
        }
      }
      if (best + N >= x.length) break;
      for (i = 0; i < N; i++) { y[k * Hs + i] += x[best + i] * win[i]; w[k * Hs + i] += win[i]; }
      prev = best;
    }
    for (i = 0; i < outLen; i++) if (w[i] > 1e-3) y[i] /= w[i];
    return y.subarray(0, k * Hs + N);
  }
  var ACtx = window.AudioContext || window.webkitAudioContext, actx = null, cache = {};
  function decode(file) {
    if (cache[file]) return Promise.resolve(cache[file]);
    return new Promise(function (ok, bad) {
      var x = new XMLHttpRequest(); x.open('GET', 'voice-lab/' + file + '.mp3'); x.responseType = 'arraybuffer';
      x.onload = function () { actx = actx || new ACtx(); actx.decodeAudioData(x.response, function (b) { cache[file] = b; ok(b); }, bad); };
      x.onerror = bad; x.send();
    });
  }
  function impulse(ctx, sec) {
    var len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var ch = 0; ch < 2; ch++) { var d = b.getChannelData(ch); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    return b;
  }
  function render(buf) {
    var r = Math.pow(2, P.pitch / 12), st = r / P.tempo, sr = buf.sampleRate;
    var x = buf.getChannelData(0), y = Math.abs(st - 1) > 0.01 ? wsola(x, st) : x;
    var outLen = Math.ceil(y.length / r) + Math.floor(sr * (0.4 + P.reverb * 2 + P.echo * 1.2));
    var ctx = new OfflineAudioContext(1, outLen, sr), src = ctx.createBufferSource(), b = ctx.createBuffer(1, y.length, sr);
    b.copyToChannel ? b.copyToChannel(y, 0) : b.getChannelData(0).set(y);
    src.buffer = b; src.playbackRate.value = r;
    var node = src;
    function chain(n) { node.connect(n); node = n; return n; }
    var lo = ctx.createBiquadFilter(); lo.type = 'lowshelf'; lo.frequency.value = 250; lo.gain.value = P.bass; chain(lo);
    var hi = ctx.createBiquadFilter(); hi.type = 'highshelf'; hi.frequency.value = 3000; hi.gain.value = P.treble; chain(hi);
    if (P.phone) { var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 300; chain(hp); var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3400; chain(lp); }
    if (P.drive) { var ws = ctx.createWaveShaper(), cv = new Float32Array(1024), k = 1 + P.drive * 30; for (var i = 0; i < 1024; i++) { var t = i / 511.5 - 1; cv[i] = Math.tanh(k * t) / Math.tanh(k); } ws.curve = cv; chain(ws); }
    var mix = ctx.createGain();
    if (P.robot) {
      var dry = ctx.createGain(), wet = ctx.createGain(), osc = ctx.createOscillator();
      dry.gain.value = 1 - P.robot; wet.gain.value = 0; osc.frequency.value = 55; osc.connect(wet.gain); osc.start();
      node.connect(dry); node.connect(wet); dry.connect(mix); wet.connect(mix);
    } else node.connect(mix);
    var out = ctx.createDynamicsCompressor(); out.threshold.value = -6; out.connect(ctx.destination);
    mix.connect(out);
    if (P.echo) { var dl = ctx.createDelay(1), fb = ctx.createGain(), eg = ctx.createGain(); dl.delayTime.value = 0.25; fb.gain.value = 0.35 * P.echo + 0.1; eg.gain.value = 0.6 * P.echo; mix.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(eg); eg.connect(out); }
    if (P.reverb) { var cvl = ctx.createConvolver(), rg = ctx.createGain(); cvl.buffer = impulse(ctx, 0.4 + P.reverb * 2.2); rg.gain.value = 0.7 * P.reverb; mix.connect(cvl); cvl.connect(rg); rg.connect(out); }
    src.start();
    return ctx.startRendering();
  }
  var playing = null;
  function playTuned() {
    var st = document.getElementById('t-status'), file = 'v-' + P.voice + '-' + L.phrases[+P.phrase].id;
    st.textContent = 'считаю…';
    decode(file).then(render).then(function (b) {
      actx = actx || new ACtx(); if (actx.resume) actx.resume();
      if (playing) try { playing.stop(); } catch (e) { /* already stopped */ }
      var s = actx.createBufferSource(); s.buffer = b; s.connect(actx.destination); s.start(); playing = s;
      st.textContent = ''; window.__labRendered = { seconds: +b.duration.toFixed(2), params: JSON.parse(JSON.stringify(P)) };
    }).catch(function (e) { st.textContent = 'не получилось: ' + (e && e.message || e); });
  }

  /* ------------------------------------------------------------ wiring */
  var tab = 'voices';
  function show(t) {
    tab = t;
    [].forEach.call(document.querySelectorAll('[data-tab]'), function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === t); b.setAttribute('aria-selected', b.getAttribute('data-tab') === t); });
    main.innerHTML = t === 'voices' ? voicesTab() : t === 'features' ? featuresTab() : tuneTab();
    if (t === 'tune') bindTune();
    window.scrollTo(0, 0);
  }
  function bindTune() {
    var upd = function () { document.getElementById('t-cast').textContent = castLine(); };
    SL.forEach(function (s) { var el = document.getElementById('s-' + s[0]); el.oninput = function () { P[s[0]] = +el.value; document.getElementById('o-' + s[0]).textContent = el.value; upd(); }; });
    document.getElementById('s-phone').onchange = function (e) { P.phone = e.target.checked ? 1 : 0; upd(); };
    document.getElementById('t-voice').onchange = function (e) { P.voice = e.target.value; upd(); };
    document.getElementById('t-phrase').onchange = function (e) { P.phrase = +e.target.value; };
    document.getElementById('t-play').onclick = playTuned;
    document.getElementById('t-orig').onclick = function () { play('v-' + P.voice + '-' + L.phrases[+P.phrase].id); };
    document.getElementById('t-reset').onclick = function () { P = { voice: P.voice, phrase: P.phrase, pitch: 0, tempo: 1, bass: 0, treble: 0, phone: 0, drive: 0, robot: 0, echo: 0, reverb: 0 }; show('tune'); };
    upd();
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-tab],[data-play],[data-tune],[data-preset]'); if (!el) return;
    if (el.hasAttribute('data-tab')) show(el.getAttribute('data-tab'));
    else if (el.hasAttribute('data-play')) play(el.getAttribute('data-play'));
    else if (el.hasAttribute('data-tune')) { P.voice = el.getAttribute('data-tune'); show('tune'); }
    else { var pr = PRESETS[+el.getAttribute('data-preset')][1]; P = { voice: P.voice, phrase: P.phrase, pitch: 0, tempo: 1, bass: 0, treble: 0, phone: 0, drive: 0, robot: 0, echo: 0, reverb: 0 }; for (var k in pr) P[k] = pr[k]; show('tune'); playTuned(); }
  });
  window.__lab = { P: function () { return P; }, show: show, castLine: castLine };
  show('voices');
})();
