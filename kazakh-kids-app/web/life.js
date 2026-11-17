/* «Тірі тіл» — живая разговорная речь: приветствия, базар, дорога, гости, кафе.
 * Здесь переводы сразу на двух языках (ru + en) и грамматические подсказки tip для обоих режимов. */
(function () {
  'use strict';
  var D = window.QDATA;
  D.GRADES.push({ n: 4, kk: 'Тірі тіл', ru: 'Живая речь', en: 'Real life', units: [] });
  D.GRADES[3].units.push(
    {
      id: 'lfu1', kk: 'Қалайсыз?', ru: 'Как дела?', en: 'How are you?', hue: 'pink', hero: 'aisulu',
      mascot: 'Сәлем, достар! Қалайсыңдар? — Привет, друзья! Как вы?', mascotEn: 'Сәлем, достар! Қалайсыңдар? — Hi friends! How are you?',
      lessons: [
        {
          id: 'lfu1l1', kk: 'Хал сұрасу', ru: 'Как дела?', en: 'Small talk', icon: '💬',
          tip: {
            ru: 'Қалайсыз? — вежливо, на «вы». Қалайсың? — другу, на «ты». Окончание -сыз/-сіз значит «вы», -сың/-сің значит «ты». А «рақмет» и «рахмет» — одно слово: пишут рақмет, в разговоре часто слышно рахмет.',
            en: 'Kazakh has two words for “you”. The ending -сыз/-сіз is polite (elders, strangers): Қалайсыз? The ending -сың/-сің is for friends: Қалайсың? You will hear both рақмет and рахмет for “thank you” — same word.'
          },
          words: [
            { kk: 'қалайсыз?', ru: 'как вы? (вежливо)', en: 'how are you? (polite)', e: '🙂' },
            { kk: 'қалайсың?', ru: 'как ты? (другу)', en: 'how are you? (to a friend)', e: '😀' },
            { kk: 'жақсы', ru: 'хорошо', en: 'good, fine', e: '👍' },
            { kk: 'жаман емес', ru: 'неплохо', en: 'not bad', e: '👌' },
            { kk: 'бәрі жақсы', ru: 'всё хорошо', en: 'everything is fine', e: '✨' },
            { kk: 'рақмет', ru: 'спасибо (рақмет)', en: 'thank you (рақмет)', e: '💐' },
            { kk: 'кездескенше', ru: 'до встречи', en: 'see you', e: '🤙' }
          ],
          sentences: [
            { kk: 'Рақмет, бәрі жақсы!', ru: 'Спасибо, всё хорошо!', en: 'Thanks, everything is fine!' },
            { kk: 'Өзіңіз қалайсыз?', ru: 'А вы сами как?', en: 'And how are you?' },
            { kk: 'Жаман емес, рақмет', ru: 'Неплохо, спасибо', en: 'Not bad, thanks' },
            { kk: 'Кездескенше!', ru: 'До встречи!', en: 'See you!' }
          ],
          fills: [
            { pre: 'Рақмет, бәрі ', ans: 'жақсы', post: '!', opts: ['жақсы', 'қымбат', 'қызыл'], ru: 'Спасибо, всё хорошо!', en: 'Thanks, everything is fine!' },
            { pre: '— Қалайсыз? — Жаман ', ans: 'емес', post: '.', opts: ['емес', 'жоқ', 'ма'], ru: '— Как вы? — Неплохо.', en: '— How are you? — Not bad.' },
            { pre: 'Әже, қалай', ans: 'сыз', post: '?', opts: ['сыз', 'сың', 'мын'], ru: 'Бабушка, как вы?', en: 'Grandma, how are you?' }
          ]
        }
      ]
    },
    {
      id: 'lfu2', kk: 'Базарда', ru: 'На базаре', en: 'At the bazaar', hue: 'gold', hero: 'batyr',
      mascot: 'Пәлі, базарда саудаласу керек! — На базаре надо торговаться!', mascotEn: 'Пәлі, базарда саудаласу керек! — At the bazaar you must haggle!',
      lessons: [
        {
          id: 'lfu2l1', kk: 'Қанша тұрады?', ru: 'Сколько стоит?', en: 'How much is it?', icon: '🛒',
          tip: {
            ru: 'После числа слово остаётся в единственном числе: екі алма, бес қарбыз. Никаких «екі алмалар»!',
            en: 'After a number the noun stays singular: екі алма = “two apples”. Never екі алмалар — the plural ending is simply not needed.'
          },
          words: [
            { kk: 'базар', ru: 'рынок, базар', en: 'market, bazaar', e: '🛒' },
            { kk: 'қанша тұрады?', ru: 'сколько стоит?', en: 'how much is it?', e: '💰' },
            { kk: 'қымбат', ru: 'дорого', en: 'expensive', e: '💸' },
            { kk: 'арзан', ru: 'дёшево', en: 'cheap', e: '🏷️' },
            { kk: 'бір келі', ru: 'один килограмм', en: 'one kilo', e: '⚖️' },
            { kk: 'ақша', ru: 'деньги', en: 'money', e: '💵' },
            { kk: 'сатып аламын', ru: 'покупаю', en: 'I buy', e: '🛍️' },
            { kk: 'беріңізші', ru: 'дайте, пожалуйста', en: 'please give me', e: '🛎️' }
          ],
          sentences: [
            { kk: 'Алма қанша тұрады?', ru: 'Сколько стоят яблоки?', en: 'How much are the apples?' },
            { kk: 'Бір келі алма беріңізші', ru: 'Дайте, пожалуйста, килограмм яблок', en: 'One kilo of apples, please' },
            { kk: 'Бұл тым қымбат', ru: 'Это слишком дорого', en: 'This is too expensive' },
            { kk: 'Мен қарбыз сатып аламын', ru: 'Я покупаю арбуз', en: 'I am buying a watermelon' }
          ],
          fills: [
            { pre: 'Алма қанша ', ans: 'тұрады', post: '?', opts: ['тұрады', 'барады', 'ішеді'], ru: 'Сколько стоят яблоки?', en: 'How much are the apples?' },
            { pre: 'Маған екі ', ans: 'қарбыз', post: ' беріңізші.', opts: ['қарбыз', 'қарбыздар', 'қарбызда'], ru: 'Дайте мне, пожалуйста, два арбуза.', en: 'Two watermelons for me, please.' },
            { pre: 'Бұл арзан емес, ', ans: 'қымбат', post: '.', opts: ['қымбат', 'тәтті', 'жасыл'], ru: 'Это не дёшево, а дорого.', en: 'This is not cheap, it is expensive.' }
          ]
        },
        {
          id: 'lfu2l2', kk: 'Саудаласу', ru: 'Торгуемся', en: 'Haggling', icon: '🤝',
          tip: {
            ru: 'Вопрос делает частица после слова: ма/ме, ба/бе, па/пе. Она подстраивается под последний звук: тәтті ме? аударым ба? кітап па?',
            en: 'Yes/no questions add a particle after the word: ма/ме, ба/бе, па/пе. It changes with the last sound: тәтті ме? аударым ба? кітап па?'
          },
          words: [
            { kk: 'түсіріп беріңізші', ru: 'сделайте скидку', en: 'give me a discount, please', e: '📉' },
            { kk: 'келістік', ru: 'договорились', en: 'deal!', e: '🤝' },
            { kk: 'қолма-қол', ru: 'наличными', en: 'in cash', e: '💶' },
            { kk: 'аударым', ru: 'перевод (с карты)', en: 'bank transfer', e: '📲' },
            { kk: 'тәтті', ru: 'сладкий', en: 'sweet', e: '🍬' },
            { kk: 'жарайды', ru: 'ладно, хорошо', en: 'okay, all right', e: '🆗' },
            { kk: 'төлеймін', ru: 'плачу', en: 'I pay', e: '💳' }
          ],
          sentences: [
            { kk: 'Түсіріп беріңізші!', ru: 'Сделайте скидку, пожалуйста!', en: 'Please give me a discount!' },
            { kk: 'Жарайды, келістік!', ru: 'Ладно, договорились!', en: 'Okay, deal!' },
            { kk: 'Қолма-қол ма, аударым ба?', ru: 'Наличными или переводом?', en: 'Cash or transfer?' },
            { kk: 'Аударыммен төлеймін', ru: 'Оплачу переводом', en: "I'll pay by transfer" },
            { kk: 'Тәтті ме өзі?', ru: 'А оно сладкое?', en: 'Is it actually sweet?' }
          ],
          fills: [
            { pre: 'Қолма-қол ма, аударым ', ans: 'ба', post: '?', opts: ['ба', 'ма', 'па'], ru: 'Наличными или переводом?', en: 'Cash or transfer?' },
            { pre: 'Тәтті ', ans: 'ме', post: ' өзі?', opts: ['ме', 'ма', 'бе'], ru: 'А оно сладкое?', en: 'Is it actually sweet?' },
            { pre: 'Жарайды, ', ans: 'келістік', post: '!', opts: ['келістік', 'кездескенше', 'қымбат'], ru: 'Ладно, договорились!', en: 'Okay, deal!' }
          ]
        }
      ]
    },
    {
      id: 'lfu3', kk: 'Жолда', ru: 'В дороге', en: 'On the road', hue: 'teal', hero: 'tayson',
      mascot: 'Кеттік! Оңға ма, солға ма? — Погнали! Направо или налево?', mascotEn: 'Кеттік! Оңға ма, солға ма? — Let’s go! Right or left?',
      lessons: [
        {
          id: 'lfu3l1', kk: 'Оңға, солға, тура', ru: 'Направо, налево, прямо', en: 'Right, left, straight', icon: '🧭',
          tip: {
            ru: 'Куда? — окончание -ға/-ге, -қа/-ке: оңға (направо), солға (налево), мектепке (в школу), үйге (домой).',
            en: 'Direction “to” is an ending, not a separate word: оң + ға = to the right, сол + ға = to the left, мектеп + ке = to school.'
          },
          words: [
            { kk: 'оңға', ru: 'направо', en: 'to the right', e: '➡️' },
            { kk: 'солға', ru: 'налево', en: 'to the left', e: '⬅️' },
            { kk: 'тура', ru: 'прямо', en: 'straight', e: '⏫' },
            { kk: 'бұрыл', ru: 'поверни', en: 'turn', e: '↪️' },
            { kk: 'жүр', ru: 'иди, езжай', en: 'go', e: '🏃' },
            { kk: 'тоқта', ru: 'стой', en: 'stop', e: '🛑' },
            { kk: 'жеттік', ru: 'доехали', en: "we've arrived", e: '🏁' },
            { kk: 'осы жерде', ru: 'здесь, на этом месте', en: 'right here', e: '📍' }
          ],
          sentences: [
            { kk: 'Оңға бұрыл!', ru: 'Поверни направо!', en: 'Turn right!' },
            { kk: 'Солға бұрыл!', ru: 'Поверни налево!', en: 'Turn left!' },
            { kk: 'Тура жүр!', ru: 'Езжай прямо!', en: 'Go straight!' },
            { kk: 'Тоқта, бағдаршам қызыл!', ru: 'Стой, светофор красный!', en: 'Stop, the light is red!' },
            { kk: 'Жеттік, осы жерде қалдырыңыз', ru: 'Доехали, оставьте здесь', en: "We've arrived, leave it here" }
          ],
          fills: [
            { pre: 'Оң', ans: 'ға', post: ' бұрыл!', opts: ['ға', 'ге', 'қа', 'ке'], ru: 'Поверни направо!', en: 'Turn right!' },
            { pre: 'Тоқта, бағдаршам ', ans: 'қызыл', post: '!', opts: ['қызыл', 'жасыл', 'тәтті'], ru: 'Стой, светофор красный!', en: 'Stop, the light is red!' },
            { pre: 'Тура ', ans: 'жүр', post: '!', opts: ['жүр', 'іш', 'оқы'], ru: 'Езжай прямо!', en: 'Go straight!' }
          ]
        },
        {
          id: 'lfu3l2', kk: 'Автобуста', ru: 'В автобусе', en: 'On the bus', icon: '🚏',
          tip: {
            ru: 'Откуда? — окончание -дан/-ден, -тан/-тен, -нан/-нен: аялдамадан (с остановки), мектептен (из школы), үйден (из дома).',
            en: 'Kazakh word order is Subject–Object–Verb: the verb always comes last. Сіз (you) + келесі аялдамадан (at the next stop) + түсесіз бе? (get off?).'
          },
          words: [
            { kk: 'аялдама', ru: 'остановка', en: 'bus stop', e: '🚏' },
            { kk: 'келесі', ru: 'следующий', en: 'next', e: '🔜' },
            { kk: 'түсемін', ru: 'выхожу', en: 'I get off', e: '🚶‍♀️' },
            { kk: 'билет', ru: 'билет', en: 'ticket', e: '🎫' },
            { kk: 'жолақы', ru: 'плата за проезд', en: 'fare', e: '💲' },
            { kk: 'өтейін', ru: 'разрешите пройти', en: 'let me through', e: '🙇‍♂️' }
          ],
          sentences: [
            { kk: 'Сіз келесі аялдамадан түсесіз бе?', ru: 'Вы выходите на следующей остановке?', en: 'Are you getting off at the next stop?' },
            { kk: 'Иә, түсемін', ru: 'Да, выхожу', en: "Yes, I'm getting off" },
            { kk: 'Аялдама қайда?', ru: 'Где остановка?', en: 'Where is the bus stop?' },
            { kk: 'Жолақы қанша?', ru: 'Сколько стоит проезд?', en: 'How much is the fare?' }
          ],
          fills: [
            { pre: 'Сіз келесі аялдама', ans: 'дан', post: ' түсесіз бе?', opts: ['дан', 'ден', 'тан', 'тен'], ru: 'Вы выходите на следующей остановке?', en: 'Are you getting off at the next stop?' },
            { pre: 'Иә, мен ', ans: 'түсемін', post: '.', opts: ['түсемін', 'түсесіз', 'түседі'], ru: 'Да, я выхожу.', en: "Yes, I'm getting off." }
          ]
        }
      ]
    },
    {
      id: 'lfu4', kk: 'Қонақта', ru: 'В гостях', en: 'Hospitality', hue: 'red', hero: 'azhe',
      mascot: 'Бәсе! Қонақ келсе — құт келеді. — Гость в дом — счастье в дом.', mascotEn: 'Бәсе! Қонақ келсе — құт келеді. — A guest brings good fortune.',
      lessons: [
        {
          id: 'lfu4l1', kk: 'Қош келдіңіз!', ru: 'Добро пожаловать!', en: 'Welcome!', icon: '🫖',
          tip: {
            ru: 'Вежливая просьба: основа глагола + -ңыз/-ңіз или -ыңыз/-іңіз. Іш → ішіңіз (пейте), кел → келіңіз (приходите), отыр → отырыңыз (садитесь).',
            en: 'Polite requests add -ңыз/-ңіз or -ыңыз/-іңіз to the verb: іш → ішіңіз (please drink), кел → келіңіз (please come). Elders and honoured guests sit at the төр — the place of honour opposite the door.'
          },
          words: [
            { kk: 'қонақ', ru: 'гость', en: 'guest', e: '🤗' },
            { kk: 'қош келдіңіз', ru: 'добро пожаловать', en: 'welcome', e: '🎊' },
            { kk: 'төр', ru: 'почётное место', en: 'seat of honour', e: '🏵️' },
            { kk: 'төрлетіңіз', ru: 'проходите на почётное место', en: 'please take the seat of honour', e: '👑' },
            { kk: 'дастархан', ru: 'дастархан (накрытый стол)', en: 'dastarkhan (festive table)', e: '🥘' },
            { kk: 'ас болсын', ru: 'приятного аппетита', en: 'enjoy your meal', e: '💛' },
            { kk: 'бата', ru: 'благословение', en: 'blessing', e: '🤲' }
          ],
          sentences: [
            { kk: 'Қош келдіңіз!', ru: 'Добро пожаловать!', en: 'Welcome!' },
            { kk: 'Төрлетіңіз!', ru: 'Проходите на почётное место!', en: 'Please, take the seat of honour!' },
            { kk: 'Шай ішіңіз, ыстықтай!', ru: 'Пейте чай, пока горячий!', en: "Have some tea while it's hot!" },
            { kk: 'Дәмнен ауыз тиіңіз', ru: 'Отведайте угощение', en: 'Please taste the food' },
            { kk: 'Ас болсын!', ru: 'Приятного аппетита!', en: 'Enjoy your meal!' }
          ],
          fills: [
            { pre: 'Шай ', ans: 'ішіңіз', post: ', ыстықтай!', opts: ['ішіңіз', 'киіңіз', 'жазыңыз'], ru: 'Пейте чай, пока горячий!', en: "Have some tea while it's hot!" },
            { pre: 'Қош ', ans: 'келдіңіз', post: '!', opts: ['келдіңіз', 'кеттіңіз', 'ұйықтадыңыз'], ru: 'Добро пожаловать!', en: 'Welcome!' },
            { pre: 'Ас ', ans: 'болсын', post: '!', opts: ['болсын', 'келсін', 'барсын'], ru: 'Приятного аппетита!', en: 'Enjoy your meal!' }
          ]
        },
        {
          id: 'lfu4l2', kk: 'Дастархан басында', ru: 'За столом', en: 'At the table', icon: '🍵',
          words: [
            { kk: 'тойдым', ru: 'я наелся', en: "I'm full", e: '😌' },
            { kk: 'тағы', ru: 'ещё', en: 'more', e: '➕' },
            { kk: 'құяйын', ru: 'налью', en: 'let me pour', e: '🫖' },
            { kk: 'ыстық шай', ru: 'горячий чай', en: 'hot tea', e: '☕' },
            { kk: 'кесе', ru: 'пиала', en: 'tea bowl', e: '🥣' },
            { kk: 'өте дәмді', ru: 'очень вкусно', en: 'really delicious', e: '🤤' }
          ],
          sentences: [
            { kk: 'Тағы шай құяйын ба?', ru: 'Налить ещё чаю?', en: 'Shall I pour more tea?' },
            { kk: 'Рақмет, тойдым', ru: 'Спасибо, я наелся', en: "Thank you, I'm full" },
            { kk: 'Өте дәмді екен!', ru: 'Очень вкусно!', en: "It's really delicious!" },
            { kk: 'Бата беріңіз', ru: 'Дайте благословение', en: 'Please give your blessing' }
          ],
          fills: [
            { pre: 'Тағы шай құяйын ', ans: 'ба', post: '?', opts: ['ба', 'ма', 'па'], ru: 'Налить ещё чаю?', en: 'Shall I pour more tea?' },
            { pre: 'Рақмет, ', ans: 'тойдым', post: '.', opts: ['тойдым', 'ұйықтадым', 'жүгірдім'], ru: 'Спасибо, я наелся.', en: "Thank you, I'm full." }
          ]
        }
      ]
    },
    {
      id: 'lfu5', kk: 'Кафеде', ru: 'В кафе', en: 'At the café', hue: 'purple', hero: 'aisulu',
      mascot: 'Керемет! Бүгін кафеге барамыз. — Супер! Сегодня идём в кафе.', mascotEn: 'Керемет! Бүгін кафеге барамыз. — Awesome! Today we go to a café.',
      lessons: [
        {
          id: 'lfu5l1', kk: 'Тапсырыс', ru: 'Заказ', en: 'Ordering', icon: '🧾',
          tip: {
            ru: 'В разговоре часто говорят «шәй», а пишут «шай». И помни: екі бауырсақ — после числа множественное число не ставится.',
            en: 'Kazakh is agglutinative: endings stack onto the word (бауырсақ + тар = baursaks). But after a number you drop the plural: екі бауырсақ, not екі бауырсақтар. This is the classic trap for English speakers!'
          },
          words: [
            { kk: 'мәзір', ru: 'меню', en: 'menu', e: '📖' },
            { kk: 'шот', ru: 'счёт', en: 'bill, check', e: '🧾' },
            { kk: 'даяшы', ru: 'официант', en: 'waiter', e: '🤵' },
            { kk: 'тапсырыс', ru: 'заказ', en: 'order', e: '📝' },
            { kk: 'әкеліңізші', ru: 'принесите, пожалуйста', en: 'please bring', e: '🙋‍♀️' },
            { kk: 'бөліп төлейміз', ru: 'платим раздельно', en: 'we split the bill', e: '➗' }
          ],
          sentences: [
            { kk: 'Мәзір беріңізші', ru: 'Дайте, пожалуйста, меню', en: 'The menu, please' },
            { kk: 'Маған екі бауырсақ пен бір шай беріңізші', ru: 'Мне, пожалуйста, два баурсака и один чай', en: 'Two baursaks and one tea for me, please' },
            { kk: 'Шотты әкеліңізші', ru: 'Принесите, пожалуйста, счёт', en: 'Could I have the check, please?' },
            { kk: 'Шотты бөліп төлейміз бе?', ru: 'Разделим счёт?', en: 'Shall we split the bill?' }
          ],
          fills: [
            { pre: 'Маған екі ', ans: 'бауырсақ', post: ' пен бір шай беріңізші.', opts: ['бауырсақ', 'бауырсақтар', 'бауырсақта'], ru: 'Мне, пожалуйста, два баурсака и один чай.', en: 'Two baursaks and one tea for me, please.' },
            { pre: 'Шот', ans: 'ты', post: ' әкеліңізші.', opts: ['ты', 'ды', 'ні', 'қа'], ru: 'Принесите, пожалуйста, счёт.', en: 'Could I have the check, please?' },
            { pre: 'Шотты бөліп төлейміз ', ans: 'бе', post: '?', opts: ['бе', 'ба', 'пе'], ru: 'Разделим счёт?', en: 'Shall we split the bill?' }
          ]
        },
        { id: 'lfrev', kk: 'Тірі тіл: қайталау', ru: 'Живая речь: повторение', en: 'Real life: review', icon: '🏆', review: true }
      ]
    }
  );
})();
