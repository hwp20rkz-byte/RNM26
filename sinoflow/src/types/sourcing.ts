/**
 * Доменная модель SinoFlow AI.
 * Все денежные суммы хранятся в «минимальной разумной» точности (число, не строка),
 * валюта всегда указана явно. Базовая валюта расчётов — USD.
 */

// ───────────────────────────── Валюты ─────────────────────────────

export const CURRENCIES = ["RUB", "KZT", "CNY", "USD"] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

/** Сколько единиц валюты за 1 USD. USD всегда 1. */
export type RatesPerUsd = Record<CurrencyCode, number>;

export type RateSource = "cbr-live" | "snapshot" | "manual";

export interface RatesSnapshot {
  base: "USD";
  perUsd: RatesPerUsd;
  source: RateSource;
  /** ISO-время публикации курса источником */
  asOf: string;
  /** Подпись источника для UI */
  sourceLabel: string;
}

export type MultiCurrencyAmount = Record<CurrencyCode, number>;

export interface PricingConfig {
  /** Маржа агентства на услуги, доля (0.25 = 25%) */
  agencyMargin: number;
  /** Спред на конвертацию валют, доля */
  fxSpread: number;
}

// ───────────────────────────── Услуги ─────────────────────────────

export type ServiceId =
  | "basic_search"
  | "deep_audit"
  | "sample_procurement"
  | "oem_negotiation"
  | "qc_inspection"
  | "logistics_customs";

export type ProductCategory = "consumer" | "industrial" | "machinery";

export interface ServiceDefinition {
  id: ServiceId;
  name: { ru: string; en: string };
  description: { ru: string; en: string };
  /** Базовая себестоимость-цена в USD до маржи и коэффициентов */
  baseUsd: number;
  /** Часы оператора, заложенные в услугу */
  operatorHours: number;
  /** Если задано — услуга считается как % от стоимости товара, не ниже baseUsd */
  percentOfGoods?: number;
  /** Агенты, которые выполняют услугу */
  agents: AgentId[];
}

export interface ServiceQuoteLine {
  serviceId: ServiceId;
  name: string;
  costUsd: number;
  marginUsd: number;
  priceUsd: number;
  price: MultiCurrencyAmount;
}

export interface ServiceQuote {
  lines: ServiceQuoteLine[];
  total: MultiCurrencyAmount;
  totalUsd: number;
  marginUsd: number;
  multipliers: { category: number; rush: number };
}

// ───────────────────────────── Заявка ─────────────────────────────

export type DestinationCode = "KZ-ALA" | "RU-MOW" | "RU-EKB";
export type Incoterm = "EXW" | "FOB" | "FCA";
export type Urgency = "standard" | "rush";

export interface OrderRequest {
  id: string;
  createdAt: string;
  client: { company: string; contact: string; country: "KZ" | "RU" };
  title: string;
  rawText: string;
  quantity: number;
  unit: string;
  targetPrice: { amount: number; currency: CurrencyCode };
  destination: DestinationCode;
  incoterm: Incoterm;
  urgency: Urgency;
  category: ProductCategory;
  services: ServiceId[];
}

export type OrderStage =
  | "draft"
  | "intake"
  | "analyst"
  | "hunter"
  | "negotiator"
  | "costing"
  | "proposal_ready";

// ───────────────────────────── Агенты ─────────────────────────────

export type AgentId = "analyst" | "hunter" | "negotiator" | "costing";

export type AgentStatus = "idle" | "running" | "waiting_human" | "done" | "error";

export interface AgentDefinition {
  id: AgentId;
  index: 1 | 2 | 3 | 4;
  name: string;
  role: { ru: string; en: string };
  model: string;
  tools: string[];
}

export interface AgentRuntime {
  status: AgentStatus;
  progress: number; // 0..1
  startedAt?: number;
  finishedAt?: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  lastMessage?: string;
}

export interface AgentLogEntry {
  id: string;
  at: number;
  agent: AgentId | "system" | "operator";
  level: "info" | "tool" | "result" | "warn" | "human";
  text: string;
}

// ───────────────────────────── Agent 1: спецификация ─────────────────────────────

export interface TechSpecItem {
  key: string;
  label: { ru: string; en: string; zh: string };
  value: string;
  confidence: number;
  source: "client_text" | "inferred" | "standard";
}

export interface HsCodeAssignment {
  code: string;
  description: { ru: string; en: string };
  confidence: number;
  dutyRate: number; // доля
  notes: string;
}

export interface ComplianceFlag {
  id: string;
  severity: "info" | "warn" | "block";
  text: { ru: string; en: string };
}

export interface BilingualRfq {
  subject: { en: string; zh: string };
  en: string;
  zh: string;
}

export interface SpecAnalysis {
  specs: TechSpecItem[];
  hs: HsCodeAssignment;
  compliance: ComplianceFlag[];
  clarifyingQuestions: { ru: string; en: string }[];
  rfq: BilingualRfq;
}

// ───────────────────────────── Agent 2: поставщики ─────────────────────────────

export type Marketplace = "1688" | "alibaba" | "made-in-china";
export type SupplierType = "manufacturer" | "trading_company";

export interface VerificationSignals {
  businessLicense: boolean; // 营业执照 проверена
  registeredCapitalCny: number;
  yearsInBusiness: number;
  factoryAreaM2?: number;
  staff?: number;
  videoAudit: boolean;
  tradeAssurance: boolean;
  eacExperience: boolean;
  exportShare: number; // доля
  iso9001: boolean;
}

export interface SupplierCandidate {
  id: string;
  nameZh: string;
  nameEn: string;
  city: string;
  province: string;
  marketplaces: Marketplace[];
  type: SupplierType;
  verification: VerificationSignals;
  controller: string;
  listing: { title: string; priceMinCny: number; priceMaxCny: number; moq: number; url: string };
  score: number; // 0..100
  filteredOut?: { reason: { ru: string; en: string } };
}

export interface MarketplaceScanStat {
  marketplace: Marketplace;
  method: { ru: string; en: string };
  found: number;
  afterDedup: number;
}

// ───────────────────────────── Agent 3: переговоры ─────────────────────────────

export type Channel = "wechat" | "whatsapp";
export type Lang = "ru" | "en" | "zh";

export interface ChatMessage {
  id: string;
  channel: Channel;
  supplierId: string;
  from: "agent" | "factory" | "operator";
  author: string;
  at: string; // время в UI, «11:04»
  original: { lang: Lang; text: string };
  translations: Partial<Record<Lang, string>>;
  extracted?: Partial<NegotiatedTerms>;
  /** Черновик агента, ждущий подтверждения оператора */
  draft?: boolean;
}

export interface NegotiatedTerms {
  supplierId: string;
  unitPriceCny: number;
  basis: Incoterm;
  port: string;
  moq: number;
  leadTimeDays: number;
  paymentTerms: string;
  warrantyMonths: number;
  includesVat: boolean;
}

export interface SupplierQuote {
  supplierId: string;
  initial: NegotiatedTerms;
  final?: NegotiatedTerms;
  status: "requested" | "quoted" | "negotiating" | "agreed" | "declined";
}

// ───────────────────────────── Agent 4: landed cost ─────────────────────────────

export interface LogisticsProfile {
  destination: DestinationCode;
  label: { ru: string; en: string };
  route: { ru: string; en: string };
  containers: number;
  freightPerContainerUsd: number;
  transitDays: number;
  vatRate: number; // доля
  vatNote: string;
  customsFeesUsd: number;
  brokerUsd: number;
  certificationUsd: number;
}

export interface LandedCostLine {
  key: string;
  label: { ru: string; en: string };
  usd: number;
  note?: string;
}

export interface LandedCostResult {
  destination: DestinationCode;
  quantity: number;
  lines: LandedCostLine[];
  totalUsd: number;
  perUnitUsd: number;
  total: MultiCurrencyAmount;
  perUnit: MultiCurrencyAmount;
  /** Экономия к целевой цене клиента, доля (отрицательная — дороже цели) */
  vsTarget: number;
}

// ───────────────────────────── Состояние воркфлоу ─────────────────────────────

export interface WorkflowState {
  order: OrderRequest | null;
  stage: OrderStage;
  agents: Record<AgentId, AgentRuntime>;
  log: AgentLogEntry[];
  analysis: SpecAnalysis | null;
  scan: MarketplaceScanStat[];
  suppliers: SupplierCandidate[];
  quotes: SupplierQuote[];
  messages: ChatMessage[];
  pendingApproval: ChatMessage | null;
  landed: Partial<Record<DestinationCode, LandedCostResult>>;
  selectedSupplierId: string | null;
}

export type WorkflowEvent =
  | { type: "stage"; stage: OrderStage }
  | { type: "agent"; agent: AgentId; patch: Partial<AgentRuntime> }
  | { type: "log"; entry: AgentLogEntry }
  | { type: "analysis"; analysis: SpecAnalysis }
  | { type: "scan"; stat: MarketplaceScanStat }
  | { type: "supplier"; supplier: SupplierCandidate }
  | { type: "quote"; quote: SupplierQuote }
  | { type: "message"; message: ChatMessage }
  | { type: "approval"; message: ChatMessage | null }
  | { type: "landed"; result: LandedCostResult }
  | { type: "select"; supplierId: string };
