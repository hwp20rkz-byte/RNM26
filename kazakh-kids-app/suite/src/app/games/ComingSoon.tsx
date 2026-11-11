/** Placeholder page for a game that is designed but not built yet — states the plan, does not pretend. */
import { GAMES } from './catalog';
import { navigate } from '../router';
import { currentLang, pick } from '../../lib/i18n';
import type { GameId } from '../../store/useGameStore';

export function ComingSoon({ id }: { id: GameId }) {
  const lang = currentLang(), g = GAMES.find((x) => x.id === id)!;
  return (
    <main className="grid min-h-full place-items-center p-4">
      <div className="holo max-w-md rounded-[var(--radius-card)] p-6 text-center">
        <div aria-hidden className="text-3xl">{g.icon}</div>
        <h1 className="mt-2 text-3xl font-black">{g.kk}</h1>
        <p className="mt-1 text-mist-dim">{pick(g, lang)} · {pick(g.pillar, lang)}</p>
        <p className="mt-4 text-base">{pick(g.mechanic, lang)}</p>
        <p className="mt-4 text-sm text-gold-300">{lang === 'en' ? 'Designed, scheduled for the next sprint. It will reuse the canvas, particles, sound engine and grammar engine already in place.' : 'Спроектирована и стоит в следующем спринте: использует уже готовые холст, частицы, звук и грамматический движок.'}</p>
        <button className="btn-solar mt-6 w-full" onClick={() => navigate('/')}>{lang === 'en' ? 'Back to the arcade' : 'Назад в зал'}</button>
      </div>
    </main>
  );
}
