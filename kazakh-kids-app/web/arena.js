/* Арена: 3D-аукцион, «Асық үйіру», лиги Шежіре XP, коллекция и 3D-галерея героя. */
(function () {
  'use strict';
  var A = window.Q.api, W = A.W, V = window.QV3D, AU = window.QAuction;
  var esc = A.esc, qs = A.qs, qsa = A.qsa, rnd = A.rnd;
  function S() { return A.state(); }
  function L(o) { return A.tr(o); }
  function line(group, name) { var l = W.LINES[group][name]; A.TTS.speak(l.kk, true); return l; }
  function lot(id) { return W.LOTS.filter(function (x) { return x.id === id; })[0]; }
  function thumb(id, size, skin) {
    var url = V && V.ok() ? V.snapshot(id, size * 2, skin) : null;
    var l = lot(id);
    return url ? '<img class="thumb" src="' + url + '" width="' + size + '" height="' + size + '" alt="">' : '<span class="em" style="font-size:' + Math.round(size * 0.6) + 'px">' + (l ? l.e : '🎁') + '</span>';
  }
  function fmtTime(ms) { var m = Math.ceil(ms / 60000), h = Math.floor(m / 60); return (h ? h + ' ч ' : '') + (m % 60) + ' мин'; }
  function place(stage, obj, x, y, z) { obj.position.set(x || 0, y || 0, z || 0); stage.scene.add(obj); return obj; } // static prop (no idle bob)
  var cleanup = null;
  function leave() { if (cleanup) { cleanup(); cleanup = null; } if (V) V.disposeAll(); A.renderHome(); }
  window.Q.ext.arenaBack = leave;

  /* ================= auction ================= */
  function currentLot() {
    var slot = AU.slotOf(Date.now()), rng = AU.seeded(slot * 7919 + 13);
    var pool = W.LOTS.filter(function (l) { return !S().inv[l.id]; });
    if (!pool.length) pool = W.LOTS;
    // rarer lots come up less often
    var bag = []; pool.forEach(function (l) { for (var i = 0; i < 4 - l.r; i++) bag.push(l); });
    return { slot: String(slot), lot: bag[Math.floor(rng() * bag.length)] };
  }
  function auctionCard() {
    var c = currentLot(), used = S().auctionSlot === c.slot, l = c.lot;
    return '<button class="auc-card' + (used ? ' used' : '') + '" id="aucgo">' + thumb(l.id, 72) +
      '<span><small>' + (used ? '🔨 Келесі аукцион · следующий через ' + fmtTime(AU.msToNextSlot(Date.now())) : '<i class="live">LIVE</i> 3D-аукцион · каждые 6 часов') + '</small>' +
      '<b>' + esc(l.kk) + ' <span class="rar r' + l.r + '">' + W.RARITY[l.r] + '</span></b>' +
      '<span class="muted">' + esc(L(l)) + ' · от ' + l.start + ' 🪙</span></span></button>';
  }
  function openAuction() {
    var c = currentLot(), l = c.lot, st = S();
    if (st.auctionSlot === c.slot) { A.sfx.bad(); A.toast('🔨 Этот лот уже разыгран. Следующий аукцион через ' + fmtTime(AU.msToNextSlot(Date.now()))); return; }
    st.auctionSlot = c.slot; A.save();
    A.setView('arena');
    var rng = Math.random;
    var au = new AU.Auction(l, l.start, 30, { step: 10, antiSnipe: 5 });
    var names = A.shuffle(W.BOTS).slice(0, 3);
    var bots = names.map(function (n, i) { return { name: n, limit: Math.round(l.start * (1.15 + rng() * (0.5 + l.r * 0.25)) / 10) * 10, zeal: 0.22 + rng() * 0.2 + i * 0.03 }; });
    var ME = '__me__';
    A.app.innerHTML = '<div class="arena"><div class="g-top"><button class="x" id="ax" aria-label="Выйти">✕</button><b class="g-title">3D Live Auction Hall</b><span class="g-stat" id="acoins"></span></div>' +
      '<div class="a-stage" id="ast">' + (V && V.ok() ? '' : '<div class="a-flat">' + l.e + '</div>') + '</div>' +
      '<div class="a-panel"><div class="lot-name">' + esc(l.kk) + ' <span class="rar r' + l.r + '">' + W.RARITY[l.r] + '</span></div><p class="muted">' + esc(W.KIND[l.kind].kk) + ' · ' + esc(L(l)) + '</p>' +
      '<div class="a-row"><div><small>Ағымдағы баға · текущая ставка</small><b id="abid"></b></div><div><small>Балғаға дейін · до молотка</small><b id="atime"></b></div></div>' +
      '<div class="a-feed" id="afeed"></div>' +
      '<div class="a-bids" id="abtn"></div></div></div>';
    qs('#ax').onclick = leave;
    var stage = null, lotObj = null, ham = null, hamT = -9;
    if (V && V.ok()) {
      stage = V.stage(qs('#ast'), { camPos: [0, 2.7, 8.2], camLook: [0, 1.5, 0], fov: 36 });
      if (stage) {
        place(stage, V.pedestal(), 0, 0, 0);
        lotObj = V.make(l.id); var sc = l.kind === 'trail' ? 1 : l.kind === 'skin' ? 1.5 : 1.25;
        lotObj.scale.setScalar(sc); stage.add(lotObj, 0, l.kind === 'trail' ? 1.6 : 0.6, 0);
        ham = place(stage, V.hammer(), 2.6, 0.5, 0.6); ham.rotation.y = -0.6;
        place(stage, V.box(0.9, 0.3, 0.9, 0x4b2f1c), 1.75, 0.15, 0.95);                      // sound block
        var bidder = V.make('batyr'); bidder.scale.setScalar(0.58); bidder.rotation.y = 0.5; stage.add(bidder, -2.25, 0, 0.9);
        stage.onTick(function (t) {
          if (l.kind !== 'trail') lotObj.rotation.y = t * 0.9;
          var k = t - hamT;                                                              // strike: wind up → hit → rebound
          ham.userData.arm.rotation.z = k < 0.18 ? -0.5 * (k / 0.18) : k < 0.3 ? -0.5 + 1.9 * ((k - 0.18) / 0.12) : k < 0.6 ? 1.4 - 1.1 * ((k - 0.3) / 0.3) : 0.3;
        });
      }
    }
    function strike() { hamT = V ? V.now() : 0; A.vibrate(60); A.sfx.pop(); }
    function feed(html, cls) { var f = qs('#afeed'); if (!f) return; var d = document.createElement('div'); d.className = 'bidline ' + (cls || ''); d.innerHTML = html; f.insertBefore(d, f.firstChild); while (f.children.length > 5) f.removeChild(f.lastChild); }
    function draw() {
      if (!qs('#abid')) return;
      qs('#abid').innerHTML = au.bid + ' 🪙'; qs('#atime').textContent = '00:' + ('0' + Math.max(0, au.time)).slice(-2);
      qs('#acoins').innerHTML = S().coins + ' 🪙';
      qs('#atime').className = au.time <= 5 ? 'hot' : '';
      if (!au.active) return;                        // the result panel is drawn by finish()
      var lead = au.leader === ME;
      qs('#abtn').innerHTML = lead ? '<p class="lead">✅ Сенің бағаң жоғары! · твоя ставка лидирует</p>' :
        [10, 30, 60].map(function (inc) {
          var amt = au.bid + inc, can = S().coins >= amt;
          return '<button class="btn ' + (can ? 'gold' : '') + '" data-bid="' + amt + '"' + (can ? '' : ' disabled') + '>' + amt + ' 🔨</button>';
        }).join('');
      qsa('[data-bid]').forEach(function (b) {
        b.onclick = function () {
          var r = au.placeBid(ME, +b.getAttribute('data-bid'));
          if (r.ok) { A.sfx.coin(); A.vibrate(25); feed('<b>Сен</b>: ' + au.bid + ' 🪙 — Бәс қабылданды!', 'me'); line('judge', 'bid'); draw(); }
        };
      });
    }
    var QUIPS = ['Мен берем!', 'Тағы қосамын!', 'Пәлі, менікі болады!', 'Бәсе, қымбаттады!', 'Жіберме, достар!'];
    feed('🔨 ' + esc(line('judge', 'start').kk)); draw();
    var timer = setInterval(function () {
      if (!au.active) return;
      var mv = AU.botMove(au, bots, rng);
      if (mv) { A.sfx.tap(); feed('<b>' + esc(mv.bot.name) + '</b>: ' + mv.amount + ' 🪙 — ' + QUIPS[rnd(QUIPS.length)]); }
      au.tick().forEach(function (ev) {
        if (ev.type === 'count') { strike(); feed('🔨 <b>' + esc(line('judge', ev.n === 1 ? 'one' : 'two').kk) + '</b>', 'count'); }
        else finish(ev);
      });
      draw();
    }, 1000);
    cleanup = function () { clearInterval(timer); };
    function finish(ev) {
      clearInterval(timer); strike(); setTimeout(strike, 260);
      var won = ev.type === 'sold' && ev.winner === ME, st2 = S();
      line('judge', 'sold');
      if (won) {
        st2.coins -= ev.price; st2.inv[l.id] = 1; st2.eq[l.kind] = l.id; st2.auctionWins = (st2.auctionWins || 0) + 1;
        A.vibrate(200); A.confetti(); A.sfx.win(); if (stage) V.sparks(stage, 0, 2, 0);
        setTimeout(function () { line('judge', 'grats'); }, 900);
      }
      A.checkAch(); A.save();
      feed('🔨 <b>Сатылды!</b> ' + (ev.type === 'nosale' ? 'Ставок не было' : won ? 'Лот твой за ' + ev.price + ' 🪙' : 'Победил(а) ' + esc(ev.winner) + ' — ' + ev.price + ' 🪙'), 'count');
      qs('#abtn').innerHTML = '<p class="lead">' + (won ? '🎉 Құттықтаймыз! «' + esc(l.kk) + '» уже надет(а). Смотри в профиле.' : 'Қап! В этот раз не вышло. Следующий аукцион через ' + fmtTime(AU.msToNextSlot(Date.now())) + '.') + '</p>' +
        '<button class="btn ok" id="adone">Жалғастыру</button>';
      qs('#adone').onclick = leave;
    }
  }

  /* ================= Асық үйіру (daily lucky toss) ================= */
  var POS = [
    { id: 'alshy', kk: 'Алшы', ru: 'лучшая сторона', en: 'the best side', p: 0.34, rot: 0 },
    { id: 'tayke', kk: 'Тәйке', ru: 'обратная сторона', en: 'the reverse side', p: 0.22, rot: Math.PI },
    { id: 'buk', kk: 'Бүк', ru: 'выпуклый бок', en: 'the humped side', p: 0.22, rot: Math.PI / 2 },
    { id: 'shik', kk: 'Шік', ru: 'вогнутый бок', en: 'the hollow side', p: 0.22, rot: -Math.PI / 2 }
  ];
  function rollPos(r) { var x = r(), acc = 0; for (var i = 0; i < POS.length; i++) { acc += POS[i].p; if (x < acc) return POS[i]; } return POS[3]; }
  function tossPrize(res) {
    var al = res.filter(function (p) { return p.id === 'alshy'; }).length, ta = res.filter(function (p) { return p.id === 'tayke'; }).length;
    var o = { alshy: al, coins: 10 + al * 15 + ta * 5, boostH: 0, jackpot: al === 4 };
    if (al === 4) { o.coins += 500; o.boostH = 24; } else if (al === 3) o.boostH = 1;
    return o;
  }
  function openToss() {
    var st = S();
    if (st.tossDay === A.today()) { A.toast('🦴 Сегодня асыки уже брошены. Приходи завтра!'); return; }
    A.setView('arena');
    A.app.innerHTML = '<div class="arena"><div class="g-top"><button class="x" id="ax" aria-label="Выйти">✕</button><b class="g-title">Асық үйіру</b><span class="g-stat">Daily Lucky Toss</span></div>' +
      '<div class="a-stage tall" id="ast"></div><div class="a-panel"><p class="muted">Брось четыре асыка. Каждый «алшы» — больше золотых асыков. Четыре «алшы» — джекпот и ×2 XP на сутки!</p>' +
      '<div class="toss-res" id="tres">' + [0, 1, 2, 3].map(function () { return '<div class="tr-cell">🦴<small>?</small></div>'; }).join('') + '</div>' +
      '<div id="tbtn"><button class="btn gold" id="tgo">Үйір! · Бросить</button></div></div></div>';
    qs('#ax').onclick = leave;
    var stage = null, bones = [];
    if (V && V.ok()) {
      stage = V.stage(qs('#ast'), { camPos: [0, 8.2, 7.4], camLook: [0, 0.2, 0.3], fov: 36 });
      if (stage) {
        stage.scene.add(V.box(8, 0.2, 5, 0x7a1f3d, 0, -0.1, 0), V.box(8.2, 0.16, 5.2, V.glow(V.NEON.gold), 0, -0.14, 0));
        for (var i = 0; i < 4; i++) { var b = V.asyk(); b.scale.setScalar(0.82); b.position.set(-2.25 + i * 1.5, 0.3, 0); b.rotation.x = Math.PI / 2; b.rotation.y = 0.3; stage.scene.add(b); bones.push(b); }
      }
    }
    qs('#tgo').onclick = function () {
      var res = [0, 1, 2, 3].map(function () { return rollPos(Math.random); }), prize = tossPrize(res);
      st.tossDay = A.today(); A.save(); questEvent({ t: 'toss' });
      qs('#tbtn').innerHTML = ''; A.sfx.tap(); A.vibrate(40);
      var t0 = V ? V.now() : 0, done = false;
      var spin = bones.map(function () { return { sx: 6 + Math.random() * 8, sz: 4 + Math.random() * 6, h: 2.2 + Math.random() * 1.4, d: 1.1 + Math.random() * 0.5, zx: (Math.random() - 0.5) * 1.4 }; });
      if (stage) stage.onTick(function (t) {
        bones.forEach(function (b, i) {
          var k = Math.min(1, (t - t0) / spin[i].d), fall = 1 - k;
          b.position.y = 0.3 + Math.sin(k * Math.PI) * spin[i].h; b.position.z = spin[i].zx * k;
          b.rotation.x = res[i].rot + fall * spin[i].sx; b.rotation.z = fall * spin[i].sz; b.rotation.y = fall * 3 + 0.25 + (i % 2 ? -0.5 : 0);
        });
      });
      setTimeout(function () {
        if (done) return; done = true;
        A.vibrate(80);
        qs('#tres').innerHTML = res.map(function (p) { return '<div class="tr-cell ' + p.id + '">🦴<b>' + p.kk + '</b><small>' + esc(L(p)) + '</small></div>'; }).join('');
        st.coins += prize.coins;
        if (prize.boostH) { st.xpBoost = 2; st.xpBoostUntil = Date.now() + prize.boostH * 3600e3; }
        if (prize.jackpot) { st.jackpots = (st.jackpots || 0) + 1; A.confetti(); A.sfx.win(); A.vibrate(300); line('asyk', 'jackpot'); if (stage) V.sparks(stage, 0, 1, 0, null, 60); }
        else if (prize.alshy) { A.sfx.ok(); line('asyk', 'alshy'); } else A.sfx.pair();
        A.checkAch(); A.save();
        qs('#tbtn').innerHTML = '<p class="lead">' + (prize.jackpot ? '🏆 ДЖЕКПОТ! Төрт алшы! ' : prize.alshy ? 'Алшы × ' + prize.alshy + '! ' : 'Сегодня без алшы. ') +
          '<b class="coins-big">+' + prize.coins + ' 🪙</b>' + (prize.boostH ? '<br>⚡ ×2 Шежіре XP на ' + (prize.boostH === 24 ? '24 часа' : '1 час') + '!' : '') + '</p><button class="btn ok" id="adone">Жалғастыру</button>';
        qs('#adone').onclick = leave;
      }, stage ? 1800 : 500);
    };
  }

  /* ================= daily quests ================= */
  var QUESTS = [
    { id: 'lesson', icon: '📘', goal: 2, kk: '2 сабақ өт', ru: 'Пройди 2 урока', en: 'Finish 2 lessons', coins: 20 },
    { id: 'perfect', icon: '💎', goal: 1, kk: 'Мінсіз сабақ', ru: 'Пройди урок без ошибок', en: 'Finish a lesson with no mistakes', coins: 25 },
    { id: 'arcade', icon: '🕹️', goal: 1, kk: 'Аркада ойна', ru: 'Сыграй в аркаду', en: 'Play an arcade game', coins: 15 },
    { id: 'games', icon: '🎮', goal: 2, kk: '2 ойын ойна', ru: 'Сыграй в 2 любые игры', en: 'Play any 2 games', coins: 15 },
    { id: 'xp', icon: '⚡', goal: 40, kk: '40 XP жина', ru: 'Набери 40 XP за день', en: 'Earn 40 XP today', coins: 20 },
    { id: 'toss', icon: '🦴', goal: 1, kk: 'Асық үйір', ru: 'Брось асыки', en: 'Throw the asyks', coins: 10 }
  ];
  function quests() {
    var st = S(), day = A.today();
    if (!st.quests || st.quests.day !== day) {
      var rng = AU.seeded(day.split('-').reduce(function (n, x) { return n * 37 + (+x); }, 7));
      var pool = QUESTS.slice().sort(function () { return rng() - 0.5; }).slice(0, 3);
      st.quests = { day: day, bonus: false, q: pool.map(function (q) { return { id: q.id, p: 0, c: false }; }) };
      A.save();
    }
    st.quests.q.forEach(function (x) { if (x.id === 'xp') x.p = st.dayXp || 0; });
    return st.quests;
  }
  function qDef(id) { return QUESTS.filter(function (q) { return q.id === id; })[0]; }
  function questEvent(e) {
    quests().q.forEach(function (x) {
      if ((x.id === 'lesson' && e.t === 'lesson' && !e.practice) || (x.id === 'perfect' && e.t === 'lesson' && e.stars === 3 && !e.practice) ||
        (x.id === 'arcade' && e.t === 'game' && e.arcade) || (x.id === 'games' && e.t === 'game') || (x.id === 'toss' && e.t === 'toss')) x.p++;
    });
    A.save();
  }
  function questsHtml() {
    var Q = quests(), allClaimed = Q.q.every(function (x) { return x.c; });
    return '<div class="pad"><div class="quests"><div class="q-head"><b>Күнделікті тапсырмалар</b><span class="muted">задания дня</span></div>' + Q.q.map(function (x, i) {
      var d = qDef(x.id), p = Math.min(d.goal, x.p), done = p >= d.goal;
      return '<div class="quest' + (x.c ? ' claimed' : done ? ' done' : '') + '"><span class="qi">' + d.icon + '</span><div class="qt"><b>' + esc(d.kk) + '</b><span class="muted">' + esc(L(d)) + '</span>' +
        '<div class="goal dark"><i style="width:' + Math.round(p / d.goal * 100) + '%"></i></div></div>' +
        (x.c ? '<span class="pill ok">✓</span>' : done ? '<button class="btn gold q-claim" data-q="' + i + '">+' + d.coins + ' 🪙</button>' : '<span class="pill">' + p + '/' + d.goal + '</span>') + '</div>';
    }).join('') + (allClaimed && !Q.bonus ? '<button class="btn gold" id="qbonus">🎁 Сандық · бонус за все задания</button>' : '') + '</div></div>';
  }
  function bindQuests() {
    qsa('[data-q]').forEach(function (b) {
      b.onclick = function () {
        var Q = quests(), x = Q.q[+b.getAttribute('data-q')], d = qDef(x.id);
        if (x.c) return;
        x.c = true; S().coins += d.coins; A.save(); A.sfx.coin(); A.vibrate(30); A.refresh();
      };
    });
    var qb = qs('#qbonus');
    if (qb) qb.onclick = function () { quests().bonus = true; A.save(); A.openChest('Күнделікті сандық', 30, 0.6); };
  }
  window.Q.ext.event = questEvent;

  /* ================= leagues ================= */
  function leagueBoard() {
    var st = S(), li = A.league(), lg = W.LEAGUES[li], nx = W.LEAGUES[li + 1];
    var d = new Date(), frac = ((d.getDay() + 6) % 7 + d.getHours() / 24) / 7, seed = AU.seeded(parseInt(String(st.weekId || '0').replace(/\D/g, ''), 10) || 1);
    var rows = W.BOTS.map(function (n) { return { n: n, xp: Math.round((30 + seed() * 260) * (0.15 + frac) * (1 + li * 0.35)) }; });
    rows.push({ n: st.name || 'Сен', xp: st.weekXp || 0, me: true });
    rows.sort(function (a, b) { return b.xp - a.xp; });
    var pct = nx ? Math.min(100, Math.round((st.xp - lg.xp) / (nx.xp - lg.xp) * 100)) : 100;
    return '<h2>Шежіре XP · лиги</h2><div class="panel league"><div class="lg-head"><span class="lg-ic">' + lg.icon + '</span><div style="flex:1"><b>' + esc(lg.kk) + '</b><span class="muted">' + esc(L(lg)) +
      (nx ? ' · до «' + esc(nx.kk) + '» ещё ' + (nx.xp - st.xp) + ' XP' : ' · высшая лига!') + '</span><div class="goal dark"><i style="width:' + pct + '%"></i></div></div></div>' +
      '<p class="muted">Таблица недели — соревнуйся с ботами:</p><ol class="lg-list">' + rows.slice(0, 10).map(function (r, i) {
        return '<li class="' + (r.me ? 'me' : '') + '"><span>' + (i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1) + '</span><b>' + esc(r.n) + '</b><i>' + r.xp + ' XP</i></li>';
      }).join('') + '</ol></div>';
  }

  /* ================= 3D gallery + collection ================= */
  function galleryHtml() {
    var st = S(), h = A.heroInfo(st.heroSel);
    var moves = { slam: 'Shattyq Slam', shuffle: 'Electro-Shuffle', kickflip: '360 Kickflip', bata: 'Бата' };
    return '<h2>Галерея · 3D</h2><div class="gallery"><div class="g-stage" id="gst">' + (h.neo && V && V.ok() ? '' : A.myHero('wow')) + '</div>' +
      '<div class="g-info"><b>' + esc(h.kk) + '</b><span class="muted">' + esc(L(h)) + '</span>' +
      (h.neo ? '<button class="btn gold" id="gmove">▶ ' + moves[h.move] + '</button>' : '<span class="muted">3D-режим есть у нео-героев: Батыр-X, Айсұлу Neon, Тайсон-Тайпақ, Әже-Bot 3000.</span>') + '</div></div>' +
      '<div class="hero-pick">' + W.HEROES.filter(function (x) { return x.neo; }).map(function (x) {
        var own = st.heroes.indexOf(x.id) >= 0;
        return '<button class="hp' + (st.heroSel === x.id ? ' on' : '') + (own ? '' : ' locked') + '" data-gh="' + x.id + '">' + W.hero(x.id, 'happy') + '<small>' + (own ? esc(x.kk) : x.price + ' 🪙') + '</small></button>';
      }).join('') + '</div>';
  }
  function bindGallery() {
    var st = S(), h = A.heroInfo(st.heroSel), stage = null, av = null;
    if (h.neo && V && V.ok() && qs('#gst')) {
      stage = V.stage(qs('#gst'), { camPos: [0.6, 2.6, 10.2], camLook: [0.3, 1.75, 0], fov: 34 });
      if (stage) {
        av = V.make(h.id); if (st.eq.skin) V.wear(av, st.eq.skin); av.rotation.y = -0.25; stage.add(av, -0.2, 0, 0);
        place(stage, V.pedestal(), -0.2, -0.56, 0);
        if (st.eq.pet) { var p = V.make(st.eq.pet); p.rotation.y = -0.9; stage.add(p, 2.0, 0, 0.6); }
        if (st.eq.trail) { var tr = V.make(st.eq.trail); stage.add(tr, -0.2, 1.3, 0); }
      }
    }
    var mv = qs('#gmove');
    if (mv) mv.onclick = function () {
      A.sfx.pair(); A.TTS.speak(W.LINES[h.id].combo.kk, true);
      if (stage && av) { stage.play(av, h.move); if (h.move === 'bata' || h.move === 'slam') setTimeout(function () { V.sparks(stage, -0.2, 2.2, 0.6); }, h.move === 'slam' ? 900 : 300); }
    };
    qsa('[data-gh]').forEach(function (b) {
      b.onclick = function () {
        var x = A.heroInfo(b.getAttribute('data-gh'));
        if (st.heroes.indexOf(x.id) >= 0) { st.heroSel = x.id; A.save(); A.sfx.pair(); A.TTS.speak(W.LINES[x.id].intro.kk, true); A.refresh(); return; }
        A.buy(x.price, 'Кейіпкер: ' + x.kk, function () { st.heroes.push(x.id); st.heroSel = x.id; });
      };
    });
  }
  function collectionHtml() {
    var st = S();
    return '<h2>Коллекция · скины, питомцы, следы</h2><p class="muted">Редкие вещи разыгрываются только на аукционе. Нажми на свою вещь, чтобы надеть или снять.</p><div class="inv">' + W.LOTS.map(function (l) {
      var own = st.inv[l.id], on = st.eq[l.kind] === l.id;
      return '<button class="inv-it r' + l.r + (own ? '' : ' off') + (on ? ' on' : '') + '" data-inv="' + l.id + '">' + (own ? thumb(l.id, 56) : '<span class="em">🔒</span>') +
        '<b>' + esc(l.kk) + '</b><small>' + esc(W.KIND[l.kind].kk) + ' · ' + W.RARITY[l.r] + '</small>' + (on ? '<i>✓</i>' : '') + '</button>';
    }).join('') + '</div>';
  }
  function bindCollection() {
    qsa('[data-inv]').forEach(function (b) {
      b.onclick = function () {
        var st = S(), l = lot(b.getAttribute('data-inv'));
        if (!st.inv[l.id]) { A.sfx.bad(); A.toast('🔒 «' + l.kk + '» можно выиграть только на аукционе'); return; }
        st.eq[l.kind] = st.eq[l.kind] === l.id ? '' : l.id; A.save(); A.sfx.pair(); A.refresh();
      };
    });
  }

  /* ================= hooks into the app shell ================= */
  window.Q.ext.homeCard = function () {
    var st = S(), toss = st.tossDay !== A.today(), auc = st.auctionSlot !== currentLot().slot, lg = W.LEAGUES[A.league()];
    var boost = A.xpBoost() > 1 ? '<div class="boost">⚡ ×2 Шежіре XP — ещё ' + fmtTime(st.xpBoostUntil - Date.now()) + '</div>' : '';
    return '<div class="pad">' + boost + '<div class="chips3"><button class="chip' + (toss ? ' hot' : '') + '" id="hc-toss"><span>🦴</span>Асық үйіру' + (toss ? '<i>!</i>' : '') + '</button>' +
      '<button class="chip' + (auc ? ' hot' : '') + '" id="hc-auc"><span>🔨</span>Аукцион' + (auc ? '<i>LIVE</i>' : '') + '</button>' +
      '<button class="chip" id="hc-lg"><span>' + lg.icon + '</span>' + esc(lg.kk) + '</button></div></div>' + questsHtml();
  };
  window.Q.ext.bindHome = function () {
    qs('#hc-toss').onclick = function () { A.sfx.tap(); openToss(); };
    qs('#hc-auc').onclick = function () { A.sfx.tap(); openAuction(); };
    qs('#hc-lg').onclick = function () { A.sfx.tap(); A.setTab('me'); A.renderHome(); };
    bindQuests();
  };
  window.Q.ext.shopTop = function () {
    var st = S(), toss = st.tossDay !== A.today();
    return auctionCard() + '<button class="shop-gift toss' + (toss ? '' : ' used') + '" id="tossgo"><span class="chest-sm">🦴</span><span><b>Асық үйіру</b><span class="muted">' +
      (toss ? 'Ежедневный бросок 4 асыков: до +570 🪙 и ×2 XP' : 'Сегодня уже брошено — приходи завтра') + '</span></span><span class="pill' + (toss ? ' ok' : '') + '">' + (toss ? 'Тегін ▶' : '✓') + '</span></button>';
  };
  window.Q.ext.bindShop = function () {
    qs('#aucgo').onclick = function () { A.sfx.tap(); openAuction(); };
    qs('#tossgo').onclick = function () { A.sfx.tap(); openToss(); };
    var c = qs('#collection'); if (c) bindCollection();
  };
  window.Q.ext.shopBottom = function () { return '<div id="collection">' + collectionHtml() + '</div>'; };
  window.Q.ext.meTop = function () { return galleryHtml() + leagueBoard() + (window.Q.ext.voicePanel ? window.Q.ext.voicePanel() : ''); };
  window.Q.ext.bindMe = function () { bindGallery(); if (window.Q.ext.bindVoicePanel) window.Q.ext.bindVoicePanel(); };

  window.QARENA = { openAuction: openAuction, openToss: openToss, currentLot: currentLot, tossPrize: tossPrize, rollPos: rollPos, POS: POS };
})();
