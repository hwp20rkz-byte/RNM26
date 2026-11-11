/* Shared bits of the TypeScript mini-games: 3D stage with graceful 2D fallback, hearts, finishing. */
import type { GameApi, QV3DApi, Stage3D } from '../types/app';

export function v3d(): QV3DApi | null { const V = window.QV3D; return V && V.ok() ? V : null; }

export function stageIn(el: HTMLElement, o: Parameters<QV3DApi['stage']>[1]): { V: QV3DApi; S: Stage3D } | null {
  const V = v3d(); if (!V) return null;
  const S = V.stage(el, o); return S ? { V, S } : null;
}

export function heartsHtml(n: number, max: number): string {
  let h = ''; for (let i = 0; i < max; i++) h += i < n ? '❤️' : '🤍'; return h;
}

interface TopicApi { done(api: GameApi, id: string, cfg: unknown, score: number, total: number, extra?: Record<string, unknown>): void }

/** Store the best first-try percent in S.topic (teacher sheet) and show the standard end screen. */
export function finishTopic(api: GameApi, id: string, firstTry: number, total: number, extra?: Record<string, unknown>): void {
  const T = (window as unknown as { QTOPIC?: TopicApi }).QTOPIC;
  if (T) return T.done(api, id, null, firstTry, total, extra);
  const pct = total ? Math.round(firstTry / total * 100) : 0;
  api.S.topic = api.S.topic || {}; api.S.topic[id] = Math.max(api.S.topic[id] || 0, pct);
  api.end({ score: firstTry, scoreText: firstTry + ' / ' + total, coins: Math.round(firstTry * 1.5), topic: true, ...extra });
}

/** Small tween helper on top of the stage ticker. */
export function tween(S: Stage3D, ms: number, step: (k: number) => void, done?: () => void): void {
  const t0 = performance.now(); let fin = false;
  S.onTick(() => {
    if (fin) return;
    const k = Math.min(1, (performance.now() - t0) / ms);
    step(k * k * (3 - 2 * k));
    if (k >= 1) { fin = true; if (done) done(); }
  });
}
