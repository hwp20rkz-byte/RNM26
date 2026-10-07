"use client";

import type { ShippingMode } from "@/domain/logistics/delivery";
import { MAX_PANEL, type Analysis } from "@/domain/planner/analyze";
import { useT } from "@/i18n";
import { useConfigurator } from "@/store/configurator";
import { Note, NumberInput, Panel, Segmented, Stat, Stats } from "../configurator/controls";
import { int, money, one } from "../configurator/format";

export function DeliveryPanel({ a }: { a: Analysis }) {
  const t = useT();
  const { planner: p, setPlanner } = useConfigurator();
  const d = a.delivery;
  const split = p.shipping === "panels" && a.building.assemblies.some((x) => x.kind === "wall" && x.size.width > MAX_PANEL);
  return (
    <>
      <Panel title={t("delivery.summary")}>
        <Stats>
          <Stat label={t("delivery.size")} value={`${one(a.size.length / 1000)} × ${one(a.size.width / 1000)} × ${one(a.size.height / 1000)} ${t("unit.m")}`} strong />
          <Stat label={t("delivery.footprint")} value={`${one(a.areas.footprint)} ${t("unit.m2")}`} />
          <Stat label={t("delivery.floor")} value={`${one(a.areas.floor)} ${t("unit.m2")}`} />
          <Stat label={t("delivery.frame")} value={`${int(a.bom.totals.massKg)} ${t("unit.kg")}`} />
          <Stat label={t("delivery.mass")} value={`${one(d.massKg / 1000)} ${t("unit.t")}`} strong />
          <Stat label={t("delivery.volume")} value={`${one(d.volumeM3)} ${t("unit.m3")}`} />
          <Stat label={t("delivery.longest")} value={`${int(d.longest)} ${t("unit.mm")}`} />
        </Stats>
      </Panel>
      <Panel title={t("delivery.how")}>
        <Segmented<ShippingMode>
          legend={t("delivery.mode")}
          value={p.shipping}
          options={[
            { value: "panels", label: t("delivery.panels") },
            { value: "kit", label: t("delivery.kit") },
          ]}
          onChange={(shipping) => setPlanner({ shipping })}
        />
        <NumberInput label={t("delivery.distance")} unit={t("unit.km")} value={p.distanceKm} min={0} max={3000} step={10} onChange={(distanceKm) => setPlanner({ distanceKm })} />
        <p className="text-xs text-ink-mute">{t(p.shipping === "panels" ? "delivery.panelsHint" : "delivery.kitHint")}</p>
        {split && <Note>{t("delivery.split", { max: int(MAX_PANEL) })}</Note>}
        {d.craneAdvised && <Note>{t("delivery.crane")}</Note>}
      </Panel>
      <Panel title={t("delivery.cargo")}>
        <Stats>
          {a.cargo.map((c) => (
            <Stat key={c.key} label={t.dyn(`cargo.${c.key}`)} value={`${int(c.massKg)} ${t("unit.kg")} · ${one(c.volumeM3)} ${t("unit.m3")}`} />
          ))}
        </Stats>
      </Panel>
      <Panel title={t("delivery.vehicles")}>
        <ul className="flex flex-col gap-2">
          {d.options.map((o) => {
            const best = d.best?.vehicle.id === o.vehicle.id;
            return (
              <li key={o.vehicle.id} className={`flex flex-col gap-1 rounded-lg border p-3 text-sm ${best ? "border-primary bg-primary-soft" : "border-line"} ${o.fits ? "" : "opacity-60"}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold">
                    {t.dyn(`vehicle.${o.vehicle.id}`)} {best && <span className="text-xs text-primary">· {t("delivery.best")}</span>}
                  </span>
                  <span className="tabular-nums">{o.fits ? money(o.cost) : "—"}</span>
                </div>
                <span className="text-xs tabular-nums text-ink-mute">
                  {one(o.vehicle.payloadKg / 1000)} {t("unit.t")} · {one(o.vehicle.bedLength / 1000)} × {one(o.vehicle.bedWidth / 1000)} {t("unit.m")}
                  {o.fits ? ` · ${t("delivery.trips", { n: o.trips })}` : ` · ${t.dyn(`delivery.${o.reason}`)}`}
                  {o.fits && o.oversize ? ` · ${t("delivery.oversize")}` : ""}
                </span>
              </li>
            );
          })}
        </ul>
        <Note>{t("delivery.note")}</Note>
      </Panel>
    </>
  );
}
