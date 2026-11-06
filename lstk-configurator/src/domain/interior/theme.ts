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
  pilates: { wall: "hsl(30 25% 93%)", accent: "#c9a38a", accent2: "#5e6b57", tile: "hsl(30 18% 86%)", letters: "#ffffff" },
  golfsim: { wall: "hsl(150 8% 90%)", accent: "#0f3b2e", accent2: "#c8a24a", tile: "hsl(150 8% 80%)", letters: "#c8a24a" },
  boulder: { wall: "hsl(0 0% 94%)", accent: "#1d4e89", accent2: "#f2542d", tile: "hsl(205 12% 80%)", letters: "#ffffff" },
  // Commercial pavilions: the sign and the interior accents
  coffee: { wall: "hsl(30 20% 92%)", accent: "#2b2420", accent2: "#c27c3e", tile: "hsl(30 15% 82%)", letters: "#f3e3c3" },
  pvz: { wall: "hsl(0 0% 96%)", accent: "#6b2bd6", accent2: "#ff2d87", tile: "hsl(0 0% 85%)", letters: "#ffffff" },
  carwash: { wall: "hsl(200 20% 94%)", accent: "#0a5bd6", accent2: "#ffcc00", tile: "hsl(200 30% 82%)", letters: "#ffffff" },
  esports: { wall: "hsl(230 10% 22%)", accent: "#0b0d17", accent2: "#7b2ff7", tile: "hsl(230 8% 40%)", letters: "#28e0ff" },
  evhub: { wall: "hsl(0 0% 96%)", accent: "#0f6d4a", accent2: "#38d39f", tile: "hsl(0 0% 85%)", letters: "#ffffff" },
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
