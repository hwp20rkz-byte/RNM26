import { describe, expect, it } from "vitest";
import type { TerritoryPassport } from "./types";
import { TERRITORY_WORK_CATALOG } from "./data/territoryWorkCatalog";
import { DEFAULT_TERRITORY_NORMATIVE_RATES } from "./data/territoryNormativeRates";
import {
  DEFAULT_MATERIAL_REQUIREMENTS_ASSUMPTIONS,
  INDIRECT_COST_LIMIT_RATIO,
  classifyTerritoryItemZone,
  computeMaterialRequirements,
  computeTerritoryBudget,
  validateIndirectCostShare,
} from "./territoryNormativeEngine";

function makePassport(overrides: Partial<TerritoryPassport> = {}): TerritoryPassport {
  return {
    id: "pass-1",
    pavementAreaSqm: 0,
    accessRoadAreaSqm: 0,
    greeneryAreaSqm: 0,
    accessRoadLengthKm: 0,
    treeCount: 0,
    shrubCount: 0,
    urnCount: 0,
    lightingFixtureCount: 0,
    playgroundCount: 0,
    wasteSiteCount: 0,
    compiledAt: "2026-09-14",
    ...overrides,
  };
}

const FULL_PASSPORT = makePassport({
  pavementAreaSqm: 1000,
  accessRoadAreaSqm: 500,
  greeneryAreaSqm: 800,
  accessRoadLengthKm: 0.3,
  treeCount: 10,
  shrubCount: 20,
  urnCount: 5,
  lightingFixtureCount: 8,
  playgroundCount: 1,
  wasteSiteCount: 1,
});

describe("data defaults", () => {
  it("DEFAULT_TERRITORY_NORMATIVE_RATES matches Приказ №22-НҚ norms from the brief", () => {
    expect(DEFAULT_TERRITORY_NORMATIVE_RATES).toEqual({
      antiIceSandSaltGPerSqm: 120,
      antiIceReagentGPerSqm: 42,
      wateringLawnLPerSqm: 5,
      wateringShrubLPerUnit: 20,
      wateringTreeLPerUnit: 35,
      fertilizerTreeCircleGPerSqm: 180,
      fertilizerLawnReseedGPerSqm: 30,
    });
  });

  it("DEFAULT_MATERIAL_REQUIREMENTS_ASSUMPTIONS has documented default frequencies", () => {
    expect(DEFAULT_MATERIAL_REQUIREMENTS_ASSUMPTIONS).toEqual({
      wateringApplicationsPerSeason: 30,
      treeCircleFertilizerApplicationsPerYear: 2,
      lawnReseedApplicationsPerYear: 1,
      treeCircleAreaSqmPerTree: 2,
    });
  });

  it("INDIRECT_COST_LIMIT_RATIO is 20% per п.9.4", () => {
    expect(INDIRECT_COST_LIMIT_RATIO).toBe(0.2);
  });
});

describe("computeMaterialRequirements", () => {
  it("computes anti-ice sand/salt using the verified occurrence frequency of catalog item №36", () => {
    // 50 обработок/год × 1000 м² × 120 г/м² / 1000 = 6000 кг
    const result = computeMaterialRequirements(FULL_PASSPORT);
    expect(result.antiIceSandSaltKg).toBe(6000);
  });

  it("computes anti-ice reagent using the verified occurrence frequency of catalog item №37", () => {
    // 50 обработок/год × 500 м² × 42 г/м² / 1000 = 1050 кг
    const result = computeMaterialRequirements(FULL_PASSPORT);
    expect(result.antiIceReagentKg).toBe(1050);
  });

  it("computes seasonal watering water volume across lawn/shrubs/trees", () => {
    // (800×5 + 20×20 + 10×35) л × 30 поливов / 1000 = 142.5 м³
    const result = computeMaterialRequirements(FULL_PASSPORT);
    expect(result.wateringSeasonWaterM3).toBe(142.5);
  });

  it("computes tree-circle fertilizer requirement", () => {
    // 10 деревьев × 2 м²/дерево × 180 г/м² × 2 внесения / 1000 = 7.2 кг
    const result = computeMaterialRequirements(FULL_PASSPORT);
    expect(result.fertilizerTreeCircleKg).toBe(7.2);
  });

  it("computes lawn reseed fertilizer requirement", () => {
    // 800 м² × 30 г/м² × 1 подсев / 1000 = 24 кг
    const result = computeMaterialRequirements(FULL_PASSPORT);
    expect(result.fertilizerLawnReseedKg).toBe(24);
  });

  it("returns all-zero result for an empty passport", () => {
    const result = computeMaterialRequirements(makePassport());
    expect(result).toEqual({
      antiIceSandSaltKg: 0,
      antiIceReagentKg: 0,
      wateringSeasonWaterM3: 0,
      fertilizerTreeCircleKg: 0,
      fertilizerLawnReseedKg: 0,
    });
  });

  it("scales sand/salt requirement proportionally with a custom rate", () => {
    const doubled = computeMaterialRequirements(FULL_PASSPORT, {
      ...DEFAULT_TERRITORY_NORMATIVE_RATES,
      antiIceSandSaltGPerSqm: DEFAULT_TERRITORY_NORMATIVE_RATES.antiIceSandSaltGPerSqm * 2,
    });
    const base = computeMaterialRequirements(FULL_PASSPORT);
    expect(doubled.antiIceSandSaltKg).toBe(base.antiIceSandSaltKg * 2);
  });

  it("zero watering applications per season yields zero water requirement", () => {
    const result = computeMaterialRequirements(FULL_PASSPORT, DEFAULT_TERRITORY_NORMATIVE_RATES, {
      ...DEFAULT_MATERIAL_REQUIREMENTS_ASSUMPTIONS,
      wateringApplicationsPerSeason: 0,
    });
    expect(result.wateringSeasonWaterM3).toBe(0);
  });

  it("zero tree-circle fertilizer applications yields zero fertilizer requirement", () => {
    const result = computeMaterialRequirements(FULL_PASSPORT, DEFAULT_TERRITORY_NORMATIVE_RATES, {
      ...DEFAULT_MATERIAL_REQUIREMENTS_ASSUMPTIONS,
      treeCircleFertilizerApplicationsPerYear: 0,
    });
    expect(result.fertilizerTreeCircleKg).toBe(0);
  });

  it("zero tree-circle area per tree yields zero fertilizer requirement even with trees present", () => {
    const result = computeMaterialRequirements(FULL_PASSPORT, DEFAULT_TERRITORY_NORMATIVE_RATES, {
      ...DEFAULT_MATERIAL_REQUIREMENTS_ASSUMPTIONS,
      treeCircleAreaSqmPerTree: 0,
    });
    expect(result.fertilizerTreeCircleKg).toBe(0);
  });

  it("never returns NaN or negative values for a populated passport", () => {
    const result = computeMaterialRequirements(FULL_PASSPORT);
    for (const value of Object.values(result)) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("classifyTerritoryItemZone", () => {
  function itemBySourceCode(sourceCode: string) {
    const item = TERRITORY_WORK_CATALOG.find((i) => i.sourceCode === sourceCode);
    if (!item) throw new Error(`catalog item ${sourceCode} not found`);
    return item;
  }

  it("classifies km-unit items as akimat (volume always sourced from accessRoadLengthKm)", () => {
    expect(classifyTerritoryItemZone(itemBySourceCode("1"))).toBe("akimat");
  });

  it("classifies sqm-unit access_road_service items as akimat", () => {
    expect(classifyTerritoryItemZone(itemBySourceCode("33"))).toBe("akimat");
  });

  it("classifies sqm-unit non-access-road items (anti-ice on придомовая) as osi", () => {
    expect(classifyTerritoryItemZone(itemBySourceCode("36"))).toBe("osi");
  });

  it("classifies element-unit greenery items as osi", () => {
    expect(classifyTerritoryItemZone(itemBySourceCode("105"))).toBe("osi");
  });

  it("classifies cubic_m-unit items as osi", () => {
    expect(classifyTerritoryItemZone(itemBySourceCode("104"))).toBe("osi");
  });
});

describe("validateIndirectCostShare", () => {
  it("does not exceed at exactly the 20% boundary", () => {
    const result = validateIndirectCostShare(1000, 200);
    expect(result.ratio).toBe(0.2);
    expect(result.exceeds).toBe(false);
  });

  it("exceeds just above the 20% boundary", () => {
    const result = validateIndirectCostShare(1000, 200.01);
    expect(result.exceeds).toBe(true);
  });

  it("does not exceed with zero indirect costs", () => {
    const result = validateIndirectCostShare(1000, 0);
    expect(result.ratio).toBe(0);
    expect(result.exceeds).toBe(false);
  });

  it("handles zero direct and zero indirect costs without dividing by zero", () => {
    const result = validateIndirectCostShare(0, 0);
    expect(result.ratio).toBe(0);
    expect(result.exceeds).toBe(false);
  });

  it("flags any positive indirect cost against zero direct cost as exceeding", () => {
    const result = validateIndirectCostShare(0, 100);
    expect(result.ratio).toBe(Infinity);
    expect(result.exceeds).toBe(true);
  });

  it("treats a non-positive direct cost the same as zero direct cost", () => {
    const result = validateIndirectCostShare(-100, 50);
    expect(result.exceeds).toBe(true);
  });

  it("always reports the 20% limit ratio", () => {
    expect(validateIndirectCostShare(500, 50).limitRatio).toBe(INDIRECT_COST_LIMIT_RATIO);
  });
});

describe("computeTerritoryBudget", () => {
  const MRP_VALUE = 3932;

  it("splits into osi/akimat parts that sum to totalDirect", () => {
    const budget = computeTerritoryBudget(FULL_PASSPORT, MRP_VALUE);
    expect(budget.directCostsOsi + budget.directCostsAkimat).toBeCloseTo(budget.totalDirect, 2);
  });

  it("adds indirect costs on top for totalWithIndirect", () => {
    const budget = computeTerritoryBudget(FULL_PASSPORT, MRP_VALUE, 1000);
    expect(budget.totalWithIndirect).toBeCloseTo(budget.totalDirect + 1000, 2);
  });

  it("returns an all-zero budget for an empty passport", () => {
    const budget = computeTerritoryBudget(makePassport(), MRP_VALUE);
    expect(budget.directCostsOsi).toBe(0);
    expect(budget.directCostsAkimat).toBe(0);
    expect(budget.totalDirect).toBe(0);
    expect(Number.isFinite(budget.totalDirect)).toBe(true);
  });

  it("produces akimat-zone costs when accessRoadLengthKm is set (km-priced items)", () => {
    const budget = computeTerritoryBudget(makePassport({ accessRoadLengthKm: 1 }), MRP_VALUE);
    expect(budget.directCostsAkimat).toBeGreaterThan(0);
  });

  it("produces zero akimat-zone costs when there is no access-road footprint at all", () => {
    const budget = computeTerritoryBudget(makePassport({ pavementAreaSqm: 1000, treeCount: 5 }), MRP_VALUE);
    expect(budget.directCostsAkimat).toBe(0);
    expect(budget.directCostsOsi).toBeGreaterThan(0);
  });

  it("scales to zero when mrpValue is zero", () => {
    const budget = computeTerritoryBudget(FULL_PASSPORT, 0);
    expect(budget.totalDirect).toBe(0);
  });

  it("propagates indirectLimitExceeded=false when indirect costs stay within 20% of direct costs", () => {
    const passport = makePassport({ pavementAreaSqm: 1000, treeCount: 5 });
    const base = computeTerritoryBudget(passport, MRP_VALUE);
    const withinLimit = computeTerritoryBudget(passport, MRP_VALUE, base.totalDirect * 0.15);
    expect(withinLimit.indirectLimitExceeded).toBe(false);
  });

  it("propagates indirectLimitExceeded=true when indirect costs exceed 20% of direct costs", () => {
    const passport = makePassport({ pavementAreaSqm: 1000, treeCount: 5 });
    const base = computeTerritoryBudget(passport, MRP_VALUE);
    const overLimit = computeTerritoryBudget(passport, MRP_VALUE, base.totalDirect * 0.25);
    expect(overLimit.indirectLimitExceeded).toBe(true);
  });

  it("never returns NaN or negative totals for a populated passport", () => {
    const budget = computeTerritoryBudget(FULL_PASSPORT, MRP_VALUE, 500);
    expect(Number.isFinite(budget.totalDirect)).toBe(true);
    expect(Number.isFinite(budget.totalWithIndirect)).toBe(true);
    expect(budget.totalDirect).toBeGreaterThanOrEqual(0);
    expect(budget.directCostsOsi).toBeGreaterThanOrEqual(0);
    expect(budget.directCostsAkimat).toBeGreaterThanOrEqual(0);
  });

  it("does not mutate the passport or the shared catalog", () => {
    const passport = makePassport({ pavementAreaSqm: 1000, accessRoadLengthKm: 1, treeCount: 5 });
    const passportSnapshot = { ...passport };
    const catalogLength = TERRITORY_WORK_CATALOG.length;
    computeTerritoryBudget(passport, MRP_VALUE, 200);
    expect(passport).toEqual(passportSnapshot);
    expect(TERRITORY_WORK_CATALOG.length).toBe(catalogLength);
  });
});
