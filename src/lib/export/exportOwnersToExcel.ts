import ExcelJS from "exceljs";
import type { OwnershipUnit } from "@/lib/calculator/types";
import { UNIT_TYPE_LABELS } from "@/lib/calculator/types";
import { computeUnitMonthlyAccrual, computeRegistryTotals } from "@/lib/calculator/ownerRegistryEngine";

const KZT_FMT = '#,##0.00 "₸"';
const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
const ZEBRA_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };

/**
 * Ведомость собственников с начислениями — экспорт и повторный импорт
 * взаимно совместимы: заголовки узнаются парсером parseOwnersList.ts, так
 * что выгруженный файл можно скорректировать и загрузить обратно.
 */
export async function exportOwnersToExcelBlob(
  units: OwnershipUnit[],
  buildingName: string,
  tariffPerSqm: number,
  commercialRateCoefficient: number,
): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "QazaqOSI";
  wb.created = new Date();

  const ws = wb.addWorksheet("Реестр собственников");
  ws.columns = [
    { header: "Тип помещения", key: "unitType", width: 18 },
    { header: "№ квартиры/помещения", key: "number", width: 20 },
    { header: "Подъезд", key: "entrance", width: 10 },
    { header: "Этаж", key: "floor", width: 8 },
    { header: "Площадь, м²", key: "area", width: 14 },
    { header: "Доля голосов, %", key: "share", width: 14 },
    { header: "ФИО собственника", key: "ownerName", width: 32 },
    { header: "ИИН", key: "ownerIin", width: 16 },
    { header: "Телефон", key: "ownerPhone", width: 16 },
    { header: "Email", key: "ownerEmail", width: 24 },
    { header: "Документ", key: "documentRef", width: 24 },
    { header: "Начисление, ₸/мес.", key: "accrual", width: 18 },
  ];
  ws.getRow(1).eachCell((c) => {
    c.fill = HEADER_FILL;
    c.font = { color: { argb: "FFFFFFFF" }, bold: true };
  });
  ws.getRow(1).height = 20;

  const totals = computeRegistryTotals(units);

  units.forEach((u, i) => {
    const row = ws.getRow(i + 2);
    const accrual = computeUnitMonthlyAccrual(u, tariffPerSqm, commercialRateCoefficient);
    row.values = {
      unitType: UNIT_TYPE_LABELS[u.unitType],
      number: u.number,
      entrance: u.entrance ?? "",
      floor: u.floor ?? "",
      area: u.area,
      share: totals.totalArea > 0 ? Math.round((u.area / totals.totalArea) * 10000) / 100 : 0,
      ownerName: u.ownerName,
      ownerIin: u.ownerIin ?? "",
      ownerPhone: u.ownerPhone ?? "",
      ownerEmail: u.ownerEmail ?? "",
      documentRef: u.documentRef ?? "",
      accrual,
    };
    row.getCell("accrual").numFmt = KZT_FMT;
    if (i % 2 === 1) row.eachCell((c) => (c.fill = ZEBRA_FILL));
  });

  const summaryRow = ws.getRow(units.length + 3);
  summaryRow.getCell("number").value = "Итого";
  summaryRow.getCell("number").font = { bold: true };
  summaryRow.getCell("area").value = { formula: `SUM(E2:E${units.length + 1})` };
  summaryRow.getCell("accrual").value = { formula: `SUM(L2:L${units.length + 1})` };
  summaryRow.getCell("accrual").numFmt = KZT_FMT;
  summaryRow.eachCell((c) => (c.font = { bold: true }));

  const info = wb.addWorksheet("Сводка по типам");
  info.columns = [
    { header: "Тип помещения", key: "type", width: 22 },
    { header: "Кол-во", key: "count", width: 12 },
    { header: "Площадь, м²", key: "area", width: 16 },
  ];
  info.getRow(1).eachCell((c) => {
    c.fill = HEADER_FILL;
    c.font = { color: { argb: "FFFFFFFF" }, bold: true };
  });
  let r = 1;
  for (const [type, data] of Object.entries(totals.byType)) {
    r += 1;
    info.getRow(r).values = { type: UNIT_TYPE_LABELS[type as keyof typeof UNIT_TYPE_LABELS], count: data.count, area: data.area };
  }
  r += 1;
  info.getRow(r).values = { type: "Итого", count: totals.totalUnits, area: totals.totalArea };
  info.getRow(r).eachCell((c) => (c.font = { bold: true }));
  r += 2;
  info.getCell(`A${r}`).value = `Объект: ${buildingName}`;
  info.getCell(`A${r}`).font = { italic: true, color: { argb: "FF64748B" } };

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
