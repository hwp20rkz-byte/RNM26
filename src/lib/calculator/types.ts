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
  /** Коэффициент тарифа для кладовых относительно базового В (решение собрания) */
  storageRateCoefficient: number;
  /** Коэффициент тарифа для машиномест относительно базового В (решение собрания) */
  parkingRateCoefficient: number;
  /**
   * Фиксированный минимум платы за одно машиноместо, ₸/мес. — пол поверх
   * площадной ставки (parkingRateCoefficient × В). 0 = пол не действует.
   * Решение собрания, не привязано к классу обслуживания — поэтому не
   * входит в ServicePreset, в отличие от *RateCoefficient.
   */
  parkingFlatFeePerSpot: number;
  /**
   * Ожидаемый процент неплательщиков среди собственников машиномест, %
   * (0-95) — закладывается в начисление как резерв: начисляемая ставка =
   * пол / (1 - процент/100), чтобы фактически собранные деньги покрывали
   * полную потребность даже при частичной неуплате. Факт объекта (история
   * сборов), не уровень сервиса — поэтому тоже не в ServicePreset.
   */
  parkingNonPaymentRatePercent: number;
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
  /** Минимум по закону (0,005 МРП), для сверки — НЕ фактически начисляемая сумма */
  capitalRepairMinTariffPerSqm: number;
  /** Фактический годовой взнос на капремонт (статья 2.11) при текущих настройках — уже включён в annualMaintenanceCost/tariffPerSqm */
  capitalRepairAnnualActual: number;
  /** Доля тарифа В, приходящаяся на взнос на капремонт при текущих настройках, ₸/м²/мес. */
  capitalRepairPerSqmActual: number;
}

/** Тариф и площадь по одному типу помещений — для разбивки на дашборде и Шаге 1. */
export interface UnitTypeTariffLine {
  unitType: UnitType;
  areaSqm: number;
  /** Эффективная ставка = tariffPerSqm × коэффициент этого типа, ₸/м²/мес. */
  ratePerSqm: number;
  monthlyTotal: number;
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
  /** Коэффициент тарифа для кладовых, применяется к профилю объекта */
  storageRateCoefficient: number;
  /** Коэффициент тарифа для машиномест, применяется к профилю объекта */
  parkingRateCoefficient: number;
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
  /** Реестр собственников/помещений — доли площади для кворума и начислений */
  units: OwnershipUnit[];
  /** Протоколы общих собраний */
  meetings: GeneralMeeting[];
  /** Календарь регламентных работ (ТО/ППР) */
  maintenanceTasks: MaintenanceTask[];
  /** Фактические расходы по месяцам — для сверки план/факт */
  actuals: ActualExpenseEntry[];
  /** Склад ЗИП и расходных материалов объекта */
  spareParts: SparePartItem[];
  /** Журнал выполненных работ (нарядов) по инженерным системам */
  maintenanceLogs: MaintenanceLogEntry[];
  /** Наряды — слой планирования/согласования/SLA поверх журнала работ */
  workOrders: WorkOrder[];
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
  | "recreation"
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
  /** Точное расположение узла, напр. «ИТП №1, контур отопления», «Насосная, подвал п.2» */
  location?: string;
  /** Короткий код/хэш для QR-этикетки и сканирования на объекте */
  qrCodeId?: string;
  serialNumber?: string;
  /** Дата ввода в эксплуатацию, ISO — отдельно от installedYear (год) для точного учёта */
  commissioningDate?: string;
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

// ---------------------------------------------------------------------------
// Реестр собственников и общее собрание.
//
// Голос на общем собрании и доля начислений определяются площадью
// принадлежащего помещения/машиноместа (все типы объектов кондоминиума —
// не только квартиры), а не количеством помещений. Кворум по Закону РК
// «О жилищных отношениях» — более 50% голосов от общего числа голосов
// участников кондоминиума; конкретный порог для отдельного решения (простое
// большинство vs квалифицированное) зависит от категории вопроса — это
// решает председатель/собрание, инструмент считает оба знаменателя явно.
// ---------------------------------------------------------------------------

export type UnitType = "apartment" | "commercial" | "storage" | "parking";

/** Помещение/машиноместо в реестре собственников — единица голосования и начислений. */
export interface OwnershipUnit {
  id: string;
  unitType: UnitType;
  /** № квартиры/офиса/кладовой/машиноместа */
  number: string;
  entrance?: number;
  floor?: number;
  /** Площадь, м² — определяет долю голосов и долю начислений по тарифу */
  area: number;
  ownerName: string;
  ownerIin?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  /** № правоустанавливающего документа на право собственности */
  documentRef?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  apartment: "Квартира",
  commercial: "Нежилое помещение",
  storage: "Кладовая",
  parking: "Машиноместо",
};

export type VoteChoice = "for" | "against" | "abstain";

export type MeetingFormat = "in_person" | "absentee" | "mixed";

export const MEETING_FORMAT_LABELS: Record<MeetingFormat, string> = {
  in_person: "Очное",
  absentee: "Заочное",
  mixed: "Очно-заочное",
};

export interface MeetingParticipant {
  unitId: string;
  present: boolean;
  byProxy?: boolean;
  proxyHolder?: string;
}

/** Порог принятия решения по вопросу повестки — выбирается по категории вопроса. */
export type MajorityRule = "simple" | "qualified";

export interface AgendaItem {
  id: string;
  title: string;
  description?: string;
  /** simple — >50%, qualified — ≥2/3 (для вопросов, требующих квалифицированного большинства) */
  majorityRule: MajorityRule;
  /** Формулировка решения для текста протокола */
  resolutionText?: string;
}

export interface AgendaItemVote {
  agendaItemId: string;
  unitId: string;
  choice: VoteChoice;
}

/** Протокол общего собрания собственников — повестка, участники, голосование. */
export interface GeneralMeeting {
  id: string;
  title: string;
  /** Дата проведения (для заочного/очно-заочного — дата окончания приёма бюллетеней), ISO */
  meetingDate: string;
  format: MeetingFormat;
  location?: string;
  chair?: string;
  secretary?: string;
  countingCommission?: string;
  participants: MeetingParticipant[];
  agendaItems: AgendaItem[];
  votes: AgendaItemVote[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Календарь регламентных работ (ТО и ППР) — даты последнего/следующего
// обслуживания по периодичности, привязка к оборудованию и исполнителю.
// ---------------------------------------------------------------------------

export type MaintenanceStatus = "ok" | "upcoming" | "overdue" | "no_date";

export interface MaintenanceTask {
  id: string;
  name: string;
  equipmentCategory?: EquipmentCategory;
  /** Привязка к конкретной единице реестра оборудования (необязательно) */
  assetId?: string;
  /** Периодичность обслуживания, месяцев */
  periodicityMonths: number;
  /** Дата последнего выполнения работы, ISO — если пусто, задача считается непроставленной */
  lastServiceDate?: string;
  responsibleName?: string;
  responsibleOrg?: string;
  responsiblePhone?: string;
  responsibleEmail?: string;
  /** НПА/регламент, устанавливающий периодичность (если применимо) */
  regulationRef?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// План/факт — фактические расходы по месяцам для сверки со сметой.
// ---------------------------------------------------------------------------

export interface ActualExpenseEntry {
  id: string;
  /** Месяц в формате YYYY-MM */
  month: string;
  categoryId: string;
  amount: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Склад ЗИП и журнал выполненных работ (наряды) по инженерным системам.
//
// Дата поверки/межповерочный интервал сознательно НЕ хранится здесь как
// отдельное поле актива — это дублировало бы уже реализованный календарь
// регламентных работ. Для приборов, подлежащих поверке, заводится обычная
// MaintenanceTask с assetId, указывающим на актив, и periodicityMonths,
// равным межповерочному интервалу — тогда статус ok/скоро/просрочено и
// .ics-экспорт работают бесплатно, без риска рассинхронизации двух мест
// хранения одной даты.
// ---------------------------------------------------------------------------

export type SparePartCategory = "sanitary" | "electrical" | "consumable" | "tool";

export const SPARE_PART_CATEGORY_LABELS: Record<SparePartCategory, string> = {
  sanitary: "Сантехника",
  electrical: "Электрика",
  consumable: "Расходники",
  tool: "Инструмент",
};

/** Позиция склада ЗИП конкретного объекта — фактические остатки, не прайс-лист. */
export interface SparePartItem {
  id: string;
  name: string;
  unit: string;
  category: SparePartCategory;
  quantityOnHand: number;
  /** Неснижаемый аварийный запас — ниже него позиция считается дефицитной */
  minThreshold: number;
  /** Средняя учётная стоимость, ₸ — используется при списании, если явная цена не указана */
  avgUnitPrice: number;
  /** Ссылка на запись глобального справочника материалов (CatalogEntry), если позиция оттуда */
  catalogEntryId?: string;
  qrCodeId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type MaintenanceWorkType = "routine" | "repair" | "emergency" | "verification";

export const MAINTENANCE_WORK_TYPE_LABELS: Record<MaintenanceWorkType, string> = {
  routine: "Плановое ТО",
  repair: "Ремонт",
  emergency: "Аварийная работа",
  verification: "Поверка",
};

export interface MaterialUsage {
  sparePartId: string;
  quantity: number;
  /** Цена за единицу на момент списания (фиксируется, не пересчитывается задним числом) */
  unitPrice: number;
}

/** Запись журнала выполненных работ (наряд) по конкретному узлу инженерных систем. */
export interface MaintenanceLogEntry {
  id: string;
  /** Актив из реестра оборудования, к которому относится работа (необязательно) */
  assetId?: string;
  /** Плановая задача из календаря ТО, по которой выполнена работа (необязательно) */
  taskId?: string;
  date: string;
  technicianName: string;
  workType: MaintenanceWorkType;
  description: string;
  /** Замеры для узлов ИТП — необязательны, заполняются при наличии манометров/термометров */
  pressureInBar?: number;
  pressureOutBar?: number;
  tempSupplyC?: number;
  materialsUsed: MaterialUsage[];
  laborHours?: number;
  /** Статья сметы (2.x), в которую списываются материалы — для автоматического Плана/факта */
  costItemId?: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Наряды (WorkOrder) — слой планирования/согласования/SLA поверх журнала
// работ. Это НЕ замена MaintenanceLogEntry: наряд описывает, что должно быть
// сделано и кем согласовано, а при закрытии наряда порождается обычная
// MaintenanceLogEntry (или несколько — по одной на актив, если наряд
// групповой), которая уже списывает материалы и пишет План/факт — вся эта
// логика не дублируется, а переиспользуется.
//
// Статус «просрочено» не хранится отдельным значением статуса — он всегда
// вычисляется от дедлайна на момент просмотра (как и в календаре ТО), чтобы
// не было двух источников истины для одного и того же факта.
// ---------------------------------------------------------------------------

export type WorkOrderStatus =
  | "draft"
  | "pending_approval"
  | "scheduled"
  | "in_progress"
  | "review"
  | "completed"
  | "cancelled";

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  draft: "Черновик",
  pending_approval: "На согласовании",
  scheduled: "Назначен",
  in_progress: "В работе",
  review: "На проверке",
  completed: "Закрыт",
  cancelled: "Отменён",
};

/** Порядок статусов для канбан-колонок и кнопки «следующий шаг». */
export const WORK_ORDER_STATUS_FLOW: WorkOrderStatus[] = [
  "draft",
  "pending_approval",
  "scheduled",
  "in_progress",
  "review",
  "completed",
];

export type WorkOrderComplexity = "L1_ROUTINE" | "L2_QUALIFIED" | "L3_EXPERT";

export const WORK_ORDER_COMPLEXITY_LABELS: Record<WorkOrderComplexity, string> = {
  L1_ROUTINE: "L1 — базовый обход",
  L2_QUALIFIED: "L2 — замена арматуры/насоса",
  L3_EXPERT: "L3 — наладка контроллеров/КИПиА",
};

export type WorkOrderSeasonality = "all_year" | "heating_prep_ozp" | "spring_inspection" | "heating_season";

export const WORK_ORDER_SEASONALITY_LABELS: Record<WorkOrderSeasonality, string> = {
  all_year: "Круглый год",
  heating_prep_ozp: "Подготовка к ОЗП",
  spring_inspection: "Весенний осмотр",
  heating_season: "Отопительный период",
};

export interface WorkOrderChecklistItem {
  id: string;
  text: string;
  isCompleted: boolean;
  assetId?: string;
}

export type WorkOrderApprovalStatus = "none" | "pending" | "approved" | "rejected";

export interface WorkOrderApproval {
  required: boolean;
  status: WorkOrderApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
}

/** Наряд на работу — планирование, согласование и SLA поверх журнала работ. */
export interface WorkOrder {
  id: string;
  /** Читаемый номер, напр. WO-2026-0007 — генерируется последовательно в рамках проекта */
  ticketNumber: string;
  title: string;
  description: string;
  status: WorkOrderStatus;
  complexity: WorkOrderComplexity;
  seasonality: WorkOrderSeasonality;
  /** Работы 22:00–06:00 — влечёт напоминание уведомить жителей, не меняет расчёт сметы */
  isNightShift: boolean;
  /** Групповой (мастер-)наряд на пул однотипного оборудования */
  isBatch: boolean;
  targetAssetIds: string[];
  /** Свободный список исполнителей — отдельного справочника сотрудников/квалификаций в системе нет */
  assignedStaffNames: string[];
  /** Информационное поле — фильтрации по факту нет, т.к. нет справочника квалификаций */
  requiredSpecialization?: string;
  plannedStartDate: string;
  plannedDurationHours?: number;
  /** Дедлайн, ISO datetime — основа для расчёта SLA-статуса */
  deadline: string;
  actualStartDate?: string;
  actualEndDate?: string;
  approval: WorkOrderApproval;
  checklist: WorkOrderChecklistItem[];
  /** Статья сметы для итоговой MaintenanceLogEntry при закрытии наряда */
  costItemId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

