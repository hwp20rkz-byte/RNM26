/** The five games of the suite: pedagogy, mechanics and build status (shown honestly in the hub). */
import type { GameId } from '../../store/useGameStore';

export interface GameCard { id: GameId; kk: string; ru: string; en: string; icon: string; pillar: { ru: string; en: string }; ready: boolean; mechanic: { ru: string; en: string } }

export const GAMES: GameCard[] = [
  { id: 'totem-cases', kk: 'Септік тотемі', ru: 'Тотем падежей', en: 'Totem of Cases', icon: '🔮', ready: true,
    pillar: { ru: '7 септік · жіктік', en: '7 cases · personal endings' },
    mechanic: { ru: 'Rapier-кристаллы, поводок гравитации, луч, ударная волна', en: 'Rapier crystals, gravity tether, energy beam, shockwave' } },
  { id: 'hyperloop', kk: 'Сөйлем экспресі', ru: 'Гиперлуп-конструктор', en: 'Hyperloop Builder', icon: '🚄', ready: false,
    pillar: { ru: 'Порядок слов SOV', en: 'SOV word order' },
    mechanic: { ru: 'Магнитные капсулы-слова на доках монорельса', en: 'Magnetic word pods snapping onto monorail docks' } },
  { id: 'monoliths', kk: 'Ұшқыр монолиттер', ru: 'Парящие монолиты', en: 'Floating Monoliths', icon: '🗿', ready: false,
    pillar: { ru: 'Пары и антонимы', en: 'Pairs and antonyms' },
    mechanic: { ru: 'Кварцевые монолиты, золотой лазерный мост', en: 'Quartz monoliths, golden laser bridge' } },
  { id: 'anagram', kk: 'Әріп кубтары', ru: 'Воксельная анаграмма', en: 'Voxel Anagram', icon: '🧊', ready: false,
    pillar: { ru: 'Ә І Ң Ғ Ү Ұ Қ Ө Һ', en: 'Ә І Ң Ғ Ү Ұ Қ Ө Һ' },
    mechanic: { ru: 'Кубы-буквы в низкой гравитации, преломление света', en: 'Letter cubes in low gravity, light refraction' } },
  { id: 'baiterek', kk: 'Бәйтерек қорғаны', ru: 'Защита Байтерека', en: 'Baiterek Defense', icon: '🌳', ready: false,
    pillar: { ru: 'Скоростной перевод, комбо', en: 'Speed translation, combos' },
    mechanic: { ru: 'Лексические метеориты, кинетические лучи', en: 'Lexical meteors, kinetic beams' } }
];
