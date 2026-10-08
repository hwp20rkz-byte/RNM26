"use client";

import { ArrowsOutLineHorizontal, Cube, Eye, HouseLine, SignOut, Stack, Sun } from "@phosphor-icons/react";
import { useReducedMotion } from "motion/react";
import { UNIT, type Analysis } from "@/domain/planner/analyze";
import { useT } from "@/i18n";
import { useConfigurator, type LightingPreset } from "@/store/configurator";
import { one } from "../configurator/format";
import AnimatedList from "../bits/AnimatedList";
import BlurText from "../bits/BlurText";
import CountUp from "../bits/CountUp";
import Dock from "../bits/Dock";
import SpotlightCard from "../bits/SpotlightCard";
import StatusMark from "../bits/StatusMark";

/**
 * Presentation (Design Mode): the model fills the screen and turns slowly, the
 * key numbers count up once, features sit in spotlight cards, the estimate
 * sections scroll in a list, and a dock drives the camera. React Bits
 * components (MIT + Commons Clause) are used inside the app only. Every
 * animation collapses to static under prefers-reduced-motion.
 */

const LIGHTS: LightingPreset[] = ["sunny", "dusk", "overcast", "studio"];

function Kpi({ label, value, unit, decimals = 1 }: { label: string; value: number; unit: string; decimals?: number }) {
  const reduce = useReducedMotion();
  const v = decimals ? Math.round(value * 10 ** decimals) / 10 ** decimals : Math.round(value);
  return (
    <div className="flex flex-col">
      <span className="text-xs text-ink-mute">{label}</span>
      <span className="text-lg font-bold tabular-nums">
        {reduce ? one(v) : <CountUp to={v} duration={1.2} separator=" " />} <span className="text-sm font-medium text-ink-mute">{unit}</span>
      </span>
    </div>
  );
}

export function Presentation({ a }: { a: Analysis }) {
  const t = useT();
  const s = useConfigurator();
  const reduce = useReducedMotion();
  const exit = () => s.setPresentation(false);
  // Frame erection by a crew of four, 8-hour days
  const days = Math.max(1, Math.ceil(((a.bom.totals.massWithScrapKg / 1000) * UNIT.siteHoursPerT[a.settings.shipping]) / 32));
  const title = `${t.dyn(`product.${s.building.productId}`)} ${one(s.building.length / 1000)} × ${one(s.building.width / 1000)} ${t("unit.m")}`;
  const items = a.estimate.sections.map((x) => `${t.dyn(`estsec.${x.id}`)}  ${one(x.total / 1e6)} ${t("unit.mlnTg")}`);
  const nextLight = () => s.setView({ lighting: LIGHTS[(LIGHTS.indexOf(s.view.lighting) + 1) % LIGHTS.length]! });
  return (
    <>
      <aside className="pointer-events-auto absolute left-4 top-4 flex max-h-[calc(100%-7rem)] w-[min(380px,calc(100%-2rem))] flex-col gap-4 overflow-y-auto rounded-2xl border border-line bg-surface/90 p-5 shadow-lg backdrop-blur">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">{a.city.name[t.lang]}</p>
          {reduce ? <h2 className="text-lg font-bold">{title}</h2> : <BlurText key={title} text={title} className="text-lg font-bold" animateBy="words" delay={60} />}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Kpi label={t("dm.price")} value={a.price / 1e6} unit={t("unit.mlnTg")} />
          <Kpi label={t("dm.area")} value={a.areas.floor || a.areas.footprint} unit={t("unit.m2")} />
          <Kpi label={t("dm.mass")} value={a.delivery.massKg / 1000} unit={t("unit.t")} />
          <Kpi label={t("dm.term")} value={days} unit={t("dm.days")} decimals={0} />
          {a.heatingPerYear > 0 && <Kpi label={t("dm.energy")} value={a.heatingPerYear / 1000} unit={t("unit.thTg")} decimals={0} />}
        </div>
        <StatusMark status={a.design.ok ? "done" : "failed"} label={a.design.ok ? t("calc.allOk", { u: Math.round(a.design.worst * 100) }) : t("calc.notOk")} />
        <div>
          <h3 className="mb-2 text-sm font-semibold">{t("dm.features")}</h3>
          <div className="grid grid-cols-2 gap-2">
            {(["dm.f1", "dm.f2", "dm.f3", "dm.f4"] as const).map((k) => (
              <SpotlightCard key={k} className="!p-3 text-sm" spotlightColor="rgba(31, 78, 140, 0.18)">
                {t(k)}
              </SpotlightCard>
            ))}
          </div>
        </div>
        <AnimatedList items={items} showGradients={false} enableArrowNavigation={false} displayScrollbar={false} className="!w-full" itemClassName="!p-2 text-sm" />
      </aside>
      <div className="pointer-events-auto absolute inset-x-0 bottom-2 flex justify-center">
        <Dock
          panelHeight={60}
          baseItemSize={44}
          magnification={reduce ? 44 : 60}
          items={[
            { icon: <Cube size={22} />, label: t("cam.iso"), onClick: () => s.look("iso") },
            { icon: <HouseLine size={22} />, label: t("cam.front"), onClick: () => s.look("front") },
            { icon: <ArrowsOutLineHorizontal size={22} />, label: t("cam.side"), onClick: () => s.look("side") },
            { icon: <Eye size={22} />, label: t("cam.top"), onClick: () => s.look("top") },
            { icon: <Sun size={22} />, label: t("view.light"), onClick: nextLight },
            { icon: <Stack size={22} />, label: t("view.explode"), onClick: () => s.setView({ explode: s.view.explode > 0 ? 0 : 0.6 }) },
            { icon: <SignOut size={22} />, label: t("dm.exit"), onClick: exit },
          ]}
        />
      </div>
    </>
  );
}
