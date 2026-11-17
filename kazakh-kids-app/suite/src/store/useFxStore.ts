/** Transient «juice» state shared by the 3D scene and the UI: camera trauma (shake) and spring focus. */
import { create } from 'zustand';
import type { Vec3 } from '../types/game.types';

interface FxState {
  trauma: number;
  camTarget: Vec3;
  lookTarget: Vec3;
  /** Add camera trauma (0..1); shake strength is trauma² so small hits stay subtle. */
  shake(amount: number): void;
  focus(cam: Vec3, look: Vec3): void;
  decay(dt: number): void;
}

export const useFxStore = create<FxState>()((set, get) => ({
  trauma: 0, camTarget: [0, 3.2, 11], lookTarget: [0, 2.2, 0],
  shake: (a) => set({ trauma: Math.min(1, get().trauma + a) }),
  focus: (cam, look) => set({ camTarget: cam, lookTarget: look }),
  decay: (dt) => { const t = get().trauma; if (t > 0) set({ trauma: Math.max(0, t - dt * 1.6) }); }
}));

export const prefersReducedMotion = (): boolean => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};
