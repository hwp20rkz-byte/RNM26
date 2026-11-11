/* Voice personas: SSML for Azure Speech, request bodies for ElevenLabs, and the offline Piper stand-in
 * that is actually bundled in the APK. Source of truth: src/voice/personas.json (also read by
 * tools/make-audio.py and tools/collect-phrases.js, so the bundle and the audio never drift apart).
 *
 * Honest status: the APK speaks with Piper models (ISSAI KazakhTTS2 speakers shaped by pitch/tempo;
 * ISEKE for the narrator). Azure kk-KZ neural voices and ElevenLabs are specs for a later studio pass —
 * Kazakh support of a given ElevenLabs model must be checked before relying on it. */
import data from './personas.json';
import type { PersonaId } from '../data/types';

export interface Persona {
  name: string; role: string;
  acoustics: { pitchSt: number; speed: number; energy: string; emotion: string };
  piper: { speaker?: number; lengthScale?: number; pitchSt?: number; filter?: string; tag?: string };
  azure: { voice: string; pitch: string; rate: string; volume: string };
  elevenlabs: { description: string; stability: number; similarity_boost: number; style: number; speed: number };
}

export const PERSONAS = data.personas as Record<PersonaId, Persona>;
export const LINES = data.lines as Record<'ATA' | 'ZHALKAU' | 'ALIBEK' | 'APAI', Record<string, string>>;

/** Voice tag used by tools/make-audio.py for a persona (APAI shares the narrator tag). */
export function audioTag(id: PersonaId): string { return PERSONAS[id].piper.tag || id; }

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Azure Speech SSML for one line. `[ұқұпту]`-style transcriptions are not sent: Azure reads the spelling. */
export function ssml(id: PersonaId, text: string): string {
  const p = PERSONAS[id].azure;
  return '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="kk-KZ">' +
    '<voice name="' + p.voice + '"><prosody pitch="' + p.pitch + '" rate="' + p.rate + '" volume="' + p.volume + '">' +
    xmlEscape(text) + '</prosody></voice></speak>';
}

/** ElevenLabs text-to-speech request body (POST /v1/text-to-speech/{voice_id}); the voice itself is designed from `description`. */
export function elevenLabsRequest(id: PersonaId, text: string, modelId = 'eleven_multilingual_v2'): Record<string, unknown> {
  const e = PERSONAS[id].elevenlabs;
  return { text, model_id: modelId, voice_settings: { stability: e.stability, similarity_boost: e.similarity_boost, style: e.style, speed: e.speed } };
}

/** Prompt for designing the persona voice in a voice-design tool. */
export function voiceDesignPrompt(id: PersonaId): string {
  const p = PERSONAS[id];
  return p.elevenlabs.description + '. Native Kazakh pronunciation (vowel harmony, қ ғ ң ө ү ұ і ә). Emotion: ' + p.acoustics.emotion +
    '. Pitch ' + (p.acoustics.pitchSt >= 0 ? '+' : '') + p.acoustics.pitchSt + ' semitones, speed ' + p.acoustics.speed + 'x.';
}
