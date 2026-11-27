"use client";

import { motion } from "motion/react";
import { Calculator, FileDown, Train } from "lucide-react";
import { LOGISTICS } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { convert, formatMoney } from "@/lib/currencyEngine";
import { useApp } from "@/state/AppProvider";
import type { DestinationCode } from "@/types/sourcing";
import { Badge, Button, Card, CurrencySwitch, EmptyState, MoneyQuad, Section, SectionHeader } from "@/components/ui";

const BAR_TONE = ["bg-primary", "bg-primary/70", "bg-primary/40", "bg-accent", "bg-accent/60", "bg-fg/40", "bg-fg/25", "bg-warning"];

export function LandedCostPanel() {
  const { wf, landedDest, setLandedDest, displayCurrency, rates } = useApp();
  const r = wf.landed[landedDest];
  const profile = LOGISTICS[landedDest];
  const order = wf.order;

  return (
    <Section tourId="landed">
      <Card className="h-full">
        <SectionHeader eyebrow="Agent 4 · Landed Cost Calculator" title="Стоимость до двери и КП клиенту" right={<CurrencySwitch />} />
        <div role="tablist" aria-label="Пункт назначения" className="flex flex-wrap gap-2 px-4 pt-4 sm:px-6">
          {(Object.keys(LOGISTICS) as DestinationCode[]).map((d) => (
            <button key={d} role="tab" type="button" aria-selected={landedDest === d} onClick={() => setLandedDest(d)}
              className={cn("min-h-11 rounded-xl border px-3 text-sm", landedDest === d ? "border-primary bg-primary-soft font-semibold text-primary" : "border-border text-muted hover:text-fg")}>
              {LOGISTICS[d].label.ru}
            </button>
          ))}
        </div>

        {!r || !order ? (
          <EmptyState icon={<Calculator className="size-5" />} title="Расчёт появится после переговоров" hint="Agent 4 берёт согласованную цену FOB, добавляет фрахт, пошлину, НДС и сборы и пересчитывает в ₸ ₽ ¥ $." />
        ) : (
          <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-12">
            <motion.div key={landedDest} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 lg:col-span-5">
              <div>
                <p className="text-xs text-muted">За станок, до двери</p>
                <MoneyQuad amount={r.perUnit} size="lg" />
              </div>
              <div>
                <p className="text-xs text-muted">Вся партия, {r.quantity} шт</p>
                <MoneyQuad amount={r.total} />
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge tone={r.vsTarget >= 0 ? "success" : "warning"}>
                    {r.vsTarget >= 0 ? `на ${pct(r.vsTarget)} ниже цели` : `на ${pct(-r.vsTarget)} выше цели`} (без НДС)
                  </Badge>
                  <Badge icon={<Train className="size-3" />}>{profile.transitDays} дней в пути</Badge>
                </div>
              </div>
            </motion.div>

            {/* Структура стоимости */}
            <div className="min-w-0 space-y-4 lg:col-span-7">
              <div className="flex h-3 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                {r.lines.map((l, i) => (
                  <motion.div key={l.key} className={BAR_TONE[i % BAR_TONE.length]} initial={{ width: 0 }} animate={{ width: `${(l.usd / r.totalUsd) * 100}%` }} transition={{ duration: 0.6, delay: i * 0.05 }} />
                ))}
              </div>
              <table className="mt-3 w-full text-sm">
                <tbody>
                  {r.lines.map((l, i) => (
                    <tr key={l.key} className="border-b border-border last:border-0">
                      <td className="py-1.5 pr-2">
                        <span className={cn("mr-2 inline-block size-2.5 rounded-sm align-middle", BAR_TONE[i % BAR_TONE.length])} />
                        {l.label.ru}
                        {l.note && <span className="block pl-[1.125rem] text-xs text-muted">{l.note}</span>}
                      </td>
                      <td className="num py-1.5 text-right whitespace-nowrap">{formatMoney(convert(l.usd, "USD", displayCurrency, rates.perUsd), displayCurrency)}</td>
                      <td className="num w-14 py-1.5 text-right text-xs text-muted">{pct(l.usd / r.totalUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 p-3 text-xs text-muted">
              <span>Пошлина и НДС — параметры профиля, перед КП сверяются с брокером. Маршрут: {profile.route.ru}.</span>
              <Button size="sm" variant="primary" type="button" title="В прототипе PDF не генерируется: см. backend_blueprint">
                <FileDown className="size-4" /> КП в PDF
              </Button>
            </div>
            </div>
          </div>
        )}
      </Card>
    </Section>
  );
}

const pct = (x: number) => `${(x * 100).toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
