import { describe, expect, it } from "vitest";
import { BASE_ORDERS, DEFAULT_ASSUMPTIONS, HORIZON, fixedForMonth, mln, runPlan, sensitivity } from "./plan";

describe("финансовая модель", () => {
  const r = runPlan();

  it("горизонт 24 месяца, 8 кварталов, 2 года", () => {
    expect(HORIZON).toBe(24);
    expect(r.months).toHaveLength(24);
    expect(r.quarters).toHaveLength(8);
    expect(r.years).toHaveLength(2);
  });

  it("первый квартал: 27 заказов по 150 тыс. ₸, убыток около 1,6 млн ₸", () => {
    const q1 = r.quarters[0]!;
    expect(q1.revenue).toBe(27 * 150_000);
    expect(q1.result).toBeCloseTo(27 * 150_000 * 0.43 - 3 * 1_100_000, 0);
    expect(q1.result).toBeLessThan(-1_500_000);
  });

  it("год 1 около 35 млн ₸ выручки, год 2 около 65 млн ₸", () => {
    expect(r.years[0]!.revenue).toBeGreaterThan(34e6);
    expect(r.years[0]!.revenue).toBeLessThan(36e6);
    expect(r.years[1]!.revenue).toBeGreaterThan(64e6);
    expect(r.years[1]!.revenue).toBeLessThan(66e6);
  });

  it("безубыточность — 18 заказов: 17 не покрывают 1,1 млн ₸ постоянных расходов", () => {
    expect(r.breakEvenOrders).toBe(18);
    const gp = DEFAULT_ASSUMPTIONS.avgOrderKzt * DEFAULT_ASSUMPTIONS.grossMargin;
    expect(17 * gp).toBeLessThan(DEFAULT_ASSUMPTIONS.fixedStartKzt);
    expect(18 * gp).toBeGreaterThanOrEqual(DEFAULT_ASSUMPTIONS.fixedStartKzt);
  });

  it("потребность в деньгах около 3 млн ₸: капзатраты 1,2 плюс убытки первых месяцев", () => {
    expect(r.peakNeedKzt).toBeGreaterThan(2.9e6);
    expect(r.peakNeedKzt).toBeLessThan(3.0e6);
    // буфер 1,3 млн ₸ из первой версии плана не покрывал этот провал
    expect(r.peakNeedKzt).toBeGreaterThan(1_200_000 + 1_300_000);
  });

  it("окупаемость на 12-м месяце, первый прибыльный месяц — 6-й", () => {
    expect(r.paybackMonth).toBe(12);
    expect(r.firstProfitMonth).toBe(6);
  });

  it("накопленный поток — сумма месячных результатов минус капзатраты", () => {
    const sum = r.months.reduce((s, m) => s + m.result, 0);
    expect(r.months.at(-1)!.cumulative).toBeCloseTo(sum - DEFAULT_ASSUMPTIONS.capexKzt, 0);
  });

  it("постоянные расходы растут по ступеням: 1,1 → +4 % → 1,4 млн ₸", () => {
    expect(fixedForMonth(DEFAULT_ASSUMPTIONS, 1)).toBe(1_100_000);
    expect(fixedForMonth(DEFAULT_ASSUMPTIONS, 9)).toBeCloseTo(1_144_000, 0);
    expect(fixedForMonth(DEFAULT_ASSUMPTIONS, 13)).toBe(1_400_000);
  });

  it("наборы станков продаются с 16-го месяца", () => {
    expect(r.months[14]!.kits).toBe(0);
    expect(r.months[15]!.kits).toBe(2);
  });

  it("множитель продаж масштабирует план заказов", () => {
    const low = runPlan({ ...DEFAULT_ASSUMPTIONS, salesFactor: 0.5 });
    expect(low.months[23]!.orders).toBe(Math.round(BASE_ORDERS[23]! * 0.5));
  });
});

describe("чувствительность", () => {
  const rows = sensitivity();
  it("продажи на 30 % ниже плана: вложения не окупаются за 24 месяца", () => {
    expect(rows.find((x) => x.label.startsWith("Заказов на 30 % меньше"))!.paybackMonth).toBeNull();
  });
  it("рост продаж ускоряет окупаемость, падение маржи замедляет", () => {
    const base = rows[0]!.paybackMonth!;
    expect(rows.find((x) => x.label.startsWith("Заказов на 30 % больше"))!.paybackMonth!).toBeLessThan(base);
    expect(rows.find((x) => x.label.startsWith("Маржа"))!.paybackMonth!).toBeGreaterThan(base);
  });
});

describe("формат", () => {
  it("миллионы по-русски с минусом", () => {
    expect(mln(-1_545_000)).toBe("−1,5");
    expect(mln(12_000_000)).toBe("12,0");
    expect(mln(-20_000)).toBe("0,0");
  });
});
