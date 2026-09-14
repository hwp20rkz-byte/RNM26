import type { SparePartItem, TerritoryMaterialKind, TerritoryNormativeRates, TerritoryPassport, TerritoryWorkItem } from "./types";
import { TERRITORY_WORK_CATALOG } from "./data/territoryWorkCatalog";
import { DEFAULT_TERRITORY_NORMATIVE_RATES } from "./data/territoryNormativeRates";
import { computeTerritoryWorkAnnualCost, computeTerritoryWorkOccurrencesPerYear, defaultTerritoryVolume } from "./territoryWorkEngine";

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

// ---------------------------------------------------------------------------
// Потребность в материалах (посыпка/полив/удобрение) — Методические
// рекомендации №22-НҚ дают физические нормы расхода отдельно от Приложения Б
// (там только денежные расценки), поэтому годовая потребность в материалах
// НЕ считается из смет-движка (territoryWorkEngine.ts), а строится здесь
// заново из паспорта + норм.
//
// Частота обработок для противогололёдных материалов берётся из уже
// сверенных с оригиналом позиций каталога №36 (ПСС/щебень, 120 г/м²,
// придомовая территория) и №37 (реагенты ХК, 42 г/м², подъездные пути) —
// это реальная, проверенная периодичность (`computeTerritoryWorkOccurrencesPerYear`),
// а не собственное предположение движка.
//
// Для полива и внесения удобрений в каталоге Приложения Б НЕТ ни одной
// позиции (проверено — среди всех greenery_* категорий каталога встречаются
// только скашивание/обрезка/побелка, полив и подкормка там не
// тарифицируются отдельно). Поэтому частота этих операций за сезон здесь —
// [Предположение], а не норматив из источника; она вынесена в отдельный
// параметр `MaterialRequirementsAssumptions`, чтобы явно отличаться от
// проверенных антигололёдных величин.
// ---------------------------------------------------------------------------

export interface MaterialRequirementsAssumptions {
  /** Число поливов за тёплый сезон — не нормировано в источнике, допущение (по умолчанию ~раз в неделю на ~213-дневный тёплый период). */
  wateringApplicationsPerSeason: number;
  /** Число внесений удобрений в приствольные круги за сезон — допущение. */
  treeCircleFertilizerApplicationsPerYear: number;
  /** Число подсевов газона за сезон — допущение. */
  lawnReseedApplicationsPerYear: number;
  /** Площадь приствольного круга на одно дерево, м² — не задана в паспорте территории, типовое допущение (круг диаметром ~1,6 м). */
  treeCircleAreaSqmPerTree: number;
}

export const DEFAULT_MATERIAL_REQUIREMENTS_ASSUMPTIONS: MaterialRequirementsAssumptions = {
  wateringApplicationsPerSeason: 30,
  treeCircleFertilizerApplicationsPerYear: 2,
  lawnReseedApplicationsPerYear: 1,
  treeCircleAreaSqmPerTree: 2,
};

export interface MaterialRequirementsResult {
  /** Пескосоляная смесь/щебень на придомовую территорию, кг/год */
  antiIceSandSaltKg: number;
  /** Противогололёдные реагенты ХК на подъездные пути, кг/год */
  antiIceReagentKg: number;
  /** Вода на полив газонов/кустарников/деревьев за сезон, м³ */
  wateringSeasonWaterM3: number;
  /** Удобрение приствольных кругов, кг/год */
  fertilizerTreeCircleKg: number;
  /** Семена/удобрение для подсева газона, кг/год */
  fertilizerLawnReseedKg: number;
}

function findCatalogItemBySourceCode(sourceCode: string): TerritoryWorkItem | undefined {
  return TERRITORY_WORK_CATALOG.find((i) => i.sourceCode === sourceCode);
}

/**
 * Годовая потребность в материалах по содержанию территории — пескосоляная
 * смесь/реагенты на антигололёдную обработку (частота — из сверенных позиций
 * каталога №36/№37) и вода/удобрения на полив и уход за озеленением (частота
 * — допущение, см. `MaterialRequirementsAssumptions`).
 */
export function computeMaterialRequirements(
  passport: TerritoryPassport,
  rates: TerritoryNormativeRates = DEFAULT_TERRITORY_NORMATIVE_RATES,
  assumptions: MaterialRequirementsAssumptions = DEFAULT_MATERIAL_REQUIREMENTS_ASSUMPTIONS,
): MaterialRequirementsResult {
  const sandSaltItem = findCatalogItemBySourceCode("36");
  const reagentItem = findCatalogItemBySourceCode("37");

  const sandSaltOccurrences = sandSaltItem ? computeTerritoryWorkOccurrencesPerYear(sandSaltItem) : 0;
  const reagentOccurrences = reagentItem ? computeTerritoryWorkOccurrencesPerYear(reagentItem) : 0;

  const antiIceSandSaltKg = round2((passport.pavementAreaSqm * rates.antiIceSandSaltGPerSqm * sandSaltOccurrences) / 1000);
  const antiIceReagentKg = round2((passport.accessRoadAreaSqm * rates.antiIceReagentGPerSqm * reagentOccurrences) / 1000);

  const wateringLawnL = passport.greeneryAreaSqm * rates.wateringLawnLPerSqm * assumptions.wateringApplicationsPerSeason;
  const wateringShrubL = passport.shrubCount * rates.wateringShrubLPerUnit * assumptions.wateringApplicationsPerSeason;
  const wateringTreeL = passport.treeCount * rates.wateringTreeLPerUnit * assumptions.wateringApplicationsPerSeason;
  const wateringSeasonWaterM3 = round2((wateringLawnL + wateringShrubL + wateringTreeL) / 1000);

  const treeCircleAreaSqm = passport.treeCount * assumptions.treeCircleAreaSqmPerTree;
  const fertilizerTreeCircleKg = round2(
    (treeCircleAreaSqm * rates.fertilizerTreeCircleGPerSqm * assumptions.treeCircleFertilizerApplicationsPerYear) / 1000,
  );

  const fertilizerLawnReseedKg = round2(
    (passport.greeneryAreaSqm * rates.fertilizerLawnReseedGPerSqm * assumptions.lawnReseedApplicationsPerYear) / 1000,
  );

  return {
    antiIceSandSaltKg,
    antiIceReagentKg,
    wateringSeasonWaterM3,
    fertilizerTreeCircleKg,
    fertilizerLawnReseedKg,
  };
}

// ---------------------------------------------------------------------------
// Информационная разбивка «ОСИ vs Акимат» (п.4.2 Приказа №22-НҚ: расходы на
// подъездные пути к дому подлежат возмещению из местного бюджета, а не
// собственниками). Это ТОЛЬКО отчётная разбивка уже посчитанных величин —
// она не создаёт новых статей, не пишет в проект и не меняет то, что
// action `applyTerritoryPassportToDb` кладёт в фактическую смету/тариф
// (там по-прежнему все 109 позиций суммируются как раньше).
// ---------------------------------------------------------------------------

export type TerritoryResponsibilityZone = "osi" | "akimat";

/**
 * Зона ответственности позиции каталога — определяется тем же признаком,
 * который использует `defaultTerritoryVolume` для выбора поля паспорта
 * (единица измерения + категория), а не эвристикой по названию: km-позиции
 * и sqm-позиции категории `access_road_service` меряют подъездные пути
 * (Акимат), всё остальное — придомовую территорию (ОСИ).
 */
export function classifyTerritoryItemZone(item: TerritoryWorkItem): TerritoryResponsibilityZone {
  if (item.unit === "km") return "akimat";
  if (item.unit === "sqm" && item.category === "access_road_service") return "akimat";
  return "osi";
}

export const INDIRECT_COST_LIMIT_RATIO = 0.2;

export interface IndirectCostValidation {
  /** Доля косвенных затрат от прямых (indirectCosts / directCosts) */
  ratio: number;
  limitRatio: number;
  exceeds: boolean;
}

/** Проверка лимита п.9.4: косвенные затраты ≤ 20% от прямых. */
export function validateIndirectCostShare(directCosts: number, indirectCosts: number): IndirectCostValidation {
  if (directCosts <= 0) {
    return { ratio: indirectCosts > 0 ? Infinity : 0, limitRatio: INDIRECT_COST_LIMIT_RATIO, exceeds: indirectCosts > 0 };
  }
  const rawRatio = indirectCosts / directCosts;
  return { ratio: round4(rawRatio), limitRatio: INDIRECT_COST_LIMIT_RATIO, exceeds: rawRatio > INDIRECT_COST_LIMIT_RATIO };
}

export interface TerritoryBudgetBreakdown {
  /** Прямые затраты на придомовую территорию (зона ОСИ), ₸/год */
  directCostsOsi: number;
  /** Прямые затраты на подъездные пути (зона Акимат), ₸/год — к возмещению из местного бюджета, п.4.2 */
  directCostsAkimat: number;
  indirectCosts: number;
  indirectCostRatio: number;
  indirectLimitExceeded: boolean;
  totalDirect: number;
  totalWithIndirect: number;
}

/**
 * Информационная разбивка годового бюджета содержания территории по зонам
 * ответственности + проверка лимита косвенных затрат. Использует те же
 * `defaultTerritoryVolume`/`computeTerritoryWorkAnnualCost`, что и
 * существующий предпросмотр в форме паспорта территории — суммы совпадают
 * с уже видимым пользователю итогом, только разбиты по зонам.
 *
 * Чистая функция без побочных эффектов: не пишет в проект/смету, не влияет
 * на `applyTerritoryPassportToDb` и фактический тариф для собственников.
 */
export function computeTerritoryBudget(
  passport: TerritoryPassport,
  mrpValue: number,
  indirectCosts = 0,
): TerritoryBudgetBreakdown {
  let directCostsOsi = 0;
  let directCostsAkimat = 0;

  for (const item of TERRITORY_WORK_CATALOG) {
    const volume = defaultTerritoryVolume(item, passport);
    if (volume <= 0) continue;
    const cost = computeTerritoryWorkAnnualCost(item, volume, mrpValue);
    if (classifyTerritoryItemZone(item) === "akimat") {
      directCostsAkimat += cost;
    } else {
      directCostsOsi += cost;
    }
  }

  directCostsOsi = round2(directCostsOsi);
  directCostsAkimat = round2(directCostsAkimat);
  const totalDirect = round2(directCostsOsi + directCostsAkimat);
  const validation = validateIndirectCostShare(totalDirect, indirectCosts);

  return {
    directCostsOsi,
    directCostsAkimat,
    indirectCosts: round2(indirectCosts),
    indirectCostRatio: validation.ratio,
    indirectLimitExceeded: validation.exceeds,
    totalDirect,
    totalWithIndirect: round2(totalDirect + indirectCosts),
  };
}

// ---------------------------------------------------------------------------
// Сопоставление годовой потребности в материалах (computeMaterialRequirements
// выше) со складом ЗИП. `SparePartItem.territoryMaterialKind` (types.ts) —
// персистентное поле, которое пользователь проставляет вручную в реестре
// склада (SparePartsRegistry.tsx); эта функция строит сравнение по явному
// `mapping` (вызывающий код группирует id позиций склада по виду материала),
// не читая store напрямую — движок остаётся чистой функцией.
// ---------------------------------------------------------------------------

export type TerritoryMaterialUnit = "kg" | "m3";

const TERRITORY_MATERIAL_UNIT: Record<TerritoryMaterialKind, TerritoryMaterialUnit> = {
  antiIceSandSalt: "kg",
  antiIceReagent: "kg",
  wateringWater: "m3",
  fertilizerTreeCircle: "kg",
  fertilizerLawnReseed: "kg",
};

function requiredQtyByKind(required: MaterialRequirementsResult): Record<TerritoryMaterialKind, number> {
  return {
    antiIceSandSalt: required.antiIceSandSaltKg,
    antiIceReagent: required.antiIceReagentKg,
    wateringWater: required.wateringSeasonWaterM3,
    fertilizerTreeCircle: required.fertilizerTreeCircleKg,
    fertilizerLawnReseed: required.fertilizerLawnReseedKg,
  };
}

/** Для каждого вида материала — id позиций склада ЗИП (SparePartItem.id), которые его представляют. */
export type TerritoryMaterialStockMapping = Partial<Record<TerritoryMaterialKind, string[]>>;

export interface TerritoryMaterialShortfallRow {
  kind: TerritoryMaterialKind;
  unit: TerritoryMaterialUnit;
  requiredQty: number;
  availableQty: number;
  shortfall: number;
  isShort: boolean;
}

/**
 * Сравнивает годовую потребность в материалах с фактическими остатками
 * склада ЗИП по явному сопоставлению `mapping`. Чистая функция: не читает
 * и не пишет в проект, ничего не сохраняет — все данные приходят
 * параметрами и результат ничего не меняет в SparePartItem[].
 */
export function computeTerritoryMaterialShortfall(
  required: MaterialRequirementsResult,
  spareParts: SparePartItem[],
  mapping: TerritoryMaterialStockMapping,
): TerritoryMaterialShortfallRow[] {
  const requiredByKind = requiredQtyByKind(required);
  const byId = new Map(spareParts.map((sp) => [sp.id, sp] as const));
  return (Object.keys(requiredByKind) as TerritoryMaterialKind[]).map((kind) => {
    const ids = mapping[kind] ?? [];
    const availableQty = round2(ids.reduce((sum, id) => sum + (byId.get(id)?.quantityOnHand ?? 0), 0));
    const requiredQty = requiredByKind[kind];
    const shortfall = round2(Math.max(0, requiredQty - availableQty));
    return {
      kind,
      unit: TERRITORY_MATERIAL_UNIT[kind],
      requiredQty,
      availableQty,
      shortfall,
      isShort: shortfall > 0,
    };
  });
}
