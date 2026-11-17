import type { Localized } from '../types/game.types';
export type PossKey = 'men' | 'sen' | 'ol' | 'biz' | 'pl';
export interface LegoNoun extends Localized { kk: string; e: string; forms: Record<PossKey, string> }
export type PoseKey = 'отыр' | 'тұр' | 'жатыр' | 'тастады';
export interface PoseVerb extends Localized { stem: string; obj: string; objAcc: string; e: string; forms: Record<PoseKey, string> }
