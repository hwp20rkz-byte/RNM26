"use client";

import { useMemo } from "react";
import { Scale } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProjectsStore } from "@/store/useProjectsStore";
import { useActiveProject } from "@/store/hooks";
import { computePresetTariff } from "@/lib/calculator/engine";
import { formatKzt, formatKztPrecise } from "@/lib/utils";

export function ScenarioComparator() {
  const project = useActiveProject();
  const baseDb = project.baseDb;
  const building = project.building;
  const presetId = project.presetId;
  const presets = useProjectsStore((s) => s.presets);
  const setPreset = useProjectsStore((s) => s.setPreset);

  const results = useMemo(
    () => presets.map((preset) => ({ preset, result: computePresetTariff(baseDb, building, preset) })),
    [presets, baseDb, building],
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-emerald-600" />
          <CardTitle>Шаг 3. Сравнение пресетов обслуживания</CardTitle>
        </div>
        <CardDescription>
          Тот же выбор, что и «Класс обслуживания» в Шаге 1 — здесь видно тариф сразу по всем
          пресетам (встроенным и своим) на текущей конфигурации объекта. Клик по карточке
          применяет пресет к конструктору статей — после этого позиции можно донастроить вручную.
          Создать свой пресет или посмотреть, что именно меняет каждый — во вкладке «Пресеты».
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {results.map(({ preset, result }) => {
            const active = presetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => setPreset(preset.id)}
                className={`flex flex-col gap-3 rounded-xl border p-4 text-left transition-all ${
                  active
                    ? "border-emerald-500 bg-emerald-50/60 shadow-md dark:bg-emerald-950/30"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{preset.label}</span>
                  {active && <Badge variant="success">выбрано</Badge>}
                  {!preset.builtIn && <Badge variant="outline">свой</Badge>}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{preset.description}</p>
                <div className="mt-auto">
                  <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">
                    {formatKztPrecise(result.tariffPerSqm)} ₸/м²
                  </div>
                  <div className="text-xs text-slate-400">
                    {formatKzt(result.monthlyBudget)} в месяц по объекту
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
