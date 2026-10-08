"use client";

import type { Analysis } from "@/domain/planner/analyze";
import { useT } from "@/i18n";
import { useConfigurator } from "@/store/configurator";
import { Note, Panel, Stat, Stats, Toggle } from "../configurator/controls";
import { int, one, two } from "../configurator/format";
import { NodeDetail } from "./NodeDetails";

export function CalcPanel({ a }: { a: Analysis }) {
  const t = useT();
  const { planner, setPlanner, setBuilding } = useConfigurator();
  const d = a.design;
  const L = d.loads;
  const best = d.checks.filter((c) => !c.ok && c.suggest && c.suggest !== "—").map((c) => c.suggest!)[0];
  return (
    <>
      <Panel title={t("calc.loads")}>
        <Stats>
          <Stat label={t("calc.roofG")} value={`${two(L.roofG)} ${t("unit.kpa")}`} />
          <Stat label={t("calc.snow", { mu: two(L.snowMu) })} value={`${two(L.snowGround)} → ${two(L.snowRoof)} ${t("unit.kpa")}`} />
          <Stat label={t("calc.roofDesign")} value={`${two(L.roofDesign)} ${t("unit.kpa")}`} strong />
          {a.building.input.levels.length > 1 || a.building.groundFloor ? <Stat label={t("calc.floor")} value={`${two(L.floorG)} + ${two(L.floorQ)} → ${two(L.floorDesign)} ${t("unit.kpa")}`} /> : null}
          <Stat label={t("calc.wind")} value={`${two(L.wind)} → ${two(L.windDesign)} ${t("unit.kpa")}`} />
        </Stats>
        {a.city.seismic >= 7 && <Note tone="warn">{t("calc.seismic", { n: a.city.seismic })}</Note>}
        <Toggle label={t("calc.certified")} checked={planner.certifiedG550} onChange={(certifiedG550) => setPlanner({ certifiedG550 })} />
        <Note>{t("calc.method")}</Note>
      </Panel>

      <Panel title={t("calc.checks")}>
        <p className={`rounded-lg p-2 text-sm ${d.ok ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>
          {d.ok ? `✓ ${t("calc.allOk", { u: int(d.worst * 100) })}` : `! ${t("calc.notOk")}`}
        </p>
        {best && (
          <button type="button" onClick={() => setBuilding({ profileId: best })} className="min-h-11 rounded-lg bg-primary px-3 text-sm font-semibold text-surface">
            {t("calc.apply", { p: best })}
          </button>
        )}
        <ul className="flex flex-col gap-2">
          {d.checks.map((c, i) => (
            <li key={i} className="flex flex-col gap-1 text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span>
                  {t.dyn(c.element)} <span className="text-xs text-ink-mute">{c.where}</span>
                </span>
                <span className={`tabular-nums font-semibold ${c.ok ? "" : "text-danger"}`}>{int(c.utilisation * 100)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-sunken">
                <div className={`h-full rounded-full ${c.ok ? (c.utilisation > 0.85 ? "bg-accent" : "bg-primary") : "bg-danger"}`} style={{ width: `${Math.min(100, c.utilisation * 100)}%` }} />
              </div>
              {!c.ok && c.suggest && <span className="text-xs text-danger">{c.suggest === "—" ? t("calc.noGauge") : t("calc.suggest", { p: c.suggest })}</span>}
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}

export function NodesPanel({ a }: { a: Analysis }) {
  const t = useT();
  return (
    <>
      <Panel title={t("nodes.title")}>
        <ul className="grid grid-cols-2 gap-3">
          {a.building.nodes.map((n) => (
            <li key={n.type} className="flex flex-col gap-1 rounded-lg border border-line p-2">
              <NodeDetail type={n.type} className="h-24 w-full" />
              <span className="text-sm font-medium">{t.dyn(`node.${n.type}`)}</span>
              <span className="text-xs tabular-nums text-ink-mute">
                {int(n.count)} {t("unit.pcs")}
              </span>
              <span className="text-xs text-ink-mute">{t.dyn(`nodeHint.${n.type}`)}</span>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title={t("nodes.hardware")}>
        <Stats>
          {a.hardware.map((h) => (
            <Stat key={h.kind} label={t.dyn(`cost.hw.${h.kind}`)} value={`${h.unit === "m" ? one(h.qty) : int(h.qty)} ${t(h.unit === "m" ? "unit.m" : "unit.pcs")}`} />
          ))}
        </Stats>
        <Note>{t("nodes.note")}</Note>
      </Panel>
    </>
  );
}
