import ExcelJS from "exceljs";
import type { TariffResult, UnitTypeTariffLine } from "@/lib/calculator/types";
import type { PeriodComparison } from "@/lib/calculator/planVsActual";
import { UNIT_TYPE_LABELS } from "@/lib/calculator/types";

const KZT_FMT = '#,##0.00 "₸"';
const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
const ZEBRA_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((c) => {
    c.fill = HEADER_FILL;
    c.font = { color: { argb: "FFFFFFFF" }, bold: true };
  });
  row.height = 20;
}

export interface AnalyticsSnapshotInput {
  buildingName: string;
  fromMonth: string;
  toMonth: string;
  comparison: PeriodComparison | null;
  byType: UnitTypeTariffLine[];
  tariff: TariffResult;
  topMovers: { categoryId: string; name: string; current: number; previous: number; deltaPercent: number | null }[];
}

/** Снимок аналитики за выбранный период — для передачи собранию/ревизионной комиссии. */
export async function exportAnalyticsSnapshotToExcelBlob(input: AnalyticsSnapshotInput): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "QazaqOSI";
  wb.created = new Date();

  const summary = wb.addWorksheet("Сводка периода");
  summary.columns = [
    { header: "Показатель", key: "label", width: 36 },
    { header: "Значение", key: "value", width: 24 },
  ];
  styleHeader(summary.getRow(1));
  const summaryRows: [string, string | number][] = [
    ["Объект", input.buildingName],
    ["Период", `${input.fromMonth} — ${input.toMonth}`],
    ["Тариф В, ₸/м²/мес.", input.tariff.tariffPerSqm],
    ["  из них взнос на капремонт, ₸/м²/мес.", input.tariff.capitalRepairPerSqmActual],
  ];
  if (input.comparison) {
    summaryRows.push(
      ["План за период, ₸", input.comparison.current.plan],
      ["Факт за период, ₸", input.comparison.current.actual],
      ["Отклонение факт-план, ₸", input.comparison.current.variance],
      ["Факт за предыдущий эквивалентный период, ₸", input.comparison.previous.actual],
      [
        "Изменение факта к предыдущему периоду, %",
        input.comparison.actualDeltaPercent === null ? "—" : input.comparison.actualDeltaPercent,
      ],
    );
  }
  summaryRows.forEach(([label, value], i) => {
    const row = summary.getRow(i + 2);
    row.values = { label, value };
    if (typeof value === "number") row.getCell("value").numFmt = KZT_FMT;
    if (i % 2 === 1) row.eachCell((c) => (c.fill = ZEBRA_FILL));
  });

  const typeSheet = wb.addWorksheet("Тариф по типам помещений");
  typeSheet.columns = [
    { header: "Тип помещения", key: "type", width: 22 },
    { header: "Площадь, м²", key: "area", width: 16 },
    { header: "Ставка, ₸/м²/мес.", key: "rate", width: 20 },
    { header: "Итого/мес., ₸", key: "total", width: 20 },
  ];
  styleHeader(typeSheet.getRow(1));
  input.byType.forEach((l, i) => {
    const row = typeSheet.getRow(i + 2);
    row.values = { type: UNIT_TYPE_LABELS[l.unitType], area: l.areaSqm, rate: l.ratePerSqm, total: l.monthlyTotal };
    row.getCell("rate").numFmt = KZT_FMT;
    row.getCell("total").numFmt = KZT_FMT;
    if (i % 2 === 1) row.eachCell((c) => (c.fill = ZEBRA_FILL));
  });

  if (input.topMovers.length > 0) {
    const moversSheet = wb.addWorksheet("Топ-движения по статьям");
    moversSheet.columns = [
      { header: "Статья", key: "name", width: 40 },
      { header: "Текущий период, ₸", key: "current", width: 20 },
      { header: "Предыдущий период, ₸", key: "previous", width: 20 },
      { header: "Изменение, %", key: "delta", width: 16 },
    ];
    styleHeader(moversSheet.getRow(1));
    input.topMovers.forEach((m, i) => {
      const row = moversSheet.getRow(i + 2);
      row.values = { name: m.name, current: m.current, previous: m.previous, delta: m.deltaPercent ?? "—" };
      row.getCell("current").numFmt = KZT_FMT;
      row.getCell("previous").numFmt = KZT_FMT;
      if (i % 2 === 1) row.eachCell((c) => (c.fill = ZEBRA_FILL));
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
