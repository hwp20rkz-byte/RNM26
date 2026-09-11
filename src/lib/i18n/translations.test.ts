import { describe, expect, it } from "vitest";
import { TRANSLATIONS, type TranslationKey } from "./translations";

describe("TRANSLATIONS", () => {
  const ruKeys = Object.keys(TRANSLATIONS.ru) as TranslationKey[];

  it("kz и en содержат ровно те же ключи, что и ru — ни одна строка не забыта", () => {
    expect(Object.keys(TRANSLATIONS.kz).sort()).toEqual([...ruKeys].sort());
    expect(Object.keys(TRANSLATIONS.en).sort()).toEqual([...ruKeys].sort());
  });

  it("ни одно значение ни в одном языке не пустое", () => {
    for (const locale of ["ru", "kz", "en"] as const) {
      for (const key of ruKeys) {
        expect(TRANSLATIONS[locale][key].trim().length).toBeGreaterThan(0);
      }
    }
  });
});
