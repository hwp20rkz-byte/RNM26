// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { parsePriceListFile } from "./parsePriceList";

function csvFile(content: string, name = "prices.csv") {
  return new File([content], name, { type: "text/csv" });
}

describe("parsePriceListFile — CSV", () => {
  it("распознаёт стандартные русские заголовки через запятую", async () => {
    const csv = "Наименование,Ед.изм.,Кол-во,Цена\nЦемент,меш.,10,3500\nПесок,т,2,15000";
    const result = await parsePriceListFile(csvFile(csv));
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({ name: "Цемент", unit: "меш.", unitPrice: 3500, defaultQty: 10 });
    expect(result.rows[1].name).toBe("Песок");
  });

  it("работает с разделителем «;» и десятичной запятой в цене", async () => {
    const csv = "Название;Единица;Количество;Стоимость\nКраска;л;5;1250,50";
    const result = await parsePriceListFile(csvFile(csv));
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].unitPrice).toBeCloseTo(1250.5, 2);
  });

  it("поддерживает кавычки для значений с запятой внутри", async () => {
    const csv = 'Наименование,Ед.изм.,Кол-во,Цена\n"Труба, оцинкованная",шт,3,450';
    const result = await parsePriceListFile(csvFile(csv));
    expect(result.rows[0].name).toBe("Труба, оцинкованная");
  });

  it("пропускает строки без наименования и считает их в skipped", async () => {
    const csv = "Наименование,Ед.изм.,Кол-во,Цена\n,шт,1,100\nБолт,шт,20,15";
    const result = await parsePriceListFile(csvFile(csv));
    expect(result.rows).toHaveLength(1);
    expect(result.skipped).toBe(1);
  });

  it("проставляет ед.изм. «шт.» и кол-во 1 по умолчанию, если колонки не найдены", async () => {
    const csv = "Товар,Цена\nШуруп,25";
    const result = await parsePriceListFile(csvFile(csv));
    expect(result.rows[0]).toEqual({ name: "Шуруп", unit: "шт.", unitPrice: 25, defaultQty: 1 });
  });
});
