"use client";

import { AUTONOMY_OFF, autonomyPreset, type AutonomySettings, type HeatPumpKind } from "@/domain/energy/autonomy";
import type { Analysis } from "@/domain/planner/analyze";
import { useT } from "@/i18n";
import { useConfigurator } from "@/store/configurator";
import { Note, NumberInput, Panel, Segmented, Stat, Stats, Toggle } from "../configurator/controls";
import { int, money, one } from "../configurator/format";

/** Energy and autonomy: what the building uses, the plant that covers it, what it costs and saves */
export function EnergyPanel({ a }: { a: Analysis }) {
  const t = useT();
  const { planner, setPlanner, building, setBuilding } = useConfigurator();
  const s: AutonomySettings = { ...AUTONOMY_OFF, ...planner.autonomy };
  const set = (patch: Partial<AutonomySettings>) => setPlanner({ autonomy: { ...s, ...patch } });
  const x = a.autonomy;
  const kwh = (v: number) => `${int(v)} ${t("unit.kwh")}`;
  const uses = Object.entries(x.use).filter(([, v]) => v > 0.5);
  const total = x.annualKwh || 1;
  return (
    <>
      <Panel title={t("auto.title")}>
        <p className="text-sm text-ink-mute">{t("auto.intro")}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setPlanner({ autonomy: autonomyPreset(building.productId, a.city) })} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-surface">
            {t("auto.preset")}
          </button>
          <button type="button" onClick={() => setPlanner({ autonomy: AUTONOMY_OFF })} className="min-h-11 rounded-lg border border-line px-4 text-sm">
            {t("auto.reset")}
          </button>
        </div>
        <Toggle label={t("auto.grid")} checked={s.grid} onChange={(grid) => set({ grid })} />
        <NumberInput label={t("auto.azimuth")} value={s.azimuth} min={-180} max={180} step={15} unit="°" onChange={(azimuth) => set({ azimuth })} />
      </Panel>

      <Panel title={t("auto.heat")}>
        <Segmented<HeatPumpKind>
          legend={t("auto.heatPump")}
          value={s.heatPump}
          options={(["none", "air", "ground"] as const).map((v) => ({ value: v, label: t.dyn(`auto.hp.${v}`) }))}
          onChange={(heatPump) => set({ heatPump })}
        />
        <Toggle label={t("auto.ufh")} checked={s.ufh} onChange={(ufh) => set({ ufh })} />
        {x.heatPump && (
          <Stats>
            <Stat label={t("auto.hpKw")} value={`${one(x.heatPump.kw)} ${t("unit.kw")}`} strong />
            <Stat label={t("auto.scop")} value={one(x.heatPump.scop)} />
            {x.heatPump.probeDepth > 0 && <Stat label={t("auto.probes")} value={`${x.heatPump.probes} × ${int(x.heatPump.probeDepth / x.heatPump.probes)} ${t("unit.m")}`} />}
            {x.heatPump.backupKw > 0 && <Stat label={t("auto.backup")} value={`${int(x.heatPump.backupKw)} ${t("unit.kw")}`} />}
            <Stat label={t("auto.dhw")} value={`${int(x.dhw.litresPerDay)} ${t("unit.lpd")} · ${t("auto.tank")} ${int(x.dhw.tankL)} ${t("unit.l")}`} />
          </Stats>
        )}
        {x.ufh && (
          <Stats>
            <Stat label={t("auto.ufhArea")} value={`${one(x.ufh.areaM2)} ${t("unit.m2")}`} />
            <Stat label={t("auto.ufhPipe")} value={`${int(x.ufh.pipeM)} ${t("unit.m")} · ${x.ufh.loops} ${t("auto.loops")} · ${x.ufh.manifolds} ${t("auto.manifolds")}`} />
            <Stat label={t("auto.flux")} value={`${int(x.ufh.fluxWm2)} ${t("unit.wm2")}`} />
          </Stats>
        )}
      </Panel>

      <Panel title={t("auto.light")}>
        <Toggle label={t("auto.skylights")} checked={s.skylights} onChange={(skylights) => set({ skylights })} />
        {x.skylights && <Note>{t("auto.skylightsNote", { n: x.skylights.count, d: x.skylights.diameter, pct: Math.round(x.skylights.saving * 100) })}</Note>}
      </Panel>

      <Panel title={t("auto.power")}>
        <Toggle label={t("auto.pv")} checked={s.pv} onChange={(pv) => set({ pv })} />
        {s.pv && <NumberInput label={t("auto.pvKwp")} value={s.pvKwp ?? Math.round(x.pv?.kwp ?? 0)} min={0} max={500} step={0.45} unit={t("unit.kwp")} onChange={(v) => set({ pvKwp: v })} />}
        {x.pv && (
          <Stats>
            <Stat label={t("auto.pvPanels")} value={`${x.pv.count} × 450 ${t("unit.wp")} · ${one(x.pv.kwp)} ${t("unit.kwp")}`} strong />
            <Stat label={t("auto.pvMax")} value={`${one(x.pv.maxKwp)} ${t("unit.kwp")} (${t.dyn(`auto.slope.${x.pv.slope}`)})`} />
            <Stat label={t("auto.pvYield")} value={kwh(x.pv.yieldKwh)} />
          </Stats>
        )}
        <Toggle label={t("auto.battery")} checked={s.battery} onChange={(battery) => set({ battery })} />
        {x.battery && <Stats><Stat label={t("auto.batteryKwh")} value={`${int(x.battery.kwh)} ${t("unit.kwh")} LiFePO4 · ${t("auto.inverter")} ${int(x.inverterKw)} ${t("unit.kw")}`} /></Stats>}
        <NumberInput label={t("auto.wind")} value={s.wind} min={0} max={6} step={1} onChange={(wind) => set({ wind })} />
        {x.wind && <Stats><Stat label={t("auto.windYield", { v: one(x.wind.speed) })} value={kwh(x.wind.yieldKwh)} /></Stats>}
        <Toggle label={t("auto.genset")} checked={s.genset} onChange={(genset) => set({ genset })} />
        {x.genset && (
          <Stats>
            <Stat label={t("auto.gensetKva")} value={`${int(x.genset.kva)} ${t("unit.kva")} · ${one(x.genset.litresPerHour)} ${t("unit.lph")}`} />
            <Stat label={t("auto.gensetTank")} value={`${int(x.genset.tankL)} ${t("unit.l")} (72 ${t("unit.hours")})`} />
            <Stat label={t("auto.gensetHours")} value={`${int(x.genset.hoursPerYear)} ${t("unit.hours")}`} />
          </Stats>
        )}
      </Panel>

      <Panel title={t("auto.water")}>
        <Toggle label={t("auto.well")} checked={s.well} onChange={(well) => set({ well })} />
        {s.well && <NumberInput label={t("auto.wellDepth")} value={s.wellDepth} min={10} max={300} step={5} unit={t("unit.m")} onChange={(wellDepth) => set({ wellDepth })} />}
        <Toggle label={t("auto.septic")} checked={s.septic} onChange={(septic) => set({ septic })} />
        {(x.water || x.septic) && (
          <Stats>
            {x.water && <Stat label={t("auto.waterDay")} value={`${one(x.water.m3PerDay)} ${t("unit.m3")}`} />}
            {x.water && <Stat label={t("auto.pump")} value={`${one(x.water.pumpKw)} ${t("unit.kw")}`} />}
            {x.septic && <Stat label={t("auto.septicPe")} value={int(x.septic.pe)} />}
          </Stats>
        )}
      </Panel>

      <Panel title={t("auto.ev")}>
        <div className="grid grid-cols-2 gap-3">
          <NumberInput label={t("auto.evAc")} value={s.evAc} min={0} max={20} step={1} onChange={(evAc) => set({ evAc })} />
          <NumberInput label={t("auto.evDc")} value={s.evDc} min={0} max={4} step={1} onChange={(evDc) => set({ evDc })} />
        </div>
      </Panel>

      <Panel title={t("auto.balance")}>
        <ol className="flex flex-col gap-1 text-xs">
          {uses.map(([k, v]) => (
            <li key={k} className="grid grid-cols-[1fr_auto] items-center gap-2">
              <span>{t.dyn(`auto.use.${k}`)}</span>
              <span className="tabular-nums">{kwh(v)}</span>
              <span className="col-span-2 h-1.5 rounded-full bg-sunken">
                <span className="block h-1.5 rounded-full bg-primary" style={{ width: `${(100 * v) / total}%` }} />
              </span>
            </li>
          ))}
        </ol>
        <Stats>
          <Stat label={t("auto.annual")} value={kwh(x.annualKwh)} strong />
          <Stat label={t("auto.peak")} value={`${one(x.peakKw)} ${t("unit.kw")}`} />
          <Stat label={t("auto.own")} value={`${kwh(x.ownKwh)} · ${Math.round(x.selfSufficiency * 100)} %`} strong />
          <Stat label={t(s.grid ? "auto.gapGrid" : "auto.gapGenset")} value={kwh(x.gapKwh)} />
          <Stat label={t("auto.capex")} value={money(x.capex)} strong />
          <Stat label={t("auto.billBefore")} value={money(x.billBefore)} />
          <Stat label={t("auto.billAfter")} value={money(x.billAfter)} />
          <Stat label={t("auto.payback")} value={x.paybackYears ? `${one(x.paybackYears)} ${t("unit.years")}` : "—"} />
        </Stats>
        {x.notes.map((n) => (
          <Note key={n} tone={n === "pvTruss" || n === "ufhFlux" ? "warn" : "mute"}>
            {t.dyn(`auto.note.${n}`)}
          </Note>
        ))}
        {x.notes.includes("pvTruss") && (
          <button type="button" onClick={() => setBuilding({ trussSpacing: 500 })} className="min-h-11 rounded-lg border border-line px-4 text-sm">
            {t("auto.truss500")}
          </button>
        )}
        <Note>{t("auto.disclaimer")}</Note>
      </Panel>
    </>
  );
}
