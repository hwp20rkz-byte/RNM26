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
import type {
  Asset,
  BuildingProfile,
  GeneralMeeting,
  MaintenanceTask,
  OwnershipUnit,
  RegionalMinTariff,
  TariffResult,
} from "@/lib/calculator/types";
import { UNIT_TYPE_LABELS, MEETING_FORMAT_LABELS } from "@/lib/calculator/types";
import { computeAgendaItemResult, computeQuorum } from "@/lib/calculator/ownerRegistryEngine";
import { computeAllWear } from "@/lib/calculator/wearEngine";
import { computeMaintenanceTasks } from "@/lib/calculator/maintenanceCalendar";
import { compareToMinTariff } from "@/lib/calculator/engine";
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
    children: [new Paragraph({ alignment: opts.align ?? AlignmentType.LEFT, children: [new TextRun({ text, bold: opts.bold, size: 18 })] })],
  });
}

function heading(text: string) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 150 }, children: [new TextRun({ text })] });
}

function para(text: string, opts: { italics?: boolean; bold?: boolean; color?: string } = {}) {
  return new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text, ...opts })] });
}

export interface ProtocolContext {
  building: BuildingProfile;
  meeting: GeneralMeeting;
  units: OwnershipUnit[];
  assets: Asset[];
  maintenanceTasks: MaintenanceTask[];
  tariff: TariffResult;
  minTariff?: RegionalMinTariff;
  capitalFundBalance: number;
  annualCapitalIncome: number;
  capitalPlanTotalNeed: number;
  capitalPlanHorizonYears: number;
}

/**
 * Протокол общего собрания — кворум и результаты голосования считаются от
 * реестра собственников (площадь = голос), плюс сводка критичных
 * показателей объекта (износ, план капремонта, просроченные регламентные
 * работы, соответствие минимальному тарифу), чтобы протокол был
 * самодостаточным документом для жилищной инспекции, а не только записью
 * голосования.
 */
export async function exportProtocolToDocxBlob(ctx: ProtocolContext): Promise<Blob> {
  const { building, meeting, units, assets, maintenanceTasks, tariff } = ctx;
  const quorum = computeQuorum(units, meeting);
  const currentYear = new Date().getFullYear();
  const wears = computeAllWear(assets, currentYear);
  const criticalAssets = wears.filter((w) => w.condition === "critical" || w.condition === "expired");
  const assetById = new Map(assets.map((a) => [a.id, a]));
  const overdueMaintenance = computeMaintenanceTasks(maintenanceTasks, new Date()).filter((t) => t.status === "overdue");
  const tariffStatus = compareToMinTariff(tariff.tariffPerSqm, ctx.minTariff);
  const capitalGap = ctx.capitalPlanTotalNeed - (ctx.capitalFundBalance + ctx.annualCapitalIncome * ctx.capitalPlanHorizonYears);

  // --- Кворум ---
  const quorumRows = [
    new TableRow({
      children: [
        cell("Всего голосов в реестре (по площади), м²", { bold: true, width: 60 }),
        cell(quorum.totalArea.toLocaleString("ru-RU"), { width: 40, align: AlignmentType.RIGHT }),
      ],
    }),
    new TableRow({
      children: [
        cell("Присутствует/проголосовало (по площади), м²", { bold: true }),
        cell(quorum.presentArea.toLocaleString("ru-RU"), { align: AlignmentType.RIGHT }),
      ],
    }),
    new TableRow({
      children: [cell("Доля присутствующих, %", { bold: true }), cell(`${quorum.quorumPercent}%`, { align: AlignmentType.RIGHT })],
    }),
    new TableRow({
      children: [
        cell("Кворум (более 50% голосов)", { bold: true, shaded: true }),
        cell(quorum.quorumMet ? "СОСТОЯЛСЯ" : "НЕ СОСТОЯЛСЯ", { bold: true, shaded: true, align: AlignmentType.RIGHT }),
      ],
    }),
  ];

  // --- Повестка и голосование ---
  const agendaBlocks: Paragraph[] = [];
  meeting.agendaItems.forEach((item, i) => {
    const r = computeAgendaItemResult(units, meeting, item);
    agendaBlocks.push(
      new Paragraph({ spacing: { before: 200, after: 80 }, children: [new TextRun({ text: `${i + 1}. ${item.title}`, bold: true })] }),
    );
    if (item.description) agendaBlocks.push(para(item.description, { italics: true, color: "64748B" }));
    agendaBlocks.push(
      para(
        `Голосование (от площади присутствующих): за — ${r.forArea.toLocaleString("ru-RU")} м² (${r.forPercentOfPresent}%), против — ${r.againstArea.toLocaleString("ru-RU")} м², воздержались — ${r.abstainArea.toLocaleString("ru-RU")} м². Требуемый порог: ${item.majorityRule === "qualified" ? "не менее 2/3" : "более 50%"} голосов присутствующих.`,
      ),
    );
    agendaBlocks.push(para(`РЕШЕНИЕ: ${r.passed ? "ПРИНЯТО" : "НЕ ПРИНЯТО"}`, { bold: true }));
    if (item.resolutionText) agendaBlocks.push(para(item.resolutionText));
  });
  if (meeting.agendaItems.length === 0) {
    agendaBlocks.push(para("Вопросы повестки дня не добавлены.", { italics: true, color: "94A3B8" }));
  }

  // --- Критичные показатели ---
  const criticalParas: Paragraph[] = [
    para(
      `Тариф на управление и содержание: ${formatKztPrecise(tariff.tariffPerSqm)} ₸/м²/мес. (${tariffStatusLabel(tariffStatus)})`,
    ),
    para(
      `Износ оборудования: ${criticalAssets.length > 0 ? `${criticalAssets.length} ед. в состоянии «критично»/«срок истёк» — ${criticalAssets.map((w) => `${assetById.get(w.assetId)?.name ?? ""} (${w.wearPercent}%)`).join("; ")}` : "критичных позиций нет"}.`,
    ),
    para(
      `План капитального ремонта на ${ctx.capitalPlanHorizonYears} лет: требуется ${formatKzt(ctx.capitalPlanTotalNeed)}, при текущем взносе (${formatKzt(ctx.annualCapitalIncome)}/год) и балансе ${formatKzt(ctx.capitalFundBalance)} накопится ${formatKzt(ctx.capitalFundBalance + ctx.annualCapitalIncome * ctx.capitalPlanHorizonYears)} — ${capitalGap > 0 ? `дефицит ${formatKzt(capitalGap)}` : `запас ${formatKzt(-capitalGap)}`}.`,
    ),
    para(
      `Просроченные регламентные работы: ${overdueMaintenance.length > 0 ? overdueMaintenance.map((t) => t.task.name).join("; ") : "нет"}.`,
    ),
  ];

  // --- Реестр присутствующих (приложение) ---
  const presentIds = new Set(meeting.participants.filter((p) => p.present).map((p) => p.unitId));
  const presentUnits = units.filter((u) => presentIds.has(u.id));
  const registryRows = [
    new TableRow({
      tableHeader: true,
      children: [
        cell("№ помещения", { bold: true, shaded: true, width: 15 }),
        cell("Тип", { bold: true, shaded: true, width: 15 }),
        cell("Собственник", { bold: true, shaded: true, width: 40 }),
        cell("Площадь, м²", { bold: true, shaded: true, width: 15, align: AlignmentType.RIGHT }),
        cell("Доверенность", { bold: true, shaded: true, width: 15 }),
      ],
    }),
    ...presentUnits.map((u) => {
      const participant = meeting.participants.find((p) => p.unitId === u.id);
      return new TableRow({
        children: [
          cell(u.number),
          cell(UNIT_TYPE_LABELS[u.unitType]),
          cell(u.ownerName || "—"),
          cell(u.area.toLocaleString("ru-RU"), { align: AlignmentType.RIGHT }),
          cell(participant?.byProxy ? participant.proxyHolder || "по доверенности" : "—"),
        ],
      });
    }),
  ];

  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { orientation: "portrait" } } },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.TITLE,
            spacing: { after: 100 },
            children: [new TextRun({ text: `ПРОТОКОЛ №___ ${meeting.title}` })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: `общего собрания собственников помещений (участников кондоминиума) объекта «${building.name}»`,
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: `${building.address}  ·  Дата: ${meeting.meetingDate}  ·  Форма: ${MEETING_FORMAT_LABELS[meeting.format]}${meeting.location ? `  ·  ${meeting.location}` : ""}`,
                italics: true,
                color: "64748B",
              }),
            ],
          }),

          heading("1. Кворум"),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: quorumRows }),

          heading("2. Повестка дня и результаты голосования"),
          ...agendaBlocks,

          heading("3. Критичные показатели по объекту"),
          ...criticalParas,

          heading("Приложение. Реестр присутствовавших участников собрания"),
          presentUnits.length > 0
            ? new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: registryRows })
            : para("Ни один участник не отмечен присутствующим.", { italics: true, color: "94A3B8" }),

          new Paragraph({ spacing: { before: 500 }, children: [new TextRun({ text: "" })] }),
          para(
            "Протокол составлен в соответствии с Законом РК «О жилищных отношениях». Раздел «Критичные показатели» носит справочный характер для принятия решений собранием и не заменяет отдельные акты обследования/экспертизы, где они требуются по закону (в частности — для лифтового хозяйства).",
            { italics: true, color: "64748B" },
          ),

          new Paragraph({ spacing: { before: 400, after: 200 }, children: [new TextRun({ text: `Председательствующий: ${meeting.chair ?? "___________________"}` })] }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "_______________________  /____________________/  «____»_____________ 20___ г." })] }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `Секретарь собрания: ${meeting.secretary ?? "___________________"}` })] }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "_______________________  /____________________/  «____»_____________ 20___ г." })] }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `Счётная комиссия: ${meeting.countingCommission ?? "___________________"}` })] }),
          new Paragraph({ children: [new TextRun({ text: "_______________________  /____________________/  «____»_____________ 20___ г." })] }),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}

function tariffStatusLabel(status: "below" | "within" | "above" | "unknown"): string {
  switch (status) {
    case "below":
      return "ниже минимального тарифа маслихата — риск недостаточного финансирования содержания";
    case "within":
      return "в пределах ожидаемого диапазона относительно минимального тарифа маслихата";
    case "above":
      return "существенно выше минимального тарифа маслихата — требует обоснования собранию";
    default:
      return "минимальный тариф маслихата для региона не задан в базе, сверка не выполнена";
  }
}
