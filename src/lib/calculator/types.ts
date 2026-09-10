// Доменная модель калькулятора тарифа ОСИ/ПТ.
// Структура категорий расходов (1.x — управление, 2.x — содержание) следует
// нумерации Приказа МИИР РК от 30.03.2020 №166 «Методика расчета сметы
// расходов на управление объектом кондоминиума и содержание общего имущества».

export type ServiceClass = "economy" | "comfort" | "business" | "premium";

export type StaffMode = "staff" | "outsource";

export type CostGroup = "management" | "maintenance";

/**
 * Тип объекта расчёта. Формула и структура статей Методики №166 писаны для
 * жилых МЖД/кондоминиумов; для чисто нежилых объектов она применяется по
 * аналогии (это не жилищные отношения в смысле Закона РК) — интерфейс
 * показывает предупреждение, но арифметика (площадь → тариф) работает
 * одинаково для любого типа объекта.
 */
export type ObjectType = "residential" | "mixed" | "commercial";

/** Параметры дома/объекта — Шаг 1 конфигуратора. */
export interface BuildingProfile {
  name: string;
  address: string;
  region: string;
  serviceClass: ServiceClass;
  objectType: ObjectType;
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

/**
 * Пресет обслуживания — единая настройка, которая раньше была разбита на два
 * несвязанных места (класс жилья в Шаге 1 и сценарий в Шаге 3). Выбор
 * пресета одновременно: (1) ограничивает набор доступных статей потолком
 * `maxServiceClass` — статьи с более высоким `minServiceClass` отключаются,
 * (2) масштабирует цены всех статей множителем `priceMultiplier`,
 * (3) проставляет взнос на капремонт и коэффициент для нежилых в профиль
 * объекта. Встроенные пресеты (`builtIn: true`) нельзя удалить, но можно
 * скопировать как основу для своего через «Дублировать».
 */
export interface ServicePreset {
  id: string;
  label: string;
  description: string;
  /** Множитель к базовым ценам всех статей (качество/периодичность обслуживания) */
  priceMultiplier: number;
  /** Потолок класса: статьи с более высоким minServiceClass автоматически отключаются */
  maxServiceClass: ServiceClass;
  /** Взнос на капремонт, применяется к профилю объекта при выборе пресета, в кратности МРП/м²/мес. */
  capitalRepairMrpMultiplier: number;
  /** Коэффициент тарифа для нежилых помещений, применяется к профилю объекта */
  commercialRateCoefficient: number;
  /** Статьи, принудительно включаемые вне зависимости от maxServiceClass (по id) */
  forceEnabledItemIds: string[];
  /** Статьи, принудительно отключаемые вне зависимости от maxServiceClass (по id) */
  forceDisabledItemIds: string[];
  /** Встроенный (нередактируемый состав, но поля можно смотреть) пресет — нельзя удалить */
  builtIn?: boolean;
}

// ---------------------------------------------------------------------------
// Мультипроектность, справочник статей и сохранённые сметы.
// Данные живут в localStorage браузера (клиентское приложение без бэкенда) —
// не синхронизируются между устройствами и очищаются при очистке данных сайта.
// ---------------------------------------------------------------------------

/** Один расчётный объект (дом/комплекс) со своей базой статей и профилем. */
export interface Project {
  id: string;
  name: string;
  building: BuildingProfile;
  /** Пристинная база на момент создания/последнего применения сценария */
  baseDb: CalculatorDatabase;
  /** Живая (редактируемая) база текущего проекта */
  db: CalculatorDatabase;
  /** id применённого пресета (см. ServicePreset) */
  presetId: string;
  priceMultiplier: number;
  /** Реестр оборудования/инженерных систем этого объекта */
  assets: Asset[];
  /** Известный текущий остаток фонда капремонта (для проекции плана), ₸ */
  capitalFundBalance: number;
  createdAt: string;
  updatedAt: string;
}

/** Замороженный снимок расчёта — версия сметы, сохранённая пользователем. */
export interface SavedSmeta {
  id: string;
  projectId: string;
  name: string;
  savedAt: string;
  building: BuildingProfile;
  db: CalculatorDatabase;
  presetId: string;
  priceMultiplier: number;
  tariff: TariffResult;
}

/**
 * Запись справочника расходных материалов/услуг — не привязана к проекту,
 * переиспользуется между объектами. Может быть добавлена в любой проект как
 * новая статья (CostItem) в выбранную категорию.
 */
export interface CatalogEntry {
  id: string;
  name: string;
  unit: string;
  unitPrice: number;
  defaultQty: number;
  /** Категория Методики №166, предлагаемая по умолчанию при добавлении в проект */
  suggestedCategoryId?: string;
  /** Произвольный тег для поиска/группировки (напр. «Инженерка», «Клининг», «СИЗ») */
  tag?: string;
  tooltip?: string;
  source?: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Износ оборудования и план капитального ремонта/модернизации.
//
// Методология и оговорки (важно — не замалчивать):
// - Формула износа линейная по возрасту (Износ% = Возраст / НормСрок × 100) —
//   практичная оценка «по паспорту», НЕ замена полноценной экспертной методики
//   ВСН 53-86(р) (осмотр технического состояния по таблицам признаков износа).
//   Даёт приоритет для планирования, не заключение о техническом состоянии.
// - Нормативные сроки по умолчанию — ориентир по ВСН 58-88(р) Госстроя СССР
//   (де-факто отраслевой эталон в РК за неимением полной казахстанской
//   замены), кроме лифтов — там срок 25 лет закреплён юридически обязательным
//   ТР ТС 011/2011 «Безопасность лифтов» (см. equipmentTypeId="elevator").
//   Все сроки редактируются пользователем под паспортные данные оборудования.
// - Для лифтов истечение срока — не рекомендация, а требование техрегламента:
//   эксплуатация после назначенного срока без экспертизы промышленной
//   безопасности не допускается.
// ---------------------------------------------------------------------------

/** Категория группы оборудования — для группировки в реестре и плане. */
export type EquipmentCategory =
  | "elevators"
  | "heating"
  | "water"
  | "electrical"
  | "fire"
  | "roof_facade"
  | "other";

/**
 * Справочник типов оборудования с нормативным сроком службы по умолчанию —
 * не привязан к проекту, переиспользуется между объектами (как CatalogEntry).
 */
export interface EquipmentType {
  id: string;
  name: string;
  category: EquipmentCategory;
  /** Нормативный срок службы, лет — редактируемый ориентир */
  normativeLifeYears: number;
  /** Источник цифры (НПА или «отраслевой ориентир, сверьте с паспортом») */
  source: string;
  /** true — как для лифтов: истечение срока юридически ограничивает эксплуатацию */
  criticalSafety?: boolean;
}

/** Единица оборудования/инженерной системы в реестре конкретного объекта. */
export interface Asset {
  id: string;
  /** Ссылка на запись справочника EquipmentType — необязательна для произвольно добавленного актива */
  equipmentTypeId?: string;
  name: string;
  category: EquipmentCategory;
  quantity: number;
  /** Год ввода в эксплуатацию */
  installedYear: number;
  /** Нормативный срок службы для этой единицы (по умолчанию — из EquipmentType, редактируемо) */
  normativeLifeYears: number;
  /** Стоимость замены за единицу, ₸ */
  replacementUnitCost: number;
  criticalSafety?: boolean;
  /** Ручная корректировка расчётного износа (если фактическое состояние отличается от паспортного) */
  manualWearOverridePercent?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type AssetCondition = "good" | "satisfactory" | "attention" | "critical" | "expired";

export interface AssetWear {
  assetId: string;
  ageYears: number;
  wearPercent: number;
  condition: AssetCondition;
  remainingYears: number;
  /** Год, на который расчётно приходится плановая замена (installedYear + normativeLifeYears) */
  targetReplacementYear: number;
  replacementCost: number;
}

/** Агрегированный план замены на один год горизонта планирования. */
export interface ReplacementPlanYear {
  year: number;
  assetIds: string[];
  totalCost: number;
}

/** Проекция фонда капремонта на один год: доходы, план трат, остаток. */
export interface CapitalFundYearProjection {
  year: number;
  income: number;
  plannedSpend: number;
  balance: number;
}

