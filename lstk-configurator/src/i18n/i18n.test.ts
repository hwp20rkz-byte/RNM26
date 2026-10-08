import { describe, expect, it } from "vitest";
import { CATEGORIES, PRODUCTS, productInput } from "@/domain/catalog/products";
import { FINISHES } from "@/domain/finishes/catalog";
import { VEHICLES } from "@/domain/logistics/delivery";
import { ROOM_RULES } from "@/domain/mep/mep";
import { analyze, DEFAULT_SETTINGS } from "@/domain/planner/analyze";
import { estLabel } from "@/features/documents/estimateLabels";
import { dictionaries, translate } from "./index";
import { ru } from "./ru";

const prices = { steelPerKg: 850, scrapPct: 3, fastenerEach: 15, boltEach: 400 };

describe("dictionaries", () => {
  it("every language has every key, non-empty, with the same {placeholders}", () => {
    const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const [lang, d] of Object.entries(dictionaries)) {
      for (const k of Object.keys(ru) as (keyof typeof ru)[]) {
        expect(d[k], `${lang}:${k}`).toBeTruthy();
        expect(ph(d[k]), `${lang}:${k}`).toEqual(ph(ru[k]));
      }
    }
  });
  it("Chinese and Kazakh are really translated (not Russian copies)", () => {
    const same = (Object.keys(ru) as (keyof typeof ru)[]).filter((k) => dictionaries.zh[k] === ru[k] && /[а-яё]/i.test(ru[k]));
    expect(same).toEqual([]);
    const kkSame = (Object.keys(ru) as (keyof typeof ru)[]).filter((k) => dictionaries.kk[k] === ru[k] && ru[k].length > 12);
    // Construction terms (ферма, профиль, монтаж…) are shared by Russian and Kazakh
    expect(kkSame.length).toBeLessThan(20);
  });
  it("interpolates", () => {
    expect(translate("ru", "shape.levelN", { n: 2 })).toBe("2 этаж");
    expect(translate("zh", "shape.levelN", { n: 2 })).toBe("第 2 层");
  });
  it("dynamic keys exist for every catalogue entry and cost line", () => {
    const keys = new Set(Object.keys(ru));
    const need = [
      ...PRODUCTS.map((p) => `product.${p.id}`),
      ...CATEGORIES.map((c) => `category.${c}`),
      ...FINISHES.map((f) => `finish.${f.id}`),
      ...VEHICLES.map((v) => `vehicle.${v.id}`),
      ...Object.keys(ROOM_RULES).map((r) => `room.${r}`),
    ];
    for (const id of PRODUCTS.map((p) => p.id)) {
      const a = analyze(productInput(id), DEFAULT_SETTINGS, prices);
      need.push(...a.estimate.sections.map((s) => `estsec.${s.id}`), ...a.estimate.sections.flatMap((s) => s.lines.map((l) => `eu.${l.unit}`)));
      for (const l of a.estimate.sections.flatMap((s) => s.lines)) {
        const label = estLabel(l.id, (k) => (keys.has(k) ? "ok" : `MISSING:${k}`));
        if (label.includes("MISSING:")) need.push(label.replace(/.*MISSING:/, ""));
      }
      need.push(...a.building.nodes.flatMap((n) => [`node.${n.type}`, `nodeHint.${n.type}`]), ...a.design.checks.map((c) => c.element), ...a.hardware.map((h) => `cost.hw.${h.kind}`));
      need.push(...a.cargo.map((c) => `cargo.${c.key}`), ...a.finishes.map((f) => `takeoff.${f.zone}`));
      need.push(...a.thermal.assemblies.flatMap((x) => [`element.${x.element}`, ...x.layers.map((l) => `layer.${l.key}`)]));
      need.push(...a.bom.cutList.map((c) => `role.${c.role}`));
    }
    expect([...new Set(need)].filter((k) => !keys.has(k))).toEqual([]);
  });
});
