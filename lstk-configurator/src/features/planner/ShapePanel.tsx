"use client";

import { useState } from "react";
import { wallPlans } from "@/domain/buildings/generate";
import { WALL_SIDES, type FoundationType, type HeatingMode, type RoofType, type SideType, type WallSide } from "@/domain/buildings/types";
import { PROFILE_CATALOG } from "@/domain/profiles/catalog";
import { designation } from "@/domain/profiles/section";
import { PATTERNS_FOR_SHAPE, type WebPattern } from "@/domain/trusses/types";
import { useT } from "@/i18n";
import { useConfigurator } from "@/store/configurator";
import { NumberInput, Panel, Segmented, Select } from "../configurator/controls";
import { OpeningsEditor } from "../configurator/OpeningsEditor";

const LINE_PROFILES = PROFILE_CATALOG.filter((p) => p.machineId).map((p) => ({ value: p.id, label: designation(p) }));

export function ShapePanel() {
  const t = useT();
  const s = useConfigurator();
  const b = s.building;
  const [level, setLevel] = useState(0);
  const [side, setSide] = useState<WallSide>("front");
  const li = Math.min(level, b.levels.length - 1);
  const lv = b.levels[li]!;
  const cfg = lv.sides[side];
  const plan = wallPlans(b, li).find((p) => p.side === side)!;
  const anyOpen = b.levels.some((l) => WALL_SIDES.some((x) => l.sides[x].type !== "wall"));
  const patterns = (b.roof.type === "mono" ? PATTERNS_FOR_SHAPE.mono : PATTERNS_FOR_SHAPE.triangular).map((p) => ({ value: p, label: t.dyn(`pattern.${p}`) }));

  return (
    <>
      <Panel title={t("shape.size")}>
        <div className="grid grid-cols-2 gap-3">
          <NumberInput label={t("shape.length")} unit={t("unit.mm")} value={b.length} min={1500} max={30000} step={100} onChange={(length) => s.setBuilding({ length })} />
          <NumberInput label={t("shape.width")} unit={t("unit.mm")} value={b.width} min={1500} max={15000} step={100} onChange={(width) => s.setBuilding({ width })} />
        </div>
        <Segmented
          legend={t("shape.levels")}
          value={String(b.levels.length) as "1" | "2"}
          options={[
            { value: "1", label: t("shape.level1") },
            { value: "2", label: t("shape.level2") },
          ]}
          onChange={(n) => {
            s.setLevelCount(Number(n));
            setLevel(0);
          }}
        />
        <div className="grid grid-cols-2 gap-3">
          {b.levels.map((l, i) => (
            <NumberInput key={i} label={t("shape.levelHeight", { n: i + 1 })} unit={t("unit.mm")} value={l.height} min={1000} max={6000} step={50} onChange={(height) => s.setLevel(i, { height })} />
          ))}
        </div>
        <Select<HeatingMode>
          label={t("shape.use")}
          value={b.heating}
          options={(["permanent", "seasonal", "bath", "none"] as const).map((v) => ({ value: v, label: t.dyn(`heating.${v}`) }))}
          onChange={(heating) => s.setBuilding({ heating })}
        />
      </Panel>

      <Panel title={t("shape.foundation")}>
        <Select<FoundationType>
          label={t("shape.foundationType")}
          value={b.foundation.type}
          options={(["screw-piles", "strip", "slab", "none"] as const).map((v) => ({ value: v, label: t.dyn(`foundation.${v}`) }))}
          onChange={(type) => s.setFoundation({ type, plinth: type === "none" ? 0 : b.foundation.plinth || 300 })}
        />
        {b.foundation.type !== "none" && (
          <NumberInput label={t("shape.plinth")} unit={t("unit.mm")} value={b.foundation.plinth} min={0} max={1500} step={50} onChange={(plinth) => s.setFoundation({ plinth })} />
        )}
        <p className="text-xs text-ink-mute">{t.dyn(`foundation.hint.${b.foundation.type}`)}</p>
      </Panel>

      <Panel title={t("shape.roof")}>
        <Segmented<RoofType>
          legend={t("shape.roofType")}
          value={b.roof.type}
          options={[
            { value: "gable", label: t("roof.gable") },
            { value: "mono", label: t("roof.mono") },
          ]}
          onChange={(type) => s.setRoof({ type, pattern: type === "mono" && b.roof.pattern === "fink" ? "pratt" : b.roof.pattern, pitchDeg: type === "mono" ? Math.min(b.roof.pitchDeg, 20) : b.roof.pitchDeg })}
        />
        <div className="grid grid-cols-2 gap-3">
          <NumberInput label={t("shape.pitch")} unit="°" value={b.roof.pitchDeg} min={b.roof.type === "mono" ? 2 : 5} max={b.roof.type === "mono" ? 45 : 60} step={0.5} onChange={(pitchDeg) => s.setRoof({ pitchDeg })} />
          <NumberInput label={t("shape.overhang")} unit={t("unit.mm")} value={b.roof.overhang} min={0} max={1200} step={50} onChange={(overhang) => s.setRoof({ overhang })} />
          {b.roof.type === "mono" && <NumberInput label={t("shape.heel")} unit={t("unit.mm")} value={b.roof.heelHeight} min={100} max={2000} step={50} onChange={(heelHeight) => s.setRoof({ heelHeight })} />}
          <NumberInput label={t("shape.panels")} value={b.roof.panels} min={2} max={16} step={2} onChange={(panels) => s.setRoof({ panels })} />
        </div>
        <Select<WebPattern> label={t("shape.pattern")} value={b.roof.pattern} options={patterns} onChange={(pattern) => s.setRoof({ pattern })} />
      </Panel>

      <Panel title={t("shape.sides")}>
        {b.levels.length > 1 && (
          <Segmented
            legend={t("shape.level")}
            value={String(li)}
            options={b.levels.map((_, i) => ({ value: String(i), label: t("shape.levelN", { n: i + 1 }) }))}
            onChange={(v) => setLevel(Number(v))}
          />
        )}
        <Segmented<WallSide> legend={t("shape.side")} value={side} options={WALL_SIDES.map((x) => ({ value: x, label: t.dyn(`side.${x}`) }))} onChange={setSide} />
        {li === 0 && (
          <Segmented<SideType>
            legend={t("shape.sideType")}
            value={cfg.type}
            options={(["wall", "half", "open"] as const).map((v) => ({ value: v, label: t.dyn(`sideType.${v}`) }))}
            onChange={(type) => s.setSide(li, side, { type, openings: type === "wall" ? cfg.openings : cfg.openings.filter((o) => o.kind !== "window") })}
          />
        )}
        {cfg.type === "open" ? (
          <p className="text-xs text-ink-mute">{t("shape.openHint")}</p>
        ) : (
          <OpeningsEditor openings={cfg.openings} wallLength={plan.length} kinds={cfg.type === "half" ? ["door"] : undefined} onChange={(openings) => s.setSide(li, side, { openings })} />
        )}
        {cfg.type === "half" && <p className="text-xs text-ink-mute">{t("shape.halfHint")}</p>}
      </Panel>

      <Panel title={t("shape.frame")}>
        <Select label={t("shape.profile")} value={b.profileId} options={LINE_PROFILES} onChange={(profileId) => s.setBuilding({ profileId })} />
        <div className="grid grid-cols-2 gap-3">
          <NumberInput label={t("shape.studSpacing")} unit={t("unit.mm")} value={b.studSpacing} min={300} max={1200} step={50} onChange={(studSpacing) => s.setBuilding({ studSpacing })} />
          <NumberInput label={t("shape.trussSpacing")} unit={t("unit.mm")} value={b.trussSpacing} min={300} max={1500} step={50} onChange={(trussSpacing) => s.setBuilding({ trussSpacing })} />
          {anyOpen && <NumberInput label={t("shape.postSpacing")} unit={t("unit.mm")} value={b.postSpacing} min={1000} max={6000} step={100} onChange={(postSpacing) => s.setBuilding({ postSpacing })} />}
          {anyOpen && <NumberInput label={t("shape.parapet")} unit={t("unit.mm")} value={b.parapet} min={300} max={1500} step={50} onChange={(parapet) => s.setBuilding({ parapet })} />}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberInput label={t("shape.roofLoad")} unit={t("unit.kpa")} value={s.roofLoadKpa} min={0} max={10} step={0.1} onChange={s.setRoofLoad} />
        </div>
      </Panel>
    </>
  );
}
