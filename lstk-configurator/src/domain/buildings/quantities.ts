import type { Building } from "./generate";

/**
 * Envelope quantities for cladding and insulation, m². Gross areas from the
 * outer dimensions; openings are deducted from walls. Fixings, laps and
 * flashings are not included — a supplier's take-off adds those.
 */
export interface EnvelopeQuantities {
  roofM2: number;
  wallsM2: number;
  openingsM2: number;
  gablesM2: number;
  /** Ridge + eaves + verges, m — flashings ("доборные элементы") */
  flashingsM: number;
}

export function envelopeQuantities(b: Building): EnvelopeQuantities {
  const { length: L, width: W, wallHeight: H, pitchDeg, overhang } = b.input;
  const a = (pitchDeg * Math.PI) / 180;
  const rafter = W / 2 / Math.cos(a) + overhang;
  const roofM2 = (2 * rafter * L) / 1e6;
  const gableHeight = (W / 2) * Math.tan(a);
  const gablesM2 = b.input.kind === "enclosed" ? (2 * (W * gableHeight) / 2) / 1e6 : 0;
  const openingsM2 =
    b.input.kind === "enclosed"
      ? Object.values(b.input.openings)
          .flat()
          .reduce((s, o) => s + (o.width * o.height) / 1e6, 0)
      : 0;
  const wallsM2 = b.input.kind === "enclosed" ? (2 * (L + W) * H) / 1e6 - openingsM2 : 0;
  const flashingsM = (L + 2 * L + 4 * rafter) / 1000;
  return { roofM2, wallsM2, openingsM2, gablesM2, flashingsM };
}
