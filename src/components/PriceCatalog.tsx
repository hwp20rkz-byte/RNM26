"use client";

import { useMemo, useRef, useState } from "react";
import { BookOpen, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineNumber, InlineText } from "@/components/InlineEdit";
import { useProjectsStore } from "@/store/useProjectsStore";
import { useActiveProject } from "@/store/hooks";
import { parsePriceListFile, type ParsePriceListResult } from "@/lib/import/parsePriceList";
import { formatKzt } from "@/lib/utils";
import { useT } from "@/lib/i18n/useT";
import type { CostCategory } from "@/lib/calculator/types";

function flattenCategoryLabel(categories: CostCategory[], cat: CostCategory): string {
  return `${cat.code} ${cat.name}`;
}

export function PriceCatalog() {
  const catalog = useProjectsStore((s) => s.catalog);
  const addCatalogEntry = useProjectsStore((s) => s.addCatalogEntry);
  const updateCatalogEntry = useProjectsStore((s) => s.updateCatalogEntry);
  const removeCatalogEntry = useProjectsStore((s) => s.removeCatalogEntry);
  const importCatalogRows = useProjectsStore((s) => s.importCatalogRows);
  const insertCatalogEntryIntoProject = useProjectsStore((s) => s.insertCatalogEntryIntoProject);
  const project = useActiveProject();

  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<ParsePriceListResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetCategory, setTargetCategory] = useState<Record<string, string>>({});
  const t = useT();

  const categories = project.db.categories;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.tag ?? "").toLowerCase().includes(q),
    );
  }, [catalog, search]);

  async function handleFile(file: File) {
    setImportError(null);
    try {
      const result = await parsePriceListFile(file);
      if (result.rows.length === 0) {
        setImportError(t("pcImportErrorNoRows"));
        return;
      }
      setPreview(result);
    } catch {
      setImportError(t("pcImportErrorReadFail"));
    }
  }

  function confirmImport() {
    if (!preview) return;
    importCatalogRows(preview.rows);
    setPreview(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-600" />
            <CardTitle>{t("pcTitle")}</CardTitle>
          </div>
          <CardDescription>{t("pcDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("pcSearchPlaceholder")}
                className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <Upload className="h-4 w-4" /> {t("pcUploadButton")}
            </button>
            <button
              onClick={() =>
                addCatalogEntry({ name: t("pcNewEntryName"), unit: t("pcNewEntryUnit"), unitPrice: 0, defaultQty: 1 })
              }
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
            >
              <Plus className="h-4 w-4" /> {t("pcNewEntryButton")}
            </button>
          </div>

          {importError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
              {importError}
            </div>
          )}

          {preview && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/60 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {t("pcPreviewTitle")} {preview.rows.length} {t("pcRowsWord")}
                  {preview.skipped ? `${t("pcSkippedPrefix")} ${preview.skipped}` : ""}
                </h4>
                <button onClick={() => setPreview(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                {t("pcColumnsIntro")}{preview.headerMap.name}{t("pcColumnsUnit")}
                {preview.headerMap.unit}{t("pcColumnsQty")}{preview.headerMap.qty}{t("pcColumnsPrice")}{preview.headerMap.price}{t("pcColumnsEnd")}
              </p>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white text-xs dark:border-slate-800 dark:bg-slate-900">
                <table className="w-full">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <th className="p-2 text-left">{t("pcTableName")}</th>
                      <th className="p-2 text-left">{t("pcTableUnit")}</th>
                      <th className="p-2 text-right">{t("pcTableQty")}</th>
                      <th className="p-2 text-right">{t("pcTablePrice")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 50).map((r, i) => (
                      <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="p-2">{r.name}</td>
                        <td className="p-2">{r.unit}</td>
                        <td className="p-2 text-right">{r.defaultQty}</td>
                        <td className="p-2 text-right">{formatKzt(r.unitPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.rows.length > 50 && (
                  <p className="p-2 text-center text-slate-400">{t("pcMoreRowsPrefix")} {preview.rows.length - 50}</p>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={confirmImport}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  {t("pcImportConfirmPrefix")} {preview.rows.length} {t("pcImportConfirmSuffix")}
                </button>
                <button
                  onClick={() => setPreview(null)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300"
                >
                  {t("pcCancelButton")}
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">
                {catalog.length === 0 ? t("pcEmptyCatalog") : t("pcNothingFound")}
              </p>
            )}
            {filtered.map((entry) => (
              <div key={entry.id} className="flex flex-wrap items-center gap-2 py-2">
                <InlineText
                  value={entry.name}
                  onChange={(v) => updateCatalogEntry(entry.id, { name: v })}
                  className="min-w-[12rem] flex-1 font-medium"
                />
                {entry.tag && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {entry.tag}
                  </span>
                )}
                <InlineNumber
                  value={entry.defaultQty}
                  onChange={(v) => updateCatalogEntry(entry.id, { defaultQty: v })}
                  className="w-16"
                  title={t("pcDefaultQtyTooltip")}
                />
                <InlineText
                  value={entry.unit}
                  onChange={(v) => updateCatalogEntry(entry.id, { unit: v })}
                  className="w-16 text-slate-400"
                />
                <span className="text-slate-300">×</span>
                <InlineNumber
                  value={entry.unitPrice}
                  onChange={(v) => updateCatalogEntry(entry.id, { unitPrice: v })}
                  className="w-24"
                  step={0.01}
                  title={t("pcPriceTooltip")}
                />
                <span className="text-xs text-slate-300">₸</span>

                <select
                  value={targetCategory[entry.id] ?? entry.suggestedCategoryId ?? categories[0]?.id}
                  onChange={(e) => setTargetCategory((s) => ({ ...s, [entry.id]: e.target.value }))}
                  className="h-8 max-w-[10rem] rounded-md border border-slate-200 bg-transparent px-1 text-xs text-slate-500 dark:border-slate-700"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {flattenCategoryLabel(categories, c)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() =>
                    insertCatalogEntryIntoProject(
                      entry.id,
                      targetCategory[entry.id] ?? entry.suggestedCategoryId ?? categories[0]?.id,
                    )
                  }
                  className="rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                >
                  {t("pcAddToProjectPrefix")}{project.name}{t("pcAddToProjectSuffix")}
                </button>
                <button
                  onClick={() => removeCatalogEntry(entry.id)}
                  className="rounded-md p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
