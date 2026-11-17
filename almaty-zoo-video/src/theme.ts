// Visual language: bold line art (#182232, 3.5, round), a sunny saturated palette, flat cel shading with one shadow tone
// and one highlight. All sizes are in the 1080×1920 viewBox; the render scale gives 4K (and 32K for the stills).

export const INK = '#182232';
export const LINE = { stroke: INK, strokeWidth: 3.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
export const C = {
  bg: '#EAF4FF', bg2: '#FFF6E8', card: '#FFFFFF',
  sky: '#38BDF8', sky2: '#BAE6FD', cloud: '#FFFFFF',
  emerald: '#10B981', emeraldD: '#047857', lime: '#84CC16', limeL: '#BEF264', grass: '#4ADE80',
  amber: '#FBBF24', amberD: '#D97706', gold: '#F59E0B', coral: '#FB6F6F', coralD: '#E04848', turq: '#14B8A6', turqL: '#5EEAD4',
  blue: '#2563EB', azure: '#1E9BF0', mountain: '#7DA7D9', mountainD: '#5A84BF', snow: '#F8FBFF',
  skin: '#F6C9A2', skinD: '#E7A97E', hairA: '#3A2318', hairB: '#2B1D14', cheek: '#FF9AA2', white: '#FFFFFF',
  water: '#38BDF8', waterD: '#0EA5E9', waterL: '#A5F3FC', wood: '#B7793F', woodD: '#8A5528',
  rock: '#C7CEDB', rockD: '#9AA5B8', sand: '#FDE68A', shade: '#182232'
};
export const FONT = 'Inter, "DejaVu Sans", sans-serif';
/** Scene card inside the frame (the reference layout: a header plate, a white card, subtitles below). */
export const CARD = { x: 40, y: 214, w: 1000, h: 1286, r: 52 };
