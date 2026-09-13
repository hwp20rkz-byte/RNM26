"use client";

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, FileSpreadsheet, Plus, Send, Trash2, Upload, Users, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InlineNumber, InlineText } from "@/components/InlineEdit";
import { useProjectsStore } from "@/store/useProjectsStore";
import { useActiveProject, useActiveTariff } from "@/store/hooks";
import { parseOwnersListFile, type ParseOwnersListResult } from "@/lib/import/parseOwnersList";
import { parseErcStatementFile, type ParseErcStatementResult } from "@/lib/import/parseErcStatement";
import {
  buildDebtNoticeMessage,
  buildWaLinkToPhone,
  computeRegistryTotals,
  computeUnitDebtStatus,
  computeUnitMonthlyAccrual,
  groupUnitsByAddress,
} from "@/lib/calculator/ownerRegistryEngine";
import { downloadBlob } from "@/lib/export/download";
import { formatKzt } from "@/lib/utils";
import { useT } from "@/lib/i18n/useT";
import { UNIT_TYPE_LABELS, type UnitType } from "@/lib/calculator/types";

const UNIT_TYPES = Object.keys(UNIT_TYPE_LABELS) as UnitType[];

export function OwnerRegistry() {
  const t = useT();
  const project = useActiveProject();
  const tariff = useActiveTariff();
  const addUnit = useProjectsStore((s) => s.addUnit);
  const updateUnit = useProjectsStore((s) => s.updateUnit);
  const removeUnit = useProjectsStore((s) => s.removeUnit);
  const removeUnits = useProjectsStore((s) => s.removeUnits);
  const importUnits = useProjectsStore((s) => s.importUnits);
  const importDebtStatement = useProjectsStore((s) => s.importDebtStatement);

  const [search, setSearch] = useState("");
  const [addressFilter, setAddressFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newType, setNewType] = useState<UnitType>("apartment");
  const [preview, setPreview] = useState<ParseOwnersListResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [debtPreview, setDebtPreview] = useState<ParseErcStatementResult | null>(null);
  const [debtPreviewSelectedAddresses, setDebtPreviewSelectedAddresses] = useState<Set<string>>(new Set());
  const [debtImportError, setDebtImportError] = useState<string | null>(null);
  const [debtImportResult, setDebtImportResult] = useState<{ created: number; updated: number } | null>(null);
  const debtFileInputRef = useRef<HTMLInputElement>(null);

  const units = project.units;
  const totals = useMemo(() => computeRegistryTotals(units), [units]);
  const addressGroups = useMemo(() => groupUnitsByAddress(units), [units]);
  const hasMultipleAddresses = addressGroups.length > 1;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return units.filter((u) => {
      if (addressFilter && (u.address ?? "") !== addressFilter) return false;
      if (!q) return true;
      return u.number.toLowerCase().includes(q) || u.ownerName.toLowerCase().includes(q);
    });
  }, [units, search, addressFilter]);

  // При нескольких адресах в реестре группируем видимый список по корпусу,
  // чтобы одинаковые номера квартир разных домов не сливались визуально —
  // когда выбран конкретный адрес в фильтре, группировка не нужна (уже один).
  const groupedFiltered = useMemo(() => {
    if (!hasMultipleAddresses || addressFilter) return null;
    const byAddress = new Map<string, typeof filtered>();
    for (const u of filtered) {
      const key = u.address?.trim() || "";
      const list = byAddress.get(key) ?? [];
      list.push(u);
      byAddress.set(key, list);
    }
    return addressGroups
      .map((g) => ({ address: g.address, units: byAddress.get(g.address) ?? [] }))
      .filter((g) => g.units.length > 0);
  }, [filtered, hasMultipleAddresses, addressFilter, addressGroups]);

  // Сверка с агрегированными площадями профиля объекта (Шаг 1) — расхождение
  // означает, что реестр неполон или профиль объекта не синхронизирован.
  // Смысла нет, если реестр охватывает несколько корпусов сразу (профиль —
  // на один дом) — тогда вместо неё показываем подытоги по каждому адресу.
  const livingMismatch = round2(totals.byType.apartment.area - project.building.livingArea);
  const commercialMismatch = round2(totals.byType.commercial.area - project.building.commercialArea);
  const storageMismatch = round2(totals.byType.storage.area - project.building.storageArea);
  const parkingMismatch = round2(totals.byType.parking.area - project.building.parkingArea);
  const hasMismatch =
    !hasMultipleAddresses &&
    (Math.abs(livingMismatch) > 0.5 ||
      Math.abs(commercialMismatch) > 0.5 ||
      Math.abs(storageMismatch) > 0.5 ||
      Math.abs(parkingMismatch) > 0.5);

  async function handleFile(file: File) {
    setImportError(null);
    try {
      const result = await parseOwnersListFile(file);
      if (result.rows.length === 0) {
        setImportError(t("orImportErrorNoRows"));
        return;
      }
      setPreview(result);
    } catch {
      setImportError(t("orImportErrorReadFail"));
    }
  }

  function confirmImport() {
    if (!preview) return;
    importUnits(preview.rows);
    setPreview(null);
  }

  async function handleDebtFile(file: File) {
    setDebtImportError(null);
    setDebtImportResult(null);
    try {
      const result = await parseErcStatementFile(file);
      if (result.units.length === 0) {
        setDebtImportError(t("orDebtImportErrorNoData"));
        return;
      }
      setDebtPreview(result);
      // По умолчанию выбраны все обнаруженные адреса — чтобы импортировать сразу
      // несколько/все корпуса за одно подтверждение, а не по одному.
      setDebtPreviewSelectedAddresses(new Set(result.addresses.map((a) => a.address)));
    } catch {
      setDebtImportError(t("orDebtImportErrorReadFail"));
    }
  }

  function toggleDebtPreviewAddress(address: string) {
    setDebtPreviewSelectedAddresses((prev) => {
      const next = new Set(prev);
      if (next.has(address)) next.delete(address);
      else next.add(address);
      return next;
    });
  }

  function confirmDebtImport() {
    if (!debtPreview) return;
    const unitsSelected = debtPreview.units.filter((u) => debtPreviewSelectedAddresses.has(u.address));
    if (unitsSelected.length === 0) return;
    const result = importDebtStatement(unitsSelected, debtPreview.period);
    setDebtImportResult(result);
    setDebtPreview(null);
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allVisibleSelected = filtered.length > 0 && filtered.every((u) => selectedIds.has(u.id));

  function toggleSelectAllVisible() {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        for (const u of filtered) next.delete(u.id);
        return next;
      }
      const next = new Set(prev);
      for (const u of filtered) next.add(u.id);
      return next;
    });
  }

  function deleteSelected() {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`${t("orBulkDeleteConfirmPrefix")}${selectedIds.size}${t("orBulkDeleteConfirmSuffix")}`)) return;
    removeUnits([...selectedIds]);
    setSelectedIds(new Set());
  }

  function clearWholeRegistry() {
    if (units.length === 0) return;
    if (!window.confirm(`${t("orClearRegistryConfirmPrefix")}${units.length}${t("orClearRegistryConfirmSuffix")}`)) return;
    removeUnits(units.map((u) => u.id));
    setSelectedIds(new Set());
  }

  function sendDebtReminder(unit: (typeof units)[number]) {
    if (!unit.ownerPhone) return;
    const status = computeUnitDebtStatus(unit);
    const message = buildDebtNoticeMessage(unit, status, project.name);
    window.open(buildWaLinkToPhone(unit.ownerPhone, message), "_blank");
  }

  function renderUnitRow(u: (typeof units)[number]) {
    const accrual = computeUnitMonthlyAccrual(u, tariff.tariffPerSqm, project.building);
    const share = totals.totalArea > 0 ? round2((u.area / totals.totalArea) * 100) : 0;
    const debt = u.debtImportedAt ? computeUnitDebtStatus(u) : null;
    return (
      <div
        key={u.id}
        className={
          debt?.isDebtor
            ? "flex flex-col gap-1.5 rounded-lg border-l-4 border-rose-500 bg-rose-50/70 py-2.5 pl-2 dark:bg-rose-950/20"
            : "flex flex-col gap-1.5 py-2.5"
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="checkbox"
            checked={selectedIds.has(u.id)}
            onChange={() => toggleSelected(u.id)}
            className="h-4 w-4 rounded border-slate-300"
            aria-label={t("orSelectRowLabel")}
          />
          <Badge variant="outline">{UNIT_TYPE_LABELS[u.unitType]}</Badge>
          <InlineText
            value={u.number}
            onChange={(v) => updateUnit(u.id, { number: v })}
            className="w-20 font-medium"
            placeholder={t("orNumberPlaceholder")}
          />
          <InlineText
            value={u.ownerName}
            onChange={(v) => updateUnit(u.id, { ownerName: v })}
            className="min-w-[10rem] flex-1"
            placeholder={t("orOwnerNamePlaceholder")}
          />
          <label className="flex items-center gap-1 text-xs text-slate-500">
            {t("orAreaLabel")}
            <InlineNumber value={u.area} onChange={(v) => updateUnit(u.id, { area: v })} className="w-16" step={0.1} />
          </label>
          <span className="text-xs tabular-nums text-slate-400">{t("orVoteSharePrefix")} {share}%</span>
          <span className="text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300">
            {formatKzt(accrual)}{t("orPerMonthSuffix")}
          </span>
          <button
            onClick={() => removeUnit(u.id)}
            className="rounded-md p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {debt?.isDebtor && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="danger">{t("orDebtorBadge")}</Badge>
            {debt.elevatorDebtKzt > 0 && (
              <span className="text-rose-700 dark:text-rose-300">
                {t("orDebtElevatorLabel")}: {formatKzt(debt.elevatorDebtKzt)} (≈{debt.elevatorDebtMonths} {t("orDebtMonthsSuffix")})
              </span>
            )}
            {debt.operationalDebtKzt > 0 && (
              <span className="text-rose-700 dark:text-rose-300">
                {t("orDebtOperationalLabel")}: {formatKzt(debt.operationalDebtKzt)} (≈{debt.operationalDebtMonths}{" "}
                {t("orDebtMonthsSuffix")})
              </span>
            )}
            {u.ownerPhone ? (
              <button
                onClick={() => sendDebtReminder(u)}
                className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-white px-2 py-1 font-medium text-rose-700 hover:border-rose-400 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-300"
              >
                <Send className="h-3 w-3" /> {t("orDebtWaButton")}
              </button>
            ) : (
              <span className="text-slate-400">({t("orDebtNoPhoneHint")})</span>
            )}
          </div>
        )}
        {u.source && (
          <Badge variant="outline" className="w-fit border-slate-300 text-[10px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {u.source}
          </Badge>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
          <InlineText
            value={u.address ?? ""}
            onChange={(v) => updateUnit(u.id, { address: v || undefined })}
            className="w-40"
            placeholder={t("orAddressPlaceholder")}
          />
          <label className="flex items-center gap-1">
            {t("orEntranceLabel")}
            <InlineNumber
              value={u.entrance ?? 0}
              onChange={(v) => updateUnit(u.id, { entrance: v || undefined })}
              className="w-12"
            />
          </label>
          <label className="flex items-center gap-1">
            {t("orFloorLabel")}
            <InlineNumber value={u.floor ?? 0} onChange={(v) => updateUnit(u.id, { floor: v || undefined })} className="w-12" />
          </label>
          <InlineText
            value={u.ownerPhone ?? ""}
            onChange={(v) => updateUnit(u.id, { ownerPhone: v || undefined })}
            className="w-28"
            placeholder={t("orPhonePlaceholder")}
          />
          <InlineText
            value={u.ownerEmail ?? ""}
            onChange={(v) => updateUnit(u.id, { ownerEmail: v || undefined })}
            className="w-40"
            placeholder={t("orEmailPlaceholder")}
          />
          <InlineText
            value={u.documentRef ?? ""}
            onChange={(v) => updateUnit(u.id, { documentRef: v || undefined })}
            className="w-40"
            placeholder={t("orDocumentPlaceholder")}
          />
        </div>
      </div>
    );
  }

  async function handleExport() {
    setExportBusy(true);
    try {
      const { exportOwnersToExcelBlob } = await import("@/lib/export/exportOwnersToExcel");
      const blob = await exportOwnersToExcelBlob(units, project.name, tariff.tariffPerSqm, project.building);
      downloadBlob(blob, `Реестр_собственников_${project.name.replace(/[^\p{L}\p{N}]+/gu, "_")}.xlsx`);
    } finally {
      setExportBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            <CardTitle>{t("orTitle")}</CardTitle>
          </div>
          <CardDescription>{t("orDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {UNIT_TYPES.map((ut) => (
              <div key={ut} className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
                <div className="text-xs text-slate-400">{UNIT_TYPE_LABELS[ut]}</div>
                <div className="font-semibold tabular-nums">{totals.byType[ut].count} {t("orCountSuffix")}</div>
                <div className="text-xs text-slate-500 tabular-nums">{totals.byType[ut].area} м²</div>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
            {t("orTotalPrefix")} <b>{totals.totalUnits}</b> {t("orTotalMid")}{" "}
            <b>{totals.totalArea.toLocaleString("ru-RU")} м²</b> {t("orTotalSuffix")}
          </div>

          {hasMismatch && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                {t("orMismatchIntro")}{" "}
                {livingMismatch !== 0 && <b>{fmtDiff(livingMismatch)} м²</b>}
                {livingMismatch === 0 && t("orMatches")}
                {t("orMismatchCommercial")} {fmtDiff(commercialMismatch)} м²
                {t("orMismatchStorage")} {fmtDiff(storageMismatch)} м²
                {t("orMismatchParking")} {fmtDiff(parkingMismatch)} м²{t("orMismatchOutro")}
              </p>
            </div>
          )}

          {hasMultipleAddresses && (
            <div className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{t("orMultiAddressNote")}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {addressGroups.map((g) => (
                  <Badge key={g.address || "—"} variant="outline" className="border-amber-300 text-amber-800 dark:border-amber-800 dark:text-amber-300">
                    {g.address || t("orAddressUnknown")}: {g.unitCount} {t("orAddressGroupUnitsWord")}, {g.totalArea.toLocaleString("ru-RU")} м²
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("orSearchPlaceholder")}
                className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            {addressGroups.length > 0 && (
              <select
                value={addressFilter}
                onChange={(e) => setAddressFilter(e.target.value)}
                className="h-9 max-w-[16rem] rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                title={t("orAddressFilterLabel")}
              >
                <option value="">{t("orAddressFilterAll")}</option>
                {addressGroups.map((g) => (
                  <option key={g.address || "—"} value={g.address}>
                    {g.address || t("orAddressUnknown")} ({g.unitCount})
                  </option>
                ))}
              </select>
            )}
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as UnitType)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              {UNIT_TYPES.map((ut) => (
                <option key={ut} value={ut}>
                  {UNIT_TYPE_LABELS[ut]}
                </option>
              ))}
            </select>
            <button
              onClick={() => addUnit({ unitType: newType, number: "", area: 0, ownerName: "", address: addressFilter || undefined })}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
            >
              <Plus className="h-4 w-4" /> {t("orAddButton")}
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
              <Upload className="h-4 w-4" /> {t("orImportButton")}
            </button>
            <input
              ref={debtFileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleDebtFile(f);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => debtFileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm font-medium text-rose-700 hover:border-rose-400 dark:border-rose-900 dark:bg-slate-900 dark:text-rose-300"
            >
              <Upload className="h-4 w-4" /> {t("orDebtImportButton")}
            </button>
            <button
              onClick={handleExport}
              disabled={exportBusy || units.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-emerald-400 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <FileSpreadsheet className="h-4 w-4" /> {exportBusy ? t("orExportBusy") : t("orExportButton")}
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
                  {t("orPreviewTitle")} {preview.rows.length} {t("orRowsWord")}
                  {preview.skipped ? `${t("orSkippedPrefix")} ${preview.skipped} ${t("orSkippedExplain")}` : ""}
                </h4>
                <button onClick={() => setPreview(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                {t("orColumnsIntro")}{preview.headerMap.unitType}{t("orColumnsNumber")}
                {preview.headerMap.number}{t("orColumnsArea")}{preview.headerMap.area}{t("orColumnsOwner")}
                {preview.headerMap.ownerName}{t("orColumnsEnd")}
              </p>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white text-xs dark:border-slate-800 dark:bg-slate-900">
                <table className="w-full">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <th className="p-2 text-left">{t("orTableType")}</th>
                      <th className="p-2 text-left">{t("orTableNumber")}</th>
                      <th className="p-2 text-right">{t("orTableArea")}</th>
                      <th className="p-2 text-left">{t("orTableOwner")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 50).map((r, i) => (
                      <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="p-2">{UNIT_TYPE_LABELS[r.unitType]}</td>
                        <td className="p-2">{r.number}</td>
                        <td className="p-2 text-right">{r.area}</td>
                        <td className="p-2">{r.ownerName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.rows.length > 50 && (
                  <p className="p-2 text-center text-slate-400">{t("orMoreRowsPrefix")} {preview.rows.length - 50}</p>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={confirmImport}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  {t("orImportConfirmPrefix")} {preview.rows.length} {t("orImportConfirmSuffix")}
                </button>
                <button
                  onClick={() => setPreview(null)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300"
                >
                  {t("orCancelButton")}
                </button>
              </div>
            </div>
          )}

          {debtImportError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
              {debtImportError}
            </div>
          )}

          {debtImportResult && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
              {t("orDebtImportResultPrefix")} {debtImportResult.created} {t("orDebtImportResultCreated")}, {debtImportResult.updated}{" "}
              {t("orDebtImportResultUpdated")}.
            </div>
          )}

          {debtPreview && (
            <div className="rounded-xl border border-rose-300 bg-rose-50/60 p-4 dark:border-rose-900 dark:bg-rose-950/20">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t("orDebtPreviewTitle")}</h4>
                <button onClick={() => setDebtPreview(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                {t("orDebtPreviewPeriod")} <b>{debtPreview.period || "—"}</b> · {t("orDebtPreviewProvider")}{" "}
                <b>{debtPreview.serviceProvider || "—"}</b>
              </p>
              <div className="mb-3 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t("orDebtPreviewAddressLabel")}</span>
                  <div className="flex gap-2 text-xs">
                    <button
                      onClick={() => setDebtPreviewSelectedAddresses(new Set(debtPreview.addresses.map((a) => a.address)))}
                      className="text-rose-700 hover:underline dark:text-rose-300"
                    >
                      {t("orDebtPreviewSelectAll")}
                    </button>
                    <button
                      onClick={() => setDebtPreviewSelectedAddresses(new Set())}
                      className="text-slate-500 hover:underline dark:text-slate-400"
                    >
                      {t("orDebtPreviewSelectNone")}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-1.5 dark:border-slate-800 dark:bg-slate-900">
                  {debtPreview.addresses.map((a) => (
                    <label
                      key={a.address}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <input
                        type="checkbox"
                        checked={debtPreviewSelectedAddresses.has(a.address)}
                        onChange={() => toggleDebtPreviewAddress(a.address)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      <span className="flex-1 font-medium text-slate-700 dark:text-slate-200">{a.address}</span>
                      <span className="text-slate-400">
                        {a.unitCount} {t("orDebtPreviewUnitsWord")}, {a.debtorCount} {t("orDebtPreviewDebtorsWord")}
                      </span>
                      <span className="font-semibold text-rose-600 dark:text-rose-400">{formatKzt(a.totalDebtKzt)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white text-xs dark:border-slate-800 dark:bg-slate-900">
                <table className="w-full">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800">
                    <tr>
                      {debtPreview.addresses.length > 1 && <th className="p-2 text-left">{t("orAddressFilterLabel")}</th>}
                      <th className="p-2 text-left">{t("orTableNumber")}</th>
                      <th className="p-2 text-right">{t("orTableArea")}</th>
                      <th className="p-2 text-right">{t("orDebtElevatorLabel")}</th>
                      <th className="p-2 text-right">{t("orDebtOperationalLabel")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debtPreview.units
                      .filter((u) => debtPreviewSelectedAddresses.has(u.address))
                      .slice(0, 50)
                      .map((u) => {
                        const elevator = u.services.find((s) => s.kind === "elevator_maintenance");
                        const operational = u.services.find((s) => s.kind === "operational_expenses");
                        return (
                          <tr key={u.personalAccount} className="border-t border-slate-100 dark:border-slate-800">
                            {debtPreview.addresses.length > 1 && <td className="p-2 text-slate-500">{u.address}</td>}
                            <td className="p-2">{u.unitNumber}</td>
                            <td className="p-2 text-right">{u.area}</td>
                            <td className={cellClass(elevator?.closingBalanceKzt)}>{formatKzt(elevator?.closingBalanceKzt ?? 0)}</td>
                            <td className={cellClass(operational?.closingBalanceKzt)}>{formatKzt(operational?.closingBalanceKzt ?? 0)}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={confirmDebtImport}
                  disabled={debtPreviewSelectedAddresses.size === 0}
                  className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("orDebtImportConfirmPrefix")} {debtPreview.units.filter((u) => debtPreviewSelectedAddresses.has(u.address)).length}{" "}
                  {t("orDebtImportConfirmSuffix")}
                </button>
                <button
                  onClick={() => setDebtPreview(null)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300"
                >
                  {t("orCancelButton")}
                </button>
              </div>
            </div>
          )}

          {units.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-900/40">
              <label className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAllVisible}
                  className="h-4 w-4 rounded border-slate-300"
                />
                {t("orSelectAllVisible")}
              </label>
              {selectedIds.size > 0 && (
                <>
                  <span className="text-slate-400">
                    {t("orSelectedCountPrefix")} {selectedIds.size}
                  </span>
                  <button
                    onClick={deleteSelected}
                    className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-white px-2 py-1 font-medium text-rose-700 hover:border-rose-400 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-300"
                  >
                    <Trash2 className="h-3 w-3" /> {t("orDeleteSelectedButton")}
                  </button>
                </>
              )}
              <button
                onClick={clearWholeRegistry}
                className="ml-auto inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 font-medium text-slate-500 hover:border-rose-400 hover:text-rose-600 dark:border-slate-700 dark:text-slate-400"
              >
                <Trash2 className="h-3 w-3" /> {t("orClearRegistryButton")}
              </button>
            </div>
          )}

          {filtered.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">
              {units.length === 0 ? t("orEmptyRegistry") : t("orNothingFound")}
            </p>
          )}
          {groupedFiltered ? (
            <div className="flex flex-col gap-4">
              {groupedFiltered.map((group) => (
                <div key={group.address || "—"} className="flex flex-col">
                  <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <span>{group.address || t("orAddressUnknown")}</span>
                    <Badge variant="outline">{group.units.length}</Badge>
                  </div>
                  <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                    {group.units.map((u) => renderUnitRow(u))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">{filtered.map((u) => renderUnitRow(u))}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function fmtDiff(v: number): string {
  const s = v.toLocaleString("ru-RU");
  return v > 0 ? `+${s}` : s;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function cellClass(closingBalanceKzt: number | undefined): string {
  return closingBalanceKzt && closingBalanceKzt > 0.5
    ? "p-2 text-right font-medium text-rose-600 dark:text-rose-400"
    : "p-2 text-right text-slate-500 dark:text-slate-400";
}
