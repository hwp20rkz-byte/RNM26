// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { parseInventoryListFile } from "./parseInventoryList";

function csvFile(content: string): File {
  return new File([content], "stock.csv", { type: "text/csv" });
}

describe("parseInventoryListFile (CSV, начальные остатки склада)", () => {
  it("распознаёт русские заголовки", async () => {
    const csv =
      "Наименование,Ед.изм,Остаток,Неснижаемый запас,Цена,Категория\n" +
      "Сальник D50,шт,15,5,1200,Сантехника\n" +
      "Кабель ВВГ,м,50,20,450,Электрика\n";
    const result = await parseInventoryListFile(csvFile(csv));
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      name: "Сальник D50",
      unit: "шт",
      quantityOnHand: 15,
      minThreshold: 5,
      avgUnitPrice: 1200,
      category: "sanitary",
    });
    expect(result.rows[1].category).toBe("electrical");
  });

  it("пропускает строки без наименования", async () => {
    const csv = "Наименование,Остаток\nПозиция 1,5\n,10\n";
    const result = await parseInventoryListFile(csvFile(csv));
    expect(result.rows).toHaveLength(1);
    expect(result.skipped).toBe(1);
  });

  it("без категории — по умолчанию расходники", async () => {
    const csv = "Наименование,Остаток\nПозиция 1,5\n";
    const result = await parseInventoryListFile(csvFile(csv));
    expect(result.rows[0].category).toBe("consumable");
  });

  it("без цены и порога — нули/значение по умолчанию", async () => {
    const csv = "Наименование\nПозиция без данных\n";
    const result = await parseInventoryListFile(csvFile(csv));
    expect(result.rows[0].avgUnitPrice).toBe(0);
    expect(result.rows[0].quantityOnHand).toBe(0);
    expect(result.rows[0].minThreshold).toBe(1);
  });
});
