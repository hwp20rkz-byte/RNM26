const n0 = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const n1 = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });
const n2 = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });

export const int = (v: number) => n0.format(v);
export const one = (v: number) => n1.format(v);
export const two = (v: number) => n2.format(v);
export const money = (v: number) => `${n0.format(Math.round(v))} ₸`;
export const kn = (newtons: number) => `${n2.format(newtons / 1000)} кН`;

export function download(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
