"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, FileSearch, HelpCircle, Info } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { useApp } from "@/state/AppProvider";
import { Badge, Card, EmptyState, Section, SectionHeader } from "@/components/ui";

export function SpecAnalysisPanel() {
  const { wf } = useApp();
  const a = wf.analysis;
  const [rfqLang, setRfqLang] = useState<"split" | "en" | "zh">("split");

  return (
    <Section tourId="analysis">
      <Card>
        <SectionHeader eyebrow="Agent 1 · TechSpec Analyst" title="ТЗ, код ТН ВЭД, комплаенс и двуязычный RFQ" />
        {!a ? (
          <EmptyState icon={<FileSearch className="size-5" />} title="Ожидает разбора заявки" hint="Agent 1 извлечёт параметры из свободного текста клиента и подготовит RFQ на английском и китайском." />
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 gap-4 p-4 sm:p-6 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-5">
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-2/60 text-xs text-muted">
                      <th className="px-3 py-2 text-left font-medium">Параметр</th>
                      <th className="px-3 py-2 text-left font-medium">Значение</th>
                      <th className="px-3 py-2 text-right font-medium">Увер.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.specs.map((s, i) => (
                      <motion.tr key={s.key} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="border-b border-border last:border-0">
                        <td className="px-3 py-2">
                          {s.label.ru}
                          <span className="zh block text-xs text-muted">{s.label.zh}</span>
                        </td>
                        <td className="px-3 py-2">
                          {s.value}
                          {s.source === "standard" && <span className="block text-xs text-warning">типовое значение класса, уточнить</span>}
                        </td>
                        <td className={cn("num px-3 py-2 text-right", s.confidence < 0.85 ? "text-warning" : "text-muted")}>{Math.round(s.confidence * 100)}%</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted">Код ТН ВЭД ЕАЭС</p>
                  <Badge tone={a.hs.confidence >= 0.85 ? "success" : "warning"}>уверенность {Math.round(a.hs.confidence * 100)}%</Badge>
                </div>
                <p className="num mt-1 text-lg font-semibold">{a.hs.code}</p>
                <p className="text-sm">{a.hs.description.ru}</p>
                <p className="mt-1 text-xs text-muted">Пошлина в расчёте: {Math.round(a.hs.dutyRate * 100)}%. {a.hs.notes}</p>
              </div>
              <ul className="space-y-2">
                {a.compliance.map((f) => (
                  <li key={f.id} className={cn("flex gap-2 rounded-xl p-3 text-sm", f.severity === "warn" ? "bg-warning-soft" : "bg-primary-soft/60")}>
                    {f.severity === "warn" ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" /> : <Info className="mt-0.5 size-4 shrink-0 text-primary" />}
                    <span>{f.text.ru}</span>
                  </li>
                ))}
              </ul>
              <div>
                <p className="mb-2 flex items-center gap-2 text-xs font-medium text-muted"><HelpCircle className="size-3.5" /> Вопросы клиенту (отправлены в Telegram)</p>
                <ul className="space-y-1 text-sm">
                  {a.clarifyingQuestions.map((q) => <li key={q.ru} className="rounded-lg bg-surface-2 px-3 py-2">{q.ru}</li>)}
                </ul>
              </div>
            </div>

            <div id="rfq" className="min-w-0 lg:col-span-7">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">RFQ для заводов</p>
                <div role="group" aria-label="Язык RFQ" className="inline-flex rounded-xl border border-border p-0.5 text-xs">
                  {(["split", "en", "zh"] as const).map((k) => (
                    <button key={k} type="button" aria-pressed={rfqLang === k} onClick={() => setRfqLang(k)} className={cn("min-h-8 rounded-lg px-3", rfqLang === k ? "bg-surface-2 font-semibold" : "text-muted")}>
                      {k === "split" ? "EN + 中文" : k === "en" ? "English" : "简体中文"}
                    </button>
                  ))}
                </div>
              </div>
              <div className={cn("grid gap-3", rfqLang === "split" && "md:grid-cols-2")}>
                <AnimatePresence initial={false}>
                  {rfqLang !== "zh" && (
                    <motion.div key="en" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-w-0 rounded-xl border border-border bg-surface-2/50 p-3">
                      <p className="mb-2 text-xs font-semibold">{a.rfq.subject.en}</p>
                      <pre className="font-sans text-xs leading-relaxed whitespace-pre-wrap">{a.rfq.en}</pre>
                    </motion.div>
                  )}
                  {rfqLang !== "en" && (
                    <motion.div key="zh" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-w-0 rounded-xl border border-border bg-surface-2/50 p-3">
                      <p className="zh mb-2 text-xs font-semibold">{a.rfq.subject.zh}</p>
                      <pre className="zh text-xs leading-relaxed whitespace-pre-wrap">{a.rfq.zh}</pre>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </Card>
    </Section>
  );
}
