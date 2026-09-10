import type { EquipmentType } from "../types";

const INDUSTRY_REFERENCE =
  "Отраслевой ориентир (ВСН 58-88(р) Госстроя СССР) — в РК отдельного детального норматива сроков службы инженерного оборудования не найдено; сверьте с паспортом производителя перед принятием решения";

const LIFT_SOURCE =
  "ТР ТС 011/2011 «Безопасность лифтов» — назначенный срок службы, юридически обязателен на территории РК. По истечении — эксплуатация без экспертизы промышленной безопасности не допускается";

/**
 * Справочник типов оборудования с нормативными сроками службы по умолчанию.
 * Все значения — редактируемые ориентиры (см. пометки source), не заменяют
 * паспортные данные конкретного оборудования и обязательную экспертизу для
 * лифтового хозяйства.
 */
export const EQUIPMENT_TYPES: EquipmentType[] = [
  { id: "eq-elevator-passenger", name: "Лифт пассажирский", category: "elevators", normativeLifeYears: 25, source: LIFT_SOURCE, criticalSafety: true },
  { id: "eq-elevator-cargo", name: "Лифт грузовой/грузопассажирский", category: "elevators", normativeLifeYears: 25, source: LIFT_SOURCE, criticalSafety: true },

  { id: "eq-heat-pump", name: "Насос циркуляционный/повысительный (отопление)", category: "heating", normativeLifeYears: 10, source: INDUSTRY_REFERENCE },
  { id: "eq-heat-exchanger", name: "Теплообменник пластинчатый ИТП", category: "heating", normativeLifeYears: 20, source: INDUSTRY_REFERENCE },
  { id: "eq-heat-automation", name: "Автоматика и контроллеры ИТП", category: "heating", normativeLifeYears: 12, source: INDUSTRY_REFERENCE },
  { id: "eq-heat-pipes-steel", name: "Трубопроводы стальные (отопление/ГВС)", category: "heating", normativeLifeYears: 30, source: INDUSTRY_REFERENCE },
  { id: "eq-heat-meter", name: "Узел учёта тепловой энергии", category: "heating", normativeLifeYears: 12, source: INDUSTRY_REFERENCE },

  { id: "eq-water-pump", name: "Насос повышения давления (ХВС)", category: "water", normativeLifeYears: 10, source: INDUSTRY_REFERENCE },
  { id: "eq-water-pipes-galv", name: "Трубопроводы ХВС (оцинкованные)", category: "water", normativeLifeYears: 30, source: INDUSTRY_REFERENCE },
  { id: "eq-water-pipes-sewer", name: "Трубопроводы канализации (чугун/пластик)", category: "water", normativeLifeYears: 40, source: INDUSTRY_REFERENCE },
  { id: "eq-water-valves", name: "Запорная арматура (задвижки, вентили)", category: "water", normativeLifeYears: 10, source: INDUSTRY_REFERENCE },

  { id: "eq-elec-vru", name: "ВРУ и электрощитовое оборудование", category: "electrical", normativeLifeYears: 25, source: INDUSTRY_REFERENCE },
  { id: "eq-elec-cable", name: "Кабельные линии", category: "electrical", normativeLifeYears: 25, source: INDUSTRY_REFERENCE },
  { id: "eq-elec-lighting", name: "Освещение МОП (светильники)", category: "electrical", normativeLifeYears: 8, source: INDUSTRY_REFERENCE },

  { id: "eq-fire-alarm", name: "Система АПС (пожарная сигнализация)", category: "fire", normativeLifeYears: 10, source: INDUSTRY_REFERENCE },
  { id: "eq-fire-extinguisher", name: "Огнетушители (переосвидетельствование/замена)", category: "fire", normativeLifeYears: 5, source: INDUSTRY_REFERENCE },

  { id: "eq-roof-soft", name: "Кровля мягкая (рулонная)", category: "roof_facade", normativeLifeYears: 10, source: INDUSTRY_REFERENCE },
  { id: "eq-roof-metal", name: "Кровля из металла (фальц/профлист)", category: "roof_facade", normativeLifeYears: 20, source: INDUSTRY_REFERENCE },
  { id: "eq-facade-paint", name: "Фасад (окраска/штукатурка)", category: "roof_facade", normativeLifeYears: 8, source: INDUSTRY_REFERENCE },
  { id: "eq-facade-glazing", name: "Остекление МОП, входных групп", category: "roof_facade", normativeLifeYears: 20, source: INDUSTRY_REFERENCE },

  { id: "eq-other-intercom", name: "Домофонное оборудование, СКУД", category: "other", normativeLifeYears: 10, source: INDUSTRY_REFERENCE },
  { id: "eq-other-cctv", name: "Видеонаблюдение (камеры, регистраторы)", category: "other", normativeLifeYears: 7, source: INDUSTRY_REFERENCE },
  { id: "eq-other-barrier", name: "Шлагбаумы/ворота паркинга", category: "other", normativeLifeYears: 10, source: INDUSTRY_REFERENCE },
];

export const EQUIPMENT_CATEGORY_LABELS: Record<string, string> = {
  elevators: "Лифтовое хозяйство",
  heating: "ИТП и отопление",
  water: "ХВС / канализация",
  electrical: "Электрика",
  fire: "Противопожарные системы",
  roof_facade: "Кровля и фасад",
  other: "Слаботочные системы и прочее",
};
