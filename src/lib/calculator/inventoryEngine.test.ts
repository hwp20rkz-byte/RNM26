import { describe, expect, it } from "vitest";
import { applyWriteOffToStock, computeAssetMaintenanceCost, computeMaterialsCost, computeStockStatus } from "./inventoryEngine";
import type { MaintenanceLogEntry, SparePartItem } from "./types";

const ts = "2024-01-01T00:00:00.000Z";

function part(partial: Partial<SparePartItem> & Pick<SparePartItem, "id">): SparePartItem {
  return {
    name: partial.id,
    unit: "шт.",
    category: "consumable",
    quantityOnHand: 10,
    minThreshold: 2,
    avgUnitPrice: 100,
    createdAt: ts,
    updatedAt: ts,
    ...partial,
  };
}

function log(partial: Partial<MaintenanceLogEntry> & Pick<MaintenanceLogEntry, "id">): MaintenanceLogEntry {
  return {
    date: "2026-01-01",
    technicianName: "Иванов",
    workType: "routine",
    description: "Работа",
    materialsUsed: [],
    createdAt: ts,
    updatedAt: ts,
    ...partial,
  };
}

describe("computeStockStatus", () => {
  it("считает дефицит и сортирует по убыванию дефицита", () => {
    const parts = [
      part({ id: "p1", quantityOnHand: 5, minThreshold: 2 }), // не дефицит
      part({ id: "p2", quantityOnHand: 0, minThreshold: 10 }), // дефицит 10
      part({ id: "p3", quantityOnHand: 3, minThreshold: 5 }), // дефицит 2
    ];
    const rows = computeStockStatus(parts);
    expect(rows.map((r) => r.item.id)).toEqual(["p2", "p3", "p1"]);
    expect(rows[0].deficit).toBe(10);
    expect(rows[0].isLow).toBe(true);
    expect(rows[2].isLow).toBe(false);
  });

  it("остаток ровно на пороге считается дефицитным", () => {
    const rows = computeStockStatus([part({ id: "p1", quantityOnHand: 5, minThreshold: 5 })]);
    expect(rows[0].isLow).toBe(true);
    expect(rows[0].deficit).toBe(0);
  });
});

describe("computeMaterialsCost", () => {
  it("суммирует количество × цену по всем позициям", () => {
    const cost = computeMaterialsCost([
      { sparePartId: "p1", quantity: 2, unitPrice: 150 },
      { sparePartId: "p2", quantity: 1, unitPrice: 500 },
    ]);
    expect(cost).toBe(800);
  });

  it("пустой список — 0", () => {
    expect(computeMaterialsCost([])).toBe(0);
  });
});

describe("computeAssetMaintenanceCost", () => {
  it("суммирует стоимость материалов и часы только по записям указанного актива", () => {
    const logs = [
      log({ id: "l1", assetId: "a1", materialsUsed: [{ sparePartId: "p1", quantity: 2, unitPrice: 100 }], laborHours: 2 }),
      log({ id: "l2", assetId: "a1", materialsUsed: [{ sparePartId: "p2", quantity: 1, unitPrice: 300 }], laborHours: 1 }),
      log({ id: "l3", assetId: "a2", materialsUsed: [{ sparePartId: "p1", quantity: 5, unitPrice: 100 }], laborHours: 3 }),
    ];
    const summary = computeAssetMaintenanceCost("a1", logs);
    expect(summary.entriesCount).toBe(2);
    expect(summary.materialsCost).toBe(500);
    expect(summary.laborHours).toBe(3);
  });

  it("актив без записей — нулевая сводка", () => {
    const summary = computeAssetMaintenanceCost("unknown", []);
    expect(summary.entriesCount).toBe(0);
    expect(summary.materialsCost).toBe(0);
  });
});

describe("applyWriteOffToStock", () => {
  it("уменьшает остаток по списанным позициям, не мутируя исходный массив", () => {
    const parts = [part({ id: "p1", quantityOnHand: 10 }), part({ id: "p2", quantityOnHand: 5 })];
    const result = applyWriteOffToStock(parts, [{ sparePartId: "p1", quantity: 3, unitPrice: 100 }]);
    expect(result.find((p) => p.id === "p1")?.quantityOnHand).toBe(7);
    expect(result.find((p) => p.id === "p2")?.quantityOnHand).toBe(5);
    expect(parts.find((p) => p.id === "p1")?.quantityOnHand).toBe(10); // исходный массив не тронут
  });

  it("суммирует несколько списаний одной позиции за один наряд", () => {
    const parts = [part({ id: "p1", quantityOnHand: 10 })];
    const result = applyWriteOffToStock(parts, [
      { sparePartId: "p1", quantity: 3, unitPrice: 100 },
      { sparePartId: "p1", quantity: 2, unitPrice: 100 },
    ]);
    expect(result[0].quantityOnHand).toBe(5);
  });

  it("не даёт остатку уйти ниже нуля", () => {
    const parts = [part({ id: "p1", quantityOnHand: 2 })];
    const result = applyWriteOffToStock(parts, [{ sparePartId: "p1", quantity: 10, unitPrice: 100 }]);
    expect(result[0].quantityOnHand).toBe(0);
  });
});
