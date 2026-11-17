import { interpolate, spring } from 'remotion';
import lipsync from './lipsync.json';

/** A pop-in spring from a start time (seconds, relative to the scene). */
export const pop = (frame: number, fps: number, at: number, damping = 11) =>
  spring({ frame: frame - Math.round(at * fps), fps, config: { damping, stiffness: 140, mass: 0.8 } });
/** Ease 0→1 over [a, b] seconds. */
export const ramp = (frame: number, fps: number, a: number, b: number) =>
  interpolate(frame / fps, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (x) => 1 - Math.pow(1 - x, 3) });
/** Natural blinking: a quick close every ~2.4–3.4 s, phase from a seed so characters do not blink together. Returns eye scaleY. */
export function blink(frame: number, fps: number, seed: number): number {
  const period = 2.4 + (seed % 7) * 0.15, t = (frame / fps + seed * 0.37) % period;
  return t < 0.12 ? Math.max(0.08, Math.abs(t - 0.06) / 0.06) : 1;
}
/** Mouth opening 0..1 for a voiced line playing from `at` (seconds, scene time). */
export function mouth(frame: number, fps: number, file: string | undefined, at: number): number {
  if (!file) return 0;
  const env = (lipsync as Record<string, number[]>)[file]; if (!env) return 0;
  const i = Math.floor(frame - at * fps);
  if (i < 0 || i >= env.length) return 0;
  const v = (env[i] + (env[i - 1] ?? env[i]) + (env[i + 1] ?? env[i])) / 3;   // smoothed, so the jaw does not jitter
  return v < 0.08 ? 0 : Math.min(1, v);
}
export const wave = (frame: number, fps: number, hz: number, phase = 0) => Math.sin((frame / fps) * Math.PI * 2 * hz + phase);
