import { describe, expect, it } from "vitest";
import { yearMonthDisplay } from "./exportToDocx";

describe("yearMonthDisplay", () => {
  it("год всегда равен месяцу × 12 — не два независимых округления", () => {
    // 306000,9 при независимом округлении даёт год=306001, мес=25500 —
    // 25500×12=306000 ≠ 306001. Проверяем, что теперь этого не происходит.
    const r = yearMonthDisplay(306000.9);
    expect(r.annualRounded).toBe(r.monthlyRounded * 12);
    expect(r.monthlyRounded).toBe(25500);
    expect(r.annualRounded).toBe(306000);
  });

  it("при точном делении на 12 год и месяц совпадают с исходной суммой", () => {
    const r = yearMonthDisplay(660000);
    expect(r.monthlyRounded).toBe(55000);
    expect(r.annualRounded).toBe(660000);
  });

  it("0 — оба значения 0", () => {
    const r = yearMonthDisplay(0);
    expect(r.monthlyRounded).toBe(0);
    expect(r.annualRounded).toBe(0);
  });
});
