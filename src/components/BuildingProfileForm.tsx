"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Building2, MapPin, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NumberField } from "@/components/NumberField";
import { useProjectsStore } from "@/store/useProjectsStore";
import { useActiveProject, useActiveTariff } from "@/store/hooks";
import { buildingProfileSchema } from "@/lib/calculator/validation";
import { OBJECT_TYPE_LABELS, PRESET_FIELD_HELP } from "@/lib/calculator/presets";
import { REGIONAL_MIN_TARIFFS } from "@/lib/calculator/minTariffs";
import { computeParkingBilledPerSpot, computeUsefulArea } from "@/lib/calculator/engine";
import { formatKztPrecise } from "@/lib/utils";
import type { ObjectType } from "@/lib/calculator/types";

export function BuildingProfileForm() {
  const project = useActiveProject();
  const tariff = useActiveTariff();
  const building = project.building;
  const setBuilding = useProjectsStore((s) => s.setBuilding);
  const presets = useProjectsStore((s) => s.presets);
  const setPreset = useProjectsStore((s) => s.setPreset);
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

  const usefulArea = computeUsefulArea(building);
  const totalFloors = building.floorsPerEntrance.reduce((a, b) => a + b, 0);
  const activePreset = presets.find((p) => p.id === project.presetId) ?? presets[0];

  function onPresetChange(id: string) {
    setPreset(id);
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
            <Select value={project.presetId} onValueChange={onPresetChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {presets.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                    {!p.builtIn ? " · свой" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>

        {activePreset && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-800/40">
            <p className="mb-1.5 text-slate-600 dark:text-slate-300">{activePreset.description}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500 dark:text-slate-400">
              <span title={PRESET_FIELD_HELP.priceMultiplier.help}>
                {PRESET_FIELD_HELP.priceMultiplier.label}: <b>×{activePreset.priceMultiplier}</b>
              </span>
              <span title={PRESET_FIELD_HELP.maxServiceClass.help}>
                {PRESET_FIELD_HELP.maxServiceClass.label}: <b>{activePreset.maxServiceClass}</b>
              </span>
              <span title={PRESET_FIELD_HELP.capitalRepairMrpMultiplier.help}>
                {PRESET_FIELD_HELP.capitalRepairMrpMultiplier.label}: <b>{activePreset.capitalRepairMrpMultiplier} МРП</b>
              </span>
              <span title={PRESET_FIELD_HELP.commercialRateCoefficient.help}>
                {PRESET_FIELD_HELP.commercialRateCoefficient.label}: <b>×{activePreset.commercialRateCoefficient}</b>
              </span>
            </div>
            <p className="mt-1.5 text-slate-400">
              Выбор пресета сразу обновляет взнос на капремонт и коэффициент для нежилых ниже — при
              необходимости донастройте их вручную. Отредактировать состав пресетов или создать свой
              — во вкладке «Пресеты» рядом с Конструктором.
            </p>
          </div>
        )}

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
            Полезная площадь для формулы тарифа (S полез.) = жилая + коммерческая + кладовые +
            паркинг ={" "}
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {usefulArea.toLocaleString("ru-RU")} м²
            </span>
            . Кладовые и машиноместа участвуют в базе тарифа наравне с жильём, но платят по своему
            коэффициенту ниже — не по полной ставке автоматически.
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
            <NumberField
              label="Коэффициент тарифа для кладовых"
              value={building.storageRateCoefficient}
              step={0.1}
              onChange={(v) => setBuilding({ storageRateCoefficient: v })}
              hint="Решение общего собрания; 1.0 = равный тариф, обычно ниже"
            />
            <NumberField
              label="Коэффициент тарифа для машиномест"
              value={building.parkingRateCoefficient}
              step={0.1}
              onChange={(v) => setBuilding({ parkingRateCoefficient: v })}
              hint="Решение общего собрания; 1.0 = равный тариф, обычно ниже"
            />
          </div>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Паркинг — минимум и резерв на неплатежи
          </h4>
          <p className="mb-2 text-xs text-slate-400">
            Собственники машиномест часто не проживают в доме — площадная ставка (коэффициент выше)
            может не дотягивать до реальной себестоимости содержания паркинга. Ниже — фиксированный
            минимум платы за место и запас на ожидаемую долю неплательщиков; начисляемая ставка =
            max(площадная ставка, минимум) / (1 − % неплательщиков).
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <NumberField
              label="Минимум платы за место"
              suffix="₸/мес."
              value={building.parkingFlatFeePerSpot}
              step={500}
              onChange={(v) => setBuilding({ parkingFlatFeePerSpot: v })}
              hint="0 = минимум не действует, платят только по площадной ставке"
              error={touched ? errors.parkingFlatFeePerSpot : undefined}
            />
            <NumberField
              label="Ожидаемый % неплательщиков среди владельцев машиномест"
              suffix="%"
              value={building.parkingNonPaymentRatePercent}
              step={5}
              onChange={(v) => setBuilding({ parkingNonPaymentRatePercent: v })}
              hint="0 = резерв не действует. Не угадывайте — берите из фактической истории сборов по паркингу"
              error={touched ? errors.parkingNonPaymentRatePercent : undefined}
            />
            {building.parkingSpots > 0 && (
              <div className="flex flex-col justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800/40">
                <span className="text-slate-400">Итоговая начисляемая ставка за место</span>
                <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                  {formatKztPrecise(computeParkingBilledPerSpot(tariff, building))} ₸/мес.
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
