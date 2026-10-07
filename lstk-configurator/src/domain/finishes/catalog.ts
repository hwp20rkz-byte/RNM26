/**
 * Finishes library. Prices are indicative Kazakhstan retail (₸, 2026) for the
 * material, labour separately — replace with the supplier's quote. Mass per m²
 * feeds the delivery weight; `waste` covers laps, cuts and trims.
 */
export type FinishZone = "facade" | "roofing" | "interior" | "wet" | "steam" | "floor" | "plinth";

export interface Finish {
  id: string;
  zone: FinishZone;
  /** Display colour for the 3D view (HSL string) */
  color: string;
  /** Material, ₸/m² */
  price: number;
  /** Labour, ₸/m² */
  labour: number;
  kgPerM2: number;
  waste: number;
  /** Pattern hint for the 3D material */
  look: "smooth" | "ribbed" | "boards" | "tiles" | "standing-seam" | "shingles" | "stone";
}

export const FINISHES: Finish[] = [
  // Facade
  { id: "profsheet", zone: "facade", color: "hsl(200 8% 62%)", price: 3200, labour: 1500, kgPerM2: 4.4, waste: 0.1, look: "ribbed" },
  { id: "metalSiding", zone: "facade", color: "hsl(32 30% 74%)", price: 4200, labour: 2000, kgPerM2: 4.7, waste: 0.12, look: "boards" },
  { id: "blockhouse", zone: "facade", color: "hsl(28 48% 46%)", price: 5200, labour: 2200, kgPerM2: 5, waste: 0.12, look: "boards" },
  { id: "fibreCement", zone: "facade", color: "hsl(210 6% 34%)", price: 9500, labour: 3500, kgPerM2: 14, waste: 0.1, look: "boards" },
  { id: "plaster", zone: "facade", color: "hsl(40 25% 92%)", price: 6500, labour: 4500, kgPerM2: 18, waste: 0.05, look: "smooth" },
  { id: "planken", zone: "facade", color: "hsl(24 40% 36%)", price: 11000, labour: 4000, kgPerM2: 12, waste: 0.15, look: "boards" },
  // Roofing
  { id: "roofProfsheet", zone: "roofing", color: "hsl(4 52% 38%)", price: 3600, labour: 1600, kgPerM2: 5, waste: 0.12, look: "ribbed" },
  { id: "metalTile", zone: "roofing", color: "hsl(160 20% 26%)", price: 4300, labour: 2000, kgPerM2: 5, waste: 0.18, look: "tiles" },
  { id: "seam", zone: "roofing", color: "hsl(210 10% 22%)", price: 7800, labour: 3500, kgPerM2: 5.5, waste: 0.1, look: "standing-seam" },
  { id: "shingles", zone: "roofing", color: "hsl(15 30% 30%)", price: 6800, labour: 3000, kgPerM2: 8 + 4.2, waste: 0.1, look: "shingles" },
  // Interior walls & ceilings
  { id: "gklPaint", zone: "interior", color: "hsl(40 20% 95%)", price: 2600, labour: 3800, kgPerM2: 9.5, waste: 0.1, look: "smooth" },
  { id: "lining", zone: "interior", color: "hsl(36 55% 72%)", price: 4200, labour: 2500, kgPerM2: 8, waste: 0.12, look: "boards" },
  { id: "gvl", zone: "interior", color: "hsl(36 12% 88%)", price: 3400, labour: 4200, kgPerM2: 13, waste: 0.1, look: "smooth" },
  { id: "osbOpen", zone: "interior", color: "hsl(38 50% 62%)", price: 2400, labour: 1200, kgPerM2: 7.5, waste: 0.08, look: "smooth" },
  // Wet rooms
  { id: "gklvTile", zone: "wet", color: "hsl(195 20% 86%)", price: 9000, labour: 8000, kgPerM2: 28, waste: 0.1, look: "tiles" },
  { id: "cspTile", zone: "wet", color: "hsl(200 10% 80%)", price: 9800, labour: 8500, kgPerM2: 34, waste: 0.1, look: "tiles" },
  // Steam room: foil vapour barrier + aspen/linden lining
  { id: "aspen", zone: "steam", color: "hsl(45 45% 80%)", price: 7500, labour: 3500, kgPerM2: 9, waste: 0.15, look: "boards" },
  { id: "linden", zone: "steam", color: "hsl(40 55% 74%)", price: 9500, labour: 3500, kgPerM2: 9, waste: 0.15, look: "boards" },
  // Floors
  { id: "laminate", zone: "floor", color: "hsl(30 35% 56%)", price: 5200, labour: 1800, kgPerM2: 8, waste: 0.08, look: "boards" },
  { id: "linoleum", zone: "floor", color: "hsl(30 15% 60%)", price: 3200, labour: 1200, kgPerM2: 3, waste: 0.1, look: "smooth" },
  { id: "tile", zone: "floor", color: "hsl(30 8% 70%)", price: 6500, labour: 6500, kgPerM2: 22, waste: 0.1, look: "tiles" },
  { id: "deck", zone: "floor", color: "hsl(26 40% 44%)", price: 9000, labour: 3500, kgPerM2: 20, waste: 0.12, look: "boards" },
  { id: "concrete", zone: "floor", color: "hsl(0 0% 66%)", price: 1500, labour: 1500, kgPerM2: 2, waste: 0.05, look: "smooth" },
  // Plinth
  { id: "plinthProfsheet", zone: "plinth", color: "hsl(210 8% 30%)", price: 3200, labour: 1500, kgPerM2: 4.4, waste: 0.1, look: "ribbed" },
  { id: "plinthStone", zone: "plinth", color: "hsl(30 8% 45%)", price: 7500, labour: 5000, kgPerM2: 25, waste: 0.1, look: "stone" },
];

export function finish(id: string): Finish {
  const f = FINISHES.find((x) => x.id === id);
  if (!f) throw new Error(`Нет отделки ${id}`);
  return f;
}

export const finishesFor = (zone: FinishZone) => FINISHES.filter((f) => f.zone === zone);

/** Colour palette for metal finishes (RAL approximations as HSL) */
export const RAL: { id: string; hsl: string }[] = [
  { id: "RAL 7024", hsl: "hsl(204 9% 27%)" },
  { id: "RAL 8017", hsl: "hsl(10 22% 22%)" },
  { id: "RAL 3005", hsl: "hsl(350 45% 22%)" },
  { id: "RAL 6005", hsl: "hsl(160 50% 18%)" },
  { id: "RAL 5005", hsl: "hsl(212 70% 30%)" },
  { id: "RAL 9003", hsl: "hsl(40 10% 94%)" },
  { id: "RAL 1015", hsl: "hsl(40 40% 82%)" },
  { id: "RAL 7004", hsl: "hsl(0 0% 60%)" },
  { id: "RAL 9005", hsl: "hsl(0 0% 9%)" },
];

export interface FinishChoice {
  facade: string;
  facadeColor: string;
  roofing: string;
  roofColor: string;
  trimColor: string;
  interior: string;
  wet: string;
  steam: string;
  floor: string;
  plinth: string;
}

export const DEFAULT_FINISHES: FinishChoice = {
  facade: "metalSiding",
  facadeColor: "hsl(40 40% 82%)",
  roofing: "metalTile",
  roofColor: "hsl(204 9% 27%)",
  trimColor: "hsl(204 9% 27%)",
  interior: "gklPaint",
  wet: "gklvTile",
  steam: "aspen",
  floor: "laminate",
  plinth: "plinthProfsheet",
};
