import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import type { BuildingProfile, CalculatorDatabase, TariffResult } from "@/lib/calculator/types";
import { computeUsefulArea, itemAnnualCost, payrollAnnualCost } from "@/lib/calculator/engine";
import { formatKzt, formatKztPrecise } from "@/lib/utils";

const BORDER = {
  top: { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
  left: { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
  right: { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
};

function cell(text: string, opts: { bold?: boolean; width?: number; shaded?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    borders: BORDER,
    verticalAlign: VerticalAlign.CENTER,
    shading: opts.shaded ? { type: ShadingType.SOLID, color: "E2E8F0", fill: "E2E8F0" } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: opts.align ?? AlignmentType.LEFT,
        children: [new TextRun({ text, bold: opts.bold, size: 18 })],
      }),
    ],
  });
}

export async function exportToDocxBlob(
  db: CalculatorDatabase,
  building: BuildingProfile,
  tariff: TariffResult,
  priceMultiplier = 1,
  scenarioLabel?: string,
  year = new Date().getFullYear() + 1,
): Promise<Blob> {
  const leafCategories = db.categories.filter(
    (c) =>
      db.items.some((it) => it.categoryId === c.id) ||
      db.payroll.some((p) => p.categoryId === c.id),
  );

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      cell("№", { bold: true, width: 5, shaded: true, align: AlignmentType.CENTER }),
      cell("Наименование статьи", { bold: true, width: 34, shaded: true }),
      cell("Ед.изм.", { bold: true, width: 8, shaded: true, align: AlignmentType.CENTER }),
      cell("Кол-во/год", { bold: true, width: 10, shaded: true, align: AlignmentType.CENTER }),
      cell("Цена, ₸", { bold: true, width: 12, shaded: true, align: AlignmentType.RIGHT }),
      cell("Итого/год, ₸", { bold: true, width: 15, shaded: true, align: AlignmentType.RIGHT }),
      cell("Итого/мес, ₸", { bold: true, width: 16, shaded: true, align: AlignmentType.RIGHT }),
    ],
  });

  const rows: TableRow[] = [headerRow];
  let n = 0;

  for (const cat of leafCategories) {
    rows.push(
      new TableRow({
        children: [
          cell(`${cat.code}. ${cat.name}`, { bold: true, shaded: true, width: 100 }),
          ...Array(6).fill(cell("", { shaded: true })),
        ],
      }),
    );

    let subtotalAnnual = 0;
    for (const p of db.payroll.filter((x) => x.categoryId === cat.id)) {
      n += 1;
      const annual = payrollAnnualCost(p, db.taxRates, priceMultiplier);
      subtotalAnnual += annual;
      rows.push(
        new TableRow({
          children: [
            cell(String(n), { align: AlignmentType.CENTER }),
            cell(`${p.role}${p.headcount > 1 ? ` × ${p.headcount}` : ""} (${p.mode === "staff" ? "штат" : "аутсорс"})`),
            cell("мес."),
            cell("12", { align: AlignmentType.CENTER }),
            cell(formatKztPrecise(annual / 12), { align: AlignmentType.RIGHT }),
            cell(formatKzt(annual), { align: AlignmentType.RIGHT }),
            cell(formatKzt(annual / 12), { align: AlignmentType.RIGHT }),
          ],
        }),
      );
    }
    for (const it of db.items.filter((x) => x.categoryId === cat.id)) {
      n += 1;
      const annual = itemAnnualCost(it, priceMultiplier);
      subtotalAnnual += annual;
      rows.push(
        new TableRow({
          children: [
            cell(String(n), { align: AlignmentType.CENTER }),
            cell(it.name),
            cell(it.unit),
            cell(it.annualQty.toLocaleString("ru-RU"), { align: AlignmentType.CENTER }),
            cell(formatKztPrecise(it.unitPrice * priceMultiplier), { align: AlignmentType.RIGHT }),
            cell(formatKzt(annual), { align: AlignmentType.RIGHT }),
            cell(formatKzt(annual / 12), { align: AlignmentType.RIGHT }),
          ],
        }),
      );
    }
    rows.push(
      new TableRow({
        children: [
          cell("", { shaded: true }),
          cell(`Итого по ${cat.code}`, { bold: true, shaded: true }),
          cell("", { shaded: true }),
          cell("", { shaded: true }),
          cell("", { shaded: true }),
          cell(formatKzt(subtotalAnnual), { bold: true, shaded: true, align: AlignmentType.RIGHT }),
          cell(formatKzt(subtotalAnnual / 12), { bold: true, shaded: true, align: AlignmentType.RIGHT }),
        ],
      }),
    );
  }

  const capitalRepairAnnual =
    building.capitalRepairMrpMultiplier * db.taxRates.mrpValue * computeUsefulArea(building) * 12;
  rows.push(
    new TableRow({
      children: [
        cell("", { shaded: true }),
        cell("2.11. Накопительный взнос на капитальный ремонт", { bold: true, shaded: true }),
        cell("", { shaded: true }),
        cell("", { shaded: true }),
        cell("", { shaded: true }),
        cell(formatKzt(capitalRepairAnnual), { bold: true, shaded: true, align: AlignmentType.RIGHT }),
        cell(formatKzt(capitalRepairAnnual / 12), { bold: true, shaded: true, align: AlignmentType.RIGHT }),
      ],
    }),
  );

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });

  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { orientation: "portrait" } } },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: `Утверждена протоколом общего собрания собственников №___ от «___»___________ ${year} г.`,
                italics: true,
                size: 18,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.TITLE,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({ text: `Смета расходов на управление объектом кондоминиума` }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `и содержание общего имущества «${building.name}» на ${year} год`,
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({ text: building.address, italics: true, color: "64748B" }),
              ...(scenarioLabel
                ? [new TextRun({ text: `  ·  Сценарий: ${scenarioLabel}`, italics: true, color: "64748B" })]
                : []),
            ],
          }),

          table,

          new Paragraph({ spacing: { before: 300 }, children: [new TextRun({ text: "" })] }),
          summaryParagraph("Р упр. — расходы на управление, год", formatKzt(tariff.annualManagementCost)),
          summaryParagraph("Р сод. — расходы на содержание (вкл. капремонт), год", formatKzt(tariff.annualMaintenanceCost)),
          summaryParagraph("Р год = Р упр. + Р сод.", formatKzt(tariff.annualTotalCost)),
          summaryParagraph("Д год — доход от коммерческого использования", formatKzt(tariff.annualCommercialIncome)),
          summaryParagraph("S полез. — полезная площадь объекта", `${tariff.usefulArea.toLocaleString("ru-RU")} м²`),
          summaryParagraph(
            "Тариф В = (Р год − Д год) / (S полез. × 12)",
            `${formatKztPrecise(tariff.tariffPerSqm)} ₸/м² в месяц`,
            true,
          ),
          summaryParagraph("Бюджет сборов в месяц", formatKzt(tariff.monthlyBudget)),
          summaryParagraph("Бюджет сборов в квартал", formatKzt(tariff.quarterlyBudget)),
          summaryParagraph("Бюджет сборов в год", formatKzt(tariff.annualBudget)),

          new Paragraph({ spacing: { before: 500 }, children: [new TextRun({ text: "" })] }),
          new Paragraph({
            spacing: { after: 400 },
            children: [
              new TextRun({
                text:
                  "Смета составлена в соответствии с Законом РК «О жилищных отношениях» и Приказом Министра индустрии и инфраструктурного развития РК от 30.03.2020 №166 «Об утверждении Методики расчета сметы расходов на управление объектом кондоминиума и содержание общего имущества объекта кондоминиума».",
                italics: true,
                size: 16,
                color: "64748B",
              }),
            ],
          }),

          new Paragraph({
            spacing: { before: 600, after: 200 },
            children: [new TextRun({ text: "Председатель ОСИ / управляющий МЖД:" })],
          }),
          new Paragraph({
            spacing: { after: 400 },
            children: [new TextRun({ text: "_______________________  /____________________/  «____»_____________ " + year + " г." })],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: "Председатель ревизионной комиссии:" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "_______________________  /____________________/  «____»_____________ " + year + " г." })],
          }),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}

function summaryParagraph(label: string, value: string, emphasize = false) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text: `${label}: `, bold: emphasize }),
      new TextRun({ text: value, bold: true, size: emphasize ? 24 : 20 }),
    ],
  });
}
