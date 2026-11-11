/** Case / person badge: Kazakh name, question words and the ring colour of the totem. */
import type { Lang } from '../../types/game.types';

export interface GrammarBadgeProps { kk: string; questions?: string; hint: string; color: string; lang: Lang; compact?: boolean }

export function GrammarBadge({ kk, questions, hint, color, compact }: GrammarBadgeProps) {
  return (
    <span className={'inline-flex items-center gap-2 rounded-full border px-3 ' + (compact ? 'py-0.5 text-xs' : 'py-1 text-sm')}
      style={{ borderColor: color, boxShadow: `0 0 16px ${color}55`, background: `${color}22` }}>
      <span aria-hidden className="size-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      <b className="font-black tracking-wide">{kk}</b>
      {questions && <span className="text-mist-dim">{questions}</span>}
      <span className="sr-only">{hint}</span>
    </span>
  );
}
