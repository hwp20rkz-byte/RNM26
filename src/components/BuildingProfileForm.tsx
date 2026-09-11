"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Building2, MapPin, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NumberField } from "@/components/NumberField";
import { useProjectsStore } from "@/store/useProjectsStore";
import { useActiveProject, useActiveTariff } from "@/store/hooks";
import { buildingProfileSchema } from "@/lib/calculator/validation";
import { OBJECT_TYPE_LABELS, PRESET_FIELD_HELP } from "@/lib/calculator/presets";
import { REGIONAL_MIN_TARIFFS } from "@/lib/calculator/minTariffs";
import { computeParkingBilledPerSpot, computeUsefulArea } from "@/lib/calculator/engine";
import { formatKztPrecise } from "@/lib/utils";
import { useT } from "@/lib/i18n/useT";
import type { ObjectType } from "@/lib/calculator/types";

export function BuildingProfileForm() {
  const t = useT();
  const project = useActiveProject();
  const tariff = useActiveTariff();
  const building = project.building;
  const setBuilding = useProjectsStore((s) => s.setBuilding);
  const presets = useProjectsStore((s) => s.presets);
  const setPreset = useProjectsStore((s) => s.setPreset);
  const [touched, setTouched] = useState(false);

  const errors = useMemo(() => {
    const result = buildingProfileSchema.safeParse(building);
    if (result.success) return {};
    const map: Record<string, string> = {};
    for (const issue of result.error.issues) {
      map[String(issue.path[0])] = issue.message;
    }
    return map;
  }, [building]);

  const usefulArea = computeUsefulArea(building);
  const totalFloors = building.floorsPerEntrance.reduce((a, b) => a + b, 0);
  const activePreset = presets.find((p) => p.id === project.presetId) ?? presets[0];

  function onPresetChange(id: string) {
    setPreset(id);
    setTouched(true);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-emerald-600" />
          <CardTitle>{t("bpStepTitle")}</CardTitle>
        </div>
        <CardDescription>{t("bpStepDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t("bpNameLabel")}
            </span>
            <input
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900"
              value={building.name}
              onChange={(e) => setBuilding({ name: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t("bpAddressLabel")}</span>
            <input
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900"
              value={building.address}
              onChange={(e) => setBuilding({ address: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t("bpObjectTypeLabel")}
            </span>
            <Select value={building.objectType} onValueChange={(v) => setBuilding({ objectType: v as ObjectType })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(OBJECT_TYPE_LABELS) as ObjectType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {OBJECT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              <MapPin className="h-3.5 w-3.5" /> {t("bpRegionLabel")}
            </span>
            <Select value={building.region} onValueChange={(v) => setBuilding({ region: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REGIONAL_MIN_TARIFFS.map((r) => (
                  <SelectItem key={r.region} value={r.region}>
                    {r.region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Sparkles className="h-3.5 w-3.5" /> {t("bpPresetLabel")}
            </span>
            <Select value={project.presetId} onValueChange={onPresetChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {presets.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                    {!p.builtIn ? t("bpPresetCustomSuffix") : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>

        {activePreset && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-800/40">
            <p className="mb-1.5 text-slate-600 dark:text-slate-300">{activePreset.description}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500 dark:text-slate-400">
              <span title={PRESET_FIELD_HELP.priceMultiplier.help}>
                {PRESET_FIELD_HELP.priceMultiplier.label}: <b>×{activePreset.priceMultiplier}</b>
              </span>
              <span title={PRESET_FIELD_HELP.maxServiceClass.help}>
                {PRESET_FIELD_HELP.maxServiceClass.label}: <b>{activePreset.maxServiceClass}</b>
              </span>
              <span title={PRESET_FIELD_HELP.capitalRepairMrpMultiplier.help}>
                {PRESET_FIELD_HELP.capitalRepairMrpMultiplier.label}: <b>{activePreset.capitalRepairMrpMultiplier} МРП</b>
              </span>
              <span title={PRESET_FIELD_HELP.commercialRateCoefficient.help}>
                {PRESET_FIELD_HELP.commercialRateCoefficient.label}: <b>×{activePreset.commercialRateCoefficient}</b>
              </span>
            </div>
            <p className="mt-1.5 text-slate-400">{t("bpPresetHint")}</p>
          </div>
        )}

        {building.objectType !== "residential" && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{t(building.objectType === "commercial" ? "bpWarningCommercialFull" : "bpWarningMixedFull")}</p>
          </div>
        )}

        <div>
          <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{t("bpAreasHeading")}</h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <NumberField
              label={t("bpLivingAreaLabel")}
              suffix="м²"
              value={building.livingArea}
              onChange={(v) => setBuilding({ livingArea: v })}
              error={touched ? errors.livingArea : undefined}
            />
            <NumberField
              label={t("bpCommercialAreaLabel")}
              suffix="м²"
              value={building.commercialArea}
              onChange={(v) => setBuilding({ commercialArea: v })}
            />
            <NumberField
              label={t("bpStorageAreaLabel")}
              suffix="м²"
              value={building.storageArea}
              onChange={(v) => setBuilding({ storageArea: v })}
            />
            <NumberField
              label={t("bpYardPavedLabel")}
              suffix="м²"
              value={building.yardPavedArea}
              onChange={(v) => setBuilding({ yardPavedArea: v })}
            />
            <NumberField
              label={t("bpYardGreenLabel")}
              suffix="м²"
              value={building.yardGreenArea}
              onChange={(v) => setBuilding({ yardGreenArea: v })}
            />
            <NumberField
              label={t("bpParkingAreaLabel")}
              suffix="м²"
              value={building.parkingArea}
              onChange={(v) => setBuilding({ parkingArea: v })}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {t("bpUsefulAreaPrefix")}{" "}
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {usefulArea.toLocaleString("ru-RU")} м²
            </span>
            . {t("bpUsefulAreaSuffix")}
          </p>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{t("bpStructureHeading")}</h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <NumberField
              label={t("bpApartmentsLabel")}
              value={building.apartments}
              onChange={(v) => setBuilding({ apartments: Math.round(v) })}
            />
            <NumberField
              label={t("bpEntrancesLabel")}
              value={building.entrances}
              onChange={(v) =>
                setBuilding({
                  entrances: Math.round(v),
                  floorsPerEntrance: Array.from(
                    { length: Math.max(1, Math.round(v)) },
                    (_, i) => building.floorsPerEntrance[i] ?? 12,
                  ),
                })
              }
              error={touched ? errors.entrances : undefined}
            />
            <NumberField
              label={t("bpFloorsLabel")}
              value={Math.round(totalFloors / Math.max(1, building.entrances))}
              onChange={(v) =>
                setBuilding({
                  floorsPerEntrance: Array(building.entrances).fill(Math.round(v)),
                })
              }
              hint={`${t("bpFloorsHintPrefix")} ${totalFloors}`}
            />
            <NumberField
              label={t("bpElevatorsLabel")}
              value={building.elevators}
              onChange={(v) => setBuilding({ elevators: Math.round(v) })}
            />
            <NumberField
              label={t("bpParkingSpotsLabel")}
              value={building.parkingSpots}
              onChange={(v) => setBuilding({ parkingSpots: Math.round(v) })}
            />
            <NumberField
              label={t("bpAnnualIncomeLabel")}
              suffix="₸"
              value={building.annualCommercialIncome}
              onChange={(v) => setBuilding({ annualCommercialIncome: v })}
            />
          </div>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t("bpFeesHeading")}
          </h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <NumberField
              label={t("bpCapRepairLabel")}
              value={building.capitalRepairMrpMultiplier}
              step={0.001}
              onChange={(v) => setBuilding({ capitalRepairMrpMultiplier: v })}
              hint={t("bpCapRepairHint")}
              error={touched ? errors.capitalRepairMrpMultiplier : undefined}
            />
            <NumberField
              label={t("bpCommercialCoefLabel")}
              value={building.commercialRateCoefficient}
              step={0.1}
              onChange={(v) => setBuilding({ commercialRateCoefficient: v })}
              hint={t("bpCommercialCoefHint")}
            />
            <NumberField
              label={t("bpStorageCoefLabel")}
              value={building.storageRateCoefficient}
              step={0.1}
              onChange={(v) => setBuilding({ storageRateCoefficient: v })}
              hint={t("bpStorageCoefHint")}
            />
            <NumberField
              label={t("bpParkingCoefLabel")}
              value={building.parkingRateCoefficient}
              step={0.1}
              onChange={(v) => setBuilding({ parkingRateCoefficient: v })}
              hint={t("bpParkingCoefHint")}
            />
          </div>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t("bpParkingFloorHeading")}
          </h4>
          <p className="mb-2 text-xs text-slate-400">{t("bpParkingFloorDesc")}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <NumberField
              label={t("bpParkingFlatFeeLabel")}
              suffix="₸/мес."
              value={building.parkingFlatFeePerSpot}
              step={500}
              onChange={(v) => setBuilding({ parkingFlatFeePerSpot: v })}
              hint={t("bpParkingFlatFeeHint")}
              error={touched ? errors.parkingFlatFeePerSpot : undefined}
            />
            <NumberField
              label={t("bpNonPaymentLabel")}
              suffix="%"
              value={building.parkingNonPaymentRatePercent}
              step={5}
              onChange={(v) => setBuilding({ parkingNonPaymentRatePercent: v })}
              hint={t("bpNonPaymentHint")}
              error={touched ? errors.parkingNonPaymentRatePercent : undefined}
            />
            {building.parkingSpots > 0 && (
              <div className="flex flex-col justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800/40">
                <span className="text-slate-400">{t("bpBilledRateLabel")}</span>
                <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                  {formatKztPrecise(computeParkingBilledPerSpot(tariff, building))} ₸/мес.
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
