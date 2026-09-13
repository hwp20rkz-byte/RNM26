import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { parseErcStatementFile } from "./parseErcStatement";

const HEADERS = [
  "ФИО",
  "ЛС",
  "Адрес",
  "№ кв.",
  "Площадь",
  "Услуга",
  "Тариф",
  "Начальное сальдо",
  "Начисление",
  "Платеж",
  "Платеж сторонний",
  "Корректировки",
  "Конечное сальдо",
];

interface Row {
  ls: string | number;
  address: string;
  unitNumber: string;
  area: number;
  service: string;
  tariff: number;
  opening: number;
  accrual: number;
  payment: number;
  thirdParty: number;
  adjustment: number;
  closing: number;
}

async function buildStatementFile(rows: Row[], titleLine = "Сальдовая ведомость по поставщику за 08/2026(форма № 215_новая)(за услуги, оказанные в 07/2026 года)"): Promise<File> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Лист1");
  ws.getCell("A1").value = titleLine;
  ws.getCell("A3").value = "Поставщик: 1200 ОО Bahyt Home";
  ws.getRow(5).values = ["", ...HEADERS.slice(1)];
  // Записываем полный заголовок начиная с A (индекс 1)
  HEADERS.forEach((h, i) => {
    ws.getRow(5).getCell(i + 1).value = h;
  });
  let r = 6;
  for (const row of rows) {
    const cells = [
      "",
      row.ls,
      row.address,
      row.unitNumber,
      row.area,
      row.service,
      row.tariff,
      row.opening,
      row.accrual,
      row.payment,
      row.thirdParty,
      row.adjustment,
      row.closing,
    ];
    cells.forEach((v, i) => {
      ws.getRow(r).getCell(i + 1).value = v as ExcelJS.CellValue;
    });
    r += 1;
  }
  const buffer = await wb.xlsx.writeBuffer();
  return new File([buffer], "test-erc.xlsx");
}

function elevatorRow(ls: string, address: string, unitNumber: string, area: number, opts: Partial<Row> = {}): Row {
  return {
    ls,
    address,
    unitNumber,
    area,
    service: "ТО лифтов",
    tariff: 1500,
    opening: 0,
    accrual: 1500,
    payment: 1500,
    thirdParty: 0,
    adjustment: 0,
    closing: 0,
    ...opts,
  };
}

function operationalRow(ls: string, address: string, unitNumber: string, area: number, tariff: number, opts: Partial<Row> = {}): Row {
  const accrual = round2(tariff * area);
  return {
    ls,
    address,
    unitNumber,
    area,
    service: "Эксплуатационные расходы КСК",
    tariff,
    opening: 0,
    accrual,
    payment: accrual,
    thirdParty: 0,
    adjustment: 0,
    closing: 0,
    ...opts,
  };
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

describe("parseErcStatementFile", () => {
  it("распознаёт период и поставщика из шапки листа", async () => {
    const file = await buildStatementFile([elevatorRow("1001", "ул.Тест, д.1", "1", 50), operationalRow("1001", "ул.Тест, д.1", "1", 50, 69.2)]);
    const result = await parseErcStatementFile(file);
    expect(result.period).toBe("08/2026");
    expect(result.serviceProvider).toBe("1200 ОО Bahyt Home");
  });

  it("группирует 2 строки услуг в один юнит по ЛС", async () => {
    const file = await buildStatementFile([elevatorRow("1001", "ул.Тест, д.1", "1", 50), operationalRow("1001", "ул.Тест, д.1", "1", 50, 69.2)]);
    const result = await parseErcStatementFile(file);
    expect(result.units).toHaveLength(1);
    const unit = result.units[0];
    expect(unit.personalAccount).toBe("1001");
    expect(unit.unitNumber).toBe("1");
    expect(unit.services).toHaveLength(2);
    expect(unit.services.find((s) => s.kind === "elevator_maintenance")).toBeTruthy();
    expect(unit.services.find((s) => s.kind === "operational_expenses")).toBeTruthy();
  });

  it("считает totalClosingBalanceKzt как сумму конечных сальдо по услугам, включая долг", async () => {
    const file = await buildStatementFile([
      elevatorRow("1002", "ул.Тест, д.1", "2", 60, { opening: 1500, accrual: 1500, payment: 0, closing: 3000 }),
      operationalRow("1002", "ул.Тест, д.1", "2", 60, 69.2, { closing: 4152 }),
    ]);
    const result = await parseErcStatementFile(file);
    const unit = result.units[0];
    expect(unit.totalClosingBalanceKzt).toBeCloseTo(3000 + 4152, 1);
  });

  it("допускает отрицательное конечное сальдо (переплата)", async () => {
    const file = await buildStatementFile([
      elevatorRow("1003", "ул.Тест, д.1", "3", 40, { opening: -500, accrual: 1500, payment: 1000, closing: -500 }),
      operationalRow("1003", "ул.Тест, д.1", "3", 40, 69.2, { closing: 0 }),
    ]);
    const result = await parseErcStatementFile(file);
    expect(result.units[0].totalClosingBalanceKzt).toBeCloseTo(-500, 1);
  });

  it("группирует по адресам и считает должников/сумму долга корректно", async () => {
    const file = await buildStatementFile([
      elevatorRow("2001", "ул.А, д.1", "1", 50, { closing: 0 }),
      operationalRow("2001", "ул.А, д.1", "1", 50, 69.2, { closing: 0 }),
      elevatorRow("2002", "ул.А, д.1", "2", 60, { closing: 1500 }),
      operationalRow("2002", "ул.А, д.1", "2", 60, 69.2, { closing: 0 }),
      elevatorRow("3001", "ул.Б, д.2", "1", 70, { closing: 0 }),
      operationalRow("3001", "ул.Б, д.2", "1", 70, 69.2, { closing: 0 }),
    ]);
    const result = await parseErcStatementFile(file);
    expect(result.addresses).toHaveLength(2);
    const addrA = result.addresses.find((a) => a.address === "ул.А, д.1");
    expect(addrA?.unitCount).toBe(2);
    expect(addrA?.debtorCount).toBe(1);
    expect(addrA?.totalDebtKzt).toBeCloseTo(1500, 1);
    const addrB = result.addresses.find((a) => a.address === "ул.Б, д.2");
    expect(addrB?.debtorCount).toBe(0);
  });

  it("собирает нераспознанные метки услуг отдельно, не теряя их сумму в общем сальдо", async () => {
    const file = await buildStatementFile([
      elevatorRow("4001", "ул.В, д.3", "1", 50),
      operationalRow("4001", "ул.В, д.3", "1", 50, 69.2),
      {
        ls: "4001",
        address: "ул.В, д.3",
        unitNumber: "1",
        area: 50,
        service: "Охрана",
        tariff: 10,
        opening: 0,
        accrual: 500,
        payment: 0,
        thirdParty: 0,
        adjustment: 0,
        closing: 500,
      },
    ]);
    const result = await parseErcStatementFile(file);
    expect(result.unknownServiceLabels).toContain("Охрана");
    const unit = result.units[0];
    expect(unit.services).toHaveLength(3);
    expect(unit.totalClosingBalanceKzt).toBeCloseTo(500, 1);
  });

  it("возвращает пустой результат, если обязательные колонки не найдены", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Лист1");
    ws.getRow(1).values = ["Случайный", "Файл", "Без", "Заголовков"];
    ws.getRow(2).values = ["a", "b", "c", "d"];
    const buffer = await wb.xlsx.writeBuffer();
    const file = new File([buffer], "not-erc.xlsx");
    const result = await parseErcStatementFile(file);
    expect(result.units).toHaveLength(0);
  });
});
