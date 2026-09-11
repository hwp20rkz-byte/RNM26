"use client";

import { useState } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InlineNumber, InlineText } from "@/components/InlineEdit";
import { useProjectsStore } from "@/store/useProjectsStore";
import { EQUIPMENT_CATEGORY_LABELS } from "@/lib/calculator/data/equipmentTypes";
import { useT } from "@/lib/i18n/useT";
import type { EquipmentCategory } from "@/lib/calculator/types";

const CATEGORIES = Object.keys(EQUIPMENT_CATEGORY_LABELS) as EquipmentCategory[];

export function EquipmentTypeCatalog() {
  const t = useT();
  const equipmentTypes = useProjectsStore((s) => s.equipmentTypes);
  const addEquipmentType = useProjectsStore((s) => s.addEquipmentType);
  const updateEquipmentType = useProjectsStore((s) => s.updateEquipmentType);
  const removeEquipmentType = useProjectsStore((s) => s.removeEquipmentType);
  const [newCategory, setNewCategory] = useState<EquipmentCategory>("other");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("etcTitle")}</CardTitle>
        <CardDescription>{t("etcDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as EquipmentCategory)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {EQUIPMENT_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <button
            onClick={() =>
              addEquipmentType({
                name: t("etcNewTypeName"),
                category: newCategory,
                normativeLifeYears: 10,
                source: t("etcNewTypeSource"),
              })
            }
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
          >
            <Plus className="h-4 w-4" /> {t("etcAddButton")}
          </button>
        </div>

        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {equipmentTypes.map((et) => (
            <div key={et.id} className="flex flex-col gap-1.5 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <InlineText
                  value={et.name}
                  onChange={(v) => updateEquipmentType(et.id, { name: v })}
                  className="min-w-[12rem] flex-1 font-medium"
                />
                <Badge variant="outline">{EQUIPMENT_CATEGORY_LABELS[et.category]}</Badge>
                {et.criticalSafety && (
                  <Badge variant="outline" className="gap-1 text-rose-500">
                    <AlertTriangle className="h-3 w-3" /> {t("etcSafetyBadge")}
                  </Badge>
                )}
                <label className="flex items-center gap-1 text-xs text-slate-500">
                  {t("etcLifeLabel")}
                  <InlineNumber
                    value={et.normativeLifeYears}
                    onChange={(v) => updateEquipmentType(et.id, { normativeLifeYears: Math.max(1, Math.round(v)) })}
                    className="w-14"
                  />
                </label>
                <button
                  onClick={() => removeEquipmentType(et.id)}
                  className="rounded-md p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-400">{et.source}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
