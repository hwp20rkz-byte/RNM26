"use client";

import { useMemo } from "react";
import type { Analysis } from "@/domain/planner/analyze";
import { LANGS, useT } from "@/i18n";
import { useConfigurator } from "@/store/configurator";
import { Button, Note, Panel } from "../configurator/controls";
import { download } from "../configurator/format";
import { Album, albumSheets } from "../documents/album/Album";
import { albumHtml } from "../documents/album/exportAlbum";
import type { SheetMeta } from "../documents/album/sheet";
import { printHtml } from "../documents/exportEstimate";

export function useSheetMeta(): SheetMeta {
  const t = useT();
  const { planner, building } = useConfigurator();
  const doc = planner.doc;
  return {
    code: doc.code,
    object: `${t.dyn(`product.${building.productId}`)} ${building.length / 1000} × ${building.width / 1000} ${t("unit.m")}`,
    org: doc.org,
    stage: doc.stage,
    developer: doc.developer,
    date: new Date().toLocaleDateString(LANGS.find((l) => l.id === t.lang)!.locale, { month: "2-digit", year: "2-digit" }),
    labels: {
      developer: t("tb.developer"),
      checked: t("tb.checked"),
      nControl: t("tb.nControl"),
      gip: t("tb.gip"),
      stage: t("tb.stage"),
      sheet: t("tb.sheet"),
      sheets: t("tb.sheets"),
      change: t("tb.change"),
      qty: t("tb.qty"),
      doc: t("tb.doc"),
      sign: t("tb.sign"),
      dateL: t("tb.date"),
    },
  };
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-ink-mute">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="h-11 rounded-lg border border-line bg-surface px-2 text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
    </label>
  );
}

export function DrawingsPanel({ a }: { a: Analysis }) {
  const t = useT();
  const { planner, setPlanner, building } = useConfigurator();
  const meta = useSheetMeta();
  const html = LANGS.find((l) => l.id === t.lang)!.html;
  const sheets = useMemo(() => albumSheets(a, t.dyn), [a, t.dyn]);
  const setDoc = (patch: Partial<typeof planner.doc>) => setPlanner({ doc: { ...planner.doc, ...patch } });
  return (
    <>
      <Panel title={t("dr.title")}>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="primary" onClick={() => printHtml(albumHtml(a, meta, t.dyn, html))}>
            {t("dr.pdf")}
          </Button>
          <Button onClick={() => download(`lstk-${building.productId}-album.html`, albumHtml(a, meta, t.dyn, html), "text/html;charset=utf-8")}>{t("dr.html")}</Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("dr.code")} value={planner.doc.code} onChange={(code) => setDoc({ code })} />
          <Field label={t("dr.stage")} value={planner.doc.stage} onChange={(stage) => setDoc({ stage })} />
          <Field label={t("dr.org")} value={planner.doc.org} onChange={(org) => setDoc({ org })} />
          <Field label={t("dr.developer")} value={planner.doc.developer} onChange={(developer) => setDoc({ developer })} />
        </div>
        <Note>{t("dr.note")}</Note>
      </Panel>
      <Panel title={t("dr.sheets", { n: sheets.length })}>
        <ol className="flex flex-col gap-1 text-sm">
          {sheets.map((s, i) => (
            <li key={i} className="flex gap-2">
              <span className="w-6 tabular-nums text-ink-mute">{i + 1}</span>
              {s.title}
            </li>
          ))}
        </ol>
      </Panel>
      <Panel title={t("dr.preview")}>
        <div className="album-preview flex max-h-[70vh] flex-col gap-3 overflow-y-auto rounded-lg bg-sunken p-2">
          <Album a={a} meta={meta} d={t.dyn} />
        </div>
      </Panel>
    </>
  );
}
