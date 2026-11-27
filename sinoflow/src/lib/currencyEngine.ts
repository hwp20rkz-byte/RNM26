import {
  CURRENCIES,
  type CurrencyCode,
  type DestinationCode,
  type LandedCostLine,
  type LandedCostResult,
  type LogisticsProfile,
  type MultiCurrencyAmount,
  type NegotiatedTerms,
  type PricingConfig,
  type ProductCategory,
  type RatesPerUsd,
  type RatesSnapshot,
  type ServiceDefinition,
  type ServiceId,
  type ServiceQuote,
  type Urgency,
} from "@/types/sourcing";

// ───────────────────────────── Курсы ─────────────────────────────

/**
 * Снимок на случай, если живой курс недоступен (офлайн, блокировка CORS).
 * Помечен как snapshot — UI обязан это показать.
 */
export const SNAPSHOT_RATES: RatesSnapshot = {
  base: "USD",
  perUsd: { USD: 1, RUB: 81.5, KZT: 512, CNY: 7.12 },
  source: "snapshot",
  asOf: "2026-11-26T12:00:00+03:00",
  sourceLabel: "Демо-снимок курсов",
};

export const DEFAULT_PRICING: PricingConfig = { agencyMargin: 0.3, fxSpread: 0.015 };

/** Публичное зеркало официальных курсов ЦБ РФ в JSON (отдаёт CORS-заголовки). */
export const CBR_DAILY_URL = "https://www.cbr-xml-daily.ru/daily_json.js";

interface CbrValute {
  Nominal: number;
  Value: number;
}
interface CbrDaily {
  Date: string;
  Valute: Record<string, CbrValute | undefined>;
}

/**
 * ЦБ РФ публикует рубли за N единиц валюты. Кросс-курсы к USD:
 * RUB/USD = USD.Value; CNY/USD = USD / (CNY.Value / CNY.Nominal); то же для KZT (Nominal = 100).
 */
export function ratesFromCbr(json: CbrDaily): RatesSnapshot {
  const usd = json.Valute.USD;
  const cny = json.Valute.CNY;
  const kzt = json.Valute.KZT;
  if (!usd || !cny || !kzt) throw new Error("CBR payload is missing USD, CNY or KZT");
  const rubPerUsd = usd.Value / usd.Nominal;
  const rubPerCny = cny.Value / cny.Nominal;
  const rubPerKzt = kzt.Value / kzt.Nominal;
  return {
    base: "USD",
    perUsd: {
      USD: 1,
      RUB: round(rubPerUsd, 4),
      CNY: round(rubPerUsd / rubPerCny, 4),
      KZT: round(rubPerUsd / rubPerKzt, 2),
    },
    source: "cbr-live",
    asOf: json.Date,
    sourceLabel: "ЦБ РФ, официальный курс",
  };
}

export async function fetchLiveRates(signal?: AbortSignal): Promise<RatesSnapshot> {
  const res = await fetch(CBR_DAILY_URL, { signal, cache: "no-store" });
  if (!res.ok) throw new Error(`CBR HTTP ${res.status}`);
  return ratesFromCbr((await res.json()) as CbrDaily);
}

// ───────────────────────────── Конвертация ─────────────────────────────

export function round(value: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

export function convert(amount: number, from: CurrencyCode, to: CurrencyCode, rates: RatesPerUsd): number {
  if (from === to) return amount;
  return (amount / rates[from]) * rates[to];
}

/** Шаг округления для клиентских цен: счёт в тенге без «копеек» выглядит честнее. */
export const PRICE_STEP: Record<CurrencyCode, number> = { RUB: 100, KZT: 500, CNY: 10, USD: 5 };

export function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export interface ToMultiOptions {
  /** Надбавка на конвертацию для всех валют, кроме исходной */
  fxSpread?: number;
  /** Округлять до коммерческого шага (для прайсов), иначе до 2 знаков */
  commercial?: boolean;
}

export function toMulti(
  amount: number,
  from: CurrencyCode,
  rates: RatesPerUsd,
  { fxSpread = 0, commercial = false }: ToMultiOptions = {},
): MultiCurrencyAmount {
  const out = {} as MultiCurrencyAmount;
  for (const c of CURRENCIES) {
    const raw = convert(amount, from, c, rates) * (c === from ? 1 : 1 + fxSpread);
    out[c] = commercial ? roundToStep(raw, PRICE_STEP[c]) : round(raw, 2);
  }
  return out;
}

const SYMBOL: Record<CurrencyCode, string> = { RUB: "₽", KZT: "₸", CNY: "¥", USD: "$" };
export const currencySymbol = (c: CurrencyCode) => SYMBOL[c];

export function formatMoney(value: number, currency: CurrencyCode, opts: { decimals?: number; compact?: boolean } = {}): string {
  const decimals = opts.decimals ?? (Math.abs(value) < 100 && currency !== "KZT" && currency !== "RUB" ? 2 : 0);
  if (opts.compact && Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("ru-RU", { maximumFractionDigits: 2 })} млн ${SYMBOL[currency]}`;
  }
  const num = value.toLocaleString("ru-RU", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return currency === "USD" ? `$${num}` : `${num} ${SYMBOL[currency]}`;
}

// ───────────────────────────── Прайсинг услуг ─────────────────────────────

export const CATEGORY_MULTIPLIER: Record<ProductCategory, number> = {
  consumer: 1,
  industrial: 1.25,
  machinery: 1.5,
};
export const RUSH_MULTIPLIER: Record<Urgency, number> = { standard: 1, rush: 1.35 };

export interface PriceServicesInput {
  services: ServiceId[];
  catalog: readonly ServiceDefinition[];
  category: ProductCategory;
  urgency: Urgency;
  /** Ориентировочная стоимость товара в USD — для услуг, которые считаются в %. */
  goodsValueUsd: number;
  rates: RatesPerUsd;
  pricing: PricingConfig;
  lang?: "ru" | "en";
}

/**
 * Цена услуги = база × коэффициент категории × срочность, плюс маржа агентства.
 * Логистика считается как % от стоимости товара, но не ниже базы.
 * Пересчёт в валюты клиента — с FX-спредом и коммерческим округлением.
 */
export function priceServices(input: PriceServicesInput): ServiceQuote {
  const category = CATEGORY_MULTIPLIER[input.category];
  const rush = RUSH_MULTIPLIER[input.urgency];
  const lines = input.services.map((id) => {
    const def = input.catalog.find((s) => s.id === id);
    if (!def) throw new Error(`Unknown service ${id}`);
    // Услуги «в % от товара» уже масштабируются стоимостью партии — коэффициент категории к ним не применяем.
    const costUsd = def.percentOfGoods
      ? round(Math.max(def.baseUsd, input.goodsValueUsd * def.percentOfGoods) * rush, 2)
      : round(def.baseUsd * category * rush, 2);
    const marginUsd = round(costUsd * input.pricing.agencyMargin, 2);
    const priceUsd = roundToStep(costUsd + marginUsd, PRICE_STEP.USD);
    return {
      serviceId: id,
      name: def.name[input.lang ?? "ru"],
      costUsd,
      marginUsd,
      priceUsd,
      price: toMulti(priceUsd, "USD", input.rates, { fxSpread: input.pricing.fxSpread, commercial: true }),
    };
  });
  const total = {} as MultiCurrencyAmount;
  for (const c of CURRENCIES) total[c] = lines.reduce((s, l) => s + l.price[c], 0);
  return {
    lines,
    total,
    totalUsd: lines.reduce((s, l) => s + l.priceUsd, 0),
    marginUsd: round(lines.reduce((s, l) => s + l.marginUsd, 0), 2),
    multipliers: { category, rush },
  };
}

// ───────────────────────────── Landed cost (Agent 4) ─────────────────────────────

export interface LandedCostInput {
  terms: NegotiatedTerms;
  quantity: number;
  profile: LogisticsProfile;
  dutyRate: number;
  /** Комиссия агентства на сопровождение заказа, доля от стоимости товара */
  agencyCommission: number;
  rates: RatesPerUsd;
  targetUnitUsd: number;
}

/**
 * Упрощённая модель стоимости «до двери» для ЕАЭС:
 * таможенная стоимость = товар (FOB) + фрахт + страховка;
 * пошлина — от таможенной стоимости; НДС — от (таможенная стоимость + пошлина).
 * Цифры налогов — параметры профиля, их нужно сверять с брокером перед КП.
 */
export function computeLandedCost(input: LandedCostInput): LandedCostResult {
  const { terms, quantity, profile, rates } = input;
  const goodsUsd = convert(terms.unitPriceCny * quantity, "CNY", "USD", rates);
  const freightUsd = profile.containers * profile.freightPerContainerUsd;
  const insuranceUsd = (goodsUsd + freightUsd) * 0.003;
  const customsValueUsd = goodsUsd + freightUsd + insuranceUsd;
  const dutyUsd = customsValueUsd * input.dutyRate;
  const vatUsd = (customsValueUsd + dutyUsd) * profile.vatRate;
  const commissionUsd = goodsUsd * input.agencyCommission;

  const lines: LandedCostLine[] = [
    { key: "goods", label: { ru: `Товар, ${terms.basis} ${terms.port}`, en: `Goods, ${terms.basis} ${terms.port}` }, usd: goodsUsd },
    { key: "freight", label: { ru: "Фрахт", en: "Freight" }, usd: freightUsd, note: profile.route.ru },
    { key: "insurance", label: { ru: "Страхование груза 0,3%", en: "Cargo insurance 0.3%" }, usd: insuranceUsd },
    { key: "duty", label: { ru: `Пошлина ${(input.dutyRate * 100).toFixed(0)}%`, en: `Import duty ${(input.dutyRate * 100).toFixed(0)}%` }, usd: dutyUsd },
    { key: "vat", label: { ru: `Импортный НДС ${(profile.vatRate * 100).toFixed(0)}%`, en: `Import VAT ${(profile.vatRate * 100).toFixed(0)}%` }, usd: vatUsd, note: profile.vatNote },
    { key: "customs", label: { ru: "Таможенные сборы и брокер", en: "Customs fees & broker" }, usd: profile.customsFeesUsd + profile.brokerUsd },
    { key: "cert", label: { ru: "Сертификация ЕАЭС (EAC)", en: "EAEU certification (EAC)" }, usd: profile.certificationUsd },
    { key: "commission", label: { ru: `Сопровождение заказа ${(input.agencyCommission * 100).toLocaleString("ru-RU", { maximumFractionDigits: 1 })}%`, en: `Order management ${(input.agencyCommission * 100).toFixed(1)}%` }, usd: commissionUsd },
  ].map((l) => ({ ...l, usd: round(l.usd, 2) }));

  const totalUsd = round(lines.reduce((s, l) => s + l.usd, 0), 2);
  const perUnitUsd = round(totalUsd / quantity, 2);
  // НДС к вычету у плательщика НДС: для сравнения с целевой ценой берём без НДС.
  const perUnitExVat = (totalUsd - vatUsd) / quantity;
  return {
    destination: profile.destination as DestinationCode,
    quantity,
    lines,
    totalUsd,
    perUnitUsd,
    total: toMulti(totalUsd, "USD", rates),
    perUnit: toMulti(perUnitUsd, "USD", rates),
    vsTarget: round(1 - perUnitExVat / input.targetUnitUsd, 4),
  };
}
