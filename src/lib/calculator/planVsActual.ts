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

// ---------------------------------------------------------------------------
// Произвольный период и сравнение с предыдущим эквивалентным периодом —
// поверх уже существующих actuals[] (ActualExpenseEntry.month — "YYYY-MM",
// уже мультигодовой), без изменения модели данных.
// ---------------------------------------------------------------------------

/** Сдвигает "YYYY-MM" на delta месяцев (может быть отрицательным). */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

/** Все месяцы "YYYY-MM" от from до to включительно, по возрастанию. Если to < from — пустой массив. */
export function monthsInRange(fromMonth: string, toMonth: string): string[] {
  const months: string[] = [];
  let cursor = fromMonth;
  let guard = 0;
  while (cursor <= toMonth && guard < 1200) {
    months.push(cursor);
    cursor = shiftMonth(cursor, 1);
    guard += 1;
  }
  return months;
}

/** Предыдущий период той же длины (в месяцах), непосредственно предшествующий [from, to]. */
export function previousEquivalentRange(fromMonth: string, toMonth: string): { from: string; to: string } {
  const n = monthsInRange(fromMonth, toMonth).length || 1;
  return { from: shiftMonth(fromMonth, -n), to: shiftMonth(fromMonth, -1) };
}

export interface PeriodTotals {
  months: string[];
  plan: number;
  actual: number;
  variance: number;
  variancePercent: number | null;
}

export function computePeriodTotals(
  monthlyPlanTotal: number,
  actuals: ActualExpenseEntry[],
  months: string[],
): PeriodTotals {
  const monthSet = new Set(months);
  const plan = round2(monthlyPlanTotal * months.length);
  const actual = round2(actuals.filter((a) => monthSet.has(a.month)).reduce((sum, a) => sum + a.amount, 0));
  const variance = round2(actual - plan);
  return { months, plan, actual, variance, variancePercent: plan > 0 ? round2((variance / plan) * 100) : null };
}

export interface PeriodComparison {
  current: PeriodTotals;
  previous: PeriodTotals;
  /** Изменение факта к предыдущему эквивалентному периоду, % — null, если факт в прошлом периоде был 0 */
  actualDeltaPercent: number | null;
}

/** Сравнение произвольного периода [fromMonth, toMonth] с непосредственно предшествующим периодом той же длины. */
export function comparePeriods(
  monthlyPlanTotal: number,
  actuals: ActualExpenseEntry[],
  fromMonth: string,
  toMonth: string,
): PeriodComparison {
  const current = computePeriodTotals(monthlyPlanTotal, actuals, monthsInRange(fromMonth, toMonth));
  const prevRange = previousEquivalentRange(fromMonth, toMonth);
  const previous = computePeriodTotals(monthlyPlanTotal, actuals, monthsInRange(prevRange.from, prevRange.to));
  const actualDeltaPercent =
    previous.actual > 0 ? round2(((current.actual - previous.actual) / previous.actual) * 100) : null;
  return { current, previous, actualDeltaPercent };
}

export interface CategoryPeriodComparison {
  categoryId: string;
  current: number;
  previous: number;
  deltaPercent: number | null;
}

/** Изменение факта по каждой статье между произвольным периодом и предыдущим эквивалентным — для поиска "топ-движений". */
export function computeCategoryPeriodComparison(
  categoryTotals: CategoryTotal[],
  actuals: ActualExpenseEntry[],
  fromMonth: string,
  toMonth: string,
): CategoryPeriodComparison[] {
  const months = new Set(monthsInRange(fromMonth, toMonth));
  const prevRange = previousEquivalentRange(fromMonth, toMonth);
  const prevMonths = new Set(monthsInRange(prevRange.from, prevRange.to));
  return categoryTotals.map((t) => {
    const current = round2(
      actuals.filter((a) => a.categoryId === t.categoryId && months.has(a.month)).reduce((s, a) => s + a.amount, 0),
    );
    const previous = round2(
      actuals
        .filter((a) => a.categoryId === t.categoryId && prevMonths.has(a.month))
        .reduce((s, a) => s + a.amount, 0),
    );
    const deltaPercent = previous > 0 ? round2(((current - previous) / previous) * 100) : null;
    return { categoryId: t.categoryId, current, previous, deltaPercent };
  });
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
