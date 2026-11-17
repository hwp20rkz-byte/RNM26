import { describe, expect, it } from 'vitest';
import { audioKey, bases } from './kazakhVoice';

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

describe('narrator folders follow the voice chosen in the main game', () => {
  it('ISEKE by default; a Freedom Speech pack first, then ISEKE; the retired ISSAI reads as ISEKE', () => {
    expect(bases('iseke')).toEqual(['../audio-iseke/', '../audio/']);
    expect(bases('issai')).toEqual(['../audio-iseke/', '../audio/']);
    expect(bases('tomiris')).toEqual(['../audio-tomiris/', '../audio-iseke/', '../audio/']);
    expect(bases('../evil')).toEqual(['../audio-iseke/', '../audio/']);   // ids are sanitised
  });
});
