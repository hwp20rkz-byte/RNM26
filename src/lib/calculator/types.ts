// Доменная модель калькулятора тарифа ОСИ/ПТ.
// Структура категорий расходов (1.x — управление, 2.x — содержание) следует
// нумерации Приказа МИИР РК от 30.03.2020 №166 «Методика расчета сметы
// расходов на управление объектом кондоминиума и содержание общего имущества».

export type ServiceClass = "economy" | "comfort" | "business" | "premium";

export type ScenarioId = "economy" | "standard" | "business";

export type StaffMode = "staff" | "outsource";

export type CostGroup = "management" | "maintenance";

/** Параметры дома — Шаг 1 конфигуратора. */
export interface BuildingProfile {
  name: string;
  address: string;
  region: string;
  serviceClass: ServiceClass;
  /** Полезная площадь жилых помещений, м² */
  livingArea: number;
  /** Площадь коммерческих (нежилых) помещений, м² */
  commercialArea: number;
  /** Площадь кладовых, м² */
  storageArea: number;
  apartments: number;
  entrances: number;
  /** Список этажности по подъездам (для равномерного распределения затрат) */
  floorsPerEntrance: number[];
  elevators: number;
  parkingSpots: number;
  parkingArea: number;
  yardPavedArea: number;
  yardGreenArea: number;
  /** Годовой доход от аренды/рекламы и т.д. (Д год в формуле Методики) */
  annualCommercialIncome: number;
  /**
   * Множитель для накопительного взноса на капремонт, в кратности МРП/м²/мес.
   * По Закону РК «О жилищных отношениях» — не менее 0,005 МРП. Собрание вправе
   * утвердить более высокий взнос.
   */
  capitalRepairMrpMultiplier: number;
  /** Коэффициент тарифа для нежилых (коммерческих) помещений относительно базового В (решение собрания) */
  commercialRateCoefficient: number;
}

/** Ставки налогов и отчислений с ФОТ (РК), настраиваемые пользователем. */
export interface PayrollTaxRates {
  /** Обязательные пенсионные взносы (работник), % от оклада */
  opvRate: number;
  /** Взносы на ОСМС (работник), % */
  vosmsRate: number;
  /** Взносы на ОСМС (работодатель), % */
  osmsEmployerRate: number;
  /** Социальные отчисления, % от (оклад - ОПВ) */
  soRate: number;
  /** Социальный налог, % от (оклад - ОПВ), за вычетом СО */
  snRate: number;
  /** Обязательные проф. пенсионные взносы работодателя, % от оклада */
  opvrRate: number;
  /** Ставка ИПН, % */
  ipnRate: number;
  /** Значение 1 МРП, тенге (уточняется ежегодно Законом о республиканском бюджете) */
  mrpValue: number;
  /** Стандартный налоговый вычет по ИПН, в кратности МРП */
  standardDeductionMrpMultiplier: number;
}

export interface PayrollComputed {
  gross: number;
  opv: number;
  vosms: number;
  ipn: number;
  so: number;
  sn: number;
  osmsEmployer: number;
  opvr: number;
  netPay: number;
  /** Полная стоимость для ОСИ: оклад + отчисления работодателя */
  totalCostToOsi: number;
}

/** Штатная/аутсорс позиция персонала. */
export interface PayrollPosition {
  id: string;
  categoryId: string;
  role: string;
  mode: StaffMode;
  headcount: number;
  /** Оклад на 1 сотрудника (для штата) либо стоимость договора в месяц (для аутсорса) */
  monthlySalaryOrContract: number;
  enabled: boolean;
  minServiceClass?: ServiceClass;
  tooltip?: string;
  source?: string;
  /** Ключ группы «штат vs аутсорс» — переключатель в UI включает ровно один вариант из группы */
  staffOutsourceGroup?: string;
}

export type ItemFrequency =
  | "monthly"
  | "quarterly"
  | "seasonal"
  | "annual"
  | "once";

/** Атомарная статья расхода (материалы, инвентарь, услуги, ТО). */
export interface CostItem {
  id: string;
  categoryId: string;
  name: string;
  unit: string;
  /** Количество в год (уже приведено к годовому объёму) */
  annualQty: number;
  unitPrice: number;
  frequency: ItemFrequency;
  mode?: StaffMode;
  enabled: boolean;
  minServiceClass?: ServiceClass;
  tooltip?: string;
  source?: string;
  staffOutsourceGroup?: string;
}

export interface CostCategory {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  group: CostGroup;
  order166Ref?: string;
}

export interface CalculatorDatabase {
  categories: CostCategory[];
  items: CostItem[];
  payroll: PayrollPosition[];
  taxRates: PayrollTaxRates;
}

export interface CategoryTotal {
  categoryId: string;
  annualTotal: number;
  monthlyTotal: number;
}

export interface TariffResult {
  /** Р упр. — годовые расходы на управление */
  annualManagementCost: number;
  /** Р сод. — годовые расходы на содержание */
  annualMaintenanceCost: number;
  /** Р год = Р упр. + Р сод. */
  annualTotalCost: number;
  /** Д год */
  annualCommercialIncome: number;
  /** В = (Р год − Д год) / (S полез. × 12), тенге/м² в месяц */
  tariffPerSqm: number;
  /** Полезная площадь, использованная в расчёте (жилая + коммерческая) */
  usefulArea: number;
  monthlyBudget: number;
  quarterlyBudget: number;
  annualBudget: number;
  categoryTotals: CategoryTotal[];
  capitalRepairMinTariffPerSqm: number;
}

export interface RegionalMinTariff {
  region: string;
  minTariffPerSqm: number;
  /** Источник данных — минимальный тариф утверждён решением маслихата */
  source: string;
  /** Данные требуют проверки перед использованием в реальных расчётах */
  verified: boolean;
}

export interface ScenarioDefinition {
  id: ScenarioId;
  label: string;
  description: string;
  /** Множитель к базовым ценам (качество/периодичность) */
  priceMultiplier: number;
  /** Категории/классы обслуживания, доступные в сценарии */
  maxServiceClass: ServiceClass;
  /** Принудительно включённые/отключённые доп. статьи (id статей) */
  forceEnabledItemIds: string[];
  forceDisabledItemIds: string[];
}
