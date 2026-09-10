import type { BuildingProfile, ObjectType, ScenarioDefinition, ServiceClass } from "./types";

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
  };
}

export const SCENARIOS: ScenarioDefinition[] = [
  {
    id: "economy",
    label: "Эконом / Выживание",
    description:
      "Только критические, предписанные законом работы: аварийная служба, противопожарные системы, обязательный минимум капремонта. Экономия на периодичности уборки и косметике.",
    priceMultiplier: 0.85,
    maxServiceClass: "economy",
    forceEnabledItemIds: [],
    forceDisabledItemIds: [],
  },
  {
    id: "standard",
    label: "Базовый / Стандарт",
    description:
      "Сбалансированное обслуживание для сохранения ресурса дома: полное ТО инженерии, регулярная уборка, плановый текущий ремонт.",
    priceMultiplier: 1.0,
    maxServiceClass: "comfort",
    forceEnabledItemIds: [],
    forceDisabledItemIds: [],
  },
  {
    id: "business",
    label: "Бизнес / Максимум",
    description:
      "Консьерж-сервис, охрана, премиальная химия, частая мойка фасадов альпинистами, ландшафтный дизайн, видеонаблюдение.",
    priceMultiplier: 1.25,
    maxServiceClass: "premium",
    forceEnabledItemIds: [],
    forceDisabledItemIds: [],
  },
];

export function getScenario(id: string): ScenarioDefinition {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[1];
}

export const APARTMENT_SAMPLE_SIZES: { label: string; area: number }[] = [
  { label: "1-комн.", area: 40 },
  { label: "2-комн.", area: 65 },
  { label: "3-комн.", area: 95 },
];
