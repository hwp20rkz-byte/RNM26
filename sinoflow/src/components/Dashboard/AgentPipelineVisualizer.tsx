"use client";

import { AnimatePresence, motion } from "motion/react";
import { Calculator, CheckCircle2, FileSearch, Hand, Loader2, MessagesSquare, Radar, Terminal } from "lucide-react";
import type { ComponentType } from "react";
import { AGENTS } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { useApp } from "@/state/AppProvider";
import type { AgentId, AgentLogEntry, AgentStatus } from "@/types/sourcing";
import { Badge, Card, Section, SectionHeader } from "@/components/ui";

const ICON: Record<AgentId, ComponentType<{ className?: string }>> = {
  analyst: FileSearch,
  hunter: Radar,
  negotiator: MessagesSquare,
  costing: Calculator,
};

const STATUS: Record<AgentStatus, { text: string; tone: "neutral" | "primary" | "warning" | "success" | "danger" }> = {
  idle: { text: "ожидает", tone: "neutral" },
  running: { text: "работает", tone: "primary" },
  waiting_human: { text: "ждёт оператора", tone: "warning" },
  done: { text: "готово", tone: "success" },
  error: { text: "ошибка", tone: "danger" },
};

const LOG_TONE: Record<AgentLogEntry["level"], string> = {
  info: "text-muted",
  tool: "text-primary",
  result: "text-success",
  warn: "text-warning",
  human: "text-accent",
};

export function AgentPipelineVisualizer() {
  const { wf } = useApp();
  const totalCost = Object.values(wf.agents).reduce((s, a) => s + a.costUsd, 0);
  const totalTokens = Object.values(wf.agents).reduce((s, a) => s + a.tokensIn + a.tokensOut, 0);

  return (
    <Section tourId="pipeline">
      <Card>
        <SectionHeader
          eyebrow="Мультиагентный конвейер · граф LangGraph"
          title="Четыре агента работают над заявкой"
          right={
            <div className="flex flex-wrap gap-2">
              <Badge tone="neutral">
                <span className="num">{totalTokens.toLocaleString("ru-RU")}</span> токенов
              </Badge>
              <Badge tone="primary">
                ИИ: <span className="num">${totalCost.toFixed(2)}</span>
              </Badge>
            </div>
          }
        />
        <ol className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
          {AGENTS.map((a, i) => {
            const rt = wf.agents[a.id];
            const Icon = ICON[a.id];
            const st = STATUS[rt.status];
            const active = rt.status === "running" || rt.status === "waiting_human";
            return (
              <li key={a.id} className="relative min-w-0">
                {i < AGENTS.length - 1 && (
                  <div aria-hidden className="absolute top-9 -right-3 hidden h-0.5 w-3 overflow-hidden bg-border xl:block">
                    <motion.div
                      className="h-full bg-primary"
                      initial={false}
                      animate={{ scaleX: rt.status === "done" ? 1 : 0 }}
                      style={{ originX: 0 }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                )}
                <motion.div
                  layout
                  className={cn(
                    "relative h-full overflow-hidden rounded-2xl border p-4 transition-colors",
                    active ? "border-primary bg-primary-soft/40" : rt.status === "done" ? "border-success/40" : "border-border",
                    rt.status === "waiting_human" && "border-warning bg-warning-soft/40",
                  )}
                >
                  {active && (
                    <motion.div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                    />
                  )}
                  <div className="relative flex items-start justify-between gap-2">
                    <div className={cn("grid size-11 place-items-center rounded-xl", rt.status === "done" ? "bg-success-soft text-success" : active ? "bg-primary text-primary-fg" : "bg-surface-2 text-muted")}>
                      {rt.status === "done" ? <CheckCircle2 className="size-5" /> : rt.status === "waiting_human" ? <Hand className="size-5" /> : active ? <Loader2 className="size-5 animate-spin" /> : <Icon className="size-5" />}
                    </div>
                    <Badge tone={st.tone}>{st.text}</Badge>
                  </div>
                  <p className="relative mt-3 font-mono text-xs text-muted">Agent {a.index}</p>
                  <h3 className="relative text-sm font-semibold">{a.name}</h3>
                  <p className="relative mt-1 text-xs text-muted">{a.role.ru}</p>
                  <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(rt.progress * 100)} aria-label={`Прогресс ${a.name}`}>
                    <motion.div className={cn("h-full rounded-full", rt.status === "done" ? "bg-success" : rt.status === "waiting_human" ? "bg-warning" : "bg-primary")} initial={false} animate={{ width: `${rt.progress * 100}%` }} transition={{ duration: 0.4 }} />
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.p key={rt.lastMessage ?? "none"} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative mt-2 min-h-[2.2rem] text-xs">
                      {rt.lastMessage ?? "Ждёт выход предыдущего агента"}
                    </motion.p>
                  </AnimatePresence>
                  <p className="relative mt-1 truncate font-mono text-xs text-muted" title={a.model}>{a.model}</p>
                </motion.div>
              </li>
            );
          })}
        </ol>

        <div className="border-t border-border px-4 py-3 sm:px-6">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted">
            <Terminal className="size-3.5" /> Журнал аудита: каждое действие агента и человека
          </div>
          <div className="max-h-40 overflow-y-auto rounded-xl bg-surface-2 p-3 font-mono text-xs leading-relaxed" aria-live="polite">
            {wf.log.length === 0 && <p className="text-muted">Журнал пуст: создайте заявку или запустите гида.</p>}
            <AnimatePresence initial={false}>
              {wf.log.slice(-14).map((l) => (
                <motion.p key={l.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2">
                  <span className="shrink-0 text-muted">[{l.agent}]</span>
                  <span className={LOG_TONE[l.level]}>{l.text}</span>
                </motion.p>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </Card>
    </Section>
  );
}
