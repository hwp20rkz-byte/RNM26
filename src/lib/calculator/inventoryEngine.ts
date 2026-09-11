import type { MaintenanceLogEntry, MaterialUsage, SparePartItem } from "./types";

// ---------------------------------------------------------------------------
// Склад ЗИП и стоимость обслуживания оборудования.
//
// Межповерочный интервал/дата следующей поверки сознательно не считаются
// здесь — это MaintenanceTask с assetId, статус вычисляется уже написанным
// computeMaintenanceStatus() из maintenanceCalendar.ts. Дублировать эту
// логику здесь означало бы два источника истины для одной и той же даты.
// ---------------------------------------------------------------------------

export interface StockStatusRow {
  item: SparePartItem;
  deficit: number;
  isLow: boolean;
}

/** Позиции склада, где остаток на грани или ниже неснижаемого запаса — для заявки на закупку. */
export function computeStockStatus(spareParts: SparePartItem[]): StockStatusRow[] {
  return spareParts
    .map((item) => ({
      item,
      deficit: round2(Math.max(0, item.minThreshold - item.quantityOnHand)),
      isLow: item.quantityOnHand <= item.minThreshold,
    }))
    .sort((a, b) => b.deficit - a.deficit);
}

export function computeMaterialsCost(materialsUsed: MaterialUsage[]): number {
  return round2(materialsUsed.reduce((sum, m) => sum + m.quantity * m.unitPrice, 0));
}

export interface AssetMaintenanceCostSummary {
  assetId: string;
  entriesCount: number;
  materialsCost: number;
  laborHours: number;
}

/** Суммарная стоимость материалов и трудозатрат по конкретному активу за все записи журнала. */
export function computeAssetMaintenanceCost(
  assetId: string,
  logs: MaintenanceLogEntry[],
): AssetMaintenanceCostSummary {
  const assetLogs = logs.filter((l) => l.assetId === assetId);
  return {
    assetId,
    entriesCount: assetLogs.length,
    materialsCost: round2(assetLogs.reduce((sum, l) => sum + computeMaterialsCost(l.materialsUsed), 0)),
    laborHours: round2(assetLogs.reduce((sum, l) => sum + (l.laborHours ?? 0), 0)),
  };
}

/** Иммутабельно применяет списание материалов к складу — не мутирует исходный массив. */
export function applyWriteOffToStock(
  spareParts: SparePartItem[],
  materialsUsed: MaterialUsage[],
): SparePartItem[] {
  const usedByPart = new Map<string, number>();
  for (const m of materialsUsed) {
    usedByPart.set(m.sparePartId, (usedByPart.get(m.sparePartId) ?? 0) + m.quantity);
  }
  return spareParts.map((p) => {
    const used = usedByPart.get(p.id);
    if (!used) return p;
    return { ...p, quantityOnHand: round2(Math.max(0, p.quantityOnHand - used)) };
  });
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
