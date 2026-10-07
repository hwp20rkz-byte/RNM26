/**
 * Delivery: what goes on the truck, how heavy and how long, which vehicle and
 * how many trips. Two ways to ship a LSTK building:
 * - kit: cut, punched and marked members in bundles — compact, assembled on site;
 * - panels: walls and trusses pre-assembled in the shop — fast erection, but
 *   bulky; panels longer than the bed must be split at the shop.
 * Tariffs are indicative Kazakhstan intercity rates (₸) — confirm with the carrier.
 */

export interface Vehicle {
  id: string;
  payloadKg: number;
  /** Load bed, mm */
  bedLength: number;
  bedWidth: number;
  bedHeight: number;
  /** Call-out, ₸ */
  base: number;
  /** ₸ per km (loaded + empty return billed) */
  perKm: number;
  crane: boolean;
}

export const VEHICLES: Vehicle[] = [
  { id: "gazelle", payloadKg: 1500, bedLength: 4200, bedWidth: 2000, bedHeight: 1900, base: 15000, perKm: 220, crane: false },
  { id: "truck5", payloadKg: 5000, bedLength: 6200, bedWidth: 2400, bedHeight: 2300, base: 25000, perKm: 380, crane: false },
  { id: "truck10", payloadKg: 10000, bedLength: 7500, bedWidth: 2450, bedHeight: 2500, base: 35000, perKm: 520, crane: false },
  { id: "manipulator", payloadKg: 7000, bedLength: 7200, bedWidth: 2400, bedHeight: 2400, base: 45000, perKm: 600, crane: true },
  { id: "semi", payloadKg: 20000, bedLength: 13600, bedWidth: 2450, bedHeight: 2700, base: 55000, perKm: 750, crane: false },
];

export type ShippingMode = "kit" | "panels";

export interface Cargo {
  /** i18n key under `cargo.*` */
  key: string;
  massKg: number;
  /** Loading volume, m³ (stowage incl. gaps) */
  volumeM3: number;
  /** Longest item, mm */
  longest: number;
  /** Widest item lying flat, mm */
  widest: number;
}

export interface DeliveryOption {
  vehicle: Vehicle;
  trips: number;
  cost: number;
  fits: boolean;
  /** Wider than the bed: oversize permit and escort, +30 % */
  oversize: boolean;
  reason: string | null;
}

export interface DeliveryResult {
  massKg: number;
  volumeM3: number;
  longest: number;
  widest: number;
  options: DeliveryOption[];
  best: DeliveryOption | null;
  craneAdvised: boolean;
}

export function planDelivery(cargo: readonly Cargo[], distanceKm: number, craneAdvised: boolean): DeliveryResult {
  const massKg = cargo.reduce((s, c) => s + c.massKg, 0);
  const volumeM3 = cargo.reduce((s, c) => s + c.volumeM3, 0);
  const longest = Math.max(0, ...cargo.map((c) => c.longest));
  const widest = Math.max(0, ...cargo.map((c) => c.widest));
  const options = VEHICLES.map((v): DeliveryOption => {
    // Up to 1 m overhang behind the bed is allowed with a flag
    const tooLong = longest > v.bedLength + 1000;
    const tooWide = widest > v.bedWidth + 200;
    const bed = (v.bedLength / 1000) * (v.bedWidth / 1000) * (v.bedHeight / 1000) * 0.75;
    const trips = Math.max(1, Math.ceil(massKg / v.payloadKg - 1e-9), Math.ceil(volumeM3 / bed - 1e-9));
    const cost = trips * (v.base + v.perKm * Math.max(0, distanceKm) * 2) * (tooWide ? 1.3 : 1);
    const reason = tooLong ? "tooLong" : tooWide ? "tooWide" : null;
    return { vehicle: v, trips, cost, fits: !tooLong, oversize: tooWide, reason };
  });
  const usable = options.filter((o) => o.fits);
  const best = usable.length ? usable.reduce((a, b) => (b.cost < a.cost ? b : a)) : null;
  return { massKg, volumeM3, longest, widest, options, best, craneAdvised };
}
