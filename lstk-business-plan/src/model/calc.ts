import type { HouseEconomics, HouseType, MonthRow, PlanInputs, PlanResult, Warning } from "./types";

const MONTHS_SHORT = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

export function monthLabel(inputs: PlanInputs, m: number): string {
  const idx = inputs.sales.startCalendarMonth - 1 + m;
  return `${MONTHS_SHORT[((idx % 12) + 12) % 12]} ${inputs.sales.startYear + Math.floor(idx / 12)}`;
}

const pct = (v: number) => v / 100;
const nonNeg = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0);

export function houseEconomics(inputs: PlanInputs, house: HouseType): HouseEconomics {
  const { frame, finance } = inputs;
  const area = nonNeg(house.area);
  const price = area * nonNeg(house.pricePerM2);
  const frameKg = area * nonNeg(frame.kgPerM2) * (1 + pct(nonNeg(frame.wastePct)));
  const frameCost = frameKg * nonNeg(frame.source === "own" ? frame.coilPricePerKg : frame.boughtPricePerKg);

  let materialCost = 0;
  let laborCost = 0;
  for (const item of inputs.costItems) {
    if (!item.appliesTo.includes(house.id)) continue;
    const cost = item.basis === "perM2" ? nonNeg(item.amount) * area : nonNeg(item.amount);
    if (item.kind === "labor") laborCost += cost;
    else materialCost += cost;
  }

  const base = frameCost + materialCost + laborCost;
  const contingency = base * pct(nonNeg(finance.contingencyPct));
  const commission = price * pct(nonNeg(finance.salesCommissionPct));
  const directCost = base + contingency;
  const margin = price - directCost - commission;
  return {
    id: house.id,
    name: house.name,
    price,
    frameCost,
    materialCost,
    laborCost,
    contingency,
    commission,
    directCost,
    margin,
    marginPct: price > 0 ? margin / price : 0,
    frameKg
  };
}

/** Нормированные доли типов домов в продажах (сумма = 1) */
export function normalizedShares(houses: HouseType[]): number[] {
  const shares = houses.map((h) => nonNeg(h.sharePct));
  const sum = shares.reduce((a, b) => a + b, 0);
  if (houses.length === 0) return [];
  return sum > 0 ? shares.map((s) => s / sum) : houses.map(() => 1 / houses.length);
}

/** Ожидаемое число договоров в месяце m (может быть дробным — это среднее) */
export function contractsInMonth(inputs: PlanInputs, m: number): number {
  const s = inputs.sales;
  if (m < s.firstSaleMonth) return 0;
  const k = m - s.firstSaleMonth;
  const ramp = Math.max(0, s.rampMonths);
  const progress = ramp === 0 ? 1 : Math.min(1, k / ramp);
  const base = nonNeg(s.startPerMonth) + (nonNeg(s.targetPerMonth) - nonNeg(s.startPerMonth)) * progress;
  const calIdx = (((s.startCalendarMonth - 1 + m) % 12) + 12) % 12;
  const season = s.seasonality[calIdx] ?? 1;
  return Math.max(0, base * nonNeg(season));
}

function npvAt(flows: number[], monthlyRate: number): number {
  let v = 0;
  for (let m = 0; m < flows.length; m++) v += flows[m] / Math.pow(1 + monthlyRate, m);
  return v;
}

/** Годовая IRR по месячным потокам; null, если у потока нет смены знака или корень не найден */
export function annualIrr(flows: number[]): number | null {
  if (!flows.some((f) => f < 0) || !flows.some((f) => f > 0)) return null;
  let lo = -0.99;
  let hi = 1;
  let fLo = npvAt(flows, lo);
  const fHi = npvAt(flows, hi);
  if (Math.sign(fLo) === Math.sign(fHi)) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npvAt(flows, mid);
    if (Math.abs(fMid) < 1e-6) {
      lo = hi = mid;
      break;
    }
    if (Math.sign(fMid) === Math.sign(fLo)) {
      lo = mid;
      fLo = fMid;
    } else hi = mid;
  }
  return Math.pow(1 + (lo + hi) / 2, 12) - 1;
}

export function calculate(inputs: PlanInputs): PlanResult {
  const { finance, payments, frame } = inputs;
  const H = Math.max(1, Math.round(finance.horizonMonths));
  const warnings: Warning[] = [];

  const econ = inputs.houses.map((h) => houseEconomics(inputs, h));
  const shares = normalizedShares(inputs.houses);

  const advance = pct(Math.min(100, nonNeg(payments.advancePct)));
  const mid = pct(Math.min(100 - advance * 100, nonNeg(payments.midPct)));
  const final = 1 - advance - mid;
  if (nonNeg(payments.advancePct) + nonNeg(payments.midPct) > 100) {
    warnings.push({ level: "error", text: "Аванс и промежуточный платёж вместе больше 100% — промежуточный урезан до остатка." });
  }
  const upfront = pct(Math.min(100, nonNeg(payments.materialsUpfrontPct)));
  const contPct = pct(nonNeg(finance.contingencyPct));

  const zeros = () => new Array<number>(H).fill(0);
  const contracts = zeros();
  const frameKg = zeros();
  const revenue = zeros();
  const directCost = zeros();
  const commission = zeros();
  const cashIn = zeros();
  const cashOutDirect = zeros();
  const capex = zeros();
  const depreciation = zeros();

  for (let s = 0; s < H; s++) {
    const n = contractsInMonth(inputs, s);
    contracts[s] = n;
    if (n === 0) continue;
    inputs.houses.forEach((house, i) => {
      const q = n * shares[i];
      if (q === 0) return;
      const e = econ[i];
      const d = Math.max(1, Math.round(house.durationMonths));
      frameKg[s] += e.frameKg * q;
      commission[s] += e.commission * q;

      const matCash = (e.frameCost + e.materialCost) * (1 + contPct) * q;
      const laborCash = e.laborCost * (1 + contPct) * q;
      cashOutDirect[s] += matCash * upfront;
      const spread = (matCash * (1 - upfront) + laborCash) / d;

      const midMonth = s + Math.floor((d - 1) / 2);
      const endMonth = s + d - 1;
      const price = e.price * q;
      cashIn[s] += price * advance;
      if (midMonth < H) cashIn[midMonth] += price * mid;
      if (endMonth < H) cashIn[endMonth] += price * final;

      for (let k = 0; k < d && s + k < H; k++) {
        revenue[s + k] += price / d;
        directCost[s + k] += (e.directCost * q) / d;
        cashOutDirect[s + k] += spread;
      }
    });
  }

  for (const item of inputs.capex) {
    if (item.ownLineOnly && frame.source === "buy") continue;
    const m = Math.max(0, Math.round(item.month));
    if (m >= H) continue;
    capex[m] += nonNeg(item.amount);
    const life = Math.max(1, Math.round(item.lifeMonths));
    for (let k = 0; k < life && m + k < H; k++) depreciation[m + k] += nonNeg(item.amount) / life;
  }

  const opexMonthly = inputs.opex.reduce((a, o) => a + nonNeg(o.amount), 0);

  // Кредит: выдаётся в месяце 0; в льготный период — только проценты, затем аннуитет.
  const loan = nonNeg(finance.loanAmount);
  const r = pct(nonNeg(finance.loanRatePct)) / 12;
  const term = Math.max(1, Math.round(finance.loanTermMonths));
  const grace = Math.max(0, Math.round(finance.loanGraceMonths));
  const amortMonths = Math.max(1, term - grace);
  if (loan > 0 && grace >= term) {
    warnings.push({ level: "warning", text: "Льготный период не короче срока кредита — тело гасится одним платежом в последнем месяце." });
  }
  const annuity = r === 0 ? loan / amortMonths : (loan * r) / (1 - Math.pow(1 + r, -amortMonths));

  const months: MonthRow[] = [];
  let balance = loan;
  let cash = 0;
  let cumPbt = 0;
  let cumTax = 0;
  let cumPbtUnlev = 0;
  let cumTaxUnlev = 0;

  for (let m = 0; m < H; m++) {
    const interest = m === 0 ? 0 : balance * r;
    let principal = 0;
    if (m > grace && m <= term) principal = Math.min(balance, Math.max(0, annuity - interest));
    if (m === term) principal = balance;
    balance -= principal;

    const gross = revenue[m] - directCost[m] - commission[m];
    const ebitda = gross - opexMonthly;

    let tax: number;
    let taxUnlev: number;
    if (finance.taxRegime === "simplified") {
      // Упрощённая декларация: налог от полученного дохода (кассовый метод)
      tax = taxUnlev = cashIn[m] * pct(nonNeg(finance.simplifiedRatePct));
    } else {
      const rate = pct(nonNeg(finance.citRatePct));
      cumPbt += ebitda - depreciation[m] - interest;
      tax = Math.max(0, rate * cumPbt - cumTax);
      cumTax += tax;
      cumPbtUnlev += ebitda - depreciation[m];
      taxUnlev = Math.max(0, rate * cumPbtUnlev - cumTaxUnlev);
      cumTaxUnlev += taxUnlev;
    }

    const netProfit = ebitda - depreciation[m] - interest - tax;
    const operatingCf = cashIn[m] - cashOutDirect[m] - commission[m] - opexMonthly - tax - interest;
    const financingCf = (m === 0 ? nonNeg(finance.equity) + loan : 0) - principal;
    cash += operatingCf - capex[m] + financingCf;
    const projectCf = cashIn[m] - cashOutDirect[m] - commission[m] - opexMonthly - taxUnlev - capex[m];

    months.push({
      month: m,
      label: monthLabel(inputs, m),
      contracts: contracts[m],
      frameKg: frameKg[m],
      revenue: revenue[m],
      directCost: directCost[m],
      commission: commission[m],
      grossProfit: gross,
      opex: opexMonthly,
      ebitda,
      depreciation: depreciation[m],
      interest,
      tax,
      netProfit,
      cashIn: cashIn[m],
      cashOutDirect: cashOutDirect[m],
      operatingCf,
      capex: capex[m],
      financingCf,
      projectCf,
      cashEnd: cash,
      loanBalance: balance
    });
  }

  const projectFlows = months.map((x) => x.projectCf);
  const monthlyDiscount = Math.pow(1 + pct(nonNeg(finance.discountRatePct)), 1 / 12) - 1;
  const npv = npvAt(projectFlows, monthlyDiscount);
  const irr = annualIrr(projectFlows);

  let cum = 0;
  let minCum = 0;
  let paybackMonth: number | null = null;
  let wasNegative = false;
  for (const x of months) {
    cum += x.projectCf;
    minCum = Math.min(minCum, cum);
    if (cum < 0) {
      wasNegative = true;
      paybackMonth = null;
    } else if (paybackMonth === null) paybackMonth = wasNegative ? x.month : 0;
  }

  let minCash = Infinity;
  let minCashMonth = 0;
  for (const x of months) {
    if (x.cashEnd < minCash) {
      minCash = x.cashEnd;
      minCashMonth = x.month;
    }
  }

  const avgContribution = econ.reduce((a, e, i) => a + shares[i] * e.margin, 0);
  const breakEvenPerMonth = avgContribution > 0 ? opexMonthly / avgContribution : null;

  if (minCash < 0) {
    warnings.push({
      level: "error",
      text: `Кассовый разрыв (${monthLabel(inputs, minCashMonth)}): не хватает ${Math.round(-minCash).toLocaleString("ru-RU")} ₸. Увеличьте собственный капитал или кредит, поднимите аванс или сократите закупку материалов наперёд.`
    });
  }
  econ.forEach((e) => {
    if (e.price <= 0) return;
    if (e.margin < 0) warnings.push({ level: "error", text: `«${e.name}» продаётся в убыток: маржа ${Math.round(e.marginPct * 100)}%.` });
    else if (e.marginPct < 0.1) warnings.push({ level: "warning", text: `«${e.name}»: маржа ${Math.round(e.marginPct * 100)}% — меньше 10%, любой рост цен на материалы съест прибыль.` });
  });
  if (frame.source === "own") {
    const cap = nonNeg(frame.lineCapacityKgPerMonth);
    const peak = Math.max(0, ...frameKg);
    if (cap > 0 && peak > cap) {
      const over = frameKg.filter((kg) => kg > cap).length;
      warnings.push({
        level: "warning",
        text: `Линии не хватает мощности в ${over} мес.: пик ${Math.round(peak).toLocaleString("ru-RU")} кг при мощности ${cap.toLocaleString("ru-RU")} кг/мес. Нужна вторая смена или докупка каркаса.`
      });
    }
  }
  if (breakEvenPerMonth === null) warnings.push({ level: "error", text: "Средний дом не покрывает прямые затраты — безубыточность недостижима." });
  if (paybackMonth === null) warnings.push({ level: "warning", text: "Проект не окупается в пределах горизонта планирования." });

  const sum = (k: keyof MonthRow) => months.reduce((a, x) => a + (x[k] as number), 0);
  return {
    houses: econ,
    months,
    totals: {
      contracts: sum("contracts"),
      revenue: sum("revenue"),
      ebitda: sum("ebitda"),
      netProfit: sum("netProfit"),
      capex: sum("capex")
    },
    npv,
    irr,
    paybackMonth,
    peakFunding: -minCum,
    minCash,
    minCashMonth,
    breakEvenPerMonth,
    avgContribution,
    warnings
  };
}

export interface SensitivityRow {
  name: string;
  lowLabel: string;
  highLabel: string;
  low: number;
  high: number;
}

/** Чувствительность NPV к ключевым допущениям */
export function sensitivity(inputs: PlanInputs): { base: number; rows: SensitivityRow[] } {
  const base = calculate(inputs).npv;
  const variants: { name: string; delta: number; apply: (p: PlanInputs, f: number) => PlanInputs }[] = [
    {
      name: "Цена продажи",
      delta: 0.1,
      apply: (p, f) => ({ ...p, houses: p.houses.map((h) => ({ ...h, pricePerM2: h.pricePerM2 * f })) })
    },
    {
      name: "Объём продаж",
      delta: 0.2,
      apply: (p, f) => ({ ...p, sales: { ...p.sales, startPerMonth: p.sales.startPerMonth * f, targetPerMonth: p.sales.targetPerMonth * f } })
    },
    {
      name: "Цена металла",
      delta: 0.2,
      apply: (p, f) => ({ ...p, frame: { ...p.frame, coilPricePerKg: p.frame.coilPricePerKg * f, boughtPricePerKg: p.frame.boughtPricePerKg * f } })
    },
    {
      name: "Прочие материалы",
      delta: 0.1,
      apply: (p, f) => ({ ...p, costItems: p.costItems.map((c) => (c.kind === "material" ? { ...c, amount: c.amount * f } : c)) })
    },
    {
      name: "Стоимость работ",
      delta: 0.1,
      apply: (p, f) => ({ ...p, costItems: p.costItems.map((c) => (c.kind === "labor" ? { ...c, amount: c.amount * f } : c)) })
    },
    {
      name: "Постоянные расходы",
      delta: 0.2,
      apply: (p, f) => ({ ...p, opex: p.opex.map((o) => ({ ...o, amount: o.amount * f })) })
    }
  ];
  const rows = variants.map((v) => {
    const pctLabel = `${Math.round(v.delta * 100)}%`;
    return {
      name: v.name,
      lowLabel: `−${pctLabel}`,
      highLabel: `+${pctLabel}`,
      low: calculate(v.apply(inputs, 1 - v.delta)).npv,
      high: calculate(v.apply(inputs, 1 + v.delta)).npv
    };
  });
  rows.sort((a, b) => Math.abs(b.high - b.low) - Math.abs(a.high - a.low));
  return { base, rows };
}
