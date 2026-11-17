/**
 * Sentences for «Сөйлем экспресі» (Hyperloop Builder): the child docks word pods onto the monorail in
 * Kazakh order. Kazakh is SOV — the verb is always last; time goes first, place («где? куда? откуда?»)
 * right before the action. Sentences are written for this game (1–3 grade vocabulary); the «команды» set
 * follows the teacher's and the doctor's polite imperative (-ыңыз/-іңіз), as in the «Денсаулық» phrasebook
 * (Тіл комитеті, 2011) — own examples, not copied lines.
 *
 * `words` is the canonical order; `alts` lists other orders a Kazakh speaker accepts (time ↔ subject).
 * `decoy` (commands only) is the same verb in a non-imperative form: docking it is a mistake.
 */
import type { Localized } from '../types/game.types';

export type SentenceMode = 'basic' | 'place' | 'commands';

export interface Sentence extends Localized {
  /** The sentence as written and spoken (with punctuation). */
  kk: string;
  words: string[];
  alts?: string[][];
  decoy?: string;
}

export const MODE_RULE: Record<SentenceMode, Localized> = {
  basic: { ru: 'Кто → что → действие. Глагол всегда в конце: Мен кітап оқимын.', en: 'Who → what → action. The verb always comes last: Мен кітап оқимын.' },
  place: { ru: 'Кто → когда → где / куда → действие. Глагол — последний: Мен ертең саябаққа барамын.', en: 'Who → when → where → action. The verb is last: Мен ертең саябаққа барамын.' },
  commands: { ru: 'Команда — основа глагола в конце: Кітабыңды аш! Вежливо: -ыңыз / -іңіз (ашыңыз!).', en: 'A command is the bare verb stem, last: Кітабыңды аш! Polite: -ыңыз / -іңіз (ашыңыз!).' }
};

export const SENTENCES: Record<SentenceMode, Sentence[]> = {
  basic: [
    { kk: 'Мен кітап оқимын.', words: ['Мен', 'кітап', 'оқимын'], ru: 'Я читаю книгу.', en: 'I read a book.' },
    { kk: 'Анам нан пісіреді.', words: ['Анам', 'нан', 'пісіреді'], ru: 'Мама печёт хлеб.', en: 'Mum bakes bread.' },
    { kk: 'Біз доп ойнаймыз.', words: ['Біз', 'доп', 'ойнаймыз'], ru: 'Мы играем в мяч.', en: 'We play ball.' },
    { kk: 'Әжем шай ішеді.', words: ['Әжем', 'шай', 'ішеді'], ru: 'Бабушка пьёт чай.', en: 'Grandma drinks tea.' },
    { kk: 'Ол хат жазады.', words: ['Ол', 'хат', 'жазады'], ru: 'Он пишет письмо.', en: 'He writes a letter.' },
    { kk: 'Мысық сүт ішеді.', words: ['Мысық', 'сүт', 'ішеді'], ru: 'Кошка пьёт молоко.', en: 'The cat drinks milk.' },
    { kk: 'Атам газет оқиды.', words: ['Атам', 'газет', 'оқиды'], ru: 'Дедушка читает газету.', en: 'Grandpa reads the newspaper.' },
    { kk: 'Балалар ән айтады.', words: ['Балалар', 'ән', 'айтады'], ru: 'Дети поют песню.', en: 'The children sing a song.' },
    { kk: 'Мен алма жеймін.', words: ['Мен', 'алма', 'жеймін'], ru: 'Я ем яблоко.', en: 'I eat an apple.' },
    { kk: 'Сен сурет саласың.', words: ['Сен', 'сурет', 'саласың'], ru: 'Ты рисуешь картину.', en: 'You draw a picture.' }
  ],
  place: [
    { kk: 'Мен мектепке барамын.', words: ['Мен', 'мектепке', 'барамын'], ru: 'Я иду в школу.', en: 'I go to school.' },
    { kk: 'Біз ертең саябаққа барамыз.', words: ['Біз', 'ертең', 'саябаққа', 'барамыз'], alts: [['Ертең', 'біз', 'саябаққа', 'барамыз']], ru: 'Завтра мы пойдём в парк.', en: 'Tomorrow we will go to the park.' },
    { kk: 'Әкем зауытта жұмыс істейді.', words: ['Әкем', 'зауытта', 'жұмыс', 'істейді'], ru: 'Папа работает на заводе.', en: 'Dad works at a factory.' },
    { kk: 'Мысық диванда ұйықтап жатыр.', words: ['Мысық', 'диванда', 'ұйықтап', 'жатыр'], ru: 'Кошка спит на диване.', en: 'The cat is sleeping on the sofa.' },
    { kk: 'Мен кеше дүкенге бардым.', words: ['Мен', 'кеше', 'дүкенге', 'бардым'], alts: [['Кеше', 'мен', 'дүкенге', 'бардым']], ru: 'Вчера я ходил в магазин.', en: 'Yesterday I went to the shop.' },
    { kk: 'Құстар ағашта отыр.', words: ['Құстар', 'ағашта', 'отыр'], ru: 'Птицы сидят на дереве.', en: 'The birds are sitting in the tree.' },
    { kk: 'Біз жазда ауылға барамыз.', words: ['Біз', 'жазда', 'ауылға', 'барамыз'], alts: [['Жазда', 'біз', 'ауылға', 'барамыз']], ru: 'Летом мы ездим в аул.', en: 'In summer we go to the village.' },
    { kk: 'Анам базардан алма сатып алды.', words: ['Анам', 'базардан', 'алма', 'сатып', 'алды'], ru: 'Мама купила яблоки на базаре.', en: 'Mum bought apples at the bazaar.' },
    { kk: 'Балалар аулада ойнап жүр.', words: ['Балалар', 'аулада', 'ойнап', 'жүр'], ru: 'Дети играют во дворе.', en: 'The children are playing in the yard.' },
    { kk: 'Мен сабақтан кейін үйге қайтамын.', words: ['Мен', 'сабақтан', 'кейін', 'үйге', 'қайтамын'], alts: [['Сабақтан', 'кейін', 'мен', 'үйге', 'қайтамын']], ru: 'После уроков я возвращаюсь домой.', en: 'After school I go back home.' }
  ],
  commands: [
    { kk: 'Кітабыңды аш!', words: ['Кітабыңды', 'аш'], decoy: 'ашамын', ru: 'Открой книгу!', en: 'Open your book!' },
    { kk: 'Тақтаға шық!', words: ['Тақтаға', 'шық'], decoy: 'шығамын', ru: 'Выйди к доске!', en: 'Come to the board!' },
    { kk: 'Дәптеріңе жаз!', words: ['Дәптеріңе', 'жаз'], decoy: 'жазады', ru: 'Пиши в тетрадь!', en: 'Write in your notebook!' },
    { kk: 'Орныңа отыр!', words: ['Орныңа', 'отыр'], decoy: 'отырамын', ru: 'Садись на место!', en: 'Sit down in your place!' },
    { kk: 'Қолыңды көтер!', words: ['Қолыңды', 'көтер'], decoy: 'көтереді', ru: 'Подними руку!', en: 'Raise your hand!' },
    { kk: 'Есікті жап!', words: ['Есікті', 'жап'], decoy: 'жабамын', ru: 'Закрой дверь!', en: 'Close the door!' },
    { kk: 'Мұқият тыңдаңдар!', words: ['Мұқият', 'тыңдаңдар'], decoy: 'тыңдаймыз', ru: 'Слушайте внимательно! (классу)', en: 'Listen carefully! (to the class)' },
    { kk: 'Сабаққа кешікпе!', words: ['Сабаққа', 'кешікпе'], decoy: 'кешікпеймін', ru: 'Не опаздывай на урок!', en: 'Don\'t be late for class!' },
    { kk: 'Аузыңызды ашыңыз!', words: ['Аузыңызды', 'ашыңыз'], decoy: 'ашасыз', ru: 'Откройте рот! (врач)', en: 'Open your mouth! (doctor)' },
    { kk: 'Терең дем алыңыз!', words: ['Терең', 'дем', 'алыңыз'], decoy: 'аламын', ru: 'Дышите глубже! (врач)', en: 'Breathe deeply! (doctor)' },
    { kk: 'Жоғары қараңыз!', words: ['Жоғары', 'қараңыз'], decoy: 'қарайды', ru: 'Посмотрите вверх! (врач)', en: 'Look up! (doctor)' },
    { kk: 'Екі қолыңызды жоғары көтеріңіз!', words: ['Екі', 'қолыңызды', 'жоғары', 'көтеріңіз'], decoy: 'көтеремін', ru: 'Поднимите обе руки вверх! (врач)', en: 'Raise both hands up! (doctor)' }
  ]
};
