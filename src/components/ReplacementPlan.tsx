"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { FileSpreadsheet, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InlineNumber } from "@/components/InlineEdit";
import { useProjectsStore } from "@/store/useProjectsStore";
import { useActiveProject, useActiveTariff } from "@/store/hooks";
import { computeAllWear, computeCapitalFundProjection, computeReplacementPlan } from "@/lib/calculator/wearEngine";
import { computeCapitalRepairAnnual, computeParkingSurplusAnnual } from "@/lib/calculator/engine";
import { downloadBlob } from "@/lib/export/download";
import { formatKzt } from "@/lib/utils";
import { useT } from "@/lib/i18n/useT";

const CURRENT_YEAR = new Date().getFullYear();
const HORIZONS = [3, 5, 10] as const;

export function ReplacementPlan() {
  const t = useT();
  const project = useActiveProject();
  const tariff = useActiveTariff();
  const setCapitalFundBalance = useProjectsStore((s) => s.setCapitalFundBalance);
  const insertReplacementIntoSmeta = useProjectsStore((s) => s.insertReplacementIntoSmeta);
  const [horizon, setHorizon] = useState<(typeof HORIZONS)[number]>(5);
  const [exportBusy, setExportBusy] = useState<string | null>(null);

  // Взнос на капремонт (ст. 2.11 сметы) — реальный поток в фонд, а не
  // произвольная цифра. По умолчанию берём его из текущего тарифа; ручная
  // корректировка нужна, если собрание утвердило взнос, отличный от
  // текущего мультипликатора МРП в профиле объекта.
  const defaultAnnualIncome = computeCapitalRepairAnnual(project.building, project.db.taxRates.mrpValue);
  const [incomeOverride, setIncomeOverride] = useState<number | null>(null);
  const [lastProjectId, setLastProjectId] = useState(project.id);
  if (project.id !== lastProjectId) {
    setLastProjectId(project.id);
    setIncomeOverride(null);
  }
  const annualIncome = incomeOverride ?? defaultAnnualIncome;
  const isOverridden = incomeOverride !== null;

  const wears = useMemo(() => computeAllWear(project.assets, CURRENT_YEAR), [project.assets]);
  const assetById = useMemo(() => new Map(project.assets.map((a) => [a.id, a])), [project.assets]);

  const plan = useMemo(
    () => computeReplacementPlan(project.assets, wears, CURRENT_YEAR, horizon),
    [project.assets, wears, horizon],
  );

  const projection = useMemo(
    () => computeCapitalFundProjection(project.capitalFundBalance, annualIncome, plan),
    [project.capitalFundBalance, annualIncome, plan],
  );

  async function handleExportExcel() {
    setExportBusy("xlsx");
    try {
      const { exportCapitalPlanToExcelBlob } = await import("@/lib/export/exportCapitalPlanToExcel");
      const blob = await exportCapitalPlanToExcelBlob(project.building, project.assets, plan, projection, annualIncome);
      downloadBlob(blob, `План_капремонта_${project.name.replace(/[^\p{L}\p{N}]+/gu, "_")}.xlsx`);
    } finally {
      setExportBusy(null);
    }
  }

  async function handleExportDocx() {
    setExportBusy("docx");
    try {
      const { exportCapitalPlanToDocxBlob } = await import("@/lib/export/exportCapitalPlanToDocx");
      const blob = await exportCapitalPlanToDocxBlob(project.building, project.assets, plan, projection, annualIncome, horizon);
      downloadBlob(blob, `План_капремонта_${project.name.replace(/[^\p{L}\p{N}]+/gu, "_")}.docx`);
    } finally {
      setExportBusy(null);
    }
  }

  const chartData = useMemo(
    () =>
      projection.map((p) => ({
        year: String(p.year),
        plannedSpend: p.plannedSpend,
        balance: p.balance,
      })),
    [projection],
  );

  const totalPlanCost = plan.reduce((sum, y) => sum + y.totalCost, 0);
  const firstDeficitYear = projection.find((p) => p.balance < 0)?.year;
  const wouldAccumulate = project.capitalFundBalance + annualIncome * horizon;
  const gap = totalPlanCost - wouldAccumulate;
  const parkingSurplusAnnual = computeParkingSurplusAnnual(tariff, project.building);
  const recreationAssets = project.assets.filter((a) => a.category === "recreation");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("rpTitle")}</CardTitle>
        <CardDescription>{t("rpDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">{t("rpHorizonLabel")}</span>
            {HORIZONS.map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  horizon === h
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {h} {t("arYearsWord")}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-slate-500">
            {t("rpCurrentBalanceLabel")}
            <InlineNumber
              value={project.capitalFundBalance}
              onChange={setCapitalFundBalance}
              className="w-28"
              step={10000}
            />
          </label>

          <label className="flex items-center gap-2 text-slate-500">
            {t("rpAnnualIncomeLabel")}
            <InlineNumber value={annualIncome} onChange={(v) => setIncomeOverride(v)} className="w-28" step={10000} />
          </label>
          {isOverridden ? (
            <button
              onClick={() => setIncomeOverride(null)}
              className="text-xs text-emerald-600 hover:underline"
            >
              {t("rpResetToDefaultPrefix")}{formatKzt(defaultAnnualIncome)}{t("rpResetToDefaultSuffix")}
            </button>
          ) : (
            <span className="text-xs text-slate-400">{t("rpDefaultIncomeNote")}</span>
          )}

          <button
            onClick={handleExportExcel}
            disabled={exportBusy !== null}
            className="ml-auto inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:border-emerald-400 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> {exportBusy === "xlsx" ? t("rpFormingText") : t("rpExcelButton")}
          </button>
          <button
            onClick={handleExportDocx}
            disabled={exportBusy !== null}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:border-emerald-400 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <FileText className="h-3.5 w-3.5" /> {exportBusy === "docx" ? t("rpFormingText") : t("rpWordButton")}
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {t("rpPdfButton")}
          </button>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
            <div className="text-xs text-slate-400">{t("rpRequiredForLabel")} {horizon} {t("arYearsWord")}</div>
            <div className="font-semibold tabular-nums">{formatKzt(totalPlanCost)}</div>
          </div>
          <div className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
            <div className="text-xs text-slate-400">{t("rpWouldAccumulateLabel")} {horizon} {t("arYearsWord")}</div>
            <div className="font-semibold tabular-nums">{formatKzt(wouldAccumulate)}</div>
          </div>
          <div className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
            <div className="text-xs text-slate-400">{gap > 0 ? t("rpDeficitLabel") : t("rpReserveLabel")}</div>
            <div className={`font-semibold tabular-nums ${gap > 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {formatKzt(Math.abs(gap))}
            </div>
          </div>
          {firstDeficitYear !== undefined && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
              <Badge variant="warning">{t("rpDeficitBadge")}</Badge>
              {t("rpDeficitWarningPrefix")} {firstDeficitYear} {t("rpDeficitWarningSuffix")}
            </div>
          )}
        </div>

        {parkingSurplusAnnual > 0 && (
          <p className="text-xs text-slate-400">
            {t("rpParkingSurplusPrefix")} {formatKzt(parkingSurplusAnnual)}{t("rpParkingSurplusSuffix")}
            {recreationAssets.length === 0 && t("rpRecreationHint")}
          </p>
        )}

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => `${Math.round(v / 1_000_000)}${t("millionSuffix")}`} />
              <RTooltip formatter={(v) => formatKzt(Number(v))} />
              <Legend />
              <Line type="monotone" dataKey="balance" name={t("chartFundBalanceLabel")} stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="plannedSpend" name={t("chartPlannedSpendLabel")} stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col gap-3">
          {plan.map((y) => (
            <div key={y.year} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{y.year}</span>
                <span className="ml-auto text-sm tabular-nums text-slate-500">
                  {y.assetIds.length > 0 ? formatKzt(y.totalCost) : "—"}
                </span>
              </div>
              {y.assetIds.length === 0 ? (
                <p className="mt-1 text-xs text-slate-400">{t("rpNoReplacementsPlanned")}</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {y.assetIds.map((id) => {
                    const asset = assetById.get(id);
                    if (!asset) return null;
                    return (
                      <li key={id} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <span className="flex-1">{asset.name}</span>
                        {asset.criticalSafety && <Badge variant="danger">{t("arSafetyBadge")}</Badge>}
                        <span className="tabular-nums text-slate-400">
                          {formatKzt(asset.quantity * asset.replacementUnitCost)}
                        </span>
                        <button
                          onClick={() => insertReplacementIntoSmeta(id, "2.7")}
                          className="rounded-md border border-slate-200 px-2 py-0.5 font-medium text-slate-500 hover:border-slate-400 dark:border-slate-700"
                        >
                          {t("rpAddToBudgetButton")}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
