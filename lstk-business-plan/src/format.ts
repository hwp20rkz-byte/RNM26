const intFmt = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const oneFmt = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });

/** 12 345 678 ₸ */
export const money = (v: number) => `${intFmt.format(Math.round(v))} ₸`;

/** Компактно: 12,3 млн ₸ / 1,2 млрд ₸ / 850 тыс. ₸ */
export function moneyShort(v: number): string {
  const a = Math.abs(v);
  const sign = v < 0 ? "−" : "";
  if (a >= 1e9) return `${sign}${oneFmt.format(a / 1e9)} млрд ₸`;
  if (a >= 1e6) return `${sign}${oneFmt.format(a / 1e6)} млн ₸`;
  if (a >= 1e3) return `${sign}${intFmt.format(a / 1e3)} тыс. ₸`;
  return `${sign}${intFmt.format(a)} ₸`;
}

/** Подпись оси: 120 млн */
export function axisShort(v: number): string {
  const a = Math.abs(v);
  const sign = v < 0 ? "−" : "";
  if (a >= 1e9) return `${sign}${oneFmt.format(a / 1e9)} млрд`;
  if (a >= 1e6) return `${sign}${intFmt.format(a / 1e6)} млн`;
  if (a >= 1e3) return `${sign}${intFmt.format(a / 1e3)} тыс.`;
  return `${sign}${intFmt.format(a)}`;
}

export const num = (v: number) => intFmt.format(v);
export const num1 = (v: number) => oneFmt.format(v);
export const percent = (v: number) => `${oneFmt.format(v * 100)}%`;

export function months(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} месяц`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} месяца`;
  return `${n} месяцев`;
}
