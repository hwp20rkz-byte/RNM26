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
import type { Asset, BuildingProfile, CapitalFundYearProjection, ReplacementPlanYear } from "@/lib/calculator/types";
import { formatKzt } from "@/lib/utils";

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
    children: [new Paragraph({ alignment: opts.align ?? AlignmentType.LEFT, children: [new TextRun({ text, bold: opts.bold, size: 18 })] })],
  });
}

/** Перспективный план капитального ремонта — документ на утверждение общим собранием. */
export async function exportCapitalPlanToDocxBlob(
  building: BuildingProfile,
  assets: Asset[],
  plan: ReplacementPlanYear[],
  projection: CapitalFundYearProjection[],
  annualIncome: number,
  horizonYears: number,
): Promise<Blob> {
  const assetById = new Map(assets.map((a) => [a.id, a]));
  const projectionByYear = new Map(projection.map((p) => [p.year, p]));

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      cell("Год", { bold: true, width: 8, shaded: true, align: AlignmentType.CENTER }),
      cell("Что ремонтируем/заменяем", { bold: true, width: 42, shaded: true }),
      cell("Стоимость, ₸", { bold: true, width: 16, shaded: true, align: AlignmentType.RIGHT }),
      cell("Остаток фонда на конец года, ₸", { bold: true, width: 20, shaded: true, align: AlignmentType.RIGHT }),
    ],
  });

  const rows: TableRow[] = [headerRow];
  for (const y of plan) {
    const works = y.assetIds.map((id) => assetById.get(id)?.name).filter(Boolean).join("; ") || "—";
    const proj = projectionByYear.get(y.year);
    rows.push(
      new TableRow({
        children: [
          cell(String(y.year), { align: AlignmentType.CENTER }),
          cell(works),
          cell(y.totalCost > 0 ? formatKzt(y.totalCost) : "—", { align: AlignmentType.RIGHT }),
          cell(formatKzt(proj?.balance ?? 0), { align: AlignmentType.RIGHT, bold: (proj?.balance ?? 0) < 0 }),
        ],
      }),
    );
  }

  const totalNeed = plan.reduce((sum, y) => sum + y.totalCost, 0);
  const finalBalance = projection.at(-1)?.balance ?? 0;

  const table = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });

  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { orientation: "portrait" } } },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: "Утверждён протоколом общего собрания собственников №___ от «___»___________ ____ г.",
                italics: true,
                size: 18,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.TITLE,
            spacing: { before: 200, after: 100 },
            children: [new TextRun({ text: `Перспективный план капитального ремонта на ${horizonYears} лет` })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `объекта кондоминиума «${building.name}»`, bold: true })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [new TextRun({ text: building.address, italics: true, color: "64748B" })],
          }),

          table,

          new Paragraph({ spacing: { before: 300 }, children: [new TextRun({ text: "" })] }),
          summaryParagraph(`Требуется на ${horizonYears} лет, всего`, formatKzt(totalNeed)),
          summaryParagraph("Принятый в расчёте годовой взнос в фонд капремонта", formatKzt(annualIncome)),
          summaryParagraph(
            finalBalance >= 0 ? "Профицит фонда на конец периода" : "Дефицит фонда на конец периода",
            formatKzt(Math.abs(finalBalance)),
            true,
          ),

          new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: "" })] }),
          new Paragraph({
            spacing: { after: 400 },
            children: [
              new TextRun({
                text:
                  "План носит ориентировочный характер: годы замены рассчитаны по нормативному сроку службы оборудования (см. реестр оборудования проекта) либо скорректированы по фактическому обследованию, стоимости — по рыночным оценкам на дату формирования плана. Перед началом конкретных работ требуется отдельная смета и, при необходимости, проектная документация.",
                italics: true,
                size: 16,
                color: "64748B",
              }),
            ],
          }),

          new Paragraph({ spacing: { before: 400, after: 200 }, children: [new TextRun({ text: "Председатель ОСИ / управляющий МЖД:" })] }),
          new Paragraph({
            spacing: { after: 400 },
            children: [new TextRun({ text: "_______________________  /____________________/  «____»_____________ 20___ г." })],
          }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "Председатель ревизионной комиссии:" })] }),
          new Paragraph({
            children: [new TextRun({ text: "_______________________  /____________________/  «____»_____________ 20___ г." })],
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
