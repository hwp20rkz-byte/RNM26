/**
 * Number formatting follows the interface language. The locale is a module
 * setting updated by the shell on every render (setNumberLocale), so the plain
 * helpers below stay usable outside React (CSV, print).
 */
let locale = "ru-RU";
let n0 = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
let n1 = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
let n2 = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });

export function setNumberLocale(l: string): void {
  if (l === locale) return;
  locale = l;
  n0 = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  n1 = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  n2 = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
}

export const int = (v: number) => n0.format(v);
export const one = (v: number) => n1.format(v);
export const two = (v: number) => n2.format(v);
export const money = (v: number) => `${n0.format(Math.round(v))} ₸`;
/** Compact money: 18,1 млн ₸ */
export const mln = (v: number) => `${n1.format(v / 1e6)}`;
export const kn = (newtons: number) => `${n2.format(newtons / 1000)} кН`;

export function download(filename: string, content: string | Blob, type: string): void {
  const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
