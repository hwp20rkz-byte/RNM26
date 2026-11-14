/* 4-сынып (master plan, sprint 5): six themes of the grade-4 «Қазақ тілі» programme for schools with a non-Kazakh
 * language of instruction — the topics only; every text below is written for this game. Each unit ends with a
 * БЖБ (бөлім бойынша жиынтық бағалау, СОР: 14 tasks on the unit, 5 minutes, mark 2–5) and the track ends with a
 * ТЖБ (тоқсан бойынша жиынтық бағалау, СОЧ: 14 tasks on the whole grade, 10 minutes).
 * Facts (dates, places) are listed with their sources in methodology/grade4-track.md for the teacher to check. */
(function () {
  'use strict';
  var D = window.QDATA;
  function w(kk, e, ru, en) { return { kk: kk, e: e, ru: ru, en: en }; }
  function s(kk, ru, en, alt) { var o = { kk: kk, ru: ru, en: en }; if (alt) o.alt = alt; return o; }
  function sor(n, unitKk) {
    return { id: 'g4u' + n + 'bzb', kk: 'БЖБ: ' + unitKk, ru: 'СОР: ' + ['', 'традиции', 'природа', 'путешествие', 'здоровье', 'наука', 'мечта'][n], en: 'Unit test', icon: '📝',
      review: true, assess: true, boss: { seconds: 300, hearts: 5 } };
  }
  var G4 = { n: D.GRADES.length + 1, kk: '4-сынып', ru: '4 класс', en: 'Grade 4', units: [] };
  D.GRADES.push(G4);
  G4.units.push(
    {
      id: 'g4u1', kk: 'Салт-дәстүр мен мерекелер', ru: 'Традиции и праздники', en: 'Traditions and holidays', hue: 'red', hero: 'botaqan', module: 1,
      mascot: 'Наурыз құтты болсын! — С праздником Наурыз!', mascotEn: 'Наурыз құтты болсын! — Happy Nauryz!',
      lessons: [
        { id: 'g4u1l1', kk: 'Наурыз', ru: 'Наурыз', en: 'Nauryz', icon: '🌷',
          words: [w('Наурыз', '🌷', 'Наурыз, праздник весны', 'Nauryz, the spring holiday'), w('көже', '🥣', 'коже (суп-напиток)', 'kozhe (grain soup)'), w('көктем', '🌱', 'весна', 'spring'),
            w('мереке', '🎉', 'праздник', 'holiday'), w('құттықтаймын', '💌', 'поздравляю', 'I congratulate')],
          sentences: [s('Наурыз — көктем мерекесі', 'Наурыз — праздник весны', 'Nauryz is the spring holiday'), s('Біз Наурыз көже ішеміз', 'Мы едим наурыз-коже', 'We have Nauryz kozhe'),
            s('Наурыз мерекесімен құттықтаймын', 'Поздравляю с праздником Наурыз', 'Happy Nauryz to you')] },
        { id: 'g4u1l2', kk: 'Қонақ күту', ru: 'Встречаем гостей', en: 'Welcoming guests', icon: '🫖',
          words: [w('қонақ', '🧑‍🤝‍🧑', 'гость', 'guest'), w('дастарқан', '🍽️', 'дастархан, накрытый стол', 'dastarkhan, the set table'), w('шай', '🍵', 'чай', 'tea'),
            w('бауырсақ', '🥯', 'баурсак', 'baursak'), w('төр', '🛋️', 'почётное место', 'the seat of honour')],
          sentences: [s('Қонақ келді, төрге шығыңыз', 'Гости пришли — проходите на почётное место', 'The guests have come — please take the seat of honour'),
            s('Әжем дастарқан жайды', 'Бабушка накрыла дастархан', 'Grandma set the table'), s('Қонаққа шай құямыз', 'Наливаем гостю чай', 'We pour tea for the guest')] },
        { id: 'g4u1l3', kk: 'Ұлттық ойындар', ru: 'Национальные игры', en: 'National games', icon: '🎯',
          words: [w('асық', '🦴', 'асык', 'asyk (knucklebone)'), w('тоғызқұмалақ', '⚫', 'тогызкумалак', 'togyz kumalak'), w('көкпар', '🐎', 'кокпар', 'kokpar'),
            w('ойыншы', '🧒', 'игрок', 'player'), w('жеңіс', '🏆', 'победа', 'victory')],
          sentences: [s('Біз аулада асық ойнаймыз', 'Мы играем в асыки во дворе', 'We play asyk in the yard'), s('Тоғызқұмалақ — ақыл ойыны', 'Тогызкумалак — игра ума', 'Togyz kumalak is a game of the mind'),
            s('Көкпарды атпен ойнайды', 'В кокпар играют на конях', 'Kokpar is played on horseback')] },
        { id: 'g4u1l4', kk: 'Тәуелсіздік күні', ru: 'День Независимости', en: 'Independence Day', icon: '🇰🇿',
          words: [w('Тәуелсіздік', '🇰🇿', 'независимость', 'independence'), w('ту', '🚩', 'флаг', 'flag'), w('Елтаңба', '🛡️', 'герб', 'coat of arms'),
            w('Әнұран', '🎶', 'гимн', 'anthem'), w('Отан', '🏞️', 'Родина', 'homeland')],
          sentences: [s('Тәуелсіздік күні — желтоқсанның он алтысы', 'День Независимости — 16 декабря', 'Independence Day is on the 16th of December'),
            s('Біздің туымыз көк түсті', 'Наш флаг голубого цвета', 'Our flag is sky blue'), s('Біз Әнұранды тұрып айтамыз', 'Гимн мы поём стоя', 'We sing the anthem standing')] },
        { id: 'g4u1l5', kk: 'Отбасы дәстүрі', ru: 'Семейные традиции', en: 'Family traditions', icon: '🤲',
          words: [w('ата-әже', '👴', 'дедушка и бабушка', 'grandparents'), w('бата', '🤲', 'благословение', 'blessing'), w('немере', '🧒', 'внук, внучка', 'grandchild'),
            w('сыйлау', '🙏', 'уважать', 'to respect'), w('шежіре', '🌳', 'родословная', 'family tree')],
          sentences: [s('Атам маған бата берді', 'Дедушка дал мне благословение', 'Grandpa gave me his blessing'), s('Үлкенді сыйлау керек', 'Старших нужно уважать', 'Elders should be respected'),
            s('Мен жеті атамды білемін', 'Я знаю семь своих предков', 'I know my seven forefathers')] },
        sor(1, 'Салт-дәстүр')
      ]
    },
    {
      id: 'g4u2', kk: 'Табиғатты қорғайық', ru: 'Береги природу', en: 'Protect nature', hue: 'green', hero: 'qoyan', module: 2,
      mascot: 'Бір тал кессең, он тал ек. — Срубил одно дерево — посади десять.', mascotEn: 'Бір тал кессең, он тал ек. — Cut down one tree, plant ten.',
      lessons: [
        { id: 'g4u2l1', kk: 'Ауа райы', ru: 'Погода', en: 'The weather', icon: '🌦️',
          words: [w('ауа райы', '🌦️', 'погода', 'weather'), w('жаңбыр', '🌧️', 'дождь', 'rain'), w('қар', '❄️', 'снег', 'snow'), w('жел', '🌬️', 'ветер', 'wind'), w('бұлтты', '☁️', 'облачно', 'cloudy')],
          sentences: [s('Бүгін ауа райы қандай?', 'Какая сегодня погода?', 'What is the weather like today?'), s('Ертең жаңбыр жауады', 'Завтра пойдёт дождь', 'It will rain tomorrow'),
            s('Далада қатты жел соғып тұр', 'На улице дует сильный ветер', 'A strong wind is blowing outside')] },
        { id: 'g4u2l2', kk: 'Су — тіршілік көзі', ru: 'Вода — источник жизни', en: 'Water is the source of life', icon: '💧',
          words: [w('су', '💧', 'вода', 'water'), w('өзен', '🏞️', 'река', 'river'), w('көл', '🛶', 'озеро', 'lake'), w('үнемдеу', '🚰', 'экономить', 'to save'), w('таза', '✨', 'чистый', 'clean')],
          sentences: [s('Су — тіршілік көзі', 'Вода — источник жизни', 'Water is the source of life'), s('Суды үнемдеу керек', 'Воду нужно экономить', 'We must save water'),
            s('Өзенге қоқыс тастамаңдар', 'Не бросайте мусор в реку', 'Don\'t throw rubbish into the river')] },
        { id: 'g4u2l3', kk: 'Қоқысты сұрыптаймыз', ru: 'Сортируем мусор', en: 'Sorting rubbish', icon: '♻️',
          words: [w('қоқыс', '🗑️', 'мусор', 'rubbish'), w('пластик', '🧴', 'пластик', 'plastic'), w('қағаз', '📄', 'бумага', 'paper'), w('шыны', '🫙', 'стекло', 'glass'),
            w('қайта өңдеу', '♻️', 'переработка', 'recycling')],
          sentences: [s('Қағазды көк жәшікке саламыз', 'Бумагу кладём в синий контейнер', 'We put paper into the blue bin'),
            s('Пластик бөтелкелерді бөлек жинаймыз', 'Пластиковые бутылки собираем отдельно', 'We collect plastic bottles separately'), s('Қоқысты қайта өңдеуге болады', 'Мусор можно переработать', 'Rubbish can be recycled')] },
        { id: 'g4u2l4', kk: 'Қызыл кітап', ru: 'Красная книга', en: 'The Red Book', icon: '🐆',
          words: [w('Қызыл кітап', '📕', 'Красная книга', 'the Red Book'), w('барыс', '🐆', 'снежный барс', 'snow leopard'), w('киік', '🦌', 'сайгак', 'saiga'),
            w('қорғау', '🛡️', 'охранять', 'to protect'), w('сирек', '💎', 'редкий', 'rare')],
          sentences: [s('Барыс — Қызыл кітапқа енген аң', 'Снежный барс — зверь из Красной книги', 'The snow leopard is in the Red Book'),
            s('Киікті аулауға болмайды', 'Охотиться на сайгаков нельзя', 'Hunting saigas is forbidden'), s('Біз сирек жануарларды қорғаймыз', 'Мы охраняем редких животных', 'We protect rare animals')] },
        { id: 'g4u2l5', kk: 'Ағаш отырғызамыз', ru: 'Сажаем деревья', en: 'Planting trees', icon: '🌳',
          words: [w('ағаш', '🌳', 'дерево', 'tree'), w('көшет', '🌱', 'саженец', 'seedling'), w('күрек', '🪏', 'лопата', 'spade'), w('суарамыз', '🚿', 'поливаем', 'we water'), w('орман', '🌲', 'лес', 'forest')],
          sentences: [s('Біз мектеп ауласына көшет отырғыздық', 'Мы посадили саженцы во дворе школы', 'We planted seedlings in the school yard'),
            s('Көшетті күнде суарамыз', 'Саженцы поливаем каждый день', 'We water the seedlings every day'), s('Бір тал кессең, он тал ек', 'Срубил одно дерево — посади десять', 'Cut down one tree, plant ten')] },
        sor(2, 'Табиғат')
      ]
    },
    {
      id: 'g4u3', kk: 'Қазақстанды аралаймыз', ru: 'Путешествуем по Казахстану', en: 'Travelling around Kazakhstan', hue: 'teal', hero: 'qyran', module: 3,
      mascot: 'Көп жүрген біледі. — Кто много ездит, тот много знает.', mascotEn: 'Көп жүрген біледі. — Who travels much knows much.',
      lessons: [
        { id: 'g4u3l1', kk: 'Пойызбен саяхат', ru: 'Путешествие на поезде', en: 'A trip by train', icon: '🚆',
          words: [w('пойыз', '🚆', 'поезд', 'train'), w('билет', '🎫', 'билет', 'ticket'), w('вагон', '🚃', 'вагон', 'carriage'), w('жолаушы', '🧳', 'пассажир', 'passenger'), w('бекет', '🚉', 'станция', 'station')],
          sentences: [s('Маған Түркістанға бір билет керек', 'Мне нужен один билет до Туркестана', 'I need one ticket to Turkistan'),
            s('Пойыз сағат сегізде жүреді', 'Поезд отправляется в восемь часов', 'The train leaves at eight o\'clock'), s('Жолаушылар вагонға отырды', 'Пассажиры сели в вагон', 'The passengers got into the carriage')] },
        { id: 'g4u3l2', kk: 'Шарын шатқалы', ru: 'Чарынский каньон', en: 'Charyn Canyon', icon: '🏜️',
          words: [w('шатқал', '🏜️', 'каньон', 'canyon'), w('жартас', '⛰️', 'скала', 'cliff'), w('аңғар', '🏞️', 'долина', 'valley'), w('биік', '📏', 'высокий', 'high'), w('әдемі', '😍', 'красивый', 'beautiful')],
          sentences: [s('Шарын шатқалы Алматы облысында', 'Чарынский каньон — в Алматинской области', 'Charyn Canyon is in the Almaty Region'),
            s('Мұнда Қамалдар аңғары бар', 'Здесь есть Долина замков', 'The Valley of Castles is here'), s('Жартастар өте биік және әдемі', 'Скалы очень высокие и красивые', 'The cliffs are very high and beautiful')] },
        { id: 'g4u3l3', kk: 'Бурабай', ru: 'Бурабай', en: 'Burabay', icon: '🌲',
          words: [w('Бурабай', '🌲', 'Бурабай (Боровое)', 'Burabay'), w('тау', '⛰️', 'гора', 'mountain'), w('қарағай', '🌲', 'сосна', 'pine'), w('жаға', '🏖️', 'берег', 'shore'), w('демаламыз', '🏕️', 'отдыхаем', 'we rest')],
          sentences: [s('Бурабай Ақмола облысында орналасқан', 'Бурабай находится в Акмолинской области', 'Burabay is in the Akmola Region'),
            s('Көлдің жағасында Оқжетпес жартасы тұр', 'На берегу озера стоит скала Окжетпес', 'The Okzhetpes cliff stands on the lake shore'), s('Жазда біз Бурабайда демаламыз', 'Летом мы отдыхаем в Бурабае', 'In summer we holiday in Burabay')] },
        { id: 'g4u3l4', kk: 'Байқоңыр', ru: 'Байконур', en: 'Baikonur', icon: '🚀',
          words: [w('ғарыш', '🌌', 'космос', 'space'), w('зымыран', '🚀', 'ракета', 'rocket'), w('ғарышкер', '👨‍🚀', 'космонавт', 'cosmonaut'), w('айлақ', '🛰️', 'космодром, гавань', 'spaceport'), w('ұшты', '🛫', 'полетел', 'flew')],
          sentences: [s('Байқоңыр — ғарыш айлағы', 'Байконур — космодром', 'Baikonur is a spaceport'), s('Юрий Гагарин ғарышқа Байқоңырдан ұшты', 'Юрий Гагарин полетел в космос с Байконура', 'Yuri Gagarin flew into space from Baikonur'),
            s('Тоқтар Әубәкіров — тұңғыш қазақ ғарышкері', 'Токтар Аубакиров — первый казахский космонавт', 'Toktar Aubakirov is the first Kazakh cosmonaut')] },
        { id: 'g4u3l5', kk: 'Түркістан', ru: 'Туркестан', en: 'Turkistan', icon: '🕌',
          words: [w('кесене', '🕌', 'мавзолей', 'mausoleum'), w('көне', '🏺', 'древний', 'ancient'), w('тарих', '📜', 'история', 'history'), w('саяхатшы', '🧭', 'путешественник', 'traveller'), w('қала', '🏙️', 'город', 'city')],
          sentences: [s('Түркістанда Қожа Ахмет Ясауи кесенесі тұр', 'В Туркестане стоит мавзолей Ходжи Ахмеда Яссауи', 'The mausoleum of Khoja Ahmed Yasawi stands in Turkistan'),
            s('Түркістан — көне қала', 'Туркестан — древний город', 'Turkistan is an ancient city'), s('Саяхатшылар тарихи орындарды аралайды', 'Путешественники посещают исторические места', 'Travellers visit historic places')] },
        sor(3, 'Саяхат')
      ]
    },
    {
      id: 'g4u4', kk: 'Денсаулық және спорт', ru: 'Здоровье и спорт', en: 'Health and sport', hue: 'orange', hero: 'kulyn', module: 4,
      mascot: 'Денсаулық — зор байлық. — Здоровье — большое богатство.', mascotEn: 'Денсаулық — зор байлық. — Health is great wealth.',
      lessons: [
        { id: 'g4u4l1', kk: 'Дұрыс тамақтану', ru: 'Правильное питание', en: 'Eating well', icon: '🥗',
          words: [w('көкөніс', '🥦', 'овощи', 'vegetables'), w('жеміс', '🍎', 'фрукты', 'fruit'), w('тәтті', '🍬', 'сладости', 'sweets'), w('пайдалы', '💪', 'полезный', 'healthy'), w('зиянды', '🚫', 'вредный', 'harmful')],
          sentences: [s('Көкөніс пен жеміс — пайдалы тағам', 'Овощи и фрукты — полезная еда', 'Vegetables and fruit are healthy food'),
            s('Тәттіні көп жеуге болмайды', 'Много сладкого есть нельзя', 'You shouldn\'t eat too many sweets'), s('Мен күнде таңғы ас ішемін', 'Я каждый день завтракаю', 'I have breakfast every day')] },
        { id: 'g4u4l2', kk: 'Дәрігерде', ru: 'У врача', en: 'At the doctor\'s', icon: '🩺',
          words: [w('дәрігер', '🩺', 'врач', 'doctor'), w('ауырады', '🤕', 'болит', 'hurts'), w('бас', '🤯', 'голова', 'head'), w('тіс', '🦷', 'зуб', 'tooth'), w('дәрі', '💊', 'лекарство', 'medicine')],
          sentences: [s('Менің басым ауырады', 'У меня болит голова', 'I have a headache'), s('Дәрігер маған дәрі берді', 'Врач дал мне лекарство', 'The doctor gave me some medicine'),
            s('Тісіңді күніне екі рет тазала', 'Чисти зубы два раза в день', 'Brush your teeth twice a day')] },
        { id: 'g4u4l3', kk: 'Спорт түрлері', ru: 'Виды спорта', en: 'Sports', icon: '⚽',
          words: [w('футбол', '⚽', 'футбол', 'football'), w('жүзу', '🏊', 'плавание', 'swimming'), w('күрес', '🤼', 'борьба', 'wrestling'), w('жарыс', '🏁', 'соревнование', 'competition'), w('жаттықтырушы', '📣', 'тренер', 'coach')],
          sentences: [s('Мен бассейнде жүземін', 'Я плаваю в бассейне', 'I swim in the pool'), s('Біздің команда жарыста жеңді', 'Наша команда победила в соревновании', 'Our team won the competition'),
            s('Жаттықтырушы бізге көмектеседі', 'Тренер нам помогает', 'The coach helps us')] },
        { id: 'g4u4l4', kk: 'Таза болайық', ru: 'Будем чистыми', en: 'Keeping clean', icon: '🧼',
          words: [w('сабын', '🧼', 'мыло', 'soap'), w('орамал', '🛁', 'полотенце', 'towel'), w('жуынамын', '🚿', 'умываюсь', 'I wash'), w('тазалық', '✨', 'чистота', 'cleanliness'), w('тырнақ', '💅', 'ноготь', 'nail')],
          sentences: [s('Тамақ алдында қолыңды сабынмен жу', 'Перед едой мой руки с мылом', 'Wash your hands with soap before eating'),
            s('Тазалық — саулық негізі', 'Чистота — основа здоровья', 'Cleanliness is the basis of health'), s('Мен таңертең жуынамын', 'Я умываюсь утром', 'I wash in the morning')] },
        { id: 'g4u4l5', kk: 'Белсенді демалыс', ru: 'Активный отдых', en: 'Active rest', icon: '🚴',
          words: [w('велосипед', '🚴', 'велосипед', 'bicycle'), w('шаңғы', '🎿', 'лыжи', 'skis'), w('серуен', '🚶', 'прогулка', 'walk'), w('таза ауа', '🌬️', 'свежий воздух', 'fresh air'), w('ойын алаңы', '🛝', 'игровая площадка', 'playground')],
          sentences: [s('Демалыс күні біз велосипед тебеміз', 'В выходной мы катаемся на велосипеде', 'At the weekend we ride our bikes'),
            s('Қыста шаңғы тебуді жақсы көремін', 'Зимой я люблю кататься на лыжах', 'In winter I love skiing'), s('Таза ауада серуендеу пайдалы', 'Гулять на свежем воздухе полезно', 'Walking in the fresh air is healthy')] },
        sor(4, 'Денсаулық')
      ]
    },
    {
      id: 'g4u5', kk: 'Ғылым мен техника', ru: 'Наука и техника', en: 'Science and technology', hue: 'purple', hero: 'ayu', module: 5,
      mascot: 'Білекті бірді жығар, білімді мыңды жығар. — Сильный одолеет одного, знающий — тысячу.', mascotEn: 'Білекті бірді жығар, білімді мыңды жығар. — The strong beat one, the wise beat a thousand.',
      lessons: [
        { id: 'g4u5l1', kk: 'Планеталар', ru: 'Планеты', en: 'Planets', icon: '🪐',
          words: [w('Күн', '☀️', 'Солнце', 'the Sun'), w('Жер', '🌍', 'Земля', 'the Earth'), w('Ай', '🌙', 'Луна', 'the Moon'), w('планета', '🪐', 'планета', 'planet'), w('жұлдыз', '⭐', 'звезда', 'star')],
          sentences: [s('Жер Күнді айналады', 'Земля вращается вокруг Солнца', 'The Earth goes round the Sun'), s('Ай — Жердің серігі', 'Луна — спутник Земли', 'The Moon is the Earth\'s satellite'),
            s('Түнде аспанда жұлдыздар жарқырайды', 'Ночью в небе сияют звёзды', 'At night the stars shine in the sky')] },
        { id: 'g4u5l2', kk: 'Ғаламтор', ru: 'Интернет', en: 'The internet', icon: '💻',
          words: [w('компьютер', '💻', 'компьютер', 'computer'), w('ғаламтор', '🌐', 'интернет', 'internet'), w('құпиясөз', '🔑', 'пароль', 'password'), w('хабарлама', '💬', 'сообщение', 'message'), w('қауіпсіз', '🛡️', 'безопасный', 'safe')],
          sentences: [s('Құпиясөзіңді ешкімге айтпа', 'Никому не говори свой пароль', 'Don\'t tell anyone your password'),
            s('Бейтаныс адамға хабарлама жазба', 'Не пиши сообщения незнакомым', 'Don\'t write messages to strangers'), s('Ғаламторда қауіпсіз бол', 'Будь в безопасности в интернете', 'Stay safe on the internet')] },
        { id: 'g4u5l3', kk: 'Тәжірибе жасаймыз', ru: 'Ставим опыт', en: 'An experiment', icon: '🔬',
          words: [w('тәжірибе', '🔬', 'опыт, эксперимент', 'experiment'), w('ғалым', '👩‍🔬', 'учёный', 'scientist'), w('өлшедік', '📏', 'измерили', 'we measured'), w('нәтиже', '📊', 'результат', 'result'), w('температура', '🌡️', 'температура', 'temperature')],
          sentences: [s('Ғалымдар тәжірибе жасайды', 'Учёные ставят опыты', 'Scientists do experiments'), s('Біз судың температурасын өлшедік', 'Мы измерили температуру воды', 'We measured the temperature of the water'),
            s('Нәтижесін дәптерге жаздық', 'Результат записали в тетрадь', 'We wrote the result in our notebooks')] },
        { id: 'g4u5l4', kk: 'Өнертапқыштар', ru: 'Изобретатели', en: 'Inventors', icon: '💡',
          words: [w('өнертапқыш', '💡', 'изобретатель', 'inventor'), w('робот', '🤖', 'робот', 'robot'), w('ойлап тапты', '🧠', 'изобрёл', 'invented'), w('жаңа', '🆕', 'новый', 'new'), w('көмектеседі', '🤝', 'помогает', 'helps')],
          sentences: [s('Өнертапқыш жаңа робот ойлап тапты', 'Изобретатель придумал нового робота', 'The inventor invented a new robot'),
            s('Робот адамға көмектеседі', 'Робот помогает человеку', 'The robot helps people'), s('Мен де бірдеңе ойлап тапқым келеді', 'Я тоже хочу что-нибудь изобрести', 'I want to invent something too')] },
        { id: 'g4u5l5', kk: 'Кітапханада', ru: 'В библиотеке', en: 'At the library', icon: '📚',
          words: [w('кітапхана', '📚', 'библиотека', 'library'), w('кітапханашы', '👩‍💼', 'библиотекарь', 'librarian'), w('энциклопедия', '📘', 'энциклопедия', 'encyclopedia'), w('мәлімет', 'ℹ️', 'сведения, информация', 'information'), w('оқырман', '📖', 'читатель', 'reader')],
          sentences: [s('Кітапханашы маған энциклопедия берді', 'Библиотекарь дала мне энциклопедию', 'The librarian gave me an encyclopedia'),
            s('Мен ғарыш туралы мәлімет іздеймін', 'Я ищу сведения о космосе', 'I am looking for information about space'), s('Кітапты уақытында қайтару керек', 'Книгу нужно вернуть вовремя', 'Books must be returned on time')] },
        sor(5, 'Ғылым')
      ]
    },
    {
      id: 'g4u6', kk: 'Менің арманым', ru: 'Моя мечта', en: 'My dream', hue: 'gold', hero: 'qyran', module: 6,
      mascot: 'Армансыз адам — қанатсыз құс. — Человек без мечты — птица без крыльев.', mascotEn: 'Армансыз адам — қанатсыз құс. — A person without dreams is a bird without wings.',
      lessons: [
        { id: 'g4u6l1', kk: 'Мамандықтар', ru: 'Профессии', en: 'Jobs', icon: '👷',
          words: [w('ұшқыш', '✈️', 'лётчик', 'pilot'), w('құрылысшы', '👷', 'строитель', 'builder'), w('бағдарламашы', '👨‍💻', 'программист', 'programmer'), w('мұғалім', '👩‍🏫', 'учитель', 'teacher'), w('фермер', '👨‍🌾', 'фермер', 'farmer')],
          sentences: [s('Менің әкем — құрылысшы', 'Мой папа — строитель', 'My dad is a builder'), s('Бағдарламашы компьютерде жұмыс істейді', 'Программист работает на компьютере', 'A programmer works on a computer'),
            s('Мұғалім балаларды оқытады', 'Учитель учит детей', 'A teacher teaches children')] },
        { id: 'g4u6l2', kk: 'Кім боламын?', ru: 'Кем я стану?', en: 'Who will I be?', icon: '🌟',
          words: [w('арман', '🌟', 'мечта', 'dream'), w('болашақ', '🔮', 'будущее', 'future'), w('болғым келеді', '🙋', 'хочу стать', 'I want to be'), w('еңбек', '🛠️', 'труд', 'work'), w('мақсат', '🎯', 'цель', 'goal')],
          sentences: [s('Мен ұшқыш болғым келеді', 'Я хочу стать лётчиком', 'I want to be a pilot'), s('Арманыма жету үшін көп оқимын', 'Чтобы достичь мечты, я много учусь', 'I study hard to reach my dream'),
            s('Еңбек етсең, мақсатқа жетесің', 'Будешь трудиться — достигнешь цели', 'If you work hard, you will reach your goal')] },
        { id: 'g4u6l3', kk: 'Болашақ қала', ru: 'Город будущего', en: 'The city of the future', icon: '🏙️',
          words: [w('ақылды үй', '🏠', 'умный дом', 'smart home'), w('электр көлігі', '🔌', 'электромобиль', 'electric car'), w('күн батареясы', '🔆', 'солнечная батарея', 'solar panel'), w('жасыл', '🌿', 'зелёный', 'green'), w('ғимарат', '🏢', 'здание', 'building')],
          sentences: [s('Болашақ қалада ауа таза болады', 'В городе будущего воздух будет чистым', 'The air will be clean in the city of the future'),
            s('Үйлер күн батареясымен жұмыс істейді', 'Дома работают на солнечных батареях', 'The houses run on solar panels'), s('Көшеде электр көліктері жүреді', 'По улицам ездят электромобили', 'Electric cars drive along the streets')] },
        { id: 'g4u6l4', kk: 'Хат жазамын', ru: 'Пишу письмо', en: 'Writing a letter', icon: '✉️',
          words: [w('хат', '💌', 'письмо', 'letter'), w('конверт', '✉️', 'конверт', 'envelope'), w('мекенжай', '📍', 'адрес', 'address'), w('құрметті', '🎩', 'уважаемый, дорогой', 'dear'), w('сәлемдеме', '📦', 'посылка', 'parcel')],
          sentences: [s('Құрметті ата, сізге хат жазып отырмын', 'Дорогой дедушка, пишу вам письмо', 'Dear Grandpa, I am writing you a letter'),
            s('Конвертке мекенжайды жаздым', 'Я написал адрес на конверте', 'I wrote the address on the envelope'), s('Сәлеммен, немереңіз Әлібек', 'С приветом, ваш внук Алибек', 'Best wishes, your grandson Alibek')] },
        { id: 'g4u6l5', kk: 'Жазғы жоспар', ru: 'План на лето', en: 'My summer plan', icon: '📅',
          words: [w('жоспар', '📅', 'план', 'plan'), w('жазғы демалыс', '🏖️', 'летние каникулы', 'summer holidays'), w('үйренгім келеді', '🎓', 'хочу научиться', 'I want to learn'), w('қатысамын', '🙌', 'участвую', 'I take part'), w('олимпиада', '🥇', 'олимпиада', 'olympiad')],
          sentences: [s('Жазғы демалыста он кітап оқимын', 'На летних каникулах прочитаю десять книг', 'In the summer holidays I will read ten books'),
            s('Мен жүзуді үйренгім келеді', 'Я хочу научиться плавать', 'I want to learn to swim'), s('Мен олимпиадаға қатысамын', 'Я участвую в олимпиаде', 'I am taking part in the olympiad')] },
        sor(6, 'Арман')
      ]
    },
    {
      id: 'g4tzb', kk: 'Тоқсан қорытындысы', ru: 'Итог четверти', en: 'End of term', hue: 'blue', hero: 'bars',
      mascot: 'Оқу — білім бұлағы, білім — өмір шырағы. — Учёба — родник знаний, знание — светильник жизни.', mascotEn: 'Оқу — білім бұлағы, білім — өмір шырағы. — Study is a spring of knowledge, knowledge is the lamp of life.',
      lessons: [
        { id: 'g4tzb', kk: 'ТЖБ: 4-сынып', ru: 'СОЧ: 4 класс', en: 'End-of-term test', icon: '🏆', review: true, assess: true, boss: { seconds: 600, hearts: 5 } }
      ]
    }
  );
})();
