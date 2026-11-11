/** React-facing wrapper of the procedural sound engine: mute / volume persisted, play() anywhere. */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Sfx, Vec3 } from '../types/game.types';
import { soundEngine } from '../utils/soundEngine';
import { safeJSONStorage } from './safeStorage';

interface AudioState {
  muted: boolean;
  volume: number;
  /** Kazakh voice-over of full sentences (bundled TTS from the main game when available). */
  voice: boolean;
  toggleMute(): void;
  setVolume(v: number): void;
  toggleVoice(): void;
  play(sfx: Sfx, opts?: { at?: Vec3; gain?: number; pitch?: number }): void;
}

export const useAudioStore = create<AudioState>()(persist((set, get) => ({
  muted: false, volume: 0.8, voice: true,
  toggleMute: () => { const m = !get().muted; soundEngine.setMuted(m); set({ muted: m }); },
  setVolume: (v) => { soundEngine.setVolume(v); set({ volume: v }); },
  toggleVoice: () => set({ voice: !get().voice }),
  play: (sfx, opts) => soundEngine.play(sfx, opts)
}), {
  name: 'qv3d-audio', storage: safeJSONStorage, version: 1,
  partialize: (s) => ({ muted: s.muted, volume: s.volume, voice: s.voice }),
  onRehydrateStorage: () => (s) => { if (s) { soundEngine.setMuted(s.muted); soundEngine.setVolume(s.volume); } }
}));

/** Unlock audio on the first gesture anywhere in the app (mobile autoplay policy). */
export function installAudioUnlock(): void {
  const unlock = () => { soundEngine.unlock(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
  window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);
}
