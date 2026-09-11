"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Gauge, Minus } from "lucide-react";
import { useMemo } from "react";
import { useProjectsStore, type BudgetPeriod } from "@/store/useProjectsStore";
import { useActiveProject, useActiveTariff } from "@/store/hooks";
import {
  compareToMinTariff,
  computeApartmentCheck,
  computeParkingBilledPerSpot,
  computeTariffByUnitType,
} from "@/lib/calculator/engine";
import { findMinTariff } from "@/lib/calculator/minTariffs";
import { APARTMENT_SAMPLE_SIZES } from "@/lib/calculator/presets";
import { formatKzt, formatKztPrecise } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n/useT";
import { UNIT_TYPE_LABELS, type UnitType } from "@/lib/calculator/types";

const HUD_UNIT_TYPES: UnitType[] = ["commercial", "storage", "parking"];

export function StickyHud() {
  const t = useT();
  const PERIOD_LABEL: Record<BudgetPeriod, string> = {
    month: t("hudPeriodMonth"),
    quarter: t("hudPeriodQuarter"),
    year: t("hudPeriodYear"),
  };
  const tariff = useActiveTariff();
  const building = useActiveProject().building;
  const budgetPeriod = useProjectsStore((s) => s.budgetPeriod);
  const setBudgetPeriod = useProjectsStore((s) => s.setBudgetPeriod);

  const [delta, setDelta] = useState(0);
  const prevTariff = useRef(tariff.tariffPerSqm);
  useEffect(() => {
    if (prevTariff.current !== tariff.tariffPerSqm) {
      setDelta(tariff.tariffPerSqm - prevTariff.current);
      prevTariff.current = tariff.tariffPerSqm;
    }
  }, [tariff.tariffPerSqm]);

  const minTariff = findMinTariff(building.region);
  const status = compareToMinTariff(tariff.tariffPerSqm, minTariff);

  const byType = useMemo(
    () =>
      computeTariffByUnitType(tariff, building).filter(
        (l) => HUD_UNIT_TYPES.includes(l.unitType) && l.areaSqm > 0,
      ),
    [tariff, building],
  );
  const capitalRepairSharePercent =
    tariff.tariffPerSqm > 0 ? Math.round((tariff.capitalRepairPerSqmActual / tariff.tariffPerSqm) * 100) : 0;

  const budgetByPeriod: Record<BudgetPeriod, number> = {
    month: tariff.monthlyBudget,
    quarter: tariff.quarterlyBudget,
    year: tariff.annualBudget,
  };

  const statusColor =
    status === "below"
      ? "danger"
      : status === "above"
        ? "warning"
        : status === "within"
          ? "success"
          : "outline";

  const statusLabel =
    status === "below"
      ? t("hudStatusBelow")
      : status === "above"
        ? t("hudStatusAbove")
        : status === "within"
          ? t("hudStatusWithin")
          : t("hudStatusUnknown");

  return (
    <div
      className="no-print sticky top-0 z-40 -mx-4 mb-6 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 sm:mx-0 sm:rounded-2xl sm:border"
      style={{ padding: "var(--ui-hud-pad)" }}
    >
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-50 p-2 dark:bg-emerald-950">
            <Gauge className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span
                className="font-bold tabular-nums text-slate-900 dark:text-white"
                style={{ fontSize: "var(--ui-hud-number-size)" }}
              >
                {formatKztPrecise(tariff.tariffPerSqm)} ₸
              </span>
              <span className="text-xs text-slate-400">{t("hudPerSqmMonthSuffix")}</span>
              {delta !== 0 && (
                <span
                  className={`inline-flex items-center text-xs font-medium tabular-nums ${
                    delta > 0 ? "text-rose-500" : "text-emerald-600"
                  }`}
                >
                  {delta > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {formatKztPrecise(Math.abs(delta))}
                </span>
              )}
              {delta === 0 && <Minus className="h-3 w-3 text-slate-300" />}
            </div>
            <Badge variant={statusColor} className="mt-0.5">
              {statusLabel}
              {minTariff ? ` (${minTariff.minTariffPerSqm} ₸)` : ""}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs dark:bg-slate-800">
            {(Object.keys(PERIOD_LABEL) as BudgetPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setBudgetPeriod(p)}
                className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                  budgetPeriod === p
                    ? "bg-white text-slate-900 shadow dark:bg-slate-950 dark:text-white"
                    : "text-slate-500"
                }`}
              >
                {PERIOD_LABEL[p]}
              </button>
            ))}
          </div>
          <div className="text-sm">
            <div className="font-semibold tabular-nums text-slate-800 dark:text-slate-100">
              {formatKzt(budgetByPeriod[budgetPeriod])}
            </div>
            <div className="text-xs text-slate-400">{t("hudCollectionBudget")}</div>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-4">
          {APARTMENT_SAMPLE_SIZES.map((s) => (
            <div key={s.label} className="text-right">
              <div className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                {formatKzt(computeApartmentCheck(tariff.tariffPerSqm, s.area))}
              </div>
              <div className="text-xs text-slate-400">
                {s.label} ({s.area} м²)
              </div>
            </div>
          ))}
        </div>
      </div>

      {(tariff.capitalRepairPerSqmActual > 0 || byType.length > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-slate-100 pt-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {tariff.capitalRepairPerSqmActual > 0 && (
            <span>
              {t("hudCapRepairLabel")}{" "}
              <b className="tabular-nums text-slate-700 dark:text-slate-200">
                {formatKztPrecise(tariff.capitalRepairPerSqmActual)} ₸/м²
              </b>{" "}
              ({capitalRepairSharePercent}%)
            </span>
          )}
          {byType.map((l) => (
            <span key={l.unitType}>
              {UNIT_TYPE_LABELS[l.unitType]}:{" "}
              {l.unitType === "parking" && building.parkingSpots > 0 ? (
                <>
                  <b className="tabular-nums text-slate-700 dark:text-slate-200">
                    {formatKztPrecise(computeParkingBilledPerSpot(tariff, building))} {t("hudPerSpotSuffix")}
                  </b>{" "}
                  <span className="text-slate-400">
                    ({formatKzt(l.monthlyTotal)}{t("hudTotalPerMonthSuffix")}, {building.parkingSpots} {t("hudSpotsWord")})
                  </span>
                </>
              ) : (
                <>
                  <b className="tabular-nums text-slate-700 dark:text-slate-200">
                    {formatKztPrecise(l.ratePerSqm)} ₸/м²
                  </b>{" "}
                  <span className="text-slate-400">({formatKzt(l.monthlyTotal)}{t("hudTotalPerMonthSuffix")})</span>
                </>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
