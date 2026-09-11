import { describe, expect, it } from "vitest";
import {
  comparePeriods,
  computeCategoryBreakdown,
  computeCategoryPeriodComparison,
  computePlanActualSeries,
  lastNMonths,
  monthsInRange,
  previousEquivalentRange,
  shiftMonth,
} from "./planVsActual";
import type { ActualExpenseEntry, CategoryTotal } from "./types";

const ts = "2024-01-01T00:00:00.000Z";

function actual(partial: Partial<ActualExpenseEntry> & Pick<ActualExpenseEntry, "month" | "categoryId" | "amount">): ActualExpenseEntry {
  return { id: "a1", createdAt: ts, updatedAt: ts, ...partial };
}

describe("computeCategoryBreakdown", () => {
  const categoryTotals: CategoryTotal[] = [
    { categoryId: "1.1", annualTotal: 120000, monthlyTotal: 10000 },
    { categoryId: "2.11", annualTotal: 0, monthlyTotal: 0 },
  ];

  it("считает факт по месяцу и категории, отклонение и процент", () => {
    const actuals = [
      actual({ id: "a1", month: "2026-01", categoryId: "1.1", amount: 12000 }),
      actual({ id: "a2", month: "2026-02", categoryId: "1.1", amount: 5000 }), // другой месяц — не в счёт
    ];
    const result = computeCategoryBreakdown(categoryTotals, actuals, "2026-01");
    const row = result.find((r) => r.categoryId === "1.1")!;
    expect(row.plan).toBe(10000);
    expect(row.actual).toBe(12000);
    expect(row.variance).toBe(2000);
    expect(row.variancePercent).toBe(20);
  });

  it("суммирует несколько записей факта за один месяц/категорию", () => {
    const actuals = [
      actual({ id: "a1", month: "2026-01", categoryId: "1.1", amount: 4000 }),
      actual({ id: "a2", month: "2026-01", categoryId: "1.1", amount: 3000 }),
    ];
    const result = computeCategoryBreakdown(categoryTotals, actuals, "2026-01");
    expect(result.find((r) => r.categoryId === "1.1")!.actual).toBe(7000);
  });

  it("нулевой план — variancePercent равен null", () => {
    const actuals = [actual({ id: "a1", month: "2026-01", categoryId: "2.11", amount: 1000 })];
    const result = computeCategoryBreakdown(categoryTotals, actuals, "2026-01");
    expect(result.find((r) => r.categoryId === "2.11")!.variancePercent).toBeNull();
  });

  it("нет фактических записей — факт 0, отклонение отрицательное к плану", () => {
    const result = computeCategoryBreakdown(categoryTotals, [], "2026-01");
    const row = result.find((r) => r.categoryId === "1.1")!;
    expect(row.actual).toBe(0);
    expect(row.variance).toBe(-10000);
  });
});

describe("computePlanActualSeries", () => {
  it("строит ряд план/факт по месяцам с отклонением", () => {
    const actuals = [
      actual({ id: "a1", month: "2026-01", categoryId: "x", amount: 50000 }),
      actual({ id: "a2", month: "2026-02", categoryId: "x", amount: 30000 }),
    ];
    const series = computePlanActualSeries(40000, actuals, ["2026-01", "2026-02", "2026-03"]);
    expect(series).toEqual([
      { month: "2026-01", plan: 40000, actual: 50000, variance: 10000 },
      { month: "2026-02", plan: 40000, actual: 30000, variance: -10000 },
      { month: "2026-03", plan: 40000, actual: 0, variance: -40000 },
    ]);
  });
});

describe("lastNMonths", () => {
  it("возвращает n месяцев по возрастанию, заканчивая опорным месяцем", () => {
    const months = lastNMonths(3, new Date(2026, 2, 15)); // март 2026 (0-индекс месяца = 2)
    expect(months).toEqual(["2026-01", "2026-02", "2026-03"]);
  });

  it("корректно переходит через границу года", () => {
    const months = lastNMonths(3, new Date(2026, 1, 1)); // февраль 2026
    expect(months).toEqual(["2025-12", "2026-01", "2026-02"]);
  });
});

describe("shiftMonth", () => {
  it("сдвигает вперёд и назад, в т.ч. через границу года", () => {
    expect(shiftMonth("2026-01", 1)).toBe("2026-02");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });
});

describe("monthsInRange", () => {
  it("возвращает включительный диапазон по возрастанию", () => {
    expect(monthsInRange("2026-01", "2026-03")).toEqual(["2026-01", "2026-02", "2026-03"]);
  });

  it("диапазон через границу года", () => {
    expect(monthsInRange("2025-11", "2026-02")).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });

  it("один месяц", () => {
    expect(monthsInRange("2026-05", "2026-05")).toEqual(["2026-05"]);
  });

  it("to раньше from — пустой массив", () => {
    expect(monthsInRange("2026-05", "2026-01")).toEqual([]);
  });
});

describe("previousEquivalentRange", () => {
  it("предыдущий период той же длины, сразу перед текущим", () => {
    expect(previousEquivalentRange("2026-04", "2026-06")).toEqual({ from: "2026-01", to: "2026-03" });
  });

  it("один месяц", () => {
    expect(previousEquivalentRange("2026-03", "2026-03")).toEqual({ from: "2026-02", to: "2026-02" });
  });
});

describe("comparePeriods", () => {
  it("сравнивает факт текущего периода с предыдущим эквивалентным", () => {
    const actuals = [
      actual({ id: "a1", month: "2026-01", categoryId: "x", amount: 10000 }),
      actual({ id: "a2", month: "2026-02", categoryId: "x", amount: 10000 }),
      actual({ id: "a3", month: "2026-03", categoryId: "x", amount: 30000 }),
      actual({ id: "a4", month: "2026-04", categoryId: "x", amount: 40000 }),
    ];
    const result = comparePeriods(15000, actuals, "2026-03", "2026-04");
    expect(result.current.months).toEqual(["2026-03", "2026-04"]);
    expect(result.current.actual).toBe(70000);
    expect(result.current.plan).toBe(30000);
    expect(result.previous.months).toEqual(["2026-01", "2026-02"]);
    expect(result.previous.actual).toBe(20000);
    expect(result.actualDeltaPercent).toBe(250);
  });

  it("предыдущий период без факта — actualDeltaPercent равен null", () => {
    const actuals = [actual({ id: "a1", month: "2026-06", categoryId: "x", amount: 5000 })];
    const result = comparePeriods(1000, actuals, "2026-06", "2026-06");
    expect(result.previous.actual).toBe(0);
    expect(result.actualDeltaPercent).toBeNull();
  });
});

describe("computeCategoryPeriodComparison", () => {
  it("считает изменение факта по каждой статье к предыдущему периоду", () => {
    const categoryTotals: CategoryTotal[] = [{ categoryId: "1.1", annualTotal: 0, monthlyTotal: 0 }];
    const actuals = [
      actual({ id: "a1", month: "2026-01", categoryId: "1.1", amount: 10000 }),
      actual({ id: "a2", month: "2026-02", categoryId: "1.1", amount: 20000 }),
    ];
    const result = computeCategoryPeriodComparison(categoryTotals, actuals, "2026-02", "2026-02");
    const row = result.find((r) => r.categoryId === "1.1")!;
    expect(row.current).toBe(20000);
    expect(row.previous).toBe(10000);
    expect(row.deltaPercent).toBe(100);
  });
});
