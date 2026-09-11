import ExcelJS from "exceljs";
import type { MaintenanceLogEntry, SparePartItem } from "@/lib/calculator/types";
import { MAINTENANCE_WORK_TYPE_LABELS, SPARE_PART_CATEGORY_LABELS } from "@/lib/calculator/types";
import { computeStockStatus } from "@/lib/calculator/inventoryEngine";

const KZT_FMT = '#,##0.00 "₸"';
const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
const ZEBRA_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
const DEFICIT_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };

/**
 * Ведомость остатков склада ЗИП + акт списания материалов по журналу работ.
 * Названия листов намеренно нейтральные — унифицированной формы списания,
 * закреплённой отдельным НПА РК под конкретным номером, я подтвердить не
 * смог, поэтому не приписываю документу вымышленный номер формы.
 */
export async function exportInventoryToExcelBlob(
  buildingName: string,
  spareParts: SparePartItem[],
  maintenanceLogs: MaintenanceLogEntry[],
  assetNameById: Map<string, string>,
): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "QazaqOSI";
  wb.created = new Date();

  const stock = wb.addWorksheet("Остатки склада ЗИП");
  stock.columns = [
    { header: "Категория", key: "category", width: 16 },
    { header: "Наименование", key: "name", width: 34 },
    { header: "Ед.изм.", key: "unit", width: 10 },
    { header: "Остаток", key: "qty", width: 12 },
    { header: "Неснижаемый запас", key: "threshold", width: 16 },
    { header: "Цена, ₸", key: "price", width: 14 },
    { header: "Стоимость остатка, ₸", key: "value", width: 18 },
    { header: "Дефицит", key: "deficit", width: 10 },
  ];
  stock.getRow(1).eachCell((c) => {
    c.fill = HEADER_FILL;
    c.font = { color: { argb: "FFFFFFFF" }, bold: true };
  });
  stock.getRow(1).height = 20;

  const statuses = computeStockStatus(spareParts);
  statuses.forEach((s, i) => {
    const row = stock.getRow(i + 2);
    row.values = {
      category: SPARE_PART_CATEGORY_LABELS[s.item.category],
      name: s.item.name,
      unit: s.item.unit,
      qty: s.item.quantityOnHand,
      threshold: s.item.minThreshold,
      price: s.item.avgUnitPrice,
      value: { formula: `D${i + 2}*F${i + 2}` },
      deficit: s.isLow ? "да" : "",
    };
    row.getCell("price").numFmt = KZT_FMT;
    row.getCell("value").numFmt = KZT_FMT;
    if (s.isLow) row.eachCell((c) => (c.fill = DEFICIT_FILL));
    else if (i % 2 === 1) row.eachCell((c) => (c.fill = ZEBRA_FILL));
  });

  const acts = wb.addWorksheet("Акт списания материалов");
  acts.columns = [
    { header: "Дата", key: "date", width: 12 },
    { header: "Оборудование", key: "asset", width: 26 },
    { header: "Тип работы", key: "workType", width: 16 },
    { header: "Описание", key: "description", width: 40 },
    { header: "Техник", key: "technician", width: 20 },
    { header: "Материал", key: "material", width: 26 },
    { header: "Кол-во", key: "qty", width: 10 },
    { header: "Цена, ₸", key: "price", width: 14 },
    { header: "Сумма, ₸", key: "sum", width: 16 },
  ];
  acts.getRow(1).eachCell((c) => {
    c.fill = HEADER_FILL;
    c.font = { color: { argb: "FFFFFFFF" }, bold: true };
  });
  acts.getRow(1).height = 20;

  const sparePartById = new Map(spareParts.map((p) => [p.id, p]));
  let r = 1;
  let totalWriteOff = 0;
  for (const log of [...maintenanceLogs].sort((a, b) => a.date.localeCompare(b.date))) {
    const assetName = log.assetId ? (assetNameById.get(log.assetId) ?? "") : "";
    if (log.materialsUsed.length === 0) {
      r += 1;
      acts.getRow(r).values = {
        date: log.date,
        asset: assetName,
        workType: MAINTENANCE_WORK_TYPE_LABELS[log.workType],
        description: log.description,
        technician: log.technicianName,
      };
      continue;
    }
    for (const m of log.materialsUsed) {
      r += 1;
      const sum = m.quantity * m.unitPrice;
      totalWriteOff += sum;
      const row = acts.getRow(r);
      row.values = {
        date: log.date,
        asset: assetName,
        workType: MAINTENANCE_WORK_TYPE_LABELS[log.workType],
        description: log.description,
        technician: log.technicianName,
        material: sparePartById.get(m.sparePartId)?.name ?? m.sparePartId,
        qty: m.quantity,
        price: m.unitPrice,
        sum,
      };
      row.getCell("price").numFmt = KZT_FMT;
      row.getCell("sum").numFmt = KZT_FMT;
    }
  }
  r += 2;
  acts.getCell(`H${r}`).value = "Итого списано:";
  acts.getCell(`H${r}`).font = { bold: true };
  acts.getCell(`I${r}`).value = totalWriteOff;
  acts.getCell(`I${r}`).numFmt = KZT_FMT;
  acts.getCell(`I${r}`).font = { bold: true };

  const info = wb.addWorksheet("Сводка");
  info.getCell("A1").value = `Объект: ${buildingName}`;
  info.getCell("A2").value = `Дата формирования: ${new Date().toLocaleDateString("ru-RU")}`;
  info.getCell("A3").value = `Всего нарядов в журнале: ${maintenanceLogs.length}`;
  info.getCell("A4").value = `Материалов списано на сумму: ${totalWriteOff.toLocaleString("ru-RU")} ₸ (проверка суммой в конце листа «Акт списания материалов»)`;

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
