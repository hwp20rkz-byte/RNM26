"use client";

import { motion } from "motion/react";
import { Play, Plus, RotateCcw, Square } from "lucide-react";
import { useMemo } from "react";
import { LOGISTICS, SERVICE_CATALOG } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { convert, formatMoney, priceServices, toMulti } from "@/lib/currencyEngine";
import { STAGE_ORDER } from "@/lib/mockAgentWorkflow";
import { useApp } from "@/state/AppProvider";
import type { OrderStage } from "@/types/sourcing";
import { AgentPipelineVisualizer } from "./AgentPipelineVisualizer";
import { LandedCostPanel } from "./LandedCostPanel";
import { OmnichannelMessenger } from "./OmnichannelMessenger";
import { OrderIntakeModal } from "./OrderIntakeModal";
import { SpecAnalysisPanel } from "./SpecAnalysisPanel";
import { SupplierComparisonTable } from "./SupplierComparisonTable";
import { Badge, Button, Card, MoneyQuad, Section } from "@/components/ui";

const STAGE_LABEL: Record<OrderStage, string> = {
  draft: "Черновик",
  intake: "Оферта оплачена",
  analyst: "Анализ ТЗ",
  hunter: "Поиск заводов",
  negotiator: "Переговоры",
  costing: "Расчёт до двери",
  proposal_ready: "КП готово",
};

const QUEUE = [
  { id: "SF-2611-117", title: "Линия фасовки в дой-пак DP-200", client: "ООО «УралПак»", city: "Екатеринбург", stage: "Переговоры", tone: "warning" as const, feeUsd: 1890 },
  { id: "SF-2611-115", title: "Блоки питания 24 В 20 А на DIN-рейку, 2 000 шт", client: "ТОО «ЭнергоКомплект»", city: "Астана", stage: "КП отправлено", tone: "success" as const, feeUsd: 640 },
  { id: "SF-2611-109", title: "Оптоволоконный лазер 3015, 3 кВт", client: "ООО «МеталлФорм»", city: "Москва", stage: "Образцы", tone: "primary" as const, feeUsd: 2240 },
];

export function DashboardView() {
  const { wf, openIntake, runAll, runStage, running, cancelRun, resetToEmpty, rates, pricing, displayCurrency } = useApp();
  const order = wf.order;

  const offer = useMemo(() => {
    if (!order) return null;
    const goodsValueUsd = convert(order.targetPrice.amount * order.quantity, order.targetPrice.currency, "USD", rates.perUsd);
    return priceServices({ services: order.services, catalog: SERVICE_CATALOG, category: order.category, urgency: order.urgency, goodsValueUsd, rates: rates.perUsd, pricing });
  }, [order, rates, pricing]);

  const nextStage = STAGE_ORDER.find((s) => wf.agents[s].status !== "done");

  return (
    <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-4 px-4 pt-4 pb-40 sm:gap-6 sm:px-6 lg:grid-cols-12">
      {/* Заявка */}
      <Section tourId="order" className="min-w-0 lg:col-span-8">
        <Card className="h-full p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="num text-xs text-muted">{order?.id}</span>
                <Badge tone={wf.stage === "proposal_ready" ? "success" : wf.stage === "negotiator" ? "warning" : "primary"}>{STAGE_LABEL[wf.stage]}</Badge>
                <Badge tone="accent">демо-данные</Badge>
              </div>
              <h1 className="mt-2 text-lg font-semibold tracking-tight text-balance sm:text-display sm:leading-tight">{order?.title ?? "Заявка не создана"}</h1>
              <p className="mt-1 text-sm text-muted">
                {order?.client.company} · {order ? LOGISTICS[order.destination].label.ru : ""} · {order?.quantity} {order?.unit} · цель{" "}
                {order ? formatMoney(order.targetPrice.amount, order.targetPrice.currency) : ""} за ед.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => openIntake()}>
                <Plus className="size-4" /> Новая заявка
              </Button>
              {running ? (
                <Button onClick={cancelRun}>
                  <Square className="size-4" /> Остановить
                </Button>
              ) : nextStage ? (
                <Button onClick={() => void (wf.agents.analyst.status === "done" ? runStage(nextStage).then(() => undefined) : runAll())}>
                  <Play className="size-4" /> {wf.agents.analyst.status === "done" ? "Следующий агент" : "Запустить агентов"}
                </Button>
              ) : (
                <Button onClick={resetToEmpty}>
                  <RotateCcw className="size-4" /> Прогнать заново
                </Button>
              )}
            </div>
          </div>
          {order && (
            <blockquote className="mt-4 rounded-xl border-l-4 border-primary bg-surface-2/60 p-3 text-sm leading-relaxed text-muted">{order.rawText}</blockquote>
          )}
        </Card>
      </Section>

      {/* Оферта */}
      <Section tourId="offer" className="min-w-0 lg:col-span-4">
        <Card className="h-full p-4 sm:p-6">
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-accent">Оферта клиенту · услуги</p>
          {offer && (
            <>
              <MoneyQuad amount={offer.total} className="mt-2" />
              <ul className="mt-3 space-y-1 text-sm">
                {offer.lines.map((l) => (
                  <li key={l.serviceId} className="flex justify-between gap-2">
                    <span className="min-w-0 truncate text-muted">{l.name}</span>
                    <span className="num whitespace-nowrap">{formatMoney(l.price[displayCurrency], displayCurrency)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted">
                Маржа агентства {Math.round(pricing.agencyMargin * 100)}%: <span className="num font-semibold text-fg">{formatMoney(offer.marginUsd, "USD")}</span>. Себестоимость ИИ по заявке:{" "}
                <span className="num font-semibold text-fg">${Object.values(wf.agents).reduce((s, a) => s + a.costUsd, 0).toFixed(2)}</span>.
              </p>
            </>
          )}
        </Card>
      </Section>

      <div className="min-w-0 lg:col-span-12">
        <AgentPipelineVisualizer />
      </div>
      <div className="min-w-0 lg:col-span-12">
        <SpecAnalysisPanel />
      </div>
      <div className="min-w-0 lg:col-span-12">
        <SupplierComparisonTable />
      </div>
      <div className="min-w-0 lg:col-span-12">
        <OmnichannelMessenger />
      </div>
      <div className="min-w-0 lg:col-span-12">
        <LandedCostPanel />
      </div>

      {/* Очередь */}
      <Section tourId="queue" className="lg:col-span-12">
        <Card className="p-4 sm:p-6">
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-accent">Очередь агентства</p>
          <ul className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            {QUEUE.map((q, i) => {
              const fee = toMulti(q.feeUsd, "USD", rates.perUsd, { fxSpread: pricing.fxSpread, commercial: true });
              return (
                <motion.li key={q.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="num text-xs text-muted">{q.id}</span>
                    <Badge tone={q.tone}>{q.stage}</Badge>
                  </div>
                  <p className="mt-1 text-sm font-medium">{q.title}</p>
                  <p className="text-xs text-muted">{q.client} · {q.city}</p>
                  <p className={cn("num mt-2 text-sm font-semibold")}>{formatMoney(fee[displayCurrency], displayCurrency)}</p>
                </motion.li>
              );
            })}
          </ul>
        </Card>
      </Section>

      <OrderIntakeModal onSubmitted={() => void runAll()} />
    </div>
  );
}
