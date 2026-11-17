/** UI language follows the main game (RU → KK or EN → KK); Kazakh content is never translated. */
import type { Lang } from '../types/game.types';

export function currentLang(): Lang {
  try {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (q === 'en' || q === 'ru') return q;
    const main = JSON.parse(window.localStorage.getItem('qazaqsha-oyna-v1') || '{}') as { lang?: string };
    return main.lang === 'en' ? 'en' : 'ru';
  } catch { return 'ru'; }
}
export const pick = (o: { ru: string; en: string }, l: Lang): string => (l === 'en' ? o.en : o.ru);
