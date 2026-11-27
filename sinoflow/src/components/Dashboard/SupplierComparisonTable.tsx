"use client";

import { AnimatePresence, motion } from "motion/react";
import { BadgeCheck, Building2, Factory, Filter, Radar, ShieldAlert, Video } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { formatMoney, toMulti } from "@/lib/currencyEngine";
import { useApp } from "@/state/AppProvider";
import { CURRENCIES, type CurrencyCode, type Marketplace, type RatesPerUsd, type SupplierCandidate, type SupplierQuote } from "@/types/sourcing";
import { Badge, Card, CurrencySwitch, EmptyState, Section, SectionHeader } from "@/components/ui";

const MP_LABEL: Record<Marketplace, string> = { "1688": "1688", alibaba: "Alibaba", "made-in-china": "MIC" };

type SortKey = "score" | "price";

export function SupplierComparisonTable() {
  const { wf, rates, displayCurrency } = useApp();
  const [hideTrading, setHideTrading] = useState(true);
  const [sort, setSort] = useState<SortKey>("score");

  const rows = useMemo(() => {
    const list = wf.suppliers.filter((s) => !hideTrading || !s.filteredOut);
    return [...list].sort((a, b) => (sort === "score" ? b.score - a.score : a.listing.priceMinCny - b.listing.priceMinCny));
  }, [wf.suppliers, hideTrading, sort]);

  const filteredCount = wf.suppliers.filter((s) => s.filteredOut).length;

  return (
    <Section tourId="suppliers">
      <Card>
        <SectionHeader
          eyebrow="Agent 2 · Marketplace Hunter"
          title="Производители: проверка и сравнение"
          right={<CurrencySwitch />}
        />

        <div className="grid grid-cols-1 gap-3 px-4 pt-4 sm:grid-cols-3 sm:px-6">
          {(["1688", "alibaba", "made-in-china"] as const).map((mp) => {
            const stat = wf.scan.find((s) => s.marketplace === mp);
            return (
              <div key={mp} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{MP_LABEL[mp]}</span>
                  {stat ? <Badge tone="success">просканировано</Badge> : <Badge>в очереди</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted">{stat?.method.ru ?? "Ожидает Agent 2"}</p>
                <p className="num mt-2 text-sm">
                  {stat ? (
                    <>
                      {stat.found} → <span className="font-semibold">{stat.afterDedup}</span> после дедупликации
                    </>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 px-4 pt-4 sm:px-6">
          <button
            type="button"
            aria-pressed={hideTrading}
            onClick={() => setHideTrading((v) => !v)}
            className={cn("inline-flex min-h-9 items-center gap-2 rounded-xl border px-3 text-xs font-medium", hideTrading ? "border-primary bg-primary-soft text-primary" : "border-border text-muted")}
          >
            <Filter className="size-3.5" />
            Скрыть торговые компании ({filteredCount})
          </button>
          <div role="group" aria-label="Сортировка" className="inline-flex rounded-xl border border-border p-0.5 text-xs">
            {(["score", "price"] as const).map((k) => (
              <button key={k} type="button" aria-pressed={sort === k} onClick={() => setSort(k)} className={cn("min-h-8 rounded-lg px-3", sort === k ? "bg-surface-2 font-semibold" : "text-muted")}>
                {k === "score" ? "По рейтингу" : "По цене"}
              </button>
            ))}
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={<Radar className="size-5" />} title="Поставщиков пока нет" hint="Agent 2 начнёт поиск, когда Agent 1 закончит ТЗ и RFQ." />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-y border-border bg-surface-2/60 text-xs text-muted">
                  <th className="px-4 py-2 text-left font-medium sm:pl-6">Поставщик</th>
                  <th className="px-3 py-2 text-left font-medium">Проверка</th>
                  <th className="px-3 py-2 text-left font-medium">ЧПУ</th>
                  <th className="px-3 py-2 text-right font-medium">Цена за ед., {displayCurrency}</th>
                  <th className="px-3 py-2 text-right font-medium">Другие валюты</th>
                  <th className="px-4 py-2 text-right font-medium sm:pr-6">Рейтинг</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {rows.map((s) => (
                    <SupplierRow key={s.id} s={s} selected={wf.selectedSupplierId === s.id} quote={wf.quotes.find((q) => q.supplierId === s.id)} perUsd={rates.perUsd} displayCurrency={displayCurrency} />
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
        <p className="px-4 py-3 text-xs text-muted sm:px-6">
          Цены — диапазон из карточек площадок, без НДС для экспорта. Курс: {rates.sourceLabel}. Названия заводов в демо вымышлены.
        </p>
      </Card>
    </Section>
  );
}

function SupplierRow({ s, selected, quote, perUsd, displayCurrency }: { s: SupplierCandidate; selected: boolean; quote?: SupplierQuote; perUsd: RatesPerUsd; displayCurrency: CurrencyCode }) {
    const minM = toMulti(s.listing.priceMinCny, "CNY", perUsd);
    const maxM = toMulti(s.listing.priceMaxCny, "CNY", perUsd);
    const v = s.verification;
    return (
      <motion.tr
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className={cn("border-b border-border align-top last:border-0", s.filteredOut && "opacity-60", selected && "bg-success-soft/50")}
      >
        <td className="px-4 py-3 sm:pl-6">
          <div className="flex items-start gap-2">
            {s.type === "manufacturer" ? <Factory className="mt-0.5 size-4 shrink-0 text-success" /> : <Building2 className="mt-0.5 size-4 shrink-0 text-danger" />}
            <div className="min-w-0">
              <p className="font-medium">{s.nameEn}</p>
              <p className="zh text-xs text-muted">{s.nameZh}</p>
              <p className="mt-1 flex flex-wrap gap-1 text-xs text-muted">
                {s.city}, {s.province} ·{" "}
                {s.marketplaces.map((m) => (
                  <Badge key={m} className="py-0">{MP_LABEL[m]}</Badge>
                ))}
              </p>
              {s.filteredOut && <p className="mt-1 text-xs text-danger">{s.filteredOut.reason.ru}</p>}
              {quote && !s.filteredOut && (
                <p className="mt-1 text-xs">
                  <Badge tone={quote.status === "agreed" ? "success" : "warning"}>
                    {quote.status === "agreed" ? "договорились" : quote.status === "negotiating" ? "идут переговоры" : "котировка получена"}
                  </Badge>
                </p>
              )}
            </div>
          </div>
        </td>
        <td className="px-3 py-3">
          <div className="flex max-w-[16rem] flex-wrap gap-1">
            {s.type === "manufacturer" ? (
              <Badge tone="success" icon={<BadgeCheck className="size-3" />}>Производитель</Badge>
            ) : (
              <Badge tone="danger" icon={<ShieldAlert className="size-3" />}>Торговая компания</Badge>
            )}
            {v.businessLicense && <Badge tone="neutral">营业执照 ✓</Badge>}
            {v.videoAudit ? <Badge tone="success" icon={<Video className="size-3" />}>видео-аудит</Badge> : <Badge tone="warning">аудит не проведён</Badge>}
            {v.eacExperience && <Badge tone="primary">опыт EAC</Badge>}
            {v.tradeAssurance && <Badge>Trade Assurance</Badge>}
          </div>
          <p className="num mt-1 text-xs text-muted">
            {v.yearsInBusiness} лет · капитал ¥{(v.registeredCapitalCny / 1e6).toLocaleString("ru-RU")} млн{v.staff ? ` · ${v.staff} чел.` : ""}{v.factoryAreaM2 ? ` · ${v.factoryAreaM2.toLocaleString("ru-RU")} м²` : ""} · экспорт {Math.round(v.exportShare * 100)}%
          </p>
        </td>
        <td className="px-3 py-3 text-xs">{s.controller}</td>
        <td className="num px-3 py-3 text-right font-semibold whitespace-nowrap">
          {formatMoney(minM[displayCurrency], displayCurrency)}
          <span className="block text-xs font-normal text-muted">до {formatMoney(maxM[displayCurrency], displayCurrency)}</span>
        </td>
        <td className="num px-3 py-3 text-right text-xs text-muted whitespace-nowrap">
          {CURRENCIES.filter((c) => c !== displayCurrency).map((c) => (
            <span key={c} className="block">{formatMoney(minM[c], c)}</span>
          ))}
        </td>
        <td className="px-4 py-3 text-right sm:pr-6">
          <div className="inline-flex flex-col items-end gap-1">
            <span className={cn("num text-lg font-semibold", s.score >= 85 ? "text-success" : s.score >= 65 ? "text-fg" : "text-danger")}>{s.score}</span>
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-2">
              <motion.div className={cn("h-full", s.score >= 85 ? "bg-success" : s.score >= 65 ? "bg-primary" : "bg-danger")} initial={{ width: 0 }} animate={{ width: `${s.score}%` }} transition={{ duration: 0.6 }} />
            </div>
          </div>
        </td>
      </motion.tr>
    );
  }
