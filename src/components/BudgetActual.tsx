"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { Scale } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineNumber } from "@/components/InlineEdit";
import { useProjectsStore } from "@/store/useProjectsStore";
import { useActiveProject, useActiveTariff } from "@/store/hooks";
import { computeCategoryTotals } from "@/lib/calculator/engine";
import { computeCategoryBreakdown, computePlanActualSeries, lastNMonths } from "@/lib/calculator/planVsActual";
import { formatKzt } from "@/lib/utils";
import { useT } from "@/lib/i18n/useT";

const MONTH_KEYS = ["moJan", "moFeb", "moMar", "moApr", "moMay", "moJun", "moJul", "moAug", "moSep", "moOct", "moNov", "moDec"] as const;

function monthLabel(m: string, t: ReturnType<typeof useT>): string {
  const [y, mo] = m.split("-");
  return `${t(MONTH_KEYS[Number(mo) - 1])} ${y.slice(2)}`;
}

export function BudgetActual() {
  const t = useT();
  const project = useActiveProject();
  const tariff = useActiveTariff();
  const setActualAmount = useProjectsStore((s) => s.setActualAmount);

  const months = useMemo(() => lastNMonths(12), []);
  const [selectedMonth, setSelectedMonth] = useState(months[months.length - 1]);

  const categoryTotals = useMemo(
    () => computeCategoryTotals(project.db, project.building, project.priceMultiplier),
    [project.db, project.building, project.priceMultiplier],
  );

  const displayCategories = useMemo(() => {
    const leaf = project.db.categories.filter(
      (c) =>
        project.db.items.some((it) => it.categoryId === c.id) ||
        project.db.payroll.some((p) => p.categoryId === c.id),
    );
    const capital = project.db.categories.find((c) => c.id === "2.11");
    return capital && !leaf.some((c) => c.id === "2.11") ? [...leaf, capital] : leaf;
  }, [project.db.categories, project.db.items, project.db.payroll]);

  const monthlyPlanTotal = round2(tariff.annualTotalCost / 12);

  const series = useMemo(
    () => computePlanActualSeries(monthlyPlanTotal, project.actuals, months),
    [monthlyPlanTotal, project.actuals, months],
  );

  const chartData = series.map((s) => ({ month: monthLabel(s.month, t), plan: s.plan, actual: s.actual }));

  const breakdown = useMemo(
    () => computeCategoryBreakdown(categoryTotals, project.actuals, selectedMonth),
    [categoryTotals, project.actuals, selectedMonth],
  );

  const breakdownByCategory = new Map(breakdown.map((b) => [b.categoryId, b]));
  const monthTotal = breakdown.reduce((sum, b) => sum + b.actual, 0);
  const monthVariance = round2(monthTotal - monthlyPlanTotal);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-emerald-600" />
          <CardTitle>{t("baTitle")}</CardTitle>
        </div>
        <CardDescription>{t("baDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => `${Math.round(v / 1_000_000)}${t("millionSuffix")}`} />
              <RTooltip formatter={(v) => formatKzt(Number(v))} />
              <Legend />
              <Bar dataKey="plan" name={t("chartPlanLabel")} fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="actual" name={t("chartActualLabel")} fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-slate-500">{t("baMonthInputLabel")}</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m, t)}
              </option>
            ))}
          </select>
          <div className="ml-auto flex items-center gap-4 text-sm">
            <span className="text-slate-400">
              {t("baPlanLabel")} <b className="text-slate-600 dark:text-slate-300">{formatKzt(monthlyPlanTotal)}</b>
            </span>
            <span className="text-slate-400">
              {t("baActualLabel")} <b className="text-slate-600 dark:text-slate-300">{formatKzt(monthTotal)}</b>
            </span>
            <span className={monthVariance > 0 ? "text-rose-600" : "text-emerald-600"}>
              {t("baVarianceLabel")} <b>{monthVariance > 0 ? "+" : ""}{formatKzt(monthVariance)}</b>
            </span>
          </div>
        </div>

        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          <div className="flex items-center gap-2 py-1.5 text-xs font-semibold text-slate-400">
            <span className="flex-1">{t("adColArticle")}</span>
            <span className="w-28 text-right">{t("baColPlan")}</span>
            <span className="w-32 text-right">{t("baColActual")}</span>
            <span className="w-24 text-right">{t("baColVariancePercent")}</span>
          </div>
          {displayCategories.map((c) => {
            const b = breakdownByCategory.get(c.id);
            const plan = b?.plan ?? 0;
            return (
              <div key={c.id} className="flex items-center gap-2 py-2 text-sm">
                <span className="flex-1 truncate">
                  {c.code} {c.name}
                </span>
                <span className="w-28 text-right tabular-nums text-slate-400">{formatKzt(plan)}</span>
                <InlineNumber
                  value={b?.actual ?? 0}
                  onChange={(v) => setActualAmount(selectedMonth, c.id, v)}
                  className="w-32 text-right"
                  step={1000}
                />
                <span
                  className={`w-24 text-right tabular-nums text-xs ${
                    b?.variancePercent === null || b?.variancePercent === undefined
                      ? "text-slate-300"
                      : b.variancePercent > 0
                        ? "text-rose-600"
                        : "text-emerald-600"
                  }`}
                >
                  {b?.variancePercent === null || b?.variancePercent === undefined
                    ? "—"
                    : `${b.variancePercent > 0 ? "+" : ""}${b.variancePercent}%`}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
