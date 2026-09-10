import type { RegionalMinTariff } from "./types";

/**
 * ⚠️ СПРАВОЧНЫЕ, ИЛЛЮСТРАТИВНЫЕ значения. Минимальные тарифы на содержание
 * жилья по каждому региону утверждаются собственными решениями маслихатов
 * (и периодически пересматриваются), единого публичного реестра нет.
 * Приведённые числа — ориентир порядка величины на 2025-2026 гг. по открытым
 * публикациям в СМИ/акиматах и НЕ являются юридически проверенным источником.
 * Перед использованием в реальной смете ОБЯЗАТЕЛЬНО сверьте актуальное решение
 * маслихата вашего города/района.
 */
export const REGIONAL_MIN_TARIFFS: RegionalMinTariff[] = [
  { region: "Астана", minTariffPerSqm: 100, source: "Оценка по открытым данным, требует проверки", verified: false },
  { region: "Алматы", minTariffPerSqm: 95, source: "Оценка по открытым данным, требует проверки", verified: false },
  { region: "Шымкент", minTariffPerSqm: 75, source: "Оценка по открытым данным, требует проверки", verified: false },
  { region: "Актобе", minTariffPerSqm: 70, source: "Оценка по открытым данным, требует проверки", verified: false },
  { region: "Атырау", minTariffPerSqm: 85, source: "Оценка по открытым данным, требует проверки", verified: false },
  { region: "Караганда", minTariffPerSqm: 72, source: "Оценка по открытым данным, требует проверки", verified: false },
  { region: "Костанай", minTariffPerSqm: 68, source: "Оценка по открытым данным, требует проверки", verified: false },
  { region: "Павлодар", minTariffPerSqm: 70, source: "Оценка по открытым данным, требует проверки", verified: false },
  { region: "Усть-Каменогорск", minTariffPerSqm: 70, source: "Оценка по открытым данным, требует проверки", verified: false },
  { region: "Шахтинск / Другой регион", minTariffPerSqm: 60, source: "Оценка по открытым данным, требует проверки", verified: false },
];

export function findMinTariff(region: string): RegionalMinTariff | undefined {
  return REGIONAL_MIN_TARIFFS.find((r) => r.region === region);
}
