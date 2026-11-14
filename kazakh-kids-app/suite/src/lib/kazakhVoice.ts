/**
 * Kazakh voice-over for full sentences. Inside the APK the suite lives in assets/suite/, next to the
 * main game's pre-rendered TTS in assets/audio/ (Piper, ISSAI/ISEKE), so the same file key works.
 * On the web the base comes from VITE_TTS_BASE; when a phrase has no recording nothing is played.
 */
const BASE: string = (import.meta.env.VITE_TTS_BASE as string | undefined) ?? '../audio/';
/**
 * The main game's narrator choice: ISEKE (default) or a Freedom Speech pack (Томирис… from tools/make-audio-fs.mjs).
 * A phrase the pack lacks plays in ISEKE; audio/ is the last resort (since 13.11.2026 it holds only character lines —
 * ISSAI was retired, a stored «issai» choice reads as ISEKE).
 */
export function bases(voice?: string): string[] {
  const iseke = BASE.replace(/audio\/$/, 'audio-iseke/');
  try {
    const v = voice ?? (JSON.parse(window.localStorage.getItem('qazaqsha-oyna-v1') || '{}') as { voice?: string }).voice;
    if (v && v !== 'iseke' && v !== 'issai' && /^[a-z0-9_-]{2,24}$/.test(v)) return [BASE.replace(/audio\/$/, 'audio-' + v + '/'), iseke, BASE];
    return [iseke, BASE];
  } catch { return [iseke, BASE]; }
}

/** Same FNV-1a key as web/data.js → QDATA.audioKey (must stay byte-identical). */
export function audioKey(t: string): string {
  const k = String(t).toLowerCase().replace(/[—–]/g, ' ').replace(/[«»"]/g, '').replace(/\s+/g, ' ').trim();
  let h = 0x811c9dc5;
  for (let i = 0; i < k.length; i++) { h ^= k.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}

let current: HTMLAudioElement | null = null;

/* ---------- lip-sync: how loud the current line is right now (0..1) ---------- */
let ctx: AudioContext | null = null, analyser: AnalyserNode | null = null, buf: Uint8Array<ArrayBuffer> | null = null;
function tap(a: HTMLAudioElement) {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = ctx ?? new AC();
    if (!analyser) { analyser = ctx.createAnalyser(); analyser.fftSize = 256; buf = new Uint8Array(new ArrayBuffer(analyser.fftSize)); analyser.connect(ctx.destination); }
    ctx.createMediaElementSource(a).connect(analyser);
    void ctx.resume?.();
  } catch { /* no Web Audio: the envelope fallback below still moves the mouth */ }
}
export const isSpeaking = () => !!current && !current.paused && !current.ended;
/** Loudness of the line being spoken: RMS from the analyser; when it reads silence (file:// in old WebViews) a
 *  syllable-like envelope keeps the mouth moving while the audio plays. */
export function speechLevel(): number {
  if (!isSpeaking()) return 0;
  if (analyser && buf) {
    analyser.getByteTimeDomainData(buf);
    let sum = 0; for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
    const rms = Math.sqrt(sum / buf.length);
    if (rms > 0.004) return Math.min(1, rms * 4);
  }
  const t = performance.now() / 1000;
  return 0.25 + 0.55 * Math.abs(Math.sin(t * 11)) * (0.6 + 0.4 * Math.sin(t * 3.1));
}
export function speakKazakh(text: string): void {
  try {
    if (current) current.pause();
    const key = audioKey(text), dirs = bases();
    const tryAt = (i: number) => {
      if (i >= dirs.length) return;                 // no recording for this phrase — stay silent
      const a = new Audio(dirs[i] + key + '.mp3');
      a.onerror = () => tryAt(i + 1);
      current = a; tap(a);
      void a.play().catch(() => undefined);
    };
    tryAt(0);
  } catch { /* audio unavailable */ }
}
