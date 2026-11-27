"use client";

import { AnimatePresence, motion } from "motion/react";
import { Calculator, Send, X } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { SERVICE_CATALOG, LOGISTICS } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { convert, formatMoney, priceServices } from "@/lib/currencyEngine";
import { useApp } from "@/state/AppProvider";
import { CURRENCIES, type CurrencyCode, type DestinationCode, type ProductCategory } from "@/types/sourcing";
import { Badge, Button } from "@/components/ui";

const CATEGORY_LABEL: Record<ProductCategory, string> = {
  consumer: "Потребительские товары ×1,0",
  industrial: "Промышленные изделия ×1,25",
  machinery: "Станки и оборудование ×1,5",
};

const FEE_ORDER = ["KZT", "RUB", "CNY", "USD"] as const;

const field = "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-primary";
const label = "mb-1 block text-xs font-medium text-muted";

export function OrderIntakeModal({ onSubmitted }: { onSubmitted?: () => void }) {
  const { intakeOpen, closeIntake, draft, patchDraft, submitIntake, rates, pricing, setPricing, focusId, lang } = useApp();
  const dialogRef = useRef<HTMLDivElement>(null);

  const goodsValueUsd = convert(draft.targetPrice.amount * draft.quantity, draft.targetPrice.currency, "USD", rates.perUsd);
  const quote = useMemo(
    () =>
      priceServices({
        services: draft.services,
        catalog: SERVICE_CATALOG,
        category: draft.category,
        urgency: draft.urgency,
        goodsValueUsd,
        rates: rates.perUsd,
        pricing,
        lang,
      }),
    [draft.services, draft.category, draft.urgency, goodsValueUsd, rates, pricing, lang],
  );

  useEffect(() => {
    if (!intakeOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeIntake();
    window.addEventListener("keydown", onKey);
    dialogRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [intakeOpen, closeIntake]);

  const toggleService = (id: (typeof SERVICE_CATALOG)[number]["id"]) =>
    patchDraft({ services: draft.services.includes(id) ? draft.services.filter((s) => s !== id) : [...draft.services, id] });

  return (
    <AnimatePresence>
      {intakeOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-fg/30 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && closeIntake()}
        >
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="intake-title"
            className="flex max-h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl border border-border bg-surface shadow-card outline-none sm:rounded-3xl"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
          >
            <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
              <div>
                <p className="font-mono text-xs font-semibold uppercase tracking-wider text-accent">Новая заявка</p>
                <h2 id="intake-title" className="text-lg font-semibold">Запрос на поиск товара в Китае</h2>
              </div>
              <Button variant="ghost" aria-label="Закрыть" onClick={closeIntake} className="min-w-11 px-0">
                <X className="size-5" />
              </Button>
            </header>

            <div className="grid grid-cols-1 min-h-0 flex-1 overflow-y-auto lg:grid-cols-12">
              {/* Форма */}
              <div
                id="intake-form"
                data-tour-focus={focusId === "intake-form" ? "true" : undefined}
                className="space-y-4 p-4 sm:p-6 lg:col-span-7"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="f-company" className={label}>Клиент</label>
                    <input id="f-company" className={field} value={draft.company} onChange={(e) => patchDraft({ company: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="f-title" className={label}>Товар</label>
                    <input id="f-title" className={field} value={draft.title} onChange={(e) => patchDraft({ title: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label htmlFor="f-raw" className={label}>Текст заявки и спецификация (как прислал клиент)</label>
                  <textarea id="f-raw" rows={5} className={cn(field, "resize-y leading-relaxed")} value={draft.rawText} onChange={(e) => patchDraft({ rawText: e.target.value })} />
                  <p className="mt-1 text-xs text-muted">Агент 1 сам извлечёт параметры, код ТН ВЭД и составит RFQ на английском и китайском.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor="f-qty" className={label}>Количество</label>
                    <input id="f-qty" type="number" min={1} className={cn(field, "num")} value={draft.quantity} onChange={(e) => patchDraft({ quantity: Math.max(1, Number(e.target.value) || 1) })} />
                  </div>
                  <div>
                    <label htmlFor="f-target" className={label}>Целевая цена за единицу</label>
                    <div className="flex gap-2">
                      <input id="f-target" type="number" min={0} className={cn(field, "num")} value={draft.targetPrice.amount} onChange={(e) => patchDraft({ targetPrice: { ...draft.targetPrice, amount: Number(e.target.value) || 0 } })} />
                      <select aria-label="Валюта цели" className={cn(field, "w-20")} value={draft.targetPrice.currency} onChange={(e) => patchDraft({ targetPrice: { ...draft.targetPrice, currency: e.target.value as CurrencyCode } })}>
                        {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="f-dest" className={label}>Доставка</label>
                    <select id="f-dest" className={field} value={draft.destination} onChange={(e) => patchDraft({ destination: e.target.value as DestinationCode })}>
                      {Object.values(LOGISTICS).map((l) => <option key={l.destination} value={l.destination}>{l.label.ru}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="f-cat" className={label}>Категория сложности</label>
                    <select id="f-cat" className={field} value={draft.category} onChange={(e) => patchDraft({ category: e.target.value as ProductCategory })}>
                      {(Object.keys(CATEGORY_LABEL) as ProductCategory[]).map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                    </select>
                  </div>
                  <fieldset>
                    <legend className={label}>Срочность</legend>
                    <div className="flex gap-2">
                      {(["standard", "rush"] as const).map((u) => (
                        <button key={u} type="button" aria-pressed={draft.urgency === u} onClick={() => patchDraft({ urgency: u })}
                          className={cn("min-h-11 flex-1 rounded-xl border px-3 text-sm transition-colors", draft.urgency === u ? "border-primary bg-primary-soft text-primary" : "border-border text-muted hover:text-fg")}>
                          {u === "standard" ? "Стандарт" : "Срочно ×1,35"}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </div>
                <fieldset>
                  <legend className={label}>Услуги агентства</legend>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {SERVICE_CATALOG.map((s) => {
                      const on = draft.services.includes(s.id);
                      return (
                        <label key={s.id} className={cn("flex min-h-11 cursor-pointer gap-3 rounded-xl border p-3 transition-colors", on ? "border-primary bg-primary-soft/60" : "border-border hover:bg-surface-2")}>
                          <input type="checkbox" className="mt-0.5 size-4 accent-[hsl(var(--primary))]" checked={on} onChange={() => toggleService(s.id)} />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium">{s.name.ru}</span>
                            <span className="block text-xs text-muted">{s.description.ru}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              </div>

              {/* Живой расчёт стоимости услуг */}
              <aside
                id="intake-fees"
                data-tour-focus={focusId === "intake-fees" ? "true" : undefined}
                className="space-y-4 border-t border-border bg-surface-2/60 p-4 sm:p-6 lg:col-span-5 lg:border-t-0 lg:border-l"
              >
                <div className="flex items-center gap-2">
                  <Calculator className="size-4 text-primary" />
                  <h3 className="text-sm font-semibold">Стоимость услуг: расчёт в реальном времени</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="primary">категория ×{quote.multipliers.category.toLocaleString("ru-RU")}</Badge>
                  <Badge tone={quote.multipliers.rush > 1 ? "warning" : "neutral"}>срочность ×{quote.multipliers.rush.toLocaleString("ru-RU")}</Badge>
                  <Badge>товар ≈ {formatMoney(goodsValueUsd, "USD")}</Badge>
                </div>

                <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
                  <AnimatePresence initial={false}>
                    {quote.lines.map((l) => (
                      <motion.li key={l.serviceId} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-3">
                        <p className="text-sm font-medium">{l.name}</p>
                        <div className="num mt-1 grid grid-cols-2 gap-x-3 text-xs sm:grid-cols-4">
                          {FEE_ORDER.map((c) => <span key={c} className={c === "KZT" ? "font-semibold text-fg" : "text-muted"}>{formatMoney(l.price[c], c)}</span>)}
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                  <li className="rounded-b-xl bg-primary-soft/60 p-3">
                    <p className="text-sm font-semibold">Итого к оплате клиентом</p>
                    <div className="num mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-sm font-semibold">
                      {FEE_ORDER.map((c) => <span key={c}>{formatMoney(quote.total[c], c)}</span>)}
                    </div>
                  </li>
                </ul>

                <div className="space-y-2 rounded-xl border border-border bg-surface p-3">
                  <label htmlFor="f-margin" className="flex items-center justify-between text-xs text-muted">
                    <span>Маржа агентства</span>
                    <span className="num font-semibold text-fg">{Math.round(pricing.agencyMargin * 100)}% · {formatMoney(quote.marginUsd, "USD")}</span>
                  </label>
                  <input id="f-margin" type="range" min={0.1} max={0.6} step={0.01} value={pricing.agencyMargin} onChange={(e) => setPricing({ ...pricing, agencyMargin: Number(e.target.value) })} className="w-full accent-[hsl(var(--primary))]" />
                  <label htmlFor="f-spread" className="flex items-center justify-between text-xs text-muted">
                    <span>Спред на конвертацию</span>
                    <span className="num font-semibold text-fg">{(pricing.fxSpread * 100).toFixed(1)}%</span>
                  </label>
                  <input id="f-spread" type="range" min={0} max={0.04} step={0.001} value={pricing.fxSpread} onChange={(e) => setPricing({ ...pricing, fxSpread: Number(e.target.value) })} className="w-full accent-[hsl(var(--primary))]" />
                </div>
                <p className="text-xs text-muted">
                  Курс: {rates.sourceLabel}, 1 $ = {rates.perUsd.RUB.toLocaleString("ru-RU")} ₽ = {rates.perUsd.KZT.toLocaleString("ru-RU")} ₸ = {rates.perUsd.CNY.toLocaleString("ru-RU")} ¥. Оферта фиксирует курс на 3 дня.
                </p>
                <Button
                  variant="primary"
                  className="w-full"
                  disabled={draft.services.length === 0}
                  onClick={() => {
                    submitIntake();
                    onSubmitted?.();
                  }}
                >
                  <Send className="size-4" />
                  Отправить оферту и запустить агентов
                </Button>
              </aside>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
