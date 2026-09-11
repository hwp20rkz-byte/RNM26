import type { BuildingProfile, ObjectType, ServiceClass, ServicePreset } from "./types";

/** Дефолтный профиль дома — калиброван на реальную смету ЖК «Коркем-1», Алматы. */
export const DEFAULT_BUILDING: BuildingProfile = {
  name: 'ЖК «Коркем-1»',
  address: "г. Алматы",
  region: "Алматы",
  serviceClass: "comfort",
  objectType: "residential",
  livingArea: 57644.82,
  commercialArea: 16370.5,
  storageArea: 0,
  apartments: 604,
  entrances: 16,
  floorsPerEntrance: [16, 14, 14, 16, 14, 14, 16, 16, 14, 15, 16, 14, 15, 14, 16, 16],
  elevators: 32,
  parkingSpots: 472,
  parkingArea: 472 * 13.5,
  yardPavedArea: 4200,
  yardGreenArea: 2600,
  annualCommercialIncome: 2544000,
  capitalRepairMrpMultiplier: 0.005,
  commercialRateCoefficient: 1.0,
  storageRateCoefficient: 1.0,
  parkingRateCoefficient: 1.0,
  // Демонстрация запроса собственника: минимум 7500 ₸/место при 35%
  // неплательщиков среди владельцев машиномест — реальные цифры утверждает
  // собрание, здесь только пример работы пола/резерва на эталонном объекте.
  parkingFlatFeePerSpot: 7500,
  parkingNonPaymentRatePercent: 35,
};

export const SERVICE_CLASS_LABELS: Record<ServiceClass, string> = {
  economy: "Эконом",
  comfort: "Комфорт",
  business: "Бизнес",
  premium: "Премиум",
};

export const OBJECT_TYPE_LABELS: Record<ObjectType, string> = {
  residential: "Жилой (МЖД / кондоминиум)",
  mixed: "Смешанный (жильё + коммерция)",
  commercial: "Нежилой (офис, ТЦ, паркинг и т.п.)",
};

/** Чистый профиль для нового объекта — без калибровки под конкретный дом. */
export function buildBlankBuilding(name: string, objectType: ObjectType = "residential"): BuildingProfile {
  return {
    name,
    address: "",
    region: "Алматы",
    serviceClass: "comfort",
    objectType,
    livingArea: objectType === "commercial" ? 0 : 5000,
    commercialArea: objectType === "residential" ? 0 : 1000,
    storageArea: 0,
    apartments: objectType === "commercial" ? 0 : 100,
    entrances: 1,
    floorsPerEntrance: [10],
    elevators: 2,
    parkingSpots: 0,
    parkingArea: 0,
    yardPavedArea: 0,
    yardGreenArea: 0,
    annualCommercialIncome: 0,
    capitalRepairMrpMultiplier: 0.005,
    commercialRateCoefficient: 1.0,
    storageRateCoefficient: 1.0,
    parkingRateCoefficient: 1.0,
    parkingFlatFeePerSpot: 0,
    parkingNonPaymentRatePercent: 0,
  };
}

/**
 * Расшифровка полей пресета — используется и в редакторе, и как подсказки
 * рядом с выбором класса обслуживания в Шаге 1.
 */
export const PRESET_FIELD_HELP: Record<
  | "priceMultiplier"
  | "maxServiceClass"
  | "capitalRepairMrpMultiplier"
  | "commercialRateCoefficient"
  | "storageRateCoefficient"
  | "parkingRateCoefficient",
  { label: string; help: string }
> = {
  priceMultiplier: {
    label: "Множитель цен",
    help: "Масштабирует цену КАЖДОЙ статьи расходов и оклада в базе (×0.85 = на 15% дешевле рынка/реже периодичность, ×1.25 = премиальные расценки/чаще обслуживание).",
  },
  maxServiceClass: {
    label: "Потолок класса статей",
    help: "Статьи, помеченные более высоким классом (напр. «Бизнес+»: консьерж, альпинисты, видеонаблюдение), автоматически отключаются, если класс объекта выше потолка пресета.",
  },
  capitalRepairMrpMultiplier: {
    label: "Взнос на капремонт",
    help: "Проставляется в профиль объекта (Шаг 1) при выборе пресета — доля МРП с 1 м² в месяц. Минимум по закону — 0,005 МРП.",
  },
  commercialRateCoefficient: {
    label: "Коэффициент для нежилых",
    help: "Проставляется в профиль объекта — во сколько раз тариф для коммерческих/нежилых помещений выше базового тарифа В.",
  },
  storageRateCoefficient: {
    label: "Коэффициент для кладовых",
    help: "Проставляется в профиль объекта — доля базового тарифа В, которую платит кладовая (обычно ниже 1 — меньше нагрузка на общие услуги). Рыночная оценка, требует утверждения собранием.",
  },
  parkingRateCoefficient: {
    label: "Коэффициент для машиномест",
    help: "Проставляется в профиль объекта — доля базового тарифа В, которую платит машиноместо (обычно ниже 1). Рыночная оценка, требует утверждения собранием.",
  },
};

/**
 * Встроенные пресеты обслуживания. Раньше «класс жилья» (Шаг 1) и «сценарий»
 * (Шаг 3) были двумя независимыми списками с разными id и разным эффектом —
 * теперь это одна и та же сущность: выбор в любом из двух мест одинаково
 * меняет набор доступных статей, цены и профиль объекта. Поля можно
 * редактировать (кроме удаления) через конструктор пресетов.
 */
export const BUILTIN_PRESETS: ServicePreset[] = [
  {
    id: "economy",
    label: "Эконом",
    description:
      "Только критические, предписанные законом работы: аварийная служба, противопожарные системы, обязательный минимум капремонта. Реже уборка, дешевле расходники, без косметики и допуслуг.",
    priceMultiplier: 0.85,
    maxServiceClass: "economy",
    capitalRepairMrpMultiplier: 0.005,
    commercialRateCoefficient: 1.0,
    storageRateCoefficient: 0.5,
    parkingRateCoefficient: 0.5,
    forceEnabledItemIds: [],
    forceDisabledItemIds: [],
    builtIn: true,
  },
  {
    id: "standard",
    label: "Комфорт (Стандарт)",
    description:
      "Сбалансированное обслуживание для сохранения ресурса дома: полное ТО инженерии, регулярная уборка, плановый текущий ремонт по рыночным ценам без наценки и без урезания.",
    priceMultiplier: 1.0,
    maxServiceClass: "comfort",
    capitalRepairMrpMultiplier: 0.007,
    commercialRateCoefficient: 1.3,
    storageRateCoefficient: 0.6,
    parkingRateCoefficient: 0.6,
    forceEnabledItemIds: [],
    forceDisabledItemIds: [],
    builtIn: true,
  },
  {
    id: "business",
    label: "Бизнес",
    description:
      "Расширенный сервис: охрана, клининг паркинга, IP-видеонаблюдение, более частая мойка фасадов. Дороже за счёт качества расходников и периодичности, но без консьержа и ландшафтного дизайна.",
    priceMultiplier: 1.15,
    maxServiceClass: "business",
    capitalRepairMrpMultiplier: 0.01,
    commercialRateCoefficient: 1.6,
    storageRateCoefficient: 0.7,
    parkingRateCoefficient: 0.7,
    forceEnabledItemIds: [],
    forceDisabledItemIds: [],
    builtIn: true,
  },
  {
    id: "premium",
    label: "Премиум",
    description:
      "Максимум: консьерж-сервис, премиальная химия, альпинисты по расширенному графику, ландшафтный дизайн. Все статьи каталога доступны, цены — по верхней рыночной планке.",
    priceMultiplier: 1.35,
    maxServiceClass: "premium",
    capitalRepairMrpMultiplier: 0.015,
    commercialRateCoefficient: 2.0,
    storageRateCoefficient: 0.8,
    parkingRateCoefficient: 0.8,
    forceEnabledItemIds: [],
    forceDisabledItemIds: [],
    builtIn: true,
  },
];

export const APARTMENT_SAMPLE_SIZES: { label: string; area: number }[] = [
  { label: "1-комн.", area: 40 },
  { label: "2-комн.", area: 65 },
  { label: "3-комн.", area: 95 },
];
