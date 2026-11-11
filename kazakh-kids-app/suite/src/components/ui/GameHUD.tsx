/**
 * Heads-up display shared by all games: back, lives, combo multiplier, session XP and global level,
 * sound / voice toggles and the graphics tier. Touch targets ≥ 44 px; works over the canvas.
 */
import { useGameStore, levelOf } from '../../store/useGameStore';
import { useAudioStore } from '../../store/useAudioStore';
import type { Lang, Quality } from '../../types/game.types';

const QUALITIES: (Quality | 'auto')[] = ['auto', 'low', 'medium', 'high'];
const QLABEL: Record<Quality | 'auto', { ru: string; en: string }> = {
  auto: { ru: 'Графика: авто', en: 'Graphics: auto' }, low: { ru: 'Графика: эконом', en: 'Graphics: low' },
  medium: { ru: 'Графика: средняя', en: 'Graphics: medium' }, high: { ru: 'Графика: максимум', en: 'Graphics: high' }
};

export interface GameHUDProps { title: string; lives: number; maxLives: number; combo: number; multiplier: number; sessionXp: number; lang: Lang; onBack(): void }

export function GameHUD({ title, lives, maxLives, combo, multiplier, sessionXp, lang, onBack }: GameHUDProps) {
  const xp = useGameStore((s) => s.xp), quality = useGameStore((s) => s.quality), setQuality = useGameStore((s) => s.setQuality);
  const muted = useAudioStore((s) => s.muted), toggleMute = useAudioStore((s) => s.toggleMute), voice = useAudioStore((s) => s.voice), toggleVoice = useAudioStore((s) => s.toggleVoice);
  const lv = levelOf(xp + sessionXp);
  const nextQ = QUALITIES[(QUALITIES.indexOf(quality) + 1) % QUALITIES.length];
  return (
    <header className="pointer-events-auto absolute inset-x-0 top-0 z-20 flex items-center gap-2 px-4 pt-[max(12px,env(safe-area-inset-top))]">
      <button className="btn-ghost holo" onClick={onBack} aria-label={lang === 'en' ? 'Back' : 'Назад'}>←</button>
      <div className="holo flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 py-2">
        <b className="hidden truncate text-sm font-black tracking-wide text-turq-300 sm:block">{title}</b>
        <span className="ml-auto flex items-center gap-1 text-base" aria-label={(lang === 'en' ? 'Lives: ' : 'Жизни: ') + lives}>
          {Array.from({ length: maxLives }, (_, i) => <span key={i} className={i < lives ? '' : 'opacity-25 grayscale'}>💎</span>)}
        </span>
        {combo >= 2 && <b className="rounded-lg bg-gold/20 px-2 text-sm text-gold-300" aria-live="polite">🔥{combo}{multiplier > 1 ? ' ×' + multiplier : ''}</b>}
        <span className="hidden text-sm text-mist-dim sm:inline">LV {lv.level}</span>
        <span className="relative h-2 w-16 overflow-hidden rounded-full bg-obsidian-700" role="progressbar" aria-valuemin={0} aria-valuemax={lv.need} aria-valuenow={lv.into} aria-label={'Level ' + lv.level}>
          <i className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-turq to-jade" style={{ width: Math.round(lv.into / lv.need * 100) + '%' }} />
        </span>
        <b className="text-sm text-jade">+{sessionXp}</b>
      </div>
      <button className="btn-ghost holo" onClick={toggleMute} aria-pressed={!muted} aria-label={muted ? 'Sound on' : 'Sound off'}>{muted ? '🔇' : '🔊'}</button>
      <button className="btn-ghost holo hidden sm:block" onClick={toggleVoice} aria-pressed={voice} title={lang === 'en' ? 'Kazakh voice' : 'Казахская озвучка'}>{voice ? '🗣️' : '🤐'}</button>
      <button className="btn-ghost holo" onClick={() => setQuality(nextQ)} title={QLABEL[quality][lang]} aria-label={QLABEL[quality][lang]}>
        {quality === 'auto' ? '✨A' : quality === 'low' ? '✨1' : quality === 'medium' ? '✨2' : '✨3'}
      </button>
    </header>
  );
}
