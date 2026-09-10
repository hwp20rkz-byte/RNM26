import { describe, expect, it } from "vitest";
import {
  computeAllWear,
  computeAssetWear,
  computeCapitalFundProjection,
  computeReplacementPlan,
  conditionForWear,
  CONDITION_LABELS,
} from "./wearEngine";
import type { Asset } from "./types";

const ts = "2024-01-01T00:00:00.000Z";

function makeAsset(partial: Partial<Asset> = {}): Asset {
  return {
    id: "a1",
    name: "Насос",
    category: "heating",
    quantity: 2,
    installedYear: 2016,
    normativeLifeYears: 10,
    replacementUnitCost: 100_000,
    createdAt: ts,
    updatedAt: ts,
    ...partial,
  };
}

describe("conditionForWear", () => {
  it("классифицирует пороги состояния", () => {
    expect(conditionForWear(0)).toBe("good");
    expect(conditionForWear(39.9)).toBe("good");
    expect(conditionForWear(40)).toBe("satisfactory");
    expect(conditionForWear(60)).toBe("attention");
    expect(conditionForWear(80)).toBe("critical");
    expect(conditionForWear(100)).toBe("expired");
    expect(conditionForWear(150)).toBe("expired");
  });

  it("для каждого состояния есть русская подпись", () => {
    for (const key of Object.keys(CONDITION_LABELS)) {
      expect(CONDITION_LABELS[key as keyof typeof CONDITION_LABELS]).toBeTruthy();
    }
  });
});

describe("computeAssetWear", () => {
  it("линейный износ по возрасту/нормативному сроку — дому 10 лет, насос изношен на 100%", () => {
    // installedYear=2016, normativeLifeYears=10 -> currentYear=2026 -> 100% износа
    const asset = makeAsset({ installedYear: 2016, normativeLifeYears: 10 });
    const wear = computeAssetWear(asset, 2026);
    expect(wear.ageYears).toBe(10);
    expect(wear.wearPercent).toBe(100);
    expect(wear.condition).toBe("expired");
    expect(wear.remainingYears).toBe(0);
  });

  it("70-80% износа на 7-8 году при сроке 10 лет — сценарий из задачи пользователя", () => {
    const asset7 = makeAsset({ installedYear: 2016, normativeLifeYears: 10 });
    const wear7 = computeAssetWear(asset7, 2023);
    expect(wear7.wearPercent).toBe(70);
    expect(wear7.condition).toBe("attention");

    const asset8 = makeAsset({ installedYear: 2016, normativeLifeYears: 10 });
    const wear8 = computeAssetWear(asset8, 2024);
    expect(wear8.wearPercent).toBe(80);
    expect(wear8.condition).toBe("critical");
  });

  it("не уходит выше 100% при превышении нормативного срока", () => {
    const asset = makeAsset({ installedYear: 2000, normativeLifeYears: 10 });
    const wear = computeAssetWear(asset, 2026);
    expect(wear.wearPercent).toBe(100);
    expect(wear.remainingYears).toBe(0);
  });

  it("manualWearOverridePercent переопределяет расчёт по возрасту", () => {
    const asset = makeAsset({ installedYear: 2020, normativeLifeYears: 10, manualWearOverridePercent: 90 });
    const wear = computeAssetWear(asset, 2022);
    expect(wear.wearPercent).toBe(90);
    expect(wear.condition).toBe("critical");
    // остаток ресурса при ручной корректировке считается от переопределённого % износа
    expect(wear.remainingYears).toBe(1);
    expect(wear.targetReplacementYear).toBe(2022 + 1);
  });

  it("стоимость замены = количество × цена за единицу", () => {
    const asset = makeAsset({ quantity: 3, replacementUnitCost: 50_000 });
    const wear = computeAssetWear(asset, 2020);
    expect(wear.replacementCost).toBe(150_000);
  });

  it("лифт с назначенным сроком 25 лет — учитывается наравне с остальным оборудованием, но помечается criticalSafety", () => {
    const lift = makeAsset({
      name: "Лифт пассажирский",
      category: "elevators",
      installedYear: 2001,
      normativeLifeYears: 25,
      criticalSafety: true,
    });
    const wear = computeAssetWear(lift, 2026);
    expect(wear.wearPercent).toBe(100);
    expect(wear.condition).toBe("expired");
  });
});

describe("computeAllWear", () => {
  it("считает износ для списка активов", () => {
    const assets = [makeAsset({ id: "a1" }), makeAsset({ id: "a2", installedYear: 2022 })];
    const wears = computeAllWear(assets, 2026);
    expect(wears).toHaveLength(2);
    expect(wears.map((w) => w.assetId)).toEqual(["a1", "a2"]);
  });
});

describe("computeReplacementPlan", () => {
  it("группирует активы по плановому году замены в пределах горизонта", () => {
    const assets = [
      makeAsset({ id: "a1", installedYear: 2016, normativeLifeYears: 10 }), // -> 2026
      makeAsset({ id: "a2", installedYear: 2018, normativeLifeYears: 10 }), // -> 2028
    ];
    const wears = computeAllWear(assets, 2026);
    const plan = computeReplacementPlan(assets, wears, 2026, 5);
    expect(plan).toHaveLength(5);
    expect(plan[0].year).toBe(2026);
    expect(plan[0].assetIds).toContain("a1");
    expect(plan[2].year).toBe(2028);
    expect(plan[2].assetIds).toContain("a2");
  });

  it("активы с целевым годом до начала горизонта попадают в первый год плана", () => {
    const assets = [makeAsset({ id: "old", installedYear: 2000, normativeLifeYears: 10 })];
    const wears = computeAllWear(assets, 2026);
    const plan = computeReplacementPlan(assets, wears, 2026, 3);
    expect(plan[0].assetIds).toContain("old");
  });

  it("активы с целевым годом за горизонтом попадают в последний год плана", () => {
    const assets = [makeAsset({ id: "future", installedYear: 2024, normativeLifeYears: 30 })];
    const wears = computeAllWear(assets, 2026);
    const plan = computeReplacementPlan(assets, wears, 2026, 3);
    expect(plan[plan.length - 1].assetIds).toContain("future");
  });

  it("суммирует стоимость замены по году", () => {
    const assets = [
      makeAsset({ id: "a1", installedYear: 2016, normativeLifeYears: 10, quantity: 1, replacementUnitCost: 100_000 }),
      makeAsset({ id: "a2", installedYear: 2016, normativeLifeYears: 10, quantity: 2, replacementUnitCost: 50_000 }),
    ];
    const wears = computeAllWear(assets, 2026);
    const plan = computeReplacementPlan(assets, wears, 2026, 1);
    expect(plan[0].totalCost).toBe(200_000);
  });
});

describe("computeCapitalFundProjection", () => {
  it("проецирует баланс фонда: доход минус плановые траты по годам", () => {
    const plan = [
      { year: 2026, assetIds: [], totalCost: 100_000 },
      { year: 2027, assetIds: [], totalCost: 0 },
      { year: 2028, assetIds: [], totalCost: 500_000 },
    ];
    const projection = computeCapitalFundProjection(200_000, 150_000, plan);
    expect(projection[0].balance).toBe(200_000 + 150_000 - 100_000);
    expect(projection[1].balance).toBe(projection[0].balance + 150_000);
    expect(projection[2].balance).toBe(projection[1].balance + 150_000 - 500_000);
  });

  it("баланс может уйти в отрицательную зону — сигнал дефицита фонда", () => {
    const plan = [{ year: 2026, assetIds: [], totalCost: 1_000_000 }];
    const projection = computeCapitalFundProjection(0, 10_000, plan);
    expect(projection[0].balance).toBeLessThan(0);
  });
});
