"use client";

import { baysFor, SITE_KINDS, SITE_OFF, type SiteKind, type SiteSettings } from "@/domain/site/site";
import type { Analysis } from "@/domain/planner/analyze";
import { useT } from "@/i18n";
import { useConfigurator } from "@/store/configurator";
import { Note, NumberInput, Panel, Stat, Stats, Toggle } from "../configurator/controls";
import { int, money, one } from "../configurator/format";

/** Plot: parking, walks, lamps, planting and the landscape editor's palette */
export function SitePanel({ a }: { a: Analysis }) {
  const t = useT();
  const { planner, setPlanner, building, siteTool, setSiteTool, look } = useConfigurator();
  const s: SiteSettings = { ...SITE_OFF, ...planner.site };
  const set = (patch: Partial<SiteSettings>) => setPlanner({ site: { ...s, ...patch } });
  const p = a.site;
  const tools: (SiteKind | "erase")[] = [...SITE_KINDS, "erase"];
  return (
    <>
      <Panel title={t("site.title")}>
        <Toggle label={t("site.enabled")} checked={s.enabled} onChange={(enabled) => set({ enabled })} />
        {s.enabled && (
          <>
            <Toggle label={t("site.parking")} checked={s.parking} onChange={(parking) => set({ parking })} />
            {s.parking && (
              <NumberInput label={t("site.bays", { n: baysFor(building.productId) })} value={s.bays ?? baysFor(building.productId)} min={1} max={60} step={1} onChange={(bays) => set({ bays })} />
            )}
            <Toggle label={t("site.lamps")} checked={s.lamps} onChange={(lamps) => set({ lamps })} />
            <Toggle label={t("site.trees")} checked={s.boundaryTrees} onChange={(boundaryTrees) => set({ boundaryTrees })} />
          </>
        )}
      </Panel>

      {s.enabled && (
        <Panel title={t("site.editor")}>
          <p className="text-sm text-ink-mute">{t("site.editorHint")}</p>
          <div className="grid grid-cols-3 gap-2">
            {tools.map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={siteTool === k}
                onClick={() => {
                  setSiteTool(siteTool === k ? null : k);
                  if (siteTool !== k) look("top");
                }}
                className={`min-h-11 rounded-lg border px-2 text-xs ${siteTool === k ? "border-primary bg-primary text-surface" : "border-line hover:border-primary"}`}
              >
                {t.dyn(`site.kind.${k}`)}
              </button>
            ))}
          </div>
          {siteTool && <Note tone="ok">{t(siteTool === "erase" ? "site.erasing" : "site.placing", { kind: t.dyn(`site.kind.${siteTool}`) })}</Note>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setSiteTool(null)} className="min-h-11 flex-1 rounded-lg border border-line px-3 text-sm">
              {t("site.done")}
            </button>
            <button type="button" disabled={!s.items.length} onClick={() => set({ items: [] })} className="min-h-11 flex-1 rounded-lg border border-line px-3 text-sm disabled:opacity-50">
              {t("site.clear", { n: s.items.length })}
            </button>
          </div>
        </Panel>
      )}

      {p && (
        <Panel title={t("site.summary")}>
          <Stats>
            <Stat label={t("site.plot")} value={`${one((p.plot.x1 - p.plot.x0) / 1000)} × ${one((p.plot.z1 - p.plot.z0) / 1000)} ${t("unit.m")}`} />
            <Stat label={t("site.baysTotal")} value={`${p.quantities.bays} (${t("site.accessible")} ${p.quantities.accessible}, EV ${p.quantities.ev})`} strong />
            <Stat label={t("site.asphalt")} value={`${int(p.quantities.asphaltM2)} ${t("unit.m2")}`} />
            <Stat label={t("site.paving")} value={`${int(p.quantities.pavingM2)} ${t("unit.m2")}`} />
            <Stat label={t("site.lawn")} value={`${int(p.quantities.lawnM2)} ${t("unit.m2")}`} />
            <Stat label={t("site.lampsN")} value={int(p.quantities.lamps)} />
            <Stat label={t("site.treesN")} value={int(p.quantities.trees)} />
            <Stat label={t("site.cost")} value={money(p.cost)} strong />
          </Stats>
          <Note>{t("site.note")}</Note>
        </Panel>
      )}
    </>
  );
}
