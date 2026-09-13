"use client";

import { useMemo, useState } from "react";
import { FileDown, Gavel, Info, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useActiveProject } from "@/store/hooks";
import { computeUnitDebtStatus } from "@/lib/calculator/ownerRegistryEngine";
import { amountToWordsKzt } from "@/lib/format/amountToWordsRu";
import { downloadBlob } from "@/lib/export/download";
import { formatKzt } from "@/lib/utils";
import { useT } from "@/lib/i18n/useT";

/**
 * Инструмент расчёта задолженности по лицевым счетам для передачи
 * нотариусу (исполнительная надпись по бесспорному требованию) — в отличие
 * от DebtDashboard, здесь не аналитика по реестру, а подготовка официального
 * документа на одного ИЛИ несколько выбранных должников разом (чекбоксы +
 * «выбрать все»), со сводной таблицей и общей суммой при батче.
 */
export function NotaryDebtTool() {
  const t = useT();
  const project = useActiveProject();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exportBusy, setExportBusy] = useState(false);

  const debtors = useMemo(
    () =>
      project.units
        .filter((u) => u.debtImportedAt)
        .map((unit) => ({ unit, status: computeUnitDebtStatus(unit) }))
        .filter((d) => d.status.isDebtor)
        .sort((a, b) => b.status.totalDebtKzt - a.status.totalDebtKzt),
    [project.units],
  );

  const filteredDebtors = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return debtors;
    return debtors.filter(
      (d) =>
        d.unit.number.toLowerCase().includes(q) ||
        d.unit.ownerName.toLowerCase().includes(q) ||
        (d.unit.personalAccount ?? "").toLowerCase().includes(q) ||
        (d.unit.address ?? "").toLowerCase().includes(q),
    );
  }, [debtors, search]);

  const selectedDebtors = useMemo(() => debtors.filter((d) => selectedIds.has(d.unit.id)), [debtors, selectedIds]);
  const combinedTotalKzt = useMemo(
    () => selectedDebtors.reduce((sum, d) => sum + d.status.totalDebtKzt, 0),
    [selectedDebtors],
  );

  const allFilteredSelected = filteredDebtors.length > 0 && filteredDebtors.every((d) => selectedIds.has(d.unit.id));

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllFiltered() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const d of filteredDebtors) next.delete(d.unit.id);
      } else {
        for (const d of filteredDebtors) next.add(d.unit.id);
      }
      return next;
    });
  }

  async function handleExport() {
    if (selectedDebtors.length === 0) return;
    setExportBusy(true);
    try {
      const { exportDebtClaimToDocxBlob } = await import("@/lib/export/exportDebtClaimToDocx");
      const units = selectedDebtors.map((d) => d.unit);
      const blob = await exportDebtClaimToDocxBlob({ building: project.building, units });
      const filename =
        units.length === 1
          ? `Расчёт_задолженности_${(units[0].personalAccount || units[0].number).replace(/[^\p{L}\p{N}]+/gu, "_")}.docx`
          : `Расчёт_задолженности_сводный_${units.length}_ЛС.docx`;
      downloadBlob(blob, filename);
    } finally {
      setExportBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Gavel className="h-5 w-5 text-rose-600" />
          <CardTitle>{t("ndTitle")}</CardTitle>
        </div>
        <CardDescription>{t("ndDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {debtors.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-700">
            {t("ndNoDebtorsHint")}
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("ndSearchPlaceholder")}
                className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </div>

            <label className="flex w-fit items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleSelectAllFiltered}
                className="h-4 w-4 rounded border-slate-300"
              />
              {t("orSelectAllVisible")}
            </label>

            <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800">
              {filteredDebtors.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-slate-400">{t("ndNothingFound")}</p>
              ) : (
                <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredDebtors.map(({ unit, status }) => (
                    <label
                      key={unit.id}
                      className={`flex cursor-pointer flex-wrap items-center gap-2 px-3 py-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-900 ${
                        selectedIds.has(unit.id) ? "bg-rose-50 dark:bg-rose-950/20" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(unit.id)}
                        onChange={() => toggleSelected(unit.id)}
                        className="h-4 w-4 flex-shrink-0 rounded border-slate-300"
                      />
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {unit.address ? `${unit.address}, ` : ""}№{unit.number}
                      </span>
                      <span className="text-slate-400">{unit.ownerName || t("ndNoOwnerNameHint")}</span>
                      {unit.personalAccount && <span className="text-slate-400">ЛС {unit.personalAccount}</span>}
                      <span className="ml-auto font-semibold text-rose-600 dark:text-rose-400">{formatKzt(status.totalDebtKzt)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {selectedDebtors.length === 0 ? (
              <p className="text-xs text-slate-400">{t("ndNoSelectionHint")}</p>
            ) : (
              <div className="rounded-xl border border-rose-300 bg-rose-50/60 p-4 dark:border-rose-900 dark:bg-rose-950/20">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {t("orSelectedCountPrefix")} {selectedDebtors.length}
                  </h4>
                  <Badge variant="danger">{t("orDebtorBadge")}</Badge>
                </div>

                {selectedDebtors.length === 1 ? (
                  <dl className="mb-3 grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-400">{t("ndFieldOwner")}</dt>
                      <dd className="font-medium text-slate-700 dark:text-slate-200">{selectedDebtors[0].unit.ownerName || "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-400">{t("ndFieldAccount")}</dt>
                      <dd className="font-medium text-slate-700 dark:text-slate-200">{selectedDebtors[0].unit.personalAccount || "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-400">{t("orDebtElevatorLabel")}</dt>
                      <dd className="font-medium tabular-nums text-slate-700 dark:text-slate-200">
                        {formatKzt(Math.max(0, selectedDebtors[0].status.elevatorDebtKzt))} (≈
                        {selectedDebtors[0].status.elevatorDebtMonths} {t("orDebtMonthsSuffix")})
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-400">{t("orDebtOperationalLabel")}</dt>
                      <dd className="font-medium tabular-nums text-slate-700 dark:text-slate-200">
                        {formatKzt(Math.max(0, selectedDebtors[0].status.operationalDebtKzt))} (≈
                        {selectedDebtors[0].status.operationalDebtMonths} {t("orDebtMonthsSuffix")})
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <div className="mb-3 flex max-h-40 flex-col divide-y divide-rose-100 overflow-y-auto rounded-lg border border-rose-200 bg-white text-xs dark:divide-rose-900 dark:border-rose-900 dark:bg-slate-900">
                    {selectedDebtors.map(({ unit, status }) => (
                      <div key={unit.id} className="flex flex-wrap items-center gap-2 px-3 py-1.5">
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {unit.address ? `${unit.address}, ` : ""}№{unit.number}
                        </span>
                        <span className="text-slate-400">{unit.ownerName || t("ndNoOwnerNameHint")}</span>
                        <span className="ml-auto font-semibold text-rose-600 dark:text-rose-400">{formatKzt(status.totalDebtKzt)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mb-3 rounded-lg border border-rose-200 bg-white px-3 py-2 dark:border-rose-900 dark:bg-slate-900">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-600 dark:text-slate-300">{t("ndTotalLabel")}</span>
                    <span className="text-lg font-semibold text-rose-600 dark:text-rose-400">{formatKzt(combinedTotalKzt)}</span>
                  </div>
                  <p className="mt-1 text-xs italic text-slate-400">{amountToWordsKzt(combinedTotalKzt)}</p>
                </div>

                <button
                  onClick={handleExport}
                  disabled={exportBusy}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FileDown className="h-4 w-4" /> {exportBusy ? t("ndExportBusy") : t("ndExportButton")}
                </button>
              </div>
            )}
          </>
        )}

        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
          <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <span>{t("ndLegalNote")}</span>
        </div>
      </CardContent>
    </Card>
  );
}
