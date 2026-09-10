// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { parseOwnersListFile } from "./parseOwnersList";

function csvFile(content: string): File {
  return new File([content], "owners.csv", { type: "text/csv" });
}

describe("parseOwnersListFile (CSV, ведомость ЕРЦ)", () => {
  it("распознаёт русские заголовки и типы помещений", async () => {
    const csv =
      "Тип помещения,№ квартиры,Площадь,ФИО собственника,ИИН,Телефон\n" +
      "Квартира,12,54.3,Иванов Иван Иванович,900101300123,+77011234567\n" +
      "Нежилое,Н-1,120,ТОО Ромашка,,\n" +
      "Кладовая,К-5,3.2,Петров Петр,,\n" +
      "Машиноместо,М-9,13.5,Сидорова Анна,,\n";
    const result = await parseOwnersListFile(csvFile(csv));
    expect(result.rows).toHaveLength(4);
    expect(result.rows[0]).toMatchObject({ unitType: "apartment", number: "12", area: 54.3, ownerName: "Иванов Иван Иванович" });
    expect(result.rows[1].unitType).toBe("commercial");
    expect(result.rows[2].unitType).toBe("storage");
    expect(result.rows[3].unitType).toBe("parking");
  });

  it("пропускает строки без номера помещения или площади", async () => {
    const csv = "№ квартиры,Площадь,ФИО\n1,50,Тест\n,60,Без номера\n2,0,Нулевая площадь\n";
    const result = await parseOwnersListFile(csvFile(csv));
    expect(result.rows).toHaveLength(1);
    expect(result.skipped).toBe(2);
  });

  it("без колонки типа — по умолчанию считает квартирой", async () => {
    const csv = "№,Площадь,ФИО\n1,40,Тест\n";
    const result = await parseOwnersListFile(csvFile(csv));
    expect(result.rows[0].unitType).toBe("apartment");
    expect(result.headerMap.unitType).toContain("не найдено");
  });

  it("распознаёт колонки email и документ", async () => {
    const csv = "№,Площадь,ФИО,Email,Документ\n1,40,Тест,a@b.kz,Свид. №123\n";
    const result = await parseOwnersListFile(csvFile(csv));
    expect(result.rows[0].ownerEmail).toBe("a@b.kz");
    expect(result.rows[0].documentRef).toBe("Свид. №123");
  });
});
