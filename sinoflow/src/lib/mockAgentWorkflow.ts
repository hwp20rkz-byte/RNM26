/**
 * Симуляция исполнения 4 агентов, повторяющая форму LangGraph-графа из backend_blueprint:
 * analyst → hunter → negotiator (с прерыванием на подтверждение человека) → costing.
 *
 * Данные — реалистичный демо-кейс: 3 вертикальных обрабатывающих центра VMC-850
 * для клиента в Алматы. Названия заводов вымышлены; цены и термины соответствуют рынку,
 * но являются демо-данными.
 */
import { LOGISTICS } from "@/lib/catalog";
import { computeLandedCost, convert, round } from "@/lib/currencyEngine";
import type {
  AgentId,
  AgentLogEntry,
  AgentRuntime,
  ChatMessage,
  DestinationCode,
  MarketplaceScanStat,
  NegotiatedTerms,
  OrderRequest,
  RatesPerUsd,
  SpecAnalysis,
  SupplierCandidate,
  SupplierQuote,
  WorkflowEvent,
  WorkflowState,
} from "@/types/sourcing";

// ───────────────────────────── Часы демо: пауза, ускорение, мгновенный режим ─────────────────────────────

export class AbortedError extends Error {
  constructor() {
    super("aborted");
    this.name = "AbortedError";
  }
}

export class DemoClock {
  private paused = false;
  private listeners = new Set<() => void>();
  speed = 1;
  instant = false;

  isPaused() {
    return this.paused;
  }
  pause() {
    this.paused = true;
  }
  resume() {
    this.paused = false;
    this.listeners.forEach((l) => l());
  }

  /** Сон, который учитывает паузу, скорость и отмену. */
  sleep(ms: number, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) return Promise.reject(new AbortedError());
    if (this.instant || ms <= 0) return Promise.resolve();
    return new Promise((resolve, reject) => {
      let remaining = ms / this.speed;
      let last = performance.now();
      const tick = () => {
        if (signal?.aborted) {
          clearInterval(timer);
          reject(new AbortedError());
          return;
        }
        const now = performance.now();
        if (!this.paused) remaining -= now - last;
        last = now;
        if (remaining <= 0) {
          clearInterval(timer);
          resolve();
        }
      };
      const timer = setInterval(tick, 40);
    });
  }
}

// ───────────────────────────── Демо-кейс ─────────────────────────────

export const DEMO_ORDER: OrderRequest = {
  id: "SF-2611-118",
  createdAt: "2026-11-27T09:14:00+05:00",
  client: { company: "ТОО «АлматыМашСервис»", contact: "Ержан Сапаров, главный инженер", country: "KZ" },
  title: "Вертикальный обрабатывающий центр с ЧПУ VMC-850",
  rawText:
    "Нужны 3 вертикально-фрезерных обрабатывающих центра класса VMC850 под FANUC. Ходы примерно 800/500/550, " +
    "шпиндель BT40 от 8000 об/мин, магазин на 24 инструмента, точность позиционирования не хуже 0,005. " +
    "Конвейер стружки обязательно, подготовка под 4-ю ось. Доставка в Алматы, нужен до апреля. Цель — до $32 000 за станок.",
  quantity: 3,
  unit: "шт",
  targetPrice: { amount: 32000, currency: "USD" },
  destination: "KZ-ALA",
  incoterm: "FOB",
  urgency: "standard",
  category: "machinery",
  services: ["basic_search", "deep_audit", "oem_negotiation", "logistics_customs"],
};

export const DEMO_ANALYSIS: SpecAnalysis = {
  specs: [
    { key: "travel", label: { ru: "Ходы X/Y/Z", en: "Travel X/Y/Z", zh: "行程 X/Y/Z" }, value: "800 / 500 / 550 мм", confidence: 0.96, source: "client_text" },
    { key: "table", label: { ru: "Стол, нагрузка", en: "Table, max load", zh: "工作台、承重" }, value: "1000 × 500 мм, 500 кг", confidence: 0.81, source: "standard" },
    { key: "spindle", label: { ru: "Шпиндель", en: "Spindle", zh: "主轴" }, value: "BT40, 8000 об/мин, 11 кВт", confidence: 0.92, source: "client_text" },
    { key: "atc", label: { ru: "Магазин инструмента", en: "Tool changer", zh: "刀库" }, value: "24 позиции, с манипулятором", confidence: 0.9, source: "client_text" },
    { key: "cnc", label: { ru: "Система ЧПУ", en: "CNC controller", zh: "数控系统" }, value: "FANUC 0i-MF Plus", confidence: 0.94, source: "client_text" },
    { key: "accuracy", label: { ru: "Точность / повторяемость", en: "Positioning / repeatability", zh: "定位精度 / 重复定位精度" }, value: "±0,005 / ±0,003 мм", confidence: 0.88, source: "client_text" },
    { key: "power", label: { ru: "Питание", en: "Power supply", zh: "电源" }, value: "380 В, 50 Гц, 3 фазы", confidence: 0.99, source: "standard" },
    { key: "options", label: { ru: "Опции", en: "Options", zh: "配置" }, value: "Конвейер стружки, СОЖ, подготовка 4-й оси", confidence: 0.93, source: "client_text" },
  ],
  hs: {
    code: "8457 10 900 0",
    description: {
      ru: "Центры обрабатывающие для обработки металла, прочие (не горизонтальные)",
      en: "Machining centres for working metal, other than horizontal",
    },
    confidence: 0.84,
    dutyRate: 0,
    notes: "Ставку ЕТТ ЕАЭС и льготы подтвердить у брокера перед КП",
  },
  compliance: [
    {
      id: "eac",
      severity: "warn",
      text: {
        ru: "Нужна декларация/сертификат EAC: ТР ТС 010/2011 (машины), 004/2011 (низковольтное), 020/2011 (ЭМС)",
        en: "EAC conformity required: TR CU 010/2011 (machinery), 004/2011 (low voltage), 020/2011 (EMC)",
      },
    },
    {
      id: "fanuc",
      severity: "warn",
      text: {
        ru: "FANUC — японская ЧПУ: для поставок в РФ возможны ограничения реэкспорта. Для РФ запросить вариант KND / GSK / Syntec",
        en: "FANUC is a Japanese CNC: re-export to Russia may be restricted. For RU, request a KND / GSK / Syntec option",
      },
    },
    {
      id: "export-control",
      severity: "info",
      text: {
        ru: "3-осевой центр с точностью ±5 мкм, вероятно, ниже порогов экспортного контроля станков. Подтвердить у завода",
        en: "3-axis centre at ±5 µm is likely below machine-tool export-control thresholds. Confirm with the factory",
      },
    },
  ],
  clarifyingQuestions: [
    { ru: "4-я ось: нужен поворотный стол сразу или только подготовка (кабели, M-коды)?", en: "4th axis: rotary table now or prep only (cabling, M-codes)?" },
    { ru: "Нужна подача СОЖ через шпиндель (CTS, 20 бар)?", en: "Coolant through spindle (CTS, 20 bar) required?" },
    { ru: "Пусконаладка: удалённо или выезд инженера завода в Алматы?", en: "Commissioning: remote or factory engineer on site in Almaty?" },
  ],
  rfq: {
    subject: {
      en: "RFQ — Vertical Machining Center VMC850 × 3 sets (FANUC), export to Kazakhstan",
      zh: "询价 — 立式加工中心 VMC850 × 3 台（发那科系统），出口哈萨克斯坦",
    },
    en: [
      "Dear Sales Manager,",
      "",
      "We are SinoFlow, a sourcing agency acting for an end user in Almaty, Kazakhstan.",
      "",
      "Product: Vertical Machining Center VMC850 — Qty: 3 sets",
      "1) Travel X/Y/Z: 800/500/550 mm",
      "2) Table 1000×500 mm, max load 500 kg",
      "3) Spindle BT40, 8000 rpm, 11 kW",
      "4) 24-tool arm-type ATC",
      "5) Controller: FANUC 0i-MF Plus",
      "6) Positioning ±0.005 mm, repeatability ±0.003 mm",
      "7) 380 V / 50 Hz / 3-phase",
      "8) Chip conveyor, coolant system, 4th-axis ready",
      "",
      "Please quote:",
      "• EXW and FOB Qingdao price, export price excluding VAT",
      "• MOQ and lead time",
      "• Payment terms",
      "• Warranty and commissioning (remote / on-site)",
      "• Experience exporting to RU/KZ and support for EAC certification",
      "• Packing, gross weight and dimensions per set",
      "",
      "Kindly reply within 48 hours. Thank you!",
    ].join("\n"),
    zh: [
      "王经理您好，",
      "",
      "我们是 SinoFlow 采购代理，代表哈萨克斯坦阿拉木图的终端客户询价。",
      "",
      "产品：立式加工中心 VMC850，数量：3 台",
      "1）行程 X/Y/Z：800/500/550 mm",
      "2）工作台 1000×500 mm，承重 500 kg",
      "3）主轴 BT40，8000 rpm，11 kW",
      "4）24 把机械手刀库",
      "5）数控系统：FANUC 0i-MF Plus",
      "6）定位精度 ±0.005 mm，重复定位精度 ±0.003 mm",
      "7）电源 380V / 50Hz / 三相",
      "8）排屑器、冷却系统、第四轴预留",
      "",
      "请报价：",
      "• 出厂价（EXW）及青岛港 FOB 价（出口不含税）",
      "• 最小起订量与交货期",
      "• 付款方式",
      "• 保修期及调试（远程 / 上门）",
      "• 是否有出口俄罗斯、哈萨克斯坦经验，能否配合 EAC 认证",
      "• 包装方式、单台毛重及外形尺寸",
      "",
      "请在 48 小时内回复，谢谢！",
    ].join("\n"),
  },
};

export const DEMO_SCAN: MarketplaceScanStat[] = [
  { marketplace: "1688", method: { ru: "1688 Open Platform API + поиск по фото 拍立淘", en: "1688 Open Platform API + image search" }, found: 412, afterDedup: 38 },
  { marketplace: "alibaba", method: { ru: "Лицензированный фид данных", en: "Licensed data feed" }, found: 186, afterDedup: 21 },
  { marketplace: "made-in-china", method: { ru: "Фид + Sourcing Request (до 20 котировок)", en: "Feed + Sourcing Request (up to 20 quotes)" }, found: 97, afterDedup: 12 },
];

const v = (p: Partial<SupplierCandidate["verification"]>): SupplierCandidate["verification"] => ({
  businessLicense: true,
  registeredCapitalCny: 10_000_000,
  yearsInBusiness: 5,
  videoAudit: false,
  tradeAssurance: false,
  eacExperience: false,
  exportShare: 0.2,
  iso9001: false,
  ...p,
});

export const DEMO_SUPPLIERS: SupplierCandidate[] = [
  {
    id: "ruiheng", nameZh: "滕州瑞恒数控机床有限公司", nameEn: "Tengzhou Ruiheng CNC Machine Tool Co., Ltd.", city: "Тэнчжоу", province: "Шаньдун",
    marketplaces: ["1688", "alibaba"], type: "manufacturer", controller: "FANUC 0i-MF Plus",
    verification: v({ registeredCapitalCny: 30_000_000, yearsInBusiness: 15, factoryAreaM2: 32_000, staff: 260, videoAudit: true, tradeAssurance: true, eacExperience: true, exportShare: 0.35, iso9001: true }),
    listing: { title: "VMC850 立式加工中心 发那科系统 三轴硬轨", priceMinCny: 205_000, priceMaxCny: 228_000, moq: 1, url: "1688.com/offer/demo-ruiheng-vmc850" },
    score: 93,
  },
  {
    id: "hanwei", nameZh: "苏州汉威智能装备有限公司", nameEn: "Suzhou Hanwei Intelligent Equipment Co., Ltd.", city: "Сучжоу", province: "Цзянсу",
    marketplaces: ["alibaba", "made-in-china"], type: "manufacturer", controller: "Siemens 828D / FANUC",
    verification: v({ registeredCapitalCny: 50_000_000, yearsInBusiness: 11, factoryAreaM2: 45_000, staff: 380, videoAudit: true, tradeAssurance: true, eacExperience: true, exportShare: 0.42, iso9001: true }),
    listing: { title: "VMC850 Vertical Machining Center Siemens 828D", priceMinCny: 232_000, priceMaxCny: 255_000, moq: 1, url: "alibaba.com/product/demo-hanwei-vmc850" },
    score: 89,
  },
  {
    id: "kerui", nameZh: "大连科瑞德数控设备有限公司", nameEn: "Dalian Keruide CNC Equipment Co., Ltd.", city: "Далянь", province: "Ляонин",
    marketplaces: ["1688"], type: "manufacturer", controller: "FANUC 0i-MF Plus",
    verification: v({ registeredCapitalCny: 80_000_000, yearsInBusiness: 22, factoryAreaM2: 60_000, staff: 520, videoAudit: true, exportShare: 0.18, iso9001: true }),
    listing: { title: "VMC850 高刚性立加 发那科 直联主轴", priceMinCny: 258_000, priceMaxCny: 279_000, moq: 1, url: "1688.com/offer/demo-kerui-vmc850" },
    score: 84,
  },
  {
    id: "maituo", nameZh: "宁波迈拓精机有限公司", nameEn: "Ningbo Maituo Precision Machinery Co., Ltd.", city: "Нинбо", province: "Чжэцзян",
    marketplaces: ["alibaba"], type: "manufacturer", controller: "Syntec 22MA",
    verification: v({ registeredCapitalCny: 20_000_000, yearsInBusiness: 9, factoryAreaM2: 18_000, staff: 150, tradeAssurance: true, exportShare: 0.3, iso9001: true }),
    listing: { title: "VMC850 CNC Milling Center Syntec Controller", priceMinCny: 176_000, priceMaxCny: 189_000, moq: 1, url: "alibaba.com/product/demo-maituo-vmc850" },
    score: 78,
  },
  {
    id: "yonggu", nameZh: "台州永固机床厂", nameEn: "Taizhou Yonggu Machine Tool Works", city: "Тайчжоу", province: "Чжэцзян",
    marketplaces: ["made-in-china"], type: "manufacturer", controller: "KND K2000MC",
    verification: v({ registeredCapitalCny: 5_000_000, yearsInBusiness: 13, factoryAreaM2: 7_500, staff: 70, exportShare: 0.22 }),
    listing: { title: "VMC850 Machining Center KND System Box Way", priceMinCny: 164_000, priceMaxCny: 171_000, moq: 1, url: "made-in-china.com/demo-yonggu-vmc850" },
    score: 71,
  },
  {
    id: "ruike", nameZh: "东莞锐科精密机械有限公司", nameEn: "Dongguan Ruike Precision Machinery Co., Ltd.", city: "Дунгуань", province: "Гуандун",
    marketplaces: ["1688", "made-in-china"], type: "manufacturer", controller: "GSK 25i",
    verification: v({ registeredCapitalCny: 10_000_000, yearsInBusiness: 6, factoryAreaM2: 9_000, staff: 85, exportShare: 0.12 }),
    listing: { title: "VMC850 加工中心 广数系统 线轨", priceMinCny: 149_000, priceMaxCny: 162_000, moq: 1, url: "1688.com/offer/demo-ruike-vmc850" },
    score: 66,
  },
  {
    id: "zhongcheng", nameZh: "济南众诚机械贸易有限公司", nameEn: "Jinan Zhongcheng Machinery Trading Co., Ltd.", city: "Цзинань", province: "Шаньдун",
    marketplaces: ["alibaba"], type: "trading_company", controller: "FANUC 0i-MF Plus",
    verification: v({ registeredCapitalCny: 2_000_000, yearsInBusiness: 4, exportShare: 0.6 }),
    listing: { title: "High Precision VMC850 CNC Machine FANUC", priceMinCny: 219_000, priceMaxCny: 240_000, moq: 1, url: "alibaba.com/product/demo-zhongcheng-vmc850" },
    score: 41,
    filteredOut: {
      reason: {
        ru: "Торговая компания: по фото это станок Ruiheng с наценкой около 7%",
        en: "Trading company: photos match the Ruiheng machine with ~7% markup",
      },
    },
  },
  {
    id: "dingsheng", nameZh: "广州鼎晟进出口有限公司", nameEn: "Guangzhou Dingsheng Import & Export Co., Ltd.", city: "Гуанчжоу", province: "Гуандун",
    marketplaces: ["1688", "alibaba"], type: "trading_company", controller: "FANUC / GSK",
    verification: v({ registeredCapitalCny: 1_000_000, yearsInBusiness: 3, exportShare: 0.8 }),
    listing: { title: "CNC 加工中心 批发 出口", priceMinCny: 199_000, priceMaxCny: 236_000, moq: 1, url: "1688.com/offer/demo-dingsheng-vmc" },
    score: 34,
    filteredOut: {
      reason: {
        ru: "В лицензии 经营范围 только 销售 (торговля), производственной площадки нет",
        en: "Business scope 经营范围 lists 销售 (sales) only, no production site",
      },
    },
  },
];

const T = (p: Omit<NegotiatedTerms, "includesVat" | "warrantyMonths"> & Partial<NegotiatedTerms>): NegotiatedTerms => ({
  includesVat: false,
  warrantyMonths: 12,
  ...p,
});

export const DEMO_QUOTES: SupplierQuote[] = [
  {
    supplierId: "ruiheng",
    initial: T({ supplierId: "ruiheng", unitPriceCny: 228_000, basis: "EXW", port: "Тэнчжоу", moq: 1, leadTimeDays: 45, paymentTerms: "30% аванс / 70% до отгрузки", includesVat: true }),
    final: T({ supplierId: "ruiheng", unitPriceCny: 200_500, basis: "FOB", port: "Циндао", moq: 1, leadTimeDays: 40, paymentTerms: "30% аванс / 70% против копии B/L" }),
    status: "agreed",
  },
  {
    supplierId: "hanwei",
    initial: T({ supplierId: "hanwei", unitPriceCny: round(34_800 * 7.12, 0), basis: "FOB", port: "Шанхай", moq: 1, leadTimeDays: 50, paymentTerms: "T/T 30/70", warrantyMonths: 24 }),
    final: T({ supplierId: "hanwei", unitPriceCny: round(33_200 * 7.12, 0), basis: "FOB", port: "Шанхай", moq: 1, leadTimeDays: 45, paymentTerms: "T/T 30/70", warrantyMonths: 24 }),
    status: "negotiating",
  },
  {
    supplierId: "kerui",
    initial: T({ supplierId: "kerui", unitPriceCny: 262_000, basis: "EXW", port: "Далянь", moq: 1, leadTimeDays: 60, paymentTerms: "50% аванс / 50% до отгрузки" }),
    status: "quoted",
  },
  {
    supplierId: "maituo",
    initial: T({ supplierId: "maituo", unitPriceCny: 181_000, basis: "EXW", port: "Нинбо", moq: 1, leadTimeDays: 35, paymentTerms: "30/70", warrantyMonths: 12 }),
    status: "quoted",
  },
];

const OP = "SinoFlow · 刘伟 (оператор)";
const AGENT = "SinoFlow AI";

export const DEMO_MESSAGES: ChatMessage[] = [
  {
    id: "w1", channel: "wechat", supplierId: "ruiheng", from: "agent", author: AGENT, at: "11:02",
    original: { lang: "zh", text: "王经理您好！附件是 VMC850 询价单：3 台，FANUC 0i-MF Plus，目的地阿拉木图。请提供出口不含税价、交期和付款方式。" },
    translations: { ru: "Здравствуйте, менеджер Ван! Во вложении RFQ на VMC850: 3 шт, FANUC 0i-MF Plus, назначение Алматы. Прошу экспортную цену без НДС, срок и условия оплаты.", en: "Hello Manager Wang! Attached is the VMC850 RFQ: 3 sets, FANUC 0i-MF Plus, destination Almaty. Please send the export price ex-VAT, lead time and payment terms." },
  },
  {
    id: "w2", channel: "wechat", supplierId: "ruiheng", from: "factory", author: "王丽 · 外贸经理 Ruiheng", at: "11:19",
    original: { lang: "zh", text: "您好！VMC850 发那科 0i-MF Plus 配置，单台出厂价 228,000 元（含 13% 增值税）。交期 45 天。付款：30% 定金，70% 发货前付清。保修一年。" },
    translations: { ru: "Здравствуйте! VMC850 с FANUC 0i-MF Plus — 228 000 юаней за станок EXW (с НДС 13%). Срок 45 дней. Оплата: 30% аванс, 70% до отгрузки. Гарантия 1 год.", en: "Hello! VMC850 with FANUC 0i-MF Plus: CNY 228,000 per set EXW (incl. 13% VAT). Lead time 45 days. Payment: 30% deposit, 70% before shipment. 1-year warranty." },
    extracted: { unitPriceCny: 228_000, basis: "EXW", leadTimeDays: 45, includesVat: true },
  },
  {
    id: "w3", channel: "wechat", supplierId: "ruiheng", from: "agent", author: AGENT, at: "11:21",
    original: { lang: "zh", text: "谢谢！我们是出口，请报不含税价格，并报青岛港 FOB 价。3 台一起下单，能否给个更好的价格？" },
    translations: { ru: "Спасибо! Это экспорт: прошу цену без НДС и FOB Циндао. Заказываем 3 станка сразу — можете дать лучшую цену?", en: "Thanks! This is an export order: please quote ex-VAT and FOB Qingdao. We order 3 sets together — can you improve the price?" },
  },
  {
    id: "w4", channel: "wechat", supplierId: "ruiheng", from: "factory", author: "王丽 · 外贸经理 Ruiheng", at: "11:34",
    original: { lang: "zh", text: "出口不含税价 202,000 元/台（EXW）。青岛 FOB 每台加 2,800 元（内陆运输 + 报关）。" },
    translations: { ru: "Экспортная цена без НДС — 202 000 юаней/шт EXW. FOB Циндао — плюс 2 800 юаней за станок (доставка до порта и экспортное оформление).", en: "Export price ex-VAT: CNY 202,000/set EXW. FOB Qingdao adds CNY 2,800 per set (inland haulage + export clearance)." },
    extracted: { unitPriceCny: 204_800, basis: "FOB", port: "Циндао", includesVat: false },
  },
  {
    id: "w5", channel: "wechat", supplierId: "ruiheng", from: "agent", author: `${AGENT} → ${OP}`, at: "11:36", draft: true,
    original: { lang: "zh", text: "王经理，3 台 FOB 青岛，我们的目标价是 198,000 元/台，含出口木箱包装。交期能否压缩到 35 天？付款可以 30% 定金、70% 见提单副本。" },
    translations: { ru: "Менеджер Ван, 3 станка FOB Циндао: наша цель — 198 000 юаней/шт с экспортной деревянной упаковкой. Можно сократить срок до 35 дней? Оплата: 30% аванс, 70% против копии коносамента.", en: "Manager Wang, 3 sets FOB Qingdao: our target is CNY 198,000/set incl. export wooden crates. Can lead time be cut to 35 days? Payment: 30% deposit, 70% against B/L copy." },
  },
  {
    id: "w6", channel: "wechat", supplierId: "ruiheng", from: "factory", author: "王丽 · 外贸经理 Ruiheng", at: "11:52",
    original: { lang: "zh", text: "目标价有点低。FOB 青岛 200,500 元/台，含木箱包装，交期 40 天。70% 见提单副本可以接受。另外每台送一套 BT40 刀柄（24 支）。" },
    translations: { ru: "Цель низковата. FOB Циндао — 200 500 юаней/шт с деревянной упаковкой, срок 40 дней. 70% против копии коносамента — согласны. Плюс к каждому станку комплект оправок BT40 (24 шт) в подарок.", en: "Target is a bit low. FOB Qingdao CNY 200,500/set incl. wooden crate, 40 days. 70% against B/L copy is acceptable. Plus a free BT40 tool-holder set (24 pcs) per machine." },
    extracted: { unitPriceCny: 200_500, basis: "FOB", port: "Циндао", leadTimeDays: 40, paymentTerms: "30% аванс / 70% против копии B/L" },
  },
  {
    id: "w7", channel: "wechat", supplierId: "ruiheng", from: "agent", author: AGENT, at: "11:55",
    original: { lang: "zh", text: "成交！请发形式发票（PI）。另请提供 EAC 认证所需的电气图和 CE 证书，说明书俄文版由我们翻译。" },
    translations: { ru: "Договорились! Пришлите проформу (PI). Также нужны электросхемы и сертификат CE для EAC; руководство на русский переведём сами.", en: "Deal! Please send the proforma invoice (PI). Also send electrical drawings and the CE certificate for EAC; we will translate the manual into Russian." },
  },
  {
    id: "a1", channel: "whatsapp", supplierId: "hanwei", from: "agent", author: AGENT, at: "11:05",
    original: { lang: "en", text: "Hi Kevin, RFQ attached: VMC850 × 3 sets for Almaty, FANUC 0i-MF Plus preferred. Please quote FOB price, lead time and payment terms." },
    translations: { ru: "Привет, Кевин! RFQ во вложении: VMC850 × 3 для Алматы, предпочтительно FANUC 0i-MF Plus. Прошу цену FOB, срок и условия оплаты.", zh: "Kevin 您好，附上询价单：VMC850 × 3 台，目的地阿拉木图，优先发那科 0i-MF Plus。请报 FOB 价、交期和付款方式。" },
  },
  {
    id: "a2", channel: "whatsapp", supplierId: "hanwei", from: "factory", author: "Kevin Zhang · Sales Manager Hanwei", at: "11:31",
    original: { lang: "en", text: "Hi! VMC850 with Siemens 828D: USD 34,800/set FOB Shanghai. FANUC option +USD 2,600. Lead time 50 days, T/T 30/70. 2-year warranty, Taiwan Royal spindle." },
    translations: { ru: "Здравствуйте! VMC850 с Siemens 828D: $34 800/шт FOB Шанхай. Вариант FANUC +$2 600. Срок 50 дней, T/T 30/70. Гарантия 2 года, шпиндель Royal (Тайвань).", zh: "您好！VMC850 西门子 828D：FOB 上海 34,800 美元/台。发那科选配加 2,600 美元。交期 50 天，T/T 30/70。保修两年，台湾 Royal 主轴。" },
    extracted: { unitPriceCny: round(34_800 * 7.12, 0), basis: "FOB", port: "Шанхай", leadTimeDays: 50 },
  },
  {
    id: "a3", channel: "whatsapp", supplierId: "hanwei", from: "agent", author: AGENT, at: "11:58",
    original: { lang: "en", text: "Thanks Kevin. We have a competing FOB offer below USD 29,000 with FANUC. Can you get closer for 3 sets?" },
    translations: { ru: "Спасибо, Кевин. У нас есть конкурирующее предложение FOB ниже $29 000 с FANUC. Сможете приблизиться для 3 станков?", zh: "谢谢 Kevin。我们有一个发那科配置、FOB 低于 29,000 美元的竞争报价。3 台能否再接近一些？" },
  },
  {
    id: "a4", channel: "whatsapp", supplierId: "hanwei", from: "factory", author: "Kevin Zhang · Sales Manager Hanwei", at: "12:10",
    original: { lang: "en", text: "Best we can do: USD 33,200/set FOB Shanghai with Siemens 828D, 45 days. Warranty stays 2 years." },
    translations: { ru: "Лучшее, что можем: $33 200/шт FOB Шанхай с Siemens 828D, 45 дней. Гарантия остаётся 2 года.", zh: "我们最低：FOB 上海 33,200 美元/台，西门子 828D，45 天。保修仍为两年。" },
    extracted: { unitPriceCny: round(33_200 * 7.12, 0), leadTimeDays: 45 },
  },
];

DEMO_MESSAGES.sort((a, b) => a.at.localeCompare(b.at));

/** Оценка токенов на агента в демо-кейсе (для журнала себестоимости). Цены Claude Opus 5.5: $4 / $20 за 1M. */
export const DEMO_USAGE: Record<AgentId, { tokensIn: number; tokensOut: number }> = {
  analyst: { tokensIn: 18_400, tokensOut: 3_900 },
  hunter: { tokensIn: 142_000, tokensOut: 8_100 },
  negotiator: { tokensIn: 46_000, tokensOut: 6_200 },
  costing: { tokensIn: 6_100, tokensOut: 2_400 },
};
export const llmCostUsd = (u: { tokensIn: number; tokensOut: number }) => round((u.tokensIn * 4 + u.tokensOut * 20) / 1_000_000, 3);

// ───────────────────────────── Состояние ─────────────────────────────

const idleAgent = (): AgentRuntime => ({ status: "idle", progress: 0, tokensIn: 0, tokensOut: 0, costUsd: 0 });

export function initialWorkflowState(order: OrderRequest | null = null): WorkflowState {
  return {
    order,
    stage: order ? "intake" : "draft",
    agents: { analyst: idleAgent(), hunter: idleAgent(), negotiator: idleAgent(), costing: idleAgent() },
    log: [],
    analysis: null,
    scan: [],
    suppliers: [],
    quotes: [],
    messages: [],
    pendingApproval: null,
    landed: {},
    selectedSupplierId: null,
  };
}

export function reduceWorkflow(state: WorkflowState, e: WorkflowEvent): WorkflowState {
  switch (e.type) {
    case "stage":
      return { ...state, stage: e.stage };
    case "agent":
      return { ...state, agents: { ...state.agents, [e.agent]: { ...state.agents[e.agent], ...e.patch } } };
    case "log":
      return { ...state, log: [...state.log, e.entry].slice(-80) };
    case "analysis":
      return { ...state, analysis: e.analysis };
    case "scan":
      return { ...state, scan: [...state.scan.filter((s) => s.marketplace !== e.stat.marketplace), e.stat] };
    case "supplier":
      return { ...state, suppliers: [...state.suppliers.filter((s) => s.id !== e.supplier.id), e.supplier] };
    case "quote":
      return { ...state, quotes: [...state.quotes.filter((q) => q.supplierId !== e.quote.supplierId), e.quote] };
    case "message":
      return { ...state, messages: [...state.messages.filter((m) => m.id !== e.message.id), e.message] };
    case "approval":
      return { ...state, pendingApproval: e.message };
    case "landed":
      return { ...state, landed: { ...state.landed, [e.result.destination]: e.result } };
    case "select":
      return { ...state, selectedSupplierId: e.supplierId };
  }
}

// ───────────────────────────── Исполнение стадий ─────────────────────────────

export type RunnableStage = "analyst" | "hunter" | "negotiator" | "costing";
export const STAGE_ORDER: RunnableStage[] = ["analyst", "hunter", "negotiator", "costing"];

export interface StageContext {
  order: OrderRequest;
  clock: DemoClock;
  signal: AbortSignal;
  emit: (e: WorkflowEvent) => void;
  rates: RatesPerUsd;
  /** Ждёт подтверждения черновика оператором (human-in-the-loop). */
  awaitApproval: (draft: ChatMessage) => Promise<void>;
}

let logSeq = 0;
function log(ctx: StageContext, agent: AgentLogEntry["agent"], level: AgentLogEntry["level"], text: string) {
  ctx.emit({ type: "log", entry: { id: `l${++logSeq}`, at: Date.now(), agent, level, text } });
}

async function progress(ctx: StageContext, agent: AgentId, steps: number, ms: number) {
  for (let i = 1; i <= steps; i++) {
    await ctx.clock.sleep(ms / steps, ctx.signal);
    ctx.emit({ type: "agent", agent, patch: { progress: i / steps } });
  }
}

function startAgent(ctx: StageContext, agent: AgentId, message: string) {
  ctx.emit({ type: "agent", agent, patch: { status: "running", progress: 0, startedAt: Date.now(), lastMessage: message } });
}
function finishAgent(ctx: StageContext, agent: AgentId, message: string) {
  const u = DEMO_USAGE[agent];
  ctx.emit({ type: "agent", agent, patch: { status: "done", progress: 1, finishedAt: Date.now(), lastMessage: message, ...u, costUsd: llmCostUsd(u) } });
}

async function runAnalyst(ctx: StageContext) {
  ctx.emit({ type: "stage", stage: "analyst" });
  startAgent(ctx, "analyst", "Разбираю текст заявки");
  log(ctx, "analyst", "info", "Получена заявка: свободный текст, 412 символов, RU");
  await progress(ctx, "analyst", 3, 1500);
  log(ctx, "analyst", "tool", "hs_lookup(\"вертикальный обрабатывающий центр\") → 8457 10, уверенность 0,84");
  await progress(ctx, "analyst", 2, 900);
  log(ctx, "analyst", "warn", "Комплаенс: EAC по ТР ТС 010/004/020; FANUC и реэкспорт в РФ");
  ctx.emit({ type: "analysis", analysis: { ...DEMO_ANALYSIS, rfq: { ...DEMO_ANALYSIS.rfq } } });
  await ctx.clock.sleep(700, ctx.signal);
  log(ctx, "analyst", "result", "RFQ сгенерирован: EN + 简体中文, 8 параметров, 6 вопросов к заводу");
  finishAgent(ctx, "analyst", "ТЗ, код ТН ВЭД и RFQ готовы");
}

async function runHunter(ctx: StageContext) {
  ctx.emit({ type: "stage", stage: "hunter" });
  startAgent(ctx, "hunter", "Ищу на 1688, Alibaba, Made-in-China");
  for (const stat of DEMO_SCAN) {
    log(ctx, "hunter", "tool", `${stat.marketplace}: ${stat.method.ru}`);
    await progress(ctx, "hunter", 2, 900);
    ctx.emit({ type: "scan", stat });
    log(ctx, "hunter", "info", `${stat.marketplace}: найдено ${stat.found}, после дедупликации ${stat.afterDedup}`);
  }
  log(ctx, "hunter", "tool", "license_registry: проверка 营业执照 и 经营范围 у 71 продавца");
  for (const s of DEMO_SUPPLIERS) {
    await ctx.clock.sleep(380, ctx.signal);
    ctx.emit({ type: "supplier", supplier: s });
    if (s.filteredOut) log(ctx, "hunter", "warn", `Отсеян: ${s.nameEn} — ${s.filteredOut.reason.ru}`);
  }
  ctx.emit({ type: "agent", agent: "hunter", patch: { progress: 1 } });
  log(ctx, "hunter", "result", "Шорт-лист: 6 производителей, 2 торговые компании отсеяны");
  finishAgent(ctx, "hunter", "6 производителей в шорт-листе");
}

async function runNegotiator(ctx: StageContext) {
  ctx.emit({ type: "stage", stage: "negotiator" });
  startAgent(ctx, "negotiator", "Отправляю RFQ в WeCom и WhatsApp");
  log(ctx, "negotiator", "tool", "wecom_api.send → Ruiheng; whatsapp_cloud_api.send → Hanwei; email → Keruide, Maituo");
  const total = DEMO_MESSAGES.length;
  let i = 0;
  for (const m of DEMO_MESSAGES) {
    i++;
    await ctx.clock.sleep(m.from === "factory" ? 1800 : 1100, ctx.signal);
    if (m.draft) {
      ctx.emit({ type: "agent", agent: "negotiator", patch: { status: "waiting_human", lastMessage: "Черновик торга ждёт подтверждения оператора" } });
      ctx.emit({ type: "approval", message: m });
      log(ctx, "negotiator", "human", "Черновик контрпредложения: 198 000 ¥ FOB, 35 дней, 70% против B/L — нужен оператор");
      await ctx.awaitApproval(m);
      ctx.emit({ type: "approval", message: null });
      log(ctx, "operator", "human", "Оператор одобрил и отправил контрпредложение");
      ctx.emit({ type: "agent", agent: "negotiator", patch: { status: "running", lastMessage: "Жду ответ завода" } });
      ctx.emit({ type: "message", message: { ...m, draft: false } });
    } else {
      ctx.emit({ type: "message", message: m });
    }
    if (m.extracted) {
      log(ctx, "negotiator", "result", `Извлечено из ${m.channel === "wechat" ? "WeChat" : "WhatsApp"}: ${describeTerms(m.extracted)}`);
    }
    if (m.id === "w2") ctx.emit({ type: "quote", quote: { ...DEMO_QUOTES[0]!, final: undefined, status: "negotiating" } });
    if (m.id === "a2") ctx.emit({ type: "quote", quote: { ...DEMO_QUOTES[1]!, final: undefined, status: "quoted" } });
    ctx.emit({ type: "agent", agent: "negotiator", patch: { progress: i / total } });
  }
  for (const q of DEMO_QUOTES) ctx.emit({ type: "quote", quote: q });
  ctx.emit({ type: "select", supplierId: "ruiheng" });
  log(ctx, "negotiator", "result", "Ruiheng: 200 500 ¥ FOB Циндао, 40 дней, 30/70 против B/L. Цена снижена на 12,1% от первой");
  finishAgent(ctx, "negotiator", "Лучшее условие: Ruiheng, −12,1%");
}

async function runCosting(ctx: StageContext) {
  ctx.emit({ type: "stage", stage: "costing" });
  startAgent(ctx, "costing", "Считаю стоимость до двери");
  const quote = DEMO_QUOTES[0]!;
  const terms = quote.final ?? quote.initial;
  const targetUnitUsd = convert(ctx.order.targetPrice.amount, ctx.order.targetPrice.currency, "USD", ctx.rates);
  const dests: DestinationCode[] = [ctx.order.destination, ...(["KZ-ALA", "RU-MOW", "RU-EKB"] as const).filter((d) => d !== ctx.order.destination)];
  log(ctx, "costing", "tool", "fx_rates: USD/RUB, USD/KZT, USD/CNY; freight_rates: ж/д Циндао → ЕАЭС");
  for (const d of dests) {
    await progress(ctx, "costing", 2, 800);
    const result = computeLandedCost({ terms, quantity: ctx.order.quantity, profile: LOGISTICS[d], dutyRate: DEMO_ANALYSIS.hs.dutyRate, agencyCommission: 0.03, rates: ctx.rates, targetUnitUsd });
    ctx.emit({ type: "landed", result });
    log(ctx, "costing", "result", `${LOGISTICS[d].label.ru}: $${Math.round(result.perUnitUsd).toLocaleString("ru-RU")} за станок до двери`);
  }
  log(ctx, "costing", "result", "КП сформировано: PDF на русском, суммы в ₸ ₽ ¥ $");
  finishAgent(ctx, "costing", "КП готово в 4 валютах");
  ctx.emit({ type: "stage", stage: "proposal_ready" });
}

function describeTerms(t: Partial<NegotiatedTerms>): string {
  const parts: string[] = [];
  if (t.unitPriceCny) parts.push(`цена ${t.unitPriceCny.toLocaleString("ru-RU")} ¥${t.includesVat ? " с НДС" : ""}`);
  if (t.basis) parts.push(`${t.basis}${t.port ? " " + t.port : ""}`);
  if (t.leadTimeDays) parts.push(`срок ${t.leadTimeDays} дн.`);
  if (t.paymentTerms) parts.push(t.paymentTerms);
  return parts.join(", ");
}

const RUNNERS: Record<RunnableStage, (ctx: StageContext) => Promise<void>> = {
  analyst: runAnalyst,
  hunter: runHunter,
  negotiator: runNegotiator,
  costing: runCosting,
};

export function runStage(stage: RunnableStage, ctx: StageContext): Promise<void> {
  return RUNNERS[stage](ctx);
}

export async function runWorkflow(ctx: StageContext, from: RunnableStage = "analyst"): Promise<void> {
  for (const s of STAGE_ORDER.slice(STAGE_ORDER.indexOf(from))) await runStage(s, ctx);
}

/** Мгновенно прогоняет весь воркфлоу и возвращает итоговое состояние (для стартового экрана и тестов). */
export async function completedState(order: OrderRequest, rates: RatesPerUsd): Promise<WorkflowState> {
  let state = initialWorkflowState(order);
  const clock = new DemoClock();
  clock.instant = true;
  const controller = new AbortController();
  await runWorkflow({
    order,
    clock,
    signal: controller.signal,
    rates,
    emit: (e) => {
      state = reduceWorkflow(state, e);
    },
    awaitApproval: () => Promise.resolve(),
  });
  return state;
}
