"use client";

import { useMemo, useState } from "react";
import { Trees, AlertTriangle, CheckCircle2, FileText, Scale, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NumberField } from "@/components/NumberField";
import { useProjectsStore } from "@/store/useProjectsStore";
import { useActiveProject } from "@/store/hooks";
import { TERRITORY_WORK_CATALOG } from "@/lib/calculator/data/territoryWorkCatalog";
import { buildMrpForecastSeries, computeTerritoryWorkAnnualCost, defaultTerritoryVolume } from "@/lib/calculator/territoryWorkEngine";
import { computeTerritoryBudget } from "@/lib/calculator/territoryNormativeEngine";
import { downloadBlob } from "@/lib/export/download";
import { formatKzt } from "@/lib/utils";
import { useT } from "@/lib/i18n/useT";
import type { TerritoryPassport } from "@/lib/calculator/types";

const FORECAST_BASE_YEAR = 2025;
const FORECAST_YEARS = [2026, 2027, 2028, 2029, 2030];

const BLANK_PASSPORT: Omit<TerritoryPassport, "id" | "compiledAt"> = {
  pavementAreaSqm: 0,
  accessRoadAreaSqm: 0,
  greeneryAreaSqm: 0,
  accessRoadLengthKm: 0,
  treeCount: 0,
  shrubCount: 0,
  urnCount: 0,
  lightingFixtureCount: 0,
  playgroundCount: 0,
  wasteSiteCount: 0,
};

export function TerritoryPassportForm() {
  const t = useT();
  const project = useActiveProject();
  const setTerritoryPassport = useProjectsStore((s) => s.setTerritoryPassport);
  const applyTerritoryPassportToDb = useProjectsStore((s) => s.applyTerritoryPassportToDb);
  const passport = project.territoryPassport;
  const mrpValue = project.db.taxRates.mrpValue;
  const setTaxRates = useProjectsStore((s) => s.setTaxRates);
  const [exportBusy, setExportBusy] = useState(false);
  const [growthRatePercent, setGrowthRatePercent] = useState(6);

  async function handleExportDocx() {
    if (!passport) return;
    setExportBusy(true);
    try {
      const { exportTerritoryPassportToDocxBlob } = await import("@/lib/export/exportTerritoryPassportToDocx");
      const blob = await exportTerritoryPassportToDocxBlob(project.building, passport);
      downloadBlob(blob, `Паспорт_территории_${project.name.replace(/[^\p{L}\p{N}]+/gu, "_")}.docx`);
    } finally {
      setExportBusy(false);
    }
  }

  const preview = useMemo(() => {
    if (!passport) return { total: 0, matched: 0 };
    let total = 0;
    let matched = 0;
    for (const workItem of TERRITORY_WORK_CATALOG) {
      const volume = defaultTerritoryVolume(workItem, passport);
      if (volume > 0) {
        matched += 1;
        total += computeTerritoryWorkAnnualCost(workItem, volume, mrpValue);
      }
    }
    return { total, matched };
  }, [passport, mrpValue]);

  const budget = useMemo(() => {
    if (!passport) {
      return { directCostsOsi: 0, directCostsAkimat: 0, totalDirect: 0, indirectCosts: 0, indirectCostRatio: 0, indirectLimitExceeded: false, totalWithIndirect: 0 };
    }
    return computeTerritoryBudget(passport, mrpValue);
  }, [passport, mrpValue]);

  const values = passport ?? BLANK_PASSPORT;

  const forecast = useMemo(() => {
    const series = buildMrpForecastSeries(mrpValue, FORECAST_BASE_YEAR, growthRatePercent, FORECAST_YEARS);
    if (!passport) return series.map((y) => ({ ...y, total: 0 }));
    return series.map((y) => {
      let total = 0;
      for (const workItem of TERRITORY_WORK_CATALOG) {
        const volume = defaultTerritoryVolume(workItem, passport);
        if (volume > 0) total += computeTerritoryWorkAnnualCost(workItem, volume, y.mrpValue);
      }
      return { ...y, total };
    });
  }, [passport, mrpValue, growthRatePercent]);

  function patch(field: keyof typeof BLANK_PASSPORT, value: number) {
    setTerritoryPassport({ [field]: value } as Partial<TerritoryPassport>);
  }

  const verifiedCount = useMemo(() => TERRITORY_WORK_CATALOG.filter((i) => i.verified).length, []);
  const unverifiedCount = TERRITORY_WORK_CATALOG.length - verifiedCount;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trees className="h-5 w-5 text-emerald-600" />
          <CardTitle>{t("terrTitle")}</CardTitle>
        </div>
        <CardDescription>{t("terrDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <NumberField label={t("terrFieldPavement")} value={values.pavementAreaSqm} onChange={(v) => patch("pavementAreaSqm", v)} suffix="м²" />
          <NumberField label={t("terrFieldAccessRoadArea")} value={values.accessRoadAreaSqm} onChange={(v) => patch("accessRoadAreaSqm", v)} suffix="м²" />
          <NumberField label={t("terrFieldGreenery")} value={values.greeneryAreaSqm} onChange={(v) => patch("greeneryAreaSqm", v)} suffix="м²" />
          <NumberField label={t("terrFieldAccessRoadLength")} value={values.accessRoadLengthKm} onChange={(v) => patch("accessRoadLengthKm", v)} suffix="км" step={0.1} />
          <NumberField label={t("terrFieldTrees")} value={values.treeCount} onChange={(v) => patch("treeCount", v)} />
          <NumberField label={t("terrFieldShrubs")} value={values.shrubCount} onChange={(v) => patch("shrubCount", v)} />
          <NumberField label={t("terrFieldUrns")} value={values.urnCount} onChange={(v) => patch("urnCount", v)} />
          <NumberField label={t("terrFieldLighting")} value={values.lightingFixtureCount} onChange={(v) => patch("lightingFixtureCount", v)} />
          <NumberField label={t("terrFieldPlaygrounds")} value={values.playgroundCount} onChange={(v) => patch("playgroundCount", v)} />
          <NumberField label={t("terrFieldWasteSites")} value={values.wasteSiteCount} onChange={(v) => patch("wasteSiteCount", v)} />
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t("terrMrpForecastTitle")}</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberField
              label={t("terrMrpValueLabel")}
              value={mrpValue}
              onChange={(v) => setTaxRates({ mrpValue: v })}
              suffix="₸"
              step={1}
            />
            <NumberField
              label={t("terrMrpGrowthLabel")}
              value={growthRatePercent}
              onChange={setGrowthRatePercent}
              suffix="%/год"
              step={0.5}
            />
          </div>
          <p className="text-xs text-slate-400">{t("terrMrpGrowthHint")}</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-xs">
              <thead>
                <tr className="text-slate-400">
                  <th className="py-1 text-left font-medium">{t("terrMrpForecastYear")}</th>
                  {forecast.map((y) => (
                    <th key={y.year} className="py-1 text-right font-medium">{y.year}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-200 dark:border-slate-800">
                  <td className="py-1.5 text-slate-500 dark:text-slate-400">{t("terrMrpForecastMrpRow")}</td>
                  {forecast.map((y) => (
                    <td key={y.year} className="py-1.5 text-right tabular-nums text-slate-700 dark:text-slate-200">{formatKzt(y.mrpValue)}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-1.5 text-slate-500 dark:text-slate-400">{t("terrMrpForecastTotalRow")}</td>
                  {forecast.map((y) => (
                    <td key={y.year} className="py-1.5 text-right tabular-nums font-medium text-slate-900 dark:text-slate-100">{formatKzt(y.total)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="flex-1 text-sm">
            <span className="text-slate-500 dark:text-slate-400">{t("terrPreviewTotal")} </span>
            <b className="text-slate-900 dark:text-slate-100">{formatKzt(preview.total)}</b>
            <span className="text-slate-400"> · {preview.matched} {t("terrPreviewMatched")}</span>
          </div>
          <button
            onClick={handleExportDocx}
            disabled={!passport || exportBusy}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:border-emerald-400 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <FileText className="h-3.5 w-3.5" /> {t("terrExportButton")}
          </button>
          <button
            onClick={applyTerritoryPassportToDb}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            {t("terrApplyButton")}
          </button>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t("terrZoneTitle")}</span>
          </div>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${budget.totalDirect > 0 ? (budget.directCostsOsi / budget.totalDirect) * 100 : 0}%` }}
            />
            <div
              className="h-full bg-amber-500"
              style={{ width: `${budget.totalDirect > 0 ? (budget.directCostsAkimat / budget.totalDirect) * 100 : 0}%` }}
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
              <span className="text-slate-500 dark:text-slate-400">{t("terrZoneOsiLabel")}</span>
              <b className="ml-auto text-slate-900 dark:text-slate-100">{formatKzt(budget.directCostsOsi)}</b>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />
              <span className="text-slate-500 dark:text-slate-400">{t("terrZoneAkimatLabel")}</span>
              <b className="ml-auto text-slate-900 dark:text-slate-100">{formatKzt(budget.directCostsAkimat)}</b>
            </div>
          </div>
          <p className="text-xs text-slate-400">{t("terrZoneHint")}</p>
        </div>

        <p className="text-xs text-slate-400">{t("terrAppliedHint")}</p>

        <div className="flex items-start gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{verifiedCount} / {TERRITORY_WORK_CATALOG.length} {t("terrVerifiedNote")}</span>
        </div>

        {unverifiedCount > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{unverifiedCount} {t("terrUnverifiedNote")}</span>
          </div>
        )}

        <p className="text-xs text-slate-400">{t("terrSourceNote")}</p>
      </CardContent>
    </Card>
  );
}
