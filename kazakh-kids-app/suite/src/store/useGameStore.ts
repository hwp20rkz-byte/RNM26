/**
 * Global progression shared by every 3D game: XP and level, streak of play days, best combo,
 * graphics quality tier. Persisted; per-round state lives inside each game's reducer.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Quality } from '../types/game.types';
import { safeJSONStorage } from './safeStorage';

export type GameId = 'totem-cases' | 'hyperloop' | 'monoliths' | 'anagram' | 'baiterek' | 'gravity' | 'city' | 'lego';

/** XP needed to reach level n+1 grows gently: 100, 150, 200, … */
export const xpForLevel = (level: number): number => 100 + (level - 1) * 50;
export function levelOf(xp: number): { level: number; into: number; need: number } {
  let level = 1, left = xp;
  while (left >= xpForLevel(level)) { left -= xpForLevel(level); level++; }
  return { level, into: left, need: xpForLevel(level) };
}
const day = (d = new Date()) => d.toISOString().slice(0, 10);
export function nextStreak(last: string | null, today: string, streak: number): number {
  if (last === today) return streak;
  const y = new Date(today + 'T00:00:00Z'); y.setUTCDate(y.getUTCDate() - 1);
  return last === y.toISOString().slice(0, 10) ? streak + 1 : 1;
}

export interface SessionResult { game: GameId; xp: number; correct: number; total: number; bestCombo: number; won: boolean }

interface GameState {
  xp: number;
  streak: number;
  lastDay: string | null;
  bestCombo: number;
  quality: Quality | 'auto';
  activeGame: GameId | null;
  best: Partial<Record<GameId, number>>;
  sessions: number;
  setActiveGame(g: GameId | null): void;
  setQuality(q: Quality | 'auto'): void;
  /** Called once at the end of a round. Returns true when the level went up. */
  finishSession(r: SessionResult): boolean;
}

export const useGameStore = create<GameState>()(persist((set, get) => ({
  xp: 0, streak: 0, lastDay: null, bestCombo: 0, quality: 'auto', activeGame: null, best: {}, sessions: 0,
  setActiveGame: (g) => set({ activeGame: g }),
  setQuality: (q) => set({ quality: q }),
  finishSession: (r) => {
    const s = get(), before = levelOf(s.xp).level, xp = s.xp + r.xp, today = day();
    const pct = r.total ? Math.round(r.correct / r.total * 100) : 0;
    set({
      xp, streak: nextStreak(s.lastDay, today, s.streak), lastDay: today, sessions: s.sessions + 1,
      bestCombo: Math.max(s.bestCombo, r.bestCombo), best: { ...s.best, [r.game]: Math.max(s.best[r.game] ?? 0, pct) }
    });
    return levelOf(xp).level > before;
  }
}), { name: 'qv3d-game', storage: safeJSONStorage, version: 1, partialize: (s) => ({ xp: s.xp, streak: s.streak, lastDay: s.lastDay, bestCombo: s.bestCombo, quality: s.quality, best: s.best, sessions: s.sessions }) }));
