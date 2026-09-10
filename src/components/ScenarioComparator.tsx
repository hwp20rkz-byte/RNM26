"use client";

import { useMemo } from "react";
import { Scale } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProjectsStore } from "@/store/useProjectsStore";
import { useActiveProject } from "@/store/hooks";
import { computeScenarioTariff } from "@/lib/calculator/engine";
import { SCENARIOS } from "@/lib/calculator/presets";
import { formatKzt, formatKztPrecise } from "@/lib/utils";

export function ScenarioComparator() {
  const project = useActiveProject();
  const baseDb = project.baseDb;
  const building = project.building;
  const scenario = project.scenario;
  const setScenario = useProjectsStore((s) => s.setScenario);

  const results = useMemo(
    () => SCENARIOS.map((sc) => ({ sc, result: computeScenarioTariff(baseDb, building, sc) })),
    [baseDb, building],
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-emerald-600" />
          <CardTitle>Шаг 3. Стресс-тест сценариев</CardTitle>
        </div>
        <CardDescription>
          Сравнение трёх уровней обслуживания на текущей конфигурации дома. Клик по карточке
          применяет пресет сценария к конструктору статей (Шаг 2) — после этого позиции можно
          донастроить вручную.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {results.map(({ sc, result }) => {
            const active = scenario === sc.id;
            return (
              <button
                key={sc.id}
                onClick={() => setScenario(sc.id)}
                className={`flex flex-col gap-3 rounded-xl border p-4 text-left transition-all ${
                  active
                    ? "border-emerald-500 bg-emerald-50/60 shadow-md dark:bg-emerald-950/30"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{sc.label}</span>
                  {active && <Badge variant="success">выбрано</Badge>}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{sc.description}</p>
                <div className="mt-auto">
                  <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">
                    {formatKztPrecise(result.tariffPerSqm)} ₸/м²
                  </div>
                  <div className="text-xs text-slate-400">
                    {formatKzt(result.monthlyBudget)} в месяц по дому
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
