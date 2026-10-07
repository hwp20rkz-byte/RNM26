"use client";

import { finishesFor, RAL, type FinishChoice, type FinishZone } from "@/domain/finishes/catalog";
import type { Analysis } from "@/domain/planner/analyze";
import { useT } from "@/i18n";
import { useConfigurator } from "@/store/configurator";
import { Panel, Select, Stat, Stats, Swatches } from "../configurator/controls";
import { int, money, one } from "../configurator/format";

const FACADE_COLORS = [...RAL.map((r) => r.hsl), "hsl(40 40% 82%)", "hsl(28 48% 46%)", "hsl(24 40% 36%)", "hsl(150 18% 40%)"];

export function FinishPanel({ a }: { a: Analysis }) {
  const t = useT();
  const { planner, setFinishes } = useConfigurator();
  const f = planner.finishes;
  const pick = (zone: FinishZone, key: keyof FinishChoice) => (
    <Select
      label={t.dyn(`zone.${zone}`)}
      value={f[key]}
      options={finishesFor(zone).map((x) => ({ value: x.id, label: `${t.dyn(`finish.${x.id}`)} · ${int(x.price + x.labour)} ₸/${t("unit.m2")}` }))}
      onChange={(v) => setFinishes({ [key]: v })}
    />
  );
  const colors = (label: string, key: keyof FinishChoice) => (
    <Swatches label={label} value={f[key]} options={FACADE_COLORS.map((c, i) => ({ value: c, label: RAL[i]?.id ?? c }))} onChange={(v) => setFinishes({ [key]: v })} />
  );
  return (
    <>
      <Panel title={t("finish.exterior")}>
        {pick("facade", "facade")}
        {colors(t("finish.facadeColor"), "facadeColor")}
        {pick("roofing", "roofing")}
        {colors(t("finish.roofColor"), "roofColor")}
        {colors(t("finish.trimColor"), "trimColor")}
        {pick("plinth", "plinth")}
      </Panel>
      <Panel title={t("finish.interior")}>
        {pick("interior", "interior")}
        {pick("wet", "wet")}
        {pick("steam", "steam")}
        {pick("floor", "floor")}
        <p className="text-xs text-ink-mute">{t("finish.byRoom")}</p>
      </Panel>
      <Panel title={t("finish.takeoff")}>
        <Stats>
          {a.finishes.map((x) => (
            <Stat key={x.zone} label={`${t.dyn(`takeoff.${x.zone}`)} · ${t.dyn(`finish.${x.finishId}`)}`} value={`${one(x.areaM2)} ${t("unit.m2")} · ${money(x.cost)}`} />
          ))}
          <Stat strong label={t("finish.total")} value={money(a.finishes.reduce((s, x) => s + x.cost, 0))} />
          <Stat label={t("finish.mass")} value={`${int(a.finishes.reduce((s, x) => s + x.massKg, 0))} ${t("unit.kg")}`} />
        </Stats>
        <p className="text-xs text-ink-mute">{t("finish.note")}</p>
      </Panel>
    </>
  );
}
