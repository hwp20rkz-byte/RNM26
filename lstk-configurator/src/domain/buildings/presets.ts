import type { Opening } from "../walls/types";
import type { BuildingInput, BuildingPreset } from "./types";

const P = "C89x41x11x0.95";
const none = { front: [], back: [], left: [], right: [] };
const w = (id: string, x: number, width = 1200, height = 1400, sill = 900): Opening => ({ id, kind: "window", x, width, height, sill });
const door = (id: string, x: number, width = 900, height = 2100): Opening => ({ id, kind: "door", x, width, height, sill: 0 });
const gate = (id: string, x: number, width: number, height: number): Opening => ({ id, kind: "gate", x, width, height, sill: 0 });

const base: Omit<BuildingInput, "length" | "width" | "openings"> = {
  kind: "enclosed",
  wallHeight: 2700,
  pitchDeg: 25,
  trussPattern: "howe",
  trussPanels: 6,
  trussSpacing: 600,
  studSpacing: 600,
  overhang: 450,
  postSpacing: 3000,
  profileId: P,
};

/**
 * Starting points, not standard designs: the sizes are typical of the market,
 * stud/truss spacing follows common 600 mm practice for 89 mm framing.
 */
export const BUILDING_PRESETS: BuildingPreset[] = [
  {
    id: "bath",
    name: "Баня 4 × 6 м",
    input: { ...base, length: 6000, width: 4000, wallHeight: 2400, trussPanels: 4, openings: { ...none, front: [door("d1", 600, 800, 1900), w("w1", 3600, 800, 600, 1300)], left: [w("w2", 1300, 900, 900, 1000)] } },
  },
  {
    id: "house",
    name: "Дом 8 × 10 м",
    input: {
      ...base,
      length: 10000,
      width: 8000,
      trussPanels: 8,
      openings: {
        front: [w("w1", 900, 1500), door("d1", 3400, 1000, 2100), w("w2", 5200, 1500), w("w3", 7700, 1500)],
        back: [w("w4", 1500, 1200), w("w5", 4600, 1200), w("w6", 7400, 1200)],
        left: [w("w7", 2900, 1800)],
        right: [w("w8", 1500, 1200), w("w9", 4800, 1200)],
      },
    },
  },
  {
    id: "shed",
    name: "Хозблок 3 × 4 м",
    input: { ...base, length: 4000, width: 3000, wallHeight: 2400, pitchDeg: 20, trussPanels: 4, openings: { ...none, front: [door("d1", 1500, 900, 2000)] } },
  },
  {
    id: "garage",
    name: "Гараж 6 × 8 м",
    input: { ...base, length: 8000, width: 6000, wallHeight: 3000, pitchDeg: 20, openings: { ...none, left: [gate("g1", 1500, 2800, 2400)], front: [door("d1", 5800, 900, 2100)] } },
  },
  {
    id: "carport",
    name: "Навес на 2 авто 6 × 6 м",
    input: { ...base, kind: "carport", length: 6000, width: 6000, wallHeight: 2500, pitchDeg: 15, openings: none },
  },
];

export function presetInput(id: string): BuildingInput {
  const p = BUILDING_PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`Нет шаблона ${id}`);
  return structuredClone(p.input);
}
