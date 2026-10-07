"use client";

import { CATEGORIES, PRODUCTS } from "@/domain/catalog/products";
import { useT } from "@/i18n";
import { useConfigurator } from "@/store/configurator";
import { int, one } from "../configurator/format";
import { Glyph } from "./Glyph";

export function CatalogPanel() {
  const t = useT();
  const { building, applyProduct, setTab } = useConfigurator();
  return (
    <div className="flex flex-col gap-4">
      {CATEGORIES.map((c) => (
        <section key={c} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-mute">{t.dyn(`category.${c}`)}</h2>
          <div className="grid grid-cols-2 gap-2">
            {PRODUCTS.filter((p) => p.category === c).map((p) => {
              const input = p.input();
              const active = building.productId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    applyProduct(p.id);
                    setTab("shape");
                  }}
                  aria-pressed={active}
                  className={`flex min-h-11 flex-col gap-1 rounded-xl border p-3 text-left transition-colors ${active ? "border-primary bg-primary-soft" : "border-line bg-surface hover:border-primary"}`}
                >
                  <Glyph input={input} className="h-16 w-full text-primary" />
                  <span className="text-sm font-semibold">{t.dyn(`product.${p.id}`)}</span>
                  <span className="text-xs tabular-nums text-ink-mute">
                    {one(input.length / 1000)} × {one(input.width / 1000)} {t("unit.m")} · {int((input.length * input.width) / 1e6)} {t("unit.m2")}
                    {input.levels.length > 1 ? ` · ${t("shape.levelsN", { n: input.levels.length })}` : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
