import { describe, expect, it } from "vitest";
import { LOGISTICS, SERVICE_CATALOG } from "@/lib/catalog";
import {
  computeLandedCost,
  convert,
  DEFAULT_PRICING,
  priceServices,
  ratesFromCbr,
  roundToStep,
  SNAPSHOT_RATES,
  toMulti,
} from "@/lib/currencyEngine";
import { completedState, DEMO_ORDER, DEMO_QUOTES } from "@/lib/mockAgentWorkflow";

const R = SNAPSHOT_RATES.perUsd;

describe("currency engine", () => {
  it("converts through USD and back", () => {
    const kzt = convert(1000, "CNY", "KZT", R);
    expect(kzt).toBeCloseTo((1000 / 7.12) * 512, 6);
    expect(convert(kzt, "KZT", "CNY", R)).toBeCloseTo(1000, 6);
  });

  it("parses CBR payload with nominal 100 for KZT", () => {
    const snap = ratesFromCbr({
      Date: "2026-11-27T11:30:00+03:00",
      Valute: { USD: { Nominal: 1, Value: 80 }, CNY: { Nominal: 1, Value: 11.2 }, KZT: { Nominal: 100, Value: 15.6 } },
    });
    expect(snap.perUsd.RUB).toBe(80);
    expect(snap.perUsd.CNY).toBeCloseTo(80 / 11.2, 3);
    expect(snap.perUsd.KZT).toBeCloseTo(80 / 0.156, 1);
    expect(snap.source).toBe("cbr-live");
  });

  it("applies fx spread to every currency except the source and rounds commercially", () => {
    const m = toMulti(100, "USD", R, { fxSpread: 0.02, commercial: true });
    expect(m.USD).toBe(100);
    expect(m.RUB).toBe(roundToStep(100 * 81.5 * 1.02, 100));
    expect(m.KZT % 500).toBe(0);
  });

  it("prices services with category, rush and margin", () => {
    const q = priceServices({
      services: ["basic_search", "logistics_customs"],
      catalog: SERVICE_CATALOG,
      category: "machinery",
      urgency: "rush",
      goodsValueUsd: 90_000,
      rates: R,
      pricing: DEFAULT_PRICING,
    });
    const basic = q.lines[0]!;
    expect(basic.costUsd).toBeCloseTo(180 * 1.5 * 1.35, 2);
    expect(basic.priceUsd).toBe(roundToStep(basic.costUsd * 1.3, 5));
    // логистика: 1,5% от 90 000 = 1 350 > базы 300, без коэффициента категории
    expect(q.lines[1]!.costUsd).toBeCloseTo(1350 * 1.35, 2);
    expect(q.totalUsd).toBe(q.lines.reduce((s, l) => s + l.priceUsd, 0));
  });

  it("computes landed cost with VAT on customs value plus duty", () => {
    const terms = DEMO_QUOTES[0]!.final!;
    const r = computeLandedCost({ terms, quantity: 3, profile: LOGISTICS["KZ-ALA"], dutyRate: 0.05, agencyCommission: 0.03, rates: R, targetUnitUsd: 32_000 });
    const goods = (200_500 * 3) / 7.12;
    const freight = 2 * 4600;
    const customsValue = (goods + freight) * 1.003;
    const vat = customsValue * 1.05 * 0.16;
    expect(r.lines.find((l) => l.key === "vat")!.usd).toBeCloseTo(vat, 0);
    expect(r.perUnitUsd).toBeCloseTo(r.totalUsd / 3, 1);
    expect(r.total.KZT).toBeCloseTo(r.totalUsd * 512, -1);
  });
});

describe("mock workflow", () => {
  it("runs all four agents to a ready proposal", async () => {
    const s = await completedState(DEMO_ORDER, R);
    expect(s.stage).toBe("proposal_ready");
    expect(Object.values(s.agents).every((a) => a.status === "done")).toBe(true);
    expect(s.suppliers.filter((x) => !x.filteredOut)).toHaveLength(6);
    expect(s.landed["KZ-ALA"]?.perUnitUsd).toBeGreaterThan(30_000);
    expect(s.messages.some((m) => m.draft)).toBe(false);
  });
});
