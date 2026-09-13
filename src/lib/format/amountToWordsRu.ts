// ---------------------------------------------------------------------------
// Сумма прописью (русский) — для официальных финансовых документов
// (расчёт задолженности для нотариуса и т.п., где сумма обязательно
// дублируется словами). Тенге и тиын — несклоняемые заимствования, поэтому
// название валюты не изменяется по родам/падежам, а числительные при них
// стоят в мужском роде («один тенге», не «одна тенге»).
// ---------------------------------------------------------------------------

const ONES = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
const ONES_FEMININE: Record<number, string> = { 1: "одна", 2: "две" };
const TEENS = [
  "десять",
  "одиннадцать",
  "двенадцать",
  "тринадцать",
  "четырнадцать",
  "пятнадцать",
  "шестнадцать",
  "семнадцать",
  "восемнадцать",
  "девятнадцать",
];
const TENS = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
const HUNDREDS = ["", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот"];

interface GroupDef {
  value: number;
  feminine: boolean;
  forms: [string, string, string]; // 1 / 2-4 / 5-20,0
}

const GROUP_DEFS: GroupDef[] = [
  { value: 1_000_000_000, feminine: false, forms: ["миллиард", "миллиарда", "миллиардов"] },
  { value: 1_000_000, feminine: false, forms: ["миллион", "миллиона", "миллионов"] },
  { value: 1_000, feminine: true, forms: ["тысяча", "тысячи", "тысяч"] },
];

function pluralFormIndex(n: number): 0 | 1 | 2 {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return 2;
  const last = mod100 % 10;
  if (last === 1) return 0;
  if (last >= 2 && last <= 4) return 1;
  return 2;
}

function threeDigitsToWords(n: number, feminine: boolean): string[] {
  const words: string[] = [];
  const hundreds = Math.floor(n / 100);
  if (hundreds) words.push(HUNDREDS[hundreds]);
  const rem = n % 100;
  if (rem >= 10 && rem < 20) {
    words.push(TEENS[rem - 10]);
  } else {
    const tens = Math.floor(rem / 10);
    const ones = rem % 10;
    if (tens) words.push(TENS[tens]);
    if (ones) words.push(feminine && ONES_FEMININE[ones] ? ONES_FEMININE[ones] : ONES[ones]);
  }
  return words;
}

/** Целое неотрицательное число прописью (русский), напр. 1234 → "одна тысяча двести тридцать четыре" */
export function numberToWordsRu(n: number): string {
  const value = Math.max(0, Math.floor(n));
  if (value === 0) return "ноль";

  const parts: string[] = [];
  let remaining = value;
  for (const g of GROUP_DEFS) {
    const count = Math.floor(remaining / g.value);
    remaining %= g.value;
    if (count > 0) {
      parts.push(...threeDigitsToWords(count, g.feminine));
      parts.push(g.forms[pluralFormIndex(count)]);
    }
  }
  if (remaining > 0 || parts.length === 0) {
    parts.push(...threeDigitsToWords(remaining, false));
  }
  return parts.join(" ");
}

function capitalize(s: string): string {
  return s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Сумма в тенге прописью с тиынами цифрами, напр. 1234.5 → "Одна тысяча двести тридцать четыре тенге 50 тиын" */
export function amountToWordsKzt(amountKzt: number): string {
  const totalTiyn = Math.round(Math.max(0, amountKzt) * 100);
  const tenge = Math.floor(totalTiyn / 100);
  const tiyn = totalTiyn % 100;
  return `${capitalize(numberToWordsRu(tenge))} тенге ${String(tiyn).padStart(2, "0")} тиын`;
}
