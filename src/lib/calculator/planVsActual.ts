import type { ActualExpenseEntry, CategoryTotal } from "./types";

export interface CategoryPlanVsActual {
  categoryId: string;
  plan: number;
  actual: number;
  variance: number;
  /** null, если план по статье нулевой — процент отклонения не определён */
  variancePercent: number | null;
}

export function computeCategoryBreakdown(
  categoryTotals: CategoryTotal[],
  actuals: ActualExpenseEntry[],
  month: string,
): CategoryPlanVsActual[] {
  const actualByCategory = new Map<string, number>();
  for (const a of actuals) {
    if (a.month !== month) continue;
    actualByCategory.set(a.categoryId, (actualByCategory.get(a.categoryId) ?? 0) + a.amount);
  }
  return categoryTotals.map((t) => {
    const actual = round2(actualByCategory.get(t.categoryId) ?? 0);
    const variance = round2(actual - t.monthlyTotal);
    return {
      categoryId: t.categoryId,
      plan: t.monthlyTotal,
      actual,
      variance,
      variancePercent: t.monthlyTotal > 0 ? round2((variance / t.monthlyTotal) * 100) : null,
    };
  });
}

export interface PlanActualMonth {
  month: string;
  plan: number;
  actual: number;
  variance: number;
}

export function computePlanActualSeries(
  monthlyPlanTotal: number,
  actuals: ActualExpenseEntry[],
  months: string[],
): PlanActualMonth[] {
  return months.map((month) => {
    const actual = round2(actuals.filter((a) => a.month === month).reduce((sum, a) => sum + a.amount, 0));
    return { month, plan: round2(monthlyPlanTotal), actual, variance: round2(actual - monthlyPlanTotal) };
  });
}

/** Последние n месяцев в формате YYYY-MM, включая текущий, по возрастанию. */
export function lastNMonths(n: number, referenceDate: Date = new Date()): string[] {
  const months: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
