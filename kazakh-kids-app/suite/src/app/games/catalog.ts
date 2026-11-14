/** The five games of the suite: pedagogy, mechanics and build status (shown honestly in the hub). */
import type { GameId } from '../../store/useGameStore';

export interface GameCard { id: GameId; kk: string; ru: string; en: string; icon: string; pillar: { ru: string; en: string }; ready: boolean; mechanic: { ru: string; en: string } }

export const GAMES: GameCard[] = [
  { id: 'totem-cases', kk: 'Септік тотемі', ru: 'Тотем падежей', en: 'Totem of Cases', icon: '🔮', ready: true,
    pillar: { ru: '7 септік · жіктік', en: '7 cases · personal endings' },
    mechanic: { ru: 'Rapier-кристаллы, поводок гравитации, луч, ударная волна', en: 'Rapier crystals, gravity tether, energy beam, shockwave' } },
  { id: 'hyperloop', kk: 'Сөйлем экспресі', ru: 'Экспресс предложений', en: 'Sentence Express', icon: '🚄', ready: true,
    pillar: { ru: 'Порядок слов SOV · команды', en: 'SOV word order · commands' },
    mechanic: { ru: 'Капсулы-слова встают на доки монорельса, экспресс уезжает', en: 'Word pods dock on the monorail and the express departs' } },
  { id: 'monoliths', kk: 'Ұшқыр монолиттер', ru: 'Парящие монолиты', en: 'Floating Monoliths', icon: '🗿', ready: true,
    pillar: { ru: 'Антонимы · перевод · память', en: 'Antonyms · translation · memory' },
    mechanic: { ru: 'Кварцевые монолиты, левитация, золотой лазерный мост, звёздная пыль', en: 'Quartz monoliths, levitation, golden laser bridge, stardust' } },
  { id: 'anagram', kk: 'Әріп кубтары', ru: 'Кубики-буквы', en: 'Letter Cubes', icon: '🧊', ready: true,
    pillar: { ru: 'Ә І Ң Ғ Ү Ұ Қ Ө Һ', en: 'Ә І Ң Ғ Ү Ұ Қ Ө Һ' },
    mechanic: { ru: 'Кубики-буквы в низкой гравитации; ловушка — русская буква-двойник', en: 'Letter cubes in low gravity; the trap is the Russian look-alike' } },
  { id: 'baiterek', kk: 'Бәйтерек қорғаны', ru: 'Защита Байтерека', en: 'Baiterek Defense', icon: '🌳', ready: true,
    pillar: { ru: 'Быстрый перевод: картинки и слова', en: 'Quick translation: pictures and words' },
    mechanic: { ru: 'Метеориты падают на Бәйтерек — назови по-казахски', en: 'Meteors fall on Baiterek — name them in Kazakh' } },
  { id: 'gravity', kk: 'Грави-тир', ru: 'Грави-тир: мынау, анау, аламын', en: 'Gravity Range', icon: '🧲', ready: true,
    pillar: { ru: 'Мынау / анау · Мен … аламын', en: 'Мынау / анау · Мен … аламын' },
    mechanic: { ru: 'Близкое — перчаткой, далёкое — грави-лучом; «аламын» включает суперсилу', en: 'Near — the glove, far — the gravity beam; «аламын» powers the hero up' } },
  { id: 'city', kk: 'Қала квесті', ru: 'Квест по городу: вывески', en: 'City Quest', icon: '🏙️', ready: true,
    pillar: { ru: 'Вывески · Барыс септік: қайда? — дәріханаға', en: 'City signs · Dative: where to? — дәріханаға' },
    mechanic: { ru: 'Прочитай вывеску и отправь Айсұлу на ховерборде; исправь вывески, которые перепутал Жалқаубек', en: 'Read the signs and send Айсұлу on her hoverboard; fix the signs Жалқаубек swapped' } }
];
