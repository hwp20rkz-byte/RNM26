import { createContext } from 'react';
/** «flat» — the reference line-art look; «story» — a warm feature-animation look (glow, golden hour, big sparkly eyes). */
export type Look = 'flat' | 'story';
export const LookContext = createContext<Look>('flat');
