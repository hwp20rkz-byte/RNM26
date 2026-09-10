import type { EquipmentCategory } from "../types";

export interface MaintenanceTaskTemplate {
  id: string;
  name: string;
  equipmentCategory?: EquipmentCategory;
  periodicityMonths: number;
  regulationRef: string;
}

/**
 * Типовые регламентные работы (ТОиР/ППР) с периодичностью — заготовки для
 * добавления в календарь конкретного объекта. Периодичность там, где нет
 * прямой нормы РК, помечена как распространённая практика — сверяйте с
 * паспортом оборудования и актами последнего обслуживания.
 */
export const MAINTENANCE_TASK_TEMPLATES: MaintenanceTaskTemplate[] = [
  {
    id: "mt-heat-meter",
    name: "Поверка общедомовых приборов учёта тепловой энергии",
    equipmentCategory: "heating",
    periodicityMonths: 48,
    regulationRef:
      "Закон РК «Об обеспечении единства измерений» — обязательная периодическая поверка; межповерочный интервал уточняется в паспорте конкретного прибора",
  },
  {
    id: "mt-electro-lab",
    name: "Электролаборатория: замер сопротивления изоляции и заземления",
    equipmentCategory: "electrical",
    periodicityMonths: 36,
    regulationRef:
      "Периодичность электроизмерений — распространённая практика энергонадзора; сверьте с актом последних измерений и внутренним регламентом",
  },
  {
    id: "mt-fire-alarm-check",
    name: "Проверка работоспособности АПС и системы оповещения",
    equipmentCategory: "fire",
    periodicityMonths: 12,
    regulationRef: "Требования пожарной безопасности РК — периодическая проверка исправности систем противопожарной защиты",
  },
  {
    id: "mt-fire-extinguisher-visual",
    name: "Визуальный осмотр огнетушителей",
    equipmentCategory: "fire",
    periodicityMonths: 12,
    regulationRef: "Общепринятая практика обслуживания первичных средств пожаротушения",
  },
  {
    id: "mt-fire-extinguisher-retest",
    name: "Переосвидетельствование (гидроиспытания) огнетушителей",
    equipmentCategory: "fire",
    periodicityMonths: 60,
    regulationRef: "Периодичность переосвидетельствования по паспорту огнетушителя — типовое значение, сверьте с маркировкой",
  },
  {
    id: "mt-elevator-service",
    name: "Плановое техническое обслуживание лифта",
    equipmentCategory: "elevators",
    periodicityMonths: 1,
    regulationRef: "ТР ТС 011/2011 — регламентное ТО по графику обслуживающей организации",
  },
  {
    id: "mt-elevator-inspection",
    name: "Техническое освидетельствование лифта",
    equipmentCategory: "elevators",
    periodicityMonths: 12,
    regulationRef:
      "ТР ТС 011/2011 — периодичность устанавливает эксплуатирующая организация по паспорту; ежегодное частичное освидетельствование — распространённая практика, сверьте с актом последнего освидетельствования",
  },
  {
    id: "mt-heating-flush",
    name: "Гидропневматическая промывка системы отопления",
    equipmentCategory: "heating",
    periodicityMonths: 6,
    regulationRef: "Сезонная подготовка к отопительному периоду — распространённая эксплуатационная практика",
  },
  {
    id: "mt-roof-inspection",
    name: "Осмотр кровли (весенний/осенний)",
    equipmentCategory: "roof_facade",
    periodicityMonths: 6,
    regulationRef: "СН РК 1.04-26-2022 — плановые осмотры общего имущества",
  },
];
