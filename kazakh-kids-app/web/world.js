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

  var HEROES = [
    { id: 'bars', kk: 'Барыс', ru: 'Снежный барс', price: 0, say: 'Мен тауда тұрамын! — Я живу в горах!' },
    { id: 'kulyn', kk: 'Құлыншақ', ru: 'Жеребёнок', price: 120, say: 'Құлындай ойнайық! — Давай играть, как жеребята!' },
    { id: 'qoyan', kk: 'Қоянжан', ru: 'Зайчонок', price: 150, say: 'Секір де оқы! — Прыгай и учись!' },
    { id: 'tulki', kk: 'Түлкішек', ru: 'Лисёнок', price: 200, say: 'Мен ең ақылды түлкімін! — Я самая умная лиса!' },
    { id: 'ayu', kk: 'Аюжан', ru: 'Медвежонок', price: 250, say: 'Бал мен білім — ең тәтті! — Мёд и знания — самое сладкое!' },
    { id: 'botaqan', kk: 'Ботақан', ru: 'Верблюжонок', price: 300, say: 'Шыдамды бол — бәрін үйренесің! — Будь терпелив — всё выучишь!' },
    { id: 'qyran', kk: 'Қыранжан', ru: 'Беркутёнок', price: 400, say: 'Биікке самға! — Лети высоко!' }
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
    { id: 'quiz', icon: '⚡', kk: 'Кім жылдам?', ru: 'Викторина на скорость', price: 0 },
    { id: 'memory', icon: '🃏', kk: 'Жұбын тап', ru: 'Найди пару (карточки)', price: 0 },
    { id: 'cards', icon: '📇', kk: 'Карточкалар', ru: 'Учи слова по карточкам', price: 0 },
    { id: 'balloons', icon: '🎈', kk: 'Шарлар', ru: 'Лопай нужный шарик', price: 100 },
    { id: 'letters', icon: '🔤', kk: 'Әріп аулау', ru: 'Поймай казахскую букву', price: 150 },
    { id: 'truefalse', icon: '✅', kk: 'Дұрыс па?', ru: 'Верно или нет — на время', price: 200 }
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
    { id: 'a_hero', icon: '🤝', kk: 'Жаңа дос', ru: 'Купи нового героя', coins: 20, t: function (S) { return S.heroes.length >= 2; } },
    { id: 'a_games', icon: '🎮', kk: 'Ойыншы', ru: 'Сыграй 10 игр', coins: 40, t: function (S) { return S.gamesPlayed >= 10; } }
  ];

  var SHOP = {
    giftBox: 60,       // random sticker
    hearts: 40,        // +2 hearts for the next lesson
    freeze: 80,        // streak freeze
    maxFreeze: 2
  };

  window.QWORLD = { hero: hero, HEROES: HEROES, STICKERS: STICKERS, GAMES: GAMES, ACH: ACH, SHOP: SHOP };
})();
