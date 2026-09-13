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
import type { BuildingProfile, OwnershipUnit } from "@/lib/calculator/types";
import { computeUnitDebtStatus, type UnitDebtStatus } from "@/lib/calculator/ownerRegistryEngine";
import { amountToWordsKzt } from "@/lib/format/amountToWordsRu";
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

function para(text: string, opts: { spacing?: number; bold?: boolean; italics?: boolean; color?: string; size?: number } = {}) {
  return new Paragraph({
    spacing: { after: opts.spacing ?? 150 },
    children: [new TextRun({ text, bold: opts.bold, italics: opts.italics, color: opts.color, size: opts.size })],
  });
}

export interface DebtClaimContext {
  building: BuildingProfile;
  /** Один или несколько должников — при нескольких формируется сводная таблица + расчёт по каждому */
  units: OwnershipUnit[];
}

/**
 * Формирует одну строку таблицы расчёта по услуге, только если по ней есть
 * данные (начисление или долг) — не показываем нулевые/неактуальные услуги.
 */
function serviceRow(label: string, monthlyChargeKzt: number, debtKzt: number, debtMonths: number) {
  return new TableRow({
    children: [
      cell(label),
      cell(formatKzt(monthlyChargeKzt), { align: AlignmentType.RIGHT }),
      cell(formatKzt(Math.max(0, debtKzt)), { align: AlignmentType.RIGHT, bold: true }),
      cell(debtMonths > 0 ? `≈${debtMonths}` : "—", { align: AlignmentType.RIGHT }),
    ],
  });
}

function unitLabel(unit: OwnershipUnit): string {
  return `${unit.address ? `${unit.address}, ` : ""}№ ${unit.number}`;
}

function summaryTable(units: OwnershipUnit[], statuses: UnitDebtStatus[]): Table {
  const rows: TableRow[] = [
    new TableRow({
      children: [
        cell("Дом/корпус, №", { bold: true, shaded: true, width: 34 }),
        cell("ФИО", { bold: true, shaded: true, width: 24 }),
        cell("Лицевой счёт", { bold: true, shaded: true, width: 20 }),
        cell("Долг, ₸", { bold: true, shaded: true, width: 22, align: AlignmentType.RIGHT }),
      ],
    }),
  ];
  let grandTotal = 0;
  units.forEach((unit, i) => {
    const status = statuses[i];
    grandTotal += status.totalDebtKzt;
    rows.push(
      new TableRow({
        children: [
          cell(unitLabel(unit)),
          cell(unit.ownerName || "—"),
          cell(unit.personalAccount || "—"),
          cell(formatKzt(status.totalDebtKzt), { align: AlignmentType.RIGHT, bold: true }),
        ],
      }),
    );
  });
  rows.push(
    new TableRow({
      children: [
        cell("ИТОГО по всем должникам", { bold: true, shaded: true }),
        cell("", { shaded: true }),
        cell("", { shaded: true }),
        cell(formatKzt(grandTotal), { bold: true, shaded: true, align: AlignmentType.RIGHT }),
      ],
    }),
  );
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

function unitSection(unit: OwnershipUnit, status: UnitDebtStatus, heading?: string): (Paragraph | Table)[] {
  const rows: TableRow[] = [
    new TableRow({
      children: [
        cell("Услуга", { bold: true, shaded: true, width: 34 }),
        cell("Начисление за период, ₸", { bold: true, shaded: true, width: 24, align: AlignmentType.RIGHT }),
        cell("Долг на конец периода, ₸", { bold: true, shaded: true, width: 24, align: AlignmentType.RIGHT }),
        cell("≈ мес. просрочки", { bold: true, shaded: true, width: 18, align: AlignmentType.RIGHT }),
      ],
    }),
  ];
  if ((unit.monthlyChargeElevatorKzt ?? 0) > 0 || status.elevatorDebtKzt !== 0) {
    rows.push(serviceRow("ТО лифтов", unit.monthlyChargeElevatorKzt ?? 0, status.elevatorDebtKzt, status.elevatorDebtMonths));
  }
  if ((unit.monthlyChargeOperationalKzt ?? 0) > 0 || status.operationalDebtKzt !== 0) {
    rows.push(
      serviceRow("Эксплуатационные расходы", unit.monthlyChargeOperationalKzt ?? 0, status.operationalDebtKzt, status.operationalDebtMonths),
    );
  }
  rows.push(
    new TableRow({
      children: [
        cell("ИТОГО задолженность", { bold: true, shaded: true }),
        cell("", { shaded: true }),
        cell(formatKzt(status.totalDebtKzt), { bold: true, shaded: true, align: AlignmentType.RIGHT }),
        cell("", { shaded: true }),
      ],
    }),
  );

  const children: (Paragraph | Table)[] = [];
  if (heading) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 300, after: 100 }, children: [new TextRun({ text: heading })] }));
  }
  children.push(
    para("Должник (собственник/наниматель):", { bold: true, spacing: 80 }),
    para(unit.ownerName || "_____________________________________________________________________________"),
    para(`Лицевой счёт (ЛС): ${unit.personalAccount || "________________"}`),
    para(`Адрес/помещение: ${unitLabel(unit)}${unit.area ? `, ${unit.area} м²` : ""}`, { spacing: 300 }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }),
  );
  if (heading) {
    // сводный расчёт по нескольким должникам — сумма прописью только по итогу в конце документа
  } else {
    children.push(para(`Сумма долга прописью: ${amountToWordsKzt(status.totalDebtKzt)}.`, { bold: true, spacing: 300 }));
  }
  if (unit.debtPeriod) {
    children.push(para(`Данные приведены по ведомости за период: ${unit.debtPeriod}.`, { color: "64748B", size: 18 }));
  }
  return children;
}

/**
 * «Расчёт задолженности» по одному или нескольким лицевым счетам —
 * документ для передачи нотариусу при взыскании долга по исполнительной
 * надписи (ст. 91-92 Закона РК «О нотариате»): требование должно быть
 * бесспорным, поэтому расчёт дословно воспроизводит данные последней
 * импортированной ведомости ЕРЦ и прямо помечает оценочный характер числа
 * месяцев просрочки. При нескольких должниках документ дополнительно
 * открывается сводной таблицей по всем выбранным лицевым счетам. Документ
 * не заменяет акт сверки/уведомление должника — это отдельные шаги,
 * которые товарищество/ОСИ обеспечивает самостоятельно перед обращением к
 * нотариусу.
 */
export async function exportDebtClaimToDocxBlob(ctx: DebtClaimContext): Promise<Blob> {
  const { building, units } = ctx;
  if (units.length === 0) throw new Error("exportDebtClaimToDocxBlob: units is empty");
  const statuses = units.map((u) => computeUnitDebtStatus(u));
  const grandTotal = statuses.reduce((sum, s) => sum + s.totalDebtKzt, 0);
  const isBatch = units.length > 1;
  const today = new Date().toLocaleDateString("ru-RU");

  const bodyChildren: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.TITLE,
      spacing: { after: 100 },
      children: [new TextRun({ text: "РАСЧЁТ ЗАДОЛЖЕННОСТИ" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: isBatch
            ? `по оплате взносов на содержание общего имущества объекта кондоминиума — сводно по ${units.length} лицевым счетам`
            : "по оплате взносов на содержание общего имущества объекта кондоминиума",
          italics: true,
          color: "64748B",
        }),
      ],
    }),

    para(building.name || "_____________________________________________________________________________", { bold: true }),
    para(building.address || "_____________________________________________________________________________"),
    para(`Дата составления расчёта: ${today}`, { spacing: 300 }),
  ];

  if (isBatch) {
    bodyChildren.push(
      para("Сводная таблица по должникам:", { bold: true, spacing: 100 }),
      summaryTable(units, statuses),
      para(`Итоговая сумма долга по всем должникам прописью: ${amountToWordsKzt(grandTotal)}.`, { bold: true, spacing: 300 }),
    );
    units.forEach((unit, i) => {
      bodyChildren.push(...unitSection(unit, statuses[i], `Должник ${i + 1}: ${unit.ownerName || unitLabel(unit)}`));
    });
  } else {
    bodyChildren.push(...unitSection(units[0], statuses[0]));
  }

  bodyChildren.push(
    para(
      "Число месяцев просрочки — расчётная оценка (долг / начисление за текущий период), а не точная помесячная история: " +
        "исходная ведомость — снимок одного расчётного периода, без данных за прошлые месяцы.",
      { italics: true, color: "64748B", size: 18, spacing: 300 },
    ),
    para(
      "Настоящий расчёт подготовлен на основании данных бухгалтерского учёта товарищества/ОСИ для последующего обращения за " +
        "исполнительной надписью нотариуса по бесспорному требованию (ст. 91-92 Закона РК «О нотариате»). Перед обращением к " +
        "нотариусу необходимо дополнительно оформить акт сверки взаиморасчётов и направить должнику уведомление о наличии " +
        "задолженности в порядке, предусмотренном законодательством — эти документы система не формирует автоматически.",
      { italics: true, color: "64748B", size: 18, spacing: 400 },
    ),

    new Paragraph({ spacing: { before: 300, after: 200 }, children: [new TextRun({ text: "Председатель ОСИ / ПТ / управляющий МЖД:" })] }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: "_______________________  /____________________/  «____»_____________ 20___ г." })],
    }),
    new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "Бухгалтер:" })] }),
    new Paragraph({
      children: [new TextRun({ text: "_______________________  /____________________/  «____»_____________ 20___ г." })],
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
