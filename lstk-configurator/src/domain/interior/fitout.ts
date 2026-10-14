import type { Building } from "../buildings/generate";
import { PRODUCTS } from "../catalog/products";
import type { Room } from "../layout/rooms";

/**
 * Fit-out of a sports club: furniture and equipment counted from the rooms,
 * the same counts the 3D interior draws. Prices are placeholders for
 * mid-range commercial gear in Kazakhstan, ₸ per unit, supply + assembly.
 */

export interface FitItem {
  /** i18n key under `fit.*` */
  key: string;
  qty: number;
  unit: "pcs" | "m2" | "set";
  price: number;
}

export const FIT_PRICES: Record<string, number> = {
  tatami: 24000,
  wallPad: 18000,
  locker: 22000,
  bench: 48000,
  showerCabin: 380000,
  mirror: 26000,
  reception: 650000,
  sofa: 340000,
  coffeeTable: 60000,
  chair: 45000,
  screen: 260000,
  desk: 120000,
  officeChair: 75000,
  cabinet: 90000,
  shelving: 60000,
  timer: 350000,
  treadmill: 2200000,
  rack: 900000,
  dumbbells: 1200000,
  weightBench: 150000,
  rig: 3500000,
  rower: 650000,
  plates: 1500000,
  ttTable: 450000,
  barrier: 25000,
  yogaMat: 15000,
  hairDryer: 55000,
};

/** Gym kit by sport, from the hall's clear size (mm): the counts the 3D view draws */
export function hallKit(productId: string, w: number, h: number): Record<string, number> {
  if (productId === "bjj") return { timer: 1 };
  if (productId === "yoga") return { yogaMat: Math.max(1, Math.floor((w - 1200) / 1100)) * Math.max(1, Math.floor((h - 1200) / 2200)) };
  if (productId === "tabletennis") {
    const courts = Math.max(1, Math.floor(w / 10000)) * Math.max(1, Math.floor(h / 6000));
    return { ttTable: courts, barrier: courts * 10 };
  }
  if (productId === "crossfit") return { rig: 1, rower: 6, plates: 1 };
  if (productId === "fitness") return { treadmill: Math.floor(w / 1000 / 2), rack: 3, dumbbells: 3, weightBench: Math.floor(w / 4000) };
  return {};
}

/** People a changing room serves: the club's session capacity */
export function lockersPerRoom(productId: string): number {
  return PRODUCTS.find((p) => p.id === productId)?.capacity?.default ?? 20;
}

export function fitOut(b: Building, rooms: Room[]): FitItem[] {
  const id = b.input.productId;
  if (PRODUCTS.find((p) => p.id === id)?.category !== "sport") return [];
  const n: Record<string, number> = {};
  const add = (k: string, q: number) => {
    if (q > 0) n[k] = (n[k] ?? 0) + q;
  };
  const people = lockersPerRoom(id);
  for (const r of rooms) {
    const w = r.x1 - r.x0;
    const h = r.z1 - r.z0;
    switch (r.purpose) {
      case "gym": {
        if (id === "bjj") {
          add("tatami", r.area);
          // 1.8 m of padding round the hall, less about 5 m of doors
          add("wallPad", Math.max(0, r.perimeter - 5) * 1.8);
        }
        if (id === "fitness") add("mirror", 12);
        if (id === "yoga") add("mirror", (h - 1200) / 1000 * 2);
        for (const [k, q] of Object.entries(hallKit(id, w, h))) add(k, q);
        add("screen", 1);
        break;
      }
      case "changing":
        add("locker", people);
        add("bench", Math.ceil(people / 8));
        add("mirror", 2);
        add("hairDryer", 2);
        break;
      case "bathroom":
        add("showerCabin", 1);
        break;
      case "lobby":
        add("reception", 1);
        add("sofa", r.area > 20 ? 2 : 1);
        add("coffeeTable", 1);
        add("chair", 4);
        add("screen", 1);
        break;
      case "office":
        add("desk", 1);
        add("officeChair", 2);
        add("cabinet", 1);
        break;
      case "storage":
        add("shelving", Math.max(2, Math.floor((r.perimeter - 2) / 0.9 / 2)));
        break;
    }
  }
  const m2 = new Set(["tatami", "wallPad", "mirror"]);
  return Object.entries(n).map(([key, qty]) => ({ key, qty: m2.has(key) ? Math.round(qty * 10) / 10 : Math.round(qty), unit: m2.has(key) ? "m2" : "pcs", price: FIT_PRICES[key] ?? 0 }));
}
