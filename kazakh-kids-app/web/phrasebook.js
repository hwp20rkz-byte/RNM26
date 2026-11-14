/* «Сөздік» hub: phrasebook by topics with dialogues, grammar reference with live tables and trainers,
 * the dictionary (search + thematic lists + lesson words), proverbs with «continue the proverb»,
 * idioms and tongue twisters. Data: phrasebook-data.js; morphology: grammar-core.js. */
(function () {
  'use strict';
  var api = window.Q && window.Q.api, P = window.QPHRASE, G = window.QGRAM;
  if (!api || !P || !G) return;
  var D = api.D, esc = api.esc;
  function L(ru, en) { return api.lang() === 'en' ? en : ru; }
  function tx(x) { return api.lang() === 'en' ? x.en : x.ru; }
  function S() { return api.state(); }
  function st() { var s = S(); s.phrase = s.phrase || { best: {} }; return s.phrase; }

  var V = { read: null, hour: 'бес', aux: 'отыр', topic: null, vtopic: null, wview: 'topics', theme: 'all', open: {}, noun: 'кітап', verb: 'оқы', tense: 'present', pw: 'оқушы', pron: 'мен', q: null };
  var TABS = [
    ['phrase', '💬', 'Тілашар', 'Разговорник', 'Phrasebook'], ['gram', '🧩', 'Грамматика', 'Грамматика', 'Grammar'],
    ['words', '📖', 'Сөздік', 'Словарь', 'Dictionary'], ['prov', '📜', 'Мақалдар', 'Пословицы', 'Proverbs'],
    ['idiom', '🎭', 'Тіркестер', 'Фразеологизмы', 'Idioms']
  ];
  function sub() { return S().phTab || 'phrase'; }
  function go(fn) { fn(); api.save(); api.renderHome(); }
  function keep(fn) { fn(); api.refresh(); }

  /* ------------------------------------------------------------ building blocks */
  function row(kk, sub, extra, e) {
    return '<div class="ph-row">' + (e ? '<span class="ph-e">' + api.glyph(e) + '</span>' : '') +
      '<div class="ph-t"><b lang="kk">' + esc(kk) + '</b>' + (sub ? '<span>' + esc(sub) + '</span>' : '') + (extra || '') + '</div>' + api.spk(kk, 'sm') + '</div>';
  }
  function bestPill(key) { var b = st().best[key]; return b != null ? '<span class="pill ok">' + b + '%</span>' : ''; }
  function back(id, label) { return '<button class="ph-back" id="' + id + '">← ' + esc(label) + '</button>'; }
  function trainBtn(key, label) { return '<button class="btn gold ph-train" data-train="' + key + '">🎯 ' + esc(label) + ' ' + bestPill(key) + '</button>'; }
  function chips(attr, items, cur) {
    return '<div class="ph-chips">' + items.map(function (it) {
      return '<button class="ph-chip' + (it[0] === cur ? ' on' : '') + '" data-' + attr + '="' + esc(it[0]) + '">' + esc(it[1]) + '</button>';
    }).join('') + '</div>';
  }
  /** «кітаб|ым»: the stem in bold, the ending highlighted (stems may change: п → б). */
  function split(stem, form) {
    var i = 0; while (i < stem.length && i < form.length && stem[i] === form[i]) i++;
    if (i >= stem.length - 1 && i < form.length) return '<b>' + esc(form.slice(0, i)) + '</b><i>' + esc(form.slice(i)) + '</i>';
    return '<b>' + esc(form) + '</b>';
  }
  function formRow(label, stem, form, say) {
    return '<div class="ph-form"><span class="ph-l">' + esc(label) + '</span><span class="ph-f" lang="kk">' + split(stem, form) + '</span>' + api.spk(say || form, 'sm') + '</div>';
  }

  /* ------------------------------------------------------------ page */
  function page() {
    var s = sub();
    var h = '<div class="page ph"><div class="ph-tabs" role="tablist">' + TABS.map(function (t) {
      return '<button role="tab" aria-selected="' + (t[0] === s) + '" class="' + (t[0] === s ? 'on' : '') + '" data-ph="' + t[0] + '"><span>' + t[1] + '</span>' + esc(t[2]) + '<small>' + esc(L(t[3], t[4])) + '</small></button>';
    }).join('') + '</div><div id="phmain">';
    h += s === 'gram' ? gramHtml() : s === 'words' ? wordsHtml() : s === 'prov' ? provHtml() : s === 'idiom' ? idiomHtml() : V.read ? readHtml() : V.topic ? topicHtml() : topicsHtml();
    return h + '</div></div>';
  }

  /* ------------------------------------------------------------ phrasebook */
  function topicsHtml() {
    return (RD.length ? '<button class="btn gold ph-readbtn" data-readlist>📚 ' + esc(L('Оқу бұрышы — ' + RD.length + ' сказок: читай и слушай', 'Оқу бұрышы — ' + RD.length + ' tales to read and hear')) + '</button>' : '') + '<p class="muted">' + esc(L('Готовые фразы для школы, улицы, магазина и дома. Нажми тему, слушай и повторяй вслух.', 'Ready phrases for school, the street, the shop and home. Open a topic, listen and repeat aloud.')) + '</p>' +
      '<div class="ph-grid">' + P.topics.map(function (t) {
        return '<button class="ph-tile" data-topic="' + t.id + '"><span class="e">' + t.icon + '</span><b>' + esc(t.kk) + '</b><small>' + esc(tx(t)) + '</small>' +
          '<em>' + t.phrases.length + (t.dialog ? ' · 🗨️' : '') + '</em>' + bestPill('t_' + t.id) + '</button>';
      }).join('') + '</div>';
  }
  function topicHtml() {
    var t = P.topics.filter(function (x) { return x.id === V.topic; })[0];
    var h = back('phback', L('Все темы', 'All topics')) + '<h2>' + t.icon + ' ' + esc(t.kk) + ' · <span class="muted" style="font-size:inherit">' + esc(tx(t)) + '</span></h2>';
    h += t.phrases.map(function (p) { return row(p.kk, tx(p), p.note ? '<em class="ph-note">💡 ' + esc(tx(p.note)) + '</em>' : ''); }).join('');
    if (t.dialog) {
      h += '<h2>🗨️ ' + esc(L('Диалог', 'Dialogue')) + '</h2><button class="btn ghost" id="dplay">▶ ' + esc(L('Слушать диалог', 'Play the dialogue')) + '</button><div class="ph-dlg">';
      var first = t.dialog[0].who;
      h += t.dialog.map(function (l, i) {
        return '<div class="ph-say ' + (l.who === first ? 'l' : 'r') + '" data-dl="' + i + '"><small>' + esc(l.who) + '</small><b lang="kk">' + esc(l.kk) + '</b><span>' + esc(tx(l)) + '</span>' + api.spk(l.kk, 'sm') + '</div>';
      }).join('') + '</div>';
    }
    return h + trainBtn('t_' + t.id, L('Проверь себя', 'Test yourself'));
  }
  var dlgTimer = null;
  function playDialog(t) {
    clearTimeout(dlgTimer);
    var i = 0;
    (function next() {
      api.qsa('.ph-say').forEach(function (e) { e.classList.toggle('now', +e.getAttribute('data-dl') === i); });
      if (i >= t.dialog.length || !api.qs('.ph-say')) return;
      var l = t.dialog[i++];
      api.TTS.speak(l.kk, true);
      dlgTimer = setTimeout(next, 900 + l.kk.length * 85);
    })();
  }

  /* ------------------------------------------------------------ reading corner (web/reading-data.js) */
  var RD = window.QREAD || [];
  function readHtml() {
    if (V.read === 'list') {
      return back('rdback', L('Разговорник', 'Phrasebook')) + '<h2>📚 Оқу бұрышы</h2><p class="muted">' + esc(L('Народные сказки и басни, пересказанные простыми словами. Слушай по фразе, читай вслух, отвечай на вопросы.', 'Folk tales and fables retold in simple words. Listen line by line, read aloud, answer the questions.')) + '</p>' +
        '<div class="ph-grid">' + RD.map(function (t) {
          return '<button class="ph-tile" data-tale="' + t.id + '"><span class="e">' + t.e + '</span><b>' + esc(t.kk) + '</b><small>' + esc(tx(t)) + '</small><em>' + t.lines.length + ' · ❓' + t.qs.length + '</em>' + bestPill('r_' + t.id) + '</button>';
        }).join('') + '</div>';
    }
    var t = RD.filter(function (x) { return x.id === V.read; })[0], f = t.fork, pick = V.forkTale === t.id ? V.fork : null;
    var shown = taleLines(t), line = function (l, i) { return '<div class="rd-line" data-rl="' + i + '">' + row(l.kk, tx(l)) + '</div>'; };
    var forkBox = !f ? '' : '<div class="rd-fork" id="rdfork"><div class="rd-ask"><span class="rd-tag">🔀 ' + esc(L('Развилка — выбирай!', 'A fork — you choose!')) + '</span>' + row(f.ask.kk, tx(f.ask)) + '</div><div class="rd-choices">' +
      ['a', 'b'].map(function (k) { return '<button class="rd-choice' + (pick === k ? ' on' : '') + '" data-fork="' + k + '"' + (pick && pick !== k ? ' aria-pressed="false"' : '') + '><b>' + esc(f[k].kk) + '</b><small>' + esc(tx(f[k])) + '</small></button>'; }).join('') +
      '</div><p class="muted rd-hint">' + esc(pick ? L('Можно вернуться и выбрать другой путь — у него свой конец.', 'You can go back and choose the other way — it has its own ending.') : L('Выбери за героя — от этого зависит конец сказки.', 'Choose for the hero — the ending depends on it.')) + '</p></div>';
    var trunk = f ? f.at : t.lines.length;
    return back('rdback', L('Все сказки', 'All tales')) + '<h2>' + t.e + ' ' + esc(t.kk) + ' · <span class="muted" style="font-size:inherit">' + esc(tx(t)) + '</span></h2>' +
      '<button class="btn ghost" id="rplay">▶ ' + esc(pick || !f ? L('Слушать всю сказку', 'Play the whole tale') : L('Слушать начало', 'Play the beginning')) + '</button><div class="rd-tale">' +
      shown.slice(0, trunk).map(line).join('') + forkBox +
      (pick ? '<div class="rd-end rd-end-' + pick + '">' + shown.slice(trunk).map(function (l, i) { return line(l, trunk + i); }).join('') + '</div>' : '') + '</div>' +
      (pick === 'b' ? '<p class="muted">' + esc(L('Это наш новый конец. Вопросы — по народной сказке (путь «' + f.a.kk + '»).', 'This is our new ending. The questions are about the folk tale (the «' + f.a.kk + '» way).')) + '</p>' : '') +
      trainBtn('r_' + t.id, L('Вопросы по сказке', 'Questions about the tale'));
  }
  /** Lines on screen: the trunk, then the chosen ending (A — the original, B — the new one); no choice yet — the trunk. */
  function taleLines(t) {
    var f = t.fork, pick = V.forkTale === t.id ? V.fork : null;
    if (!f) return t.lines;
    return t.lines.slice(0, f.at).concat(pick === 'a' ? t.lines.slice(f.at) : pick === 'b' ? f.b.lines : []);
  }
  var rdTimer = null;
  function playTale(t) {
    clearTimeout(rdTimer);
    var i = 0, lines = taleLines(t);
    (function next() {
      api.qsa('.rd-line').forEach(function (e) { e.classList.toggle('now', +e.getAttribute('data-rl') === i); });
      if (i >= lines.length || !api.qs('.rd-line')) { var fk = api.qs('#rdfork'); if (fk && i >= lines.length && !(V.forkTale === t.id && V.fork)) fk.classList.add('now'); return; }
      var l = lines[i++];
      api.TTS.speak(l.kk, true);
      rdTimer = setTimeout(next, 1100 + l.kk.length * 80);
    })();
  }

  /* ------------------------------------------------------------ grammar */
  var CASE_KK = {}; G.CASES.forEach(function (c) { CASE_KK[c] = G.CASE_INFO[c].kk; });
  var TENSE = {
    present: ['Ауыспалы осы шақ', 'Настоящее-будущее: делаю / сделаю', 'Present / future: I do, I will do'],
    presentNeg: ['Болымсыз түр', 'Отрицание: не делаю', 'Negative: I don\'t'],
    past: ['Жедел өткен шақ', 'Прошедшее: сделал(а)', 'Past: I did'],
    pastNeg: ['Өткен шақ, болымсыз', 'Прошедшее с отрицанием: не сделал', 'Past negative: I didn\'t'],
    continuous: ['Нақ осы шақ', 'Прямо сейчас: делаю в эту минуту', 'Right now: I am doing']
  };
  var P5 = ['men', 'sen', 'siz', 'ol', 'biz'];
  function nounChips() { return chips('noun', G.NOUNS.map(function (n) { return [n.kk, n.e + ' ' + n.kk]; }), V.noun); }
  function nounInfo() { var n = G.NOUNS.filter(function (x) { return x.kk === V.noun; })[0]; return n ? n.kk + ' — ' + tx(n) : V.noun; }
  function rule(ru, en) { return '<div class="ph-rule">' + L(ru, en) + '</div>'; }
  function tbl(rows) { return '<div class="ph-tbl">' + rows.map(function (r) { return '<div>' + r.map(function (c) { return '<span>' + c + '</span>'; }).join('') + '</div>'; }).join('') + '</div>'; }

  var CARDS = [
    { id: 'sounds', icon: '🔤', kk: 'Қазақ дыбыстары', ru: '9 особых букв', en: '9 special letters', body: function () {
      return rule('В казахском алфавите 9 букв, которых нет в русском. Послушай слово и повтори.', 'The Kazakh alphabet has 9 letters that Russian does not. Listen and repeat.') +
        P.gram.sounds.map(function (s) { return row(s.w, L(s.wru, s.wen), '<em class="ph-note">' + esc(tx(s)) + '</em>', s.kk.toUpperCase() + s.kk); }).join('');
    } },
    { id: 'harmony', icon: '⚖️', kk: 'Үндестік заңы', ru: 'Сингармонизм: твёрдые и мягкие', en: 'Vowel harmony: back and front', body: function () {
      return rule('Окончание выбирает <b>последняя гласная</b> слова. Твёрдые (жуан): <b>а о ұ ы</b> → окончания с а/ы. Мягкие (жіңішке): <b>ә е ө ү і</b> → окончания с е/і. Буквы у и и не решают — смотри на гласную перед ними.',
        'The <b>last vowel</b> of a word chooses the ending. Back vowels (жуан) <b>а о ұ ы</b> → endings with а/ы. Front vowels (жіңішке) <b>ә е ө ү і</b> → endings with е/і. у and и don\'t decide — look at the vowel before them.') +
        tbl([['<b>' + L('Твёрдые', 'Back') + '</b>', 'а о ұ ы', 'бала<i>лар</i>, қала<i>да</i>'], ['<b>' + L('Мягкие', 'Front') + '</b>', 'ә е ө ү і', 'үй<i>лер</i>, мектеп<i>те</i>']]) +
        ['бала', 'мектеп', 'кітап', 'үй'].map(function (w) { var f = G.plural(w); return formRow(G.harmony(w) === 'back' ? L('твёрдое', 'back') : L('мягкое', 'front'), w, f) + '<p class="ph-why">' + esc(G.why(w, G.pluralSuffix(w), api.lang())) + '</p>'; }).join('');
    } },
    { id: 'plural', icon: '👥', kk: 'Көптік жалғау', ru: 'Множественное число', en: 'Plural', train: 'g_plural', body: function () {
      return rule('Окончание множественного числа зависит от последнего звука:', 'The plural ending depends on the last sound:') +
        tbl([[L('гласная, р, й, у', 'vowel, р, й, у'), '-лар / -лер', 'балалар, үйлер'], ['л, м, н, ң, ж, з', '-дар / -дер', 'гүлдер, қаламдар'], [L('глухие (п, т, к, қ, с, ш…)', 'voiceless (п т к қ с ш…)'), '-тар / -тер', 'кітаптар, иттер']]) +
        ['бала', 'үй', 'дәптер', 'гүл', 'қалам', 'қыз', 'кітап', 'мектеп', 'ағаш'].map(function (w) { return formRow(w, w, G.plural(w)); }).join('');
    } },
    { id: 'cases', icon: '🧭', kk: 'Септіктер', ru: '7 падежей', en: '7 cases', train: 'g_case', body: function () {
      var h = rule('В казахском 7 падежей. Окончание выбирают последняя гласная (твёрдо/мягко) и последний звук. Выбери слово — таблица построится сама.',
        'Kazakh has 7 cases. The ending is chosen by the last vowel (back/front) and the last sound. Pick a word and the table builds itself.') +
        tbl(G.CASES.map(function (c) {
          var I = G.CASE_INFO[c], all = c === 'atau' ? '—' : uniq([].concat.apply([], G.CASE_TABLE[c])).join(', ');
          return ['<b>' + I.kk + '</b>', esc(I.q), esc(L(I.ru, I.en)), '<i>' + esc(all) + '</i>'];
        }));
      h += nounChips() + '<p class="muted">' + esc(nounInfo()) + '</p>';
      h += G.CASES.map(function (c) { return formRow(CASE_KK[c] + ' · ' + G.CASE_INFO[c].q.split(' ')[0], V.noun, G.caseForm(V.noun, c)); }).join('');
      return h + '<p class="ph-why">' + esc(G.why(V.noun, G.caseSuffix(V.noun, 'ilik'), api.lang())) + '</p>';
    } },
    { id: 'poss', icon: '🎒', kk: 'Тәуелдік жалғау', ru: 'Притяжательные окончания: мой, твой…', en: 'Possessive endings: my, your…', train: 'g_poss', body: function () {
      return rule('После гласной: -м, -ң, -ңыз, -сы/-сі, -мыз. После согласной: -ым/-ім, -ың/-ің, -ыңыз/-іңіз, -ы/-і, -ымыз/-іміз. Глухие <b>п, к, қ</b> перед гласной звонеют: кітап → кітабым, мектеп → мектебім, тарақ → тарағым.',
        'After a vowel: -м, -ң, -ңыз, -сы/-сі, -мыз. After a consonant: -ым/-ім, -ың/-ің, -ыңыз/-іңіз, -ы/-і, -ымыз/-іміз. Voiceless <b>п, к, қ</b> become voiced before a vowel: кітап → кітабым, мектеп → мектебім.') +
        nounChips() + '<p class="muted">' + esc(nounInfo()) + '</p>' +
        G.POSS_PERSONS.map(function (p) { var f = G.possessive(V.noun, p); return formRow(G.POSS_LABEL[p], V.noun, f, G.POSS_LABEL[p] + ' ' + f); }).join('');
    } },
    { id: 'person', icon: '🙋', kk: 'Жіктік жалғау', ru: 'Я — ученик: личные окончания', en: '«I am a pupil»: personal endings', body: function () {
      var w = V.pw;
      return rule('«Быть» в казахском — это окончание: Мен оқушы<b>мын</b> — я ученик. После ж, з — -бын, после глухих — -пын; «мы» после м, н, ң тоже с б: дайын<b>быз</b>. У «ол» и «олар» окончания нет.',
        '«To be» is an ending in Kazakh: Мен оқушы<b>мын</b> — I am a pupil. After ж, з it is -бын, after voiceless -пын; «we» after м, н, ң also takes б: дайын<b>быз</b>. Ол and олар take no ending.') +
        chips('pw', P.gram.personWords.map(function (x) { return [x.kk, x.kk + ' · ' + tx(x)]; }), w) +
        G.PERSONS.map(function (p) { var f = w + G.personSuffix(w, p); return formRow(G.PERSON_KK[p], w, f, G.PERSON_KK[p] + ' ' + f); }).join('');
    } },
    { id: 'verbs', icon: '🏃', kk: 'Етістік шақтары', ru: 'Глагол: времена и отрицание', en: 'Verbs: tenses and negation', train: 'g_verb', body: function () {
      var v = V.verb, t = V.tense;
      var h = rule('Основа глагола + суффикс времени + личное окончание. Отрицание: -ма/-ме (после гласных и л, р, й, у), -ба/-бе (после м, н, ң, ж, з), -па/-пе (после глухих). «Хочу»: -ғым/-гім/-қым/-кім келеді.',
        'Verb stem + tense suffix + personal ending. Negation: -ма/-ме (after vowels and л, р, й, у), -ба/-бе (after м, н, ң, ж, з), -па/-пе (after voiceless). «I want to»: -ғым/-гім/-қым/-кім келеді.');
      h += chips('verb', G.VERBS.map(function (x) { return [x.kk, x.kk + ' · ' + tx(x)]; }), v);
      h += chips('tense', G.TENSES.map(function (k) { return [k, TENSE[k][0]]; }), t) + '<p class="muted">' + esc(L(TENSE[t][1], TENSE[t][2])) + '</p>';
      h += P5.map(function (p) { var f = G.conj(v, t, p); return formRow(G.PERSON_KK[p], v, f, G.PERSON_KK[p] + ' ' + f); }).join('');
      var w = G.wish(v);
      return h + formRow(L('Хочу', 'I want to'), v, w, 'Менің ' + w);
    } },
    { id: 'imp', icon: '📣', kk: 'Бұйрық рай', ru: 'Команды: сделай! сделайте!', en: 'Commands: do it!', train: 'g_imp', body: function () {
      var v = V.verb;
      var h = rule('Команда другу — это <b>сама основа</b> глагола: оқы! жаз! Старшим и учителю — вежливо: <b>-ыңыз / -іңіз</b> (оқыңыз, жазыңыз). Классу — <b>-ыңдар / -іңдер</b>. «Давай!» — -айық / -йық: ойнайық! Перед гласной п, к, қ звучат как б, г, ғ: жап → жабыңыз. «Не делай» — отрицание: жазба!',
        'A command to a friend is the <b>bare verb stem</b>: оқы! жаз! To elders and teachers — polite <b>-ыңыз / -іңіз</b> (оқыңыз). To a class — <b>-ыңдар / -іңдер</b>. «Let\'s!» — -айық / -йық: ойнайық! Before a vowel п, к, қ turn into б, г, ғ: жап → жабыңыз. «Don\'t» — negation: жазба!');
      h += chips('verb', G.VERBS.map(function (x) { return [x.kk, x.kk + ' · ' + tx(x)]; }), v);
      h += G.IMP_PERSONS.map(function (p) { var f = G.imperative(v, p); return formRow(G.IMP_KK[p], v, f, f); }).join('');
      h += formRow(L('Сен — не надо', 'Сен — don\'t'), v, G.imperativeNeg(v, 'sen')) + formRow(L('Сіз — не надо', 'Сіз — don\'t'), v, G.imperativeNeg(v, 'siz'));
      h += '<h3>' + esc(L('Учитель говорит', 'The teacher says')) + '</h3>' + P.gram.commands.slice(0, 6).map(function (c) { return row(c.kk, tx(c), '', c.e); }).join('');
      return h + trainBtn('teacher', L('Мұғалім айтады — слушай и выполни', 'Мұғалім айтады — listen and act'));
    } },
    { id: 'can', icon: '💪', kk: 'Мен … аламын', ru: '«Могу, умею»: -а / -е / -й алу', en: '«I can»: -а / -е / -й алу', train: 'g_can', body: function () {
      var v = V.verb;
      var h = rule('«Могу / умею» = глагол на <b>-а / -е / -й</b> + <b>аламын</b>: жүзе аламын — я умею плавать, оқи аламын — я умею читать (оқы → оқи). «Не могу» — <b>алмаймын</b>.',
        '«I can» = the verb with <b>-а / -е / -й</b> + <b>аламын</b>: жүзе аламын — I can swim, оқи аламын — I can read (оқы → оқи). «I can\'t» — <b>алмаймын</b>.');
      h += chips('verb', G.VERBS.map(function (x) { return [x.kk, x.kk + ' · ' + tx(x)]; }), v);
      h += P5.map(function (p) { var f = G.ability(v, p); return formRow(G.PERSON_KK[p], v, f, G.PERSON_KK[p] + ' ' + f); }).join('');
      var n = G.ability(v, 'men', true);
      return h + formRow(L('Мен — не могу', 'Мен — can\'t'), v, n, 'Мен ' + n);
    } },
    { id: 'modal', icon: '🎚️', kk: 'Керек, болады, мүмкін', ru: 'Нужно, можно, может быть', en: 'Need, may, maybe', train: 'g_modal', body: function () {
      var v = V.verb, h = rule('<b>Нужно</b>: кому? (маған, саған…) + глагол на <b>-у</b> + <b>керек</b> (или <b>қажет</b>): Маған оқу керек. Оқы → оқу, бар → бару. <b>Можно / нельзя</b>: -уға / -уге <b>болады / болмайды</b>, вопрос — <b>бола ма?</b> (Кіруге бола ма?). <b>Может быть</b>: -уы мүмкін (келуі мүмкін).',
        '<b>Need</b>: to whom? (маған, саған…) + verb in <b>-у</b> + <b>керек</b> (or <b>қажет</b>): Маған оқу керек. Оқы → оқу, бар → бару. <b>May / may not</b>: -уға / -уге <b>болады / болмайды</b>, question — <b>бола ма?</b> (Кіруге бола ма?). <b>Maybe</b>: -уы мүмкін (келуі мүмкін).');
      h += chips('verb', G.VERBS.map(function (x) { return [x.kk, x.kk + ' · ' + tx(x)]; }), v);
      h += P5.map(function (p) { var f = G.need(v, p); return formRow(G.PERSON_KK[p], v, f, f); }).join('');
      h += formRow(L('можно', 'may'), v, G.may(v)) + formRow(L('нельзя', 'may not'), v, G.may(v, true)) + formRow(L('можно?', 'may I?'), v, G.may(v, false, true)) + formRow(L('может быть (я)', 'maybe (I)'), v, G.maybe(v, 'men'));
      return h + '<h3>' + esc(L('Примеры', 'Examples')) + '</h3>' + P.gram.modalEx.map(function (x) { return row(x.kk, tx(x)); }).join('');
    } },
    { id: 'aux', icon: '🧘', kk: 'Отыр, тұр, жүр, жатыр', ru: '«Сейчас»: сидя, стоя, в движении', en: '«Now»: sitting, standing, on the move', train: 'g_aux', body: function () {
      var v = V.verb, a = V.aux;
      var h = rule('«Делаю сейчас» = глагол на <b>-ып / -іп / -п</b> + помощник, который показывает позу: <b>отыр</b> — сидя, <b>тұр</b> — стоя (или ровно, долго), <b>жүр</b> — в движении или «в эти дни», <b>жатыр</b> — лёжа или просто «сейчас». Оқып отырмын — я (сижу и) читаю.',
        '«Doing now» = verb in <b>-ып / -іп / -п</b> + a helper that shows the posture: <b>отыр</b> — sitting, <b>тұр</b> — standing (or steady), <b>жүр</b> — on the move or «these days», <b>жатыр</b> — lying or simply «now». Оқып отырмын — I am (sitting and) reading.');
      h += chips('verb', G.VERBS.map(function (x) { return [x.kk, x.kk + ' · ' + tx(x)]; }), v) + chips('aux', [['отыр', '🪑 отыр'], ['тұр', '🧍 тұр'], ['жүр', '🏃 жүр'], ['жатыр', '🛌 жатыр']], a);
      h += P5.map(function (p) { var f = G.aux(v, a, p); return formRow(G.PERSON_KK[p], v, f, G.PERSON_KK[p] + ' ' + f); }).join('');
      return h + '<h3>' + esc(L('Примеры', 'Examples')) + '</h3>' + P.gram.auxEx.map(function (x) { return row(x.kk, tx(x), '', x.e); }).join('');
    } },
    { id: 'cond', icon: '🔀', kk: '-са / -се: егер…', ru: '«Если»: барсам, келсең', en: '«If»: барсам, келсең', train: 'g_cond', body: function () {
      var v = V.verb, h = rule('«Если» = основа глагола + <b>-са / -се</b> + окончание: бар<b>сам</b> (если я пойду), кел<b>сең</b>, оқы<b>сақ</b>. «Если не» — с отрицанием: бар<b>масам</b>. Часть с «если» стоит первой: Күн жылы болса, далаға шығамыз.',
        '«If» = verb stem + <b>-са / -се</b> + ending: бар<b>сам</b> (if I go), кел<b>сең</b>, оқы<b>сақ</b>. «If not» — with negation: бар<b>масам</b>. The «if» part comes first: Күн жылы болса, далаға шығамыз.');
      h += chips('verb', G.VERBS.map(function (x) { return [x.kk, x.kk + ' · ' + tx(x)]; }), v);
      h += P5.map(function (p) { var f = G.cond(v, p); return formRow(G.PERSON_KK[p], v, f, G.PERSON_KK[p] + ' ' + f); }).join('');
      var n = G.cond(v, 'men', true);
      return h + formRow(L('Мен — если не', 'Мен — if not'), v, n, 'Мен ' + n) + '<h3>' + esc(L('Примеры', 'Examples')) + '</h3>' + P.gram.condEx.map(function (x) { return row(x.kk, tx(x)); }).join('');
    } },
    { id: 'demo', icon: '👉', kk: 'Бұл, мынау, анау', ru: 'Это, вот это, вон то', en: 'This, this one, that', train: 'g_demo', body: function () {
      return rule('<b>Бұл</b> — это (рядом). <b>Мынау</b> — вот это (показываю рукой). <b>Анау</b> — вон то (далеко). <b>Сол</b> — тот, о котором говорили. <b>Осы</b> — этот самый. Перед предметом — короче: <b>мына</b> кітап, <b>ана</b> үй.',
        '<b>Бұл</b> — this (near). <b>Мынау</b> — this one (pointing). <b>Анау</b> — that one over there. <b>Сол</b> — that one we talked about. <b>Осы</b> — this very one. Before a noun they are shorter: <b>мына</b> кітап, <b>ана</b> үй.') +
        P.gram.demo.map(function (d) { return row(d.ex, d.kk + ' — ' + tx(d) + ' · ' + L(d.exru, d.exen)); }).join('');
    } },
    { id: 'like', icon: '❤️', kk: 'Маған … ұнайды', ru: '«Мне нравится»', en: '«I like»', train: 'g_like', body: function () {
      return rule('«Мне нравится» по-казахски — <b>Маған</b> … ұнайды: тот, кому нравится, стоит в дательном падеже (кімге?). <b>«Мен ұнайды» — ошибка.</b> «Не нравится» — ұнамайды. Вопрос: Саған не ұнайды?',
        '«I like» in Kazakh is <b>Маған</b> … ұнайды: the one who likes goes into the dative case (кімге? — to whom?). <b>«Мен ұнайды» is wrong.</b> «Don\'t like» — ұнамайды. Question: Саған не ұнайды?') +
        P.gram.likeWho.map(function (w) { return row(w.kk, w.p + ' → ' + w.kk + ' · ' + tx(w)); }).join('') +
        '<h3>' + esc(L('Примеры', 'Examples')) + '</h3>' + P.gram.likeEx.map(function (x) { return row(x.kk, tx(x)); }).join('');
    } },
    { id: 'question', icon: '❓', kk: 'Сұраулық шылау', ru: 'Вопрос: ма/ме, ба/бе, па/пе', en: 'Yes/no question: ма/ме, ба/бе, па/пе', train: 'g_question', body: function () {
      return rule('Вопрос «да или нет?» делает частица, которая пишется <b>отдельно</b>: после гласных и л, р, й, у — ма/ме; после м, н, ң, ж, з — ба/бе; после глухих — па/пе.',
        'A yes/no question is made by a particle written <b>separately</b>: after vowels and л, р, й, у — ма/ме; after м, н, ң, ж, з — ба/бе; after voiceless — па/пе.') +
        ['кітап', 'қалам', 'үй', 'мысық', 'гүл', 'қыз'].map(function (w) { var s = 'Бұл ' + w + ' ' + G.question(w) + '?'; return row(s, '', '', G.NOUNS.filter(function (n) { return n.kk === w; })[0].e); }).join('');
    } },
    { id: 'pron', icon: '👤', kk: 'Есімдіктер', ru: 'Местоимения по падежам', en: 'Pronouns in the cases', body: function () {
      var w = V.pron;
      return rule('Мен, сен, ол склоняются по-особому: маған, саған, оған; мені, сені, оны. Сіз, біз, олар — по обычным правилам.', 'Мен, сен, ол decline irregularly: маған, саған, оған; мені, сені, оны. Сіз, біз, олар follow the normal rules.') +
        chips('pron', ['мен', 'сен', 'сіз', 'ол', 'біз', 'олар'].map(function (x) { return [x, x]; }), w) +
        G.CASES.map(function (c) { return formRow(CASE_KK[c], w, G.caseForm(w, c)); }).join('');
    } },
    { id: 'numbers', icon: '🔢', kk: 'Сан есім', ru: 'Числа и порядковые', en: 'Numbers and ordinals', body: function () {
      return rule('Порядковые: после гласной -ншы/-нші, после согласной -ыншы/-інші: алты → алтыншы, бес → бесінші. Составные числа пишутся раздельно: он бір (11), жиырма бес (25).',
        'Ordinals: after a vowel -ншы/-нші, after a consonant -ыншы/-інші: алты → алтыншы, бес → бесінші. Compound numbers are written apart: он бір (11), жиырма бес (25).') +
        G.NUMBERS.map(function (n, i) { return formRow(String(i + 1), n, G.ordinal(n)); }).join('') +
        row('он бір', '11') + row('жиырма бес', '25') + row('жүз он', '110') +
        '<h3>' + esc(L('Вдвоём, втроём: екеу, үшеу', 'Two of us, three of us: екеу, үшеу')) + '</h3>' +
        ['екі', 'үш', 'төрт', 'бес', 'алты', 'жеті'].map(function (n) { return formRow(n, n, G.collective(n)); }).join('') +
        formRow(L('мы вдвоём', 'we two'), 'екі', G.collective('екі', 'biz')) + formRow(L('они втроём', 'the three of them'), 'үш', G.collective('үш', 'ol')) +
        P.gram.collEx.map(function (x) { return row(x.kk, tx(x)); }).join('');
    } },
    { id: 'clock', icon: '🕔', kk: 'Сағат неше?', ru: 'Который час: жарты, ширек', en: 'What time is it: half, quarter', train: 'g_clock', body: function () {
      return rule('<b>Сағат бес.</b> — 5:00. <b>Жарты</b> — половина: сағат бес жарым — 5:30. <b>Ширек</b> — четверть: «от пяти прошла четверть» — сағат бес<b>тен</b> ширек өтті (5:15); «до шести осталась четверть» — сағат алты<b>ға</b> ширек қалды (5:45).',
        '<b>Сағат бес.</b> — 5:00. <b>Жарты</b> — half: сағат бес жарым — 5:30. <b>Ширек</b> — a quarter: «a quarter has passed from five» — сағат бес<b>тен</b> ширек өтті (5:15); «a quarter is left to six» — сағат алты<b>ға</b> ширек қалды (5:45).') +
        chips('hour', HOURS.map(function (h, i) { return [h, (i + 1) + ' · ' + h]; }), V.hour) +
        clockRows(V.hour).map(function (r) { return row(r[1], r[0]); }).join('');
    } },
    { id: 'postp', icon: '🔗', kk: 'Септеуліктер', ru: 'Послелоги: для, после, вместе с…', en: 'Postpositions: for, after, with…', body: function () {
      return rule('Казахские «предлоги» стоят <b>после</b> слова и требуют своего падежа.', 'Kazakh «prepositions» come <b>after</b> the word and need their own case.') +
        P.gram.postp.map(function (p) { return row(p.ex, L(p.exru, p.exen), '<em class="ph-note"><b>' + esc(p.kk) + '</b> — ' + esc(tx(p)) + ' · ' + esc(p.c) + '</em>'); }).join('');
    } },
    { id: 'order', icon: '🧱', kk: 'Сөйлем құрау', ru: 'Порядок слов и вопросы', en: 'Word order and question words', body: function () {
      return rule('Сказуемое — <b>в конце</b> предложения: кто? → где? / что? → что делает?', 'The verb goes <b>last</b>: who? → where? / what? → does what?') +
        P.gram.order.map(function (o) {
          return '<div class="ph-order">' + o.parts.map(function (p) { return '<span><b lang="kk">' + esc(p[0]) + '</b><small>' + esc(p[1]) + '</small></span>'; }).join('<i>→</i>') + '</div>' + row(o.kk, tx(o));
        }).join('') + '<h3>' + esc(L('Сұрау сөздер · вопросительные слова', 'Question words')) + '</h3>' + P.gram.qwords.map(function (q) { return row(q.kk, tx(q)); }).join('');
    } },
    { id: 'compare', icon: '📈', kk: 'Сын есім шырайы', ru: 'Больше, лучше, самый…', en: 'Bigger, better, the most…', body: function () {
      return rule('Сравнение: -рақ/-рек после гласной, -ырақ/-ірек после согласной (биік → биігірек). С кем сравниваем — в исходном падеже: тышқан<b>нан</b> үлкен. «Самый» — <b>ең</b>.',
        'Comparison: -рақ/-рек after a vowel, -ырақ/-ірек after a consonant (биік → биігірек). The thing compared takes the ablative: тышқан<b>нан</b> үлкен. «The most» is <b>ең</b>.') +
        P.gram.compare.map(function (c) { return formRow(tx(c), c.kk, c.f); }).join('') + P.gram.compareEx.map(function (c) { return row(c.kk, tx(c)); }).join('');
    } }
  ];
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
  function gramHtml() {
    return '<p class="muted">' + esc(L('Правила с живыми таблицами: выбери слово — увидишь все формы и услышишь их.', 'Rules with live tables: pick a word to see and hear every form.')) + '</p>' +
      CARDS.map(function (c) {
        var open = !!V.open[c.id];
        return '<section class="ph-card' + (open ? ' open' : '') + '"><button class="ph-head" data-card="' + c.id + '" aria-expanded="' + open + '"><span class="e">' + c.icon + '</span><span><b>' + esc(c.kk) + '</b><small>' + esc(tx(c)) + '</small></span>' +
          (c.train ? bestPill(c.train) : '') + '<span class="ch">' + (open ? '▴' : '▾') + '</span></button>' +
          (open ? '<div class="ph-body">' + c.body() + (c.train ? trainBtn(c.train, L('Тренажёр', 'Practice')) : '') + '</div>' : '') + '</section>';
      }).join('');
  }

  /* ------------------------------------------------------------ dictionary */
  var INDEX = null;
  function norm(s) { return String(s).toLowerCase().replace(/ё/g, 'е').trim(); }
  function index() {
    if (INDEX) return INDEX;
    var seen = {}; INDEX = [];
    function add(x, kind) { var k = x.kk + '|' + kind; if (seen[k]) return; seen[k] = 1; INDEX.push({ kk: x.kk, ru: x.ru || '', en: x.en || '', e: x.e, kind: kind }); }
    P.vocab.forEach(function (t) { t.words.forEach(function (w) { add(w, 'w'); }); });
    D.GRADES.forEach(function (g) { g.units.forEach(function (u) { u.lessons.forEach(function (l) { (l.words || []).forEach(function (w) { add(w, 'w'); }); }); }); });
    P.topics.forEach(function (t) { t.phrases.forEach(function (p) { add(p, 'p'); }); });
    P.proverbs.forEach(function (p) { add(p, 'pv'); });
    P.idioms.forEach(function (p) { add(p, 'id'); });
    return INDEX;
  }
  function search(q) {
    q = norm(q); if (q.length < 2) return [];
    return index().filter(function (x) { return norm(x.kk).indexOf(q) >= 0 || norm(x.ru).indexOf(q) >= 0 || norm(x.en).indexOf(q) >= 0; })
      .sort(function (a, b) { return (norm(a.kk).indexOf(q) === 0 ? 0 : 1) - (norm(b.kk).indexOf(q) === 0 ? 0 : 1) || a.kk.length - b.kk.length; }).slice(0, 40);
  }
  function resultsHtml(q) {
    if (norm(q).length < 2) return '';
    var r = search(q), KIND = { w: '', p: L('фраза', 'phrase'), pv: L('пословица', 'proverb'), id: L('фразеологизм', 'idiom') };
    if (!r.length) return '<p class="muted">' + esc(L('Ничего не нашли. Попробуй другое слово.', 'Nothing found. Try another word.')) + '</p>';
    return '<p class="muted">' + r.length + (r.length === 40 ? '+' : '') + ' · ' + esc(L('найдено', 'found')) + '</p>' +
      r.map(function (x) { return row(x.kk, tx(x) + (KIND[x.kind] ? ' · ' + KIND[x.kind] : ''), '', x.e); }).join('');
  }
  function wordsHtml() {
    var h = '<input class="name ph-search" id="phq" type="search" autocomplete="off" placeholder="🔎 ' + esc(L('Поиск: қазақша или по-русски', 'Search: Kazakh or English')) + '" aria-label="' + esc(L('Поиск по словарю', 'Search the dictionary')) + '"><div id="phres"></div>';
    h += '<div class="seg two">' + [['topics', L('Тақырыптар · по темам', 'By topic')], ['lessons', L('Сабақтар · из уроков', 'From lessons')]].map(function (x) {
      return '<button data-wv="' + x[0] + '" class="' + (V.wview === x[0] ? 'on' : '') + '">' + esc(x[1]) + '</button>';
    }).join('') + '</div>';
    if (V.wview === 'lessons') return h + api.lessonDict();
    if (V.vtopic) {
      var t = P.vocab.filter(function (x) { return x.id === V.vtopic; })[0];
      return h + back('vback', L('Все темы', 'All topics')) + '<h2>' + t.icon + ' ' + esc(t.kk) + ' · <span class="muted" style="font-size:inherit">' + esc(tx(t)) + '</span></h2>' +
        t.words.map(function (w) { return row(w.kk, tx(w), '', w.e); }).join('') + trainBtn('v_' + t.id, L('Проверь себя', 'Test yourself'));
    }
    return h + '<div class="ph-grid">' + P.vocab.map(function (t) {
      return '<button class="ph-tile" data-vt="' + t.id + '"><span class="e">' + t.icon + '</span><b>' + esc(t.kk) + '</b><small>' + esc(tx(t)) + '</small><em>' + t.words.length + '</em>' + bestPill('v_' + t.id) + '</button>';
    }).join('') + '</div>';
  }

  /* ------------------------------------------------------------ proverbs, idioms, twisters */
  function provHtml() {
    var th = V.theme, list = P.proverbs.filter(function (p) { return th === 'all' || p.theme === th; });
    return '<p class="muted">' + esc(L('Мақал-мәтелдер — народная мудрость. Слушай, учи и используй в речи.', 'Мақал-мәтелдер are folk wisdom. Listen, learn and use them.')) + '</p>' +
      trainBtn('proverbs', L('Мақалды жалғастыр · продолжи пословицу', 'Finish the proverb')) +
      chips('theme', [['all', '✨ ' + L('Все', 'All')]].concat(Object.keys(P.themes).map(function (k) { return [k, P.themes[k].e + ' ' + P.themes[k].kk]; })), th) +
      list.map(function (p) { return '<div class="ph-prov">' + row(p.kk, tx(p)) + '</div>'; }).join('') +
      '<h2>👅 ' + esc(L('Жаңылтпаштар · скороговорки', 'Tongue twisters')) + '</h2><p class="muted">' + esc(L('Скажи три раза подряд, всё быстрее и быстрее!', 'Say it three times, faster and faster!')) + '</p>' +
      P.twisters.map(function (t) { return row(t.kk, tx(t), '<em class="ph-note">' + esc(L('звук', 'sound')) + ': ' + esc(t.sound) + '</em>'); }).join('');
  }
  function idiomHtml() {
    return '<p class="muted">' + esc(L('Тұрақты тіркестер — устойчивые выражения. Дословный перевод часто смешной, а смысл другой!', 'Set phrases: the literal meaning is often funny, the real meaning is different!')) + '</p>' +
      trainBtn('idioms', L('Угадай смысл', 'Guess the meaning')) +
      P.idioms.map(function (i) { return row(i.kk, tx(i), '<em class="ph-note">' + esc(L('дословно', 'literally')) + ': «' + esc(i.lit) + '»</em>'); }).join('');
  }

  /* ------------------------------------------------------------ quizzes */
  function pickN(arr, n, not) { return api.shuffle(arr.filter(function (x) { return not.indexOf(x) < 0; })).slice(0, n); }
  function mcq(prompt, sub, say, ans, wrong, why) {
    var opts = api.shuffle(uniq([ans].concat(wrong)).slice(0, 4));
    return { prompt: prompt, sub: sub, say: say, opts: opts, ans: opts.indexOf(ans), why: why };
  }
  var GEN = {
    topic: function (id) {
      var t = P.topics.filter(function (x) { return x.id === id; })[0], ph = t.phrases;
      return api.shuffle(ph).slice(0, 8).map(function (p, i) {
        var others = ph.filter(function (x) { return x !== p; });
        if (i % 2) return mcq(tx(p), L('Как сказать по-казахски?', 'How do you say it in Kazakh?'), null, p.kk, pickN(others, 3, []).map(function (x) { return x.kk; }), p.kk);
        return mcq(p.kk, L('Что это значит?', 'What does it mean?'), p.kk, tx(p), pickN(others, 3, []).map(tx));
      });
    },
    vocab: function (id) {
      var t = P.vocab.filter(function (x) { return x.id === id; })[0];
      return api.shuffle(t.words).slice(0, 10).map(function (w) {
        return mcq(tx(w), L('Выбери казахское слово', 'Pick the Kazakh word'), null, w.kk, pickN(t.words, 3, [w]).map(function (x) { return x.kk; }), w.kk);
      });
    },
    proverbs: function () {
      var ps = P.proverbs.filter(P.halves);
      return api.shuffle(ps).slice(0, 8).map(function (p) {
        var q = mcq(p.a + ' …', L('Продолжи пословицу', 'Finish the proverb'), null, p.b, pickN(ps, 3, [p]).map(function (x) { return x.b; }), p.kk + ' — ' + tx(p));
        q.after = p.kk; return q;     // the whole proverb is spoken after the answer
      });
    },
    idioms: function () {
      return api.shuffle(P.idioms).slice(0, 8).map(function (i) {
        return mcq(i.kk, L('Что это значит?', 'What does it mean?'), i.kk, tx(i), pickN(P.idioms, 3, [i]).map(tx), L('Дословно: «', 'Literally: «') + i.lit + '»');
      });
    },
    g_plural: function () {
      return api.shuffle(G.NOUNS).slice(0, 8).map(function (n) {
        var a = G.pluralSuffix(n.kk);
        return mcq(n.e + ' ' + n.kk + ' + ?', L('Множественное число: ', 'Plural: ') + tx(n), null, '-' + a, pickN(['лар', 'лер', 'дар', 'дер', 'тар', 'тер'], 3, [a]).map(function (x) { return '-' + x; }), G.why(n.kk, a, api.lang()) + ' → ' + G.plural(n.kk));
      });
    },
    g_case: function () {
      var cs = G.CASES.slice(1);
      return api.shuffle(G.NOUNS).slice(0, 8).map(function (n) {
        var c = cs[api.rnd(cs.length)], a = G.caseSuffix(n.kk, c), pool = uniq([].concat.apply([], G.CASE_TABLE[c]));
        return mcq(n.e + ' ' + n.kk + ' + ?', G.CASE_INFO[c].kk + ' · ' + G.CASE_INFO[c].q, null, '-' + a, pickN(pool, 3, [a]).map(function (x) { return '-' + x; }), G.why(n.kk, a, api.lang()) + ' → ' + G.caseForm(n.kk, c));
      });
    },
    g_poss: function () {
      return api.shuffle(G.NOUNS).slice(0, 8).map(function (n) {
        var p = G.POSS_PERSONS[api.rnd(5)], a = G.possessive(n.kk, p);
        var wrong = G.POSS_PERSONS.filter(function (x) { return x !== p; }).map(function (x) { return G.possessive(n.kk, x); });
        return mcq(G.POSS_LABEL[p] + ' + ' + n.e + ' ' + n.kk, L('Мой, твой, его…?', 'My, your, his…?'), null, a, pickN(wrong, 3, []), G.POSS_LABEL[p] + ' ' + a);
      });
    },
    g_question: function () {
      return api.shuffle(G.NOUNS).slice(0, 8).map(function (n) {
        var a = G.question(n.kk);
        return mcq('Бұл ' + n.kk + ' …?', n.e + ' ' + L('Выбери частицу вопроса', 'Pick the question particle'), null, a, pickN(['ма', 'ме', 'ба', 'бе', 'па', 'пе'], 3, [a]), 'Бұл ' + n.kk + ' ' + a + '?');
      });
    },
    g_verb: function () {
      return api.shuffle(G.VERBS).slice(0, 8).map(function (v) {
        var t = G.TENSES[api.rnd(G.TENSES.length)], p = P5[api.rnd(5)], a = G.conj(v.kk, t, p);
        var wrong = P5.filter(function (x) { return x !== p; }).map(function (x) { return G.conj(v.kk, t, x); }).slice(0, 2)
          .concat(G.TENSES.filter(function (x) { return x !== t; }).map(function (x) { return G.conj(v.kk, x, p); }));
        return mcq(G.PERSON_KK[p] + ' + ' + v.kk + ' (' + tx(v) + ')', TENSE[t][0] + ' · ' + L(TENSE[t][1], TENSE[t][2]), null, a, api.shuffle(uniq(wrong.filter(function (x) { return x !== a; }))).slice(0, 3), G.PERSON_KK[p] + ' ' + a);
      });
    }
  };
  var cap = function (w) { return w.charAt(0).toUpperCase() + w.slice(1); };
  GEN.g_imp = function () {
    var ps = ['sen', 'siz', 'sender'];
    return api.shuffle(G.VERBS).slice(0, 8).map(function (v) {
      var p = ps[api.rnd(3)], a = G.imperative(v.kk, p);
      var wrong = ps.filter(function (x) { return x !== p; }).map(function (x) { return G.imperative(v.kk, x); }).concat([G.present(v.kk, p === 'siz' ? 'siz' : 'sen')]);
      return mcq(G.IMP_KK[p] + ' + ' + v.kk + ' (' + tx(v) + ')', L('Скажи команду', 'Give the command'), null, a, wrong, G.IMP_KK[p] + ': ' + a + '!');
    });
  };
  GEN.g_can = function () {
    return api.shuffle(G.VERBS).slice(0, 8).map(function (v) {
      var p = P5[api.rnd(5)], neg = api.rnd(3) === 0, a = G.ability(v.kk, p, neg);
      var wrong = [G.ability(v.kk, p, !neg), v.kk + ' ' + (neg ? G.presentNeg('ал', p) : G.present('ал', p))].concat(P5.filter(function (x) { return x !== p; }).slice(0, 2).map(function (x) { return G.ability(v.kk, x, neg); }));
      var q = mcq(G.PERSON_KK[p] + ' + ' + v.kk + ' (' + tx(v) + ')', neg ? L('Не могу / не умею', 'Can\'t') : L('Могу / умею', 'Can'), null, a, uniq(wrong.filter(function (x) { return x !== a; })), G.PERSON_KK[p] + ' ' + a);
      q.after = G.PERSON_KK[p] + ' ' + a; return q;
    });
  };
  GEN.g_modal = function () {
    return api.shuffle(G.VERBS).slice(0, 8).map(function (v) {
      var p = P5[api.rnd(5)], full = G.need(v.kk, p), a = G.infinitive(v.kk);
      var q = mcq(full.replace(a, '…'), L('Нужно: ', 'Need to: ') + tx(v), null, a, [v.kk, G.present(v.kk, p), G.cond(v.kk, p)], full);
      q.after = full; return q;
    });
  };
  GEN.g_aux = function () {
    var E = P.gram.auxEx;
    return api.shuffle(E).map(function (x) {
      var m = x.a.match(/^(отыр|тұр|жүр|жатыр)(.*)$/), end = m[2], opts = ['отыр', 'тұр', 'жүр', 'жатыр'].filter(function (o) { return o !== m[1] && !(m[1] !== 'жатыр' && o === 'жатыр'); });
      var wrong = opts.map(function (o) { return o + (o === 'жүр' ? end.replace('ы', 'і') : end.replace('і', 'ы')); });
      var q = mcq(x.e + ' ' + x.blank, L('Подсказка — поза на картинке', 'Hint: the posture in the picture') + ' · ' + tx(x), null, x.a, wrong, x.kk);
      q.after = x.kk; return q;
    });
  };
  GEN.g_cond = function () {
    return api.shuffle(G.VERBS).slice(0, 8).map(function (v) {
      var p = P5[api.rnd(5)], a = G.cond(v.kk, p);
      var wrong = P5.filter(function (x) { return x !== p; }).slice(0, 2).map(function (x) { return G.cond(v.kk, x); }).concat([G.present(v.kk, p)]);
      var q = mcq(G.PERSON_KK[p] + ' + ' + v.kk + ' (' + tx(v) + ')', L('Если…', 'If…'), null, a, uniq(wrong.filter(function (x) { return x !== a; })), G.PERSON_KK[p] + ' ' + a);
      q.after = G.PERSON_KK[p] + ' ' + a; return q;
    });
  };
  GEN.g_demo = function () {
    var D = P.gram.demo;
    return api.shuffle(D).map(function (d) { return mcq(tx(d), L('Какое слово?', 'Which word?'), null, d.kk, pickN(D, 3, [d]).map(function (x) { return x.kk; }), d.ex); });
  };
  GEN.g_like = function () {
    var W = P.gram.likeWho.slice(0, 5), T = P.gram.likeThings;
    return api.shuffle(W.concat(W)).slice(0, 8).map(function (w) {
      var t = T[api.rnd(T.length)], a = cap(w.kk), say = a + ' ' + t.kk + ' ұнайды.';
      var q = mcq('… ' + t.e + ' ' + t.kk + ' ұнайды.', L('Кому нравится? — ', 'Who likes it? — ') + tx(w), null, a, [cap(w.p)].concat(pickN(W, 2, [w]).map(function (x) { return cap(x.kk); })), say);
      q.after = say; return q;
    });
  };
  GEN.teacher = function () {
    var C = P.gram.commands, act = function (c) { return c.e + ' ' + tx(c); };
    return api.shuffle(C).slice(0, 8).map(function (c) { var q = mcq('🔊', L('Слушай учителя и выбери действие', 'Listen to the teacher and pick the action'), c.kk, act(c), pickN(C, 3, [c]).map(act), c.kk + ' — ' + tx(c)); q.after = c.kk; return q; });
  };
  var HOURS = G.NUMBERS.concat(['он бір', 'он екі']);
  function clockRows(h) {
    var i = HOURS.indexOf(h), n = i + 1, next = HOURS[(i + 1) % 12];
    return [[n + ':00', 'Сағат ' + h + '.'], [n + ':15', 'Сағат ' + G.caseForm(h, 'shygys') + ' ширек өтті.'],
      [n + ':30', 'Сағат ' + h + ' жарым.'], [n + ':45', 'Сағат ' + G.caseForm(next, 'barys') + ' ширек қалды.']];
  }
  GEN.g_clock = function () {
    return api.shuffle(HOURS).slice(0, 8).map(function (h) {
      var rows = clockRows(h), k = api.rnd(4), r = rows[k];
      var q = mcq('🕐 ' + r[0], L('Как сказать по-казахски?', 'How do you say it in Kazakh?'), null, r[1], rows.filter(function (x, j) { return j !== k; }).map(function (x) { return x[1]; }), r[0] + ' — ' + r[1]);
      q.after = r[1]; return q;
    });
  };
  GEN.read = function (id) {
    var t = RD.filter(function (x) { return x.id === id; })[0];
    return t.qs.map(function (x) { var q = mcq(x.kk, tx(x), x.kk, x.a, x.w, t.e + ' ' + t.kk); q.after = x.a; return q; });
  };
  function genFor(key) {
    if (key.indexOf('t_') === 0) return GEN.topic(key.slice(2));
    if (key.indexOf('r_') === 0) return GEN.read(key.slice(2));
    if (key.indexOf('v_') === 0) return GEN.vocab(key.slice(2));
    return GEN[key]();
  }
  function startQuiz(key) { V.q = { key: key, items: genFor(key), i: 0, ok: 0, done: false }; showQ(); }
  function showQ() {
    var q = V.q, it = q.items[q.i], box = api.qs('#phmain');
    if (!box) return;
    box.innerHTML = '<div class="ph-qhead"><button class="ph-back" id="qx">✕ ' + esc(L('Выйти', 'Quit')) + '</button><div class="goal dark"><i style="width:' + Math.round(q.i / q.items.length * 100) + '%"></i></div><b>' + (q.i + 1) + '/' + q.items.length + '</b></div>' +
      '<div class="ph-q"><small>' + esc(it.sub) + '</small><b lang="kk">' + esc(it.prompt) + '</b>' + (it.say ? api.spk(it.say) : '') + '</div>' +
      '<div class="ph-opts">' + it.opts.map(function (o, i) { return '<button class="card ph-opt" data-o="' + i + '">' + esc(o) + '</button>'; }).join('') + '</div><div id="phfb" aria-live="polite"></div>';
    api.bindSpeak(box);
    if (it.say) api.TTS.speak(it.say, true);
    api.qs('#qx').onclick = function () { V.q = null; api.refresh(); };
    api.qsa('.ph-opt', box).forEach(function (b) {
      b.onclick = function () {
        if (q.done) return;
        q.done = true;
        var i = +b.getAttribute('data-o'), ok = i === it.ans;
        if (ok) { q.ok++; api.sfx.ok(); } else { api.sfx.bad(); b.classList.add('wrong'); }
        api.qsa('.ph-opt', box)[it.ans].classList.add('right');
        var right = it.opts[it.ans];
        var after = it.after || right;      // speak the Kazakh answer (never a translation or a bare ending)
        if (!/[a-z]/i.test(after) && after.charAt(0) !== '-' && api.TTS.file(after)) api.TTS.speak(after, true);
        api.qs('#phfb').innerHTML = '<div class="ph-fb ' + (ok ? 'ok' : 'bad') + '"><b>' + (ok ? L('Дұрыс! Верно!', 'Дұрыс! Correct!') : L('Қате. Правильно: ', 'Not quite. Answer: ') + esc(right)) + '</b>' +
          (it.why ? '<span>' + esc(it.why) + '</span>' : '') + '</div><button class="btn ok" id="qn">' + esc(L('Келесі · дальше', 'Next')) + '</button>';
        api.qs('#qn').onclick = function () { q.i++; q.done = false; if (q.i >= q.items.length) finish(); else showQ(); };
      };
    });
  }
  function finish() {
    var q = V.q, pct = Math.round(q.ok / q.items.length * 100), s = st(), was = s.best[q.key];
    s.best[q.key] = Math.max(was || 0, pct);
    var coins = q.ok + (pct === 100 ? 5 : 0), xp = api.addXp(Math.min(10, q.ok));
    S().coins += coins; api.save(); api.levelCheck(); api.checkAch();
    var box = api.qs('#phmain');
    box.innerHTML = '<div class="ph-result">' + api.myHero(pct >= 70 ? 'wow' : 'happy') + '<h2>' + (pct === 100 ? 'Керемет! Мінсіз!' : pct >= 70 ? 'Жарайсың!' : 'Тағы жаттық!') + '</h2>' +
      '<p><b>' + q.ok + ' / ' + q.items.length + '</b> · ' + pct + '%' + (was != null && pct > was ? ' · ' + esc(L('новый рекорд!', 'new best!')) : '') + '</p><p>+' + coins + ' 🪙 · +' + xp + ' ⚡</p>' +
      '<button class="btn gold" id="qr">' + esc(L('Қайталау · ещё раз', 'Again')) + '</button><button class="btn ghost" id="qb">' + esc(L('Артқа · назад', 'Back')) + '</button></div>';
    if (pct >= 70) api.sfx.win();
    api.qs('#qr').onclick = function () { startQuiz(q.key); };
    api.qs('#qb').onclick = function () { V.q = null; api.renderHome(); api.flushRewards(); };
  }

  /* ------------------------------------------------------------ binding */
  function bind() {
    function on(sel, fn) { api.qsa(sel).forEach(function (b) { b.onclick = function () { api.sfx.tap(); fn(b); }; }); }
    on('[data-ph]', function (b) { go(function () { S().phTab = b.getAttribute('data-ph'); V.topic = null; V.vtopic = null; V.read = null; clearTimeout(rdTimer); }); });
    on('[data-topic]', function (b) { go(function () { V.topic = b.getAttribute('data-topic'); }); });
    on('[data-readlist]', function () { go(function () { V.read = 'list'; }); });
    on('[data-tale]', function (b) { go(function () { V.read = b.getAttribute('data-tale'); }); });
    on('[data-fork]', function (b) {
      var t = RD.filter(function (x) { return x.id === V.read; })[0], k = b.getAttribute('data-fork');
      go(function () { V.forkTale = t.id; V.fork = k; });
      api.TTS.speak(t.fork[k].kk, true);
      var end = api.qs('.rd-end'); if (end) end.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
    on('#rdback', function () { clearTimeout(rdTimer); go(function () { V.read = V.read === 'list' ? null : 'list'; }); });
    on('[data-hour]', function (b) { keep(function () { V.hour = b.getAttribute('data-hour'); }); });
    on('[data-aux]', function (b) { keep(function () { V.aux = b.getAttribute('data-aux'); }); });
    on('#phback', function () { go(function () { V.topic = null; }); });
    on('#vback', function () { go(function () { V.vtopic = null; }); });
    on('[data-vt]', function (b) { go(function () { V.vtopic = b.getAttribute('data-vt'); }); });
    on('[data-wv]', function (b) { go(function () { V.wview = b.getAttribute('data-wv'); }); });
    on('[data-card]', function (b) { keep(function () { var id = b.getAttribute('data-card'); V.open[id] = !V.open[id]; }); });
    on('[data-noun]', function (b) { keep(function () { V.noun = b.getAttribute('data-noun'); }); });
    on('[data-verb]', function (b) { keep(function () { V.verb = b.getAttribute('data-verb'); }); });
    on('[data-tense]', function (b) { keep(function () { V.tense = b.getAttribute('data-tense'); }); });
    on('[data-pw]', function (b) { keep(function () { V.pw = b.getAttribute('data-pw'); }); });
    on('[data-pron]', function (b) { keep(function () { V.pron = b.getAttribute('data-pron'); }); });
    on('[data-theme]', function (b) { keep(function () { V.theme = b.getAttribute('data-theme'); }); });
    on('[data-train]', function (b) { startQuiz(b.getAttribute('data-train')); });
    // keep the selected chip of each picker in view (they scroll sideways on phones)
    api.qsa('.ph-chips').forEach(function (c) { var on = c.querySelector('.on'); if (on) c.scrollLeft = Math.max(0, on.offsetLeft - c.offsetLeft - 16); });
    var rp = api.qs('#rplay');
    if (rp) rp.onclick = function () { playTale(RD.filter(function (x) { return x.id === V.read; })[0]); };
    var dp = api.qs('#dplay');
    if (dp) dp.onclick = function () { playDialog(P.topics.filter(function (x) { return x.id === V.topic; })[0]); };
    var qi = api.qs('#phq');
    if (qi) {
      qi.value = V.search || '';
      var draw = function () { V.search = qi.value; var r = api.qs('#phres'); r.innerHTML = resultsHtml(qi.value); api.bindSpeak(r); };
      qi.oninput = draw; if (V.search) draw();
    }
  }

  window.Q.ext.dictPage = page;
  window.Q.ext.bindDict = bind;
  window.QPHRASE_UI = { search: search, genFor: genFor, cards: CARDS };
})();
