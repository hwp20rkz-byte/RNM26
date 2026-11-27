import type { AgentDefinition, DestinationCode, LogisticsProfile, ServiceDefinition } from "@/types/sourcing";

export const SERVICE_CATALOG: readonly ServiceDefinition[] = [
  {
    id: "basic_search",
    name: { ru: "Базовый поиск фабрик", en: "Basic Factory Search" },
    description: {
      ru: "3–5 проверенных производителей, цены, MOQ, сроки, 48 часов",
      en: "3–5 verified manufacturers with prices, MOQ and lead times in 48 h",
    },
    baseUsd: 180,
    operatorHours: 2,
    agents: ["analyst", "hunter"],
  },
  {
    id: "deep_audit",
    name: { ru: "Глубокий аудит и проверка лицензий", en: "Deep Audit & License Check" },
    description: {
      ru: "营业执照, уставный капитал, суды, видео-аудит цеха, экспортная история",
      en: "Business license, registered capital, litigation, video audit, export history",
    },
    baseUsd: 420,
    operatorHours: 5,
    agents: ["hunter"],
  },
  {
    id: "sample_procurement",
    name: { ru: "Закупка и контроль образцов", en: "Sample Procurement" },
    description: {
      ru: "Заказ образца, оплата заводу, проверка, отправка экспресс-почтой",
      en: "Order, pay, inspect and ship the sample by express courier",
    },
    baseUsd: 260,
    operatorHours: 3,
    agents: ["negotiator"],
  },
  {
    id: "oem_negotiation",
    name: { ru: "Переговоры по цене и OEM", en: "OEM Negotiation" },
    description: {
      ru: "Торг по цене, MOQ, срокам, Incoterms, брендированию и гарантии",
      en: "Price, MOQ, lead time, Incoterms, branding and warranty negotiation",
    },
    baseUsd: 380,
    operatorHours: 4,
    agents: ["negotiator"],
  },
  {
    id: "qc_inspection",
    name: { ru: "Предотгрузочная инспекция", en: "Pre-shipment QC Inspection" },
    description: {
      ru: "Инженер на заводе, приёмка по чек-листу, фото и видео, протокол",
      en: "On-site engineer, checklist acceptance, photo/video, report",
    },
    baseUsd: 340,
    operatorHours: 8,
    agents: [],
  },
  {
    id: "logistics_customs",
    name: { ru: "Логистика и таможня", en: "Logistics & Customs Coordination" },
    description: {
      ru: "Ставки фрахта, брокер, сертификация EAC, расчёт до двери. 1,5% от товара",
      en: "Freight rates, broker, EAC certification, door-to-door costing. 1.5% of goods",
    },
    baseUsd: 300,
    operatorHours: 3,
    percentOfGoods: 0.015,
    agents: ["costing"],
  },
] as const;

export const AGENTS: readonly AgentDefinition[] = [
  {
    id: "analyst",
    index: 1,
    name: "TechSpec Analyst",
    role: { ru: "ТЗ, код ТН ВЭД, комплаенс, RFQ на EN и 中文", en: "Specs, HS code, compliance, EN + 中文 RFQ" },
    model: "claude-opus-5-5 · effort high",
    tools: ["hs_lookup", "eaeu_tech_regs", "glossary_zh"],
  },
  {
    id: "hunter",
    index: 2,
    name: "Marketplace Hunter",
    role: { ru: "1688, Alibaba, Made-in-China: поиск, дедупликация, скоринг", en: "1688, Alibaba, Made-in-China: search, dedup, scoring" },
    model: "claude-opus-5-5 · effort low",
    tools: ["1688_open_api", "image_search", "licensed_feed", "license_registry"],
  },
  {
    id: "negotiator",
    index: 3,
    name: "WeChat/WhatsApp Negotiator",
    role: { ru: "Двуязычные переговоры: цена, MOQ, срок, EXW/FOB", en: "Bilingual negotiation: price, MOQ, lead time, EXW/FOB" },
    model: "claude-opus-5-5 · effort high",
    tools: ["wecom_api", "whatsapp_cloud_api", "quote_extractor"],
  },
  {
    id: "costing",
    index: 4,
    name: "Landed Cost Calculator",
    role: { ru: "Фрахт, пошлина, НДС, итог в ₽ ₸ ¥ $", en: "Freight, duty, VAT, total in ₽ ₸ ¥ $" },
    model: "детерминированный расчёт + claude-opus-5-5 для текста КП",
    tools: ["fx_rates", "freight_rates", "tariff_table", "pdf_proposal"],
  },
] as const;

export const LOGISTICS: Record<DestinationCode, LogisticsProfile> = {
  "KZ-ALA": {
    destination: "KZ-ALA",
    label: { ru: "Алматы, Казахстан", en: "Almaty, Kazakhstan" },
    route: { ru: "Ж/д Циндао → Алтынколь → Алматы, 2 × 40'HQ", en: "Rail Qingdao → Altynkol → Almaty, 2 × 40'HQ" },
    containers: 2,
    freightPerContainerUsd: 4600,
    transitDays: 18,
    vatRate: 0.16,
    vatNote: "Ставка НДС РК по НК 2026 — сверить с брокером",
    customsFeesUsd: 180,
    brokerUsd: 450,
    certificationUsd: 1400,
  },
  "RU-MOW": {
    destination: "RU-MOW",
    label: { ru: "Москва, Россия", en: "Moscow, Russia" },
    route: { ru: "Ж/д Циндао → Забайкальск → Ворсино, 2 × 40'HQ", en: "Rail Qingdao → Zabaikalsk → Vorsino, 2 × 40'HQ" },
    containers: 2,
    freightPerContainerUsd: 7900,
    transitDays: 28,
    vatRate: 0.22,
    vatNote: "НДС РФ 22% с 2026 г. — сверить с брокером",
    customsFeesUsd: 380,
    brokerUsd: 600,
    certificationUsd: 1400,
  },
  "RU-EKB": {
    destination: "RU-EKB",
    label: { ru: "Екатеринбург, Россия", en: "Yekaterinburg, Russia" },
    route: { ru: "Ж/д Циндао → Достык → Екатеринбург, 2 × 40'HQ", en: "Rail Qingdao → Dostyk → Yekaterinburg, 2 × 40'HQ" },
    containers: 2,
    freightPerContainerUsd: 6900,
    transitDays: 24,
    vatRate: 0.22,
    vatNote: "НДС РФ 22% с 2026 г. — сверить с брокером",
    customsFeesUsd: 380,
    brokerUsd: 550,
    certificationUsd: 1400,
  },
};
