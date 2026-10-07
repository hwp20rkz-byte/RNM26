import type { Building } from "../buildings/generate";
import { evenStations } from "../buildings/generate";
import type { City } from "../climate/cities";
import type { Partition } from "../buildings/types";

/**
 * Foundation take-off for a light steel frame. The building is light
 * (≈ 0.5–1.5 kPa dead load), so frost heave, not bearing, governs:
 * - screw piles: blade below the freezing depth + 0.3 m, ≤ 2.5 m apart under
 *   every outer wall and load-bearing line, pile Ø108 for houses, Ø89 for
 *   sheds and gazebos;
 * - strip: where the freezing depth is ≤ 1 m the strip goes below it; deeper
 *   frost makes a deep strip absurd for a 1 kPa building, so it becomes a
 *   shallow insulated strip (МЗЛФ, 0.6 m on a sand cushion) with an XPS
 *   skirt 1.2 m wide that keeps the ground under it from freezing;
 * - slab: insulated (XPS) slab on a compacted sand-gravel cushion.
 * Soil investigation decides; this is a quantity estimate.
 */

export interface FoundationPrices {
  pile89: number;
  pile108: number;
  pileInstall: number;
  /** Ready-mix B20 incl. delivery, ₸/m³ */
  concrete: number;
  /** Rebar A500, ₸/kg */
  rebar: number;
  /** Formwork, excavation, sand cushion, labour, ₸/m³ of concrete */
  works: number;
  /** Concrete pump / truck call */
  mobilization: number;
  /** XPS 100 mm skirt insulation, ₸/m² */
  skirt: number;
}

export const DEFAULT_FOUNDATION_PRICES: FoundationPrices = {
  pile89: 14000,
  pile108: 19000,
  pileInstall: 9000,
  concrete: 34000,
  rebar: 380,
  works: 28000,
  mobilization: 45000,
  skirt: 6500,
};

export interface FoundationResult {
  type: Building["input"]["foundation"]["type"];
  piles: number;
  pileDiameter: number;
  pileLength: number;
  /** Strip: depth below ground, width */
  stripDepth: number;
  stripWidth: number;
  concreteM3: number;
  rebarKg: number;
  massKg: number;
  cost: number;
  notes: string[];
}

const round = (v: number, step: number) => Math.ceil(v / step - 1e-9) * step;

export function foundation(b: Building, city: City, prices: FoundationPrices = DEFAULT_FOUNDATION_PRICES): FoundationResult {
  const { length: L, width: W, foundation: f } = b.input;
  const frost = city.frost * 10; // mm
  const plinth = f.plinth;
  const heavy = b.input.levels.length > 1 || L * W > 40e6;
  const out: FoundationResult = { type: f.type, piles: 0, pileDiameter: 0, pileLength: 0, stripDepth: 0, stripWidth: 0, concreteM3: 0, rebarKg: 0, massKg: 0, cost: 0, notes: [] };
  const lines: { length: number }[] = [{ length: L }, { length: L }, { length: W }, { length: W }];
  const partitions: Partition[] = b.input.levels[0]!.partitions;
  for (const p of partitions) lines.push({ length: p.axis === "x" ? W : L });

  switch (f.type) {
    case "screw-piles": {
      // Grid under the outer walls and the first-floor partitions, corners shared
      const along = evenStations(L, 2500, 0).length;
      const across = evenStations(W, 2500, 0).length;
      let piles = 2 * along + 2 * (across - 2);
      for (const p of partitions) piles += Math.max(0, evenStations(p.axis === "x" ? W : L, 2500, 0).length - 2);
      // Floor trusses span the width: intermediate rows under wide floors
      if (W > 4500) piles += (Math.ceil(W / 3000) - 1) * (along - 2);
      out.piles = piles;
      out.pileDiameter = heavy ? 108 : 89;
      out.pileLength = Math.max(2000, round(frost + 300 + plinth, 500));
      const each = out.pileDiameter === 108 ? prices.pile108 : prices.pile89;
      out.massKg = piles * (out.pileLength / 1000) * (out.pileDiameter === 108 ? 12 : 9);
      // Concrete for the pile shafts (anti-corrosion fill), 0.008 m³ per metre
      out.concreteM3 = piles * (out.pileLength / 1000) * 0.008;
      out.cost = piles * (each * (out.pileLength / 2500) + prices.pileInstall) + out.concreteM3 * prices.concrete;
      break;
    }
    case "strip": {
      out.stripWidth = 300;
      const shallow = frost > 1000;
      out.stripDepth = shallow ? 600 : Math.max(600, round(frost, 100));
      const run = lines.reduce((s, l) => s + l.length, 0) / 1000;
      const height = (out.stripDepth + plinth) / 1000;
      out.concreteM3 = run * 0.3 * height;
      out.rebarKg = out.concreteM3 * 80;
      out.massKg = out.concreteM3 * 2400 + out.rebarKg;
      const skirt = shallow ? ((2 * (L + W)) / 1000 + 4 * 1.2) * 1.2 : 0;
      out.cost = out.concreteM3 * (prices.concrete + prices.works) + out.rebarKg * prices.rebar + prices.mobilization + skirt * prices.skirt;
      if (shallow) out.notes.push("shallowStrip");
      break;
    }
    case "slab": {
      const area = ((L + 400) * (W + 400)) / 1e6;
      const t = 0.15 + (heavy ? 0.05 : 0);
      const ribs = (2 * (L + W)) / 1000 * 0.3 * 0.3; // edge thickening
      out.concreteM3 = area * t + ribs;
      out.rebarKg = out.concreteM3 * 90;
      out.massKg = out.concreteM3 * 2400 + out.rebarKg;
      out.cost = out.concreteM3 * (prices.concrete + prices.works) + out.rebarKg * prices.rebar + prices.mobilization;
      if (frost > 1000) out.notes.push("slabFrost");
      break;
    }
    case "none":
      // Posts anchored to existing paving: one anchor pair per post
      out.notes.push("anchors");
      break;
  }
  return out;
}
