"use client";

import type { Analysis } from "@/domain/planner/analyze";
import { useT } from "@/i18n";
import { useConfigurator } from "@/store/configurator";
import { FASTENERS, fastenerResistance } from "@/domain/connections/fasteners";
import { Note, Panel, Segmented, Stat, Stats, Toggle } from "../configurator/controls";
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
  const { planner, setPlanner } = useConfigurator();
  const kind = planner.fastener;
  const joints = a.design.checks.filter((c) => c.element.startsWith("chk.joint."));
  return (
    <>
      <Panel title={t("fast.title")}>
        <Segmented
          legend={t("fast.title")}
          value={kind}
          options={[
            { value: "screw", label: t("fast.screw") },
            { value: "rivet", label: t("fast.rivet") },
          ]}
          onChange={(fastener) => setPlanner({ fastener })}
        />
        <Stats>
          <Stat label={t("fast.capacity")} value={`${two(fastenerResistance(kind, a.building.profile) / 1000)} ${t("unit.kn")}`} />
          <Stat label={t("fast.count")} value={`${int(a.bom.totals.fasteners)} ${t("unit.pcs")}`} />
          <Stat label={t("fast.time")} value={`${one((a.bom.totals.fasteners * FASTENERS[kind].seconds) / 3600)} ${t("unit.h")}`} />
          {joints.map((c) => (
            <Stat key={c.element + c.where} label={`${t.dyn(c.element)} (${c.where})`} value={`${Math.round(c.utilisation * 100)} %`} strong={!c.ok} />
          ))}
        </Stats>
        <Note>{t("fast.note")}</Note>
      </Panel>
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
      <Panel title={t("det.title")}>
        <Stats>
          <Stat label={t("det.nested")} value={`${int(a.detailing.nested)} ${t("unit.pcs")}`} />
          <Stat label={t("det.butt")} value={`${int(a.detailing.butt)} ${t("unit.pcs")}`} />
          <Stat label={t("det.apex")} value={`${int(a.detailing.apex)} ${t("unit.pcs")}`} />
          <Stat label={t("det.swages")} value={`${int(a.detailing.swages)} ${t("unit.pcs")}`} />
          <Stat label={t("det.lipCuts")} value={`${int(a.detailing.lipCuts)} ${t("unit.pcs")}`} />
          <Stat label={t("det.chamfers")} value={`${int(a.detailing.chamfers)} ${t("unit.pcs")}`} />
          <Stat label={t("det.clashes")} value={a.detailing.clashes + a.detailing.issues === 0 ? t("det.clean") : `${int(a.detailing.clashes + a.detailing.issues)}`} />
        </Stats>
        <Note>{t("det.note").replace("{nest}", one(a.detailing.nestGap)).replace("{butt}", one(a.detailing.buttGap))}</Note>
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
