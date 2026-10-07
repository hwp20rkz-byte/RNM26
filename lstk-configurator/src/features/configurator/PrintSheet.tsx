"use client";

import { profileLabel } from "@/domain/bom/bom";
import { useT } from "@/i18n";
import { useConfigurator } from "@/store/configurator";
import { ACTIVE_MACHINE, type Scene } from "./buildScene";
import { int, kn, money, one } from "./format";

/**
 * Commercial offer sheet, visible only when printing (browser "Save as PDF").
 * Carries the 3D snapshot taken right before printing.
 */
export function PrintSheet({ scene, snapshot }: { scene: Scene; snapshot: string | null }) {
  const t = useT();
  const s = useConfigurator();
  const { bom, analysis: a, truss } = scene;
  const date = new Date().toLocaleDateString(t.lang === "zh" ? "zh-CN" : t.lang === "kk" ? "kk-KZ" : "ru-RU");
  const title =
    s.mode === "building"
      ? `${t.dyn(`product.${s.building.productId}`)} ${one(s.building.length / 1000)} × ${one(s.building.width / 1000)} ${t("unit.m")}`
      : t.dyn(`mode.${s.mode}`);
  const groups = a ? [...new Set(a.lines.map((l) => l.group))] : [];
  return (
    <div className="hidden text-[12px] leading-snug text-ink print:block">
      <header className="mb-4 flex items-end justify-between border-b border-ink pb-2">
        <div>
          <p className="text-[11px] uppercase tracking-wider">{t("print.kicker")}</p>
          <h1 className="text-[20px] font-bold">{title}</h1>
        </div>
        <p>{date}</p>
      </header>
      {snapshot && <img src={snapshot} alt="3D" className="mb-4 max-h-[90mm] w-full object-contain" />}

      {a && (
        <>
          <table className="mb-4 w-full">
            <tbody>
              <tr>
                <td>{t("delivery.size")}</td>
                <td className="text-right">
                  {one(a.size.length / 1000)} × {one(a.size.width / 1000)} × {one(a.size.height / 1000)} {t("unit.m")}
                </td>
              </tr>
              <tr>
                <td>{t("shape.levels")}</td>
                <td className="text-right">
                  {a.building.levels.length} · {a.building.levels.map((l) => int(l.height)).join(" / ")} {t("unit.mm")}
                </td>
              </tr>
              <tr>
                <td>{t("shape.foundation")}</td>
                <td className="text-right">
                  {t.dyn(`foundation.${s.building.foundation.type}`)}, {t("shape.plinth").toLowerCase()} {int(s.building.foundation.plinth)} {t("unit.mm")}
                </td>
              </tr>
              <tr>
                <td>{t("shape.roof")}</td>
                <td className="text-right">
                  {t.dyn(`roof.${s.building.roof.type}`)}, {one(s.building.roof.pitchDeg)}°
                </td>
              </tr>
              <tr>
                <td>{t("climate.city")}</td>
                <td className="text-right">
                  {a.city.name[t.lang]}, t5 {one(a.city.t5)} °C
                </td>
              </tr>
              {a.thermal.assemblies.map((x) => (
                <tr key={x.element}>
                  <td>{t.dyn(`element.${x.element}`)}</td>
                  <td className="text-right">
                    R {one(x.rTotal)} ≥ {one(x.rRequired)} {t("unit.rUnit")}
                    {x.added ? ` · +${int(x.added)} ${t("unit.mm")}` : ""}
                  </td>
                </tr>
              ))}
              <tr>
                <td>{t("delivery.mass")}</td>
                <td className="text-right">
                  {one(a.delivery.massKg / 1000)} {t("unit.t")} · {a.delivery.best ? `${t.dyn(`vehicle.${a.delivery.best.vehicle.id}`)} × ${a.delivery.best.trips}` : ""}
                </td>
              </tr>
            </tbody>
          </table>

          <h2 className="mb-1 text-[14px] font-semibold">{t("estimate.lines")}</h2>
          <table className="mb-4 w-full border-collapse">
            <tbody>
              {groups.map((g) => (
                <tr key={g} className="border-b border-line">
                  <td>{t.dyn(`group.${g}`)}</td>
                  <td className="text-right">{money(a.lines.filter((l) => l.group === g).reduce((x, l) => x + l.amount, 0))}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td>{t("estimate.cost")}</td>
                <td className="text-right">{money(a.cost)}</td>
              </tr>
              <tr className="text-[14px] font-bold">
                <td>{t("estimate.price", { margin: s.planner.marginPct })}</td>
                <td className="text-right">{money(a.price)}</td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      <h2 className="mb-1 text-[14px] font-semibold">{t("spec.frame")}</h2>
      <table className="mb-4 w-full border-collapse">
        <thead>
          <tr className="border-b border-ink text-left">
            <th>{t("spec.section")}</th>
            <th className="text-right">{t("spec.pieces")}</th>
            <th className="text-right">{t("unit.m")}</th>
            <th className="text-right">{t("unit.kg")}</th>
          </tr>
        </thead>
        <tbody>
          {bom.profiles.map((p) => (
            <tr key={p.profileId}>
              <td>{p.designation}</td>
              <td className="text-right">{int(p.pieces)}</td>
              <td className="text-right">{one(p.metres)}</td>
              <td className="text-right">{one(p.massKg)}</td>
            </tr>
          ))}
          <tr className="border-t border-ink">
            <td>{t("spec.steelFasteners")}</td>
            <td />
            <td />
            <td className="text-right">{money(bom.totals.total)}</td>
          </tr>
        </tbody>
      </table>

      {truss?.forces && (
        <p className="mb-4">
          {t("print.truss", {
            q: one(s.roofLoadKpa),
            s: int(truss.forces.spacing),
            n: kn(truss.forces.byRole.find((r) => r.role === "top-chord")?.maxCompression ?? 0),
            r: kn(truss.forces.reactionN),
          })}
        </p>
      )}

      <footer className="border-t border-ink pt-2 text-[10px]">{t("print.footer", { profile: profileLabel(bom.profiles[0]?.profileId ?? "C89x41x11x0.95"), line: ACTIVE_MACHINE.shortName })}</footer>
    </div>
  );
}
