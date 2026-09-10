import type { Asset, BuildingProfile } from "../types";
import { genId } from "@/lib/id";

const DEMO_NOTE = "Пример для демонстрации — замените на реальные параметры вашего оборудования";

/**
 * Демонстрационный реестр оборудования для эталонного проекта «Коркем-1» —
 * показывает разброс состояний (от «исправно» до «срок истёк»), как в
 * иллюстративном сценарии «дому 10 лет, насосы изношены на 70-100%».
 * Годы ввода в эксплуатацию условны (реальный год постройки не был предоставлен).
 */
export function seedDemoAssets(building: BuildingProfile): Asset[] {
  const ts = new Date().toISOString();
  const mk = (partial: Omit<Asset, "id" | "createdAt" | "updatedAt">): Asset => ({
    id: genId("asset"),
    createdAt: ts,
    updatedAt: ts,
    ...partial,
  });

  return [
    mk({
      equipmentTypeId: "eq-elevator-passenger",
      name: "Лифты пассажирские",
      category: "elevators",
      quantity: building.elevators || 32,
      installedYear: 2016,
      normativeLifeYears: 25,
      replacementUnitCost: 12_000_000,
      criticalSafety: true,
      notes: DEMO_NOTE,
    }),
    mk({
      equipmentTypeId: "eq-heat-pump",
      name: "Насосы циркуляционные (отопление)",
      category: "heating",
      quantity: 7,
      installedYear: 2017,
      normativeLifeYears: 10,
      replacementUnitCost: 180_000,
      notes: DEMO_NOTE,
    }),
    mk({
      equipmentTypeId: "eq-water-pump",
      name: "Насосы повышения давления (ХВС)",
      category: "water",
      quantity: 3,
      installedYear: 2016,
      normativeLifeYears: 10,
      replacementUnitCost: 200_000,
      notes: DEMO_NOTE,
    }),
    mk({
      equipmentTypeId: "eq-heat-automation",
      name: "Автоматика ИТП",
      category: "heating",
      quantity: 1,
      installedYear: 2016,
      normativeLifeYears: 12,
      replacementUnitCost: 800_000,
      notes: DEMO_NOTE,
    }),
    mk({
      equipmentTypeId: "eq-roof-soft",
      name: "Кровля мягкая (рулонная)",
      category: "roof_facade",
      quantity: 1,
      installedYear: 2016,
      normativeLifeYears: 10,
      replacementUnitCost: 15_000_000,
      notes: DEMO_NOTE,
    }),
    mk({
      equipmentTypeId: "eq-elec-vru",
      name: "ВРУ и электрощитовое оборудование",
      category: "electrical",
      quantity: 1,
      installedYear: 2016,
      normativeLifeYears: 25,
      replacementUnitCost: 2_500_000,
      notes: DEMO_NOTE,
    }),
    mk({
      equipmentTypeId: "eq-fire-alarm",
      name: "Система АПС",
      category: "fire",
      quantity: 1,
      installedYear: 2018,
      normativeLifeYears: 10,
      replacementUnitCost: 1_800_000,
      notes: DEMO_NOTE,
    }),
  ];
}
