/**
 * Grammar explanation after a mistake: the rule in one line (harmony + assimilation), the correct form
 * and the full sentence with voice-over. Accessible dialog: focus moves to the action button.
 */
import { useEffect, useRef } from 'react';
import type { AnswerVerdict, Lang } from '../../types/game.types';
import { pick } from '../../lib/i18n';

export interface FeedbackModalProps { verdict: AnswerVerdict; badge: React.ReactNode; translation: string; lang: Lang; onContinue(): void; onListen(): void }

export function FeedbackModal({ verdict, badge, translation, lang, onContinue, onListen }: FeedbackModalProps) {
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => { btn.current?.focus(); }, []);
  return (
    <div className="pointer-events-auto fixed inset-0 z-40 flex items-end justify-center bg-obsidian/60 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="fb-title">
      <div className="holo w-full max-w-md animate-[rise_320ms_var(--ease-spring)] rounded-[var(--radius-card)] p-6">
        <div className="mb-2 flex items-center gap-2">
          <span aria-hidden className="text-3xl">🧭</span>
          <h2 id="fb-title" className="text-xl font-black text-coral">{lang === 'en' ? 'Not quite — here is the rule' : 'Почти! Вот правило'}</h2>
        </div>
        <div className="mb-4">{badge}</div>
        <p className="mb-2 text-sm text-mist-dim">{lang === 'en' ? 'You chose' : 'Ты выбрал'}: <b className="text-coral">-{verdict.chosen}</b> · {lang === 'en' ? 'correct' : 'правильно'}: <b className="text-jade">-{verdict.answer}</b></p>
        <p className="mb-4 rounded-xl bg-obsidian-800/80 p-3 text-base leading-snug">{pick(verdict.explanation, lang)}</p>
        <button className="mb-4 flex w-full items-center gap-3 rounded-xl border border-turq/40 bg-turq/10 p-3 text-left" onClick={onListen}>
          <span aria-hidden className="text-xl">🔊</span>
          <span><b className="block text-base">{verdict.full}</b><span className="text-sm text-mist-dim">{translation}</span></span>
        </button>
        <button ref={btn} className="btn-solar w-full" onClick={onContinue}>{lang === 'en' ? 'Got it' : 'Түсіндім · понятно'}</button>
      </div>
    </div>
  );
}
