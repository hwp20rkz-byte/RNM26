/**
 * Grammar corpus of the 3D suite. Sentences come from «Қазақ тілі», 3 сынып (modules 2 and 4 of the
 * textbook — see ../../methodology/textbook-notes-m2-m4.md); `ending` is written by hand and is
 * cross-checked against the morphology engine in tests, so data and rules can never disagree.
 * Lesson content shared with the main game lives in ../../src/data/curriculum.json (single source).
 */
import type { CaseId, CaseInfo, CaseSentence, PersonId, PersonInfo, PersonSentence } from '../types/game.types';
import { caseAllomorphs, personAllomorphs } from '../lib/morphology';

const BOOK_M2 = '3 сынып, 2-модуль', BOOK_M4 = '3 сынып, 4-модуль';

export const CASES: CaseInfo[] = [
  { id: 'atau', kk: 'Атау', ru: 'Именительный', en: 'Nominative', questions: 'кім? не?', allomorphs: caseAllomorphs('atau'), color: '#00AFCA' },
  { id: 'ilik', kk: 'Ілік', ru: 'Родительный', en: 'Genitive', questions: 'кімнің? ненің?', allomorphs: caseAllomorphs('ilik'), color: '#F5A623' },
  { id: 'barys', kk: 'Барыс', ru: 'Дательно-направительный', en: 'Dative', questions: 'кімге? неге? қайда?', allomorphs: caseAllomorphs('barys'), color: '#00E599' },
  { id: 'tabys', kk: 'Табыс', ru: 'Винительный', en: 'Accusative', questions: 'кімді? нені?', allomorphs: caseAllomorphs('tabys'), color: '#7928CA' },
  { id: 'zhatys', kk: 'Жатыс', ru: 'Местный', en: 'Locative', questions: 'кімде? неде? қайда?', allomorphs: caseAllomorphs('zhatys'), color: '#3DD6F5' },
  { id: 'shygys', kk: 'Шығыс', ru: 'Исходный', en: 'Ablative', questions: 'кімнен? неден? қайдан?', allomorphs: caseAllomorphs('shygys'), color: '#FF7A59' },
  { id: 'komektes', kk: 'Көмектес', ru: 'Творительный', en: 'Instrumental', questions: 'кіммен? немен?', allomorphs: caseAllomorphs('komektes'), color: '#B9F18C' }
];
export const CASE_BY_ID = Object.fromEntries(CASES.map((c) => [c.id, c])) as Record<CaseId, CaseInfo>;

export const PERSONS: PersonInfo[] = [
  { id: 'men', kk: 'Мен', ru: 'я', en: 'I', allomorphs: personAllomorphs('men') },
  { id: 'sen', kk: 'Сен', ru: 'ты', en: 'you', allomorphs: personAllomorphs('sen') },
  { id: 'siz', kk: 'Сіз', ru: 'Вы', en: 'you (polite)', allomorphs: personAllomorphs('siz') },
  { id: 'ol', kk: 'Ол', ru: 'он / она', en: 'he / she', allomorphs: personAllomorphs('ol') },
  { id: 'biz', kk: 'Біз', ru: 'мы', en: 'we', allomorphs: personAllomorphs('biz') },
  { id: 'sender', kk: 'Сендер', ru: 'вы (ребята)', en: 'you (all)', allomorphs: personAllomorphs('sender') },
  { id: 'sizder', kk: 'Сіздер', ru: 'Вы (мн.)', en: 'you (all, polite)', allomorphs: personAllomorphs('sizder') }
];
export const PERSON_BY_ID = Object.fromEntries(PERSONS.map((p) => [p.id, p])) as Record<Exclude<PersonId, 'olar'>, PersonInfo>;

type CS = CaseSentence & { ending: string };
type PS = PersonSentence & { ending: string };
const c = (id: string, cs: CaseId, before: string, root: string, ending: string, after: string, ru: string, en: string, source: string): CS =>
  ({ id, case: cs, before, root, ending, after, ru, en, source });
const p = (id: string, person: PersonId, before: string, root: string, ending: string, after: string, ru: string, en: string, source: string): PS =>
  ({ id, person, before, root, ending, after, ru, en, source });

export const CASE_SENTENCES: CS[] = [
  c('a1', 'atau', 'Бұл — ', 'субұрқақ', '', '.', 'Это — фонтан.', 'This is a fountain.', BOOK_M4 + ', 119-бет'),
  c('a2', 'atau', '', 'Бәйтерек', '', ' Астанада орналасқан.', 'Байтерек находится в Астане.', 'Baiterek is in Astana.', BOOK_M4 + ', 128-бет'),
  c('a3', 'atau', 'Менің әкем — ', 'сәулетші', '', '.', 'Мой папа — архитектор.', 'My dad is an architect.', BOOK_M4 + ', 110-бет'),
  c('a4', 'atau', '', 'Мүсін', '', ' тастан жасалған.', 'Скульптура сделана из камня.', 'The sculpture is made of stone.', BOOK_M4 + ', 122-бет'),

  c('i1', 'ilik', '', 'Барыс', 'тың', ' мүсіні сұр.', 'Скульптура барса серая.', 'The snow leopard statue is grey.', BOOK_M4 + ', 122-бет'),
  c('i2', 'ilik', '', 'Кесене', 'нің', ' төбесі биік.', 'Верх мавзолея высокий.', 'The top of the mausoleum is high.', BOOK_M4 + ', 113-бет'),
  c('i3', 'ilik', '', 'Сарай', 'дың', ' қабырғасы қызғылт.', 'Стена дворца розовая.', 'The palace wall is pink.', BOOK_M4 + ', 116-бет'),
  c('i4', 'ilik', '', 'Мүсін', 'нің', ' түсі — сұр.', 'Цвет скульптуры — серый.', 'The sculpture is grey.', BOOK_M4 + ', 122-бет'),
  c('i5', 'ilik', '', 'Астана', 'ның', ' сәулеті өте әдемі.', 'Архитектура Астаны очень красивая.', 'Astana’s architecture is very beautiful.', BOOK_M4 + ', 131-бет'),
  c('i6', 'ilik', 'Бұл — ', 'жылқы', 'ның', ' мүсіні.', 'Это скульптура лошади.', 'This is a horse statue.', BOOK_M4 + ', 122-бет'),
  c('i7', 'ilik', 'Ол жаңа ', 'ғимарат', 'тың', ' жобасын жасады.', 'Он сделал проект нового здания.', 'He designed a new building.', BOOK_M4 + ', 110-бет'),

  c('b1', 'barys', 'Мен ', 'субұрқақ', 'қа', ' барамын.', 'Я иду к фонтану.', 'I am going to the fountain.', BOOK_M4 + ', 119-бет'),
  c('b2', 'barys', 'Біз ', 'Бәйтерек', 'ке', ' барамыз.', 'Мы идём к Байтереку.', 'We are going to Baiterek.', BOOK_M4 + ', 128-бет'),
  c('b3', 'barys', 'Ол ', 'Ханшатыр', 'ға', ' барды.', 'Он ходил в Хан Шатыр.', 'He went to Khan Shatyr.', BOOK_M4 + ', 133-бет'),
  c('b4', 'barys', 'Әлібек ', 'әже', 'ге', ' орын берді.', 'Алибек уступил место бабушке.', 'Alibek gave his seat to the grandmother.', BOOK_M2 + ', 48-бет'),
  c('b5', 'barys', 'Олар ', 'кино', 'ға', ' барды.', 'Они пошли в кино.', 'They went to the cinema.', BOOK_M2 + ', 48-бет'),
  c('b6', 'barys', 'Ол үлкен ', 'ағаш', 'қа', ' ұқсайды.', 'Он похож на большое дерево.', 'It looks like a big tree.', BOOK_M4 + ', 128-бет'),
  c('b7', 'barys', 'Субұрқақ ', 'киіз үй', 'ге', ' ұқсайды.', 'Фонтан похож на юрту.', 'The fountain looks like a yurt.', BOOK_M4 + ', 119-бет'),

  c('t1', 'tabys', 'Мен ', 'мүсін', 'ді', ' көрдім.', 'Я увидел скульптуру.', 'I saw the sculpture.', BOOK_M4 + ', 122-бет'),
  c('t2', 'tabys', 'Ол ', 'кітап', 'ты', ' сөреге қойды.', 'Он поставил книгу на полку.', 'He put the book on the shelf.', BOOK_M2 + ', 50-бет'),
  c('t3', 'tabys', 'Әлібек ', 'қала', 'ны', ' суретке түсірді.', 'Алибек сфотографировал город.', 'Alibek took a photo of the city.', BOOK_M4 + ', 120-бет'),
  c('t4', 'tabys', 'Біз ', 'сарай', 'ды', ' қағаздан жасадық.', 'Мы сделали дворец из бумаги.', 'We made the palace out of paper.', BOOK_M4 + ', 117-бет'),
  c('t5', 'tabys', 'Сен ', 'субұрқақ', 'ты', ' көрдің бе?', 'Ты видел фонтан?', 'Did you see the fountain?', BOOK_M4 + ', 120-бет'),

  c('z1', 'zhatys', 'Мүсін ', 'гүлзар', 'да', ' тұр.', 'Скульптура стоит в цветнике.', 'The statue stands in the flower bed.', BOOK_M4 + ', 122-бет'),
  c('z2', 'zhatys', 'Біз ', 'саябақ', 'та', ' демалдық.', 'Мы отдыхали в парке.', 'We relaxed in the park.', BOOK_M4 + ', 130-бет'),
  c('z3', 'zhatys', '', 'Астана', 'да', ' ғимарат көп.', 'В Астане много зданий.', 'There are many buildings in Astana.', BOOK_M4 + ', 131-бет'),
  c('z4', 'zhatys', '', 'Көктөбе', 'де', ' телемұнара бар.', 'На Кок-Тобе есть телебашня.', 'There is a TV tower on Kok-Tobe.', BOOK_M4 + ', 126-бет'),
  c('z5', 'zhatys', 'Кітап ', 'сөре', 'де', ' тұр.', 'Книга стоит на полке.', 'The book is on the shelf.', BOOK_M2 + ', 52-бет'),

  c('s1', 'shygys', 'Мүсін ', 'мәрмәр тас', 'тан', ' жасалған.', 'Скульптура сделана из мрамора.', 'The statue is made of marble.', BOOK_M4 + ', 119-бет'),
  c('s2', 'shygys', 'Мен ', 'лего', 'дан', ' ғимарат жасадым.', 'Я сделал здание из лего.', 'I made a building out of LEGO.', BOOK_M4 + ', 118-бет'),
  c('s3', 'shygys', 'Біз ', 'картон', 'нан', ' макет жасадық.', 'Мы сделали макет из картона.', 'We made a model out of cardboard.', BOOK_M4 + ', 118-бет'),
  c('s4', 'shygys', 'Қабырғасы ', 'темір', 'ден', ' жасалған.', 'Стены сделаны из железа.', 'The walls are made of iron.', BOOK_M4 + ', 128-бет'),
  c('s5', 'shygys', '', 'Аялдама', 'дан', ' әже мінді.', 'На остановке вошла бабушка.', 'A grandmother got on at the stop.', BOOK_M2 + ', 48-бет'),
  c('s6', 'shygys', '', 'Сабақ', 'тан', ' кейін біз серуендедік.', 'После уроков мы гуляли.', 'After school we went for a walk.', BOOK_M4 + ', 120-бет'),

  c('k1', 'komektes', 'Мен ', 'аспа жол', 'мен', ' көтерілдім.', 'Я поднялся по канатной дороге.', 'I went up by cable car.', BOOK_M4 + ', 125-бет'),
  c('k2', 'komektes', 'Олар ', 'автобус', 'пен', ' қайтты.', 'Они вернулись на автобусе.', 'They came back by bus.', BOOK_M2 + ', 48-бет'),
  c('k3', 'komektes', 'Мен ', 'досым', 'мен', ' бардым.', 'Я ходил с другом.', 'I went with my friend.', BOOK_M4 + ', 120-бет'),
  c('k4', 'komektes', 'Әже ', 'біз', 'бен', ' сөйлесті.', 'Бабушка поговорила с нами.', 'Grandma talked with us.', BOOK_M4 + ', 125-бет'),
  c('k5', 'komektes', 'Ол ', 'велосипед', 'пен', ' келді.', 'Он приехал на велосипеде.', 'He came by bike.', BOOK_M4 + ', 127-бет')
];

export const PERSON_SENTENCES: PS[] = [
  p('p1', 'men', 'Мен ', 'ақылды', 'мын', '.', 'Я умный.', 'I am clever.', BOOK_M2 + ', 40-бет'),
  p('p2', 'men', 'Мен ', 'мейірімді', 'мін', '.', 'Я добрый.', 'I am kind.', BOOK_M2 + ', 40-бет'),
  p('p3', 'men', 'Мен жалқау ', 'емес', 'пін', '.', 'Я не ленивый.', 'I am not lazy.', BOOK_M2 + ', 43-бет'),
  p('p4', 'men', 'Мен ', 'еңбекқор', 'мын', '.', 'Я трудолюбивый.', 'I am hard-working.', BOOK_M2 + ', 42-бет'),
  p('p5', 'men', 'Мен ', 'сәулетші', 'мін', '.', 'Я архитектор.', 'I am an architect.', BOOK_M4 + ', 115-бет'),
  p('p6', 'men', 'Мен ', 'ұстаз', 'бын', '.', 'Я учитель.', 'I am a teacher.', 'грамматика: после ж, з — -бын/-бін'),
  p('p7', 'sen', 'Сен ', 'үлгілі', 'сің', '.', 'Ты примерный.', 'You are exemplary.', BOOK_M2 + ', 41-бет'),
  p('p8', 'sen', 'Сен ', 'ақылды', 'сың', '.', 'Ты умный.', 'You are clever.', BOOK_M2 + ', 42-бет'),
  p('p9', 'sen', 'Сен ерке ', 'емес', 'сің', '.', 'Ты не избалованный.', 'You are not spoiled.', BOOK_M2 + ', 43-бет'),
  p('p10', 'siz', 'Сіз ', 'ұқыпты', 'сыз', '.', 'Вы аккуратный.', 'You are tidy.', BOOK_M2 + ', 42-бет'),
  p('p11', 'siz', 'Сіз ', 'мейірімді', 'сіз', '.', 'Вы добрый.', 'You are kind.', BOOK_M2 + ', 40-бет'),
  p('p12', 'biz', 'Біз әдепті ', 'бала', 'мыз', '.', 'Мы воспитанные дети.', 'We are polite children.', BOOK_M2 + ', 47-бет'),
  p('p13', 'biz', 'Біз ', 'ұқыпты оқушы', 'мыз', '.', 'Мы аккуратные ученики.', 'We are tidy pupils.', BOOK_M2 + ', 50-бет'),
  p('p14', 'biz', 'Біз ', 'қазақ', 'пыз', '.', 'Мы казахи.', 'We are Kazakhs.', 'грамматика: после глухих — -пыз/-піз'),
  p('p15', 'sender', 'Сендер ', 'ақылды', 'сыңдар', '.', 'Вы (ребята) умные.', 'You (all) are clever.', BOOK_M2 + ', 53-бет'),
  p('p16', 'sizder', 'Сіздер ', 'ақылды', 'сыздар', '.', 'Вы умные (вежл., мн.).', 'You (all, polite) are clever.', BOOK_M2 + ', 53-бет'),
  p('p17', 'ol', 'Ол ', 'мейірімді', '', '.', 'Он добрый.', 'He is kind.', BOOK_M2 + ', 40-бет')
];
