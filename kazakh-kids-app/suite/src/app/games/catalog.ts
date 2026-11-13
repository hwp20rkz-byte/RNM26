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
  { id: 'anagram', kk: 'Әріп кубтары', ru: 'Воксельная анаграмма', en: 'Voxel Anagram', icon: '🧊', ready: false,
    pillar: { ru: 'Ә І Ң Ғ Ү Ұ Қ Ө Һ', en: 'Ә І Ң Ғ Ү Ұ Қ Ө Һ' },
    mechanic: { ru: 'Кубы-буквы в низкой гравитации, преломление света', en: 'Letter cubes in low gravity, light refraction' } },
  { id: 'baiterek', kk: 'Бәйтерек қорғаны', ru: 'Защита Байтерека', en: 'Baiterek Defense', icon: '🌳', ready: false,
    pillar: { ru: 'Скоростной перевод, комбо', en: 'Speed translation, combos' },
    mechanic: { ru: 'Лексические метеориты, кинетические лучи', en: 'Lexical meteors, kinetic beams' } }
];
