/* «Оқу бұрышы» — reading corner: ten folk tales and fables retold in our own simple words for grades 2–3
 * (plots are folklore / Aesop, the text is written for this game). Every line is voiced; three questions per tale.
 * Line: [kk, ru, en]. Question: [question kk, ru, en, right answer, wrong, wrong]. */
(function () {
  'use strict';
  function tale(id, e, kk, ru, en, lines, qs) {
    return { id: id, e: e, kk: kk, ru: ru, en: en,
      lines: lines.map(function (l) { return { kk: l[0], ru: l[1], en: l[2] }; }),
      qs: qs.map(function (q) { return { kk: q[0], ru: q[1], en: q[2], a: q[3], w: [q[4], q[5]] }; }) };
  }
  window.QREAD = [
    tale('crane', '🦊', 'Түлкі мен тырна', 'Лиса и журавль', 'The Fox and the Crane', [
      ['Түлкі мен тырна дос болды.', 'Лиса и журавль подружились.', 'The fox and the crane became friends.'],
      ['Бір күні түлкі тырнаны қонаққа шақырды.', 'Однажды лиса пригласила журавля в гости.', 'One day the fox invited the crane to visit.'],
      ['Ол ботқаны тәрелкеге салып берді.', 'Она подала кашу на тарелке.', 'She served the porridge on a plate.'],
      ['Тырна тұмсығымен ботқаны жей алмады.', 'Журавль не смог есть кашу клювом.', 'The crane could not eat the porridge with its beak.'],
      ['Келесі күні тырна түлкіні қонаққа шақырды.', 'На другой день журавль пригласил лису в гости.', 'The next day the crane invited the fox.'],
      ['Ол тамақты тар құмыраға салып берді.', 'Он подал еду в узком кувшине.', 'He served the food in a narrow jug.'],
      ['Түлкі құмырадан тамақ жей алмады.', 'Лиса не смогла есть из кувшина.', 'The fox could not eat from the jug.'],
      ['Қонақты сыйлау керек.', 'Гостя нужно уважать.', 'A guest should be treated with respect.']
    ], [
      ['Түлкі ботқаны неге салып берді?', 'Во что лиса положила кашу?', 'What did the fox serve the porridge in?', 'тәрелкеге', 'құмыраға', 'кесеге'],
      ['Тырна тамақты неге салды?', 'Во что журавль положил еду?', 'What did the crane serve the food in?', 'тар құмыраға', 'тәрелкеге', 'қазанға'],
      ['Ертегі не үйретеді?', 'Чему учит сказка?', 'What does the tale teach?', 'Қонақты сыйлау керек.', 'Тамақты көп жеу керек.', 'Түлкі ақылды.']
    ]),
    tale('mouse', '🐭', 'Тышқан мен түйе', 'Мышь и верблюд', 'The Mouse and the Camel', [
      ['Ертеде он екі жануар жылдың атын алғысы келді.', 'Давным-давно двенадцать животных хотели, чтобы год назвали их именем.', 'Long ago twelve animals each wanted a year named after them.'],
      ['Олар: «Күнді бірінші көрген жеңеді», — деп келісті.', 'Они договорились: «Кто первым увидит солнце, тот и победит».', 'They agreed: «Whoever sees the sun first wins».'],
      ['Түйе өзінің биік бойына сенді.', 'Верблюд надеялся на свой высокий рост.', 'The camel trusted its great height.'],
      ['Кішкентай тышқан түйенің өркешіне шығып алды.', 'Маленькая мышка забралась на горб верблюда.', 'The little mouse climbed onto the camel\'s hump.'],
      ['Таң атқанда тышқан күнді бірінші көрді.', 'На рассвете мышка первой увидела солнце.', 'At dawn the mouse saw the sun first.'],
      ['Сондықтан жыл санау тышқаннан басталады.', 'Поэтому счёт лет начинается с мыши.', 'That is why the year count starts with the mouse.'],
      ['Ал түйе ешбір жылдың аты болмай қалды.', 'А верблюд так и не стал именем ни одного года.', 'And the camel never got a year of its own.']
    ], [
      ['Түйе неге сенді?', 'На что надеялся верблюд?', 'What did the camel trust?', 'биік бойына', 'күшіне', 'жылдамдығына'],
      ['Күнді бірінші кім көрді?', 'Кто первым увидел солнце?', 'Who saw the sun first?', 'тышқан', 'түйе', 'сиыр'],
      ['Жыл санау кімнен басталады?', 'С кого начинается счёт лет?', 'Who starts the year count?', 'тышқаннан', 'түйеден', 'жылқыдан']
    ]),
    tale('tortoise', '🐢', 'Тасбақа мен қоян', 'Черепаха и заяц', 'The Tortoise and the Hare', [
      ['Қоян тасбақаның баяу жүрісіне күлді.', 'Заяц смеялся над тем, как медленно ходит черепаха.', 'The hare laughed at how slowly the tortoise walked.'],
      ['Тасбақа: «Кел, жарысайық!» — деді.', 'Черепаха сказала: «Давай наперегонки!»', 'The tortoise said: «Let\'s have a race!»'],
      ['Қоян алға жүгіріп кетті.', 'Заяц убежал вперёд.', 'The hare ran far ahead.'],
      ['Жолдың ортасында ол ағаштың көлеңкесінде ұйықтап қалды.', 'На середине пути он уснул в тени дерева.', 'Halfway there he fell asleep in the shade of a tree.'],
      ['Тасбақа тоқтамай, баяу жүре берді.', 'Черепаха шла медленно, но не останавливалась.', 'The tortoise kept walking slowly without stopping.'],
      ['Қоян оянғанда тасбақа мәреге жетіп қойған еді.', 'Когда заяц проснулся, черепаха уже была у финиша.', 'When the hare woke up, the tortoise had already reached the finish.'],
      ['Баяу болса да, тоқтамай жүрген жетеді.', 'Кто идёт без остановки, тот дойдёт, пусть и медленно.', 'Slow but steady gets there.']
    ], [
      ['Қоян неге жеңілді?', 'Почему заяц проиграл?', 'Why did the hare lose?', 'ұйықтап қалды', 'адасып кетті', 'ауырып қалды'],
      ['Тасбақа қалай жүрді?', 'Как шла черепаха?', 'How did the tortoise walk?', 'баяу, бірақ тоқтамай', 'өте жылдам', 'секіріп'],
      ['Мәреге кім бірінші жетті?', 'Кто первым пришёл к финишу?', 'Who reached the finish first?', 'тасбақа', 'қоян', 'түлкі']
    ]),
    tale('ant', '🐜', 'Құмырсқа мен көгершін', 'Муравей и голубь', 'The Ant and the Dove', [
      ['Құмырсқа су ішуге өзенге барды.', 'Муравей пошёл к реке попить воды.', 'An ant went to the river to drink.'],
      ['Толқын оны суға ағызып әкетті.', 'Волна унесла его в воду.', 'A wave carried him into the water.'],
      ['Көгершін мұны көріп, суға бір жапырақ тастады.', 'Голубь увидел это и бросил в воду листок.', 'A dove saw this and dropped a leaf into the water.'],
      ['Құмырсқа жапыраққа шығып, жағаға жетті.', 'Муравей забрался на листок и добрался до берега.', 'The ant climbed onto the leaf and reached the bank.'],
      ['Бір күні аңшы көгершінді атпақ болды.', 'Однажды охотник хотел выстрелить в голубя.', 'One day a hunter was about to shoot the dove.'],
      ['Құмырсқа аңшының аяғын қатты шақты.', 'Муравей больно укусил охотника за ногу.', 'The ant bit the hunter hard on the foot.'],
      ['Аңшы селт етті, ал көгершін ұшып кетті.', 'Охотник вздрогнул, а голубь улетел.', 'The hunter flinched and the dove flew away.'],
      ['Жақсылыққа — жақсылық.', 'Добро за добро.', 'One good turn deserves another.']
    ], [
      ['Көгершін суға не тастады?', 'Что голубь бросил в воду?', 'What did the dove drop into the water?', 'жапырақ', 'тас', 'нан'],
      ['Құмырсқа аңшыға не істеді?', 'Что муравей сделал охотнику?', 'What did the ant do to the hunter?', 'аяғын шақты', 'қашып кетті', 'ән айтты'],
      ['Ертегінің негізгі ойы қандай?', 'Какая главная мысль сказки?', 'What is the main idea?', 'Жақсылыққа — жақсылық.', 'Суға жақындама.', 'Аңшы мықты.']
    ]),
    tale('turnip', '🌱', 'Шалқан', 'Репка', 'The Turnip', [
      ['Атам бақшаға шалқан екті.', 'Дедушка посадил в огороде репку.', 'Grandpa planted a turnip in the garden.'],
      ['Шалқан өте үлкен болып өсті.', 'Репка выросла очень большая.', 'The turnip grew very big.'],
      ['Атам тартты, тартты — суыра алмады.', 'Дедушка тянул-тянул — вытянуть не смог.', 'Grandpa pulled and pulled but could not pull it out.'],
      ['Атам әжемді шақырды, әжем немересін шақырды.', 'Дедушка позвал бабушку, бабушка позвала внучку.', 'Grandpa called Grandma, Grandma called their granddaughter.'],
      ['Немересі итті, ит мысықты, мысық тышқанды шақырды.', 'Внучка позвала собаку, собака — кошку, кошка — мышку.', 'She called the dog, the dog called the cat, the cat called the mouse.'],
      ['Бәрі бірге тартып, шалқанды суырып алды!', 'Все вместе потянули и вытянули репку!', 'They all pulled together and out came the turnip!'],
      ['Бірлік бар жерде тірлік бар.', 'Где единство, там и жизнь.', 'Where there is unity, there is life.']
    ], [
      ['Шалқанды кім екті?', 'Кто посадил репку?', 'Who planted the turnip?', 'атам', 'әжем', 'мысық'],
      ['Ең соңында кім көмекке келді?', 'Кто пришёл на помощь последним?', 'Who came to help last?', 'тышқан', 'ит', 'мысық'],
      ['Шалқанды қалай суырды?', 'Как вытянули репку?', 'How did they pull out the turnip?', 'бәрі бірге', 'атам жалғыз', 'ит жалғыз']
    ]),
    tale('goat', '🐐', 'Түлкі мен ешкі', 'Лиса и козёл', 'The Fox and the Goat', [
      ['Түлкі құдыққа құлап кетті.', 'Лиса упала в колодец.', 'A fox fell into a well.'],
      ['Шөлдеген ешкі құдыққа келді.', 'Козёл, которому хотелось пить, подошёл к колодцу.', 'A thirsty goat came to the well.'],
      ['Түлкі: «Мұндағы су өте тәтті, түс!» — деді.', 'Лиса сказала: «Здесь вода очень сладкая, спускайся!»', 'The fox said: «The water here is very sweet, come down!»'],
      ['Ешкі ойланбастан құдыққа секірді.', 'Козёл, не раздумывая, прыгнул в колодец.', 'Without thinking, the goat jumped into the well.'],
      ['Түлкі ешкінің мүйізіне шығып, құдықтан секіріп шықты.', 'Лиса забралась козлу на рога и выпрыгнула из колодца.', 'The fox climbed onto the goat\'s horns and jumped out.'],
      ['Ешкі құдықта жалғыз қалды.', 'Козёл остался в колодце один.', 'The goat was left alone in the well.'],
      ['Алдымен ойлан, содан кейін істе.', 'Сначала подумай, потом делай.', 'Think first, then act.']
    ], [
      ['Түлкі қайда құлады?', 'Куда упала лиса?', 'Where did the fox fall?', 'құдыққа', 'өзенге', 'көлге'],
      ['Түлкі құдықтан қалай шықты?', 'Как лиса выбралась из колодца?', 'How did the fox get out?', 'ешкінің мүйізіне шығып', 'баспалдақпен', 'ұшып'],
      ['Ертегі не үйретеді?', 'Чему учит сказка?', 'What does the tale teach?', 'Алдымен ойлан, содан кейін істе.', 'Суды көп іш.', 'Түлкімен дос бол.']
    ]),
    tale('swallow', '🐦', 'Қарлығаш пен жылан', 'Ласточка и змея', 'The Swallow and the Snake', [
      ['Ертеде жылан масаға: «Кімнің қаны ең тәтті, біліп кел», — деді.', 'Давным-давно змея сказала комару: «Узнай, чья кровь самая сладкая».', 'Long ago the snake told the mosquito: «Find out whose blood is the sweetest».'],
      ['Маса: «Адамның қаны ең тәтті», — деп ұшып келе жатты.', 'Комар летел обратно и повторял: «Самая сладкая кровь у человека».', 'The mosquito flew back saying: «A person\'s blood is the sweetest».'],
      ['Мұны естіген қарлығаш адамды қорғағысы келді.', 'Ласточка услышала это и захотела защитить человека.', 'The swallow heard it and wanted to protect people.'],
      ['Ол масаның тілін шоқып алды.', 'Она клюнула комара и оторвала ему язык.', 'She pecked off the mosquito\'s tongue.'],
      ['Содан бері маса тек «ызың-ызың» дейді.', 'С тех пор комар только пищит «зың-зың».', 'Since then the mosquito can only buzz.'],
      ['Ашулы жылан қарлығашты қуып, құйрығын тістеп алды.', 'Сердитая змея погналась за ласточкой и откусила ей кусочек хвоста.', 'The angry snake chased the swallow and bit her tail.'],
      ['Сондықтан қарлығаштың құйрығы айыр.', 'Поэтому у ласточки хвост раздвоенный.', 'That is why the swallow has a forked tail.'],
      ['Қазақтар қарлығашты жақсы көреді.', 'Казахи любят ласточку.', 'Kazakhs love the swallow.']
    ], [
      ['Жылан масаны не үшін жіберді?', 'Зачем змея послала комара?', 'Why did the snake send the mosquito?', 'ең тәтті қанды білу үшін', 'тамақ әкелу үшін', 'ән айту үшін'],
      ['Қарлығаш масаға не істеді?', 'Что ласточка сделала комару?', 'What did the swallow do to the mosquito?', 'тілін шоқып алды', 'ұшып кетті', 'ұйықтап қалды'],
      ['Қарлығаштың құйрығы қандай?', 'Какой хвост у ласточки?', 'What is the swallow\'s tail like?', 'айыр', 'ұзын', 'қысқа']
    ]),
    tale('hare', '🐇', 'Мақтаншақ қоян', 'Хвастливый заяц', 'The Boastful Hare', [
      ['Бір қоян барлық қояндарға мақтанды: «Мен қасқырдан қорықпаймын!»', 'Один заяц хвастался всем зайцам: «Я не боюсь волка!»', 'A hare boasted to all the hares: «I am not afraid of the wolf!»'],
      ['Осы кезде бұтаның артынан қасқыр шықты.', 'В этот момент из-за куста вышел волк.', 'Just then a wolf came out from behind a bush.'],
      ['Қоян қатты қорқып, жоғары секірді.', 'Заяц очень испугался и подпрыгнул вверх.', 'The hare got a terrible fright and jumped up high.'],
      ['Ол тура қасқырдың үстіне құлады.', 'Он упал прямо на волка.', 'He landed right on top of the wolf.'],
      ['Қасқыр да қорқып, орманға қашып кетті.', 'Волк тоже испугался и убежал в лес.', 'The wolf got scared too and ran off into the forest.'],
      ['Қояндар: «Біздің досымыз қандай батыр!» — деді.', 'Зайцы сказали: «Какой наш друг храбрец!»', 'The hares said: «What a hero our friend is!»'],
      ['Ал қоян өзі ештеңе түсінбей қалды.', 'А сам заяц так ничего и не понял.', 'And the hare himself understood nothing.']
    ], [
      ['Қоян немен мақтанды?', 'Чем хвастался заяц?', 'What did the hare boast about?', 'қасқырдан қорықпаймын', 'тез жүгіремін', 'көп жеймін'],
      ['Қасқыр қайда қашты?', 'Куда убежал волк?', 'Where did the wolf run?', 'орманға', 'өзенге', 'ауылға'],
      ['Қоян шынымен батыр ма?', 'Заяц правда храбрый?', 'Is the hare really brave?', 'жоқ, бәрі кездейсоқ болды', 'иә, өте батыр', 'ол қасқырды қуды']
    ]),
    tale('kids', '🐐', 'Ешкі мен лақтар', 'Коза и козлята', 'The Goat and Her Kids', [
      ['Ешкі лақтарына: «Есікті ешкімге ашпаңдар», — деді.', 'Коза сказала козлятам: «Никому не открывайте дверь».', 'The goat told her kids: «Don\'t open the door to anyone».'],
      ['Ешкі жайылымға кетті.', 'Коза ушла на пастбище.', 'The goat went off to the pasture.'],
      ['Қасқыр келіп, жуан дауыспен: «Ашыңдар, мен шешелеріңмін!» — деді.', 'Пришёл волк и грубым голосом сказал: «Откройте, я ваша мама!»', 'The wolf came and said in a rough voice: «Open up, I am your mother!»'],
      ['Лақтар: «Біздің шешеміздің дауысы жұмсақ», — деп есікті ашпады.', 'Козлята ответили: «У нашей мамы голос мягкий» — и не открыли.', 'The kids said: «Our mother\'s voice is soft» — and did not open.'],
      ['Қасқыр ашуланып, кетіп қалды.', 'Волк рассердился и ушёл.', 'The wolf got angry and went away.'],
      ['Шешесі келгенде лақтар есікті ашты.', 'Когда пришла мама, козлята открыли дверь.', 'When their mother came, the kids opened the door.'],
      ['Ешкі ақылды лақтарын мақтады.', 'Коза похвалила умных козлят.', 'The goat praised her clever kids.']
    ], [
      ['Ешкі лақтарына не деді?', 'Что коза сказала козлятам?', 'What did the goat tell her kids?', 'есікті ашпаңдар', 'ұйықтаңдар', 'ойнаңдар'],
      ['Лақтар қасқырды қалай таныды?', 'Как козлята узнали волка?', 'How did the kids recognise the wolf?', 'дауысынан', 'құйрығынан', 'көзінен'],
      ['Лақтар есікті кімге ашты?', 'Кому козлята открыли дверь?', 'Whom did the kids open the door to?', 'шешесіне', 'қасқырға', 'түлкіге']
    ]),
    tale('aldar', '🧥', 'Алдар Көсенің тоны', 'Шуба Алдара Косе', 'Aldar Kose\'s Coat', [
      ['Қыс күні Алдар Көсе жұқа тонмен жолға шықты.', 'Зимой Алдар Косе отправился в путь в тонкой шубе.', 'One winter day Aldar Kose set off in a thin coat.'],
      ['Жолда оған қалың ішік киген бай кездесті.', 'В пути ему встретился бай в толстой шубе.', 'On the road he met a rich man in a thick fur coat.'],
      ['Бай тоңып, дірілдеп келе жатты.', 'Бай замёрз и дрожал.', 'The rich man was freezing and shivering.'],
      ['Ал Алдар Көсе ән салып, күліп келе жатты.', 'А Алдар Косе ехал, напевая и смеясь.', 'But Aldar Kose was singing and laughing.'],
      ['Бай: «Неге тоңбайсың?» — деп сұрады.', 'Бай спросил: «Почему ты не мёрзнешь?»', 'The rich man asked: «Why aren\'t you cold?»'],
      ['Алдар: «Менің тоным сиқырлы, ол өте жылы», — деді.', 'Алдар ответил: «Моя шуба волшебная, она очень тёплая».', 'Aldar said: «My coat is magic, it is very warm».'],
      ['Сараң бай қалың ішігін Алдардың жұқа тонына айырбастады.', 'Жадный бай обменял свою толстую шубу на тонкую шубу Алдара.', 'The greedy rich man swapped his thick coat for Aldar\'s thin one.'],
      ['Алдар жылы ішікпен жүріп кетті, ал бай тоңып қалды.', 'Алдар уехал в тёплой шубе, а бай остался мёрзнуть.', 'Aldar rode off in the warm coat, and the rich man was left freezing.']
    ], [
      ['Алдар Көсенің тоны қандай еді?', 'Какая была шуба у Алдара Косе?', 'What was Aldar Kose\'s coat like?', 'жұқа', 'қалың', 'жаңа'],
      ['Бай неге тонын айырбастады?', 'Почему бай поменялся шубами?', 'Why did the rich man swap coats?', 'сиқырлы деп ойлады', 'Алдарды аяды', 'ыстықтап кетті'],
      ['Ертегінің соңында кім тоңып қалды?', 'Кто в конце сказки остался мёрзнуть?', 'Who was left freezing at the end?', 'бай', 'Алдар', 'екеуі де']
    ])
  ];

  /* Forks (master plan, sprint 2): after `at` lines the child chooses for the hero. A — the original continues,
   * B — a new ending written for this game (2–4 lines, the last one is its moral). The questions are about A. */
  function L3(x) { return { kk: x[0], ru: x[1], en: x[2] }; }
  var FORKS = {
    crane: [4, ['Тырна енді не істейді?', 'Что теперь сделает журавль?', 'What will the crane do now?'],
      ['Түлкіге сабақ береді', 'Проучит лису', 'Teach the fox a lesson'],
      ['Түлкіге ашық айтады', 'Честно скажет лисе', 'Tell the fox honestly'], [
        ['Тырна түлкіге: «Маған тамақты құмыраға салып берші», — деді.', 'Журавль сказал лисе: «Положи мне еду в кувшин, пожалуйста».', 'The crane said to the fox: «Please put my food in a jug».'],
        ['Түлкі ұялып, тамақты құмыраға салып берді.', 'Лисе стало стыдно, и она подала еду в кувшине.', 'The fox felt ashamed and served the food in a jug.'],
        ['Олар бірге тамақтанып, дос болып қалды.', 'Они поели вместе и остались друзьями.', 'They ate together and stayed friends.'],
        ['Қонақты сыйлау керек.', 'Гостя нужно уважать.', 'A guest should be treated with respect.']]],
    mouse: [3, ['Тышқан не істейді?', 'Что сделает мышка?', 'What will the mouse do?'],
      ['Түйенің өркешіне шығады', 'Залезет на горб верблюда', 'Climb onto the camel\'s hump'],
      ['Төбеге өзі жүгіреді', 'Сама побежит на холм', 'Run up the hill on its own'], [
        ['Тышқан төбеге өзі жүгірді, бірақ жол өте ұзақ еді.', 'Мышка сама побежала на холм, но путь был очень долгим.', 'The mouse ran up the hill on its own, but the way was very long.'],
        ['Таң атқанда күнді түйе бірінші көрді.', 'На рассвете солнце первым увидел верблюд.', 'At dawn the camel saw the sun first.'],
        ['Күшің аз болса, ақылыңды пайдалан.', 'Если силы мало — пользуйся умом.', 'If you are not strong, use your wits.']]],
    tortoise: [3, ['Қоян не істейді?', 'Что сделает заяц?', 'What will the hare do?'],
      ['Ағаш көлеңкесінде демалады', 'Отдохнёт в тени дерева', 'Rest in the shade of a tree'],
      ['Тоқтамай жүгіреді', 'Побежит без остановки', 'Keep running without stopping'], [
        ['Қоян тоқтамай жүгіріп, мәреге бірінші жетті.', 'Заяц бежал без остановки и первым добежал до финиша.', 'The hare ran without stopping and reached the finish first.'],
        ['Ол тасбақаға: «Кешір, енді саған күлмеймін», — деді.', 'Он сказал черепахе: «Прости, я больше не буду над тобой смеяться».', 'He said to the tortoise: «Sorry, I won\'t laugh at you any more».'],
        ['Досыңа күлме.', 'Не смейся над другом.', 'Don\'t laugh at your friend.']]],
    ant: [5, ['Құмырсқа не істейді?', 'Что сделает муравей?', 'What will the ant do?'],
      ['Аңшыны шағады', 'Укусит охотника', 'Bite the hunter'],
      ['Қарап тұрады', 'Будет просто смотреть', 'Just watch'], [
        ['Құмырсқа ештеңе істемей, қарап тұрды.', 'Муравей ничего не сделал и просто смотрел.', 'The ant did nothing and just watched.'],
        ['Көгершін аңшыны өзі байқап, әрең ұшып кетті.', 'Голубь сам заметил охотника и еле успел улететь.', 'The dove noticed the hunter itself and only just flew away.'],
        ['Құмырсқа ұялды: досқа көмектесу керек еді.', 'Муравью стало стыдно: другу нужно было помочь.', 'The ant felt ashamed: he should have helped his friend.']]],
    turnip: [3, ['Атам не істейді?', 'Что сделает дедушка?', 'What will Grandpa do?'],
      ['Көмекке шақырады', 'Позовёт на помощь', 'Call for help'],
      ['Жалғыз тарта береді', 'Будет тянуть один', 'Keep pulling alone'], [
        ['Атам жалғыз тарта берді, тарта берді.', 'Дедушка тянул и тянул один.', 'Grandpa kept pulling and pulling alone.'],
        ['Ол қатты шаршады, ал шалқан жерде қала берді.', 'Он очень устал, а репка так и осталась в земле.', 'He got very tired, and the turnip stayed in the ground.'],
        ['Бірлік бар жерде тірлік бар.', 'Где единство, там и жизнь.', 'Where there is unity, there is life.']]],
    goat: [3, ['Ешкі не істейді?', 'Что сделает козёл?', 'What will the goat do?'],
      ['Құдыққа секіреді', 'Прыгнет в колодец', 'Jump into the well'],
      ['Алдымен ойланады', 'Сначала подумает', 'Think first'], [
        ['Ешкі ойланды: «Түлкі өзі неге шықпайды?»', 'Козёл подумал: «А почему лиса сама не вылезает?»', 'The goat thought: «Why doesn\'t the fox climb out herself?»'],
        ['Ол құдыққа секірмей, ұзын арқан тауып әкелді.', 'Он не стал прыгать в колодец, а нашёл и принёс длинную верёвку.', 'He did not jump in; he found a long rope and brought it.'],
        ['Түлкі арқанмен шығып, ешкіге рахмет айтты.', 'Лиса выбралась по верёвке и сказала козлу спасибо.', 'The fox climbed out on the rope and thanked the goat.'],
        ['Алдымен ойлан, содан кейін істе.', 'Сначала подумай, потом делай.', 'Think first, then act.']]],
    swallow: [2, ['Қарлығаш не істейді?', 'Что сделает ласточка?', 'What will the swallow do?'],
      ['Адамды қорғайды', 'Защитит человека', 'Protect people'],
      ['Ұшып кетеді', 'Улетит', 'Fly away'], [
        ['Қарлығаш: «Бұл менің ісім емес», — деп ұшып кетті.', 'Ласточка сказала: «Это не моё дело» — и улетела.', 'The swallow said: «It\'s none of my business» — and flew away.'],
        ['Маса жыланға: «Адамның қаны ең тәтті», — деп айтып берді.', 'Комар рассказал змее: «Самая сладкая кровь — у человека».', 'The mosquito told the snake: «People\'s blood is the sweetest».'],
        ['Басқаға көмектесу — жақсы іс.', 'Помогать другим — доброе дело.', 'Helping others is a good deed.']]],
    hare: [2, ['Қоян не істейді?', 'Что сделает заяц?', 'What will the hare do?'],
      ['Қорқып секіреді', 'Испугается и подпрыгнет', 'Get scared and jump'],
      ['Достарына шынын айтады', 'Скажет друзьям правду', 'Tell his friends the truth'], [
        ['Қоян: «Достар, мен мақтандым! Қашыңдар!» — деп айқайлады.', 'Заяц закричал: «Друзья, я хвастался! Бегите!»', 'The hare shouted: «Friends, I was boasting! Run!»'],
        ['Барлық қояндар бұтаға жасырынып, аман қалды.', 'Все зайцы спрятались в кустах и остались целы.', 'All the hares hid in the bushes and stayed safe.'],
        ['Мақтанба, шынын айт.', 'Не хвастайся, говори правду.', 'Don\'t boast, tell the truth.']]],
    kids: [3, ['Лақтар не істейді?', 'Что сделают козлята?', 'What will the kids do?'],
      ['Дауысты тыңдайды', 'Прислушаются к голосу', 'Listen to the voice'],
      ['Есікті сәл ашады', 'Чуть приоткроют дверь', 'Open the door a little'], [
        ['Бір лақ есікті сәл ашып, қасқырды көрді.', 'Один козлёнок чуть приоткрыл дверь и увидел волка.', 'One kid opened the door a little and saw the wolf.'],
        ['Лақтар есікті тез жауып, қатты айқайлады.', 'Козлята быстро закрыли дверь и громко закричали.', 'The kids quickly shut the door and shouted loudly.'],
        ['Көршілер жүгіріп келіп, қасқырды қуып жіберді.', 'Прибежали соседи и прогнали волка.', 'The neighbours came running and chased the wolf away.'],
        ['Есікті бейтаныс адамға ашпа.', 'Не открывай дверь незнакомым.', 'Don\'t open the door to strangers.']]],
    aldar: [5, ['Алдар не дейді?', 'Что ответит Алдар?', 'What will Aldar say?'],
      ['«Тоным сиқырлы» дейді', 'Скажет: «Шуба волшебная»', 'Say: «My coat is magic»'],
      ['Шынын айтады', 'Скажет правду', 'Tell the truth'], [
        ['Алдар: «Мен ән саламын, сондықтан тоңбаймын», — деді.', 'Алдар ответил: «Я пою, поэтому не мёрзну».', 'Aldar said: «I sing, so I don\'t get cold».'],
        ['Бай да ән салып, жылынды.', 'Бай тоже запел и согрелся.', 'The rich man sang too and warmed up.'],
        ['Көңілді адам тоңбайды.', 'Весёлый человек не мёрзнет.', 'A cheerful person never gets cold.']]]
  };
  window.QREAD.forEach(function (t) {
    var f = FORKS[t.id]; if (!f) return;
    t.fork = { at: f[0], ask: L3(f[1]), a: L3(f[2]), b: { kk: f[3][0], ru: f[3][1], en: f[3][2], lines: f[4].map(L3) } };
  });
})();
