import { describe, expect, it } from "vitest";
import { computeCategoryBreakdown, computePlanActualSeries, lastNMonths } from "./planVsActual";
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
