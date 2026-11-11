/** Hub: the suite's home with the five games, the player's level and streak. */
import { GAMES } from './games/catalog';
import { navigate } from './router';
import { currentLang, pick } from '../lib/i18n';
import { levelOf, useGameStore } from '../store/useGameStore';

export default function HubPage() {
  const lang = currentLang();
  const xp = useGameStore((s) => s.xp), streak = useGameStore((s) => s.streak), best = useGameStore((s) => s.best);
  const lv = levelOf(xp);
  const backToGame = () => { if (/android_asset|\/suite\//.test(window.location.href)) window.location.href = '../index.html'; else window.history.back(); };
  return (
    <main className="min-h-full bg-[radial-gradient(ellipse_at_top,hsl(271_67%_47%/0.35),transparent_55%),radial-gradient(ellipse_at_bottom,hsl(188_100%_40%/0.25),transparent_60%)] px-4 pb-12 pt-[max(24px,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center gap-3">
          <button className="btn-ghost holo" onClick={backToGame} aria-label={lang === 'en' ? 'Back to the game' : 'Назад в игру'}>←</button>
          <div>
            <p className="text-xs font-black tracking-[0.3em] text-turq-300">QAZAQVERSE 3D</p>
            <h1 className="text-3xl font-black">{lang === 'en' ? 'Neo-Steppe Arcade' : 'Неостепь: 3D-зал'}</h1>
          </div>
          <div className="holo ml-auto rounded-2xl px-4 py-2 text-right">
            <b className="block text-xl">LV {lv.level}</b>
            <span className="text-xs text-mist-dim">🔥 {streak} · {xp} XP</span>
          </div>
        </header>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.map((g) => (
            <li key={g.id}>
              <button onClick={() => navigate('/games/' + g.id)}
                className={'holo group flex h-full w-full flex-col gap-2 rounded-[var(--radius-card)] p-6 text-left transition-transform duration-200 hover:-translate-y-1 ' + (g.ready ? '' : 'opacity-80')}>
                <span aria-hidden className="text-3xl">{g.icon}</span>
                <b className="text-xl font-black">{g.kk}</b>
                <span className="text-sm text-mist-dim">{pick(g, lang)} · {pick(g.pillar, lang)}</span>
                <span className="text-xs text-mist-dim">{pick(g.mechanic, lang)}</span>
                <span className={'mt-auto inline-flex w-fit rounded-full px-3 py-1 text-xs font-black ' + (g.ready ? 'bg-jade/20 text-jade' : 'bg-gold/15 text-gold-300')}>
                  {g.ready ? (best[g.id] != null ? (lang === 'en' ? 'Best ' : 'Рекорд ') + best[g.id] + '%' : (lang === 'en' ? 'Play' : 'Играть')) : (lang === 'en' ? 'Next sprint' : 'Следующий спринт')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
