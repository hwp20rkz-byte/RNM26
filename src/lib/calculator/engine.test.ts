import { describe, expect, it } from "vitest";
import { buildDefaultDatabase } from "./database";
import { BUILTIN_PRESETS, DEFAULT_BUILDING } from "./presets";
import {
  applyPreset,
  computeApartmentCheck,
  computeCapitalRepairAnnual,
  computeCategoryTotals,
  computePresetTariff,
  computeTariff,
  computeTariffByUnitType,
  computeUsefulArea,
  compareToMinTariff,
  getChildren,
  getDescendantIds,
} from "./engine";

describe("computeTariff", () => {
  it("возвращает положительный конечный тариф для дефолтной базы", () => {
    const db = buildDefaultDatabase();
    const result = computeTariff(db, DEFAULT_BUILDING);
    expect(Number.isFinite(result.tariffPerSqm)).toBe(true);
    expect(result.tariffPerSqm).toBeGreaterThan(0);
  });

  it("Р год = Р упр. + Р сод.", () => {
    const db = buildDefaultDatabase();
    const result = computeTariff(db, DEFAULT_BUILDING);
    expect(result.annualTotalCost).toBeCloseTo(
      result.annualManagementCost + result.annualMaintenanceCost,
      2,
    );
  });

  it("бюджет за год = бюджет в месяц × 12 и тариф формула сходится", () => {
    const db = buildDefaultDatabase();
    const result = computeTariff(db, DEFAULT_BUILDING);
    expect(result.annualBudget).toBeCloseTo(result.monthlyBudget * 12, 1);
    expect(result.quarterlyBudget).toBeCloseTo(result.monthlyBudget * 3, 1);

    const expectedTariff =
      (result.annualTotalCost - result.annualCommercialIncome) / (result.usefulArea * 12);
    expect(result.tariffPerSqm).toBeCloseTo(expectedTariff, 2);
  });

  it("отключение статьи снижает тариф", () => {
    const db = buildDefaultDatabase();
    const before = computeTariff(db, DEFAULT_BUILDING);
    const targetItem = db.items.find((it) => it.categoryId === "2.7" && it.enabled);
    expect(targetItem).toBeTruthy();
    const db2 = {
      ...db,
      items: db.items.map((it) => (it.id === targetItem!.id ? { ...it, enabled: false } : it)),
    };
    const after = computeTariff(db2, DEFAULT_BUILDING);
    expect(after.tariffPerSqm).toBeLessThan(before.tariffPerSqm);
  });

  it("мультипликатор сценария пропорционально увеличивает стоимость атомарных статей", () => {
    const db = buildDefaultDatabase();
    const base = computeTariff(db, DEFAULT_BUILDING, 1);
    const scaled = computeTariff(db, DEFAULT_BUILDING, 2);
    // капремонт не зависит от мультипликатора, поэтому рост тарифа не ровно x2,
    // но при отсутствии капремонта/дохода рост был бы пропорционален.
    expect(scaled.annualManagementCost).toBeCloseTo(base.annualManagementCost * 2, 0);
  });
});

describe("computeCapitalRepairAnnual", () => {
  it("не менее 0,005 МРП × S полез. × 12 (жилая + коммерческая + кладовые + паркинг)", () => {
    const annual = computeCapitalRepairAnnual(DEFAULT_BUILDING, 3932);
    const usefulArea = computeUsefulArea(DEFAULT_BUILDING);
    expect(annual).toBeCloseTo(
      DEFAULT_BUILDING.capitalRepairMrpMultiplier * 3932 * usefulArea * 12,
      2,
    );
  });
});

describe("computeUsefulArea", () => {
  it("суммирует все 4 категории площади", () => {
    const b = { ...DEFAULT_BUILDING, livingArea: 100, commercialArea: 20, storageArea: 5, parkingArea: 15 };
    expect(computeUsefulArea(b)).toBe(140);
  });
});

describe("computeTariffByUnitType", () => {
  it("применяет коэффициент типа к базовому тарифу и считает итог по площади", () => {
    const b = {
      ...DEFAULT_BUILDING,
      livingArea: 100,
      commercialArea: 50,
      storageArea: 10,
      parkingArea: 20,
      commercialRateCoefficient: 1.5,
      storageRateCoefficient: 0.5,
      parkingRateCoefficient: 0.6,
    };
    const db = buildDefaultDatabase();
    const tariff = computeTariff(db, b);
    const lines = computeTariffByUnitType(tariff, b);

    const apartment = lines.find((l) => l.unitType === "apartment")!;
    const commercial = lines.find((l) => l.unitType === "commercial")!;
    const storage = lines.find((l) => l.unitType === "storage")!;
    const parking = lines.find((l) => l.unitType === "parking")!;

    expect(apartment.ratePerSqm).toBe(tariff.tariffPerSqm);
    expect(commercial.ratePerSqm).toBeCloseTo(tariff.tariffPerSqm * 1.5, 2);
    expect(storage.ratePerSqm).toBeCloseTo(tariff.tariffPerSqm * 0.5, 2);
    expect(parking.ratePerSqm).toBeCloseTo(tariff.tariffPerSqm * 0.6, 2);
    expect(storage.monthlyTotal).toBeCloseTo(storage.ratePerSqm * 10, 2);
  });
});

describe("computeApartmentCheck", () => {
  it("линейно масштабируется по площади", () => {
    expect(computeApartmentCheck(100, 40)).toBe(4000);
    expect(computeApartmentCheck(100, 80)).toBe(8000);
  });
});

describe("compareToMinTariff", () => {
  it("возвращает unknown без данных по региону", () => {
    expect(compareToMinTariff(100, undefined)).toBe("unknown");
  });
  it("отмечает тариф ниже минимального", () => {
    expect(
      compareToMinTariff(50, { region: "Х", minTariffPerSqm: 100, source: "", verified: false }),
    ).toBe("below");
  });
  it("отмечает тариф в пределах ориентира", () => {
    expect(
      compareToMinTariff(110, { region: "Х", minTariffPerSqm: 100, source: "", verified: false }),
    ).toBe("within");
  });
});

describe("категории — обход дерева", () => {
  it("getDescendantIds включает сам узел и всех потомков", () => {
    const db = buildDefaultDatabase();
    const ids = getDescendantIds(db.categories, "2.2");
    expect(ids.has("2.2")).toBe(true);
    expect(ids.has("2.2.1")).toBe(true);
    expect(ids.has("2.2.2")).toBe(true);
    expect(ids.has("1.1")).toBe(false);
  });

  it("getChildren возвращает прямых потомков категории", () => {
    const db = buildDefaultDatabase();
    const children = getChildren(db.categories, "2").map((c) => c.id);
    expect(children).toContain("2.1");
    expect(children).toContain("2.11");
    expect(children).not.toContain("2.2.1");
  });

  it("сумма категории 2 включает суммы всех дочерних подкатегорий", () => {
    const db = buildDefaultDatabase();
    const totals = computeCategoryTotals(db, DEFAULT_BUILDING);
    const byId = new Map(totals.map((t) => [t.categoryId, t.annualTotal]));
    const childSum = getChildren(db.categories, "2").reduce(
      (sum, c) => sum + (byId.get(c.id) ?? 0),
      0,
    );
    expect(byId.get("2")).toBeCloseTo(childSum, 2);
  });
});

describe("applyPreset / computePresetTariff", () => {
  it("пресет «Эконом» дешевле «Бизнес» на одинаковой базе", () => {
    const db = buildDefaultDatabase();
    const economy = BUILTIN_PRESETS.find((p) => p.id === "economy")!;
    const business = BUILTIN_PRESETS.find((p) => p.id === "business")!;
    const economyResult = computePresetTariff(db, DEFAULT_BUILDING, economy);
    const businessResult = computePresetTariff(db, DEFAULT_BUILDING, business);
    expect(economyResult.tariffPerSqm).toBeLessThan(businessResult.tariffPerSqm);
  });

  it("applyPreset отключает позиции выше допустимого класса обслуживания", () => {
    const db = buildDefaultDatabase();
    const economy = BUILTIN_PRESETS.find((p) => p.id === "economy")!;
    const filtered = applyPreset(db, economy);
    const businessOnlyItem = filtered.items.find((it) => it.minServiceClass === "comfort");
    const businessOnlyPayroll = filtered.payroll.find((p) => p.minServiceClass === "business");
    expect(businessOnlyItem?.enabled).toBe(false);
    expect(businessOnlyPayroll?.enabled).toBe(false);
  });

  it("все 4 встроенных пресета образуют возрастающую по цене лестницу", () => {
    const db = buildDefaultDatabase();
    const tariffs = BUILTIN_PRESETS.map((p) => computePresetTariff(db, DEFAULT_BUILDING, p).tariffPerSqm);
    for (let i = 1; i < tariffs.length; i++) {
      expect(tariffs[i]).toBeGreaterThan(tariffs[i - 1]);
    }
  });
});
