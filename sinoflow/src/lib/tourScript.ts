/**
 * Сценарий озвученного гида. Каждый шаг: текст на RU и EN + действие над интерфейсом.
 * Действия идут через TourController, поэтому сценарий не знает о React.
 * Все ожидания — через ctl.sleep(), который уважает паузу и режим перемотки.
 */
import type { RunnableStage } from "@/lib/mockAgentWorkflow";
import type { AppMode, IntakeDraft } from "@/state/AppProvider";
import type { Channel, CurrencyCode, DestinationCode, WorkflowState } from "@/types/sourcing";

export interface TourController {
  /** true при перемотке: шаги выполняются мгновенно, без ожиданий. */
  instant: boolean;
  sleep(ms: number): Promise<void>;
  waitFor(pred: (wf: WorkflowState) => boolean, timeoutMs?: number): Promise<void>;
  setMode(m: AppMode): void;
  setDeckSlide(n: number): void;
  focus(id: string | null, scroll?: boolean): void;
  openIntake(d?: Partial<IntakeDraft>): void;
  typeDraft(text: string, ms: number): Promise<void>;
  setMargin(m: number): void;
  submitIntake(): void;
  resetCase(): void;
  startStage(s: RunnableStage): Promise<void>;
  approve(): void;
  setDisplayCurrency(c: CurrencyCode): void;
  setLandedDest(d: DestinationCode): void;
  setChannel(c: Channel): void;
}

export interface TourStep {
  id: string;
  title: { ru: string; en: string };
  narration: { ru: string; en: string };
  run(ctl: TourController): Promise<void>;
}

const RAW =
  "Нужны 3 вертикально-фрезерных обрабатывающих центра класса VMC850 под FANUC. Ходы примерно 800/500/550, " +
  "шпиндель BT40 от 8000 об/мин, магазин на 24 инструмента, точность позиционирования не хуже 0,005. " +
  "Конвейер стружки обязательно, подготовка под 4-ю ось. Доставка в Алматы, нужен до апреля. Цель — до $32 000 за станок.";

let negotiation: Promise<void> | null = null;

export const TOUR: TourStep[] = [
  {
    id: "cover",
    title: { ru: "SinoFlow AI", en: "SinoFlow AI" },
    narration: {
      ru: "Это SinoFlow AI, рабочее место агента по закупкам в Китае. За три минуты пройдём живой кейс: от заявки клиента до переговоров в WeChat и коммерческого предложения в рублях, тенге, юанях и долларах.",
      en: "This is SinoFlow AI, a workspace for China sourcing agents. In three minutes we will walk through a live case: from a client request to WeChat negotiation and a proposal in roubles, tenge, yuan and dollars.",
    },
    async run(ctl) {
      ctl.setMode("deck");
      ctl.setDeckSlide(0);
    },
  },
  {
    id: "architecture",
    title: { ru: "Архитектура", en: "Architecture" },
    narration: {
      ru: "Под капотом четыре агента в графе LangGraph. Ядро на FastAPI и PostgreSQL, переписка с заводами идёт через Chatwoot, клиенты и сделки живут в Twenty CRM. Обязывающие сообщения заводу всегда подтверждает человек.",
      en: "Under the hood are four agents in a LangGraph graph. The core runs on FastAPI and PostgreSQL, factory chats go through Chatwoot, and clients and deals live in Twenty CRM. A human always approves binding messages to a factory.",
    },
    async run(ctl) {
      ctl.setMode("deck");
      ctl.setDeckSlide(4);
    },
  },
  {
    id: "intake",
    title: { ru: "Заявка клиента", en: "Client request" },
    narration: {
      ru: "Переходим в кабинет. Клиент из Алматы прислал заявку свободным текстом: три обрабатывающих центра с ЧПУ под FANUC, цель — до тридцати двух тысяч долларов за станок.",
      en: "Now the workspace. A client in Almaty sent a free-text request: three CNC machining centres with FANUC controls, target price up to thirty-two thousand dollars per machine.",
    },
    async run(ctl) {
      ctl.setMode("prototype");
      ctl.resetCase();
      ctl.openIntake({ rawText: "" });
      await ctl.sleep(500);
      ctl.focus("intake-form", false);
      await ctl.typeDraft(RAW, 7000);
    },
  },
  {
    id: "fees",
    title: { ru: "Цена услуг в 4 валютах", en: "Service fees in 4 currencies" },
    narration: {
      ru: "Справа сразу считается стоимость услуг. Категория «станки» даёт коэффициент полтора, маржа агентства тридцать процентов, курс ЦБ подтягивается автоматически. Двигаю маржу, и сумма в тенге, рублях, юанях и долларах пересчитывается мгновенно.",
      en: "On the right, service fees are calculated instantly. The machinery category adds a 1.5 multiplier, agency margin is thirty percent, and the central bank rate loads automatically. As I move the margin, the total in tenge, roubles, yuan and dollars updates at once.",
    },
    async run(ctl) {
      ctl.focus("intake-fees", false);
      await ctl.sleep(2500);
      for (const m of [0.33, 0.36, 0.4, 0.36, 0.33, 0.3]) {
        ctl.setMargin(m);
        await ctl.sleep(450);
      }
    },
  },
  {
    id: "analyst",
    title: { ru: "Agent 1: ТЗ и комплаенс", en: "Agent 1: specs & compliance" },
    narration: {
      ru: "Оферта оплачена, запускаем агентов. Первый, TechSpec Analyst, разбирает текст: ходы, шпиндель, систему ЧПУ. Он назначает код ТН ВЭД и предупреждает: нужна сертификация EAC, а FANUC при поставке в Россию может упереться в ограничения реэкспорта.",
      en: "The offer is paid, so the agents start. The first, TechSpec Analyst, parses the text: travel, spindle, CNC controller. It assigns an HS code and flags that EAC certification is required, and that FANUC may face re-export restrictions for Russia.",
    },
    async run(ctl) {
      ctl.submitIntake();
      ctl.focus("pipeline");
      await ctl.sleep(800);
      const run = ctl.startStage("analyst");
      await ctl.sleep(2500);
      ctl.focus("analysis");
      await run;
    },
  },
  {
    id: "rfq",
    title: { ru: "Двуязычный RFQ", en: "Bilingual RFQ" },
    narration: {
      ru: "На выходе — запрос котировки сразу на английском и упрощённом китайском. В нём конкретные вопросы: экспортная цена без НДС, FOB Циндао, срок, оплата и опыт сертификации для Казахстана и России.",
      en: "The output is a request for quotation in English and Simplified Chinese at once, with specific questions: export price excluding VAT, FOB Qingdao, lead time, payment and certification experience for Kazakhstan and Russia.",
    },
    async run(ctl) {
      ctl.focus("rfq");
    },
  },
  {
    id: "hunter",
    title: { ru: "Agent 2: поиск фабрик", en: "Agent 2: factory search" },
    narration: {
      ru: "Второй агент ищет на 1688 через официальный API и поиск по фото, а по Alibaba и Made-in-China — через лицензированные фиды. Из семисот карточек остаётся восемь компаний, и две из них торговые: одна перепродаёт тот же станок с наценкой, у другой в лицензии нет производства.",
      en: "The second agent searches 1688 through the official API and image search, and Alibaba and Made-in-China through licensed feeds. Of seven hundred listings, eight companies remain, and two are traders: one resells the same machine with a markup, the other has no production in its licence.",
    },
    async run(ctl) {
      ctl.focus("suppliers");
      await ctl.startStage("hunter");
    },
  },
  {
    id: "currencies",
    title: { ru: "Цены в любой валюте", en: "Prices in any currency" },
    narration: {
      ru: "Цены производителей видны в любой валюте. Переключаю на юани, доллары, рубли и обратно на тенге — пересчёт по текущему курсу.",
      en: "Manufacturer prices show in any currency. I switch to yuan, dollars, roubles and back to tenge, all at the current rate.",
    },
    async run(ctl) {
      ctl.focus("suppliers");
      for (const c of ["CNY", "USD", "RUB", "KZT"] as const) {
        await ctl.sleep(1300);
        ctl.setDisplayCurrency(c);
      }
    },
  },
  {
    id: "negotiator",
    title: { ru: "Agent 3: WeChat и WhatsApp", en: "Agent 3: WeChat & WhatsApp" },
    narration: {
      ru: "Третий агент ведёт переговоры. Слева — WeChat с фабрикой из Шаньдуна, справа — WhatsApp с заводом из Сучжоу. Оригинал на китайском, рядом перевод. Первая цена — двести двадцать восемь тысяч юаней, но с НДС тринадцать процентов. Агент просит экспортную цену и FOB Циндао.",
      en: "The third agent negotiates. On the left, WeChat with a factory in Shandong; on the right, WhatsApp with a plant in Suzhou. Chinese original, translation alongside. The first price is 228,000 yuan, but it includes 13 percent VAT. The agent asks for the export price and FOB Qingdao.",
    },
    async run(ctl) {
      ctl.focus("messenger");
      ctl.setChannel("wechat");
      negotiation = ctl.startStage("negotiator");
      await ctl.waitFor((wf) => wf.pendingApproval !== null, 40_000);
    },
  },
  {
    id: "approval",
    title: { ru: "Человек одобряет торг", en: "Human approves the counter-offer" },
    narration: {
      ru: "Контрпредложение агент подготовил, но не отправил: это обязывающее сообщение, его одобряет оператор. Одобряем, и завод соглашается на двести тысяч пятьсот юаней FOB Циндао, сорок дней и оплату семьдесят процентов против копии коносамента. Это на двенадцать процентов ниже первой цены.",
      en: "The agent drafted the counter-offer but did not send it: it is a binding message, so the operator approves it. We approve, and the factory agrees to 200,500 yuan FOB Qingdao, forty days, and seventy percent against a bill of lading copy. That is twelve percent below the first price.",
    },
    async run(ctl) {
      ctl.focus("messenger");
      await ctl.sleep(3500);
      ctl.approve();
      if (negotiation) await negotiation;
      negotiation = null;
    },
  },
  {
    id: "costing",
    title: { ru: "Agent 4: стоимость до двери", en: "Agent 4: landed cost" },
    narration: {
      ru: "Четвёртый агент считает стоимость до двери: железная дорога до Алматы, страховка, пошлина, НДС, брокер и сертификация. Итог — сразу в тенге, рублях, юанях и долларах. Для сравнения — та же партия в Москву: дороже из-за фрахта и НДС двадцать два процента.",
      en: "The fourth agent calculates landed cost: rail to Almaty, insurance, duty, VAT, broker and certification. The total appears in tenge, roubles, yuan and dollars. For comparison, the same lot to Moscow costs more because of freight and 22 percent VAT.",
    },
    async run(ctl) {
      ctl.focus("landed");
      ctl.setLandedDest("KZ-ALA");
      await ctl.startStage("costing");
      await ctl.sleep(5500);
      ctl.setLandedDest("RU-MOW");
      await ctl.sleep(4000);
      ctl.setLandedDest("KZ-ALA");
    },
  },
  {
    id: "summary",
    title: { ru: "Итог", en: "Summary" },
    narration: {
      ru: "Весь кейс стоил чуть больше доллара на токены и пару часов оператора вместо шести. Каждое действие агентов записано в журнал, и любую цифру можно проверить по источнику. Это прототип на демо-данных; бэкенд на FastAPI и LangGraph лежит рядом в репозитории.",
      en: "The whole case cost just over a dollar in tokens and a couple of operator hours instead of six. Every agent action is logged, and any figure can be traced to its source. This is a prototype on demo data; the FastAPI and LangGraph backend blueprint sits next to it in the repository.",
    },
    async run(ctl) {
      ctl.focus("pipeline");
      await ctl.sleep(4000);
      ctl.focus("offer");
    },
  },
];

/** Оценка длительности озвучки, если синтез речи недоступен. */
export const estimateSpeechMs = (text: string, lang: "ru" | "en") => Math.max(4000, text.length * (lang === "ru" ? 62 : 58));
