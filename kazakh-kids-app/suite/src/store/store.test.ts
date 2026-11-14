import { describe, expect, it } from 'vitest';
import { levelOf, nextStreak, xpForLevel } from './useGameStore';

describe('progression', () => {
  it('levels', () => {
    expect(levelOf(0)).toEqual({ level: 1, into: 0, need: 100 });
    expect(levelOf(100).level).toBe(2);
    expect(levelOf(249)).toEqual({ level: 2, into: 149, need: 150 });
    expect(xpForLevel(3)).toBe(200);
  });
  it('streak', () => {
    expect(nextStreak('2026-11-10', '2026-11-11', 3)).toBe(4);
    expect(nextStreak('2026-11-11', '2026-11-11', 3)).toBe(3);
    expect(nextStreak('2026-11-01', '2026-11-11', 3)).toBe(1);
    expect(nextStreak(null, '2026-11-11', 0)).toBe(1);
  });
});
