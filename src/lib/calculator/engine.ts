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
  ServicePreset,
  TariffResult,
  UnitType,
  UnitTypeTariffLine,
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

/**
 * Полезная площадь для формулы тарифа — жилая + коммерческая + кладовые +
 * машиноместа. Все они — самостоятельные объекты права, неразрывно связанные
 * с содержанием общего имущества (та же логика, что и в знаменателе кворума
 * ownerRegistryEngine.computeQuorum), поэтому участвуют в базе тарифа наравне
 * с жильём; их фактическая ставка отличается через *RateCoefficient
 * (computeTariffByUnitType), а не через исключение площади из базы.
 */
export function computeUsefulArea(building: BuildingProfile): number {
  return building.livingArea + building.commercialArea + building.storageArea + building.parkingArea;
}

export function computeCapitalRepairAnnual(building: BuildingProfile, mrpValue: number): number {
  const usefulArea = computeUsefulArea(building);
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
  const usefulArea = computeUsefulArea(building);
  const annualCommercialIncome = building.annualCommercialIncome;

  const tariffPerSqm =
    usefulArea > 0
      ? (annualTotalCost - annualCommercialIncome) / (usefulArea * 12)
      : 0;

  const monthlyBudget = (annualTotalCost - annualCommercialIncome) / 12;
  const capitalRepairAnnualActual = totalsById.get("2.11") ?? 0;

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
    capitalRepairAnnualActual: round2(capitalRepairAnnualActual),
    capitalRepairPerSqmActual: usefulArea > 0 ? round2(capitalRepairAnnualActual / (usefulArea * 12)) : 0,
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
// Паркинг — отдельная от площадной модель начисления. У машиномест может не
// быть содержательной связи между площадью и платёжеспособностью/готовностью
// платить (нередко это отдельные, не проживающие в доме инвесторы), поэтому
// поверх площадной ставки (parkingRateCoefficient × В) собрание может
// утвердить (1) минимальный порог платы за место (пол) и (2) резерв на
// неплатежи — начисление грубее фактической потребности, чтобы реально
// СОБРАННые деньги (с учётом ожидаемой доли неплательщиков) её покрывали.
// ---------------------------------------------------------------------------

/** Средняя площадь одного машиноместа, м² — 0, если места не заданы (parkingSpots=0). */
export function computeAvgParkingSpotArea(building: BuildingProfile): number {
  return building.parkingSpots > 0 ? round2(building.parkingArea / building.parkingSpots) : 0;
}

/** Плата за место по площадной ставке, без пола и без резерва на неплатежи. */
export function computeParkingAreaBasedPerSpot(tariff: TariffResult, building: BuildingProfile): number {
  return round2(tariff.tariffPerSqm * building.parkingRateCoefficient * computeAvgParkingSpotArea(building));
}

/**
 * Пол (минимальная плата собрания) + резерв на неплатежи поверх уже
 * рассчитанной по площади суммы за место. Общая формула для Шага 1
 * (агрегированный профиль) и для реестра собственников (по конкретному
 * юниту) — вызывающий код сам считает areaBasedAmount на своей базе площади.
 */
export function applyParkingFloorAndReserve(
  areaBasedAmount: number,
  building: Pick<BuildingProfile, "parkingFlatFeePerSpot" | "parkingNonPaymentRatePercent">,
): number {
  const floor = Math.max(areaBasedAmount, building.parkingFlatFeePerSpot);
  const nonPaymentRate = Math.min(Math.max(building.parkingNonPaymentRatePercent, 0), 95);
  return round2(floor / (1 - nonPaymentRate / 100));
}

/** Начисляемая ставка за одно машиноместо — площадная ставка, пол и резерв на неплатежи вместе. */
export function computeParkingBilledPerSpot(tariff: TariffResult, building: BuildingProfile): number {
  return applyParkingFloorAndReserve(computeParkingAreaBasedPerSpot(tariff, building), building);
}

/**
 * Годовой излишек сборов с паркинга сверх пропорциональной (площадной) доли
 * — информационно: показывает, сколько сверх "справедливой" площадной ставки
 * даёт пол+резерв, но НЕ выделяется в отдельный целевой фонд — деньги
 * остаются в общем фонде наравне с остальными взносами (решение собрания
 * о реальном обособлении — отдельный вопрос, инструмент его не решает).
 */
export function computeParkingSurplusAnnual(tariff: TariffResult, building: BuildingProfile): number {
  if (building.parkingSpots <= 0) return 0;
  const baseline = computeParkingAreaBasedPerSpot(tariff, building);
  const billed = computeParkingBilledPerSpot(tariff, building);
  return round2(Math.max(0, billed - baseline) * building.parkingSpots * 12);
}

/**
 * Разбивка тарифа по типам помещений профиля объекта (Шаг 1) — не путать с
 * начислениями по факту заполненного реестра собственников
 * (ownerRegistryEngine.computeUnitMonthlyAccrual), которые точнее, если
 * реестр ведётся. Здесь используются агрегированные площади BuildingProfile,
 * поэтому разбивка доступна сразу, без заполнения реестра. Для паркинга при
 * заданном количестве мест (parkingSpots > 0) учитывается пол и резерв на
 * неплатежи (computeParkingBilledPerSpot), иначе — чистая площадная ставка.
 */
export function computeTariffByUnitType(
  tariff: TariffResult,
  building: BuildingProfile,
): UnitTypeTariffLine[] {
  const flatLines: { unitType: UnitType; areaSqm: number; coefficient: number }[] = [
    { unitType: "apartment", areaSqm: building.livingArea, coefficient: 1 },
    { unitType: "commercial", areaSqm: building.commercialArea, coefficient: building.commercialRateCoefficient },
    { unitType: "storage", areaSqm: building.storageArea, coefficient: building.storageRateCoefficient },
  ];
  const lines: UnitTypeTariffLine[] = flatLines.map((l) => {
    const ratePerSqm = round2(tariff.tariffPerSqm * l.coefficient);
    return { unitType: l.unitType, areaSqm: l.areaSqm, ratePerSqm, monthlyTotal: round2(ratePerSqm * l.areaSqm) };
  });

  const avgSpotArea = computeAvgParkingSpotArea(building);
  if (building.parkingSpots > 0) {
    const perSpot = computeParkingBilledPerSpot(tariff, building);
    lines.push({
      unitType: "parking",
      areaSqm: building.parkingArea,
      ratePerSqm: avgSpotArea > 0 ? round2(perSpot / avgSpotArea) : 0,
      monthlyTotal: round2(perSpot * building.parkingSpots),
    });
  } else {
    const ratePerSqm = round2(tariff.tariffPerSqm * building.parkingRateCoefficient);
    lines.push({
      unitType: "parking",
      areaSqm: building.parkingArea,
      ratePerSqm,
      monthlyTotal: round2(ratePerSqm * building.parkingArea),
    });
  }
  return lines;
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
// Пресеты обслуживания — применение мультипликатора и фильтров к базе
// ---------------------------------------------------------------------------

export function applyPreset(
  db: CalculatorDatabase,
  preset: ServicePreset,
): CalculatorDatabase {
  const classOrder: Record<string, number> = { economy: 0, comfort: 1, business: 2, premium: 3 };
  const maxRank = classOrder[preset.maxServiceClass];

  const items = db.items.map((it) => {
    let enabled = it.enabled;
    if (it.minServiceClass && classOrder[it.minServiceClass] > maxRank) enabled = false;
    if (preset.forceDisabledItemIds.includes(it.id)) enabled = false;
    if (preset.forceEnabledItemIds.includes(it.id)) enabled = true;
    return { ...it, enabled };
  });

  const payroll = db.payroll.map((p) => {
    let enabled = p.enabled;
    if (p.minServiceClass && classOrder[p.minServiceClass] > maxRank) enabled = false;
    if (preset.forceDisabledItemIds.includes(p.id)) enabled = false;
    if (preset.forceEnabledItemIds.includes(p.id)) enabled = true;
    return { ...p, enabled };
  });

  return { ...db, items, payroll };
}

export function computePresetTariff(
  db: CalculatorDatabase,
  building: BuildingProfile,
  preset: ServicePreset,
): TariffResult {
  const presetDb = applyPreset(db, preset);
  return computeTariff(presetDb, building, preset.priceMultiplier);
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
