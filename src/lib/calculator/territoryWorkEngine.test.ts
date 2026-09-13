import { describe, expect, it } from "vitest";
import {
  buildMrpForecastSeries,
  computeTerritoryWorkAnnualCost,
  computeTerritoryWorkOccurrencesPerYear,
  instantiateTerritoryCostItem,
  projectMrpValue,
} from "./territoryWorkEngine";
import { TERRITORY_WORK_CATALOG } from "./data/territoryWorkCatalog";
import type { TerritoryWorkItem } from "./types";

function makeItem(partial: Partial<TerritoryWorkItem> = {}): TerritoryWorkItem {
  return {
    id: "twi-test",
    name: "Тестовая работа",
    category: "manual_cleaning_warm",
    unit: "sqm",
    ratePerUnitMrp: 2,
    unitSize: 1000,
    periodDays: 213,
    intervalDays: 2,
    verified: false,
    source: "test",
    ...partial,
  };
}

describe("computeTerritoryWorkOccurrencesPerYear", () => {
  it("делит период на интервал", () => {
    expect(computeTerritoryWorkOccurrencesPerYear(makeItem({ periodDays: 213, intervalDays: 2 }))).toBeCloseTo(106.5);
  });

  it("возвращает 0 при нулевом интервале", () => {
    expect(computeTerritoryWorkOccurrencesPerYear(makeItem({ intervalDays: 0 }))).toBe(0);
  });
});

describe("computeTerritoryWorkAnnualCost", () => {
  it("учитывает деноминацию ставки (unitSize)", () => {
    const item = makeItem({ ratePerUnitMrp: 3, unitSize: 1000, periodDays: 365, intervalDays: 1 });
    // 5000 м² территории, ставка на 1000 м², раз в сутки весь год, МРП=3500
    const cost = computeTerritoryWorkAnnualCost(item, 5000, 3500);
    expect(cost).toBe(3 * 3500 * (5000 / 1000) * 365);
  });

  it("годовая стоимость масштабируется пропорционально объёму", () => {
    const item = makeItem();
    const cost1 = computeTerritoryWorkAnnualCost(item, 1000, 3500);
    const cost2 = computeTerritoryWorkAnnualCost(item, 2000, 3500);
    expect(cost2).toBeCloseTo(cost1 * 2);
  });
});

describe("instantiateTerritoryCostItem", () => {
  it("собирает CostItem с annualQty и unitPrice, готовыми для существующего движка сметы", () => {
    const item = makeItem({ id: "twi-30", sourceCode: "30", ratePerUnitMrp: 3, unitSize: 1000, periodDays: 152, intervalDays: 1 });
    const result = instantiateTerritoryCostItem(item, "2.3", 5000, 3500);
    expect(result.id).toBe("terr-twi-30");
    expect(result.categoryId).toBe("2.3");
    expect(result.name).toContain("30");
    expect(result.unitPrice).toBe(3 * 3500);
    expect(result.annualQty).toBeCloseTo((5000 / 1000) * 152);
    expect(result.enabled).toBe(true);
    expect(result.tooltip).toContain("⚠");
  });

  it("не добавляет предупреждение в подсказку для сверенных позиций", () => {
    const item = makeItem({ verified: true, source: "проверено вручную" });
    const result = instantiateTerritoryCostItem(item, "2.3", 1000, 3500);
    expect(result.tooltip).toBe("проверено вручную");
  });
});

describe("TERRITORY_WORK_CATALOG", () => {
  it("не содержит дублирующихся id", () => {
    const ids = TERRITORY_WORK_CATALOG.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("позиции 1-41 (спецтехника/ручная уборка/ямочный ремонт) сверены с оригиналом PDF", () => {
    const verifiedCodes = TERRITORY_WORK_CATALOG.filter((i) => i.verified).map((i) => i.sourceCode);
    expect(verifiedCodes.length).toBeGreaterThanOrEqual(35);
    expect(verifiedCodes).toContain("1");
    expect(verifiedCodes).toContain("38");
  });

  it("позиции по МАФ/озеленению/контейнерам остаются непроверенными (не сверены построчно)", () => {
    const maf = TERRITORY_WORK_CATALOG.find((i) => i.sourceCode === "60");
    expect(maf?.verified).toBe(false);
  });

  it("расчёт годовой стоимости не даёт отрицательных или NaN значений по всему каталогу", () => {
    for (const workItem of TERRITORY_WORK_CATALOG) {
      const cost = computeTerritoryWorkAnnualCost(workItem, 1000, 3500);
      expect(Number.isFinite(cost)).toBe(true);
      expect(cost).toBeGreaterThanOrEqual(0);
    }
  });

  it("содержит полную транскрипцию Приложения Б (109 позиций)", () => {
    expect(TERRITORY_WORK_CATALOG).toHaveLength(109);
  });
});

describe("projectMrpValue", () => {
  it("возвращает базовое значение для базового года", () => {
    expect(projectMrpValue(3932, 2025, 6, 2025)).toBe(3932);
  });

  it("применяет сложный процент за N лет", () => {
    const v = projectMrpValue(1000, 2025, 10, 2027);
    expect(v).toBeCloseTo(1000 * 1.1 * 1.1);
  });

  it("не проецирует назад (год раньше базового возвращает базовое значение)", () => {
    expect(projectMrpValue(3932, 2025, 6, 2020)).toBe(3932);
  });
});

describe("buildMrpForecastSeries", () => {
  it("строит ряд по годам с накопленным ростом", () => {
    const series = buildMrpForecastSeries(3932, 2025, 6, [2026, 2027, 2028, 2029, 2030]);
    expect(series).toHaveLength(5);
    expect(series[0].year).toBe(2026);
    expect(series[0].mrpValue).toBeCloseTo(3932 * 1.06, 1);
    expect(series[4].mrpValue).toBeGreaterThan(series[0].mrpValue);
    // монотонный рост
    for (let i = 1; i < series.length; i++) {
      expect(series[i].mrpValue).toBeGreaterThan(series[i - 1].mrpValue);
    }
  });
});
