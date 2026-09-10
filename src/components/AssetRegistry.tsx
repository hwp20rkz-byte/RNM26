"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Gauge, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InlineNumber, InlineText } from "@/components/InlineEdit";
import { useProjectsStore } from "@/store/useProjectsStore";
import { useActiveProject } from "@/store/hooks";
import { computeAllWear, CONDITION_LABELS } from "@/lib/calculator/wearEngine";
import { EQUIPMENT_CATEGORY_LABELS } from "@/lib/calculator/data/equipmentTypes";
import { formatKzt } from "@/lib/utils";
import type { AssetCondition, EquipmentCategory } from "@/lib/calculator/types";

const CONDITION_BADGE: Record<AssetCondition, "success" | "warning" | "danger" | "outline"> = {
  good: "success",
  satisfactory: "success",
  attention: "warning",
  critical: "danger",
  expired: "danger",
};

const CONDITION_BAR_COLOR: Record<AssetCondition, string> = {
  good: "bg-emerald-500",
  satisfactory: "bg-lime-500",
  attention: "bg-amber-500",
  critical: "bg-rose-500",
  expired: "bg-rose-700",
};

const CURRENT_YEAR = new Date().getFullYear();

export function AssetRegistry() {
  const project = useActiveProject();
  const equipmentTypes = useProjectsStore((s) => s.equipmentTypes);
  const addAsset = useProjectsStore((s) => s.addAsset);
  const updateAsset = useProjectsStore((s) => s.updateAsset);
  const removeAsset = useProjectsStore((s) => s.removeAsset);
  const insertReplacementIntoSmeta = useProjectsStore((s) => s.insertReplacementIntoSmeta);

  const [newTypeId, setNewTypeId] = useState(equipmentTypes[0]?.id ?? "");
  const [targetCategory, setTargetCategory] = useState<Record<string, string>>({});

  const wears = useMemo(() => computeAllWear(project.assets, CURRENT_YEAR), [project.assets]);
  const wearById = useMemo(() => new Map(wears.map((w) => [w.assetId, w])), [wears]);

  const sortedAssets = useMemo(
    () => [...project.assets].sort((a, b) => (wearById.get(b.id)?.wearPercent ?? 0) - (wearById.get(a.id)?.wearPercent ?? 0)),
    [project.assets, wearById],
  );

  const expiredCritical = sortedAssets.filter(
    (a) => a.criticalSafety && (wearById.get(a.id)?.wearPercent ?? 0) >= 100,
  );

  function handleAdd() {
    const type = equipmentTypes.find((t) => t.id === newTypeId);
    addAsset({
      name: type?.name ?? "Новое оборудование",
      category: (type?.category ?? "other") as EquipmentCategory,
      quantity: 1,
      installedYear: CURRENT_YEAR,
      normativeLifeYears: type?.normativeLifeYears ?? 10,
      replacementUnitCost: 0,
      equipmentTypeId: type?.id,
      criticalSafety: type?.criticalSafety,
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-emerald-600" />
          <CardTitle>Реестр оборудования и износ</CardTitle>
        </div>
        <CardDescription>
          Износ% = Возраст / Нормативный срок × 100 — практичная оценка «по паспорту», приоритет
          для планирования, а не замена экспертного обследования (методика ВСН 53-86(р)). Для
          лифтов истечение срока — не рекомендация, а требование ТР ТС 011/2011: эксплуатация без
          экспертизы промышленной безопасности не допускается. Отсортировано по убыванию износа.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {expiredCritical.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Назначенный срок истёк у критичного по безопасности оборудования:{" "}
              <b>{expiredCritical.map((a) => a.name).join(", ")}</b>. Для лифтов дальнейшая
              эксплуатация без экспертизы промышленной безопасности (продление/модернизация/замена)
              не допускается по ТР ТС 011/2011.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={newTypeId}
            onChange={(e) => setNewTypeId(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            {equipmentTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {EQUIPMENT_CATEGORY_LABELS[t.category]} — {t.name} ({t.normativeLifeYears} лет)
              </option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
          >
            <Plus className="h-4 w-4" /> Добавить в реестр
          </button>
        </div>

        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {sortedAssets.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">
              Реестр пуст — добавьте оборудование из справочника типов выше.
            </p>
          )}
          {sortedAssets.map((asset) => {
            const wear = wearById.get(asset.id)!;
            return (
              <div key={asset.id} className="flex flex-col gap-2 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <InlineText
                    value={asset.name}
                    onChange={(v) => updateAsset(asset.id, { name: v })}
                    className="min-w-[10rem] flex-1 font-medium"
                  />
                  <Badge variant="outline">{EQUIPMENT_CATEGORY_LABELS[asset.category]}</Badge>
                  {asset.criticalSafety && (
                    <Badge variant="outline" className="gap-1 text-rose-500">
                      <AlertTriangle className="h-3 w-3" /> безопасность
                    </Badge>
                  )}
                  <Badge variant={CONDITION_BADGE[wear.condition]}>{CONDITION_LABELS[wear.condition]}</Badge>
                  <span className="ml-auto text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                    {wear.wearPercent}%
                  </span>
                  <button
                    onClick={() => removeAsset(asset.id)}
                    className="rounded-md p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full ${CONDITION_BAR_COLOR[wear.condition]}`}
                    style={{ width: `${Math.min(100, wear.wearPercent)}%` }}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <label className="flex items-center gap-1">
                    Кол-во
                    <InlineNumber value={asset.quantity} onChange={(v) => updateAsset(asset.id, { quantity: Math.max(1, Math.round(v)) })} className="w-14" />
                  </label>
                  <label className="flex items-center gap-1">
                    Год ввода
                    <InlineNumber value={asset.installedYear} onChange={(v) => updateAsset(asset.id, { installedYear: Math.round(v) })} className="w-16" />
                  </label>
                  <label className="flex items-center gap-1">
                    Норм. срок, лет
                    <InlineNumber value={asset.normativeLifeYears} onChange={(v) => updateAsset(asset.id, { normativeLifeYears: Math.max(1, Math.round(v)) })} className="w-14" />
                  </label>
                  <label className="flex items-center gap-1">
                    Цена замены/ед., ₸
                    <InlineNumber value={asset.replacementUnitCost} onChange={(v) => updateAsset(asset.id, { replacementUnitCost: v })} className="w-24" step={1000} />
                  </label>
                  <span>
                    Возраст: <b>{wear.ageYears} лет</b>
                  </span>
                  <span>
                    Остаток ресурса: <b>{wear.remainingYears} лет</b>
                  </span>
                  <span>
                    Плановый год замены: <b>{wear.targetReplacementYear}</b>
                  </span>
                  <span>
                    Стоимость замены: <b>{formatKzt(wear.replacementCost)}</b>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <label className="flex items-center gap-1 text-slate-400">
                    Ручная корректировка износа, %
                    <InlineNumber
                      value={asset.manualWearOverridePercent ?? wear.wearPercent}
                      onChange={(v) => updateAsset(asset.id, { manualWearOverridePercent: v })}
                      className="w-14"
                    />
                    {asset.manualWearOverridePercent !== undefined && (
                      <button
                        onClick={() => updateAsset(asset.id, { manualWearOverridePercent: undefined })}
                        className="text-emerald-600 hover:underline"
                      >
                        сбросить
                      </button>
                    )}
                  </label>

                  <select
                    value={targetCategory[asset.id] ?? "2.7"}
                    onChange={(e) => setTargetCategory((s) => ({ ...s, [asset.id]: e.target.value }))}
                    className="ml-auto h-7 max-w-[12rem] rounded-md border border-slate-200 bg-transparent px-1 text-xs text-slate-500 dark:border-slate-700"
                  >
                    {project.db.categories
                      .filter((c) => c.group === "maintenance")
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} {c.name}
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={() => insertReplacementIntoSmeta(asset.id, targetCategory[asset.id] ?? "2.7")}
                    className="rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                  >
                    В смету «{project.name}»
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
