/* Герои, наклейки, достижения, игры и товары магазина. */
(function () {
  'use strict';
  var INK = '#4a3b43';

  /* ---------- shared face parts ---------- */
  function eyes(lash) {
    var l = lash ? '<path d="M34 50 l-4 -4 M38 48 l-2 -5 M86 50 l4 -4 M82 48 l2 -5" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/>' : '';
    return l +
      '<g class="eye"><ellipse cx="44" cy="62" rx="11" ry="12" fill="#fff" stroke="' + INK + '" stroke-width="3"/><circle cx="46" cy="64" r="7" fill="hsl(25 60% 30%)"/><circle cx="46" cy="64" r="3.5" fill="#1d2430"/><circle cx="49" cy="60" r="2.5" fill="#fff"/></g>' +
      '<g class="eye"><ellipse cx="76" cy="62" rx="11" ry="12" fill="#fff" stroke="' + INK + '" stroke-width="3"/><circle cx="74" cy="64" r="7" fill="hsl(25 60% 30%)"/><circle cx="74" cy="64" r="3.5" fill="#1d2430"/><circle cx="77" cy="60" r="2.5" fill="#fff"/></g>';
  }
  function cheeks(y) { return '<ellipse cx="31" cy="' + y + '" rx="7" ry="4.5" fill="#ff9fb4" opacity=".7"/><ellipse cx="89" cy="' + y + '" rx="7" ry="4.5" fill="#ff9fb4" opacity=".7"/>'; }
  function mouth(mood, y) {
    y = y || 84;
    if (mood === 'sad') return '<path d="M50 ' + (y + 6) + ' Q60 ' + (y - 2) + ' 70 ' + (y + 6) + '" fill="none" stroke="' + INK + '" stroke-width="3.5" stroke-linecap="round"/>';
    if (mood === 'wow') return '<ellipse cx="60" cy="' + (y + 4) + '" rx="7" ry="8" fill="#7a3446"/><ellipse cx="60" cy="' + (y + 7) + '" rx="4" ry="3.5" fill="#ff8fa3"/>';
    return '<path d="M48 ' + y + ' Q54 ' + (y + 10) + ' 60 ' + (y + 2) + ' Q66 ' + (y + 10) + ' 72 ' + y + '" fill="#7a3446" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/><path d="M53 ' + (y + 4) + ' Q60 ' + (y + 10) + ' 67 ' + (y + 4) + '" fill="#ff8fa3"/>';
  }
  function brows(mood) { return mood === 'sad' ? '<path d="M34 48 L48 53 M86 48 L72 53" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' : ''; }
  function head(fill, rx, ry) { return '<ellipse cx="60" cy="68" rx="' + (rx || 44) + '" ry="' + (ry || 40) + '" fill="' + fill + '" stroke="' + INK + '" stroke-width="3"/>'; }
  function nose(y, c) { return '<path d="M55 ' + y + ' L65 ' + y + ' L60 ' + (y + 6) + ' Z" fill="' + (c || '#ff8fa3') + '" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>'; }
  var shadow = '<ellipse cx="60" cy="114" rx="34" ry="5" fill="hsl(210 25% 90%)"/>';

  /* ---------- characters ---------- */
  var DRAW = {
    bars: function (m) { // снежный барс в тақия
      return '<circle cx="28" cy="34" r="15" fill="#e9eef3" stroke="' + INK + '" stroke-width="3"/><circle cx="28" cy="34" r="7" fill="#ffb3c1"/>' +
        '<circle cx="92" cy="34" r="15" fill="#e9eef3" stroke="' + INK + '" stroke-width="3"/><circle cx="92" cy="34" r="7" fill="#ffb3c1"/>' +
        head('#f4f7fa') +
        '<g fill="#8b97a6"><circle cx="40" cy="44" r="3.5"/><circle cx="47" cy="38" r="2.5"/><circle cx="80" cy="44" r="3.5"/><circle cx="73" cy="38" r="2.5"/><circle cx="24" cy="70" r="3"/><circle cx="28" cy="80" r="2.4"/><circle cx="96" cy="70" r="3"/><circle cx="92" cy="80" r="2.4"/></g>' +
        '<path d="M36 34 Q60 6 84 34 Z" fill="hsl(199 84% 50%)" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="M44 29 q4 -6 8 0 q4 -6 8 0 q4 -6 8 0 q4 -6 8 0" fill="none" stroke="hsl(43 100% 55%)" stroke-width="2.5" stroke-linecap="round"/>' +
        '<circle cx="60" cy="13" r="4" fill="hsl(43 100% 55%)" stroke="' + INK + '" stroke-width="2"/>' +
        brows(m) + eyes() + cheeks(80) + nose(74) + mouth(m, 82);
    },
    kulyn: function (m) { // құлыншақ — жеребёнок
      return '<path d="M30 40 L24 8 L46 30 Z" fill="#c98a4b" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/><path d="M90 40 L96 8 L74 30 Z" fill="#c98a4b" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
        head('#d79b5c', 40, 42) +
        '<path d="M42 30 q6 -18 18 -8 q8 -14 18 4 q-8 -2 -10 8 q-6 -8 -14 2 q-4 -8 -12 -6 z" fill="#5b3a1e" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<path d="M56 40 Q60 34 64 40 L62 56 L58 56 Z" fill="#fff" opacity=".85"/>' +
        '<ellipse cx="60" cy="90" rx="26" ry="17" fill="#f0cfa6" stroke="' + INK + '" stroke-width="3"/>' +
        '<ellipse cx="51" cy="86" rx="3" ry="4" fill="' + INK + '"/><ellipse cx="69" cy="86" rx="3" ry="4" fill="' + INK + '"/>' +
        brows(m) + eyes(true) + cheeks(76) + mouth(m, 94);
    },
    botaqan: function (m) { // ботақан — верблюжонок
      return '<ellipse cx="22" cy="54" rx="12" ry="7" fill="#d9b27a" stroke="' + INK + '" stroke-width="3" transform="rotate(-25 22 54)"/><ellipse cx="98" cy="54" rx="12" ry="7" fill="#d9b27a" stroke="' + INK + '" stroke-width="3" transform="rotate(25 98 54)"/>' +
        head('#e7c690', 40, 42) +
        '<path d="M44 30 q4 -14 12 -6 q4 -12 10 0 q8 -10 12 6 q-10 -4 -14 2 q-8 -6 -20 -2 z" fill="#b8874a" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<ellipse cx="60" cy="90" rx="24" ry="16" fill="#f5e2c0" stroke="' + INK + '" stroke-width="3"/>' +
        '<path d="M50 84 q3 -3 6 0 M64 84 q3 -3 6 0" stroke="' + INK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
        brows(m) + eyes(true) + cheeks(76) + mouth(m, 92);
    },
    tulki: function (m) { // түлкішек — лисёнок
      return '<path d="M22 50 L20 6 L54 32 Z" fill="#f08a3c" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/><path d="M98 50 L100 6 L66 32 Z" fill="#f08a3c" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="M24 34 L22 12 L38 26 Z M96 34 L98 12 L82 26 Z" fill="#4a2c22"/>' +
        head('#f39a4f') +
        '<path d="M18 72 Q34 70 46 80 Q54 100 60 104 Q66 100 74 80 Q86 70 102 72 Q96 104 60 108 Q24 104 18 72 Z" fill="#fff8f0" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
        brows(m) + eyes() + cheeks(80) + nose(76, '#2b2228') + mouth(m, 86);
    },
    qoyan: function (m) { // қоянжан — зайчонок
      return '<ellipse cx="42" cy="22" rx="11" ry="26" fill="#f1f3f7" stroke="' + INK + '" stroke-width="3" transform="rotate(-10 42 22)"/><ellipse cx="42" cy="24" rx="5" ry="18" fill="#ffb3c1" transform="rotate(-10 42 24)"/>' +
        '<ellipse cx="78" cy="22" rx="11" ry="26" fill="#f1f3f7" stroke="' + INK + '" stroke-width="3" transform="rotate(10 78 22)"/><ellipse cx="78" cy="24" rx="5" ry="18" fill="#ffb3c1" transform="rotate(10 78 24)"/>' +
        head('#f7f8fb') + brows(m) + eyes() + cheeks(80) + nose(73) + mouth(m, 81) +
        (m === 'wow' ? '' : '<rect x="55" y="84" width="10" height="9" rx="2" fill="#fff" stroke="' + INK + '" stroke-width="2"/><line x1="60" y1="84" x2="60" y2="93" stroke="' + INK + '" stroke-width="1.5"/>');
    },
    ayu: function (m) { // аюжан — медвежонок
      return '<circle cx="26" cy="34" r="15" fill="#9b6a43" stroke="' + INK + '" stroke-width="3"/><circle cx="26" cy="34" r="7" fill="#d9a77c"/>' +
        '<circle cx="94" cy="34" r="15" fill="#9b6a43" stroke="' + INK + '" stroke-width="3"/><circle cx="94" cy="34" r="7" fill="#d9a77c"/>' +
        head('#a8754b') +
        '<ellipse cx="60" cy="86" rx="22" ry="17" fill="#e3c19c" stroke="' + INK + '" stroke-width="2.5"/>' +
        brows(m) + eyes() + cheeks(80) + '<ellipse cx="60" cy="78" rx="7" ry="5" fill="#2b2228"/>' + mouth(m, 86);
    },
    qyran: function (m) { // қыранжан — беркутёнок
      var beak = m === 'wow'
        ? '<path d="M50 78 Q60 72 70 78 L66 94 Q60 98 54 94 Z" fill="hsl(43 100% 55%)" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/><ellipse cx="60" cy="87" rx="5" ry="5" fill="#7a3446"/>'
        : '<path d="M48 76 Q60 70 72 76 Q70 90 60 98 Q50 90 48 76 Z" fill="hsl(43 100% 55%)" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/><path d="M52 84 Q60 88 68 84" fill="none" stroke="' + INK + '" stroke-width="2"/>';
      return '<path d="M44 30 L40 10 L54 26 Z M60 26 L60 6 L68 26 Z M76 30 L82 12 L70 26 Z" fill="#7a4e30" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
        head('#8a5a3b') +
        '<path d="M24 70 Q30 44 60 44 Q90 44 96 70 Q90 100 60 104 Q30 100 24 70 Z" fill="#f3e3c8"/>' +
        brows(m) + eyes() + cheeks(78) + beak;
    }
  };


  /* ---------- Blocky Neo-Chibi busts (2D): Батыр-X, Айсұлу Neon, Әже-Bot 3000, Тайсон-Тайпақ ---------- */
  function sq(x, y, w, h, rx, fill, extra) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + rx + '" fill="' + fill + '" stroke="' + INK + '" stroke-width="3" ' + (extra || '') + '/>'; }
  DRAW.batyr = function (m) {
    return '<path d="M26 98 L60 110 L94 98 L100 118 L20 118 Z" fill="hsl(199 84% 50%)" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M40 104 L60 111 L80 104" fill="none" stroke="hsl(43 100% 55%)" stroke-width="3"/>' +
      sq(24, 36, 72, 64, 10, '#e8b98a') +
      '<path d="M20 42 L100 42 L94 24 L26 24 Z" fill="hsl(43 100% 55%)" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M44 24 L60 6 L76 24 Z" fill="hsl(220 70% 46%)" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<circle cx="60" cy="6" r="4.5" fill="#22e6ff" stroke="' + INK + '" stroke-width="2"/>' +
      '<rect x="28" y="52" width="64" height="17" rx="4" fill="#16181f"/><rect x="33" y="58" width="22" height="4" rx="2" fill="#22e6ff"/><rect x="65" y="58" width="22" height="4" rx="2" fill="#22e6ff"/>' +
      brows(m) + mouth(m, 78);
  };
  DRAW.aisulu = function (m) {
    var braid = function (x) { var o = ''; for (var i = 0; i < 5; i++) o += '<rect x="' + x + '" y="' + (48 + i * 12) + '" width="13" height="11" rx="4" fill="' + (i % 2 ? '#ff4fd8' : '#9b6bff') + '" stroke="' + INK + '" stroke-width="2"/>'; return o; };
    return braid(8) + braid(99) +
      sq(26, 36, 68, 64, 12, '#f3c9a5') +
      '<path d="M26 44 Q60 4 94 44 Z" fill="#7a3fd0" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M36 40 q4 -6 8 0 q4 -6 8 0 q4 -6 8 0 q4 -6 8 0 q4 -6 8 0 q4 -6 8 0" fill="none" stroke="hsl(43 100% 55%)" stroke-width="2.5" stroke-linecap="round"/>' +
      sq(17, 54, 11, 24, 4, '#22262e') + sq(92, 54, 11, 24, 4, '#22262e') +
      brows(m) + eyes() +
      '<rect x="28" y="48" width="64" height="28" rx="9" fill="#22e6ff" opacity=".25"/><rect x="28" y="48" width="64" height="28" rx="9" fill="none" stroke="#22b8cf" stroke-width="2.5"/>' +
      cheeks(83) + mouth(m, 84);
  };
  DRAW.azhe = function (m) {
    var scr = function (x) { return '<g class="eye"><circle cx="' + x + '" cy="62" r="10.5" fill="#e9fbff" stroke="#22b8cf" stroke-width="4"/><circle cx="' + x + '" cy="62" r="4" fill="#22b8cf"/></g>'; };
    return '<path d="M30 100 L60 110 L90 100 L96 118 L24 118 Z" fill="#8c2f4a" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/><path d="M60 110 L60 118" stroke="hsl(43 100% 55%)" stroke-width="5"/>' +
      '<line x1="78" y1="26" x2="86" y2="10" stroke="' + INK + '" stroke-width="3"/><circle cx="87" cy="8" r="5" fill="hsl(43 100% 55%)" stroke="' + INK + '" stroke-width="2"/>' +
      sq(16, 22, 88, 82, 20, '#ffffff') + sq(29, 40, 62, 56, 10, '#cfd3e6') +
      brows(m) + scr(46) + scr(74) + cheeks(80) + mouth(m, 78);
  };
  DRAW.tayson = function (m) {
    return sq(16, 30, 88, 80, 24, '#ff8a2a') + sq(28, 38, 64, 60, 10, '#e0a878') +
      '<path d="M24 46 L96 46 L92 28 Q60 16 28 28 Z" fill="#2bd96b" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<rect x="88" y="40" width="24" height="8" rx="4" fill="#2bd96b" stroke="' + INK + '" stroke-width="3"/>' +
      eyes() + '<path d="M33 49 L49 55 M87 49 L71 55" stroke="' + INK + '" stroke-width="3.5" stroke-linecap="round"/>' +
      '<rect x="76" y="78" width="13" height="6" rx="2" fill="#f6e3b4" stroke="' + INK + '" stroke-width="1.5"/>' + mouth(m, 80);
  };

  var HEROES = [
    { id: 'batyr', neo: true, voice: 'M1', kk: 'Батыр-X', ru: 'Нео-батыр в голо-шапане', en: 'Neo-warrior in a holo-shapan', price: 0, move: 'slam', say: 'Пәлі! Алға, батырым! — Вперёд, мой батыр!', sayEn: 'Пәлі! Алға, батырым! — Onward, my hero!' },
    { id: 'aisulu', neo: true, voice: 'T4', kk: 'Айсұлу Neon', ru: 'Киберспортивный блогер', en: 'E-sports streamer', price: 260, move: 'shuffle', say: 'Сәлем, достар! Билейміз бе? — Привет, друзья! Потанцуем?', sayEn: 'Сәлем, достар! Билейміз бе? — Hi friends! Shall we dance?' },
    { id: 'tayson', neo: true, voice: 'K1', kk: 'Тайсон-Тайпақ', ru: 'Скейтер на ховерборде-асыке', en: 'Skater on an asyk hoverboard', price: 300, move: 'kickflip', say: 'Кеттік! Кикфлип жасаймын! — Погнали! Делаю кикфлип!', sayEn: 'Кеттік! Кикфлип жасаймын! — Let’s go! Watch my kickflip!' },
    { id: 'azhe', neo: true, voice: 'E4', kk: 'Әже-Bot 3000', ru: 'Робо-бабушка на көрпеше', en: 'Robo-grandma on a flying mat', price: 340, move: 'bata', say: 'Айналайын! Бауырсақ же. — Родной мой! Ешь баурсак.', sayEn: 'Айналайын! Бауырсақ же. — My dear! Have a baursak.' },
    { id: 'bars', kk: 'Барыс', ru: 'Снежный барс', en: 'Snow leopard', price: 0, say: 'Мен тауда тұрамын! — Я живу в горах!', sayEn: 'Мен тауда тұрамын! — I live in the mountains!' },
    { id: 'kulyn', kk: 'Құлыншақ', ru: 'Жеребёнок', en: 'Foal', price: 120, say: 'Құлындай ойнайық! — Давай играть, как жеребята!', sayEn: 'Құлындай ойнайық! — Let’s play like foals!' },
    { id: 'qoyan', kk: 'Қоянжан', ru: 'Зайчонок', en: 'Bunny', price: 150, say: 'Секір де оқы! — Прыгай и учись!', sayEn: 'Секір де оқы! — Jump and learn!' },
    { id: 'tulki', kk: 'Түлкішек', ru: 'Лисёнок', en: 'Fox cub', price: 200, say: 'Мен ең ақылды түлкімін! — Я самая умная лиса!', sayEn: 'Мен ең ақылды түлкімін! — I am the cleverest fox!' },
    { id: 'ayu', kk: 'Аюжан', ru: 'Медвежонок', en: 'Bear cub', price: 250, say: 'Бал мен білім — ең тәтті! — Мёд и знания — самое сладкое!', sayEn: 'Бал мен білім — ең тәтті! — Honey and knowledge are the sweetest!' },
    { id: 'botaqan', kk: 'Ботақан', ru: 'Верблюжонок', en: 'Camel calf', price: 300, say: 'Шыдамды бол — бәрін үйренесің! — Будь терпелив — всё выучишь!', sayEn: 'Шыдамды бол — бәрін үйренесің! — Be patient and you will learn it all!' },
    { id: 'qyran', kk: 'Қыранжан', ru: 'Беркутёнок', en: 'Eaglet', price: 400, say: 'Биікке самға! — Лети высоко!', sayEn: 'Биікке самға! — Soar high!' }
  ];

  function hero(id, mood, cls) {
    var f = DRAW[id] || DRAW.bars;
    return '<svg class="m ' + (cls || '') + '" viewBox="0 0 120 120" aria-hidden="true">' + shadow + f(mood || 'happy') + '</svg>';
  }

  /* ---------- stickers (collected from gift boxes and rewards) ---------- */
  var STICKERS = [
    { id: 's1', e: '🐎', kk: 'Тұлпар', ru: 'Скакун', r: 1 }, { id: 's2', e: '🦅', kk: 'Қыран', ru: 'Беркут', r: 2 },
    { id: 's3', e: '🐆', kk: 'Барыс', ru: 'Снежный барс', r: 3 }, { id: 's4', e: '🐫', kk: 'Түйе', ru: 'Верблюд', r: 1 },
    { id: 's5', e: '🛖', kk: 'Киіз үй', ru: 'Юрта', r: 2 }, { id: 's6', e: '🪕', kk: 'Домбыра', ru: 'Домбра', r: 2 },
    { id: 's7', e: '🏔️', kk: 'Хан Тәңірі', ru: 'Пик Хан-Тенгри', r: 3 }, { id: 's8', e: '🌷', kk: 'Қызғалдақ', ru: 'Тюльпан', r: 1 },
    { id: 's9', e: '🍎', kk: 'Апорт', ru: 'Яблоко апорт', r: 1 }, { id: 's10', e: '🌾', kk: 'Дала', ru: 'Степь', r: 1 },
    { id: 's11', e: '🍵', kk: 'Шай', ru: 'Чай', r: 1 }, { id: 's12', e: '🍩', kk: 'Бауырсақ', ru: 'Баурсак', r: 1 },
    { id: 's13', e: '🚀', kk: 'Байқоңыр', ru: 'Байконур', r: 3 }, { id: 's14', e: '🏞️', kk: 'Балқаш', ru: 'Озеро Балхаш', r: 2 },
    { id: 's15', e: '🦌', kk: 'Бұғы', ru: 'Олень', r: 2 }, { id: 's16', e: '🐺', kk: 'Қасқыр', ru: 'Волк', r: 2 },
    { id: 's17', e: '🌙', kk: 'Ай', ru: 'Луна', r: 1 }, { id: 's18', e: '☀️', kk: 'Күн', ru: 'Солнце', r: 1 },
    { id: 's19', e: '⭐', kk: 'Жұлдыз', ru: 'Звезда', r: 1 }, { id: 's20', e: '🏆', kk: 'Жүлде', ru: 'Кубок', r: 3 },
    { id: 's21', e: '👑', kk: 'Тәж', ru: 'Корона', r: 3 }, { id: 's22', e: '🐑', kk: 'Қозы', ru: 'Ягнёнок', r: 1 },
    { id: 's23', e: '🌈', kk: 'Кемпірқосақ', ru: 'Радуга', r: 2 }, { id: 's24', e: '🇰🇿', kk: 'Көк Ту', ru: 'Флаг Казахстана', r: 3 }
  ];

  /* ---------- mini-games ---------- */
  var GAMES = [
    { id: 'quiz', icon: '⚡', kk: 'Кім жылдам?', ru: 'Викторина на скорость', en: 'Speed quiz', price: 0 },
    { id: 'memory', icon: '🃏', kk: 'Жұбын тап', ru: 'Найди пару (карточки)', en: 'Find the pair (memory)', price: 0 },
    { id: 'cards', icon: '📇', kk: 'Карточкалар', ru: 'Учи слова по карточкам', en: 'Learn words with flashcards', price: 0 },
    { id: 'balloons', icon: '🎈', kk: 'Шарлар', ru: 'Лопай нужный шарик', en: 'Pop the right balloon', price: 100 },
    { id: 'letters', icon: '🔤', kk: 'Әріп аулау', ru: 'Поймай казахскую букву', en: 'Catch the Kazakh letter', price: 150 },
    { id: 'truefalse', icon: '✅', kk: 'Дұрыс па?', ru: 'Верно или нет — на время', en: 'True or false — against the clock', price: 200 }
  ];

  /* ---------- achievements: test(state) → bool ---------- */
  var ACH = [
    { id: 'a_first', icon: '👣', kk: 'Алғашқы қадам', ru: 'Пройди первый урок', coins: 20, t: function (S) { return S.lessons >= 1; } },
    { id: 'a_perfect', icon: '💎', kk: 'Мінсіз!', ru: 'Урок без ошибок', coins: 20, t: function (S) { return S.perfects >= 1; } },
    { id: 'a_streak3', icon: '🔥', kk: '3 күн қатарынан', ru: '3 дня подряд', coins: 30, t: function (S) { return S.streak >= 3; } },
    { id: 'a_streak7', icon: '🌟', kk: 'Бір апта!', ru: '7 дней подряд', coins: 70, t: function (S) { return S.streak >= 7; } },
    { id: 'a_xp100', icon: '⚡', kk: '100 ұпай', ru: 'Набери 100 очков', coins: 30, t: function (S) { return S.xp >= 100; } },
    { id: 'a_xp500', icon: '🚀', kk: '500 ұпай', ru: 'Набери 500 очков', coins: 100, t: function (S) { return S.xp >= 500; } },
    { id: 'a_xp1000', icon: '👑', kk: '1000 ұпай', ru: 'Набери 1000 очков', coins: 200, t: function (S) { return S.xp >= 1000; } },
    { id: 'a_l10', icon: '📘', kk: '10 сабақ', ru: 'Пройди 10 уроков', coins: 50, t: function (S, X) { return X.doneCount >= 10; } },
    { id: 'a_l30', icon: '📚', kk: '30 сабақ', ru: 'Пройди 30 уроков', coins: 150, t: function (S, X) { return X.doneCount >= 30; } },
    { id: 'a_g1', icon: '🥉', kk: '1-сынып бітті', ru: 'Все уроки 1 класса', coins: 100, t: function (S, X) { return X.gradeDone[0]; } },
    { id: 'a_g2', icon: '🥈', kk: '2-сынып бітті', ru: 'Все уроки 2 класса', coins: 100, t: function (S, X) { return X.gradeDone[1]; } },
    { id: 'a_g3', icon: '🥇', kk: '3-сынып бітті', ru: 'Все уроки 3 класса', coins: 100, t: function (S, X) { return X.gradeDone[2]; } },
    { id: 'a_quiz', icon: '🏅', kk: 'Викторина чемпионы', ru: '10 из 10 в викторине', coins: 50, t: function (S) { return S.quizBest >= 10; } },
    { id: 'a_st10', icon: '🖼️', kk: 'Коллекционер', ru: 'Собери 10 наклеек', coins: 50, t: function (S) { return Object.keys(S.stickers).length >= 10; } },
    { id: 'a_hero', icon: '🤝', kk: 'Жаңа дос', ru: 'Купи нового героя', coins: 20, t: function (S) { return S.heroes.length >= 3; } },
    { id: 'a_games', icon: '🎮', kk: 'Ойыншы', ru: 'Сыграй 10 игр', coins: 40, t: function (S) { return S.gamesPlayed >= 10; } }
  ];

  var SHOP = {
    giftBox: 60,       // random sticker
    hearts: 40,        // +2 hearts for the next lesson
    freeze: 80,        // streak freeze
    maxFreeze: 2
  };

  var ACH_EN = {
    a_first: 'Finish your first lesson', a_perfect: 'A lesson with no mistakes', a_streak3: '3 days in a row', a_streak7: '7 days in a row',
    a_xp100: 'Earn 100 XP', a_xp500: 'Earn 500 XP', a_xp1000: 'Earn 1000 XP', a_l10: 'Finish 10 lessons', a_l30: 'Finish 30 lessons',
    a_g1: 'All Grade 1 lessons', a_g2: 'All Grade 2 lessons', a_g3: 'All Grade 3 lessons', a_quiz: '10 out of 10 in the quiz',
    a_st10: 'Collect 10 stickers', a_hero: 'Buy a new hero', a_games: 'Play 10 games'
  };
  ACH.push(
    { id: 'a_life', icon: '💬', kk: 'Тірі тіл шебері', ru: 'Все уроки «Живой речи»', coins: 120, t: function (S, X) { return X.gradeDone[3]; } },
    { id: 'a_arcade', icon: '🕹️', kk: 'Аркада батыры', ru: 'Сыграй во все 4 аркады', coins: 60, t: function (S) { return Object.keys(S.arcade || {}).length >= 4; } },
    { id: 'a_auction', icon: '🔨', kk: 'Саудагер', ru: 'Выиграй лот на аукционе', coins: 40, t: function (S) { return (S.auctionWins || 0) >= 1; } },
    { id: 'a_alshy', icon: '🦴', kk: 'Төрт алшы!', ru: 'Выбрось четыре «алшы»', coins: 100, t: function (S) { return (S.jackpots || 0) >= 1; } },
    { id: 'a_voice', icon: '🎙️', kk: 'Таза айтылым', ru: 'Произнеси 10 фраз на 80%+', coins: 80, t: function (S) { return (S.spoken || 0) >= 10; } }
  );
  ACH_EN.a_life = 'All “Real life” lessons'; ACH_EN.a_arcade = 'Play all 4 arcade games'; ACH_EN.a_auction = 'Win a lot at the auction';
  ACH_EN.a_alshy = 'Throw four “alshy”'; ACH_EN.a_voice = 'Say 10 phrases at 80%+';
  ACH.forEach(function (a) { a.en = ACH_EN[a.id]; });
  var ST_EN = ['Racehorse', 'Golden eagle', 'Snow leopard', 'Camel', 'Yurt', 'Dombra', 'Khan Tengri peak', 'Tulip', 'Aport apple', 'Steppe', 'Tea', 'Baursak', 'Baikonur', 'Lake Balkhash', 'Deer', 'Wolf', 'Moon', 'Sun', 'Star', 'Trophy', 'Crown', 'Lamb', 'Rainbow', 'Flag of Kazakhstan'];
  STICKERS.forEach(function (s, i) { s.en = ST_EN[i]; });

  /* ---------- arcade (60–90 s sessions, everyday speech) ---------- */
  var ARCADE = [
    { id: 'bazaar', icon: '🛒', kk: 'Көк Базар Rush', ru: 'Торгуйся на базаре Алматы', en: 'Haggle at the Almaty bazaar', host: 'batyr', hue: 'gold' },
    { id: 'drift', icon: '🛵', kk: 'Аул Cyber-Drift', ru: 'Доставка на электро-тулпаре', en: 'Delivery on an electric tulpar', host: 'tayson', hue: 'teal' },
    { id: 'dastarkhan', icon: '🫖', kk: 'Дастархан Master', ru: 'Встречай почётных гостей', en: 'Host your honoured guests', host: 'azhe', hue: 'red' },
    { id: 'aitys', icon: '🎤', kk: 'Айтыс Beat Battle', ru: 'Ритм-дуэль на сцене юрты', en: 'Rhythm duel on the yurt stage', host: 'aisulu', hue: 'purple' }
  ];

  /* ---------- character lines: kk + translation; voiced with the hero's voice tag ---------- */
  var LINES = {
    batyr: {
      intro: { kk: 'Пәлі! Базарға кеттік, батырым!', ru: 'Ого! Пошли на базар, мой батыр!', en: 'Whoa! Off to the bazaar, my hero!' },
      win: { kk: 'Бәрекелді! Нағыз батырсың!', ru: 'Браво! Ты настоящий батыр!', en: 'Bravo! You are a true hero!' },
      combo: { kk: 'Шаттық соққысы! Керемет!', ru: 'Шаттык-слэм! Великолепно!', en: 'Shattyq Slam! Magnificent!' },
      lose: { kk: 'Қап! Ештеңе етпейді, тағы байқап көр.', ru: 'Эх! Ничего страшного, попробуй ещё.', en: 'Oh no! Never mind, try again.' }
    },
    aisulu: {
      intro: { kk: 'Сәлем, достар! Айтыс басталды!', ru: 'Привет, друзья! Айтыс начался!', en: 'Hi friends! The aitys has begun!' },
      win: { kk: 'Керемет! Сен жұлдызсың!', ru: 'Супер! Ты звезда!', en: 'Awesome! You are a star!' },
      combo: { kk: 'Бәсе! Ритмді ұстадың!', ru: 'Вот это да! Поймал ритм!', en: 'There you go! You caught the rhythm!' },
      lose: { kk: 'Ойбай! Тағы бір рет көрейік.', ru: 'Ой-бай! Давай ещё разок.', en: 'Oh my! Let’s try once more.' }
    },
    azhe: {
      intro: { kk: 'Айналайын, қонақтар келе жатыр!', ru: 'Родной мой, гости идут!', en: 'My dear, the guests are coming!' },
      win: { kk: 'Жарайсың, балам! Бата берейін.', ru: 'Молодец, дитя моё! Дам благословение.', en: 'Well done, my child! Let me give a blessing.' },
      combo: { kk: 'Бәрекелді, қолың алтын!', ru: 'Браво, у тебя золотые руки!', en: 'Bravo, you have golden hands!' },
      lose: { kk: 'Ештеңе етпейді, ботам. Тағы көрейік.', ru: 'Ничего, верблюжонок мой. Попробуем ещё.', en: 'Never mind, little one. Let’s try again.' }
    },
    tayson: {
      intro: { kk: 'Кеттік! Тапсырыс күтіп тұр!', ru: 'Погнали! Заказ ждёт!', en: 'Let’s go! The order is waiting!' },
      win: { kk: 'Уау! Нағыз шебер жүргізушісің!', ru: 'Вау! Ты настоящий мастер-водитель!', en: 'Wow! You are a real master driver!' },
      combo: { kk: 'Пәлі, жылдамдық!', ru: 'Ого, какая скорость!', en: 'Whoa, what speed!' },
      lose: { kk: 'Ойбай, соқтығыстық! Қайтадан!', ru: 'Ой-бай, врезались! Заново!', en: 'Oh no, we crashed! Again!' }
    },
    judge: {
      start: { kk: 'Аукцион басталды!', ru: 'Аукцион начался!', en: 'The auction has begun!' },
      bid: { kk: 'Жаңа баға!', ru: 'Новая цена!', en: 'New bid!' },
      one: { kk: 'Бір!', ru: 'Раз!', en: 'One!' },
      two: { kk: 'Екі!', ru: 'Два!', en: 'Two!' },
      sold: { kk: 'Сатылды!', ru: 'Продано!', en: 'Sold!' },
      grats: { kk: 'Құттықтаймыз!', ru: 'Поздравляем!', en: 'Congratulations!' }
    },
    asyk: {
      alshy: { kk: 'Алшы!', ru: 'Алшы!', en: 'Alshy!' },
      jackpot: { kk: 'Төрт алшы! Керемет!', ru: 'Четыре алшы! Великолепно!', en: 'Four alshy! Magnificent!' }
    }
  };
  // Which voice says which group of lines (voice tags follow the OmniVoice matrix in backend/voices.py).
  var LINE_VOICE = { batyr: 'M1', aisulu: 'T4', azhe: 'E4', tayson: 'K1', judge: 'E1', asyk: 'K1' };

  /* ---------- Шежіре XP leagues ---------- */
  var LEAGUES = [
    { id: 'qola', icon: '🥉', kk: 'Қола лига', ru: 'Бронзовая лига', en: 'Bronze League', xp: 0 },
    { id: 'kumis', icon: '🥈', kk: 'Күміс лига', ru: 'Серебряная лига', en: 'Silver League', xp: 300 },
    { id: 'altyn', icon: '🥇', kk: 'Алтын лига', ru: 'Золотая лига', en: 'Gold League', xp: 800 },
    { id: 'almas', icon: '💎', kk: 'Алмас лига', ru: 'Алмазная лига', en: 'Diamond League', xp: 1500 },
    { id: 'khan', icon: '👑', kk: 'Хан лигасы', ru: 'Ханская лига', en: 'Khan League', xp: 3000 }
  ];
  var BOTS = ['Арман', 'Дана', 'Ернар', 'Мадина', 'Тимур', 'Аружан', 'Нұрлан', 'Жансая', 'Бекзат'];

  /* ---------- auction lots: skins, pets, trails (r = rarity 1–3) ---------- */
  var LOTS = [
    { id: 'sk_borik', kind: 'skin', e: '🎩', kk: 'Кибер-Бөрік', ru: 'Кибер-шапка с неоновой лентой', en: 'Cyber fur hat with a neon band', r: 3, start: 320 },
    { id: 'sk_saukele', kind: 'skin', e: '👒', kk: 'Неон Сәукеле', ru: 'Неоновый свадебный убор', en: 'Neon bridal headdress', r: 3, start: 360 },
    { id: 'sk_shapan', kind: 'skin', e: '🧥', kk: 'Голо-Шапан', ru: 'Голографический плащ', en: 'Holographic cloak', r: 2, start: 200 },
    { id: 'sk_taqiya', kind: 'skin', e: '🧢', kk: 'Алтын Тақия', ru: 'Золотая тюбетейка', en: 'Golden skullcap', r: 2, start: 150 },
    { id: 'sk_glasses', kind: 'skin', e: '🕶️', kk: 'AR-көзілдірік', ru: 'AR-очки', en: 'AR glasses', r: 1, start: 80 },
    { id: 'pet_bars', kind: 'pet', e: '🐆', kk: 'Кибер-Барс', ru: 'Питомец кибер-барс', en: 'Cyber snow leopard pet', r: 3, start: 400 },
    { id: 'pet_tay', kind: 'pet', e: '🐎', kk: 'Алтын-Тай', ru: 'Питомец золотой жеребёнок', en: 'Golden foal pet', r: 3, start: 380 },
    { id: 'pet_burkit', kind: 'pet', e: '🦅', kk: 'Нео-Бүркіт', ru: 'Питомец нео-беркут', en: 'Neo golden eagle pet', r: 2, start: 220 },
    { id: 'pet_tasbaqa', kind: 'pet', e: '🐢', kk: 'Робо-Тасбақа', ru: 'Питомец робо-черепаха', en: 'Robo turtle pet', r: 1, start: 100 },
    { id: 'tr_tulip', kind: 'trail', e: '🌷', kk: 'Неон қызғалдақтар', ru: 'След из неоновых тюльпанов', en: 'Neon tulip trail', r: 2, start: 160 },
    { id: 'tr_stars', kind: 'trail', e: '⭐', kk: 'Жұлдыз жаңбыры', ru: 'След «звёздный дождь»', en: 'Star shower trail', r: 2, start: 180 },
    { id: 'tr_spark', kind: 'trail', e: '✨', kk: 'Алтын ұшқындар', ru: 'След из золотых искр', en: 'Golden spark trail', r: 1, start: 90 }
  ];
  var KIND = { skin: { kk: 'Скин', ru: 'скин', en: 'skin' }, pet: { kk: 'Серік', ru: 'питомец', en: 'pet' }, trail: { kk: 'Із', ru: 'след', en: 'trail' } };
  var RARITY = ['', 'COMMON', 'RARE', 'LEGENDARY'];

  // Small golden asyk icon used instead of a generic coin.
  var ASYK = '<svg class="asyk" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6 Q3 12 5 18 Q9 21 12 18 Q15 21 19 18 Q21 12 19 6 Q15 3 12 6 Q9 3 5 6 Z" fill="hsl(43 100% 55%)" stroke="hsl(32 90% 34%)" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 7 L12 17" stroke="hsl(32 90% 34%)" stroke-width="1.6" stroke-linecap="round"/></svg>';

  window.QWORLD = {
    hero: hero, HEROES: HEROES, STICKERS: STICKERS, GAMES: GAMES, ACH: ACH, SHOP: SHOP,
    ARCADE: ARCADE, LINES: LINES, LINE_VOICE: LINE_VOICE, LEAGUES: LEAGUES, BOTS: BOTS, LOTS: LOTS, KIND: KIND, RARITY: RARITY, ASYK: ASYK
  };
})();
