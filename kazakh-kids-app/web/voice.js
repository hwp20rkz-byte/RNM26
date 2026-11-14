/* Голосовой клиент: запись с микрофона → распознавание → оценка произношения (QScore).
 *
 * Три уровня распознавания, по убыванию качества:
 *   1. server  — QazaqVerse Voice (HTTPS API: GET /health, POST /assess, GET /tts). Адрес задаётся в профиле одной строкой
 *                вместе с ключом: https://host:8443/k/<КЛЮЧ>. Ключа нет ни в коде, ни в репозитории;
 *   2. android — системный распознаватель речи телефона (kk-KZ), если он есть (обычно телефоны с Google);
 *   3. none    — микрофона нет: задания «скажи вслух» не показываются, аркады работают бабблами и свайпами. */
(function () {
  'use strict';
  var A = window.Q.api, QS = window.QScore, esc = A.esc, qs = A.qs;
  function S() { return A.state(); }
  var srvOk = false, srvInfo = null, srvErr = '', lastPing = 0, coolUntil = 0, busy = false, pinging = null;

  /* ---------- engines ---------- */
  function androidStt() { try { return !!(window.Android && window.Android.sttAvailable && window.Android.sttAvailable()); } catch (e) { return false; } }
  function engine() {
    if (!S().micOn) return 'none';
    if (base() && !srvOk) maybePing();          // server came back (or the phone got online): picked up next time
    return (base() && srvOk) ? 'server' : androidStt() ? 'android' : 'none';
  }
  function ready() { return engine() !== 'none'; }
  function base() { return String(S().sttUrl || '').trim().replace(/\/+$/, '').replace(/\/(health|assess|tts|voices)$/, ''); }
  // Address for the profile: the key part of /k/<key> is masked.
  function shownBase() { return base().replace(/\/k\/([^/]{0,3})[^/]*/, function (m, a) { return '/k/' + a + '•••'; }); }

  /* HTTP with a real abort on timeout; always resolves to {status, json} or {status: 0, json: {error}} */
  function http(path, opts, ms) {
    if (!window.fetch) return Promise.resolve({ status: 0, json: { error: 'network' } });
    if (Date.now() < coolUntil) return Promise.resolve({ status: 429, json: { error: 'rate_limited' } });
    var ctrl = window.AbortController ? new AbortController() : null, timer;
    var o = Object.assign({ cache: 'default' }, opts || {}); if (ctrl) o.signal = ctrl.signal;
    var timeout = new Promise(function (res) { timer = setTimeout(function () { if (ctrl) ctrl.abort(); res({ status: 0, json: { error: 'timeout' } }); }, ms); });
    var call = fetch(base() + path, o).then(function (r) {
      return r.text().then(function (t) {
        var j; try { j = JSON.parse(t); } catch (e) { j = { error: r.ok ? 'server' : 'http_' + r.status }; }
        if (r.status === 429) coolUntil = Date.now() + 60000;   // the API asks clients not to retry in a loop
        if (!r.ok && !j.error) j.error = r.status === 401 ? 'unauthorized' : r.status === 429 ? 'rate_limited' : 'server';
        return { status: r.status, json: j };
      });
    }, function () { return { status: 0, json: { error: 'network' } }; });
    return Promise.race([call, timeout]).then(function (x) { clearTimeout(timer); return x; });
  }
  function ping() {
    if (!base()) { srvOk = false; srvInfo = null; srvErr = ''; return Promise.resolve(false); }
    if (pinging) return pinging;
    lastPing = Date.now();
    pinging = http('/health', { cache: 'no-store' }, 5000).then(function (x) {
      pinging = null;
      srvOk = !!(x.status === 200 && x.json && x.json.ok && x.json.stt !== false);
      srvInfo = srvOk ? x.json : null; srvErr = srvOk ? '' : (x.json && x.json.error) || (x.json && x.json.stt === false ? 'stt_unavailable' : 'server');
      return srvOk;
    });
    return pinging;
  }
  function maybePing() { if (!pinging && Date.now() - lastPing > 60000) ping(); }

  /* ---------- microphone → 16 kHz mono WAV, with a simple energy end-pointer ---------- */
  function record(maxSec, onLevel) {
    return navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } }).then(function (stream) {
      return new Promise(function (resolve) {
        var AC = window.AudioContext || window.webkitAudioContext, ctx = new AC();
        var src = ctx.createMediaStreamSource(stream), proc = ctx.createScriptProcessor(4096, 1, 1);
        var chunks = [], n = 0, spoke = false, quiet = 0, done = false, t0 = Date.now(), noise = 0.008;
        function stop() {
          if (done) return; done = true;
          try { proc.disconnect(); src.disconnect(); } catch (e) { /* ignore */ }
          stream.getTracks().forEach(function (t) { t.stop(); });
          var rate = ctx.sampleRate; try { ctx.close(); } catch (e) { /* ignore */ }
          var all = new Float32Array(n), o = 0; chunks.forEach(function (c) { all.set(c, o); o += c.length; });
          resolve({ wav: wav16k(all, rate), spoke: spoke });
        }
        proc.onaudioprocess = function (e) {
          var d = e.inputBuffer.getChannelData(0), sum = 0;
          for (var i = 0; i < d.length; i++) sum += d[i] * d[i];
          var rms = Math.sqrt(sum / d.length), sec = d.length / ctx.sampleRate;
          chunks.push(new Float32Array(d)); n += d.length;
          if (onLevel) onLevel(Math.min(1, rms * 12));
          if (!spoke) noise = noise * 0.9 + Math.min(rms, 0.03) * 0.1;
          if (rms > Math.max(0.02, noise * 3)) { spoke = true; quiet = 0; } else if (spoke) quiet += sec;
          var el = (Date.now() - t0) / 1000;
          if ((spoke && quiet > 0.9) || el > maxSec || (!spoke && el > 4)) stop();
        };
        src.connect(proc); proc.connect(ctx.destination);
        record.stop = stop;
      });
    });
  }
  function wav16k(f32, rate) {
    var ratio = rate / 16000, len = Math.floor(f32.length / ratio), buf = new ArrayBuffer(44 + len * 2), v = new DataView(buf);
    function str(o, s) { for (var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); }
    str(0, 'RIFF'); v.setUint32(4, 36 + len * 2, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 16000, true); v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, len * 2, true);
    for (var i = 0; i < len; i++) {                       // box-filter downsample
      var a = Math.floor(i * ratio), b = Math.min(f32.length, Math.floor((i + 1) * ratio)), s = 0;
      for (var k = a; k < b; k++) s += f32[k];
      s = Math.max(-1, Math.min(1, s / Math.max(1, b - a)));
      v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return new Blob([buf], { type: 'audio/wav' });
  }

  /* ---------- one assessment: resolves to a QScore result (+engine), or {error} ---------- */
  function listen(target, onLevel) {
    if (busy) return Promise.resolve({ error: 'busy' });
    var eng = engine();
    if (eng === 'none') return Promise.resolve({ error: 'nomic' });
    busy = true;
    var tgt = String(target).slice(0, 300);
    var p = eng === 'server'
      ? record(9, onLevel).then(function (rec) {
        // The server has its own (better) VAD and answers {error:"silence"}: the local end-pointer only decides when to stop.
        return http('/assess?target=' + encodeURIComponent(tgt) + '&lang=' + A.lang(), { method: 'POST', headers: { 'Content-Type': 'audio/wav' }, body: rec.wav, cache: 'no-store' }, 30000)
          .then(function (x) {
            var j = x.json || {};
            if (j.error) { if (/^(network|timeout|stt_unavailable|server|unauthorized)$/.test(j.error)) { srvOk = j.error !== 'unauthorized' && srvOk; srvErr = j.error; } return { error: j.error }; }
            if (typeof j.score !== 'number') return { error: 'server' };
            // The server's score/passed/missed/feedback are authoritative; the local alignment only colours the letters.
            var r = QS.assess(j.hypothesis || '', tgt, typeof j.confidence === 'number' ? j.confidence : 1);
            r.score = j.score; r.passed = !!j.passed; r.hypothesis = j.hypothesis || '';
            if (Array.isArray(j.missed)) r.missed = j.missed;
            if (j.feedback && j.feedback.kk) r.feedback = j.feedback;
            r.engine = 'server'; r.model = j.model; r.ms = j.ms;
            return r;
          });
      })
      : new Promise(function (resolve) {
        window.qStt = function (res) {
          window.qStt = null;
          if (!res || !res.ok || !res.texts || !res.texts.length) return resolve({ error: res && res.error || 'silence' });
          var best = null;
          res.texts.forEach(function (t, i) { var r = QS.assess(t, target, res.conf && res.conf[i] > 0 ? Math.max(0.6, res.conf[i]) : 1); if (!best || r.score > best.score) best = r; });
          best.engine = 'android'; resolve(best);
        };
        try { window.Android.sttStart('kk-KZ'); } catch (e) { window.qStt = null; resolve({ error: 'android' }); }
        setTimeout(function () { if (window.qStt) { window.qStt = null; resolve({ error: 'timeout' }); } }, 12000);
      });
    return p.catch(function (e) { return { error: String(e && e.name === 'NotAllowedError' ? 'denied' : (e && e.message) || e) }; })
      .then(function (r) { busy = false; if (r && r.score >= 80) { S().spoken = (S().spoken || 0) + 1; A.save(); } return r; });
  }
  var ERR = {
    silence: 'Не слышу тебя. Скажи громче и ближе к телефону.', denied: 'Нет доступа к микрофону. Разреши его в настройках приложения.',
    timeout: 'Сервер голоса не ответил. Можно пропустить задание.', server: 'Сервер голоса вернул ошибку. Можно пропустить задание.',
    network: 'Нет связи с сервером голоса. Можно пропустить задание.', stt_unavailable: 'Распознавание временно недоступно. Можно пропустить задание.',
    unauthorized: 'Сервер не принял ключ. Проверь адрес в профиле.', rate_limited: 'Слишком много попыток подряд. Подожди минуту или пропусти.',
    bad_audio: 'Запись не получилась. Попробуй ещё раз.', bad_target: 'Эту фразу нельзя проверить. Пропусти задание.',
    nomic: 'Микрофон не настроен.', busy: 'Подожди секунду…', android: 'Распознавание речи на телефоне недоступно.'
  };
  function errText(e) { return ERR[e] || 'Не получилось распознать речь. Попробуй ещё раз.'; }

  // Target with letters coloured by the alignment: green = said, red = missed.
  function diffHtml(r) {
    return r.ops.filter(function (o) { return o.t; }).map(function (o) { return '<span class="' + (o.op === 'ok' ? 'd-ok' : 'd-bad') + '">' + esc(o.t) + '</span>'; }).join('');
  }
  function resultHtml(r) {
    var fb = r.feedback[A.lang()] || r.feedback.ru;
    return '<div class="v-res ' + (r.passed ? 'pass' : 'fail') + '"><div class="v-ring" style="--p:' + Math.round(r.score) + '"><b>' + Math.round(r.score) + '%</b></div>' +
      '<div><div class="v-diff">' + diffHtml(r) + '</div><p class="muted">Услышано: «' + esc(r.hypothesis || '—') + '»</p><p><b>' + esc(r.feedback.kk) + '</b><br><span class="muted">' + esc(fb) + '</span></p></div></div>';
  }

  /* ---------- lesson exercise «Айт!» ---------- */
  function exSpeak(s) {
    var best = null, tries = 0, el;
    return {
      render: function (root, ctx) {
        el = root; best = null; tries = 0;
        el.innerHTML = '<span class="tag">🎙️ Айт · скажи</span><h2 class="task">Скажи вслух по-казахски</h2>' + A.prompt(s.kk, true) +
          '<p class="muted center">' + esc(A.tr(s)) + '</p><button class="mic" id="mic" aria-label="Говорить">🎙️<i></i></button><p class="muted center" id="vhint">Сначала послушай 🔊, потом нажми на микрофон и скажи.</p>' +
          '<div id="vres"></div><button class="link" id="vskip">Сейчас не могу говорить — пропустить</button>';
        A.bindSpeak(el); A.TTS.speak(s.kk, true);
        qs('#vskip', el).onclick = function () { ctx.done({ ok: true, silent: true }); };
        var mic = qs('#mic', el);
        mic.onclick = function () {
          if (busy) { if (record.stop) record.stop(); return; }
          mic.classList.add('on'); qs('#vhint', el).textContent = 'Слушаю… говори!'; A.sfx.tap();
          listen(s.kk, function (lv) { mic.style.setProperty('--lv', lv.toFixed(2)); }).then(function (r) {
            if (!document.body.contains(el)) return;
            mic.classList.remove('on'); tries++;
            if (r.error) {
              qs('#vhint', el).textContent = errText(r.error); A.sfx.bad();
              // never block the lesson: after a technical failure the skip link becomes a real button
              if (r.error !== 'silence' && r.error !== 'busy') qs('#vskip', el).className = 'btn ghost';
              return;
            }
            if (!best || r.score > best.score) best = r;
            qs('#vres', el).innerHTML = resultHtml(best);
            qs('#vhint', el).textContent = best.passed ? 'Можно ещё раз — или жми «Тексеру».' : tries >= 3 ? 'Жми «Тексеру» и идём дальше.' : 'Попробуй ещё раз!';
            if (r.passed) A.sfx.ok(); else A.sfx.bad();
            ctx.ready(best.passed || tries >= 3);
          });
        };
      },
      check: function () {
        var ans = s.kk + (best ? ' — ' + Math.round(best.score) + '%' : '');
        // Speech recognition is never perfect, least of all with children: a miss costs nothing.
        return best && best.passed ? { ok: true, ans: ans, tr: A.tr(s) } : { neutral: true, title: 'Жаттыға бер!', ans: ans, tr: A.tr(s) };
      }
    };
  }

  /* ---------- profile panel ---------- */
  function panel() {
    var eng = engine(), st = S();
    var status = !st.micOn ? '⏸ выключено' : eng === 'server' ? '✅ сервер QazaqVerse Voice' + (srvInfo && srvInfo.model ? ' (' + esc(srvInfo.model) + ')' : '') : eng === 'android' ? '✅ распознавание телефона (kk-KZ)' : '❌ нет распознавания';
    var srvLine = !base() ? '' : '<p class="muted" style="margin:0"><span>Сервер:</span> <span>' + esc(shownBase()) + '</span> — <span>' + (srvOk ? 'на связи' : srvErr ? esc(errText(srvErr)) : 'проверяю…') + '</span></p>';
    return '<h2>Дауыс · оценка произношения</h2><div class="panel" style="display:flex;flex-direction:column;gap:12px"><b>🎙️ Микрофон: ' + status + '</b>' + srvLine +
      '<p class="muted" style="margin:0">Задания «Айт!» и голосовой ввод в аркадах включаются, когда есть распознавание речи: сервер QazaqVerse Voice (казахский Whisper, через интернет) или распознавание самого телефона. Без него всё работает бабблами и свайпами. Вставь адрес сервера вместе с ключом одной строкой — его выдаёт владелец сервиса.</p>' +
      '<input id="vurl" class="name" type="url" inputmode="url" spellcheck="false" placeholder="https://…:8443/k/КЛЮЧ" value="' + esc(st.sttUrl) + '" autocomplete="off">' +
      '<p class="muted" style="margin:0;font-size:var(--fs-1)">🔒 Запись голоса отправляется на сервер только для оценки и там не хранится.</p>' +
      '<div class="fc-btns"><button class="btn ghost" id="vtest">Проверить сервер</button><button class="btn ghost" id="vtoggle">' + (st.micOn ? 'Выключить микрофон' : 'Включить микрофон') + '</button></div>' +
      (ready() ? '<button class="btn gold" id="vtry">🎙️ Проба: «Сәлем, досым!»</button><div id="vtryres"></div>' : '') + '</div>';
  }
  function bindPanel() {
    var u = qs('#vurl'); if (!u) return;
    qs('#vtest').onclick = function () {
      S().sttUrl = u.value.trim(); A.save(); A.toast('Проверяю сервер…');
      if (u.value.trim() && !/^https?:\/\//i.test(u.value.trim())) { A.toast('Адрес должен начинаться с https://'); return; }
      coolUntil = 0;
      ping().then(function (ok) { A.toast(ok ? '✅ Сервер голоса на связи' : '❌ ' + errText(srvErr || 'network')); A.refresh(); });
    };
    qs('#vtoggle').onclick = function () { S().micOn = !S().micOn; A.save(); A.refresh(); };
    var t = qs('#vtry');
    if (t) t.onclick = function () {
      qs('#vtryres').innerHTML = '<p class="muted">Слушаю… скажи «Сәлем, досым!»</p>';
      listen('Сәлем, досым!').then(function (r) { if (qs('#vtryres')) qs('#vtryres').innerHTML = r.error ? '<p class="muted">' + errText(r.error) + '</p>' : resultHtml(r); });
    };
  }

  /* ---------- /tts: only for text that is not bundled (dynamic phrases). Lessons stay offline. ---------- */
  function ttsUrl(text, voice) {
    var t = String(text || '').trim();
    if (!t || t.length > 400 || !srvOk || !base() || Date.now() < coolUntil) return null;
    var vs = (srvInfo && srvInfo.voices) || ['iseke', 'issai'], v = vs.indexOf(voice) >= 0 ? voice : vs.indexOf('iseke') >= 0 ? 'iseke' : vs[0];
    // issai speaker 2 at 0.87 speed = the bundled narrator, so remote and bundled phrases sound alike
    return base() + '/tts?voice=' + encodeURIComponent(v) + (v === 'issai' ? '&speaker=2&speed=0.87' : '') + '&fmt=mp3&text=' + encodeURIComponent(t);
  }
  var prevResume = window.qResume;
  window.qResume = function () { if (base()) ping(); if (prevResume) prevResume(); };

  window.Q.ext.voiceReady = ready;
  window.Q.ext.exSpeak = exSpeak;
  window.Q.ext.voicePanel = panel;
  window.Q.ext.bindVoicePanel = bindPanel;
  window.QVOICE = { listen: listen, ready: ready, engine: engine, ping: ping, ttsUrl: ttsUrl, resultHtml: resultHtml, errText: errText, stop: function () { if (record.stop) record.stop(); } };
  if (S().sttUrl) ping();
})();
