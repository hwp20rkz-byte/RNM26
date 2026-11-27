"use client";

import { AnimatePresence, motion } from "motion/react";
import { Bot, Check, Languages, MessageCircle, Phone, Sparkles, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { formatMoney, convert } from "@/lib/currencyEngine";
import { useApp } from "@/state/AppProvider";
import type { Channel, ChatMessage, Lang } from "@/types/sourcing";
import { Badge, Button, Card, EmptyState, Section, SectionHeader } from "@/components/ui";

const CHANNEL: Record<Channel, { title: string; sub: string; icon: typeof MessageCircle }> = {
  wechat: { title: "WeChat · WeCom", sub: "Ruiheng, 王丽 (外贸经理)", icon: MessageCircle },
  whatsapp: { title: "WhatsApp Business", sub: "Hanwei, Kevin Zhang", icon: Phone },
};

export function OmnichannelMessenger() {
  const { wf, channel, setChannel, approve, rates } = useApp();
  const [tLang, setTLang] = useState<Extract<Lang, "ru" | "en">>("ru");

  const agreed = wf.quotes.find((q) => q.status === "agreed");
  const first = agreed?.initial;
  const final = agreed?.final;

  return (
    <Section tourId="messenger">
      <Card>
        <SectionHeader
          eyebrow="Agent 3 · WeChat/WhatsApp Negotiator"
          title="Переговоры с заводами: оригинал и перевод рядом"
          right={
            <div role="group" aria-label="Язык перевода" className="inline-flex items-center gap-1 rounded-xl border border-border p-1 text-xs">
              <Languages className="ml-1 size-3.5 text-muted" />
              {(["ru", "en"] as const).map((l) => (
                <button key={l} type="button" aria-pressed={tLang === l} onClick={() => setTLang(l)} className={cn("min-h-8 min-w-11 rounded-lg px-2 font-semibold uppercase", tLang === l ? "bg-surface-2" : "text-muted")}>
                  {l}
                </button>
              ))}
            </div>
          }
        />

        {/* Извлечённые условия */}
        <div className="grid grid-cols-1 gap-3 px-4 pt-4 sm:grid-cols-4 sm:px-6">
          <Term label="Цена за станок" value={final ? `${final.unitPriceCny.toLocaleString("ru-RU")} ¥` : "—"} hint={final ? `${formatMoney(convert(final.unitPriceCny, "CNY", "USD", rates.perUsd), "USD")} · было ${first?.unitPriceCny.toLocaleString("ru-RU")} ¥ с НДС` : "ждём котировку"} good={!!final} />
          <Term label="Базис поставки" value={final ? `${final.basis} ${final.port}` : "—"} hint={first ? `было ${first.basis} ${first.port}` : ""} good={!!final} />
          <Term label="Срок производства" value={final ? `${final.leadTimeDays} дней` : "—"} hint={first ? `было ${first.leadTimeDays} дней` : ""} good={!!final} />
          <Term label="Оплата" value={final ? "30 / 70 против B/L" : "—"} hint={first ? "было 70% до отгрузки" : ""} good={!!final} />
        </div>

        {/* Мобильные вкладки */}
        <div role="tablist" className="mt-4 flex gap-2 px-4 sm:px-6 lg:hidden">
          {(Object.keys(CHANNEL) as Channel[]).map((c) => (
            <button key={c} role="tab" type="button" aria-selected={channel === c} onClick={() => setChannel(c)} className={cn("min-h-11 flex-1 rounded-xl border text-sm font-medium", channel === c ? "border-primary bg-primary-soft text-primary" : "border-border text-muted")}>
              {CHANNEL[c].title}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 p-4 sm:p-6 lg:grid-cols-2">
          {(Object.keys(CHANNEL) as Channel[]).map((c) => (
            <ChannelPane key={c} channel={c} hiddenOnMobile={channel !== c} messages={wf.messages.filter((m) => m.channel === c)} tLang={tLang} pending={wf.pendingApproval?.channel === c ? wf.pendingApproval : null} onApprove={approve} />
          ))}
        </div>
      </Card>
    </Section>
  );
}

function Term({ label, value, hint, good }: { label: string; value: string; hint: string; good: boolean }) {
  return (
    <div className={cn("rounded-xl border p-3", good ? "border-success/40 bg-success-soft/40" : "border-border")}>
      <p className="text-xs text-muted">{label}</p>
      <p className="num mt-1 text-sm font-semibold">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{hint}</p>
    </div>
  );
}

function ChannelPane({
  channel,
  messages,
  tLang,
  pending,
  onApprove,
  hiddenOnMobile,
}: {
  channel: Channel;
  messages: ChatMessage[];
  tLang: "ru" | "en";
  pending: ChatMessage | null;
  onApprove: () => void;
  hiddenOnMobile: boolean;
}) {
  const meta = CHANNEL[channel];
  const Icon = meta.icon;
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, pending]);

  return (
    <div className={cn("flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border", hiddenOnMobile && "hidden lg:flex")}>
      <div className="flex items-center gap-3 border-b border-border bg-surface-2/60 px-4 py-3">
        <div className="grid size-9 place-items-center rounded-xl bg-surface text-fg">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{meta.title}</p>
          <p className="truncate text-xs text-muted">{meta.sub}</p>
        </div>
        <Badge tone={channel === "wechat" ? "primary" : "neutral"} className="ml-auto">
          {channel === "wechat" ? "官方 API · WeCom" : "Cloud API"}
        </Badge>
      </div>
      <div ref={scroller} className="h-[26rem] space-y-3 overflow-y-auto p-3">
        {messages.length === 0 && !pending && (
          <EmptyState icon={<MessageCircle className="size-5" />} title="Переписки пока нет" hint="Agent 3 отправит RFQ, как только Agent 2 соберёт шорт-лист." />
        )}
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <Bubble key={m.id} m={m} tLang={tLang} />
          ))}
        </AnimatePresence>
        <AnimatePresence>
          {pending && (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="rounded-2xl border-2 border-dashed border-warning bg-warning-soft/50 p-3">
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-warning">
                <Sparkles className="size-3.5" /> Черновик агента: нужно подтверждение оператора
              </p>
              <BubbleBody m={pending} tLang={tLang} />
              <div className="mt-3 flex gap-2">
                <Button variant="success" size="sm" onClick={onApprove}>
                  <Check className="size-4" /> Одобрить и отправить
                </Button>
                <Button variant="ghost" size="sm" disabled>Изменить</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Bubble({ m, tLang }: { m: ChatMessage; tLang: "ru" | "en" }) {
  const out = m.from !== "factory";
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-2", out && "flex-row-reverse")}>
      <div className={cn("grid size-8 shrink-0 place-items-center rounded-full", out ? "bg-primary text-primary-fg" : "bg-surface-2 text-muted")}>
        {out ? <Bot className="size-4" /> : <UserRound className="size-4" />}
      </div>
      <div className={cn("max-w-[88%] min-w-0 rounded-2xl px-3 py-2", out ? "rounded-tr-sm bg-primary-soft" : "rounded-tl-sm bg-surface-2")}>
        <p className="mb-1 flex flex-wrap gap-x-2 text-xs text-muted">
          <span className="font-medium">{m.author}</span>
          <span className="num">{m.at}</span>
        </p>
        <BubbleBody m={m} tLang={tLang} />
      </div>
    </motion.div>
  );
}

function BubbleBody({ m, tLang }: { m: ChatMessage; tLang: "ru" | "en" }) {
  const translation = m.original.lang === tLang ? m.translations.zh : m.translations[tLang];
  return (
    <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
      <p className={cn("text-sm leading-relaxed", m.original.lang === "zh" && "zh")}>
        <span className="mr-1 rounded bg-surface px-1 font-mono text-xs uppercase text-muted">{m.original.lang}</span>
        {m.original.text}
      </p>
      <p className="border-t border-border pt-2 text-sm leading-relaxed text-muted xl:border-t-0 xl:border-l xl:pt-0 xl:pl-2">
        <span className="mr-1 rounded bg-surface px-1 font-mono text-xs uppercase">AI · {m.original.lang === tLang ? "zh" : tLang}</span>
        {translation}
      </p>
      {m.extracted && (
        <div className="flex flex-wrap gap-1 xl:col-span-2">
          {m.extracted.unitPriceCny && <Badge tone="accent">цена {m.extracted.unitPriceCny.toLocaleString("ru-RU")} ¥{m.extracted.includesVat ? " с НДС" : ""}</Badge>}
          {m.extracted.basis && <Badge tone="accent">{m.extracted.basis}{m.extracted.port ? ` ${m.extracted.port}` : ""}</Badge>}
          {m.extracted.leadTimeDays && <Badge tone="accent">{m.extracted.leadTimeDays} дней</Badge>}
          {m.extracted.paymentTerms && <Badge tone="accent">{m.extracted.paymentTerms}</Badge>}
        </div>
      )}
    </div>
  );
}
