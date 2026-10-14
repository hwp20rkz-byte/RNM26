import type { Building } from "../buildings/generate";
import { PRODUCTS } from "../catalog/products";

/**
 * The plot around the building: parking in front with accessible and EV
 * bays, an apron at the entrance, a 1.5 m walkway round the building that
 * links every exit (fire exits included), solar LED lamps along the aisle
 * and the walks, trees along the boundary, lawn on the rest — plus whatever
 * the user places in the landscape editor (trees, shrubs, beds, benches,
 * lamps, bins, bike racks).
 *
 * Plan coordinates are the building's (mm): the front wall runs along z = 0,
 * the plot extends to negative z in front. Norms: bays 2.5 × 5.3 m, aisle
 * 6 m, accessible bays 3.6 m wide nearest the entrance, ≥ 10 % of the bays.
 */

export type SiteKind = "tree" | "conifer" | "shrub" | "flowerbed" | "bench" | "lamp" | "bin" | "bikeRack";
export const SITE_KINDS: SiteKind[] = ["tree", "conifer", "shrub", "flowerbed", "bench", "lamp", "bin", "bikeRack"];

export interface SiteItem {
  id: string;
  kind: SiteKind;
  x: number;
  z: number;
  /** Turn about the vertical, degrees */
  rot: number;
}

export interface SiteSettings {
  enabled: boolean;
  parking: boolean;
  /** Bays: null — from the use of the building */
  bays: number | null;
  /** Solar LED lamps along the aisle and the walks */
  lamps: boolean;
  /** Trees along the plot boundary */
  boundaryTrees: boolean;
  items: SiteItem[];
}

export const SITE_OFF: SiteSettings = { enabled: false, parking: true, bays: null, lamps: true, boundaryTrees: true, items: [] };

export interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

export interface Bay extends Rect {
  kind: "car" | "accessible" | "ev";
}

export interface SitePlan {
  plot: Rect;
  bays: Bay[];
  /** Asphalt: aisle and driveway */
  asphalt: Rect[];
  /** Paving: apron and walkways */
  paving: Rect[];
  lamps: { x: number; z: number }[];
  trees: { x: number; z: number; kind: "tree" | "conifer" }[];
  items: SiteItem[];
  quantities: { asphaltM2: number; pavingM2: number; curbM: number; lawnM2: number; bays: number; accessible: number; ev: number; lamps: number; trees: number };
  lines: { key: string; qty: number; unit: "m2" | "m" | "pcs"; price: number }[];
  cost: number;
}

export const SITE_PRICES: Record<string, number> = {
  asphalt: 9500,
  paving: 12500,
  curb: 4800,
  lawn: 1900,
  marking: 7000,
  tree: 48000,
  conifer: 62000,
  shrub: 9500,
  flowerbed: 28000,
  bench: 125000,
  lamp: 680000,
  bin: 38000,
  bikeRack: 95000,
};

const area = (r: Rect) => ((r.x1 - r.x0) * (r.z1 - r.z0)) / 1e6;

/** Bays a building needs: a club 1 per 3 people of a session + 2 staff, a house 2, a shed 1 */
export function baysFor(productId: string): number {
  const p = PRODUCTS.find((x) => x.id === productId);
  if (p?.category === "sport") return Math.ceil((p.capacity?.default ?? 20) / 3) + 2;
  if (p?.category === "living") return 2;
  return 1;
}

export function sitePlan(b: Building, s: SiteSettings, ev = 0): SitePlan {
  const { length: L, width: W } = b.input;
  const bays: Bay[] = [];
  const asphalt: Rect[] = [];
  const paving: Rect[] = [];
  const apron = 3000;
  const walk = 1500;
  // Apron along the front, walkway round the other three sides: every exit lands on paving
  paving.push({ x0: -walk, z0: -apron, x1: L + walk, z1: 0 });
  paving.push({ x0: -walk, z0: W, x1: L + walk, z1: W + walk });
  paving.push({ x0: -walk, z0: 0, x1: 0, z1: W });
  paving.push({ x0: L, z0: 0, x1: L + walk, z1: W });

  let front = -apron;
  const want = s.parking ? Math.max(s.bays ?? baysFor(b.input.productId), ev) : 0;
  if (want > 0) {
    const accessible = Math.max(1, Math.ceil(want * 0.1));
    const span = L + 2 * walk;
    const perRow = Math.max(1, Math.floor((span - accessible * 3600) / 2500) + accessible);
    const rows = Math.min(2, Math.ceil(want / perRow));
    // Row 1 noses onto the apron, the aisle behind it, row 2 across the aisle
    const rowZ = [
      [-apron - 5300, -apron],
      [-apron - 5300 - 6000 - 5300, -apron - 5300 - 6000],
    ];
    let n = 0;
    for (let r = 0; r < rows; r++) {
      let x = -walk;
      while (n < want && x < L + walk - 2400) {
        // Accessible bays first (nearest the entrance side of row 1), EV at the far end
        const kind: Bay["kind"] = r === 0 && n < accessible ? "accessible" : n >= want - ev ? "ev" : "car";
        const w = kind === "accessible" ? 3600 : 2500;
        if (x + w > L + walk) break;
        bays.push({ kind, x0: x, x1: x + w, z0: rowZ[r]![0]!, z1: rowZ[r]![1]! });
        x += w;
        n++;
      }
    }
    const back = rows === 2 ? rowZ[1]![0]! : -apron - 5300 - 6000;
    asphalt.push({ x0: -walk, z0: -apron - 5300 - 6000, x1: L + walk, z1: -apron - 5300 }); // aisle
    asphalt.push(...bays.map((x) => ({ ...x })));
    // Driveway out of the left end of the aisle to the plot edge
    asphalt.push({ x0: -walk - 12000, z0: -apron - 5300 - 6000, x1: -walk, z1: -apron - 5300 });
    front = back;
  }

  const plot: Rect = { x0: -walk - 12000, z0: front - 6000, x1: L + walk + 10000, z1: W + walk + 16000 };

  const lamps: SitePlan["lamps"] = [];
  if (s.lamps) {
    // Along the aisle, both edges staggered, every 18 m; along the side and back walks every 18 m
    if (bays.length) for (let x = 0, i = 0; x <= L + walk; x += 9000, i++) lamps.push({ x, z: i % 2 ? -apron - 5300 - 6000 - 600 : -apron - 600 });
    for (let z = 4000; z < W; z += 18000) lamps.push({ x: -walk - 600, z }, { x: L + walk + 600, z });
    for (let x = 0; x <= L; x += 18000) lamps.push({ x, z: W + walk + 600 });
  }

  const trees: SitePlan["trees"] = [];
  if (s.boundaryTrees) {
    // Back and side boundaries, 6 m apart, 2 m in from the edge; conifers on the windward back
    for (let x = plot.x0 + 3000; x < plot.x1 - 2000; x += 6000) trees.push({ x, z: plot.z1 - 2000, kind: "conifer" });
    const drive = (z: number) => bays.length > 0 && z > -apron - 5300 - 6000 - 2000 && z < -apron - 5300 + 2000;
    for (let z = plot.z0 + 8000; z < plot.z1 - 4000; z += 6000) {
      trees.push({ x: plot.x1 - 2000, z, kind: "tree" });
      // The driveway leaves through the left boundary
      if (!drive(z)) trees.push({ x: plot.x0 + 2000, z, kind: "tree" });
    }
  }

  const asphaltM2 = asphalt.reduce((t, r) => t + area(r), 0);
  const pavingM2 = paving.reduce((t, r) => t + area(r), 0);
  const buildingM2 = (L * W) / 1e6;
  const lawnM2 = Math.max(0, area(plot) - asphaltM2 - pavingM2 - buildingM2);
  const curbM = (2 * (L + 2 * walk + W + walk + apron)) / 1000 + (bays.length ? (2 * (L + 2 * walk + 12000)) / 1000 : 0);
  const counts = (k: SiteKind) => s.items.filter((i) => i.kind === k).length;
  type Line = SitePlan["lines"][number];
  const lines: SitePlan["lines"] = ([
    { key: "asphalt", qty: asphaltM2, unit: "m2", price: SITE_PRICES.asphalt! },
    { key: "paving", qty: pavingM2, unit: "m2", price: SITE_PRICES.paving! },
    { key: "curb", qty: curbM, unit: "m", price: SITE_PRICES.curb! },
    { key: "marking", qty: bays.length, unit: "pcs", price: SITE_PRICES.marking! },
    { key: "lawn", qty: lawnM2, unit: "m2", price: SITE_PRICES.lawn! },
    { key: "lamp", qty: lamps.length + counts("lamp"), unit: "pcs", price: SITE_PRICES.lamp! },
    { key: "tree", qty: trees.filter((t) => t.kind === "tree").length + counts("tree"), unit: "pcs", price: SITE_PRICES.tree! },
    { key: "conifer", qty: trees.filter((t) => t.kind === "conifer").length + counts("conifer"), unit: "pcs", price: SITE_PRICES.conifer! },
    ...(["shrub", "flowerbed", "bench", "bin", "bikeRack"] as const).map((k) => ({ key: k, qty: counts(k), unit: "pcs" as const, price: SITE_PRICES[k]! })),
  ] as Line[]).filter((l) => l.qty > 0);
  const cost = lines.reduce((t, l) => t + l.qty * l.price, 0);

  return {
    plot,
    bays,
    asphalt,
    paving,
    lamps,
    trees,
    items: s.items,
    quantities: {
      asphaltM2,
      pavingM2,
      curbM,
      lawnM2,
      bays: bays.length,
      accessible: bays.filter((x) => x.kind === "accessible").length,
      ev: bays.filter((x) => x.kind === "ev").length,
      lamps: lamps.length + counts("lamp"),
      trees: trees.length + counts("tree") + counts("conifer"),
    },
    lines,
    cost,
  };
}
