import { computePayroll } from "./payrollTax";
import type {
  BuildingProfile,
  CalculatorDatabase,
  CategoryTotal,
  CostCategory,
  CostItem,
  PayrollPosition,
  PayrollTaxRates,
  RegionalMinTariff,
  ScenarioDefinition,
  TariffResult,
} from "./types";

// ---------------------------------------------------------------------------
// Категории: обход дерева
// ---------------------------------------------------------------------------

export function getDescendantIds(categories: CostCategory[], rootId: string): Set<string> {
  const byParent = new Map<string | null, CostCategory[]>();
  for (const c of categories) {
    const list = byParent.get(c.parentId) ?? [];
    list.push(c);
    byParent.set(c.parentId, list);
  }
  const result = new Set<string>([rootId]);
  const stack = [rootId];
  while (stack.length) {
    const current = stack.pop()!;
    for (const child of byParent.get(current) ?? []) {
      if (!result.has(child.id)) {
        result.add(child.id);
        stack.push(child.id);
      }
    }
  }
  return result;
}

export function getChildren(categories: CostCategory[], parentId: string | null): CostCategory[] {
  return categories.filter((c) => c.parentId === parentId);
}

// ---------------------------------------------------------------------------
// Стоимость отдельных позиций
// ---------------------------------------------------------------------------

export function itemAnnualCost(item: CostItem, priceMultiplier = 1): number {
  if (!item.enabled) return 0;
  return item.annualQty * item.unitPrice * priceMultiplier;
}

export function payrollAnnualCost(
  position: PayrollPosition,
  rates: PayrollTaxRates,
  priceMultiplier = 1,
): number {
  if (!position.enabled) return 0;
  const monthly = position.monthlySalaryOrContract * priceMultiplier;
  if (position.mode === "staff") {
    return computePayroll(monthly, rates).totalCostToOsi * position.headcount * 12;
  }
  return monthly * position.headcount * 12;
}

// ---------------------------------------------------------------------------
// Итоги по категориям (с накоплением в родительские узлы)
// ---------------------------------------------------------------------------

export function computeCategoryTotals(
  db: CalculatorDatabase,
  building: BuildingProfile,
  priceMultiplier = 1,
): CategoryTotal[] {
  const directTotals = new Map<string, number>();
  for (const c of db.categories) directTotals.set(c.id, 0);

  for (const it of db.items) {
    directTotals.set(
      it.categoryId,
      (directTotals.get(it.categoryId) ?? 0) + itemAnnualCost(it, priceMultiplier),
    );
  }
  for (const p of db.payroll) {
    directTotals.set(
      p.categoryId,
      (directTotals.get(p.categoryId) ?? 0) + payrollAnnualCost(p, db.taxRates, priceMultiplier),
    );
  }

  // Обязательный накопительный взнос на капремонт (ст.60-1 Закона «О жилищных отношениях»)
  const capitalRepairAnnual = computeCapitalRepairAnnual(building, db.taxRates.mrpValue);
  directTotals.set("2.11", (directTotals.get("2.11") ?? 0) + capitalRepairAnnual);

  const rolledUp = new Map<string, number>();
  for (const c of db.categories) {
    const descendants = getDescendantIds(db.categories, c.id);
    let sum = 0;
    for (const id of descendants) sum += directTotals.get(id) ?? 0;
    rolledUp.set(c.id, sum);
  }

  return db.categories.map((c) => ({
    categoryId: c.id,
    annualTotal: round2(rolledUp.get(c.id) ?? 0),
    monthlyTotal: round2((rolledUp.get(c.id) ?? 0) / 12),
  }));
}

export function computeCapitalRepairAnnual(building: BuildingProfile, mrpValue: number): number {
  const usefulArea = building.livingArea + building.commercialArea;
  const perSqmMonth = building.capitalRepairMrpMultiplier * mrpValue;
  return perSqmMonth * usefulArea * 12;
}

// ---------------------------------------------------------------------------
// Итоговый тариф — формула п.10 Методики №166: В=(Ргод-Дгод)/(Sполез×12)
// ---------------------------------------------------------------------------

export function computeTariff(
  db: CalculatorDatabase,
  building: BuildingProfile,
  priceMultiplier = 1,
): TariffResult {
  const categoryTotals = computeCategoryTotals(db, building, priceMultiplier);
  const totalsById = new Map(categoryTotals.map((t) => [t.categoryId, t.annualTotal]));

  const annualManagementCost = totalsById.get("1") ?? 0;
  const annualMaintenanceCost = totalsById.get("2") ?? 0;
  const annualTotalCost = annualManagementCost + annualMaintenanceCost;
  const usefulArea = building.livingArea + building.commercialArea;
  const annualCommercialIncome = building.annualCommercialIncome;

  const tariffPerSqm =
    usefulArea > 0
      ? (annualTotalCost - annualCommercialIncome) / (usefulArea * 12)
      : 0;

  const monthlyBudget = (annualTotalCost - annualCommercialIncome) / 12;

  return {
    annualManagementCost: round2(annualManagementCost),
    annualMaintenanceCost: round2(annualMaintenanceCost),
    annualTotalCost: round2(annualTotalCost),
    annualCommercialIncome: round2(annualCommercialIncome),
    tariffPerSqm: round2(tariffPerSqm),
    usefulArea,
    monthlyBudget: round2(monthlyBudget),
    quarterlyBudget: round2(monthlyBudget * 3),
    annualBudget: round2(monthlyBudget * 12),
    categoryTotals,
    capitalRepairMinTariffPerSqm: round2(0.005 * db.taxRates.mrpValue),
  };
}

export function computeApartmentCheck(tariffPerSqm: number, areaSqm: number): number {
  return round2(tariffPerSqm * areaSqm);
}

export function computeCommercialCheck(
  tariffPerSqm: number,
  areaSqm: number,
  commercialRateCoefficient: number,
): number {
  return round2(tariffPerSqm * commercialRateCoefficient * areaSqm);
}

// ---------------------------------------------------------------------------
// Сравнение с минимальным тарифом маслихата
// ---------------------------------------------------------------------------

export type TariffComparisonStatus = "below" | "within" | "above" | "unknown";

export function compareToMinTariff(
  tariffPerSqm: number,
  minTariff: RegionalMinTariff | undefined,
): TariffComparisonStatus {
  if (!minTariff) return "unknown";
  if (tariffPerSqm < minTariff.minTariffPerSqm * 0.98) return "below";
  if (tariffPerSqm > minTariff.minTariffPerSqm * 1.5) return "above";
  return "within";
}

// ---------------------------------------------------------------------------
// Сценарии — применение мультипликатора и фильтров к базе
// ---------------------------------------------------------------------------

export function applyScenario(
  db: CalculatorDatabase,
  scenario: ScenarioDefinition,
): CalculatorDatabase {
  const classOrder: Record<string, number> = { economy: 0, comfort: 1, business: 2, premium: 3 };
  const maxRank = classOrder[scenario.maxServiceClass];

  const items = db.items.map((it) => {
    let enabled = it.enabled;
    if (it.minServiceClass && classOrder[it.minServiceClass] > maxRank) enabled = false;
    if (scenario.forceDisabledItemIds.includes(it.id)) enabled = false;
    if (scenario.forceEnabledItemIds.includes(it.id)) enabled = true;
    return { ...it, enabled };
  });

  const payroll = db.payroll.map((p) => {
    let enabled = p.enabled;
    if (p.minServiceClass && classOrder[p.minServiceClass] > maxRank) enabled = false;
    if (scenario.forceDisabledItemIds.includes(p.id)) enabled = false;
    if (scenario.forceEnabledItemIds.includes(p.id)) enabled = true;
    return { ...p, enabled };
  });

  return { ...db, items, payroll };
}

export function computeScenarioTariff(
  db: CalculatorDatabase,
  building: BuildingProfile,
  scenario: ScenarioDefinition,
): TariffResult {
  const scenarioDb = applyScenario(db, scenario);
  return computeTariff(scenarioDb, building, scenario.priceMultiplier);
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
