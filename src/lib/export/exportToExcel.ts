import ExcelJS from "exceljs";
import type { BuildingProfile, CalculatorDatabase } from "@/lib/calculator/types";
import { payrollAnnualCost } from "@/lib/calculator/engine";
import { APARTMENT_SAMPLE_SIZES } from "@/lib/calculator/presets";

const KZT_FMT = '#,##0.00 "₸"';
const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF0F172A" },
};
const SUBTOTAL_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFE2E8F0" },
};
const ZEBRA_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF8FAFC" },
};
const INPUT_FONT: Partial<ExcelJS.Font> = { color: { argb: "FF1D4ED8" } };

export async function buildExcelWorkbook(
  db: CalculatorDatabase,
  building: BuildingProfile,
  priceMultiplier = 1,
  scenarioLabel?: string,
): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "QazaqOSI";
  wb.created = new Date();

  const summary = wb.addWorksheet("Сводный тариф", { views: [{ state: "frozen", ySplit: 0 }] });
  const detail = wb.addWorksheet("Детализация затрат");
  const payrollSheet = wb.addWorksheet("Спецификация ФОТ и СИЗ");
  const plan = wb.addWorksheet("План регламентных работ");

  // -------------------------------------------------------------- Детализация
  detail.columns = [
    { header: "№", key: "num", width: 6 },
    { header: "Категория", key: "cat", width: 40 },
    { header: "Наименование статьи", key: "name", width: 46 },
    { header: "Ед.изм.", key: "unit", width: 10 },
    { header: "Кол-во/год", key: "qty", width: 12 },
    { header: "Цена, ₸", key: "price", width: 14 },
    { header: "Итого/год, ₸", key: "annual", width: 16 },
    { header: "Итого/мес, ₸", key: "monthly", width: 16 },
  ];
  styleHeaderRow(detail.getRow(1));

  let rowIdx = 1;
  let n = 0;
  const managementRows: number[] = [];
  const maintenanceRows: number[] = [];

  const leafCategories = db.categories.filter(
    (c) =>
      db.items.some((it) => it.categoryId === c.id) ||
      db.payroll.some((p) => p.categoryId === c.id),
  );

  for (const cat of leafCategories) {
    rowIdx += 1;
    const catHeaderRow = detail.getRow(rowIdx);
    catHeaderRow.getCell(2).value = `${cat.code}. ${cat.name}`;
    catHeaderRow.font = { bold: true };
    catHeaderRow.getCell(2).font = { bold: true };
    const startDataRow = rowIdx + 1;

    for (const p of db.payroll.filter((x) => x.categoryId === cat.id)) {
      rowIdx += 1;
      n += 1;
      const annual = payrollAnnualCost(p, db.taxRates, priceMultiplier);
      const r = detail.getRow(rowIdx);
      r.values = {
        num: n,
        cat: "",
        name: `${p.role}${p.headcount > 1 ? ` × ${p.headcount}` : ""} (${p.mode === "staff" ? "штат" : "аутсорс"})`,
        unit: "мес.",
        qty: 12,
        price: p.enabled ? annual / 12 : 0,
        annual: { formula: `E${rowIdx}*F${rowIdx}` },
        monthly: { formula: `G${rowIdx}/12` },
      };
      applyRowStyle(r, n);
      r.getCell("annual").numFmt = KZT_FMT;
      r.getCell("monthly").numFmt = KZT_FMT;
      r.getCell("price").numFmt = KZT_FMT;
    }

    for (const it of db.items.filter((x) => x.categoryId === cat.id)) {
      rowIdx += 1;
      n += 1;
      const r = detail.getRow(rowIdx);
      r.values = {
        num: n,
        cat: "",
        name: it.name,
        unit: it.unit,
        qty: it.enabled ? it.annualQty : 0,
        price: it.unitPrice * priceMultiplier,
        annual: { formula: `E${rowIdx}*F${rowIdx}` },
        monthly: { formula: `G${rowIdx}/12` },
      };
      applyRowStyle(r, n);
      r.getCell("annual").numFmt = KZT_FMT;
      r.getCell("monthly").numFmt = KZT_FMT;
      r.getCell("price").numFmt = KZT_FMT;
    }

    const endDataRow = rowIdx;
    rowIdx += 1;
    const subtotalRow = detail.getRow(rowIdx);
    subtotalRow.getCell(3).value = `Итого по ${cat.code}`;
    subtotalRow.getCell(3).font = { bold: true };
    subtotalRow.getCell(7).value =
      endDataRow >= startDataRow ? { formula: `SUM(G${startDataRow}:G${endDataRow})` } : 0;
    subtotalRow.getCell(8).value = { formula: `G${rowIdx}/12` };
    subtotalRow.getCell(7).numFmt = KZT_FMT;
    subtotalRow.getCell(8).numFmt = KZT_FMT;
    subtotalRow.eachCell((c) => {
      c.fill = SUBTOTAL_FILL;
      c.font = { ...c.font, bold: true };
    });

    if (cat.group === "management") managementRows.push(rowIdx);
    else maintenanceRows.push(rowIdx);
  }

  // Капитальный ремонт — считается от площади, МРП и множителя (см. Сводный тариф)
  rowIdx += 1;
  const capRow = detail.getRow(rowIdx);
  capRow.getCell(2).value = "2.11. Накопительный взнос на капитальный ремонт";
  capRow.getCell(2).font = { bold: true };
  rowIdx += 1;
  const capDataRow = rowIdx;
  const capR = detail.getRow(rowIdx);
  n += 1;
  capR.values = {
    num: n,
    cat: "",
    name: "Взнос на капремонт (S полез. × множитель МРП × МРП × 12)",
    unit: "мес.",
    qty: 12,
  };
  capR.getCell("price").value = {
    formula: "'Сводный тариф'!$C$8*'Сводный тариф'!$C$10*'Сводный тариф'!$C$11",
  };
  capR.getCell("annual").value = { formula: `E${rowIdx}*F${rowIdx}` };
  capR.getCell("monthly").value = { formula: `G${rowIdx}/12` };
  applyRowStyle(capR, n);
  capR.getCell("price").numFmt = KZT_FMT;
  capR.getCell("annual").numFmt = KZT_FMT;
  capR.getCell("monthly").numFmt = KZT_FMT;
  rowIdx += 1;
  const capSubtotalRow = detail.getRow(rowIdx);
  capSubtotalRow.getCell(3).value = "Итого по 2.11";
  capSubtotalRow.getCell(3).font = { bold: true };
  capSubtotalRow.getCell(7).value = { formula: `G${capDataRow}` };
  capSubtotalRow.getCell(8).value = { formula: `G${rowIdx}/12` };
  capSubtotalRow.getCell(7).numFmt = KZT_FMT;
  capSubtotalRow.getCell(8).numFmt = KZT_FMT;
  capSubtotalRow.eachCell((c) => {
    c.fill = SUBTOTAL_FILL;
    c.font = { ...c.font, bold: true };
  });
  maintenanceRows.push(rowIdx);

  detail.getColumn("annual").numFmt = KZT_FMT;
  detail.getColumn("monthly").numFmt = KZT_FMT;
  detail.getColumn("price").numFmt = KZT_FMT;

  // -------------------------------------------------------------- Сводный тариф
  summary.columns = [
    { key: "label", width: 46 },
    { key: "value", width: 22 },
    { key: "note", width: 46 },
  ];
  summary.mergeCells("A1:C1");
  summary.getCell("A1").value = `Годовая смета расходов ОСИ / ПТ «${building.name}»`;
  summary.getCell("A1").font = { size: 15, bold: true };
  summary.mergeCells("A2:C2");
  summary.getCell("A2").value = building.address;
  summary.getCell("A2").font = { italic: true, color: { argb: "FF64748B" } };
  if (scenarioLabel) {
    summary.mergeCells("A3:C3");
    summary.getCell("A3").value = `Сценарий: ${scenarioLabel} (коэффициент цен ×${priceMultiplier})`;
    summary.getCell("A3").font = { italic: true, color: { argb: "FF64748B" } };
  }

  summary.getCell("A4").value = "Исходные данные";
  summary.getCell("A4").font = { bold: true, size: 12 };

  addInputRow(summary, 5, "Полезная площадь квартир, м²", building.livingArea);
  addInputRow(summary, 6, "Площадь коммерческих помещений, м²", building.commercialArea);
  summary.getCell("A7").value = "S полез. итого, м²";
  summary.getCell("C7").value = { formula: "C5+C6" };
  addInputRow(summary, 8, "Годовой доход от аренды (Д год), ₸", building.annualCommercialIncome);
  addInputRow(summary, 9, "МРП, ₸ (значение на расчётный год — сверьте!)", db.taxRates.mrpValue);
  addInputRow(
    summary,
    10,
    "Множитель капремонта, в МРП/м²/мес.",
    building.capitalRepairMrpMultiplier,
  );
  summary.getCell("A11").value = "МРП, ₸ (дубль ссылки для формулы взноса)";
  summary.getCell("C11").value = { formula: "C9" };

  summary.getCell("A13").value = "Итоговые показатели";
  summary.getCell("A13").font = { bold: true, size: 12 };

  const mgmtFormula = managementRows.length ? managementRows.map((r) => `'Детализация затрат'!G${r}`).join("+") : "0";
  const maintFormula = maintenanceRows.length ? maintenanceRows.map((r) => `'Детализация затрат'!G${r}`).join("+") : "0";

  addFormulaRow(summary, 14, "Р упр. — расходы на управление, год, ₸", mgmtFormula);
  addFormulaRow(summary, 15, "Р сод. — расходы на содержание (вкл. капремонт), год, ₸", maintFormula);
  addFormulaRow(summary, 16, "Р год = Р упр. + Р сод., ₸", "C14+C15");
  addFormulaRow(summary, 17, "Тариф В = (Р год − Д год) / (S полез. × 12), ₸/м²/мес.", "(C16-C8)/(C7*12)");
  addFormulaRow(summary, 18, "Бюджет сборов в месяц, ₸", "(C16-C8)/12");
  addFormulaRow(summary, 19, "Бюджет сборов в квартал, ₸", "C18*3");
  addFormulaRow(summary, 20, "Бюджет сборов в год, ₸", "C18*12");

  summary.getCell("A22").value = "Средний чек по типовым квартирам";
  summary.getCell("A22").font = { bold: true, size: 12 };
  let sr = 23;
  for (const s of APARTMENT_SAMPLE_SIZES) {
    summary.getCell(`A${sr}`).value = `${s.label} (${s.area} м²)`;
    summary.getCell(`C${sr}`).value = { formula: `$C$17*${s.area}` };
    summary.getCell(`C${sr}`).numFmt = KZT_FMT;
    sr += 1;
  }

  for (const r of [7, 14, 15, 16, 17, 18, 19, 20]) {
    summary.getCell(`C${r}`).numFmt = KZT_FMT;
    summary.getCell(`C${r}`).font = { bold: true };
  }
  summary.getCell("C17").numFmt = '#,##0.0000 "₸"';

  // -------------------------------------------------------------- ФОТ и СИЗ
  payrollSheet.columns = [
    { header: "Должность / роль", key: "role", width: 42 },
    { header: "Режим", key: "mode", width: 12 },
    { header: "Оклад, ₸", key: "gross", width: 14 },
    { header: "ОПВ", key: "opv", width: 12 },
    { header: "ВОСМС", key: "vosms", width: 12 },
    { header: "ИПН", key: "ipn", width: 12 },
    { header: "СО", key: "so", width: 12 },
    { header: "СН", key: "sn", width: 12 },
    { header: "ОСМС (раб-ль)", key: "osms", width: 14 },
    { header: "ОПВР", key: "opvr", width: 12 },
    { header: "Итого ФОТ/чел., ₸", key: "total", width: 16 },
    { header: "Чел.", key: "headcount", width: 8 },
    { header: "Итого в мес., ₸", key: "monthly", width: 16 },
    { header: "Итого в год, ₸", key: "annual", width: 16 },
  ];
  styleHeaderRow(payrollSheet.getRow(1));
  payrollSheet.getCell("A1").note =
    "Ставки: ОПВ 10%, ВОСМС 2%, ОСМС(раб.) 3%, СО 5% от (оклад-ОПВ), ОПВР 3,5%, ИПН 10% от (оклад-ОПВ-ВОСМС-вычет). Для позиций «аутсорс» столбцы налогов не заполняются — это уже стоимость договора.";

  let pRow = 1;
  for (const p of db.payroll) {
    pRow += 1;
    const rr = payrollSheet.getRow(pRow);
    if (p.mode === "staff") {
      rr.getCell("role").value = p.role;
      rr.getCell("mode").value = "штат";
      rr.getCell("gross").value = p.monthlySalaryOrContract * priceMultiplier;
      rr.getCell("opv").value = { formula: `C${pRow}*0.1` };
      rr.getCell("vosms").value = { formula: `C${pRow}*0.02` };
      rr.getCell("ipn").value = {
        formula: `MAX(0,(C${pRow}-D${pRow}-E${pRow}-${db.taxRates.mrpValue}*${db.taxRates.standardDeductionMrpMultiplier})*0.1)`,
      };
      rr.getCell("so").value = { formula: `(C${pRow}-D${pRow})*0.05` };
      rr.getCell("sn").value = { formula: `MAX(0,(C${pRow}-D${pRow})*0.095-G${pRow})` };
      rr.getCell("osms").value = { formula: `C${pRow}*0.03` };
      rr.getCell("opvr").value = { formula: `C${pRow}*0.035` };
      rr.getCell("total").value = { formula: `C${pRow}+G${pRow}+H${pRow}+I${pRow}+J${pRow}` };
    } else {
      rr.getCell("role").value = p.role;
      rr.getCell("mode").value = "аутсорс";
      rr.getCell("gross").value = p.monthlySalaryOrContract * priceMultiplier;
      rr.getCell("total").value = { formula: `C${pRow}` };
    }
    rr.getCell("headcount").value = p.headcount;
    rr.getCell("monthly").value = p.enabled ? { formula: `K${pRow}*L${pRow}` } : 0;
    rr.getCell("annual").value = p.enabled ? { formula: `M${pRow}*12` } : 0;
    ["gross", "opv", "vosms", "ipn", "so", "sn", "osms", "opvr", "total", "monthly", "annual"].forEach(
      (k) => (rr.getCell(k).numFmt = KZT_FMT),
    );
    if (pRow % 2 === 0) rr.eachCell((c) => (c.fill = ZEBRA_FILL));
  }

  pRow += 2;
  payrollSheet.getCell(`A${pRow}`).value = "СИЗ и спецодежда (категория 2.3.6)";
  payrollSheet.getCell(`A${pRow}`).font = { bold: true, size: 12 };
  pRow += 1;
  const sizHeaderRow = pRow;
  ["Наименование", "Ед.изм.", "Кол-во/год", "Цена, ₸", "Итого/год, ₸"].forEach((h, i) => {
    payrollSheet.getRow(sizHeaderRow).getCell(1 + i).value = h;
  });
  styleHeaderRow(payrollSheet.getRow(sizHeaderRow));
  for (const it of db.items.filter((i) => i.categoryId === "2.3.6")) {
    pRow += 1;
    const rr = payrollSheet.getRow(pRow);
    rr.getCell(1).value = it.name;
    rr.getCell(2).value = it.unit;
    rr.getCell(3).value = it.annualQty;
    rr.getCell(4).value = it.unitPrice * priceMultiplier;
    rr.getCell(4).numFmt = KZT_FMT;
    rr.getCell(5).value = { formula: `C${pRow}*D${pRow}` };
    rr.getCell(5).numFmt = KZT_FMT;
  }

  // -------------------------------------------------------------- План регламентных работ
  plan.columns = [
    { header: "Категория", key: "cat", width: 36 },
    { header: "Работа / позиция", key: "name", width: 46 },
    { header: "Периодичность", key: "freq", width: 16 },
    { header: "Ед.изм.", key: "unit", width: 10 },
    { header: "Кол-во/год", key: "qty", width: 12 },
    { header: "Стоимость, ₸/год", key: "cost", width: 16 },
    { header: "Технологическая карта", key: "note", width: 50 },
  ];
  styleHeaderRow(plan.getRow(1));
  const planCategories = ["2.2.3", "2.2.4", "2.2.5", "2.5", "2.9", "2.10"];
  let planRow = 1;
  for (const catId of planCategories) {
    const cat = db.categories.find((c) => c.id === catId);
    for (const it of db.items.filter((i) => i.categoryId === catId)) {
      planRow += 1;
      const rr = plan.getRow(planRow);
      rr.getCell("cat").value = cat ? `${cat.code} ${cat.name}` : catId;
      rr.getCell("name").value = it.name;
      rr.getCell("freq").value = freqLabel(it.frequency);
      rr.getCell("unit").value = it.unit;
      rr.getCell("qty").value = it.annualQty;
      rr.getCell("cost").value = { formula: `E${planRow}*${it.unitPrice * priceMultiplier}` };
      rr.getCell("cost").numFmt = KZT_FMT;
      rr.getCell("note").value = it.tooltip ?? "";
      if (planRow % 2 === 0) rr.eachCell((c) => (c.fill = ZEBRA_FILL));
    }
  }

  return wb;
}

export async function exportToExcelBlob(
  db: CalculatorDatabase,
  building: BuildingProfile,
  priceMultiplier = 1,
  scenarioLabel?: string,
): Promise<Blob> {
  const wb = await buildExcelWorkbook(db, building, priceMultiplier, scenarioLabel);
  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
    cell.alignment = { vertical: "middle" };
  });
  row.height = 20;
}

function applyRowStyle(row: ExcelJS.Row, n: number) {
  if (n % 2 === 0) {
    row.eachCell((c) => (c.fill = ZEBRA_FILL));
  }
}

function addInputRow(ws: ExcelJS.Worksheet, r: number, label: string, value: number) {
  if (!label) return;
  ws.getCell(`A${r}`).value = label;
  ws.getCell(`C${r}`).value = value;
  ws.getCell(`C${r}`).font = INPUT_FONT;
}

function addFormulaRow(ws: ExcelJS.Worksheet, r: number, label: string, formula: string) {
  ws.getCell(`A${r}`).value = label;
  ws.getCell(`C${r}`).value = { formula };
}

function freqLabel(f: string): string {
  switch (f) {
    case "monthly":
      return "Ежемесячно";
    case "quarterly":
      return "Ежеквартально";
    case "seasonal":
      return "Сезонно";
    case "annual":
      return "1 раз в год";
    case "once":
      return "Разово";
    default:
      return f;
  }
}
