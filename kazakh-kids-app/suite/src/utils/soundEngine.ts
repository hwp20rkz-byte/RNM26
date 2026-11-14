/**
 * Procedural sound engine — every effect is synthesized with the Web Audio API at runtime, so the
 * suite ships with zero audio files for SFX (Kazakh speech is separate: see lib/kazakhVoice.ts).
 *
 * Design: one AudioContext (created on the first user gesture — mobile browsers block it before),
 * master gain → dynamics compressor → destination. Each sfx is a tiny graph that schedules itself and
 * disconnects when done. Optional 3D position uses an HRTF PannerNode; the listener follows the camera.
 */
import type { Sfx, Vec3 } from '../types/game.types';

type Ctx = AudioContext;

export class SoundEngine {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private volume = 0.8;
  private muted = false;

  /** Must be called from a user gesture (pointerdown / click). Safe to call many times. */
  unlock(): void {
    if (this.ctx) { if (this.ctx.state === 'suspended') void this.ctx.resume(); return; }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
    const master = ctx.createGain(); master.gain.value = this.muted ? 0 : this.volume;
    master.connect(comp).connect(ctx.destination);
    // 1 s of white noise reused by snap / whoosh / shockwave
    const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.ctx = ctx; this.master = master; this.noise = noise;
  }

  setVolume(v: number): void { this.volume = Math.max(0, Math.min(1, v)); this.apply(); }
  setMuted(m: boolean): void { this.muted = m; this.apply(); }
  private apply(): void { if (this.ctx && this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.02); }

  /** Keep the 3D listener at the camera (called from the render loop, throttled by the caller). */
  setListener(pos: Vec3, forward: Vec3): void {
    const l = this.ctx?.listener; if (!l) return;
    if (l.positionX) {
      const t = this.ctx!.currentTime;
      l.positionX.setValueAtTime(pos[0], t); l.positionY.setValueAtTime(pos[1], t); l.positionZ.setValueAtTime(pos[2], t);
      l.forwardX.setValueAtTime(forward[0], t); l.forwardY.setValueAtTime(forward[1], t); l.forwardZ.setValueAtTime(forward[2], t);
    } else {
      (l as unknown as { setPosition(x: number, y: number, z: number): void }).setPosition(...pos);
    }
  }

  play(sfx: Sfx, opts: { at?: Vec3; gain?: number; pitch?: number } = {}): void {
    const ctx = this.ctx, master = this.master; if (!ctx || !master || this.muted) return;
    const out = ctx.createGain(); out.gain.value = opts.gain ?? 1;
    if (opts.at) {
      const p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 4; p.rolloffFactor = 0.6;
      p.positionX.value = opts.at[0]; p.positionY.value = opts.at[1]; p.positionZ.value = opts.at[2];
      out.connect(p).connect(master);
    } else out.connect(master);
    const t = ctx.currentTime + 0.005, k = opts.pitch ?? 1;
    const end = this.voices[sfx](ctx, out, t, k);
    setTimeout(() => { try { out.disconnect(); } catch { /* already gone */ } }, (end - ctx.currentTime) * 1000 + 200);
  }

  /* ---------------------------------------------------------------- building blocks */

  private tone(ctx: Ctx, dst: AudioNode, type: OscillatorType, f0: number, f1: number, t: number, dur: number, peak: number, attack = 0.005): number {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dst); o.start(t); o.stop(t + dur + 0.02);
    return t + dur;
  }
  private noiseBurst(ctx: Ctx, dst: AudioNode, t: number, dur: number, peak: number, filter: BiquadFilterType, f0: number, f1: number, q = 1): number {
    const s = ctx.createBufferSource(); s.buffer = this.noise;
    const bq = ctx.createBiquadFilter(); bq.type = filter; bq.Q.value = q; bq.frequency.setValueAtTime(f0, t); bq.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(bq).connect(g).connect(dst); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
    return t + dur;
  }
  /** Short feedback-delay «air» so chimes ring in space. */
  private echo(ctx: Ctx, src: AudioNode, dst: AudioNode, time = 0.18, fb = 0.35): AudioNode {
    const d = ctx.createDelay(1), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    d.delayTime.value = time; g.gain.value = fb; lp.type = 'lowpass'; lp.frequency.value = 3500;
    src.connect(d).connect(lp).connect(g).connect(d); lp.connect(dst);
    return src;
  }

  /* ---------------------------------------------------------------- the effects */

  private readonly voices: Record<Sfx, (ctx: Ctx, out: GainNode, t: number, k: number) => number> = {
    // success: bright major arpeggio with a soft echo tail (C6–E6–G6–C7)
    chime: (ctx, out, t, k) => {
      const bus = ctx.createGain(); bus.connect(out); this.echo(ctx, bus, out);
      let end = t;
      [1046.5, 1318.5, 1568, 2093].forEach((f, i) => {
        end = Math.max(end, this.tone(ctx, bus, 'sine', f * k, f * k, t + i * 0.07, 0.55, 0.28));
        this.tone(ctx, bus, 'triangle', f * 2 * k, f * 2 * k, t + i * 0.07, 0.25, 0.05);
      });
      return end + 0.6;
    },
    // magnetic snap: click + filtered noise «clack»
    snap: (ctx, out, t, k) => {
      this.tone(ctx, out, 'square', 1800 * k, 600 * k, t, 0.04, 0.25, 0.001);
      return this.noiseBurst(ctx, out, t, 0.09, 0.5, 'bandpass', 3200 * k, 1200 * k, 3);
    },
    // energy beam: sawtooth sweep through a closing lowpass, plus a sub thump
    beam: (ctx, out, t, k) => {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 8;
      lp.frequency.setValueAtTime(600, t); lp.frequency.exponentialRampToValueAtTime(5000, t + 0.12); lp.frequency.exponentialRampToValueAtTime(400, t + 0.4);
      lp.connect(out);
      this.tone(ctx, lp, 'sawtooth', 180 * k, 1400 * k, t, 0.38, 0.22);
      this.tone(ctx, lp, 'sawtooth', 182 * k, 1420 * k, t, 0.38, 0.18);
      return this.tone(ctx, out, 'sine', 90 * k, 45 * k, t, 0.3, 0.4);
    },
    // wrong: low detuned square buzz with tremolo
    buzz: (ctx, out, t, k) => {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(out);
      const trem = ctx.createGain(), lfo = ctx.createOscillator(), depth = ctx.createGain();
      lfo.frequency.value = 18; depth.gain.value = 0.5; lfo.connect(depth).connect(trem.gain); trem.gain.value = 0.5; trem.connect(lp);
      lfo.start(t); lfo.stop(t + 0.4);
      this.tone(ctx, trem, 'square', 110 * k, 96 * k, t, 0.34, 0.3);
      return this.tone(ctx, trem, 'square', 116 * k, 100 * k, t, 0.34, 0.25);
    },
    whoosh: (ctx, out, t, k) => this.noiseBurst(ctx, out, t, 0.45, 0.35, 'bandpass', 300 * k, 2600 * k, 1.5),
    // level up / victory: rising pentatonic run with shimmer
    levelUp: (ctx, out, t, k) => {
      const bus = ctx.createGain(); bus.connect(out); this.echo(ctx, bus, out, 0.22, 0.4);
      let end = t;
      [523.3, 659.3, 784, 1046.5, 1318.5, 1568].forEach((f, i) => { end = this.tone(ctx, bus, 'triangle', f * k, f * k, t + i * 0.09, 0.5, 0.22); });
      this.noiseBurst(ctx, bus, t + 0.4, 0.8, 0.06, 'highpass', 6000, 9000, 0.7);
      return end + 0.8;
    },
    tap: (ctx, out, t, k) => this.tone(ctx, out, 'sine', 880 * k, 660 * k, t, 0.06, 0.18, 0.002),
    // shockwave: sub drop + wide noise bloom
    shockwave: (ctx, out, t, k) => {
      this.tone(ctx, out, 'sine', 120 * k, 38 * k, t, 0.7, 0.6, 0.004);
      return this.noiseBurst(ctx, out, t, 0.6, 0.3, 'lowpass', 4000, 200, 0.7);
    }
  };
}

/** App-wide singleton (the audio store wraps it for React). */
export const soundEngine = new SoundEngine();
