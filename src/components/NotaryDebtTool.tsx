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
 * Инструмент расчёта задолженности по одному лицевому счёту для передачи
 * нотариусу (исполнительная надпись по бесспорному требованию) — в отличие
 * от DebtDashboard, здесь не аналитика по реестру, а подготовка одного
 * официального документа на конкретного должника.
 */
export function NotaryDebtTool() {
  const t = useT();
  const project = useActiveProject();
  const [search, setSearch] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
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

  const selected = useMemo(() => debtors.find((d) => d.unit.id === selectedUnitId) ?? null, [debtors, selectedUnitId]);

  async function handleExport() {
    if (!selected) return;
    setExportBusy(true);
    try {
      const { exportDebtClaimToDocxBlob } = await import("@/lib/export/exportDebtClaimToDocx");
      const blob = await exportDebtClaimToDocxBlob({ building: project.building, unit: selected.unit });
      const safeAccount = (selected.unit.personalAccount || selected.unit.number).replace(/[^\p{L}\p{N}]+/gu, "_");
      downloadBlob(blob, `Расчёт_задолженности_${safeAccount}.docx`);
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

            <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800">
              {filteredDebtors.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-slate-400">{t("ndNothingFound")}</p>
              ) : (
                <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredDebtors.map(({ unit, status }) => (
                    <button
                      key={unit.id}
                      onClick={() => setSelectedUnitId(unit.id)}
                      className={`flex flex-wrap items-center gap-2 px-3 py-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-900 ${
                        selectedUnitId === unit.id ? "bg-rose-50 dark:bg-rose-950/20" : ""
                      }`}
                    >
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {unit.address ? `${unit.address}, ` : ""}№{unit.number}
                      </span>
                      <span className="text-slate-400">{unit.ownerName || t("ndNoOwnerNameHint")}</span>
                      {unit.personalAccount && <span className="text-slate-400">ЛС {unit.personalAccount}</span>}
                      <span className="ml-auto font-semibold text-rose-600 dark:text-rose-400">{formatKzt(status.totalDebtKzt)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selected && (
              <div className="rounded-xl border border-rose-300 bg-rose-50/60 p-4 dark:border-rose-900 dark:bg-rose-950/20">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {selected.unit.address ? `${selected.unit.address}, ` : ""}№{selected.unit.number}
                  </h4>
                  <Badge variant="danger">{t("orDebtorBadge")}</Badge>
                </div>
                <dl className="mb-3 grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400">{t("ndFieldOwner")}</dt>
                    <dd className="font-medium text-slate-700 dark:text-slate-200">{selected.unit.ownerName || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400">{t("ndFieldAccount")}</dt>
                    <dd className="font-medium text-slate-700 dark:text-slate-200">{selected.unit.personalAccount || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400">{t("orDebtElevatorLabel")}</dt>
                    <dd className="font-medium tabular-nums text-slate-700 dark:text-slate-200">
                      {formatKzt(Math.max(0, selected.status.elevatorDebtKzt))} (≈{selected.status.elevatorDebtMonths}{" "}
                      {t("orDebtMonthsSuffix")})
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400">{t("orDebtOperationalLabel")}</dt>
                    <dd className="font-medium tabular-nums text-slate-700 dark:text-slate-200">
                      {formatKzt(Math.max(0, selected.status.operationalDebtKzt))} (≈{selected.status.operationalDebtMonths}{" "}
                      {t("orDebtMonthsSuffix")})
                    </dd>
                  </div>
                </dl>
                <div className="mb-3 rounded-lg border border-rose-200 bg-white px-3 py-2 dark:border-rose-900 dark:bg-slate-900">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-600 dark:text-slate-300">{t("ndTotalLabel")}</span>
                    <span className="text-lg font-semibold text-rose-600 dark:text-rose-400">
                      {formatKzt(selected.status.totalDebtKzt)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs italic text-slate-400">{amountToWordsKzt(selected.status.totalDebtKzt)}</p>
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
