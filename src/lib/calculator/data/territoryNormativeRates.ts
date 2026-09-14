import type { TerritoryNormativeRates } from "../types";

/**
 * Нормы расхода материалов по содержанию придомовой территории — из текста
 * Методических рекомендаций по содержанию и уборке придомовых территорий
 * объектов кондоминиума и подъездных путей к ним, утв. приказом Комитета по
 * делам строительства и ЖКХ МИИР РК №22-НҚ от 01.12.2023 (раздел «Нормы
 * расхода материалов»). Значение нормы полива дерева в источнике дано
 * диапазоном 30–40 л/дерево — здесь взята середина диапазона (35 л/дерево),
 * подробнее об этом допущении см. комментарий в territoryNormativeEngine.ts.
 */
export const DEFAULT_TERRITORY_NORMATIVE_RATES: TerritoryNormativeRates = {
  antiIceSandSaltGPerSqm: 120,
  antiIceReagentGPerSqm: 42,
  wateringLawnLPerSqm: 5,
  wateringShrubLPerUnit: 20,
  wateringTreeLPerUnit: 35,
  fertilizerTreeCircleGPerSqm: 180,
  fertilizerLawnReseedGPerSqm: 30,
};
