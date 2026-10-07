"use client";

import { coopPlan } from "@/domain/livestock/coop";
import type { Analysis } from "@/domain/planner/analyze";
import { useT } from "@/i18n";
import { useConfigurator } from "@/store/configurator";
import { Note, NumberInput, Panel, Stat, Stats, Toggle } from "../configurator/controls";
import { int, money, one } from "../configurator/format";

export function MepPanel({ a }: { a: Analysis }) {
  const t = useT();
  const { planner, setPlanner } = useConfigurator();
  const m = a.mep;
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
