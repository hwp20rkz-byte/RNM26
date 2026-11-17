/**
 * «Қала квесті» (City Quest): city signs and why you go there.
 * `dat` (dative, «where to») is checked against web/grammar-core.js caseForm(kk, 'barys') in city.test.ts — the engine
 * is the source of truth. Hints are written for this game (simple present / «керек» / «-ғым келеді» forms).
 */
import type { Localized } from '../types/game.types';

export interface Place extends Localized { kk: string; dat: string; e: string; color: string; hint: Localized & { kk: string } }
const P = (kk: string, dat: string, e: string, ru: string, en: string, color: string, hint: [string, string, string]): Place =>
  ({ kk, dat, e, ru, en, color, hint: { kk: hint[0], ru: hint[1], en: hint[2] } });

export const PLACES: Place[] = [
  P('дәріхана', 'дәріханаға', '💊', 'аптека', 'pharmacy', '#2bb673', ['Маған дәрі керек.', 'Мне нужно лекарство.', 'I need some medicine.']),
  P('аялдама', 'аялдамаға', '🚌', 'остановка', 'bus stop', '#f5a623', ['Автобус күтемін.', 'Я подожду автобус.', 'I\'ll wait for the bus.']),
  P('мектеп', 'мектепке', '🏫', 'школа', 'school', '#3d7be0', ['Бүгін сабақ бар.', 'Сегодня есть уроки.', 'There are lessons today.']),
  P('аурухана', 'ауруханаға', '🏥', 'больница', 'hospital', '#e5484d', ['Маған дәрігер керек.', 'Мне нужен врач.', 'I need a doctor.']),
  P('кітапхана', 'кітапханаға', '📚', 'библиотека', 'library', '#8e5bd6', ['Кітап оқығым келеді.', 'Хочу почитать книгу.', 'I want to read a book.']),
  P('дүкен', 'дүкенге', '🛒', 'магазин', 'shop', '#ff7a45', ['Сүт пен нан сатып алу керек.', 'Нужно купить молоко и хлеб.', 'I need to buy milk and bread.']),
  P('саябақ', 'саябаққа', '🌳', 'парк', 'park', '#3fae4a', ['Серуендегім келеді.', 'Хочу погулять.', 'I want to go for a walk.']),
  P('пошта', 'поштаға', '📮', 'почта', 'post office', '#1f9bd1', ['Атама хат жіберемін.', 'Отправлю письмо дедушке.', 'I\'ll send Grandpa a letter.']),
  P('мұражай', 'мұражайға', '🏛️', 'музей', 'museum', '#b08a4a', ['Ескі заттарды көргім келеді.', 'Хочу посмотреть старинные вещи.', 'I want to see old things.']),
  P('стадион', 'стадионға', '🏟️', 'стадион', 'stadium', '#17a398', ['Футбол көргім келеді.', 'Хочу посмотреть футбол.', 'I want to watch football.']),
  P('асхана', 'асханаға', '🍲', 'столовая', 'canteen', '#d9534f', ['Қарным ашты.', 'Я проголодался.', 'I\'m hungry.']),
  P('әуежай', 'әуежайға', '✈️', 'аэропорт', 'airport', '#5b6ee1', ['Ұшаққа отырамын.', 'Я сяду на самолёт.', 'I\'m catching a plane.'])
];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** Spoken after the hero arrives: «Дәріханаға барамын!» — the dative answers «Қайда?» (where to?). */
export const goPhrase = (p: Place) => cap(p.dat) + ' барамын!';
/** Spoken when a swapped sign is fixed: «Бұл — дәріхана.» */
export const fixPhrase = (p: Place) => 'Бұл — ' + p.kk + '.';
/** Sign as written on a building. */
export const sign = (kk: string) => kk.toUpperCase();
