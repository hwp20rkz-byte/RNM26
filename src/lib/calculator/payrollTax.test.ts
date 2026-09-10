import { describe, expect, it } from "vitest";
import { computePayroll, DEFAULT_TAX_RATES } from "./payrollTax";

describe("computePayroll", () => {
  // Контрольный пример — реальный расчёт зарплаты председателя ОСИ
  // (оклад 500 000 ₸) из сметы ЖК «Коркем-1», лист «1.1.1».
  it("воспроизводит ОПВ/ВОСМС/ОСМС/ОПВР/СО из реального примера с точностью до тенге", () => {
    const result = computePayroll(500000, DEFAULT_TAX_RATES);
    expect(result.opv).toBe(50000); // 10%
    expect(result.vosms).toBe(10000); // 2%
    expect(result.osmsEmployer).toBe(15000); // 3%
    expect(result.opvr).toBe(17500); // 3.5%
    expect(result.so).toBe(22500); // 5% от (500000-50000)
  });

  it("ИПН близок к реальному значению 31 025 ₸ (вычет — настраиваемый параметр)", () => {
    const result = computePayroll(500000, DEFAULT_TAX_RATES);
    expect(result.ipn).toBeGreaterThan(30000);
    expect(result.ipn).toBeLessThan(32000);
  });

  it("зарплата на руки = оклад - ОПВ - ВОСМС - ИПН", () => {
    const result = computePayroll(500000, DEFAULT_TAX_RATES);
    expect(result.netPay).toBe(result.gross - result.opv - result.vosms - result.ipn);
  });

  it("полная стоимость для ОСИ = оклад + отчисления работодателя", () => {
    const result = computePayroll(500000, DEFAULT_TAX_RATES);
    expect(result.totalCostToOsi).toBe(
      result.gross + result.osmsEmployer + result.so + result.sn + result.opvr,
    );
  });

  it("не уходит в отрицательные значения при малых окладах", () => {
    const result = computePayroll(50000, DEFAULT_TAX_RATES);
    expect(result.ipn).toBeGreaterThanOrEqual(0);
    expect(result.sn).toBeGreaterThanOrEqual(0);
  });
});
