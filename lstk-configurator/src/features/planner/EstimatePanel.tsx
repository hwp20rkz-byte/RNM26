"use client";

import { useState } from "react";
import type { Analysis } from "@/domain/planner/analyze";
import { useT } from "@/i18n";
import { useConfigurator } from "@/store/configurator";
import { Button, Note, NumberInput, Panel, Stat, Stats, Toggle } from "../configurator/controls";
import { download, int, money, one } from "../configurator/format";
import { estLabel, unitLabel } from "../documents/estimateLabels";
import { estimateCsv, estimateHtml, estimateXlsx, printHtml, type DocMeta } from "../documents/exportEstimate";
import { LANGS } from "@/i18n";

/** One tonal ramp of the accent per section: the bar reads as one system, not a rainbow */
const shade = (i: number, n: number) => `hsl(212 55% ${28 + (i / Math.max(1, n - 1)) * 50}%)`;

export function useDocMeta(a: Analysis): DocMeta {
  const t = useT();
  const s = useConfigurator();
  return {
    title: `${t.dyn(`product.${s.building.productId}`)} ${one(s.building.length / 1000)} × ${one(s.building.width / 1000)} ${t("unit.m")}`,
    city: a.city.name[t.lang],
    date: new Date().toLocaleDateString(LANGS.find((l) => l.id === t.lang)!.locale),
    size: `${one(a.size.length / 1000)} × ${one(a.size.width / 1000)} × ${one(a.size.height / 1000)} ${t("unit.m")}`,
    lang: LANGS.find((l) => l.id === t.lang)!.html,
    dyn: t.dyn,
  };
}

export function EstimatePanel({ a }: { a: Analysis }) {
  const t = useT();
  const { planner: p, setPlanner, prices, setPrices, building } = useConfigurator();
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const e = a.estimate;
  const meta = useDocMeta(a);
  const locale = LANGS.find((l) => l.id === t.lang)!.locale;
  const area = a.areas.floor || a.areas.footprint;
  const name = `lstk-${building.productId}-${t("doc.fileEstimate")}`;
  return (
    <>
      <Panel title={t("estimate.total")}>
        <div className="flex flex-col gap-1">
          <p className="text-sm text-ink-mute">{t(p.vat ? "doc.totalVat" : "doc.total")}</p>
          <p className="text-lg font-bold tabular-nums text-primary">{money(e.total)}</p>
          <p className="text-sm tabular-nums text-ink-mute">
            {t("estimate.cost")} {money(e.cost)} · {money(e.total / Math.max(1, area))}/{t("unit.m2")}
          </p>
        </div>
        <div className="flex h-4 w-full overflow-hidden rounded-full" role="img" aria-label={t("estimate.structure")}>
          {e.sections.map((s, i) => (
            <span key={s.id} style={{ width: `${(s.total / e.direct) * 100}%`, background: shade(i, e.sections.length) }} title={`${t.dyn(`estsec.${s.id}`)} ${one((s.total / e.direct) * 100)}%`} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="primary"
            onClick={async () => {
              setBusy(true);
              try {
                download(`${name}.xlsx`, await estimateXlsx(a, meta), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "…" : "Excel (XLSX)"}
          </Button>
          <Button onClick={() => printHtml(estimateHtml(a, meta, locale))}>PDF</Button>
          <Button onClick={() => download(`${name}.doc`, estimateHtml(a, meta, locale), "application/msword")}>Word (DOC)</Button>
          <Button onClick={() => download(`${name}.csv`, estimateCsv(a, meta), "text/csv;charset=utf-8")}>CSV</Button>
          <Button onClick={() => download(`${name}.html`, estimateHtml(a, meta, locale), "text/html;charset=utf-8")}>HTML</Button>
          <Button onClick={() => download(`${name}.json`, JSON.stringify({ meta: { ...meta, dyn: undefined }, estimate: e }, null, 2), "application/json")}>JSON</Button>
        </div>
        <Note>{t("doc.xlsxNote")}</Note>
      </Panel>

      <Panel title={t("estimate.lines")}>
        <ul className="flex flex-col">
          {e.sections.map((s, i) => (
            <li key={s.id} className="border-t border-line first:border-t-0">
              <button type="button" aria-expanded={open === s.id} onClick={() => setOpen(open === s.id ? null : s.id)} className="flex min-h-11 w-full items-center gap-2 py-2 text-left text-sm">
                <span className="size-3 shrink-0 rounded-sm" style={{ background: shade(i, e.sections.length) }} />
                <span className="w-6 tabular-nums text-ink-mute">{s.code}</span>
                <span className="flex-1 font-medium">{t.dyn(`estsec.${s.id}`)}</span>
                <span className="tabular-nums">{money(s.total)}</span>
                <span className="text-ink-mute" aria-hidden="true">
                  {open === s.id ? "−" : "+"}
                </span>
              </button>
              {open === s.id && (
                <div className="overflow-x-auto pb-2">
                  <table className="w-full text-xs tabular-nums">
                    <thead className="text-ink-mute">
                      <tr>
                        <th className="py-1 text-left font-normal">{t("doc.item")}</th>
                        <th className="text-right font-normal">{t("doc.qty")}</th>
                        <th className="text-right font-normal">{t("doc.amount")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.lines.map((l) => (
                        <tr key={l.code} className="border-t border-line align-top">
                          <td className="py-1 pr-2">
                            <span className="text-ink-mute">{l.code}</span> {estLabel(l.id, t.dyn)}
                          </td>
                          <td className="whitespace-nowrap text-right">
                            {l.qty >= 100 ? int(l.qty) : one(l.qty)} {unitLabel(l.unit, t.dyn)}
                          </td>
                          <td className="whitespace-nowrap pl-2 text-right">{money(l.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </li>
          ))}
        </ul>
        <Stats>
          <Stat label={t("doc.direct")} value={money(e.direct)} />
          <Stat label={`${t("doc.overhead")} ${p.overheadPct}%`} value={money(e.overhead)} />
          <Stat label={`${t("doc.contingency")} ${p.contingencyPct}%`} value={money(e.contingency)} />
          <Stat strong label={t("doc.cost")} value={money(e.cost)} />
          <Stat label={`${t("doc.margin")} ${p.marginPct}%`} value={money(e.margin)} />
          {p.vat && <Stat label={`${t("doc.vat")} 12%`} value={money(e.vat)} />}
          <Stat strong label={t(p.vat ? "doc.totalVat" : "doc.total")} value={money(e.total)} />
        </Stats>
      </Panel>

      <Panel title={t("estimate.energy")}>
        <Stats>
          <Stat label={t("estimate.lineHours")} value={`${one(a.energy.lineHours)} ${t("unit.h")}`} />
          <Stat label={t("estimate.stops")} value={int(a.energy.stops)} />
          <Stat label={t("estimate.shopHours")} value={`${one(a.energy.assemblyHours)} ${t("unit.h")}`} />
          <Stat label={t("estimate.kwh")} value={`${one(a.energy.kWh)} ${t("unit.kwh")}`} />
          <Stat strong label={t("estimate.energyCost", { tariff: p.tariff })} value={money(a.energy.cost)} />
        </Stats>
        <Note>{t("estimate.energyNote")}</Note>
      </Panel>

      <Panel title={t("estimate.inputs")}>
        <div className="grid grid-cols-2 gap-3">
          <NumberInput label={t("estimate.tariff")} unit={t("unit.tgKwh")} value={p.tariff} min={0} max={200} step={0.5} onChange={(tariff) => setPlanner({ tariff })} />
          <NumberInput label={t("estimate.labour")} unit={t("unit.tgH")} value={p.labourRate} min={0} max={20000} step={100} onChange={(labourRate) => setPlanner({ labourRate })} />
          <NumberInput label={t("estimate.steel")} unit={t("unit.tgKg")} value={prices.steelPerKg} min={0} max={5000} step={10} onChange={(steelPerKg) => setPrices({ steelPerKg })} />
          <NumberInput label={t("estimate.scrap")} unit="%" value={prices.scrapPct} min={0} max={50} step={0.5} onChange={(scrapPct) => setPrices({ scrapPct })} />
          <NumberInput label={t("doc.overhead")} unit="%" value={p.overheadPct} min={0} max={50} step={0.5} onChange={(overheadPct) => setPlanner({ overheadPct })} />
          <NumberInput label={t("doc.contingency")} unit="%" value={p.contingencyPct} min={0} max={30} step={0.5} onChange={(contingencyPct) => setPlanner({ contingencyPct })} />
          <NumberInput label={t("estimate.margin")} unit="%" value={p.marginPct} min={0} max={200} step={1} onChange={(marginPct) => setPlanner({ marginPct })} />
          <NumberInput label={t("doc.designRate")} unit={t("unit.tgM2")} value={p.designPerM2} min={0} max={50000} step={100} onChange={(designPerM2) => setPlanner({ designPerM2 })} />
        </div>
        <Toggle label={t("doc.vatToggle")} checked={p.vat} onChange={(vat) => setPlanner({ vat })} />
        <Note>{t("estimate.note")}</Note>
      </Panel>
    </>
  );
}
