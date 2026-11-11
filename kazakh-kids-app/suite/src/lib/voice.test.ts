import { describe, expect, it } from 'vitest';
import { audioKey } from './kazakhVoice';

describe('audio key parity with the main game', () => {
  it('matches web/data.js', async () => {
    const g = globalThis as unknown as { window: Record<string, unknown> };
    g.window = {};
    // @ts-expect-error -- plain script of the main game, attaches window.QDATA
    await import('../../../web/data.js');
    const D = (g.window.QDATA as { audioKey(t: string): string });
    for (const t of ['Барыстың мүсіні сұр.', 'Мен аспа жолмен көтерілдім.', '«Шығыс күнтізбесі» — субұрқақ']) expect(audioKey(t)).toBe(D.audioKey(t));
  });
});
