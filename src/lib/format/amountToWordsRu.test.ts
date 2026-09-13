import { describe, expect, it } from "vitest";
import { amountToWordsKzt, numberToWordsRu } from "./amountToWordsRu";

describe("numberToWordsRu", () => {
  it("ноль", () => {
    expect(numberToWordsRu(0)).toBe("ноль");
  });

  it("однозначные и двузначные числа", () => {
    expect(numberToWordsRu(1)).toBe("один");
    expect(numberToWordsRu(5)).toBe("пять");
    expect(numberToWordsRu(11)).toBe("одиннадцать");
    expect(numberToWordsRu(21)).toBe("двадцать один");
  });

  it("сотни", () => {
    expect(numberToWordsRu(100)).toBe("сто");
    expect(numberToWordsRu(101)).toBe("сто один");
    expect(numberToWordsRu(999)).toBe("девятьсот девяносто девять");
  });

  it("тысячи — женский род и правильное склонение", () => {
    expect(numberToWordsRu(1000)).toBe("одна тысяча");
    expect(numberToWordsRu(2000)).toBe("две тысячи");
    expect(numberToWordsRu(5000)).toBe("пять тысяч");
    expect(numberToWordsRu(11000)).toBe("одиннадцать тысяч");
    expect(numberToWordsRu(21000)).toBe("двадцать одна тысяча");
    expect(numberToWordsRu(234567)).toBe("двести тридцать четыре тысячи пятьсот шестьдесят семь");
  });

  it("миллионы — мужской род", () => {
    expect(numberToWordsRu(1_000_000)).toBe("один миллион");
    expect(numberToWordsRu(2_000_000)).toBe("два миллиона");
    expect(numberToWordsRu(5_000_000)).toBe("пять миллионов");
  });
});

describe("amountToWordsKzt", () => {
  it("целая сумма — 00 тиын", () => {
    expect(amountToWordsKzt(1000)).toBe("Одна тысяча тенге 00 тиын");
  });

  it("сумма с тиынами", () => {
    expect(amountToWordsKzt(1234.5)).toBe("Одна тысяча двести тридцать четыре тенге 50 тиын");
  });

  it("ноль тенге", () => {
    expect(amountToWordsKzt(0)).toBe("Ноль тенге 00 тиын");
  });

  it("крупная сумма (миллион+тысячи+единицы)", () => {
    expect(amountToWordsKzt(1_234_567.89)).toBe(
      "Один миллион двести тридцать четыре тысячи пятьсот шестьдесят семь тенге 89 тиын",
    );
  });
});
