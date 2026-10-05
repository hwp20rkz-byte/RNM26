import { describe, expect, it } from "vitest";
import { annualIrr, calculate, contractsInMonth, houseEconomics, monthLabel, normalizedShares, sensitivity } from "./calc";
import { DEFAULT_INPUTS } from "./defaults";
import type { PlanInputs } from "./types";

const round = (xs: number[]) => xs.map((x) => Math.round(x));

const clone = (): PlanInputs => structuredClone(DEFAULT_INPUTS);

/** Один тип дома, одна продажа, без налогов/накладных — чтобы проверять потоки руками */
function single(): PlanInputs {
  const p = clone();
  p.houses = [{ id: "a", name: "A", area: 100, pricePerM2: 200_000, durationMonths: 4, sharePct: 100 }];
  p.costItems = [
    { id: "m", name: "M", kind: "material", basis: "perM2", amount: 50_000, appliesTo: ["a"] },
    { id: "l", name: "L", kind: "labor", basis: "perHouse", amount: 4_000_000, appliesTo: ["a"] }
  ];
  p.frame = { ...p.frame, source: "buy", kgPerM2: 10, wastePct: 0, boughtPricePerKg: 1_000 };
  p.capex = [];
  p.opex = [];
  p.sales = { ...p.sales, firstSaleMonth: 0, startPerMonth: 1, targetPerMonth: 1, rampMonths: 0, seasonality: new Array(12).fill(1) };
  p.payments = { advancePct: 30, midPct: 40, materialsUpfrontPct: 100 };
  p.finance = {
    ...p.finance,
    horizonMonths: 1,
    equity: 0,
    loanAmount: 0,
    simplifiedRatePct: 0,
    salesCommissionPct: 0,
    contingencyPct: 0
  };
  return p;
}

describe("houseEconomics", () => {
  it("складывает каркас, материалы и работы по площади и на дом", () => {
    const p = single();
    const e = houseEconomics(p, p.houses[0]);
    expect(e.price).toBe(20_000_000);
    expect(e.frameKg).toBe(1_000);
    expect(e.frameCost).toBe(1_000_000);
    expect(e.materialCost).toBe(5_000_000);
    expect(e.laborCost).toBe(4_000_000);
    expect(e.margin).toBe(10_000_000);
    expect(e.marginPct).toBeCloseTo(0.5);
  });

  it("статья не применяется к типам, которых нет в appliesTo", () => {
    const p = single();
    p.costItems[0].appliesTo = [];
    expect(houseEconomics(p, p.houses[0]).materialCost).toBe(0);
  });

  it("своя линия считает каркас по цене рулона", () => {
    const p = single();
    p.frame.source = "own";
    p.frame.coilPricePerKg = 600;
    expect(houseEconomics(p, p.houses[0]).frameCost).toBe(600_000);
  });
});

describe("продажи", () => {
  it("нормирует доли, при нулевой сумме — поровну", () => {
    const h = clone().houses;
    expect(normalizedShares(h).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(normalizedShares(h.map((x) => ({ ...x, sharePct: 0 })))).toEqual([1 / 3, 1 / 3, 1 / 3]);
  });

  it("выходит на план линейно и учитывает сезонность", () => {
    const p = clone();
    p.sales = { ...p.sales, firstSaleMonth: 2, startPerMonth: 1, targetPerMonth: 5, rampMonths: 4, seasonality: new Array(12).fill(1) };
    expect(contractsInMonth(p, 1)).toBe(0);
    expect(contractsInMonth(p, 2)).toBe(1);
    expect(contractsInMonth(p, 4)).toBe(3);
    expect(contractsInMonth(p, 6)).toBe(5);
    expect(contractsInMonth(p, 20)).toBe(5);
    p.sales.seasonality[(p.sales.startCalendarMonth - 1 + 6) % 12] = 0.5;
    expect(contractsInMonth(p, 6)).toBe(2.5);
  });

  it("подписывает месяцы календарём от старта", () => {
    const p = clone();
    p.sales.startCalendarMonth = 11;
    p.sales.startYear = 2026;
    expect(monthLabel(p, 0)).toBe("ноя 2026");
    expect(monthLabel(p, 2)).toBe("янв 2027");
  });
});

describe("calculate — один дом", () => {
  it("выручка признаётся по ходу стройки, деньги — по графику платежей", () => {
    const p = single();
    p.sales.targetPerMonth = p.sales.startPerMonth = 1;
    p.finance.horizonMonths = 6;
    // одна продажа в месяце 0
    p.sales.seasonality = new Array(12).fill(0);
    p.sales.seasonality[p.sales.startCalendarMonth - 1] = 1;
    const r = calculate(p);
    expect(r.totals.contracts).toBe(1);
    expect(round(r.months.slice(0, 4).map((x) => x.revenue))).toEqual([5e6, 5e6, 5e6, 5e6]);
    expect(r.months[4].revenue).toBe(0);
    // аванс 30% в 0, 40% в середине (мес. 1 при сроке 4), 30% при сдаче (мес. 3)
    expect(round(r.months.map((x) => x.cashIn))).toEqual([6e6, 8e6, 0, 6e6, 0, 0]);
    // материалы (каркас 1 млн + 5 млн) сразу, работы 4 млн — равномерно
    expect(round(r.months.slice(0, 4).map((x) => x.cashOutDirect))).toEqual([7e6, 1e6, 1e6, 1e6]);
    expect(r.totals.revenue).toBeCloseTo(20e6, 0);
    expect(r.totals.netProfit).toBeCloseTo(10e6, 0);
    expect(r.months[5].cashEnd).toBeCloseTo(10e6, 0);
  });

  it("стройка, выходящая за горизонт, признаётся частично", () => {
    const p = single();
    p.finance.horizonMonths = 2;
    p.sales.seasonality = new Array(12).fill(0);
    p.sales.seasonality[p.sales.startCalendarMonth - 1] = 1;
    const r = calculate(p);
    expect(r.totals.revenue).toBeCloseTo(10e6, 0);
    expect(round(r.months.map((x) => x.cashIn))).toEqual([6e6, 8e6]);
  });
});

describe("calculate — финансирование и налоги", () => {
  it("кредит гасится полностью к концу срока", () => {
    const p = clone();
    p.finance.horizonMonths = 48;
    const r = calculate(p);
    expect(r.months[p.finance.loanTermMonths].loanBalance).toBeCloseTo(0, 6);
    expect(r.months[p.finance.loanGraceMonths].loanBalance).toBe(p.finance.loanAmount);
    const repaid = r.months.reduce((a, x) => a + x.financingCf, 0);
    expect(repaid).toBeCloseTo(p.finance.equity, 0);
  });

  it("баланс денег = сумма всех потоков", () => {
    const r = calculate(clone());
    const total = r.months.reduce((a, x) => a + x.operatingCf - x.capex + x.financingCf, 0);
    expect(r.months.at(-1)!.cashEnd).toBeCloseTo(total, 0);
  });

  it("ОУР: налог не начисляется, пока накопленный убыток не перекрыт", () => {
    const p = clone();
    p.finance.taxRegime = "general";
    const r = calculate(p);
    let cum = 0;
    for (const x of r.months) {
      cum += x.ebitda - x.depreciation - x.interest;
      if (cum <= 0) expect(x.tax).toBe(0);
    }
    const paid = r.months.reduce((a, x) => a + x.tax, 0);
    expect(paid).toBeCloseTo(Math.max(0, cum) * 0.2, 0);
  });

  it("покупной каркас исключает капзатраты на линию", () => {
    const own = calculate(clone());
    const p = clone();
    p.frame.source = "buy";
    const buy = calculate(p);
    expect(own.totals.capex - buy.totals.capex).toBe(53_000_000);
  });
});

describe("показатели", () => {
  it("IRR: известный поток −100, +110 через 12 мес. ≈ 10% годовых", () => {
    const flows = new Array(13).fill(0);
    flows[0] = -100;
    flows[12] = 110;
    expect(annualIrr(flows)).toBeCloseTo(0.1, 4);
    expect(annualIrr([1, 2, 3])).toBeNull();
  });

  it("предупреждает о кассовом разрыве без финансирования", () => {
    const p = clone();
    p.finance.equity = 0;
    p.finance.loanAmount = 0;
    const r = calculate(p);
    expect(r.minCash).toBeLessThan(0);
    expect(r.warnings.some((w) => w.text.startsWith("Кассовый разрыв"))).toBe(true);
  });

  it("предупреждает о нехватке мощности линии", () => {
    const p = clone();
    p.frame.lineCapacityKgPerMonth = 100;
    expect(calculate(p).warnings.some((w) => w.text.includes("мощности"))).toBe(true);
  });

  it("чувствительность: рост цены продажи увеличивает NPV", () => {
    const s = sensitivity(clone());
    const price = s.rows.find((r) => r.name === "Цена продажи")!;
    expect(price.high).toBeGreaterThan(s.base);
    expect(price.low).toBeLessThan(s.base);
    const metal = s.rows.find((r) => r.name === "Цена металла")!;
    expect(metal.high).toBeLessThan(metal.low);
  });

  it("значения по умолчанию дают работающую модель", () => {
    const r = calculate(clone());
    expect(r.totals.revenue).toBeGreaterThan(0);
    expect(r.breakEvenPerMonth).not.toBeNull();
    expect(r.houses.every((h) => h.margin > 0)).toBe(true);
  });
});
