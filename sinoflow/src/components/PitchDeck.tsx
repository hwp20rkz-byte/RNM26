"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  Bot,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Database,
  FileSearch,
  Globe,
  Hand,
  MessagesSquare,
  Radar,
  Server,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { SERVICE_CATALOG } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { formatMoney, priceServices, toMulti } from "@/lib/currencyEngine";
import { DEMO_USAGE, llmCostUsd } from "@/lib/mockAgentWorkflow";
import { useApp } from "@/state/AppProvider";
import { CURRENCIES } from "@/types/sourcing";
import { Badge, Card, CurrencySwitch } from "@/components/ui";

const SLIDES = ["Обложка", "Проблема", "Решение", "Агенты", "Архитектура", "Open-source стек", "Юнит-экономика", "Ограничения и план"];

export function PitchDeck() {
  const { deckSlide: i, setDeckSlide } = useApp();
  const [dir, setDir] = useState(1);
  const go = (n: number) => {
    const next = Math.max(0, Math.min(SLIDES.length - 1, n));
    setDir(next >= i ? 1 : -1);
    setDeckSlide(next);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select")) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") go(i + 1);
      if (e.key === "ArrowLeft" || e.key === "PageUp") go(i - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div id="deck" className="mx-auto flex max-w-[1440px] flex-col px-4 pt-4 pb-40 sm:px-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="num text-xs text-muted">
          Слайд {i + 1} / {SLIDES.length} · {SLIDES[i]}
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={() => go(i - 1)} disabled={i === 0} aria-label="Предыдущий слайд" className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-border bg-surface disabled:opacity-40">
            <ChevronLeft className="size-5" />
          </button>
          <button type="button" onClick={() => go(i + 1)} disabled={i === SLIDES.length - 1} aria-label="Следующий слайд" className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-border bg-surface disabled:opacity-40">
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      <Card className="relative min-h-[36rem] overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={i}
            custom={dir}
            initial={{ opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -40 }}
            transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
            className="p-6 sm:p-10 lg:p-14"
          >
            {[<Cover key={0} />, <Problem key={1} />, <Solution key={2} />, <Agents key={3} />, <Architecture key={4} />, <Stack key={5} />, <Economics key={6} />, <Limits key={7} />][i]}
          </motion.div>
        </AnimatePresence>
      </Card>

      <div className="mt-4 flex flex-wrap justify-center gap-2" role="tablist" aria-label="Слайды">
        {SLIDES.map((s, n) => (
          <button key={s} role="tab" aria-selected={n === i} type="button" onClick={() => go(n)} className="grid min-h-11 min-w-11 place-items-center" aria-label={`Слайд ${n + 1}: ${s}`}>
            <span className={cn("block h-2 rounded-full transition-all", n === i ? "w-8 bg-primary" : "w-2 bg-border")} />
          </button>
        ))}
      </div>
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="font-mono text-xs font-semibold uppercase tracking-wider text-accent">{children}</p>;
}
function Title({ children }: { children: ReactNode }) {
  return <h2 className="mt-2 max-w-4xl font-display text-display font-semibold tracking-tight text-balance">{children}</h2>;
}
const stagger = (n: number) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.1 + n * 0.07 } });

function Cover() {
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center">
      <div className="lg:col-span-8">
        <Eyebrow>B2B SaaS для агентов по закупкам в Китае</Eyebrow>
        <h1 className="mt-3 font-display text-display font-bold tracking-tight">SinoFlow AI</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          От сообщения клиента до коммерческого предложения с ценой «до двери» в ₽, ₸, ¥ и $. Четыре ИИ-агента берут на себя рутину,
          а цену, выбор завода и отправку обязывающих сообщений утверждает человек.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Badge tone="primary">4 ИИ-агента</Badge>
          <Badge tone="primary">WeChat · WhatsApp</Badge>
          <Badge tone="primary">1688 · Alibaba · Made-in-China</Badge>
          <Badge tone="accent">₽ ₸ ¥ $ в одной оферте</Badge>
        </div>
      </div>
      <motion.div {...stagger(2)} className="lg:col-span-4">
        <div className="mx-auto grid aspect-square w-48 place-items-center rounded-3xl bg-accent text-[6rem] leading-none text-white shadow-card sm:w-64">
          <span className="zh font-semibold">源</span>
        </div>
        <p className="mt-3 text-center text-xs text-muted">源 — «источник»</p>
      </motion.div>
    </div>
  );
}

function Problem() {
  const rows = [
    { label: "Разбор заявки и уточнения", h: 0.5 },
    { label: "Поиск на 1688, Alibaba, MIC", h: 2 },
    { label: "Перевод и RFQ на китайском", h: 1 },
    { label: "Переписка с менеджерами заводов", h: 1.5 },
    { label: "Расчёт стоимости до двери", h: 1 },
  ];
  const max = 2;
  return (
    <div>
      <Eyebrow>Проблема</Eyebrow>
      <Title>Одна заявка съедает около 6 часов менеджера, и большая часть уходит на рутину</Title>
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-7">
          {rows.map((r, n) => (
            <motion.div key={r.label} {...stagger(n)}>
              <div className="flex justify-between text-sm">
                <span>{r.label}</span>
                <span className="num text-muted">{r.h.toLocaleString("ru-RU")} ч</span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-surface-2">
                <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${(r.h / max) * 100}%` }} transition={{ delay: 0.2 + n * 0.08, duration: 0.6 }} />
              </div>
            </motion.div>
          ))}
          <p className="text-xs text-muted">Оценка до пилота; в продукте время пишется таймером по каждой заявке.</p>
        </div>
        <ul className="space-y-3 lg:col-span-5">
          {[
            ["Торговые компании под видом фабрик", "Наценка 5–15% и потеря контроля качества"],
            ["Ошибки в цене и условиях", "Цена «с НДС 13%» против экспортной, EXW против FOB"],
            ["Счета в разных валютах", "Клиент платит в ₸ или ₽, завод хочет ¥, курс меняется за неделю"],
          ].map(([t, d], n) => (
            <motion.li key={t} {...stagger(n + 3)} className="rounded-2xl border border-border p-4">
              <p className="text-sm font-semibold">{t}</p>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Solution() {
  const steps = [
    { t: "Заявка", d: "Текст, фото, голос из Telegram или формы", human: false },
    { t: "Оферта в 4 валютах", d: "Цена услуг с маржой, предоплата", human: true },
    { t: "ТЗ и RFQ", d: "Параметры, ТН ВЭД, EAC, EN + 中文", human: false },
    { t: "Поиск и проверка", d: "Фабрики против торговых компаний", human: false },
    { t: "Переговоры", d: "WeChat / WhatsApp, черновик торга", human: true },
    { t: "КП до двери", d: "Фрахт, пошлина, НДС, ₽ ₸ ¥ $", human: true },
  ];
  return (
    <div>
      <Eyebrow>Решение</Eyebrow>
      <Title>Сквозной процесс: шесть шагов, три решения за человеком</Title>
      <ol className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((s, n) => (
          <motion.li key={s.t} {...stagger(n)} className={cn("relative rounded-2xl border p-4", s.human ? "border-warning" : "border-border")}>
            <div className="flex items-center justify-between">
              <span className="num text-xs text-muted">шаг {n + 1}</span>
              {s.human && <Badge tone="warning" icon={<Hand className="size-3" />}>решает человек</Badge>}
            </div>
            <p className="mt-2 font-semibold">{s.t}</p>
            <p className="mt-1 text-sm text-muted">{s.d}</p>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

function Agents() {
  const list = [
    { icon: FileSearch, n: 1, name: "TechSpec Analyst", inp: "Свободный текст клиента", out: "ТЗ, ТН ВЭД, флаги EAC, RFQ EN + 中文", guard: "Значение без источника помечается «уточнить»" },
    { icon: Radar, n: 2, name: "Marketplace Hunter", inp: "ТЗ и ключевые слова 中文", out: "Шорт-лист с оценкой: фабрика или трейдер", guard: "Только API и лицензированные фиды" },
    { icon: MessagesSquare, n: 3, name: "WeChat/WhatsApp Negotiator", inp: "Шорт-лист, цель клиента", out: "Котировки, торг, финальные условия", guard: "Обязывающие сообщения — после «Одобрить»" },
    { icon: Calculator, n: 4, name: "Landed Cost Calculator", inp: "Условия FOB, маршрут", out: "Цена до двери в ₽ ₸ ¥ $, КП в PDF", guard: "Расчёт детерминирован, LLM только пишет текст" },
  ];
  return (
    <div>
      <Eyebrow>Агенты</Eyebrow>
      <Title>Четыре агента, у каждого вход, выход и ограничение</Title>
      <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2">
        {list.map((a, n) => (
          <motion.div key={a.name} {...stagger(n)} className="rounded-2xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary"><a.icon className="size-5" /></div>
              <div>
                <p className="num text-xs text-muted">Agent {a.n}</p>
                <p className="font-semibold">{a.name}</p>
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-muted">Вход</dt><dd>{a.inp}</dd>
              <dt className="text-muted">Выход</dt><dd>{a.out}</dd>
              <dt className="text-muted">Защита</dt><dd>{a.guard}</dd>
            </dl>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function Box({ icon: Icon, title, sub, tone = "neutral", n }: { icon: typeof Server; title: string; sub: string; tone?: "neutral" | "primary" | "accent"; n: number }) {
  return (
    <motion.div {...stagger(n)} className={cn("rounded-xl border p-3", tone === "primary" ? "border-primary bg-primary-soft/50" : tone === "accent" ? "border-accent/50 bg-accent-soft/60" : "border-border bg-surface")}>
      <div className="flex items-center gap-2">
        <Icon className="size-4 shrink-0 text-primary" />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <p className="mt-1 text-xs text-muted">{sub}</p>
    </motion.div>
  );
}

function Architecture() {
  return (
    <div>
      <Eyebrow>Архитектура</Eyebrow>
      <Title>Слои системы: от канала клиента до источника данных</Title>
      <div className="mt-8 grid grid-cols-1 items-stretch gap-3 lg:grid-cols-[1fr_auto_1.2fr_auto_1fr]">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted">Каналы и интерфейсы</p>
          <Box n={0} icon={Globe} title="Next.js кабинет" sub="Оператор, клиент, презентация" />
          <Box n={1} icon={MessagesSquare} title="Chatwoot" sub="WeCom, WhatsApp Cloud API, почта, Telegram" />
          <Box n={2} icon={Users} title="Twenty CRM" sub="Клиенты, сделки, история заводов" />
        </div>
        <ArrowRight aria-hidden className="mx-auto hidden size-5 self-center text-muted lg:block" />
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted">Ядро</p>
          <Box n={3} icon={Server} title="FastAPI" sub="REST и WebSocket событий, вебхуки с проверкой подписи" tone="primary" />
          <Box n={4} icon={Bot} title="LangGraph" sub="Граф 4 агентов, interrupt перед отправкой заводу, чекпойнты" tone="primary" />
          <Box n={5} icon={Database} title="PostgreSQL + Redis/Valkey" sub="Заявки, журнал аудита, очередь, чекпойнты графа" tone="primary" />
        </div>
        <ArrowRight aria-hidden className="mx-auto hidden size-5 self-center text-muted lg:block" />
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted">Источники</p>
          <Box n={6} icon={Radar} title="1688 Open Platform" sub="Поиск, поиск по фото, карточки" tone="accent" />
          <Box n={7} icon={FileSearch} title="Crawl4AI" sub="Только собственные сайты заводов, robots.txt" tone="accent" />
          <Box n={8} icon={Calculator} title="Курсы ЦБ РФ, НБ РК" sub="Фиксация курса в оферте на 3 дня" tone="accent" />
        </div>
      </div>
    </div>
  );
}

function Stack() {
  const rows: [string, string, string, string][] = [
    ["LangGraph", "MIT", "Граф агентов, human-in-the-loop, чекпойнты", "Каркас, промпты и инструменты пишем сами"],
    ["Crawl4AI", "Apache-2.0", "Извлечение страниц сайтов заводов в Markdown", "Не для Alibaba и 1688: правила площадок"],
    ["Chatwoot", "MIT (кроме ee/)", "Единый инбокс, вебхуки, API", "WeCom подключаем своим каналом"],
    ["Twenty CRM", "AGPL-3.0", "Клиенты, сделки, кастомные объекты", "AGPL: правки в SaaS-версии нужно открывать"],
    ["FastAPI", "MIT", "API, WebSocket, фоновые задачи", "—"],
    ["PostgreSQL", "PostgreSQL License", "Заявки, аудит, pgvector для похожих товаров", "—"],
    ["Redis → Valkey", "Redis: RSAL/SSPL/AGPL · Valkey: BSD-3", "Очередь, кэш, rate limits", "Для SaaS берём Valkey"],
  ];
  return (
    <div>
      <Eyebrow>Open-source стек</Eyebrow>
      <Title>Собираем из проверенных блоков, своё — только ядро</Title>
      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="py-2 pr-3 font-medium">Проект</th><th className="py-2 pr-3 font-medium">Лицензия</th><th className="py-2 pr-3 font-medium">Роль</th><th className="py-2 font-medium">Оговорка</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, n) => (
              <motion.tr key={r[0]} {...stagger(n)} className="border-b border-border last:border-0">
                <td className="py-2 pr-3 font-semibold">{r[0]}</td>
                <td className="py-2 pr-3"><Badge tone={r[1].includes("AGPL") || r[1].includes("SSPL") ? "warning" : "success"}>{r[1]}</Badge></td>
                <td className="py-2 pr-3">{r[2]}</td>
                <td className="py-2 text-muted">{r[3]}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">Лицензии — на момент проектирования; перед релизом сверить в репозиториях.</p>
    </div>
  );
}

function Economics() {
  const { rates, pricing, displayCurrency } = useApp();
  const [perMonth, setPerMonth] = useState(40);
  const [operatorRate, setOperatorRate] = useState(20);
  const [cac, setCac] = useState(120);
  const m = useMemo(() => {
    const services = ["basic_search", "deep_audit", "oem_negotiation", "logistics_customs"] as const;
    const fee = priceServices({ services: [...services], catalog: SERVICE_CATALOG, category: "machinery", urgency: "standard", goodsValueUsd: 96_000, rates: rates.perUsd, pricing }).totalUsd;
    const llm = Object.values(DEMO_USAGE).reduce((s, u) => s + llmCostUsd(u), 0);
    const data = 3;
    // Часы оператора — из каталога услуг: ИИ сокращает их, но не убирает.
    const opHours = services.reduce((s, id) => s + (SERVICE_CATALOG.find((x) => x.id === id)?.operatorHours ?? 0), 0);
    const operator = opHours * operatorRate;
    const infra = 1.5;
    const payments = fee * 0.02;
    const cost = llm + data + operator + infra + payments + cac;
    return { fee, llm, data, operator, infra, payments, cost, gross: fee - cost, opHours };
  }, [rates, pricing, operatorRate, cac]);
  const monthly = toMulti(m.gross * perMonth, "USD", rates.perUsd);
  const rows: [string, number][] = [
    ["ИИ: 4 агента, токены Claude", m.llm],
    ["Данные: 1688 API и фиды", m.data],
    [`Оператор: ${m.opHours.toLocaleString("ru-RU")} ч`, m.operator],
    ["Инфраструктура", m.infra],
    ["Эквайринг и конвертация 2%", m.payments],
    ["Привлечение клиента (CAC)", cac],
  ];
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Eyebrow>Юнит-экономика</Eyebrow>
          <Title>Главная статья затрат — люди и привлечение клиента, а не ИИ</Title>
        </div>
        <CurrencySwitch />
      </div>
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-2 lg:col-span-6">
          <div className="flex justify-between rounded-xl bg-primary-soft/60 p-3 text-sm font-semibold">
            <span>Выручка за заявку (станок, 4 услуги)</span>
            <span className="num">{formatMoney(toMulti(m.fee, "USD", rates.perUsd)[displayCurrency], displayCurrency)}</span>
          </div>
          {rows.map(([l, v]) => (
            <div key={l} className="flex justify-between border-b border-border px-3 py-2 text-sm">
              <span className="text-muted">{l}</span>
              <span className="num">−{formatMoney(toMulti(v, "USD", rates.perUsd)[displayCurrency], displayCurrency)}</span>
            </div>
          ))}
          <div className="flex justify-between rounded-xl bg-success-soft p-3 text-sm font-semibold text-success">
            <span>Валовая прибыль с заявки (без постоянных расходов)</span>
            <span className="num">{formatMoney(toMulti(m.gross, "USD", rates.perUsd)[displayCurrency], displayCurrency)} · {Math.round((m.gross / m.fee) * 100)}%</span>
          </div>
        </div>
        <div className="space-y-4 lg:col-span-6">
          <label className="block text-sm">
            <span className="flex justify-between"><span>Заявок в месяц</span><span className="num font-semibold">{perMonth}</span></span>
            <input type="range" min={5} max={200} value={perMonth} onChange={(e) => setPerMonth(Number(e.target.value))} className="mt-2 w-full accent-[hsl(var(--primary))]" />
          </label>
          <label className="block text-sm">
            <span className="flex justify-between"><span>Ставка оператора, $/ч</span><span className="num font-semibold">{operatorRate}</span></span>
            <input type="range" min={5} max={40} value={operatorRate} onChange={(e) => setOperatorRate(Number(e.target.value))} className="mt-2 w-full accent-[hsl(var(--primary))]" />
          </label>
          <label className="block text-sm">
            <span className="flex justify-between"><span>Привлечение клиента (CAC), $</span><span className="num font-semibold">{cac}</span></span>
            <input type="range" min={0} max={600} step={10} value={cac} onChange={(e) => setCac(Number(e.target.value))} className="mt-2 w-full accent-[hsl(var(--primary))]" />
          </label>
          <div className="rounded-2xl border border-border p-4">
            <p className="text-xs text-muted">Валовая прибыль в месяц</p>
            <p className="num mt-1 text-display font-semibold">{formatMoney(monthly[displayCurrency], displayCurrency, { compact: true })}</p>
            <p className="num mt-1 flex flex-wrap gap-x-3 text-xs text-muted">
              {CURRENCIES.filter((c) => c !== displayCurrency).map((c) => <span key={c}>{formatMoney(monthly[c], c, { compact: true })}</span>)}
            </p>
          </div>
          <p className="text-xs text-muted">Токены по ценам Claude Opus 5.5 ($4 / $20 за 1M). Остальное — гипотезы для пилота.</p>
        </div>
      </div>
    </div>
  );
}

function Limits() {
  return (
    <div>
      <Eyebrow>Ограничения и план</Eyebrow>
      <Title>Что мы сознательно не автоматизируем</Title>
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ul className="space-y-3">
          {[
            ["Парсинг Alibaba и 1688", "Нарушает правила площадок и ведёт к блокировкам. Используем 1688 API, фиды по договору и помощника в браузере оператора"],
            ["Личный WeChat", "Без официального API. Агент готовит черновик, отправляет человек; основной канал — WeCom"],
            ["Цифры без источника", "Цена, MOQ и срок попадают в КП только со ссылкой на сообщение завода"],
            ["Персональные данные", "Хранение в РФ или РК по 152-ФЗ и закону РК, шифрование, роли"],
          ].map(([t, d], n) => (
            <motion.li key={t} {...stagger(n)} className="flex gap-3 rounded-2xl border border-border p-4">
              <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warning" />
              <div>
                <p className="text-sm font-semibold">{t}</p>
                <p className="mt-1 text-sm text-muted">{d}</p>
              </div>
            </motion.li>
          ))}
        </ul>
        <ol className="space-y-3">
          {[
            ["MVP · 6 недель", "Заявка, оферта в 4 валютах, Agent 1 и 4, ручной поиск через помощника, КП в PDF"],
            ["v1 · +8 недель", "1688 API, Agent 2 и 3, WeCom и WhatsApp через Chatwoot, проверка заводов"],
            ["v2 · +12 недель", "База заводов с рейтингом, Twenty CRM, счета и акты в ₽ и ₸, роли и SLA"],
          ].map(([t, d], n) => (
            <motion.li key={t} {...stagger(n + 4)} className="rounded-2xl bg-surface-2 p-4">
              <p className="num text-xs font-semibold text-accent">{t}</p>
              <p className="mt-1 text-sm">{d}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </div>
  );
}
