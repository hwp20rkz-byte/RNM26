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
import type { BuildingProfile, TerritoryPassport } from "@/lib/calculator/types";

const BORDER = {
  top: { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
  left: { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
  right: { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
};

const COLUMN_COUNT = 8;

function cell(text: string, opts: { bold?: boolean; width?: number; shaded?: boolean; columnSpan?: number } = {}) {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    columnSpan: opts.columnSpan,
    borders: BORDER,
    verticalAlign: VerticalAlign.CENTER,
    shading: opts.shaded ? { type: ShadingType.SOLID, color: "E2E8F0", fill: "E2E8F0" } : undefined,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: opts.bold, size: 16 })] })],
  });
}

function para(text: string, opts: { spacing?: number; bold?: boolean; italics?: boolean; color?: string; size?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) {
  return new Paragraph({
    alignment: opts.align,
    spacing: { after: opts.spacing ?? 150 },
    children: [new TextRun({ text, bold: opts.bold, italics: opts.italics, color: opts.color, size: opts.size })],
  });
}

function headerRow(): TableRow {
  return new TableRow({
    children: [
      cell("№", { bold: true, shaded: true, width: 5 }),
      cell("Наименование МАФ/оборудования", { bold: true, shaded: true, width: 20 }),
      cell("Место расположения", { bold: true, shaded: true, width: 14 }),
      cell("Год установки", { bold: true, shaded: true, width: 9 }),
      cell("Техническое состояние", { bold: true, shaded: true, width: 12 }),
      cell("Выявленные дефекты/износ", { bold: true, shaded: true, width: 16 }),
      cell("Рекомендуемые меры", { bold: true, shaded: true, width: 14 }),
      cell("Срок устранения", { bold: true, shaded: true, width: 10 }),
    ],
  });
}

function sectionHeaderRow(title: string): TableRow {
  return new TableRow({ children: [cell(title, { bold: true, shaded: true, columnSpan: COLUMN_COUNT })] });
}

function blankRow(index: number): TableRow {
  return new TableRow({
    children: [
      cell(String(index)),
      cell(""),
      cell(""),
      cell(""),
      cell(""),
      cell(""),
      cell(""),
      cell(""),
    ],
  });
}

function blankRows(startIndex: number, count: number): TableRow[] {
  return Array.from({ length: count }, (_, i) => blankRow(startIndex + i));
}

function signatureBlock(role: string): Paragraph[] {
  return [
    para(`${role}:`, { spacing: 80 }),
    para("_______________________  /____________________/  подпись, Ф.И.О.", { spacing: 250 }),
  ];
}

/**
 * «Акт обследования технического состояния МАФ и оборудования площадок» —
 * рабочий шаблон QazaqOSI для комиссионной фиксации состояния малых
 * архитектурных форм и игрового/спортивного оборудования придомовой
 * территории. Это НЕ типовой бланк, утверждённый отдельным приложением
 * Приказа №22-НҚ дословно (в отличие от паспорта территории — Приложения В,
 * которое воспроизводится дословно) — точного текста такой формы нет в
 * проверенных источниках, поэтому документ оформлен как рабочий шаблон для
 * заполнения комиссией по результатам визуального осмотра, без ссылки на
 * конкретный номер пункта приказа. Таблица — бланк для заполнения от руки:
 * система не ведёт отдельный реестр МАФ поэлементно, поэтому строки пустые
 * (как и большинство полей паспорта территории, для которых нет источника
 * данных в проекте).
 */
export async function exportMafInspectionActToDocxBlob(building: BuildingProfile, passport?: TerritoryPassport): Promise<Blob> {
  const bodyChildren: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 0 },
      children: [new TextRun({ text: "Акиму ____________________________________ района/города" })],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 100 },
      children: [new TextRun({ text: "(наименование акимата)", italics: true, color: "64748B", size: 16 })],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 0 },
      children: [new TextRun({ text: `от ${building.name || "____________________________________"}` })],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 400 },
      children: [new TextRun({ text: "(наименование ОСИ/КСК/сервисной компании)", italics: true, color: "64748B", size: 16 })],
    }),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.TITLE,
      spacing: { after: 100 },
      children: [new TextRun({ text: "АКТ" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: "обследования технического состояния малых архитектурных форм (МАФ) и оборудования детских/спортивных площадок",
          italics: true,
          color: "64748B",
        }),
      ],
    }),

    para(building.name || "_____________________________________________________________________________", { bold: true }),
    para(building.address || "_____________________________________________________________________________"),
    para(`Дата обследования: «____» ______________ 20___ г.`, { spacing: 300 }),

    para("Комиссия в составе:", { bold: true, spacing: 100 }),
    ...signatureBlock("Председатель комиссии"),
    ...signatureBlock("Член комиссии"),
    ...signatureBlock("Член комиссии"),
  ];

  if (passport && (passport.playgroundCount > 0 || passport.urnCount > 0 || passport.lightingFixtureCount > 0)) {
    const parts: string[] = [];
    if (passport.playgroundCount > 0) parts.push(`игровых площадок — ${passport.playgroundCount} шт.`);
    if (passport.urnCount > 0) parts.push(`урн — ${passport.urnCount} шт.`);
    if (passport.lightingFixtureCount > 0) parts.push(`элементов освещения — ${passport.lightingFixtureCount} шт.`);
    bodyChildren.push(
      para(`Справочно по паспорту территории: ${parts.join(", ")}.`, { color: "64748B", size: 18, spacing: 300 }),
    );
  }

  bodyChildren.push(
    para("произвела осмотр и составила настоящий акт о следующем:", { spacing: 300 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow(), sectionHeaderRow("МАФ (скамьи, урны, ограждения, беседки и пр.)"), ...blankRows(1, 6), sectionHeaderRow("Оборудование детских и спортивных площадок"), ...blankRows(7, 6)],
    }),

    para("Заключение комиссии:", { bold: true, spacing: 150, size: 20 }),
    para("☐ МАФ/оборудование пригодны к дальнейшей эксплуатации без ограничений", { spacing: 80 }),
    para("☐ Требуется ремонт отдельных позиций (см. графу «Рекомендуемые меры»)", { spacing: 80 }),
    para("☐ Требуется демонтаж отдельных позиций как создающих угрозу безопасности", { spacing: 300 }),

    ...signatureBlock("Председатель комиссии"),
    ...signatureBlock("Член комиссии"),
    ...signatureBlock("Член комиссии"),

    new Paragraph({
      spacing: { before: 300 },
      children: [
        new TextRun({
          text:
            "Рабочий шаблон QazaqOSI для фиксации технического состояния МАФ и оборудования площадок при содержании придомовой территории. " +
            "Не является типовым бланком, утверждённым отдельным приложением нормативного документа — заполняется комиссией по результатам " +
            "визуального осмотра на объекте.",
          italics: true,
          color: "64748B",
          size: 16,
        }),
      ],
    }),
  );

  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { orientation: "portrait" } } },
        children: bodyChildren,
      },
    ],
  });

  return Packer.toBlob(doc);
}
