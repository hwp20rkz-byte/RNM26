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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InlineNumber } from "@/components/InlineEdit";
import { useProjectsStore } from "@/store/useProjectsStore";
import { useActiveProject } from "@/store/hooks";
import { computeAllWear, computeCapitalFundProjection, computeReplacementPlan } from "@/lib/calculator/wearEngine";
import { formatKzt } from "@/lib/utils";

const CURRENT_YEAR = new Date().getFullYear();
const HORIZONS = [3, 5, 10] as const;

export function ReplacementPlan() {
  const project = useActiveProject();
  const setCapitalFundBalance = useProjectsStore((s) => s.setCapitalFundBalance);
  const insertReplacementIntoSmeta = useProjectsStore((s) => s.insertReplacementIntoSmeta);
  const [horizon, setHorizon] = useState<(typeof HORIZONS)[number]>(5);
  const [annualIncome, setAnnualIncome] = useState(0);

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

  const chartData = useMemo(
    () =>
      projection.map((p) => ({
        year: String(p.year),
        "Плановые траты": p.plannedSpend,
        "Баланс фонда": p.balance,
      })),
    [projection],
  );

  const totalPlanCost = plan.reduce((sum, y) => sum + y.totalCost, 0);
  const firstDeficitYear = projection.find((p) => p.balance < 0)?.year;

  return (
    <Card>
      <CardHeader>
        <CardTitle>План капитального ремонта и замены</CardTitle>
        <CardDescription>
          Группировка оборудования по плановому году замены (по возрасту / нормативному сроку или
          ручной корректировке износа из реестра) и проекция фонда капремонта — ориентир для
          принятия решения общим собранием, не замена сметной документации на конкретный проект
          капремонта.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Горизонт планирования:</span>
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
                {h} лет
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-slate-500">
            Текущий баланс фонда капремонта, ₸
            <InlineNumber
              value={project.capitalFundBalance}
              onChange={setCapitalFundBalance}
              className="w-28"
              step={10000}
            />
          </label>

          <label className="flex items-center gap-2 text-slate-500">
            Плановые поступления в фонд, ₸/год
            <InlineNumber value={annualIncome} onChange={setAnnualIncome} className="w-28" step={10000} />
          </label>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
            <div className="text-xs text-slate-400">Итого на {horizon} лет</div>
            <div className="font-semibold tabular-nums">{formatKzt(totalPlanCost)}</div>
          </div>
          {firstDeficitYear !== undefined && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
              <Badge variant="warning">Дефицит</Badge>
              При текущих поступлениях баланс фонда уходит в минус с {firstDeficitYear} года —
              нужно повышать взносы или пересматривать сроки замены.
            </div>
          )}
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => `${Math.round(v / 1_000_000)}М`} />
              <RTooltip formatter={(v) => formatKzt(Number(v))} />
              <Legend />
              <Line type="monotone" dataKey="Баланс фонда" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Плановые траты" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
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
                <p className="mt-1 text-xs text-slate-400">Замен не запланировано.</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {y.assetIds.map((id) => {
                    const asset = assetById.get(id);
                    if (!asset) return null;
                    return (
                      <li key={id} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <span className="flex-1">{asset.name}</span>
                        {asset.criticalSafety && <Badge variant="danger">безопасность</Badge>}
                        <span className="tabular-nums text-slate-400">
                          {formatKzt(asset.quantity * asset.replacementUnitCost)}
                        </span>
                        <button
                          onClick={() => insertReplacementIntoSmeta(id, "2.7")}
                          className="rounded-md border border-slate-200 px-2 py-0.5 font-medium text-slate-500 hover:border-slate-400 dark:border-slate-700"
                        >
                          В смету
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
