"use client";

import { useActiveProject, useActiveTariff } from "@/store/hooks";
import { useProjectsStore } from "@/store/useProjectsStore";
import { formatKzt, formatKztPrecise } from "@/lib/utils";

export function PrintSummary() {
  const project = useActiveProject();
  const building = project.building;
  const presets = useProjectsStore((s) => s.presets);
  const presetLabel = presets.find((p) => p.id === project.presetId)?.label ?? project.presetId;
  const db = project.db;
  const tariff = useActiveTariff();

  const categoryTotals = new Map(tariff.categoryTotals.map((t) => [t.categoryId, t]));
  const topLevel = db.categories.filter((c) => c.parentId === null);

  return (
    <div className="print-only">
      <h1 className="text-xl font-bold">Смета расходов ОСИ / ПТ «{building.name}»</h1>
      <p className="text-sm text-slate-500">
        {building.address} · Пресет: {presetLabel}
      </p>

      <table className="mt-4 w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border border-slate-300 p-2 text-left">Раздел</th>
            <th className="border border-slate-300 p-2 text-right">₸/год</th>
            <th className="border border-slate-300 p-2 text-right">₸/мес</th>
          </tr>
        </thead>
        <tbody>
          {topLevel.map((c) => (
            <tr key={c.id}>
              <td className="border border-slate-300 p-2">
                {c.code}. {c.name}
              </td>
              <td className="border border-slate-300 p-2 text-right">
                {formatKzt(categoryTotals.get(c.id)?.annualTotal ?? 0)}
              </td>
              <td className="border border-slate-300 p-2 text-right">
                {formatKzt(categoryTotals.get(c.id)?.monthlyTotal ?? 0)}
              </td>
            </tr>
          ))}
          <tr className="font-bold">
            <td className="border border-slate-300 p-2">Итого (Р год)</td>
            <td className="border border-slate-300 p-2 text-right">{formatKzt(tariff.annualTotalCost)}</td>
            <td className="border border-slate-300 p-2 text-right">{formatKzt(tariff.annualTotalCost / 12)}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-4 text-sm">
        <p>Д год (доход от коммерческого использования): {formatKzt(tariff.annualCommercialIncome)}</p>
        <p>S полез.: {tariff.usefulArea.toLocaleString("ru-RU")} м²</p>
        <p className="mt-2 text-base font-bold">
          Тариф В = {formatKztPrecise(tariff.tariffPerSqm)} ₸/м² в месяц
        </p>
        <p>Бюджет сборов в месяц: {formatKzt(tariff.monthlyBudget)}</p>
      </div>

      <div className="mt-10 flex justify-between text-sm">
        <div>
          <p>Председатель ОСИ: ______________________</p>
        </div>
        <div>
          <p>Ревизионная комиссия: ______________________</p>
        </div>
      </div>
    </div>
  );
}
