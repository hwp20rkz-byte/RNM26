import type { FinishChoice } from "../finishes/catalog";

/**
 * Design themes of the sports clubs: a calm light base and one or two brand
 * colours used with restraint — the lower wall band of the hall (or the
 * padding in a mat hall), the changing-room tiles, the sign and the stripes.
 * Outside: a contemporary European facade — graphite fibre-cement boards,
 * a standing-seam roof, black frames, oak slats and a canopy at the door.
 */
export interface SportTheme {
  /** Upper walls and ceilings */
  wall: string;
  /** Main brand colour: lower wall band / padding, sign background */
  accent: string;
  /** Second brand colour: competition area, stripes */
  accent2: string;
  /** Changing-room and WC wall tiles */
  tile: string;
  /** Sign letters */
  letters: string;
}

export const THEMES: Record<string, SportTheme> = {
  bjj: { wall: "hsl(40 12% 95%)", accent: "#16263d", accent2: "#c81e3a", tile: "hsl(210 10% 82%)", letters: "#ffffff" },
  fitness: { wall: "hsl(0 0% 95%)", accent: "#23262b", accent2: "#9bd12a", tile: "hsl(0 0% 78%)", letters: "#9bd12a" },
  yoga: { wall: "hsl(36 30% 90%)", accent: "#7f9c7a", accent2: "#d9b48f", tile: "hsl(36 20% 84%)", letters: "#ffffff" },
  tabletennis: { wall: "hsl(210 20% 96%)", accent: "#1f4fa3", accent2: "#e8590c", tile: "hsl(205 25% 84%)", letters: "#ffffff" },
  crossfit: { wall: "hsl(0 0% 92%)", accent: "#111111", accent2: "#e8590c", tile: "hsl(0 0% 70%)", letters: "#e8590c" },
};

export const themeOf = (productId: string): SportTheme | null => THEMES[productId] ?? null;

/** Contemporary European facade for a club */
export const CLUB_FINISHES: Partial<FinishChoice> = {
  facade: "fibreCement",
  facadeColor: "hsl(210 6% 30%)",
  roofing: "seam",
  roofColor: "hsl(210 10% 20%)",
  trimColor: "hsl(0 0% 9%)",
};
