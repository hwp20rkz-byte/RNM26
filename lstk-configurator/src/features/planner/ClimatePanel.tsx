"use client";

import { CITIES } from "@/domain/climate/cities";
import type { Assembly, EfficiencyLevel, InsulationMaterial } from "@/domain/envelope/insulation";
import type { Analysis } from "@/domain/planner/analyze";
import { useT } from "@/i18n";
import { useConfigurator } from "@/store/configurator";
import { Note, NumberInput, Panel, Segmented, Select, Stat, Stats, Toggle } from "../configurator/controls";
import { int, money, one, two } from "../configurator/format";

const LAYER_COLOR: Record<string, string> = {
  "ext.wool": "hsl(45 70% 62%)",
  "ext.eps": "hsl(0 0% 94%)",
  "ext.pir": "hsl(48 85% 70%)",
  overWool: "hsl(45 70% 62%)",
  underWool: "hsl(45 70% 62%)",
  cavityWool: "hsl(45 60% 70%)",
  osb9: "hsl(35 55% 60%)",
  osb18: "hsl(35 55% 60%)",
  board: "hsl(28 45% 50%)",
  gkl: "hsl(0 0% 88%)",
  vapour: "hsl(205 70% 50%)",
  windMembrane: "hsl(205 30% 70%)",
  xps: "hsl(180 50% 60%)",
  screed: "hsl(0 0% 70%)",
  slab: "hsl(0 0% 60%)",
  ground: "hsl(30 30% 40%)",
};

/** Section through the assembly to scale, outside on the left */
function BuildUp({ a }: { a: Assembly }) {
  const t = useT();
  const shown = a.layers.filter((l) => l.thickness > 0 || l.key === "vapour" || l.key === "windMembrane");
  const total = shown.reduce((s, l) => s + Math.max(l.thickness, 6), 0);
  const H = 110;
  let x = 0;
  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${total} ${H}`} preserveAspectRatio="none" className="h-20 w-full rounded-md border border-line" role="img" aria-label={t.dyn(`element.${a.element}`)}>
        {shown.map((l, i) => {
          const w = Math.max(l.thickness, 6);
          const x0 = x;
          x += w;
          return (
            <g key={i}>
              <rect x={x0} y={0} width={w} height={H} fill={LAYER_COLOR[l.key] ?? "hsl(0 0% 80%)"} />
              {l.key === "cavityWool" && <rect x={x0 + w / 2 - 6} y={0} width={12} height={H} fill="hsl(210 8% 55%)" />}
            </g>
          );
        })}
      </svg>
      <figcaption>
        <ol className="flex flex-col gap-0.5 text-xs">
          {shown.map((l, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="size-3 shrink-0 rounded-sm border border-line" style={{ background: LAYER_COLOR[l.key] }} />
              <span className="flex-1">{t.dyn(`layer.${l.key}`)}</span>
              <span className="tabular-nums text-ink-mute">{l.thickness ? `${int(l.thickness)} ${t("unit.mm")}` : "—"}</span>
              <span className="w-12 text-right tabular-nums">{l.r ? two(l.r) : ""}</span>
            </li>
          ))}
        </ol>
      </figcaption>
    </figure>
  );
}

export function ClimatePanel({ a }: { a: Analysis }) {
  const t = useT();
  const { planner: p, setPlanner, building } = useConfigurator();
  const th = a.thermal;
  const c = a.city;
  const cities = [...CITIES].sort((x, y) => x.name[t.lang].localeCompare(y.name[t.lang], t.lang));
  return (
    <>
      <Panel title={t("climate.city")}>
        <Select
          label={t("climate.city")}
          value={p.cityId}
          options={cities.map((x) => ({ value: x.id, label: x.name[t.lang] }))}
          onChange={(cityId) => setPlanner({ cityId })}
        />
        <Stats>
          <Stat label={t("climate.t5")} value={`${one(c.t5)} °C`} />
          <Stat label={t("climate.z")} value={`${int(c.z)} ${t("unit.days")}`} />
          <Stat label={t("climate.tHt")} value={`${one(c.tHt)} °C`} />
          <Stat label={t("climate.frost")} value={`${int(c.frost)} ${t("unit.cm")}`} />
          <Stat label={t("climate.snow")} value={`${one(c.snowKpa)} ${t("unit.kpa")}`} />
          <Stat label={t("climate.gsop", { tin: th.tIn })} value={`${int(th.gsop)} °C·${t("unit.days")}`} />
        </Stats>
        {!c.verified && <Note>{t("climate.unverified")}</Note>}
      </Panel>

      <Panel title={t("climate.insulation")}>
        {!th.insulated ? (
          <p className="text-sm text-ink-mute">{t(building.heating === "none" ? "climate.unheated" : "climate.notEnclosed")}</p>
        ) : (
          <>
            <Segmented<InsulationMaterial>
              legend={t("climate.material")}
              value={p.insulation}
              options={(["wool", "eps", "pir"] as const).map((v) => ({ value: v, label: t.dyn(`material.${v}`) }))}
              onChange={(insulation) => setPlanner({ insulation })}
            />
            <Segmented<EfficiencyLevel>
              legend={t("climate.level")}
              value={p.efficiency}
              options={(["minimum", "norm", "plus"] as const).map((v) => ({ value: v, label: t.dyn(`efficiency.${v}`) }))}
              onChange={(efficiency) => setPlanner({ efficiency })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                label={t("climate.windows")}
                value={String(p.windowR)}
                options={[
                  { value: "0.54", label: t("window.2ch") },
                  { value: "0.7", label: t("window.3ch") },
                  { value: "0.8", label: t("window.argon") },
                ]}
                onChange={(v) => setPlanner({ windowR: Number(v) })}
              />
              <Select
                label={t("climate.ventilation")}
                value={p.ventilation}
                options={[
                  { value: "natural", label: t("vent.natural") },
                  { value: "recovery", label: t("vent.recovery") },
                ]}
                onChange={(ventilation) => setPlanner({ ventilation })}
              />
            </div>
            {th.condensationRisk && <Note tone="warn">{t("climate.condensation")}</Note>}
            {p.insulation !== "wool" && <Note>{t("climate.combustible")}</Note>}
          </>
        )}
      </Panel>

      {th.assemblies.map((x) => (
        <Panel key={x.element} title={`${t.dyn(`element.${x.element}`)} · ${one(x.areaM2)} ${t("unit.m2")}`}>
          <BuildUp a={x} />
          <Stats>
            <Stat label={t("climate.rReq")} value={`${two(x.rRequired)} ${t("unit.rUnit")}`} />
            <Stat label={t("climate.rFact")} value={`${two(x.rTotal)} ${t("unit.rUnit")}`} strong />
            {x.added > 0 && <Stat label={t("climate.added")} value={`${int(x.added)} ${t("unit.mm")}`} />}
          </Stats>
          <Note tone={x.ok ? "ok" : "warn"}>{x.ok ? t("climate.ok") : t("climate.notOk")}</Note>
        </Panel>
      ))}

      {th.insulated && (
        <Panel title={t("climate.heat")}>
          <Stats>
            <Stat label={t("climate.hT")} value={`${one(th.hTransmission)} ${t("unit.wk")}`} />
            <Stat label={t("climate.hV")} value={`${one(th.hVentilation)} ${t("unit.wk")}`} />
            <Stat label={t("climate.peak", { t5: one(c.t5) })} value={`${one(th.peakKw)} ${t("unit.kw")}`} strong />
            <Stat label={t("climate.season", { pct: int(th.occupancy * 100) })} value={`${int(th.seasonKwh)} ${t("unit.kwh")}`} />
            <Stat label={t("climate.seasonCost", { tariff: p.tariff })} value={money(a.heatingPerYear)} strong />
          </Stats>
          <Toggle label={t("climate.electric")} checked={p.electricHeating} onChange={(electricHeating) => setPlanner({ electricHeating })} />
          <NumberInput label={t("estimate.tariff")} unit={t("unit.tgKwh")} value={p.tariff} min={0} max={200} step={0.5} onChange={(tariff) => setPlanner({ tariff })} />
          <Note>{t("climate.method")}</Note>
        </Panel>
      )}
    </>
  );
}
