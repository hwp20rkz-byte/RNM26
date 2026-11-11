/**
 * Kazakh voice-over for full sentences. Inside the APK the suite lives in assets/suite/, next to the
 * main game's pre-rendered TTS in assets/audio/ (Piper, ISSAI/ISEKE), so the same file key works.
 * On the web the base comes from VITE_TTS_BASE; when a phrase has no recording nothing is played.
 */
const BASE: string = (import.meta.env.VITE_TTS_BASE as string | undefined) ?? '../audio/';
/** The main game's narrator choice: ISEKE (default) has its own folder; ISSAI covers everything. */
function bases(): string[] {
  try {
    const v = (JSON.parse(window.localStorage.getItem('qazaqsha-oyna-v1') || '{}') as { voice?: string }).voice;
    return v === 'issai' ? [BASE] : [BASE.replace(/audio\/$/, 'audio-iseke/'), BASE];
  } catch { return [BASE]; }
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
