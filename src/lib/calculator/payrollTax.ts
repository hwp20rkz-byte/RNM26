import type { PayrollComputed, PayrollTaxRates } from "./types";

/**
 * Ставки по умолчанию сверены с фактическим расчётом зарплаты председателя ОСИ
 * (оклад 500 000 ₸/мес) из реальной сметы ЖК «Коркем-1» на 2026-2027 гг.:
 * ОПВ 10%, ВОСМС 2%, ОСМС (работодатель) 3%, ОПВР 3,5%, СО 5% от (оклад-ОПВ)
 * воспроизводятся формулами ниже с точностью до тенге.
 *
 * Ставка СН и величина стандартного вычета по ИПН в разных режимах
 * налогообложения НКО могут отличаться — оставлены редактируемыми полями,
 * значения по умолчанию приблизительны и требуют сверки с бухгалтером/
 * действующей редакцией Налогового и Социального кодексов РК на расчётный год.
 */
export const DEFAULT_TAX_RATES: PayrollTaxRates = {
  opvRate: 0.1,
  vosmsRate: 0.02,
  osmsEmployerRate: 0.03,
  soRate: 0.05,
  snRate: 0.095,
  opvrRate: 0.035,
  ipnRate: 0.1,
  mrpValue: 3932, // МРП 2025 г. — уточните значение на текущий год перед утверждением сметы
  standardDeductionMrpMultiplier: 33, // ≈129 750 ₸ при МРП 3932, воспроизводит пример из сметы
};

export function computePayroll(
  gross: number,
  rates: PayrollTaxRates,
): PayrollComputed {
  const opv = round(gross * rates.opvRate);
  const vosms = round(gross * rates.vosmsRate);
  const standardDeduction = round(
    rates.mrpValue * rates.standardDeductionMrpMultiplier,
  );
  const ipnBase = Math.max(0, gross - opv - vosms - standardDeduction);
  const ipn = round(ipnBase * rates.ipnRate);

  const soBase = Math.max(0, gross - opv);
  const so = round(soBase * rates.soRate);
  const snBase = Math.max(0, gross - opv);
  const sn = Math.max(0, round(snBase * rates.snRate - so));
  const osmsEmployer = round(gross * rates.osmsEmployerRate);
  const opvr = round(gross * rates.opvrRate);

  const netPay = gross - opv - vosms - ipn;
  const totalCostToOsi = gross + osmsEmployer + so + sn + opvr;

  return { gross, opv, vosms, ipn, so, sn, osmsEmployer, opvr, netPay, totalCostToOsi };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
