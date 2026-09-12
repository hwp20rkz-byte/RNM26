import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import type { BuildingProfile, TerritoryPassport } from "@/lib/calculator/types";

function para(text: string, opts: { spacing?: number; bold?: boolean } = {}) {
  return new Paragraph({
    spacing: { after: opts.spacing ?? 200 },
    children: [new TextRun({ text, bold: opts.bold })],
  });
}

/**
 * Официальный бланк «Паспорт благоустройства, уборки и содержания
 * территории» — типовая форма Приложения В методических рекомендаций
 * №22-НҚ от 01.12.2023. Текст полей и порядок воспроизводят исходный
 * бланк дословно (это документ для акимата, а не наша интерпретация);
 * поля, которых нет в модели данных приложения (ФИО руководителя, номер
 * договора на вывоз ТБО, наличие дворников/номер договора на уборку,
 * дата выдачи, подпись представителя МИО), оставлены как пустые бланки
 * для заполнения от руки — как в оригинале.
 */
export async function exportTerritoryPassportToDocxBlob(
  building: BuildingProfile,
  passport: TerritoryPassport,
): Promise<Blob> {
  const pavementTotal = passport.pavementAreaSqm + passport.accessRoadAreaSqm;
  const treesAndShrubs = passport.treeCount + passport.shrubCount;

  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { orientation: "portrait" } } },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.TITLE,
            spacing: { after: 300 },
            children: [
              new TextRun({ text: "ПАСПОРТ" }),
              new TextRun({ text: " благоустройства, уборки и содержания территории", break: 1 }),
            ],
          }),

          para(`Наименование населённого пункта ____________________________________ Район ____________________________________`),
          para(building.name || "_____________________________________________________________________________", { bold: true }),
          para("(наименование юридического лица, управляющей или сервисной компании и др.)"),
          para(building.address || "_____________________________________________________________________________"),
          para("(фактический адрес месторасположения)"),
          para("_____________________________________________________________________________"),
          para("(юридический адрес, телефон)", { spacing: 400 }),

          para("1. Ф.И.О. руководителя"),
          para("_____________________________________________________________________________ (ФИО, телефон)", { spacing: 400 }),

          para("2. Договор на вывоз ТБО N, дата __________________________"),
          para(`3. Площадь твёрдого покрытия, м² ${pavementTotal > 0 ? pavementTotal.toLocaleString("ru-RU") : "________________________"}`),
          para(`4. Площадь газонов, м² ${passport.greeneryAreaSqm > 0 ? passport.greeneryAreaSqm.toLocaleString("ru-RU") : "__________________________________"}`),
          para(`5. Количество деревьев, кустарников, шт. ${treesAndShrubs > 0 ? treesAndShrubs.toLocaleString("ru-RU") : "__________________"}`),
          para("6. Наличие МАФов, шт. _________________________________"),
          para("7. Наличие дворников (кол.) или № договора на уборку территории"),
          para("_____________________________________________________________________________", { spacing: 400 }),

          para(
            "В случае изменения данных, указанных в настоящем паспорте, руководитель юридического лица должен известить акимат __________________ района и получить обновлённый паспорт благоустройства, уборки и содержания территории.",
          ),
          new Paragraph({ spacing: { before: 300, after: 200 }, children: [new TextRun({ text: "М.П. ___________________________ Ф.И.О. (подпись руководителя)" })] }),
          new Paragraph({ spacing: { after: 400 }, children: [new TextRun({ text: `Выдано «___» __________ 20___ года` })] }),

          new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "Представитель МИО ___________ _______________________ Ф.И.О." })] }),
          new Paragraph({ children: [new TextRun({ text: "М.П. (подпись)" })] }),

          new Paragraph({
            spacing: { before: 500 },
            children: [
              new TextRun({
                text: "Типовая форма — Приложение В Методических рекомендаций по содержанию и уборке придомовых территорий объектов кондоминиума и подъездных путей к ним, утв. приказом Комитета по делам строительства и ЖКХ МИИР РК №22-НҚ от 01.12.2023. Поля 3-5 предзаполнены данными паспорта территории из системы — сверьте перед подачей в акимат.",
                italics: true,
                color: "64748B",
                size: 16,
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}
