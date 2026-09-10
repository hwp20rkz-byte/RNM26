"use client";

import { create } from "zustand";
import type {
  BuildingProfile,
  CalculatorDatabase,
  CostItem,
  PayrollPosition,
  ScenarioId,
  TariffResult,
} from "@/lib/calculator/types";
import { buildDefaultDatabase } from "@/lib/calculator/database";
import { DEFAULT_BUILDING, getScenario } from "@/lib/calculator/presets";
import { applyScenario, computeTariff } from "@/lib/calculator/engine";

export type BudgetPeriod = "month" | "quarter" | "year";

interface CalculatorState {
  building: BuildingProfile;
  /** Пристинная база — не мутируется, используется как основа при выборе сценария */
  baseDb: CalculatorDatabase;
  db: CalculatorDatabase;
  scenario: ScenarioId;
  priceMultiplier: number;
  budgetPeriod: BudgetPeriod;
  lastTariff: number;
  tariff: TariffResult;

  setBuilding: (patch: Partial<BuildingProfile>) => void;
  applyServiceClassPreset: (patch: Partial<BuildingProfile>) => void;
  setBudgetPeriod: (p: BudgetPeriod) => void;
  setScenario: (id: ScenarioId) => void;

  toggleItem: (itemId: string) => void;
  updateItem: (itemId: string, patch: Partial<CostItem>) => void;
  togglePayroll: (positionId: string) => void;
  updatePayroll: (positionId: string, patch: Partial<PayrollPosition>) => void;
  toggleStaffOutsourceGroup: (group: string, mode: "staff" | "outsource") => void;

  recompute: () => void;
}

function recomputeTariff(
  db: CalculatorDatabase,
  building: BuildingProfile,
  priceMultiplier: number,
): TariffResult {
  return computeTariff(db, building, priceMultiplier);
}

export const useCalculatorStore = create<CalculatorState>((set, get) => {
  const initialBaseDb = buildDefaultDatabase();
  const initialScenario = getScenario("standard");
  const initialDb = applyScenario(initialBaseDb, initialScenario);
  const initialTariff = recomputeTariff(initialDb, DEFAULT_BUILDING, initialScenario.priceMultiplier);

  return {
    building: DEFAULT_BUILDING,
    baseDb: initialBaseDb,
    db: initialDb,
    scenario: "standard",
    priceMultiplier: initialScenario.priceMultiplier,
    budgetPeriod: "month",
    lastTariff: initialTariff.tariffPerSqm,
    tariff: initialTariff,

    setBuilding: (patch) => {
      const building = { ...get().building, ...patch };
      set({ building });
      get().recompute();
    },

    applyServiceClassPreset: (patch) => {
      const building = { ...get().building, ...patch };
      set({ building });
      get().recompute();
    },

    setBudgetPeriod: (budgetPeriod) => set({ budgetPeriod }),

    setScenario: (scenario) => {
      const scenarioDef = getScenario(scenario);
      const db = applyScenario(get().baseDb, scenarioDef);
      set({ scenario, db, priceMultiplier: scenarioDef.priceMultiplier });
      get().recompute();
    },

    toggleItem: (itemId) => {
      const db = get().db;
      const items = db.items.map((it) =>
        it.id === itemId ? { ...it, enabled: !it.enabled } : it,
      );
      set({ db: { ...db, items } });
      get().recompute();
    },

    updateItem: (itemId, patch) => {
      const db = get().db;
      const items = db.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it));
      set({ db: { ...db, items } });
      get().recompute();
    },

    togglePayroll: (positionId) => {
      const db = get().db;
      const payroll = db.payroll.map((p) =>
        p.id === positionId ? { ...p, enabled: !p.enabled } : p,
      );
      set({ db: { ...db, payroll } });
      get().recompute();
    },

    updatePayroll: (positionId, patch) => {
      const db = get().db;
      const payroll = db.payroll.map((p) => (p.id === positionId ? { ...p, ...patch } : p));
      set({ db: { ...db, payroll } });
      get().recompute();
    },

    toggleStaffOutsourceGroup: (group, mode) => {
      const db = get().db;
      const payroll = db.payroll.map((p) =>
        p.staffOutsourceGroup === group ? { ...p, enabled: p.mode === mode } : p,
      );
      const items = db.items.map((it) =>
        it.staffOutsourceGroup === group ? { ...it, enabled: it.mode === mode } : it,
      );
      set({ db: { ...db, payroll, items } });
      get().recompute();
    },

    recompute: () => {
      const { db, building, tariff, priceMultiplier } = get();
      const next = recomputeTariff(db, building, priceMultiplier);
      set({ tariff: next, lastTariff: tariff.tariffPerSqm });
    },
  };
});

export { getScenario };
