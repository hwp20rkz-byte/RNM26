/**
 * Входные данные бизнес-плана строительства домов из ЛСТК.
 * Все суммы — в тенге, без НДС. Время — месяцы от старта проекта (0 = первый месяц).
 */

export interface HouseType {
  id: string;
  name: string;
  /** Площадь дома, м² */
  area: number;
  /** Цена продажи за м², ₸ */
  pricePerM2: number;
  /** Срок строительства, мес. (≥1) */
  durationMonths: number;
  /** Доля в продажах, % (нормируется по сумме всех типов) */
  sharePct: number;
}

export type CostKind = "material" | "labor";
export type CostBasis = "perM2" | "perHouse";

export interface CostItem {
  id: string;
  name: string;
  kind: CostKind;
  basis: CostBasis;
  /** ₸ за м² или ₸ за дом — по basis */
  amount: number;
  /** id типов домов, к которым применяется статья */
  appliesTo: string[];
}

export type FrameSource = "own" | "buy";

export interface FrameSettings {
  source: FrameSource;
  /** Металлоёмкость каркаса, кг на м² площади дома */
  kgPerM2: number;
  /** Отходы при производстве/монтаже, % */
  wastePct: number;
  /** Своя линия: цена оцинкованного рулона, ₸/кг */
  coilPricePerKg: number;
  /** Покупной каркас у завода, ₸/кг */
  boughtPricePerKg: number;
  /** Мощность своей линии, кг/мес. */
  lineCapacityKgPerMonth: number;
}

export interface CapexItem {
  id: string;
  name: string;
  amount: number;
  /** Месяц покупки */
  month: number;
  /** Срок амортизации, мес. */
  lifeMonths: number;
  /** Нужна только при собственной линии профилирования */
  ownLineOnly: boolean;
}

export interface OpexItem {
  id: string;
  name: string;
  /** ₸ в месяц */
  amount: number;
}

export interface SalesPlan {
  /** Календарный месяц старта проекта, 1–12 */
  startCalendarMonth: number;
  startYear: number;
  /** Месяц первого договора (от старта) */
  firstSaleMonth: number;
  /** Договоров в месяц на старте продаж */
  startPerMonth: number;
  /** Договоров в месяц после выхода на план */
  targetPerMonth: number;
  /** Сколько месяцев выход на план */
  rampMonths: number;
  /** Коэффициенты сезонности по календарным месяцам янв–дек */
  seasonality: number[];
}

export interface PaymentTerms {
  /** Аванс при подписании договора, % */
  advancePct: number;
  /** Промежуточный платёж в середине стройки, % (остаток — при сдаче) */
  midPct: number;
  /** Доля материалов, закупаемых в месяц договора, % (остальное — равномерно по стройке) */
  materialsUpfrontPct: number;
}

export type TaxRegime = "simplified" | "general";

export interface FinanceSettings {
  horizonMonths: number;
  /** Ставка дисконтирования, % годовых */
  discountRatePct: number;
  equity: number;
  loanAmount: number;
  loanRatePct: number;
  loanTermMonths: number;
  /** Льготный период (только проценты), мес. */
  loanGraceMonths: number;
  taxRegime: TaxRegime;
  /** Упрощёнка: % от дохода */
  simplifiedRatePct: number;
  /** ОУР: КПН, % от прибыли */
  citRatePct: number;
  /** Комиссия продаж, % от суммы договора */
  salesCommissionPct: number;
  /** Непредвиденные расходы, % от прямой себестоимости */
  contingencyPct: number;
}

export interface PlanInputs {
  houses: HouseType[];
  costItems: CostItem[];
  frame: FrameSettings;
  capex: CapexItem[];
  opex: OpexItem[];
  sales: SalesPlan;
  payments: PaymentTerms;
  finance: FinanceSettings;
}

export interface HouseEconomics {
  id: string;
  name: string;
  price: number;
  frameCost: number;
  materialCost: number;
  laborCost: number;
  contingency: number;
  commission: number;
  directCost: number;
  margin: number;
  marginPct: number;
  frameKg: number;
}

export interface MonthRow {
  month: number;
  label: string;
  contracts: number;
  frameKg: number;
  revenue: number;
  directCost: number;
  commission: number;
  grossProfit: number;
  opex: number;
  ebitda: number;
  depreciation: number;
  interest: number;
  tax: number;
  netProfit: number;
  cashIn: number;
  cashOutDirect: number;
  operatingCf: number;
  capex: number;
  financingCf: number;
  /** Свободный денежный поток проекта (без учёта финансирования и процентов) */
  projectCf: number;
  cashEnd: number;
  loanBalance: number;
}

export interface Warning {
  level: "error" | "warning";
  text: string;
}

export interface PlanResult {
  houses: HouseEconomics[];
  months: MonthRow[];
  totals: {
    contracts: number;
    revenue: number;
    ebitda: number;
    netProfit: number;
    capex: number;
  };
  npv: number;
  /** Годовая IRR проекта, доля; null — не определяется */
  irr: number | null;
  /** Месяц окупаемости (накопленный поток проекта ≥ 0), null — за горизонтом */
  paybackMonth: number | null;
  /** Максимальная потребность в деньгах до финансирования (положительное число) */
  peakFunding: number;
  minCash: number;
  minCashMonth: number;
  /** Договоров в месяц для безубыточности по EBITDA */
  breakEvenPerMonth: number | null;
  avgContribution: number;
  warnings: Warning[];
}
