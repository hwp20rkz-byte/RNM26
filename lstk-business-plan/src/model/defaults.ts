import type { PlanInputs } from "./types";

/**
 * Стартовые значения — ориентиры для Казахстана, а не рыночные данные.
 * Их задача — дать работающую модель, которую пользователь заменит своими цифрами
 * (сметы, коммерческие предложения поставщиков, фактические цены продаж).
 */

const ALL = ["warm", "turnkey", "small"];
const TURNKEY = ["turnkey"];

export const DEFAULT_INPUTS: PlanInputs = {
  houses: [
    { id: "warm", name: "Тёплый контур, 120 м²", area: 120, pricePerM2: 190_000, durationMonths: 3, sharePct: 50 },
    { id: "turnkey", name: "Под ключ, 150 м²", area: 150, pricePerM2: 320_000, durationMonths: 5, sharePct: 35 },
    { id: "small", name: "Баня / гостевой дом, 40 м²", area: 40, pricePerM2: 220_000, durationMonths: 2, sharePct: 15 }
  ],
  costItems: [
    { id: "found", name: "Фундамент (сваи / УШП)", kind: "material", basis: "perM2", amount: 18_000, appliesTo: ALL },
    { id: "osb", name: "Обшивка ОСП, мембраны", kind: "material", basis: "perM2", amount: 12_000, appliesTo: ALL },
    { id: "insul", name: "Утеплитель", kind: "material", basis: "perM2", amount: 14_000, appliesTo: ALL },
    { id: "roof", name: "Кровля", kind: "material", basis: "perM2", amount: 15_000, appliesTo: ALL },
    { id: "facade", name: "Фасад", kind: "material", basis: "perM2", amount: 16_000, appliesTo: ALL },
    { id: "windows", name: "Окна и двери", kind: "material", basis: "perM2", amount: 20_000, appliesTo: ALL },
    { id: "mount", name: "Монтаж каркаса и контура", kind: "labor", basis: "perM2", amount: 25_000, appliesTo: ALL },
    { id: "mep", name: "Инженерные сети", kind: "material", basis: "perM2", amount: 35_000, appliesTo: TURNKEY },
    { id: "finmat", name: "Отделка — материалы", kind: "material", basis: "perM2", amount: 30_000, appliesTo: TURNKEY },
    { id: "finlab", name: "Отделка — работы", kind: "labor", basis: "perM2", amount: 25_000, appliesTo: TURNKEY },
    { id: "design", name: "Проект, доставка, техника", kind: "material", basis: "perHouse", amount: 400_000, appliesTo: ALL }
  ],
  frame: {
    source: "own",
    kgPerM2: 30,
    wastePct: 4,
    coilPricePerKg: 850,
    boughtPricePerKg: 1_400,
    lineCapacityKgPerMonth: 15_000
  },
  capex: [
    { id: "line", name: "Линия профилирования ЛСТК", amount: 45_000_000, month: 0, lifeMonths: 84, ownLineOnly: true },
    { id: "software", name: "ПО проектирования каркаса", amount: 3_000_000, month: 0, lifeMonths: 36, ownLineOnly: true },
    { id: "shop", name: "Подготовка цеха", amount: 5_000_000, month: 0, lifeMonths: 60, ownLineOnly: true },
    { id: "tools", name: "Инструмент бригад", amount: 4_000_000, month: 1, lifeMonths: 36, ownLineOnly: false },
    { id: "truck", name: "Грузовой автомобиль", amount: 12_000_000, month: 1, lifeMonths: 60, ownLineOnly: false }
  ],
  opex: [
    { id: "rent", name: "Аренда цеха и офиса", amount: 600_000 },
    { id: "staff", name: "ФОТ АУП с налогами (директор, прораб, сметчик, продажи)", amount: 2_400_000 },
    { id: "marketing", name: "Маркетинг", amount: 800_000 },
    { id: "transport", name: "Транспорт, ГСМ", amount: 300_000 },
    { id: "other", name: "Прочее (связь, бухгалтерия, банк)", amount: 200_000 }
  ],
  sales: {
    startCalendarMonth: 1,
    startYear: 2027,
    firstSaleMonth: 2,
    startPerMonth: 1,
    targetPerMonth: 3,
    rampMonths: 12,
    seasonality: [0.5, 0.6, 1, 1.2, 1.3, 1.2, 1.1, 1.1, 1, 0.9, 0.7, 0.5]
  },
  payments: {
    advancePct: 40,
    midPct: 40,
    materialsUpfrontPct: 40
  },
  finance: {
    horizonMonths: 60,
    discountRatePct: 20,
    equity: 50_000_000,
    loanAmount: 60_000_000,
    loanRatePct: 22,
    loanTermMonths: 36,
    loanGraceMonths: 6,
    taxRegime: "simplified",
    simplifiedRatePct: 4,
    citRatePct: 20,
    salesCommissionPct: 3,
    contingencyPct: 5
  }
};
