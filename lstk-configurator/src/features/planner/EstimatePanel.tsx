"use client";

import type { Analysis, CostLine } from "@/domain/planner/analyze";
import { useT } from "@/i18n";
import { useConfigurator } from "@/store/configurator";
import { Note, NumberInput, Panel, Stat, Stats } from "../configurator/controls";
import { int, money, one } from "../configurator/format";

const GROUPS: CostLine["group"][] = ["frame", "production", "envelope", "finishes", "openings", "mep", "foundation", "site", "delivery", "overhead"];
const GROUP_COLOR: Record<CostLine["group"], string> = {
  frame: "hsl(212 62% 34%)",
  production: "hsl(212 50% 55%)",
  envelope: "hsl(45 70% 55%)",
  finishes: "hsl(24 88% 52%)",
  openings: "hsl(195 55% 50%)",
  mep: "hsl(270 35% 55%)",
  foundation: "hsl(30 8% 50%)",
  site: "hsl(150 35% 40%)",
  delivery: "hsl(0 55% 50%)",
  overhead: "hsl(215 12% 70%)",
};

export function EstimatePanel({ a }: { a: Analysis }) {
  const t = useT();
  const { planner: p, setPlanner, prices, setPrices } = useConfigurator();
  const byGroup = GROUPS.map((g) => ({ g, lines: a.lines.filter((l) => l.group === g) }))
    .map((x) => ({ ...x, sum: x.lines.reduce((s, l) => s + l.amount, 0) }))
    .filter((x) => x.sum > 0);
  const area = a.areas.floor || a.areas.footprint;
  return (
    <>
      <Panel title={t("estimate.total")}>
        <div className="flex flex-col gap-1">
          <p className="text-sm text-ink-mute">{t("estimate.price", { margin: p.marginPct })}</p>
          <p className="text-lg font-bold tabular-nums text-primary">{money(a.price)}</p>
          <p className="text-sm tabular-nums text-ink-mute">
            {t("estimate.cost")} {money(a.cost)} · {money(a.price / Math.max(1, area))}/{t("unit.m2")}
          </p>
        </div>
        {/* Stacked bar of the cost structure */}
        <div className="flex h-4 w-full overflow-hidden rounded-full" role="img" aria-label={t("estimate.structure")}>
          {byGroup.map((x) => (
            <span key={x.g} style={{ width: `${(x.sum / a.cost) * 100}%`, background: GROUP_COLOR[x.g] }} title={`${t.dyn(`group.${x.g}`)} ${one((x.sum / a.cost) * 100)}%`} />
          ))}
        </div>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          {byGroup.map((x) => (
            <li key={x.g} className="flex items-center gap-2">
              <span className="size-3 shrink-0 rounded-sm" style={{ background: GROUP_COLOR[x.g] }} />
              <span className="flex-1">{t.dyn(`group.${x.g}`)}</span>
              <span className="tabular-nums text-ink-mute">{int((x.sum / a.cost) * 100)}%</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title={t("estimate.lines")}>
        {byGroup.map((x) => (
          <div key={x.g} className="flex flex-col gap-1">
            <h3 className="flex justify-between text-sm font-semibold">
              <span>{t.dyn(`group.${x.g}`)}</span>
              <span className="tabular-nums">{money(x.sum)}</span>
            </h3>
            <Stats>
              {x.lines.map((l) => (
                <Stat
                  key={l.key}
                  label={`${t.dyn(`cost.${l.key}`)}${l.qty !== undefined && l.unit ? ` · ${l.unit === "kWh" || l.unit === "h" || l.unit === "m2" || l.unit === "m3" ? one(l.qty) : int(l.qty)} ${t.dyn(`unit.${l.unit}`)}` : ""}`}
                  value={money(l.amount)}
                />
              ))}
            </Stats>
          </div>
        ))}
      </Panel>

      <Panel title={t("estimate.energy")}>
        <Stats>
          <Stat label={t("estimate.lineHours")} value={`${one(a.energy.lineHours)} ${t("unit.h")}`} />
          <Stat label={t("estimate.stops")} value={int(a.energy.stops)} />
          <Stat label={t("estimate.shopHours")} value={`${one(a.energy.assemblyHours)} ${t("unit.h")}`} />
          <Stat label={t("estimate.kwh")} value={`${one(a.energy.kWh)} ${t("unit.kwh")}`} />
          <Stat strong label={t("estimate.energyCost", { tariff: p.tariff })} value={money(a.energy.cost)} />
        </Stats>
        <Note>{t("estimate.energyNote")}</Note>
      </Panel>

      <Panel title={t("estimate.inputs")}>
        <div className="grid grid-cols-2 gap-3">
          <NumberInput label={t("estimate.tariff")} unit={t("unit.tgKwh")} value={p.tariff} min={0} max={200} step={0.5} onChange={(tariff) => setPlanner({ tariff })} />
          <NumberInput label={t("estimate.labour")} unit={t("unit.tgH")} value={p.labourRate} min={0} max={20000} step={100} onChange={(labourRate) => setPlanner({ labourRate })} />
          <NumberInput label={t("estimate.steel")} unit={t("unit.tgKg")} value={prices.steelPerKg} min={0} max={5000} step={10} onChange={(steelPerKg) => setPrices({ steelPerKg })} />
          <NumberInput label={t("estimate.scrap")} unit="%" value={prices.scrapPct} min={0} max={50} step={0.5} onChange={(scrapPct) => setPrices({ scrapPct })} />
          <NumberInput label={t("estimate.margin")} unit="%" value={p.marginPct} min={0} max={200} step={1} onChange={(marginPct) => setPlanner({ marginPct })} />
        </div>
        <Note>{t("estimate.note")}</Note>
      </Panel>
    </>
  );
}
