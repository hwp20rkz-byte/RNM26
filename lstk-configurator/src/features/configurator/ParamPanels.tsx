"use client";

import { useState } from "react";
import { wallPlans } from "@/domain/buildings/generate";
import { BUILDING_PRESETS } from "@/domain/buildings/presets";
import { WALL_SIDE_LABEL, type WallSide } from "@/domain/buildings/types";
import { PROFILE_CATALOG, findProfile } from "@/domain/profiles/catalog";
import { designation } from "@/domain/profiles/section";
import type { ProfileFamily } from "@/domain/profiles/types";
import { PATTERNS_FOR_SHAPE, type TrussShape, type WebPattern } from "@/domain/trusses/types";
import { useConfigurator } from "@/store/configurator";
import { NumberInput, Panel, Segmented, Select, Toggle } from "./controls";
import { OpeningsEditor } from "./OpeningsEditor";

const FAMILY_LABEL: Record<ProfileFamily, string> = { C: "C — стойки, пояса", U: "U — направляющие", Z: "Z — прогоны", Hat: "Ω — обрешётка" };
const LINE_GROUP = "C89 — линия Golden Integrity";
export const profileOptions = PROFILE_CATALOG.map((p) => ({
  value: p.id,
  label: designation(p),
  group: p.machineId ? LINE_GROUP : `${FAMILY_LABEL[p.family]} (не на линии)`,
}));
const memberOptions = profileOptions.filter((o) => findProfile(o.value).family === "C");

const SHAPE_LABEL: Record<TrussShape["kind"], string> = { triangular: "Треугольная", trapezoidal: "Трапециевидная", parallel: "Параллельные пояса" };
export const PATTERN_LABEL: Record<WebPattern, string> = { fink: "Финк (W)", howe: "Хау", pratt: "Пратт", warren: "Уоррен" };

export function BuildingPanel() {
  const { building: b, presetId, applyPreset, setBuilding } = useConfigurator();
  const [side, setSide] = useState<WallSide>("front");
  const plans = wallPlans(b);
  const plan = plans.find((p) => p.side === side)!;
  return (
    <>
      <Panel title="Изделие">
        <Select label="Шаблон" value={presetId} options={BUILDING_PRESETS.map((p) => ({ value: p.id, label: p.name }))} onChange={applyPreset} />
        <div className="grid grid-cols-2 gap-3">
          <NumberInput label="Длина (по коньку)" unit="мм" value={b.length} min={1500} max={30000} step={10} onChange={(length) => setBuilding({ length })} />
          <NumberInput label="Ширина (пролёт)" unit="мм" value={b.width} min={1500} max={15000} step={10} onChange={(width) => setBuilding({ width })} />
          <NumberInput label={b.kind === "carport" ? "Высота до балки" : "Высота стен"} unit="мм" value={b.wallHeight} min={1800} max={6000} step={10} onChange={(wallHeight) => setBuilding({ wallHeight })} />
          <NumberInput label="Уклон кровли" unit="°" value={b.pitchDeg} min={5} max={60} step={0.5} onChange={(pitchDeg) => setBuilding({ pitchDeg })} />
          <NumberInput label="Шаг ферм" unit="мм" value={b.trussSpacing} min={300} max={1500} step={10} onChange={(trussSpacing) => setBuilding({ trussSpacing })} />
          {b.kind === "enclosed" ? (
            <NumberInput label="Шаг стоек" unit="мм" value={b.studSpacing} min={300} max={1200} step={10} onChange={(studSpacing) => setBuilding({ studSpacing })} />
          ) : (
            <NumberInput label="Шаг стоек навеса" unit="мм" value={b.postSpacing} min={1000} max={6000} step={10} onChange={(postSpacing) => setBuilding({ postSpacing })} />
          )}
          <NumberInput label="Свес кровли" unit="мм" value={b.overhang} min={0} max={1200} step={10} onChange={(overhang) => setBuilding({ overhang })} />
          <NumberInput label="Панелей фермы" value={b.trussPanels} min={2} max={16} step={2} onChange={(trussPanels) => setBuilding({ trussPanels })} />
        </div>
        <Select
          label="Решётка ферм"
          value={b.trussPattern}
          options={PATTERNS_FOR_SHAPE.triangular.map((p) => ({ value: p, label: PATTERN_LABEL[p] }))}
          onChange={(trussPattern) => setBuilding({ trussPattern })}
        />
      </Panel>
      {b.kind === "enclosed" && (
        <Panel title="Проёмы">
          <Select
            label="Стена"
            value={side}
            options={plans.map((p) => ({ value: p.side, label: `${p.mark} — ${WALL_SIDE_LABEL[p.side]}` }))}
            onChange={setSide}
          />
          <OpeningsEditor
            openings={b.openings[side]}
            wallLength={plan.length}
            onChange={(o) => setBuilding({ openings: { ...b.openings, [side]: o } })}
          />
        </Panel>
      )}
    </>
  );
}

export function WallPanel() {
  const { wall: w, setWall } = useConfigurator();
  return (
    <>
      <Panel title="Стеновая панель">
        <div className="grid grid-cols-2 gap-3">
          <NumberInput label="Длина" unit="мм" value={w.length} min={300} max={15000} step={10} onChange={(length) => setWall({ length })} />
          <NumberInput label="Высота" unit="мм" value={w.height} min={1000} max={6000} step={10} onChange={(height) => setWall({ height })} />
          <NumberInput label="Шаг стоек" unit="мм" value={w.studSpacing} min={300} max={1200} step={10} onChange={(studSpacing) => setWall({ studSpacing })} />
        </div>
        <Select label="Профиль" value={w.profileId} options={memberOptions} onChange={(profileId) => setWall({ profileId })} />
        <Toggle label="Ригели на середине высоты" checked={w.noggings} onChange={(noggings) => setWall({ noggings })} />
      </Panel>
      <Panel title="Проёмы">
        <OpeningsEditor openings={w.openings} wallLength={w.length} onChange={(openings) => setWall({ openings })} />
      </Panel>
    </>
  );
}

export function TrussPanel() {
  const { truss, setTruss } = useConfigurator();
  return (
    <Panel title="Ферма">
      <Select
        label="Форма"
        value={truss.shapeKind}
        options={(Object.keys(SHAPE_LABEL) as TrussShape["kind"][]).map((k) => ({ value: k, label: SHAPE_LABEL[k] }))}
        onChange={(shapeKind) => setTruss({ shapeKind })}
      />
      <Select
        label="Решётка"
        value={truss.pattern}
        options={PATTERNS_FOR_SHAPE[truss.shapeKind].map((p) => ({ value: p, label: PATTERN_LABEL[p] }))}
        onChange={(pattern) => setTruss({ pattern })}
      />
      <div className="grid grid-cols-2 gap-3">
        <NumberInput label="Пролёт" unit="мм" value={truss.span} min={1000} max={30000} step={10} onChange={(span) => setTruss({ span })} />
        {truss.shapeKind === "parallel" ? (
          <NumberInput label="Высота" unit="мм" value={truss.depth} min={200} max={4000} step={10} onChange={(depth) => setTruss({ depth })} />
        ) : (
          <NumberInput label="Уклон" unit="°" value={truss.pitchDeg} min={5} max={60} step={0.5} onChange={(pitchDeg) => setTruss({ pitchDeg })} />
        )}
        {truss.shapeKind === "trapezoidal" && (
          <NumberInput label="Высота на опоре" unit="мм" value={truss.heelHeight} min={50} max={3000} step={10} onChange={(heelHeight) => setTruss({ heelHeight })} />
        )}
        {truss.pattern !== "fink" && <NumberInput label="Панелей" value={truss.panels} min={2} max={24} step={2} onChange={(panels) => setTruss({ panels })} />}
        <NumberInput label="Свес" unit="мм" value={truss.overhang} min={0} max={1500} step={10} onChange={(overhang) => setTruss({ overhang })} />
        <NumberInput label="Шаг ферм" unit="мм" value={truss.spacing} min={300} max={1500} step={10} onChange={(spacing) => setTruss({ spacing })} />
        <NumberInput label="Макс. заготовка" unit="мм" value={truss.maxPieceLength} min={1000} max={14000} step={100} onChange={(maxPieceLength) => setTruss({ maxPieceLength })} />
      </div>
      <Select label="Профиль поясов" value={truss.chordProfileId} options={memberOptions} onChange={(chordProfileId) => setTruss({ chordProfileId })} />
      <Select label="Профиль решётки" value={truss.webProfileId} options={memberOptions} onChange={(webProfileId) => setTruss({ webProfileId })} />
    </Panel>
  );
}

export function ProfilePanel() {
  const { profile, setProfile } = useConfigurator();
  return (
    <Panel title="Профиль">
      <Select label="Сечение" value={profile.profileId} options={profileOptions} onChange={(profileId) => setProfile({ profileId })} />
      <NumberInput label="Длина" unit="мм" value={profile.length} min={300} max={12000} onChange={(length) => setProfile({ length })} />
      <Toggle label="Сервисные отверстия" checked={profile.serviceHoles} onChange={(serviceHoles) => setProfile({ serviceHoles })} />
      <Toggle label="Термопрорези в стенке" checked={profile.thermalSlots} onChange={(thermalSlots) => setProfile({ thermalSlots })} />
      <Toggle label="Димплы на концах" checked={profile.endDimples} onChange={(endDimples) => setProfile({ endDimples })} />
    </Panel>
  );
}

export function ViewPanel() {
  const { mode, view, setView } = useConfigurator();
  return (
    <Panel title="Вид">
      <Segmented
        legend="Освещение"
        value={view.lighting}
        options={[
          { value: "studio", label: "Студия" },
          { value: "sunny", label: "Солнце" },
          { value: "overcast", label: "Пасмурно" },
        ]}
        onChange={(lighting) => setView({ lighting })}
      />
      {mode !== "profile" && (
        <Segmented
          legend="Детализация"
          value={view.detail}
          options={[
            { value: "instanced", label: "Быстро" },
            { value: "detailed", label: "С отверстиями" },
          ]}
          onChange={(detail) => setView({ detail })}
        />
      )}
      {mode === "building" && <Toggle label="Обшивка (кровля, стены)" checked={view.cladding} onChange={(cladding) => setView({ cladding })} />}
      <Toggle label="Сетка 0,1 / 1 м" checked={view.grid} onChange={(grid) => setView({ grid })} />
    </Panel>
  );
}
