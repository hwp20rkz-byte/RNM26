"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCalculatorStore } from "@/store/useCalculatorStore";
import { getChildren } from "@/lib/calculator/engine";
import { formatKzt } from "@/lib/utils";

const PALETTE = [
  "#059669",
  "#0891b2",
  "#7c3aed",
  "#db2777",
  "#d97706",
  "#65a30d",
  "#2563eb",
  "#dc2626",
  "#0d9488",
  "#9333ea",
  "#ca8a04",
  "#475569",
];

export function BudgetCharts() {
  const db = useCalculatorStore((s) => s.db);
  const tariff = useCalculatorStore((s) => s.tariff);
  const building = useCalculatorStore((s) => s.building);

  const totalsById = useMemo(
    () => new Map(tariff.categoryTotals.map((t) => [t.categoryId, t])),
    [tariff.categoryTotals],
  );

  const donutData = useMemo(() => {
    const level2 = [
      ...getChildren(db.categories, "1"),
      ...getChildren(db.categories, "2"),
    ];
    return level2
      .map((c) => ({
        name: `${c.code} ${c.name}`,
        value: totalsById.get(c.id)?.monthlyTotal ?? 0,
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [db.categories, totalsById]);

  const barData = useMemo(() => {
    const usefulArea = building.livingArea + building.commercialArea || 1;
    return donutData
      .slice(0, 10)
      .map((d) => ({ name: d.name.length > 28 ? `${d.name.slice(0, 26)}…` : d.name, perSqm: round2(d.value / usefulArea) }));
  }, [donutData, building.livingArea, building.commercialArea]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Распределение бюджета</CardTitle>
          <CardDescription>По статьям сметы, ₸/мес.</CardDescription>
        </CardHeader>
        <CardContent className="flex h-80 flex-col gap-2 overflow-hidden sm:flex-row sm:items-center">
          <div className="h-48 w-full shrink-0 sm:h-full sm:w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={1}>
                  {donutData.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <RTooltip formatter={(v) => formatKzt(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1 text-xs">
            {donutData.map((d, i) => (
              <li key={d.name} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: PALETTE[i % PALETTE.length] }}
                />
                <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">{d.name}</span>
                <span className="shrink-0 tabular-nums text-slate-400">{formatKzt(d.value)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Затраты на м² по статьям</CardTitle>
          <CardDescription>₸/м² в месяц, топ-10 статей</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" fontSize={11} />
              <YAxis type="category" dataKey="name" width={160} fontSize={10} />
              <RTooltip formatter={(v) => `${v} ₸/м²`} />
              <Bar dataKey="perSqm" radius={[0, 4, 4, 0]}>
                {barData.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function round2(v: number) {
  return Math.round(v * 100) / 100;
}
