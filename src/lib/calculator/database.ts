import type {
  CalculatorDatabase,
  CostCategory,
  CostItem,
  PayrollPosition,
} from "./types";
import { DEFAULT_TAX_RATES } from "./payrollTax";
import { buildEngineeringConsumables } from "./data/engineeringConsumables";

const REAL_SOURCE = "Смета ОСИ ЖК «Коркем-1», 2026-2027 гг. (реальные данные)";
const MARKET_ESTIMATE =
  "Оценка рыночной цены, Алматы/Астана 2025-2026 гг. — сверьте перед утверждением сметы";

export const CATEGORIES: CostCategory[] = [
  // ---- 1. УПРАВЛЕНИЕ ----
  { id: "1", code: "1", name: "Расходы по управлению объектом кондоминиума", parentId: null, group: "management", order166Ref: "п.5 Методики №166" },
  { id: "1.1", code: "1.1", name: "Оплата труда председателя ОСИ / управляющего, налоги и отчисления", parentId: "1", group: "management" },
  { id: "1.2", code: "1.2", name: "Оплата услуг бухгалтера, юриста, менеджера", parentId: "1", group: "management" },
  { id: "1.3", code: "1.3", name: "Банковские услуги", parentId: "1", group: "management" },
  { id: "1.4", code: "1.4", name: "Содержание офиса ОСИ", parentId: "1", group: "management" },

  // ---- 2. СОДЕРЖАНИЕ ----
  { id: "2", code: "2", name: "Расходы по содержанию общего имущества кондоминиума", parentId: null, group: "maintenance", order166Ref: "п.6 Методики №166" },
  { id: "2.1", code: "2.1", name: "Дератизация, дезинсекция, дезинфекция МОП", parentId: "2", group: "maintenance" },
  { id: "2.2", code: "2.2", name: "ТО и локализация аварий общедомовых инженерных систем", parentId: "2", group: "maintenance" },
  { id: "2.2.1", code: "2.2.1", name: "Обслуживание инженерных сетей (сервисная компания)", parentId: "2.2", group: "maintenance" },
  { id: "2.2.2", code: "2.2.2", name: "Расходные материалы на текущий ремонт и подготовку к ОЗП", parentId: "2.2", group: "maintenance" },
  { id: "2.2.3", code: "2.2.3", name: "ИТП: автоматика, регуляторы, промывка теплообменников", parentId: "2.2", group: "maintenance" },
  { id: "2.2.4", code: "2.2.4", name: "Поверка общедомовых приборов учёта и электролаборатория", parentId: "2.2", group: "maintenance" },
  { id: "2.2.5", code: "2.2.5", name: "Насосные станции повышения давления (ХВС)", parentId: "2.2", group: "maintenance" },
  { id: "2.3", code: "2.3", name: "Санитарное содержание МОП и придомовой территории", parentId: "2", group: "maintenance" },
  { id: "2.3.1", code: "2.3.1", name: "Уборка помещений и территории", parentId: "2.3", group: "maintenance" },
  { id: "2.3.2", code: "2.3.2", name: "Вывоз снега и противогололёдная обработка", parentId: "2.3", group: "maintenance" },
  { id: "2.3.3", code: "2.3.3", name: "Вывоз мусора", parentId: "2.3", group: "maintenance" },
  { id: "2.3.4", code: "2.3.4", name: "Озеленение и благоустройство", parentId: "2.3", group: "maintenance" },
  { id: "2.3.5", code: "2.3.5", name: "Инвентарь и химия для клининга", parentId: "2.3", group: "maintenance" },
  { id: "2.3.6", code: "2.3.6", name: "СИЗ и спецодежда линейного персонала", parentId: "2.3", group: "maintenance" },
  { id: "2.4", code: "2.4", name: "Сервисное обслуживание и поверка общедомовых приборов учёта", parentId: "2", group: "maintenance" },
  { id: "2.5", code: "2.5", name: "Противопожарные мероприятия", parentId: "2", group: "maintenance" },
  { id: "2.6", code: "2.6", name: "Обслуживание паркинга и слаботочные системы безопасности", parentId: "2", group: "maintenance" },
  { id: "2.7", code: "2.7", name: "Текущий ремонт общедомового имущества", parentId: "2", group: "maintenance" },
  { id: "2.8", code: "2.8", name: "Хозяйственные расходы на инвентарь и оборудование", parentId: "2", group: "maintenance" },
  { id: "2.9", code: "2.9", name: "Лифтовое хозяйство", parentId: "2", group: "maintenance" },
  { id: "2.10", code: "2.10", name: "Фасад, кровля, входные группы", parentId: "2", group: "maintenance" },
  { id: "2.11", code: "2.11", name: "Накопительный взнос на капитальный ремонт", parentId: "2", group: "maintenance", order166Ref: "ст.60-1 Закона «О жилищных отношениях» — не менее 0,005 МРП/м²/мес" },
];

let seq = 0;
function id(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

function item(
  categoryId: string,
  name: string,
  unit: string,
  annualQty: number,
  unitPrice: number,
  opts: Partial<CostItem> = {},
): CostItem {
  return {
    id: id(categoryId),
    categoryId,
    name,
    unit,
    annualQty,
    unitPrice,
    frequency: "annual",
    enabled: true,
    ...opts,
  };
}

function payroll(
  categoryId: string,
  role: string,
  headcount: number,
  monthlySalaryOrContract: number,
  opts: Partial<PayrollPosition> = {},
): PayrollPosition {
  return {
    id: id(`${categoryId}-p`),
    categoryId,
    role,
    mode: "staff",
    headcount,
    monthlySalaryOrContract,
    enabled: true,
    ...opts,
  };
}

// ---------------------------------------------------------------------------
// 1. УПРАВЛЕНИЕ
// ---------------------------------------------------------------------------
const payrollItems: PayrollPosition[] = [
  payroll("1.1", "Председатель ОСИ / управляющий МЖД", 1, 500000, {
    mode: "staff",
    tooltip: "Оклад + налоги воспроизводят реальный расчёт из сметы ЖК «Коркем-1» (581 400 ₸/мес «на руки + налоги»).",
    source: REAL_SOURCE,
  }),
  payroll("1.2", "Бухгалтер (абонентское обслуживание)", 1, 300000, {
    mode: "outsource",
    source: REAL_SOURCE,
    tooltip: "Договор на бухгалтерское сопровождение.",
  }),
  payroll("1.2", "Юрист (абонентская плата)", 1, 60000, {
    mode: "outsource",
    source: REAL_SOURCE,
  }),
  payroll("1.2", "Менеджер ОСИ (договор ГПХ, «на руки»)", 1, 266134, {
    mode: "outsource",
    source: REAL_SOURCE,
    tooltip: "Сумма уже включает налоговую нагрузку по ГПХ в расчёте сметы-источника.",
  }),
  payroll("2.9", "Диспетчер лифтового хозяйства (24/7, посменно)", 4, 180000, {
    mode: "staff",
    enabled: false,
    staffOutsourceGroup: "elevator-dispatch",
    source: MARKET_ESTIMATE,
  }),
];

const managementItems: CostItem[] = [
  item("1.3", "Расчётно-кассовое обслуживание, эквайринг", "мес.", 12, 32000, { source: REAL_SOURCE }),
  item("1.4", "Канцелярские расходы", "мес.", 12, 5000, { source: REAL_SOURCE }),
  item("1.4", "Заправка картриджей, содержание оргтехники", "мес.", 12, 5000, { source: REAL_SOURCE }),
  item("1.4", "Аренда офиса ОСИ с коммунальными расходами", "мес.", 12, 175000, { source: REAL_SOURCE }),
  item("1.4", "Обслуживание программы e-knot (учёт собственников)", "мес.", 12, 35000, { source: REAL_SOURCE }),
  item("1.4", "Аренда облачной 1С-бухгалтерии", "мес.", 12, 12000, { source: REAL_SOURCE }),
  item("1.4", "Услуги ЕРЦ (единый расчётный центр)", "мес.", 12, 29252.21, { source: REAL_SOURCE }),
];

// ---------------------------------------------------------------------------
// 2. СОДЕРЖАНИЕ
// ---------------------------------------------------------------------------
const contentPayroll: PayrollPosition[] = [
  payroll("2.2.1", "Обслуживание инженерных сетей (сервисная компания, аутсорс)", 1, 1994068, {
    mode: "outsource",
    staffOutsourceGroup: "engineering-team",
    source: REAL_SOURCE,
  }),
  payroll("2.2.1", "Сантехник в штате", 3, 220000, {
    mode: "staff",
    enabled: false,
    staffOutsourceGroup: "engineering-team",
    source: MARKET_ESTIMATE,
  }),
  payroll("2.2.1", "Электрик в штате", 2, 220000, {
    mode: "staff",
    enabled: false,
    staffOutsourceGroup: "engineering-team",
    source: MARKET_ESTIMATE,
  }),
  payroll("2.3.1", "Уборка помещений и территорий (сервисная компания, аутсорс)", 1, 2324763, {
    mode: "outsource",
    staffOutsourceGroup: "cleaning-team",
    source: REAL_SOURCE,
  }),
  payroll("2.3.1", "Дворник в штате", 8, 160000, {
    mode: "staff",
    enabled: false,
    staffOutsourceGroup: "cleaning-team",
    source: MARKET_ESTIMATE,
  }),
  payroll("2.3.1", "Уборщица МОП в штате", 6, 150000, {
    mode: "staff",
    enabled: false,
    staffOutsourceGroup: "cleaning-team",
    source: MARKET_ESTIMATE,
  }),
  payroll("2.3.1", "Озеленитель / садовник (сезонно)", 2, 150000, {
    mode: "staff",
    enabled: false,
    minServiceClass: "comfort",
    source: MARKET_ESTIMATE,
  }),
  payroll("2.6", "Консьерж (посменно, 1 пост)", 4, 150000, {
    mode: "staff",
    enabled: false,
    minServiceClass: "business",
    source: MARKET_ESTIMATE,
  }),
  payroll("2.6", "Охрана (ЧОП, посты 24/7)", 1, 900000, {
    mode: "outsource",
    enabled: false,
    minServiceClass: "business",
    source: MARKET_ESTIMATE,
  }),
  payroll("2.6", "Оператор видеонаблюдения", 4, 160000, {
    mode: "staff",
    enabled: false,
    minServiceClass: "business",
    source: MARKET_ESTIMATE,
  }),
];

const contentItems: CostItem[] = [
  item("2.1", "Дератизация паркинга", "кв.м.", 3577.5, 24, { source: REAL_SOURCE }),
  item("2.1", "Дезинсекция подвалов (за подъездную секцию, помесячно)", "подъезд/мес", 192, 1000, { source: REAL_SOURCE }),

  ...buildEngineeringConsumables("2.2.2"),

  item("2.2.3", "Сервисное обслуживание автоматики ИТП (Danfoss/Ridan)", "мес.", 12, 65000, { source: MARKET_ESTIMATE, tooltip: "Регламентное ТО контроллера, регуляторов давления, подпиточных клапанов ИТП." }),
  item("2.2.3", "Весенне-осенняя гидропневматическая промывка системы отопления", "усл.", 2, 250000, { source: MARKET_ESTIMATE, frequency: "seasonal", tooltip: "Промывка и опрессовка перед и после отопительного сезона снижает риск порывов на ~70-85%." }),
  item("2.2.3", "Химическая промывка пластинчатых теплообменников + прокладки", "усл.", 1, 380000, { source: MARKET_ESTIMATE, frequency: "annual" }),

  item("2.2.4", "Поверка общедомовых теплосчётчиков (раз в 4 года, амортизировано на год)", "компл.", 1, 180000, { source: MARKET_ESTIMATE, tooltip: "Обязательная периодическая поверка по Закону РК «Об обеспечении единства измерений»." }),
  item("2.2.4", "Электролаборатория: замер сопротивления изоляции и контура заземления (раз в 3 года)", "усл.", 1, 220000, { source: MARKET_ESTIMATE }),
  item("2.2.4", "Термография контактных соединений ВРУ", "усл.", 1, 90000, { source: MARKET_ESTIMATE, minServiceClass: "comfort" }),

  item("2.2.5", "ТО насосной станции повышения давления (Grundfos/Wilo)", "мес.", 12, 45000, { source: MARKET_ESTIMATE }),
  item("2.2.5", "Замена мембран расширительных баков, сальников (по факту)", "усл.", 1, 150000, { source: MARKET_ESTIMATE }),

  item("2.3.2", "Вывоз снега спецтехникой", "усл.", 4, 500000, { source: REAL_SOURCE, frequency: "seasonal" }),
  item("2.3.2", "Противогололёдный реагент (песчано-соляная смесь)", "кг", 8000, 65, { source: MARKET_ESTIMATE, frequency: "seasonal" }),

  item("2.3.3", "Вывоз ТБО сверх тарифа регоператора", "мес.", 6, 50000, { source: REAL_SOURCE }),

  item("2.3.4", "Приобретение цветов, рассады, посадка и уход", "усл.", 1, 900000, { source: REAL_SOURCE }),

  item("2.3.5", "Химия для мытья полов (концентрат, щелочная/нейтральная)", "л", 240, 1200, { source: MARKET_ESTIMATE }),
  item("2.3.5", "Полироль для нержавеющих лифтовых кабин", "л", 24, 3500, { source: MARKET_ESTIMATE }),
  item("2.3.5", "Мешки для мусора 120 л", "упак.", 96, 4500, { source: MARKET_ESTIMATE }),
  item("2.3.5", "Мешки для мусора 240 л", "упак.", 48, 6500, { source: MARKET_ESTIMATE }),
  item("2.3.5", "Профессиональные мопы, флаундеры, уборочные тележки (обновление парка)", "компл.", 6, 45000, { source: MARKET_ESTIMATE }),
  item("2.3.5", "Метлы, грабли веерные, ледорубы, снегоуборочные лопаты", "компл.", 1, 280000, { source: MARKET_ESTIMATE }),
  item("2.3.5", "Триммер бензиновый + леска + масло 2Т + бензин АИ-92", "усл.", 1, 220000, { source: MARKET_ESTIMATE, minServiceClass: "comfort" }),

  item("2.3.6", "Спецодежда дворника (зимний костюм/бушлат, жилет, сапоги, рукавицы)", "компл./год на 1 чел.", 8, 65000, { source: MARKET_ESTIMATE, tooltip: "Нормы выдачи СИЗ — приказ по охране труда РК, срок носки 12-24 мес." }),
  item("2.3.6", "Спецодежда уборщицы (униформа, перчатки, нескользящая обувь, респиратор)", "компл./год на 1 чел.", 6, 35000, { source: MARKET_ESTIMATE }),
  item("2.3.6", "СИЗ сантехника/электрика (полукомбинезон, ботинки, диэл. перчатки, каска)", "компл./год на 1 чел.", 5, 85000, { source: MARKET_ESTIMATE }),

  item("2.4", "Техническое обслуживание системы теплового учёта", "мес.", 12, 34240, { source: REAL_SOURCE }),
  item("2.4", "Текущий ремонт приборов учёта", "мес.", 12, 70000, { source: REAL_SOURCE }),

  item("2.5", "Услуги автоматической пожарной сигнализации (АПС), мониторинг", "мес.", 12, 97000, { source: REAL_SOURCE }),
  item("2.5", "Приобретение и перезарядка огнетушителей, знаки эвакуации", "мес.", 12, 83484, { source: REAL_SOURCE }),
  item("2.5", "Перекатка пожарных рукавов (раз в год)", "усл.", 1, 120000, { source: MARKET_ESTIMATE }),
  item("2.5", "ТО системы дымоудаления и подпора воздуха", "мес.", 12, 55000, { source: MARKET_ESTIMATE, minServiceClass: "comfort" }),

  item("2.6", "Ремонт ворот паркинга, шлагбаума", "усл.", 1, 250000, { source: MARKET_ESTIMATE, minServiceClass: "comfort" }),
  item("2.6", "Клининг паркинга", "мес.", 12, 180000, { source: MARKET_ESTIMATE, minServiceClass: "comfort" }),
  item("2.6", "Обслуживание домофонной системы (СКУД)", "мес.", 12, 45000, { source: MARKET_ESTIMATE }),
  item("2.6", "IP-видеонаблюдение: сервер, регистраторы, очистка куполов камер", "мес.", 12, 60000, { source: MARKET_ESTIMATE, minServiceClass: "comfort" }),

  ...[
    ["Лампочки светодиодные 8 Вт в подъездах (1 шт/этаж)", "шт.", 1079, 456],
    ["Керамогранит на фасаде, ремонт участков", "кв.м.", 60, 7990],
    ["Клей для керамогранита 25 кг.", "меш.", 12, 3149.15],
    ["Пружины на дверях в подъездах / паркинге", "шт.", 200, 660],
    ["Доводчики на входных дверях", "шт.", 64, 15500],
    ["Гипсокартон влагостойкий", "шт.", 20, 4500],
    ["Профиль для гипсокартона", "шт.", 20, 4850],
    ["Шурупы", "шт.", 174, 15.5],
    ["Смесь гипсовая белая 25 кг.", "меш.", 240, 3000],
    ["Краска в/э белая 9 л.", "шт.", 128, 20000],
    ["Затирка для швов 2 кг., чёрная", "меш.", 16, 2540],
    ["Шпатель", "шт.", 32, 625],
    ["Валик малярный", "шт.", 32, 1640],
    ["Гидроизоляция в лифтах", "шт.", 16, 225912.06],
  ].map(([name, unit, qty, price]) =>
    item("2.7", name as string, unit as string, qty as number, price as number, { source: REAL_SOURCE }),
  ),

  ...[
    ["Краска жёлтая (разметка)", "шт.", 6, 15300],
    ["Видеокамера (докупка/замена)", "шт.", 7, 154878.86],
    ["Краска коричневая для лавочек", "банка", 5, 8360],
    ["Реагент вместо соли зимой (50 меш. по 50 кг.)", "кг.", 2500, 45],
    ["Обустройство двора (разовые работы)", "усл.", 1, 396246],
  ].map(([name, unit, qty, price]) =>
    item("2.8", name as string, unit as string, qty as number, price as number, { source: REAL_SOURCE }),
  ),

  item("2.9", "Ежемесячное сервисное обслуживание пассажирских лифтов", "лифт/мес.", Math.round(12), 55000, { source: MARKET_ESTIMATE, tooltip: "Типовая ставка сервисной компании за 1 лифт в месяц; итог зависит от числа лифтов на объекте." }),
  item("2.9", "Диспетчеризация и связь с кабиной лифта (24/7)", "лифт/мес.", 12, 8000, { source: MARKET_ESTIMATE }),
  item("2.9", "Ежегодное техническое освидетельствование (экспертиза пром. безопасности)", "лифт/год", 1, 95000, { source: MARKET_ESTIMATE }),
  item("2.9", "Плановая замена канатов, башмаков, тяговых ремней", "усл./год", 1, 350000, { source: MARKET_ESTIMATE }),

  item("2.10", "Промышленный альпинизм: сезонная мойка фасадного остекления", "усл.", 2, 450000, { source: MARKET_ESTIMATE, frequency: "seasonal", minServiceClass: "comfort" }),
  item("2.10", "Герметизация межпанельных швов (бутилкаучук/полиуретан)", "п.м.", 200, 1800, { source: MARKET_ESTIMATE }),
  item("2.10", "Ямочный ремонт мягкой кровли, герметизация примыканий парапетов", "кв.м.", 150, 3200, { source: MARKET_ESTIMATE }),
  item("2.10", "Ревизия воронок внутреннего водостока, монтаж греющего кабеля", "усл.", 1, 380000, { source: MARKET_ESTIMATE, minServiceClass: "comfort" }),
  item("2.10", "Ремонт ступеней, пандусов, поручней входных групп", "усл.", 1, 260000, { source: MARKET_ESTIMATE }),
  item("2.10", "Весенняя побелка деревьев, санитарная обрезка, аэрация газона", "усл.", 1, 180000, { source: MARKET_ESTIMATE, minServiceClass: "comfort" }),
];

export function buildDefaultDatabase(): CalculatorDatabase {
  return {
    categories: CATEGORIES,
    items: [...managementItems, ...contentItems],
    payroll: [...payrollItems, ...contentPayroll],
    taxRates: { ...DEFAULT_TAX_RATES },
  };
}

/**
 * Пустая база для нового объекта: полная структура категорий Методики №166,
 * но без калиброванных под ЖК «Коркем-1» количеств и цен — только позиция
 * председателя (управление объектом обязательно для любого ОСИ/ПТ). Остальные
 * статьи пользователь добавляет вручную или из Справочника.
 */
export function buildBlankDatabase(chairmanSalary = 400000): CalculatorDatabase {
  return {
    categories: CATEGORIES,
    items: [],
    payroll: [
      payroll("1.1", "Председатель ОСИ / управляющий", 1, chairmanSalary, {
        mode: "staff",
        tooltip: "Оклад и налоги пересчитываются автоматически по ставкам РК.",
      }),
    ],
    taxRates: { ...DEFAULT_TAX_RATES },
  };
}
