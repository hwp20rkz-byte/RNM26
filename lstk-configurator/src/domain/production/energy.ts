import type { Bom } from "../bom/bom";
import type { RollFormingMachine } from "../machines/types";

/**
 * Production electricity. The Golden Integrity C89 line draws 14.5 kW
 * installed (7.5 kW servo main drive + 5.5 kW hydraulics + controls, offer
 * p. 4). It runs 50 m/min unpunched, but every station stops the coil, so
 * the effective rate with punching is set by the operations count.
 */
export interface EnergyOptions {
  /** ₸ per kWh — the user's selected tariff */
  tariff: number;
  /** Line installed power, kW */
  linePowerKw: number;
  /** Average draw as a share of installed */
  loadFactor: number;
  /** Seconds per punching/cut stop */
  secondsPerStop: number;
  /** Line speed between stops, m/min */
  speed: number;
  /** Assembly tools (screwdrivers, saws, compressor), kW average */
  assemblyKw: number;
  /** Assembly labour, hours per tonne of frame */
  assemblyHoursPerT: number;
  /** Shop lighting and heating while producing, kW */
  shopKw: number;
}

export const DEFAULT_ENERGY: EnergyOptions = {
  tariff: 48,
  linePowerKw: 14.5,
  loadFactor: 0.6,
  secondsPerStop: 1.2,
  speed: 50,
  assemblyKw: 1.5,
  assemblyHoursPerT: 40,
  shopKw: 3,
};

export function linePower(m: RollFormingMachine): number {
  const kw = /всего\s+([\d,.]+)\s*кВт/.exec(m.other.power?.value ?? "");
  return kw ? Number(kw[1]!.replace(",", ".")) : DEFAULT_ENERGY.linePowerKw;
}

export interface EnergyResult {
  lineHours: number;
  assemblyHours: number;
  kWh: number;
  cost: number;
  stops: number;
}

/** @param operations count of punching/cut stops (features + 1 cut per piece) */
export function productionEnergy(bom: Bom, operations: number, o: EnergyOptions = DEFAULT_ENERGY): EnergyResult {
  const metres = bom.totals.metres;
  const stops = operations + bom.totals.pieces;
  const lineHours = (metres / o.speed + (stops * o.secondsPerStop) / 60) / 60 + bom.totals.pieces * (2 / 3600); // + 2 s handling per piece
  const assemblyHours = (bom.totals.massKg / 1000) * o.assemblyHoursPerT;
  const kWh = lineHours * (o.linePowerKw * o.loadFactor + o.shopKw) + assemblyHours * (o.assemblyKw + o.shopKw);
  return { lineHours, assemblyHours, kWh, cost: kWh * o.tariff, stops };
}
