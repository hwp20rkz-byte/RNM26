import type {
  Asset,
  AssetCondition,
  AssetWear,
  CapitalFundYearProjection,
  ReplacementPlanYear,
} from "./types";

const CONDITION_THRESHOLDS: { max: number; condition: AssetCondition }[] = [
  { max: 40, condition: "good" },
  { max: 60, condition: "satisfactory" },
  { max: 80, condition: "attention" },
  { max: 100, condition: "critical" },
  { max: Infinity, condition: "expired" },
];

export const CONDITION_LABELS: Record<AssetCondition, string> = {
  good: "Исправно",
  satisfactory: "Удовлетворительно",
  attention: "Требует внимания",
  critical: "Критично",
  expired: "Срок истёк",
};

export function conditionForWear(wearPercent: number): AssetCondition {
  return CONDITION_THRESHOLDS.find((t) => wearPercent < t.max)!.condition;
}

/**
 * Износ по возрасту — практичная оценка «по паспорту» (Износ% = Возраст /
 * НормСрок × 100), не замена экспертной методики ВСН 53-86(р) на основе
 * осмотра. `manualWearOverridePercent`, если указан, приоритетнее расчёта —
 * для случаев, когда фактическое состояние отличается от паспортного.
 */
export function computeAssetWear(asset: Asset, currentYear: number): AssetWear {
  const ageYears = Math.max(0, currentYear - asset.installedYear);
  const lifeYears = Math.max(1, asset.normativeLifeYears);
  const ageBasedWear = Math.min(100, (ageYears / lifeYears) * 100);
  const wearPercent =
    asset.manualWearOverridePercent !== undefined
      ? Math.max(0, Math.min(100, asset.manualWearOverridePercent))
      : ageBasedWear;

  const remainingYears = Math.max(0, Math.round(lifeYears * (1 - wearPercent / 100)));
  const targetReplacementYear =
    asset.manualWearOverridePercent !== undefined
      ? currentYear + remainingYears
      : asset.installedYear + lifeYears;

  return {
    assetId: asset.id,
    ageYears,
    wearPercent: round1(wearPercent),
    condition: conditionForWear(wearPercent),
    remainingYears,
    targetReplacementYear,
    replacementCost: asset.quantity * asset.replacementUnitCost,
  };
}

export function computeAllWear(assets: Asset[], currentYear: number): AssetWear[] {
  return assets.map((a) => computeAssetWear(a, currentYear));
}

/** Группирует активы по расчётному году замены в пределах горизонта планирования. */
export function computeReplacementPlan(
  assets: Asset[],
  wears: AssetWear[],
  startYear: number,
  horizonYears: number,
): ReplacementPlanYear[] {
  const wearById = new Map(wears.map((w) => [w.assetId, w]));
  const years: ReplacementPlanYear[] = Array.from({ length: horizonYears }, (_, i) => ({
    year: startYear + i,
    assetIds: [],
    totalCost: 0,
  }));

  for (const asset of assets) {
    const wear = wearById.get(asset.id);
    if (!wear) continue;
    // всё, что уже просрочено (год замены раньше горизонта), тоже попадает в первый год плана
    const bucketYear = Math.max(startYear, Math.min(startYear + horizonYears - 1, wear.targetReplacementYear));
    const bucket = years.find((y) => y.year === bucketYear);
    if (bucket) {
      bucket.assetIds.push(asset.id);
      bucket.totalCost += wear.replacementCost;
    }
  }

  return years;
}

/**
 * Проекция баланса фонда капремонта: начальный остаток + накопленные
 * доходы (годовой взнос из computeCapitalRepairAnnual) − накопленные плановые
 * траты по каждому году горизонта. Показывает год, в котором фонда не хватит.
 */
export function computeCapitalFundProjection(
  startBalance: number,
  annualIncome: number,
  plan: ReplacementPlanYear[],
): CapitalFundYearProjection[] {
  let balance = startBalance;
  return plan.map((y) => {
    balance = balance + annualIncome - y.totalCost;
    return { year: y.year, income: annualIncome, plannedSpend: y.totalCost, balance: round2(balance) };
  });
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
