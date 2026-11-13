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
export function speakKazakh(text: string): void {
  try {
    if (current) current.pause();
    const key = audioKey(text), dirs = bases();
    const tryAt = (i: number) => {
      if (i >= dirs.length) return;                 // no recording for this phrase — stay silent
      const a = new Audio(dirs[i] + key + '.mp3');
      a.onerror = () => tryAt(i + 1);
      current = a;
      void a.play().catch(() => undefined);
    };
    tryAt(0);
  } catch { /* audio unavailable */ }
}
