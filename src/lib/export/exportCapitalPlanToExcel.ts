import ExcelJS from "exceljs";
import type { Asset, BuildingProfile, CapitalFundYearProjection, ReplacementPlanYear } from "@/lib/calculator/types";

const KZT_FMT = '#,##0 "₸"';
const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
const ZEBRA_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
const DEFICIT_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };

export async function exportCapitalPlanToExcelBlob(
  building: BuildingProfile,
  assets: Asset[],
  plan: ReplacementPlanYear[],
  projection: CapitalFundYearProjection[],
  annualIncome: number,
): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "QazaqOSI";
  wb.created = new Date();

  const assetById = new Map(assets.map((a) => [a.id, a]));
  const projectionByYear = new Map(projection.map((p) => [p.year, p]));

  const ws = wb.addWorksheet("План капремонта по годам");
  ws.columns = [
    { header: "Год", key: "year", width: 10 },
    { header: "Что ремонтируем/заменяем", key: "works", width: 55 },
    { header: "Стоимость, ₸", key: "cost", width: 16 },
    { header: "Поступления за год, ₸", key: "income", width: 18 },
    { header: "Остаток фонда на конец года, ₸", key: "balance", width: 22 },
  ];
  ws.getRow(1).eachCell((c) => {
    c.fill = HEADER_FILL;
    c.font = { color: { argb: "FFFFFFFF" }, bold: true };
  });
  ws.getRow(1).height = 20;

  plan.forEach((y, i) => {
    const row = ws.getRow(i + 2);
    const works = y.assetIds.map((id) => assetById.get(id)?.name).filter(Boolean).join("; ") || "—";
    const proj = projectionByYear.get(y.year);
    row.values = {
      year: y.year,
      works,
      cost: y.totalCost,
      income: proj?.income ?? annualIncome,
      balance: proj?.balance ?? 0,
    };
    row.getCell("cost").numFmt = KZT_FMT;
    row.getCell("income").numFmt = KZT_FMT;
    row.getCell("balance").numFmt = KZT_FMT;
    row.alignment = { wrapText: true, vertical: "top" };
    if ((proj?.balance ?? 0) < 0) {
      row.eachCell((c) => (c.fill = DEFICIT_FILL));
    } else if (i % 2 === 1) {
      row.eachCell((c) => (c.fill = ZEBRA_FILL));
    }
  });

  const totalNeed = plan.reduce((sum, y) => sum + y.totalCost, 0);
  const totalIncome = projection.reduce((sum, p) => sum + p.income, 0);
  const finalBalance = projection.at(-1)?.balance ?? 0;

  const summaryRow = plan.length + 3;
  ws.getCell(`B${summaryRow}`).value = "Итого требуется";
  ws.getCell(`B${summaryRow}`).font = { bold: true };
  ws.getCell(`C${summaryRow}`).value = totalNeed;
  ws.getCell(`C${summaryRow}`).numFmt = KZT_FMT;
  ws.getCell(`C${summaryRow}`).font = { bold: true };

  ws.getCell(`B${summaryRow + 1}`).value = "Итого поступит при текущем взносе";
  ws.getCell(`D${summaryRow + 1}`).value = totalIncome;
  ws.getCell(`D${summaryRow + 1}`).numFmt = KZT_FMT;

  ws.getCell(`B${summaryRow + 2}`).value = finalBalance >= 0 ? "Профицит фонда на конец периода" : "Дефицит фонда на конец периода";
  ws.getCell(`B${summaryRow + 2}`).font = { bold: true };
  ws.getCell(`E${summaryRow + 2}`).value = finalBalance;
  ws.getCell(`E${summaryRow + 2}`).numFmt = KZT_FMT;
  ws.getCell(`E${summaryRow + 2}`).font = { bold: true, color: { argb: finalBalance >= 0 ? "FF15803D" : "FFB91C1C" } };

  const info = wb.addWorksheet("Исходные данные");
  info.columns = [{ key: "label", width: 46 }, { key: "value", width: 26 }];
  info.addRow(["Объект", building.name]);
  info.addRow(["Адрес", building.address]);
  info.addRow(["Взнос на капремонт, в МРП/м²/мес.", building.capitalRepairMrpMultiplier]);
  info.addRow(["Годовые поступления в фонд (принято в расчёте), ₸", annualIncome]);
  info.getCell("B4").numFmt = KZT_FMT;
  info.addRow(["Дата формирования плана", new Date().toLocaleDateString("ru-RU")]);
  info.getColumn(1).font = { bold: true };

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
