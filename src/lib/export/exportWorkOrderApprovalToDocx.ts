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
import type { Asset, BuildingProfile, WorkOrder } from "@/lib/calculator/types";
import { WORK_ORDER_COMPLEXITY_LABELS, WORK_ORDER_SEASONALITY_LABELS } from "@/lib/calculator/types";

const BORDER = {
  top: { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
  left: { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
  right: { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
};

function cell(text: string, opts: { bold?: boolean; width?: number; shaded?: boolean } = {}) {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    borders: BORDER,
    verticalAlign: VerticalAlign.CENTER,
    shading: opts.shaded ? { type: ShadingType.SOLID, color: "E2E8F0", fill: "E2E8F0" } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: opts.bold, size: 18 })] })],
  });
}

function row(label: string, value: string) {
  return new TableRow({ children: [cell(label, { bold: true, width: 35, shaded: true }), cell(value, { width: 65 })] });
}

/**
 * Наряд-допуск / акт согласования — для ночных работ (уведомление жителей)
 * и работ повышенной сложности (L3), где председателю/собранию нужна
 * бумажная фиксация согласования перед началом.
 */
export async function exportWorkOrderApprovalToDocxBlob(
  building: BuildingProfile,
  order: WorkOrder,
  assets: Asset[],
): Promise<Blob> {
  const assetNames = order.targetAssetIds
    .map((id) => assets.find((a) => a.id === id)?.name)
    .filter(Boolean)
    .join(", ");

  const infoRows = [
    row("Номер наряда", order.ticketNumber),
    row("Объект", `${building.name}, ${building.address}`),
    row("Наименование работ", order.title),
    row("Сложность", WORK_ORDER_COMPLEXITY_LABELS[order.complexity]),
    row("Сезонность", WORK_ORDER_SEASONALITY_LABELS[order.seasonality]),
    row("Оборудование", assetNames || "не указано"),
    row("Плановая дата начала", order.plannedStartDate || "—"),
    row("Дедлайн", order.deadline ? new Date(order.deadline).toLocaleString("ru-RU") : "—"),
    row("Исполнители", order.assignedStaffNames.join(", ") || "—"),
    row("Режим работ", order.isNightShift ? "НОЧНОЙ (22:00–06:00)" : "Дневной"),
  ];

  const checklistRows =
    order.checklist.length > 0
      ? order.checklist.map(
          (item, i) =>
            new TableRow({
              children: [
                cell(String(i + 1), { width: 8 }),
                cell(item.text, { width: 92 }),
              ],
            }),
        )
      : [new TableRow({ children: [cell("", { width: 8 }), cell("Чек-лист не заполнен", { width: 92 })] })];

  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { orientation: "portrait" } } },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.TITLE,
            spacing: { after: 100 },
            children: [new TextRun({ text: "Наряд-допуск / акт согласования работ" })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [new TextRun({ text: order.description, italics: true, color: "64748B" })],
          }),

          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: infoRows }),

          ...(order.isNightShift
            ? [
                new Paragraph({ spacing: { before: 300, after: 80 }, children: [new TextRun({ text: "" })] }),
                new Paragraph({
                  shading: { type: ShadingType.SOLID, color: "FEF3C7", fill: "FEF3C7" },
                  spacing: { after: 200 },
                  children: [
                    new TextRun({
                      text:
                        "⚠ Работы проводятся в ночное время — необходимо заблаговременно уведомить жителей о возможном шуме и/или временном отключении инженерных систем.",
                      bold: true,
                    }),
                  ],
                }),
              ]
            : []),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: "Перечень работ / чек-лист" })],
          }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: checklistRows }),

          new Paragraph({ spacing: { before: 500, after: 200 }, children: [new TextRun({ text: "Наряд согласован:" })] }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `Председатель ОСИ: _______________________  /____________________/  «____»_____________ 20___ г.`,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `Ответственный исполнитель: _______________________  /____________________/  «____»_____________ 20___ г.`,
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}
