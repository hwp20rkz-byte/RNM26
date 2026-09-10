"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Building2, MapPin, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NumberField } from "@/components/NumberField";
import { useProjectsStore } from "@/store/useProjectsStore";
import { useActiveProject } from "@/store/hooks";
import { buildingProfileSchema } from "@/lib/calculator/validation";
import { OBJECT_TYPE_LABELS, SERVICE_CLASS_LABELS } from "@/lib/calculator/presets";
import { REGIONAL_MIN_TARIFFS } from "@/lib/calculator/minTariffs";
import type { ObjectType, ServiceClass } from "@/lib/calculator/types";

const SERVICE_CLASS_PRESETS: Record<ServiceClass, { capitalRepairMrpMultiplier: number; commercialRateCoefficient: number }> = {
  economy: { capitalRepairMrpMultiplier: 0.005, commercialRateCoefficient: 1.0 },
  comfort: { capitalRepairMrpMultiplier: 0.007, commercialRateCoefficient: 1.3 },
  business: { capitalRepairMrpMultiplier: 0.01, commercialRateCoefficient: 1.6 },
  premium: { capitalRepairMrpMultiplier: 0.015, commercialRateCoefficient: 2.0 },
};

export function BuildingProfileForm() {
  const building = useActiveProject().building;
  const setBuilding = useProjectsStore((s) => s.setBuilding);
  const applyServiceClassPreset = useProjectsStore((s) => s.applyServiceClassPreset);
  const [touched, setTouched] = useState(false);

  const errors = useMemo(() => {
    const result = buildingProfileSchema.safeParse(building);
    if (result.success) return {};
    const map: Record<string, string> = {};
    for (const issue of result.error.issues) {
      map[String(issue.path[0])] = issue.message;
    }
    return map;
  }, [building]);

  const usefulArea = building.livingArea + building.commercialArea;
  const totalFloors = building.floorsPerEntrance.reduce((a, b) => a + b, 0);

  function onServiceClassChange(sc: ServiceClass) {
    const preset = SERVICE_CLASS_PRESETS[sc];
    applyServiceClassPreset({ serviceClass: sc, ...preset });
    setTouched(true);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-emerald-600" />
          <CardTitle>Шаг 1. Конфигуратор объекта</CardTitle>
        </div>
        <CardDescription>
          Параметры объекта — база для расчёта тарифа и объёмов работ. Подходит для любого жилого
          и нежилого объекта, не только кондоминиума.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Название объекта
            </span>
            <input
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900"
              value={building.name}
              onChange={(e) => setBuilding({ name: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Адрес</span>
            <input
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900"
              value={building.address}
              onChange={(e) => setBuilding({ address: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Тип объекта
            </span>
            <Select value={building.objectType} onValueChange={(v) => setBuilding({ objectType: v as ObjectType })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(OBJECT_TYPE_LABELS) as ObjectType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {OBJECT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              <MapPin className="h-3.5 w-3.5" /> Регион (для сверки с минимальным тарифом маслихата)
            </span>
            <Select value={building.region} onValueChange={(v) => setBuilding({ region: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REGIONAL_MIN_TARIFFS.map((r) => (
                  <SelectItem key={r.region} value={r.region}>
                    {r.region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Sparkles className="h-3.5 w-3.5" /> Класс обслуживания (пресет)
            </span>
            <Select value={building.serviceClass} onValueChange={(v) => onServiceClassChange(v as ServiceClass)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SERVICE_CLASS_LABELS) as ServiceClass[]).map((sc) => (
                  <SelectItem key={sc} value={sc}>
                    {SERVICE_CLASS_LABELS[sc]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>

        {building.objectType !== "residential" && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Методика №166 и Закон РК «О жилищных отношениях» писаны для кондоминиумов (жильё).
              Для {building.objectType === "commercial" ? "нежилого" : "смешанного"} объекта формула
              «стоимость / площадь» применяется по аналогии как общий расчётный подход, а не как
              обязательный нормативный расчёт — юридическую применимость к вашему случаю (аренда,
              эксплуатация БЦ/ТРЦ и т.п.) уточните отдельно.
            </p>
          </div>
        )}

        <div>
          <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Площади</h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <NumberField
              label="Полезная площадь жилых помещений"
              suffix="м²"
              value={building.livingArea}
              onChange={(v) => setBuilding({ livingArea: v })}
              error={touched ? errors.livingArea : undefined}
            />
            <NumberField
              label="Площадь коммерческих/нежилых помещений"
              suffix="м²"
              value={building.commercialArea}
              onChange={(v) => setBuilding({ commercialArea: v })}
            />
            <NumberField
              label="Площадь кладовых"
              suffix="м²"
              value={building.storageArea}
              onChange={(v) => setBuilding({ storageArea: v })}
            />
            <NumberField
              label="Асфальт / брусчатка территории"
              suffix="м²"
              value={building.yardPavedArea}
              onChange={(v) => setBuilding({ yardPavedArea: v })}
            />
            <NumberField
              label="Газон / озеленение"
              suffix="м²"
              value={building.yardGreenArea}
              onChange={(v) => setBuilding({ yardGreenArea: v })}
            />
            <NumberField
              label="Площадь паркинга"
              suffix="м²"
              value={building.parkingArea}
              onChange={(v) => setBuilding({ parkingArea: v })}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Полезная площадь для формулы тарифа (S полез.) = жилая + коммерческая ={" "}
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {usefulArea.toLocaleString("ru-RU")} м²
            </span>
          </p>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Конструктив</h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <NumberField
              label="Количество квартир / помещений"
              value={building.apartments}
              onChange={(v) => setBuilding({ apartments: Math.round(v) })}
            />
            <NumberField
              label="Количество подъездов / входов"
              value={building.entrances}
              onChange={(v) =>
                setBuilding({
                  entrances: Math.round(v),
                  floorsPerEntrance: Array.from(
                    { length: Math.max(1, Math.round(v)) },
                    (_, i) => building.floorsPerEntrance[i] ?? 12,
                  ),
                })
              }
              error={touched ? errors.entrances : undefined}
            />
            <NumberField
              label="Этажность (среднее по подъездам)"
              value={Math.round(totalFloors / Math.max(1, building.entrances))}
              onChange={(v) =>
                setBuilding({
                  floorsPerEntrance: Array(building.entrances).fill(Math.round(v)),
                })
              }
              hint={`Всего этажей по объекту: ${totalFloors}`}
            />
            <NumberField
              label="Количество лифтов"
              value={building.elevators}
              onChange={(v) => setBuilding({ elevators: Math.round(v) })}
            />
            <NumberField
              label="Количество паркомест"
              value={building.parkingSpots}
              onChange={(v) => setBuilding({ parkingSpots: Math.round(v) })}
            />
            <NumberField
              label="Годовой доход от аренды/рекламы (Д год)"
              suffix="₸"
              value={building.annualCommercialIncome}
              onChange={(v) => setBuilding({ annualCommercialIncome: v })}
            />
          </div>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Взносы и коэффициенты
          </h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <NumberField
              label="Взнос на капремонт (в кратности МРП/м²/мес.)"
              value={building.capitalRepairMrpMultiplier}
              step={0.001}
              onChange={(v) => setBuilding({ capitalRepairMrpMultiplier: v })}
              hint="Минимум 0,005 МРП — ст.60-1 Закона «О жилищных отношениях» (для жилых объектов)"
              error={touched ? errors.capitalRepairMrpMultiplier : undefined}
            />
            <NumberField
              label="Коэффициент тарифа для нежилых помещений"
              value={building.commercialRateCoefficient}
              step={0.1}
              onChange={(v) => setBuilding({ commercialRateCoefficient: v })}
              hint="Решение общего собрания; 1.0 = равный тариф"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
