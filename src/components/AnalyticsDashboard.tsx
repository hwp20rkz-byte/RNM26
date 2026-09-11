"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useActiveProject, useActiveTariff } from "@/store/hooks";
import { computeCategoryTotals, computeTariffByUnitType } from "@/lib/calculator/engine";
import {
  comparePeriods,
  computeCategoryPeriodComparison,
  monthsInRange,
  previousEquivalentRange,
} from "@/lib/calculator/planVsActual";
import { UNIT_TYPE_LABELS } from "@/lib/calculator/types";
import { downloadBlob } from "@/lib/export/download";
import { formatKzt, formatKztPrecise } from "@/lib/utils";

const PALETTE = ["#059669", "#0891b2", "#7c3aed", "#db2777", "#d97706", "#65a30d", "#2563eb", "#dc2626"];

function monthLabel(m: string): string {
  const [y, mo] = m.split("-");
  const names = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  return `${names[Number(mo) - 1]} ${y.slice(2)}`;
}

function currentMonthStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonthLocal(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

export function AnalyticsDashboard() {
  const project = useActiveProject();
  const tariff = useActiveTariff();

  const now = currentMonthStr();
  const [fromMonth, setFromMonth] = useState(() => shiftMonthLocal(now, -5));
  const [toMonth, setToMonth] = useState(now);
  const [compareEnabled, setCompareEnabled] = useState(true);
  const [exportBusy, setExportBusy] = useState(false);

  function applyQuickRange(n: number) {
    setFromMonth(shiftMonthLocal(now, -(n - 1)));
    setToMonth(now);
  }

  function applyYtd() {
    setFromMonth(`${now.slice(0, 4)}-01`);
    setToMonth(now);
  }

  const monthlyPlanTotal = round2(tariff.annualTotalCost / 12);

  const validRange = fromMonth <= toMonth;
  const comparison = useMemo(
    () => (validRange ? comparePeriods(monthlyPlanTotal, project.actuals, fromMonth, toMonth) : null),
    [monthlyPlanTotal, project.actuals, fromMonth, toMonth, validRange],
  );

  const chartData = useMemo(() => {
    if (!validRange) return [];
    const monthsCurrent = monthsInRange(fromMonth, toMonth);
    const prevRange = previousEquivalentRange(fromMonth, toMonth);
    const monthsPrev = monthsInRange(prevRange.from, prevRange.to);
    const actualFor = (m: string | undefined) =>
      m ? round2(project.actuals.filter((a) => a.month === m).reduce((s, a) => s + a.amount, 0)) : 0;
    return monthsCurrent.map((m, i) => ({
      period: monthLabel(m),
      План: monthlyPlanTotal,
      Факт: actualFor(m),
      ...(compareEnabled ? { "Факт пред. периода": actualFor(monthsPrev[i]) } : {}),
    }));
  }, [validRange, fromMonth, toMonth, project.actuals, monthlyPlanTotal, compareEnabled]);

  const categoryTotals = useMemo(
    () => computeCategoryTotals(project.db, project.building, project.priceMultiplier),
    [project.db, project.building, project.priceMultiplier],
  );

  const topMovers = useMemo(() => {
    if (!validRange) return [];
    const catNames = new Map(project.db.categories.map((c) => [c.id, `${c.code} ${c.name}`]));
    return computeCategoryPeriodComparison(categoryTotals, project.actuals, fromMonth, toMonth)
      .filter((m) => m.current > 0 || m.previous > 0)
      .map((m) => ({ ...m, name: catNames.get(m.categoryId) ?? m.categoryId }))
      .sort((a, b) => Math.abs(b.deltaPercent ?? (b.current > 0 ? 999 : 0)) - Math.abs(a.deltaPercent ?? (a.current > 0 ? 999 : 0)))
      .slice(0, 8);
  }, [validRange, categoryTotals, project.actuals, project.db.categories, fromMonth, toMonth]);

  const capitalRepairDonut = [
    { name: "Содержание и управление", value: round2(tariff.tariffPerSqm - tariff.capitalRepairPerSqmActual) },
    { name: "Взнос на капремонт", value: tariff.capitalRepairPerSqmActual },
  ].filter((d) => d.value > 0);

  const byType = useMemo(
    () => computeTariffByUnitType(tariff, project.building).filter((l) => l.areaSqm > 0),
    [tariff, project.building],
  );

  async function handleExport() {
    setExportBusy(true);
    try {
      const { exportAnalyticsSnapshotToExcelBlob } = await import("@/lib/export/exportAnalyticsToExcel");
      const blob = await exportAnalyticsSnapshotToExcelBlob({
        buildingName: project.name,
        fromMonth,
        toMonth,
        comparison,
        byType,
        tariff,
        topMovers,
      });
      downloadBlob(blob, `Аналитика_${project.name.replace(/[^\p{L}\p{N}]+/gu, "_")}_${fromMonth}_${toMonth}.xlsx`);
    } finally {
      setExportBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-emerald-600" />
          <CardTitle>Аналитика</CardTitle>
        </div>
        <CardDescription>
          Произвольный период, сравнение факта с предыдущим эквивалентным периодом, разбивка тарифа
          по типам помещений и на содержание/капремонт, топ-движения по статьям. Данные — из уже
          введённого факта (вкладка «План/факт») и текущих настроек сметы.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            с
            <input
              type="month"
              value={fromMonth}
              onChange={(e) => setFromMonth(e.target.value)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            по
            <input
              type="month"
              value={toMonth}
              onChange={(e) => setToMonth(e.target.value)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
          <div className="flex gap-1">
            {[3, 6, 12].map((n) => (
              <button
                key={n}
                onClick={() => applyQuickRange(n)}
                className="rounded-md border border-slate-300 px-2 py-1.5 text-xs font-medium text-slate-600 hover:border-emerald-400 dark:border-slate-700 dark:text-slate-300"
              >
                {n} мес.
              </button>
            ))}
            <button
              onClick={applyYtd}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-xs font-medium text-slate-600 hover:border-emerald-400 dark:border-slate-700 dark:text-slate-300"
            >
              с начала года
            </button>
          </div>
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            <input type="checkbox" checked={compareEnabled} onChange={(e) => setCompareEnabled(e.target.checked)} />
            сравнить с предыдущим периодом
          </label>
          <button
            onClick={handleExport}
            disabled={exportBusy || !validRange}
            className="ml-auto inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-emerald-400 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <Download className="h-4 w-4" /> {exportBusy ? "Формирование…" : "Экспорт в Excel"}
          </button>
        </div>

        {!validRange && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
            Начало периода позже конца — выберите корректный диапазон.
          </p>
        )}

        {validRange && comparison && (
          <>
            <div className="flex flex-wrap gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-800/40">
              <span>
                Факт за период: <b className="tabular-nums">{formatKzt(comparison.current.actual)}</b>
              </span>
              {compareEnabled && (
                <span>
                  Пред. период:{" "}
                  <b className="tabular-nums text-slate-500">{formatKzt(comparison.previous.actual)}</b>
                  {comparison.actualDeltaPercent !== null && (
                    <span
                      className={`ml-1 font-semibold ${comparison.actualDeltaPercent > 0 ? "text-rose-600" : "text-emerald-600"}`}
                    >
                      ({comparison.actualDeltaPercent > 0 ? "+" : ""}
                      {comparison.actualDeltaPercent}%)
                    </span>
                  )}
                </span>
              )}
              <span>
                План за период: <b className="tabular-nums text-slate-500">{formatKzt(comparison.current.plan)}</b>
              </span>
              <span className={comparison.current.variance > 0 ? "text-rose-600" : "text-emerald-600"}>
                Отклонение: <b>{comparison.current.variance > 0 ? "+" : ""}{formatKzt(comparison.current.variance)}</b>
              </span>
            </div>

            <div style={{ height: "var(--ui-chart-h)" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={(v) => `${Math.round(v / 1_000_000)}М`} />
                  <RTooltip formatter={(v) => formatKzt(Number(v))} />
                  <Legend />
                  <Bar dataKey="План" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Факт" fill="#059669" radius={[4, 4, 0, 0]} />
                  {compareEnabled && <Bar dataKey="Факт пред. периода" fill="#94a3b8" radius={[4, 4, 0, 0]} />}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Содержание vs капремонт</CardTitle>
              <CardDescription>Из чего складывается тариф В, ₸/м²/мес.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-4" style={{ height: "var(--ui-chart-h-sm)" }}>
              <div className="h-full w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={capitalRepairDonut} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                      {capitalRepairDonut.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <RTooltip formatter={(v) => `${formatKztPrecise(Number(v))} ₸/м²`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex flex-1 flex-col gap-1.5 text-xs">
                {capitalRepairDonut.map((d, i) => (
                  <li key={d.name} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                    <span className="flex-1 text-slate-600 dark:text-slate-300">{d.name}</span>
                    <span className="tabular-nums text-slate-400">{formatKztPrecise(d.value)} ₸/м²</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Тариф по типам помещений</CardTitle>
              <CardDescription>₸/м²/мес. с учётом коэффициентов профиля объекта</CardDescription>
            </CardHeader>
            <CardContent style={{ height: "var(--ui-chart-h-sm)" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={byType.map((l) => ({ name: UNIT_TYPE_LABELS[l.unitType], rate: l.ratePerSqm }))}
                  layout="vertical"
                  margin={{ left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" fontSize={11} />
                  <YAxis type="category" dataKey="name" width={90} fontSize={11} />
                  <RTooltip formatter={(v) => `${v} ₸/м²`} />
                  <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                    {byType.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {validRange && topMovers.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Топ-движения по статьям к предыдущему периоду
            </h4>
            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              <div className="flex items-center gap-2 py-1.5 text-xs font-semibold text-slate-400">
                <span className="flex-1">Статья</span>
                <span className="w-32 text-right">Текущий, ₸</span>
                <span className="w-32 text-right">Пред. период, ₸</span>
                <span className="w-20 text-right">Δ, %</span>
              </div>
              {topMovers.map((m) => (
                <div key={m.categoryId} className="flex items-center gap-2 py-2 text-sm">
                  <span className="flex-1 truncate">{m.name}</span>
                  <span className="w-32 text-right tabular-nums">{formatKzt(m.current)}</span>
                  <span className="w-32 text-right tabular-nums text-slate-400">{formatKzt(m.previous)}</span>
                  <span
                    className={`w-20 text-right tabular-nums text-xs font-semibold ${
                      m.deltaPercent === null ? "text-slate-300" : m.deltaPercent > 0 ? "text-rose-600" : "text-emerald-600"
                    }`}
                  >
                    {m.deltaPercent === null ? "—" : `${m.deltaPercent > 0 ? "+" : ""}${m.deltaPercent}%`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
