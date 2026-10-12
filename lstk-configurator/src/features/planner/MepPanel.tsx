"use client";

import { coopPlan } from "@/domain/livestock/coop";
import type { Analysis } from "@/domain/planner/analyze";
import { useT } from "@/i18n";
import { MEP_SYSTEMS, mepLayout, mepLengths, type MepSystem } from "@/domain/mep/routing";
import { MEP_COLOR } from "@/render/mep";
import { useConfigurator } from "@/store/configurator";
import { useMemo } from "react";
import { Note, NumberInput, Panel, Stat, Stats, Toggle } from "../configurator/controls";
import { int, money, one } from "../configurator/format";

export function MepPanel({ a }: { a: Analysis }) {
  const t = useT();
  const { planner, setPlanner, view, setView } = useConfigurator();
  const m = a.mep;
  const layout = useMemo(
    () => mepLayout(a.building, a.thermal.envelope.rooms, a.mep, { electricHeating: planner.electricHeating, recovery: planner.ventilation === "recovery" }),
    [a, planner.electricHeating, planner.ventilation],
  );
  const lengths = mepLengths(layout);
  const count = (k: string) => layout.points.filter((p) => p.kind === k).length;
  const toggle = (sys: MepSystem, on: boolean) => setView({ mep: on ? MEP_SYSTEMS.filter((x) => x === sys || view.mep.includes(x)) : view.mep.filter((x) => x !== sys) });
  const coop = a.coop ? coopPlan(planner.birds) : null;
  return (
    <>
      {coop && (
        <Panel title={t("mep.coop")}>
          <NumberInput label={t("mep.birds")} value={planner.birds} min={1} max={5000} step={1} onChange={(birds) => setPlanner({ birds })} />
          <Stats>
            <Stat label={t("mep.coopFloor")} value={`${one(coop.floorM2)} ${t("unit.m2")}`} />
            <Stat label={t("mep.coopHave")} value={`${one(a.thermal.envelope.rooms.flat().filter((r) => r.purpose === "poultry").reduce((s, r) => s + r.area, 0))} ${t("unit.m2")}`} />
            <Stat label={t("mep.perch")} value={`${one(coop.perchM)} ${t("unit.m")}`} />
            <Stat label={t("mep.nests")} value={int(coop.nests)} />
            <Stat label={t("mep.ventWinter")} value={`${int(coop.ventWinterM3h)} ${t("unit.m3h")}`} />
            <Stat label={t("mep.ventSummer")} value={`${int(coop.ventSummerM3h)} ${t("unit.m3h")}`} />
            <Stat label={t("mep.run")} value={`${int(coop.runM2)} ${t("unit.m2")}`} />
          </Stats>
          <Note>{t("mep.coopNote")}</Note>
        </Panel>
      )}
      {layout.runs.length > 0 && (
        <Panel title={t("mep.layers")}>
          <ul className="flex flex-col">
            {MEP_SYSTEMS.filter((sys) => layout.runs.some((r) => r.system === sys) || layout.points.some((p) => p.system === sys)).map((sys) => (
              <li key={sys} className="flex items-center justify-between gap-2">
                <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={view.mep.includes(sys)} onChange={(e) => toggle(sys, e.target.checked)} className="size-5 accent-[hsl(var(--primary))]" />
                  <span aria-hidden className="inline-block h-1.5 w-6 rounded-full" style={{ background: MEP_COLOR[sys] }} />
                  {t.dyn(`mep.sys.${sys}`)}
                </label>
                <span className="text-xs tabular-nums text-ink-mute">
                  {int(lengths[sys])} {t("unit.m")}
                </span>
              </li>
            ))}
          </ul>
          <Stats>
            {count("radiator") > 0 && <Stat label={t("mep.radiators")} value={int(count("radiator"))} />}
            {count("convector") > 0 && <Stat label={t("mep.convectors")} value={int(count("convector"))} />}
            {count("fan") > 0 && <Stat label={t("mep.fans")} value={int(count("fan"))} />}
            {count("valve") > 0 && <Stat label={t("mep.valves")} value={int(count("valve"))} />}
          </Stats>
          <Note>{t("mep.layersNote")}</Note>
        </Panel>
      )}
      <Panel title={t("mep.electrical")}>
        <Stats>
          <Stat label={t("mep.sockets")} value={int(m.sockets)} />
          <Stat label={t("mep.lights")} value={int(m.lights)} />
          <Stat label={t("mep.circuits")} value={`${int(m.circuits)} + ${t("mep.rcd")} ${m.rcds}`} />
          <Stat label={t("mep.cable15")} value={`${int(m.cable15M)} ${t("unit.m")}`} />
          <Stat label={t("mep.cable25")} value={`${int(m.cable25M)} ${t("unit.m")}`} />
          {m.cable6M > 0 && <Stat label={t("mep.cable6")} value={`${int(m.cable6M)} ${t("unit.m")}`} />}
          <Stat label={t("mep.grommets")} value={int(m.grommets)} hint={t("mep.grommetsHint")} />
          <Stat label={t("mep.installed")} value={`${one(m.installedKw)} ${t("unit.kw")}`} />
          <Stat label={t("mep.demand")} value={`${one(m.demandKw)} ${t("unit.kw")}`} strong />
          <Stat label={t("mep.cost")} value={money(m.cost.electrical)} />
        </Stats>
        <Toggle label={t("climate.electric")} checked={planner.electricHeating} onChange={(electricHeating) => setPlanner({ electricHeating })} />
        {m.heatingKw > 0 && <Note>{t("mep.heaters", { kw: one(m.heatingKw) })}</Note>}
        <Note>{t("mep.lstkNote")}</Note>
      </Panel>
      <Panel title={t("mep.plumbing")}>
        {m.waterPoints === 0 ? (
          <p className="text-sm text-ink-mute">{t("mep.noWater")}</p>
        ) : (
          <Stats>
            <Stat label={t("mep.points")} value={int(m.waterPoints)} />
            <Stat label={t("mep.pipes")} value={`${int(m.pipeM)} ${t("unit.m")}`} />
            <Stat label={t("mep.sewer50")} value={`${int(m.sewer50M)} ${t("unit.m")}`} />
            {m.sewer110M > 0 && <Stat label={t("mep.sewer110")} value={`${int(m.sewer110M)} ${t("unit.m")}`} />}
            <Stat label={t("mep.cost")} value={money(m.cost.plumbing)} />
          </Stats>
        )}
      </Panel>
      <Panel title={t("mep.ventilation")}>
        <Stats>
          <Stat label={t("mep.air")} value={`${int(m.ventM3h)} ${t("unit.m3h")}`} />
          <Stat label={t("mep.fans")} value={int(m.fans)} />
          <Stat label={t("mep.ducts")} value={`${int(m.ductM)} ${t("unit.m")}`} />
          <Stat label={t("mep.cost")} value={money(m.cost.ventilation)} />
        </Stats>
      </Panel>
      {m.rooms.length > 0 && (
        <Panel title={t("mep.byRoom")}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs tabular-nums">
              <thead className="text-ink-mute">
                <tr>
                  <th className="py-1 text-left font-normal">{t("mep.room")}</th>
                  <th className="text-right font-normal">{t("mep.socketsShort")}</th>
                  <th className="text-right font-normal">{t("mep.lightsShort")}</th>
                  <th className="text-right font-normal">{t("mep.waterShort")}</th>
                  <th className="text-right font-normal">{t("unit.m3h")}</th>
                </tr>
              </thead>
              <tbody>
                {m.rooms.map((r, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="py-1">
                      {t.dyn(`room.${r.room.purpose}`)} {a.building.levels.length > 1 ? `(${r.level + 1})` : ""}
                    </td>
                    <td className="text-right">{r.sockets}</td>
                    <td className="text-right">{r.lights}</td>
                    <td className="text-right">{r.fixtures.map((f) => t.dyn(`fixture.${f}`)).join(", ") || "—"}</td>
                    <td className="text-right">{int(r.ventM3h)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Note>{t("mep.note")}</Note>
        </Panel>
      )}
    </>
  );
}
