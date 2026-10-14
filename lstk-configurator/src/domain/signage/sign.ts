import type { Building } from "../buildings/generate";
import type { Opening } from "../walls/types";
import { themeOf } from "../interior/theme";

/**
 * Facade signage: volumetric letters, a lightbox or a flat panel above the
 * entrance, as a frieze along the front, or on a freestanding pylon by the
 * driveway; the same brand repeated inside as a wall graphic in the hall.
 *
 * Sizing follows the usual sign-shop rules: letter height ≈ 1/250 of the
 * reading distance for a glance (a 600 mm letter reads from ~150 m), the cap
 * height about 70 % of the box. Prices are placeholders for Kazakhstan; a
 * sign on a facade needs the akimat's outdoor-advertising permit.
 */

export type SignStyle = "letters" | "lightbox" | "panel";
export type SignFont = "sans" | "condensed" | "serif";
export type SignPlace = "entrance" | "frieze" | "pylon";

export interface SignSettings {
  enabled: boolean;
  text: string;
  sub: string;
  style: SignStyle;
  font: SignFont;
  /** Letters / face colour and the box or panel background, CSS colours */
  color: string;
  background: string;
  lit: boolean;
  /** Cap height of the main line, mm */
  height: number;
  place: SignPlace;
  /** Brand wall graphic in the main hall */
  interior: boolean;
}

export const SIGN_OFF: SignSettings = {
  enabled: false,
  text: "",
  sub: "",
  style: "letters",
  font: "condensed",
  color: "#ffffff",
  background: "#16263d",
  lit: true,
  height: 600,
  place: "entrance",
  interior: true,
};

/** A starting sign per product: the name and a sporty palette */
export function signPreset(productId: string): SignSettings {
  const name: Record<string, [string, string]> = {
    bjj: ["OSS BJJ", "Brazilian Jiu-Jitsu · Grappling"],
    fitness: ["PULSE FITNESS", "Gym · Cardio · Personal training"],
    yoga: ["PRANA", "Yoga · Stretching"],
    tabletennis: ["TOP SPIN", "Table tennis club"],
    crossfit: ["IRON BOX", "Functional training"],
  };
  const [text, sub] = name[productId] ?? ["LSTK", ""];
  const t = themeOf(productId);
  return { ...SIGN_OFF, enabled: true, text, sub, ...(t ? { color: t.letters, background: t.accent } : {}) };
}

export interface SignLayout {
  /** Plan rectangle of the sign face, mm: centre x along the front, y of the bottom edge */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Distance of the face in front of the wall, mm */
  depth: number;
  place: SignPlace;
  /** Pylon foot (plan), when on a pylon */
  pylon: { x: number; z: number; height: number } | null;
  /** Readable from, m */
  readM: number;
  areaM2: number;
  ledW: number;
  cost: number;
  notes: string[];
}

/** Average advance of a glyph as a share of the cap height */
const ADVANCE: Record<SignFont, number> = { sans: 0.72, condensed: 0.52, serif: 0.7 };

export const SIGN_PRICES = {
  /** Volumetric letters, ₸ per cm of cap height per letter (lit / unlit) */
  letterCmLit: 1300,
  letterCmUnlit: 800,
  lightboxM2: 95000,
  panelM2: 38000,
  pylon: 1600000,
  install: 120000,
};

function entrance(openings: readonly Opening[]): Opening | null {
  return [...openings].filter((o) => o.kind === "door").sort((a, b) => b.width * b.height - a.width * a.height)[0] ?? null;
}

export function signLayout(b: Building, s: SignSettings, frontOpenings: readonly Opening[]): SignLayout | null {
  if (!s.enabled || !s.text.trim()) return null;
  const { length: L } = b.input;
  const H = b.input.levels[0]!.height;
  const text = s.text.trim();
  const chars = [...text].filter((c) => c !== " ").length;
  const capH = Math.max(150, Math.min(1500, s.height));
  const textW = [...text].length * capH * ADVANCE[s.font];
  const subH = s.sub.trim() ? capH * 0.32 : 0;
  const pad = s.style === "letters" ? 0 : capH * 0.35;
  const height = capH + (subH ? subH + capH * 0.2 : 0) + 2 * pad;
  let width = Math.max(textW, [...s.sub].length * subH * 0.6) + 2 * pad;
  const notes: string[] = [];
  let x = L / 2;
  let y = H + 150;
  let pylon: SignLayout["pylon"] = null;
  if (s.place === "entrance") {
    const door = entrance(frontOpenings);
    x = door ? door.x + door.width / 2 : L / 2;
    const top = door ? door.height : 2100;
    y = Math.min(top + 350, H - height - 150);
    if (y < top + 100) notes.push("tooTall");
  } else if (s.place === "frieze") {
    // A band along the top of the front wall, under the eaves
    y = H - height - 150;
    width = Math.min(width, L - 2000);
  } else {
    const ph = Math.max(4000, height + 2500);
    // By the driveway, clear of the aisle (see the site plan)
    pylon = { x: -1500 - 9000, z: -3000 - 5300 - 6000 - 2500, height: ph };
    x = pylon.x;
    y = ph - height - 200;
    width = Math.min(width, 2400);
  }
  if (width > L - 600 && s.place !== "pylon") notes.push("tooWide");
  const areaM2 = (width * height) / 1e6;
  const ledW = s.lit ? areaM2 * (s.style === "letters" ? 60 : 120) : 0;
  const body =
    s.style === "letters" ? chars * (capH / 10) * (s.lit ? SIGN_PRICES.letterCmLit : SIGN_PRICES.letterCmUnlit) + (subH ? areaM2 * 0.25 * SIGN_PRICES.panelM2 : 0) : areaM2 * (s.style === "lightbox" ? SIGN_PRICES.lightboxM2 : SIGN_PRICES.panelM2);
  const cost = body + (pylon ? SIGN_PRICES.pylon : 0) + SIGN_PRICES.install;
  notes.push("permit");
  return { x, y, width, height, depth: s.style === "panel" ? 40 : 120, place: s.place, pylon, readM: Math.round((capH * 250) / 1000), areaM2, ledW, cost, notes };
}
