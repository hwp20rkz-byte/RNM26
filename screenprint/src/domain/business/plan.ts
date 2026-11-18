/**
 * Финансовая модель мастерской шелкографии на 24 месяца.
 * Все суммы в тенге без НДС. Значения по умолчанию — допущения бизнес-плана
 * от 15.11.2026 [Предположение]; их нужно заменить фактом после первых заказов.
 */

export interface PlanAssumptions {
  /** Средний чек заказа печати, ₸ */
  avgOrderKzt: number;
  /** Валовая маржа заказа печати, доля (0,43 = 43 %) */
  grossMargin: number;
  /** Постоянные расходы в месяц, месяцы 1–6 */
  fixedStartKzt: number;
  /** Рост постоянных расходов в месяцах 7–12, доля к стартовым */
  fixedGrowthH2: number;
  /** Постоянные расходы в месяц со второго года (третий сотрудник) */
  fixedYear2Kzt: number;
  /** Множитель плана заказов: 1 — базовый сценарий */
  salesFactor: number;
  /**
   * Капитальные затраты до первого заказа, ₸: оборудование 0,8 + помещение 0,3 + сайт 0,1 млн.
   * Буфер на убытки сюда не входит: его размер — это и есть peakNeedKzt модели.
   */
  capexKzt: number;
  /** С какого месяца продаются наборы-конструкторы станков */
  kitsFromMonth: number;
  kitsPerMonth: number;
  kitPriceKzt: number;
  kitCostKzt: number;
  /** Налог по упрощённой декларации, доля от выручки (0 — не учитывать) */
  taxRate: number;
}

export const DEFAULT_ASSUMPTIONS: PlanAssumptions = {
  avgOrderKzt: 150_000,
  grossMargin: 0.43,
  fixedStartKzt: 1_100_000,
  fixedGrowthH2: 0.04,
  fixedYear2Kzt: 1_400_000,
  salesFactor: 1,
  capexKzt: 1_200_000,
  kitsFromMonth: 16,
  kitsPerMonth: 2,
  kitPriceKzt: 120_000,
  kitCostKzt: 50_000,
  taxRate: 0,
};

/** Базовый план заказов печати по месяцам (бизнес-план, раздел «Финансовая модель») */
export const BASE_ORDERS: readonly number[] = [6, 9, 12, 14, 17, 20, 22, 24, 26, 26, 28, 30, 32, 32, 32, 34, 34, 34, 36, 36, 36, 38, 38, 38];

export const HORIZON = BASE_ORDERS.length;

export interface MonthRow {
  month: number;
  orders: number;
  kits: number;
  revenue: number;
  grossProfit: number;
  fixed: number;
  tax: number;
  result: number;
  cumulative: number;
}

export interface QuarterRow {
  quarter: number;
  ordersPerMonth: number[];
  kits: number;
  revenue: number;
  grossProfit: number;
  fixed: number;
  result: number;
  cumulative: number;
}

export interface PlanResult {
  months: MonthRow[];
  quarters: QuarterRow[];
  years: { year: number; revenue: number; result: number }[];
  /** Заказов в месяц, при которых валовая прибыль покрывает постоянные расходы первого полугодия */
  breakEvenOrders: number;
  /** Первый месяц, в котором месячный результат не отрицателен; null — не достигнут за горизонт */
  firstProfitMonth: number | null;
  /** Первый месяц, в котором накопленный поток с учётом инвестиций не отрицателен */
  paybackMonth: number | null;
  /** Самая глубокая точка накопленного потока — сколько денег нужно иметь */
  peakNeedKzt: number;
}

export function fixedForMonth(a: PlanAssumptions, month: number): number {
  if (month <= 6) return a.fixedStartKzt;
  if (month <= 12) return a.fixedStartKzt * (1 + a.fixedGrowthH2);
  return a.fixedYear2Kzt;
}

export function runPlan(a: PlanAssumptions = DEFAULT_ASSUMPTIONS): PlanResult {
  const months: MonthRow[] = [];
  let cumulative = -a.capexKzt;
  for (let i = 0; i < HORIZON; i++) {
    const month = i + 1;
    const orders = Math.max(0, Math.round(BASE_ORDERS[i]! * a.salesFactor));
    const kits = month >= a.kitsFromMonth ? a.kitsPerMonth : 0;
    const printRevenue = orders * a.avgOrderKzt;
    const kitRevenue = kits * a.kitPriceKzt;
    const revenue = printRevenue + kitRevenue;
    const grossProfit = printRevenue * a.grossMargin + kits * (a.kitPriceKzt - a.kitCostKzt);
    const fixed = fixedForMonth(a, month);
    const tax = revenue * a.taxRate;
    const result = grossProfit - fixed - tax;
    cumulative += result;
    months.push({ month, orders, kits, revenue, grossProfit, fixed, tax, result, cumulative });
  }

  const quarters: QuarterRow[] = [];
  for (let q = 0; q < HORIZON / 3; q++) {
    const slice = months.slice(q * 3, q * 3 + 3);
    quarters.push({
      quarter: q + 1,
      ordersPerMonth: slice.map((m) => m.orders),
      kits: slice.reduce((s, m) => s + m.kits, 0),
      revenue: slice.reduce((s, m) => s + m.revenue, 0),
      grossProfit: slice.reduce((s, m) => s + m.grossProfit, 0),
      fixed: slice.reduce((s, m) => s + m.fixed, 0),
      result: slice.reduce((s, m) => s + m.result, 0),
      cumulative: slice[slice.length - 1]!.cumulative,
    });
  }

  const years = [1, 2].map((y) => {
    const slice = months.slice((y - 1) * 12, y * 12);
    return { year: y, revenue: slice.reduce((s, m) => s + m.revenue, 0), result: slice.reduce((s, m) => s + m.result, 0) };
  });

  const grossPerOrder = a.avgOrderKzt * a.grossMargin - a.avgOrderKzt * a.taxRate;
  const breakEvenOrders = grossPerOrder > 0 ? Math.ceil(a.fixedStartKzt / grossPerOrder) : Infinity;
  const firstProfitMonth = months.find((m) => m.result >= 0)?.month ?? null;
  const paybackMonth = months.find((m) => m.cumulative >= 0)?.month ?? null;
  const peakNeedKzt = -Math.min(-a.capexKzt, ...months.map((m) => m.cumulative));

  return { months, quarters, years, breakEvenOrders, firstProfitMonth, paybackMonth, peakNeedKzt };
}

/** Чувствительность: как сдвигается окупаемость и результат второго года при изменении одного допущения */
export interface SensitivityRow {
  label: string;
  paybackMonth: number | null;
  year2Result: number;
}

export function sensitivity(a: PlanAssumptions = DEFAULT_ASSUMPTIONS): SensitivityRow[] {
  const cases: [string, Partial<PlanAssumptions>][] = [
    ["Базовый сценарий", {}],
    ["Заказов на 30 % меньше", { salesFactor: a.salesFactor * 0.7 }],
    ["Заказов на 30 % больше", { salesFactor: a.salesFactor * 1.3 }],
    ["Маржа 35 % вместо 43 %", { grossMargin: 0.35 }],
    ["Средний чек 120 тыс. ₸", { avgOrderKzt: 120_000 }],
    ["Налог 3 % с оборота", { taxRate: 0.03 }],
    ["Без наборов станков", { kitsPerMonth: 0 }],
  ];
  return cases.map(([label, patch]) => {
    const r = runPlan({ ...a, ...patch });
    return { label, paybackMonth: r.paybackMonth, year2Result: r.years[1]!.result };
  });
}

/** Миллионы с одним знаком после запятой, по-русски: −1,5 */
export function mln(v: number, digits = 1): string {
  const s = (v / 1e6).toFixed(digits).replace(".", ",").replace("-", "−");
  return s === "−0,0" ? "0,0" : s;
}
