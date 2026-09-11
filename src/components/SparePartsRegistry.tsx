"use client";

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, FileSpreadsheet, Package, Plus, Printer, Trash2, Upload, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InlineNumber, InlineText } from "@/components/InlineEdit";
import { useProjectsStore } from "@/store/useProjectsStore";
import { useActiveProject } from "@/store/hooks";
import { computeStockStatus } from "@/lib/calculator/inventoryEngine";
import { buildLabelSheetHtml, openLabelSheet } from "@/lib/inventory/qrLabels";
import { parseInventoryListFile, type ParseInventoryListResult } from "@/lib/import/parseInventoryList";
import { downloadBlob } from "@/lib/export/download";
import { formatKzt } from "@/lib/utils";
import { SPARE_PART_CATEGORY_LABELS, type SparePartCategory } from "@/lib/calculator/types";
import { genId } from "@/lib/id";
import { useT } from "@/lib/i18n/useT";

const CATEGORIES = Object.keys(SPARE_PART_CATEGORY_LABELS) as SparePartCategory[];

export function SparePartsRegistry() {
  const t = useT();
  const project = useActiveProject();
  const addSparePart = useProjectsStore((s) => s.addSparePart);
  const updateSparePart = useProjectsStore((s) => s.updateSparePart);
  const removeSparePart = useProjectsStore((s) => s.removeSparePart);
  const importSpareParts = useProjectsStore((s) => s.importSpareParts);

  const [newCategory, setNewCategory] = useState<SparePartCategory>("consumable");
  const [printBusy, setPrintBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [preview, setPreview] = useState<ParseInventoryListResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setImportError(null);
    try {
      const result = await parseInventoryListFile(file);
      if (result.rows.length === 0) {
        setImportError(t("sprImportErrorNoRows"));
        return;
      }
      setPreview(result);
    } catch {
      setImportError(t("sprImportErrorReadFail"));
    }
  }

  function confirmImport() {
    if (!preview) return;
    importSpareParts(preview.rows);
    setPreview(null);
  }

  async function handleExport() {
    setExportBusy(true);
    try {
      const { exportInventoryToExcelBlob } = await import("@/lib/export/exportInventoryToExcel");
      const assetNameById = new Map(project.assets.map((a) => [a.id, a.name]));
      const blob = await exportInventoryToExcelBlob(project.name, project.spareParts, project.maintenanceLogs, assetNameById);
      downloadBlob(blob, `Склад_и_списания_${project.name.replace(/[^\p{L}\p{N}]+/gu, "_")}.xlsx`);
    } finally {
      setExportBusy(false);
    }
  }

  const rows = useMemo(() => computeStockStatus(project.spareParts), [project.spareParts]);
  const deficitRows = rows.filter((r) => r.isLow);
  const totalValue = project.spareParts.reduce((sum, p) => sum + p.quantityOnHand * p.avgUnitPrice, 0);

  async function handlePrintLabel(id: string, name: string) {
    setPrintBusy(true);
    try {
      const qrCodeId = project.spareParts.find((p) => p.id === id)?.qrCodeId || id;
      if (!project.spareParts.find((p) => p.id === id)?.qrCodeId) {
        updateSparePart(id, { qrCodeId });
      }
      const html = await buildLabelSheetHtml([
        { title: name, qrValue: qrCodeId, subtitle: t("sprLabelSubtitle"), footer: project.name },
      ]);
      openLabelSheet(html);
    } finally {
      setPrintBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-emerald-600" />
          <CardTitle>{t("sprTitle")}</CardTitle>
        </div>
        <CardDescription>{t("sprDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
            <div className="text-xs text-slate-400">{t("sprItemsCountLabel")}</div>
            <div className="font-semibold tabular-nums">{project.spareParts.length}</div>
          </div>
          <div className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
            <div className="text-xs text-slate-400">{t("sprTotalValueLabel")}</div>
            <div className="font-semibold tabular-nums">{formatKzt(totalValue)}</div>
          </div>
          {deficitRows.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {t("sprDeficitPrefix")} {deficitRows.length} {t("sprDeficitMid")} {deficitRows.map((r) => r.item.name).join(", ")} {t("sprDeficitSuffix")}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as SparePartCategory)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {SPARE_PART_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <button
            onClick={() =>
              addSparePart({
                name: t("sprNewItemName"),
                unit: t("sprNewItemUnit"),
                category: newCategory,
                quantityOnHand: 0,
                minThreshold: 1,
                avgUnitPrice: 0,
                qrCodeId: genId("part"),
              })
            }
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
          >
            <Plus className="h-4 w-4" /> {t("sprAddButton")}
          </button>
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
            <Upload className="h-4 w-4" /> {t("sprImportButton")}
          </button>
          <button
            onClick={handleExport}
            disabled={exportBusy || project.spareParts.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-emerald-400 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <FileSpreadsheet className="h-4 w-4" /> {exportBusy ? t("sprExportBusy") : t("sprExportButton")}
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
              {t("sprColumnsIntro")}{preview.headerMap.name}{t("sprColumnsUnit")}{preview.headerMap.unit}
              {t("sprColumnsQty")}{preview.headerMap.quantity}{t("sprColumnsPrice")}{preview.headerMap.price}{t("pcColumnsEnd")}
            </p>
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
          {rows.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">{t("sprEmptyStock")}</p>
          )}
          {rows.map(({ item, isLow }) => (
            <div key={item.id} className="flex flex-wrap items-center gap-2 py-2.5">
              <Badge variant="outline">{SPARE_PART_CATEGORY_LABELS[item.category]}</Badge>
              <InlineText
                value={item.name}
                onChange={(v) => updateSparePart(item.id, { name: v })}
                className="min-w-[10rem] flex-1 font-medium"
              />
              <label className="flex items-center gap-1 text-xs text-slate-500">
                {t("sprStockLabel")}
                <InlineNumber
                  value={item.quantityOnHand}
                  onChange={(v) => updateSparePart(item.id, { quantityOnHand: v })}
                  className="w-16"
                />
              </label>
              <InlineText
                value={item.unit}
                onChange={(v) => updateSparePart(item.id, { unit: v })}
                className="w-14 text-slate-400"
              />
              <label className="flex items-center gap-1 text-xs text-slate-500">
                {t("sprMinThresholdLabel")}
                <InlineNumber
                  value={item.minThreshold}
                  onChange={(v) => updateSparePart(item.id, { minThreshold: v })}
                  className="w-14"
                />
              </label>
              <label className="flex items-center gap-1 text-xs text-slate-500">
                {t("sprPriceLabel")}
                <InlineNumber
                  value={item.avgUnitPrice}
                  onChange={(v) => updateSparePart(item.id, { avgUnitPrice: v })}
                  className="w-20"
                  step={10}
                />
              </label>
              {isLow && <Badge variant="danger">{t("sprDeficitBadge")}</Badge>}
              <button
                onClick={() => handlePrintLabel(item.id, item.name)}
                disabled={printBusy}
                className="rounded-md p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 dark:hover:bg-slate-800"
                title={t("sprPrintLabelTooltip")}
              >
                <Printer className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => removeSparePart(item.id)}
                className="rounded-md p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
