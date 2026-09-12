"use client";

import { useMemo } from "react";
import { Trees, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NumberField } from "@/components/NumberField";
import { useProjectsStore } from "@/store/useProjectsStore";
import { useActiveProject } from "@/store/hooks";
import { TERRITORY_WORK_CATALOG } from "@/lib/calculator/data/territoryWorkCatalog";
import { computeTerritoryWorkAnnualCost, defaultTerritoryVolume } from "@/lib/calculator/territoryWorkEngine";
import { formatKzt } from "@/lib/utils";
import { useT } from "@/lib/i18n/useT";
import type { TerritoryPassport } from "@/lib/calculator/types";

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

  const values = passport ?? BLANK_PASSPORT;

  function patch(field: keyof typeof BLANK_PASSPORT, value: number) {
    setTerritoryPassport({ [field]: value } as Partial<TerritoryPassport>);
  }

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

        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="flex-1 text-sm">
            <span className="text-slate-500 dark:text-slate-400">{t("terrPreviewTotal")} </span>
            <b className="text-slate-900 dark:text-slate-100">{formatKzt(preview.total)}</b>
            <span className="text-slate-400"> · {preview.matched} {t("terrPreviewMatched")}</span>
          </div>
          <button
            onClick={applyTerritoryPassportToDb}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            {t("terrApplyButton")}
          </button>
        </div>

        <p className="text-xs text-slate-400">{t("terrAppliedHint")}</p>

        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{t("terrUnverifiedWarning")}</span>
        </div>

        <p className="text-xs text-slate-400">{t("terrSourceNote")}</p>
      </CardContent>
    </Card>
  );
}
