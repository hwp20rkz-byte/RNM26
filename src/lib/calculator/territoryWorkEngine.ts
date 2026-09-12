import type { CostItem, ItemFrequency, TerritoryWorkItem } from "./types";

/**
 * Число выполнений работы в год = длительность применимого периода / интервал
 * повторения (Приложение А, столбцы «кратность и сроки»). Реконструировано
 * по перекрёстной сверке периодов в исходнике — см. предупреждение у
 * TerritoryWorkItem.verified.
 */
export function computeTerritoryWorkOccurrencesPerYear(item: TerritoryWorkItem): number {
  if (item.intervalDays <= 0) return 0;
  return item.periodDays / item.intervalDays;
}

/**
 * Годовая стоимость позиции = расценка (МРП / unitSize единиц) × МРП ×
 * (объём / unitSize) × число выполнений в год. Объём (V) — из паспорта
 * территории, в «сырых» единицах item.unit (напр. м², пог.м), ДО деления
 * на деноминацию ставки.
 */
export function computeTerritoryWorkAnnualCost(
  item: TerritoryWorkItem,
  volume: number,
  mrpValue: number,
): number {
  const occurrencesPerYear = computeTerritoryWorkOccurrencesPerYear(item);
  const rateApplications = volume / item.unitSize;
  return item.ratePerUnitMrp * mrpValue * rateApplications * occurrencesPerYear;
}

const FREQUENCY_BY_MIN_INTERVAL_DAYS: { max: number; frequency: ItemFrequency }[] = [
  { max: 31, frequency: "monthly" },
  { max: 92, frequency: "quarterly" },
  { max: 366, frequency: "seasonal" },
  { max: Infinity, frequency: "annual" },
];

function frequencyForInterval(intervalDays: number): ItemFrequency {
  return FREQUENCY_BY_MIN_INTERVAL_DAYS.find((f) => intervalDays <= f.max)!.frequency;
}

/**
 * Преобразует позицию каталога придомовой территории в обычную CostItem
 * действующей базы (categories/items) — детальный каталог не подменяет
 * существующие статьи 2.3/2.10, а служит источником для их наполнения при
 * включении «детального режима» по конкретному дому.
 */
export function instantiateTerritoryCostItem(
  item: TerritoryWorkItem,
  categoryId: string,
  volume: number,
  mrpValue: number,
): CostItem {
  const occurrencesPerYear = computeTerritoryWorkOccurrencesPerYear(item);
  const rateApplications = volume / item.unitSize;
  return {
    id: `terr-${item.id}`,
    categoryId,
    name: item.sourceCode ? `${item.sourceCode} ${item.name}` : item.name,
    unit: item.unitSize === 1 ? item.unit : `${item.unitSize} ${item.unit}`,
    annualQty: rateApplications * occurrencesPerYear,
    unitPrice: item.ratePerUnitMrp * mrpValue,
    frequency: frequencyForInterval(item.intervalDays),
    enabled: true,
    minServiceClass: item.minServiceClass,
    tooltip: item.verified
      ? item.source
      : `⚠ Не сверено с оригиналом документа: ${item.source}`,
    source: item.source,
  };
}
