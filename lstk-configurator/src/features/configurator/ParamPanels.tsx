"use client";

import { PROFILE_CATALOG, findProfile } from "@/domain/profiles/catalog";
import { designation } from "@/domain/profiles/section";
import { PATTERNS_FOR_SHAPE, type TrussShape } from "@/domain/trusses/types";
import { useT } from "@/i18n";
import { useConfigurator, type LightingPreset } from "@/store/configurator";
import { NumberInput, Panel, Segmented, Select, Toggle } from "./controls";
import { OpeningsEditor } from "./OpeningsEditor";

function useProfileOptions() {
  const t = useT();
  return PROFILE_CATALOG.map((p) => ({
    value: p.id,
    label: designation(p),
    group: p.machineId ? t("profile.lineGroup") : `${t.dyn(`family.${p.family}`)} (${t("profile.notOnLine")})`,
  }));
}

export function WallPanel() {
  const t = useT();
  const { wall: w, setWall } = useConfigurator();
  const memberOptions = useProfileOptions().filter((o) => findProfile(o.value).family === "C");
  return (
    <>
      <Panel title={t("wall.title")}>
        <div className="grid grid-cols-2 gap-3">
          <NumberInput label={t("wall.length")} unit={t("unit.mm")} value={w.length} min={300} max={15000} step={10} onChange={(length) => setWall({ length })} />
          <NumberInput label={t("wall.height")} unit={t("unit.mm")} value={w.height} min={1000} max={6000} step={10} onChange={(height) => setWall({ height })} />
          <NumberInput label={t("shape.studSpacing")} unit={t("unit.mm")} value={w.studSpacing} min={300} max={1200} step={10} onChange={(studSpacing) => setWall({ studSpacing })} />
        </div>
        <Select label={t("shape.profile")} value={w.profileId} options={memberOptions} onChange={(profileId) => setWall({ profileId })} />
        <Toggle label={t("wall.noggings")} checked={w.noggings} onChange={(noggings) => setWall({ noggings })} />
      </Panel>
      <Panel title={t("wall.openings")}>
        <OpeningsEditor openings={w.openings} wallLength={w.length} onChange={(openings) => setWall({ openings })} />
      </Panel>
    </>
  );
}

export function TrussPanel() {
  const t = useT();
  const { truss, setTruss } = useConfigurator();
  const memberOptions = useProfileOptions().filter((o) => findProfile(o.value).family === "C");
  return (
    <Panel title={t("truss.panel")}>
      <Select
        label={t("truss.shape")}
        value={truss.shapeKind}
        options={(["triangular", "trapezoidal", "parallel", "mono"] as TrussShape["kind"][]).map((k) => ({ value: k, label: t.dyn(`trussShape.${k}`) }))}
        onChange={(shapeKind) => setTruss({ shapeKind })}
      />
      <Select label={t("shape.pattern")} value={truss.pattern} options={PATTERNS_FOR_SHAPE[truss.shapeKind].map((p) => ({ value: p, label: t.dyn(`pattern.${p}`) }))} onChange={(pattern) => setTruss({ pattern })} />
      <div className="grid grid-cols-2 gap-3">
        <NumberInput label={t("truss.span")} unit={t("unit.mm")} value={truss.span} min={1000} max={30000} step={10} onChange={(span) => setTruss({ span })} />
        {truss.shapeKind === "parallel" ? (
          <NumberInput label={t("wall.height")} unit={t("unit.mm")} value={truss.depth} min={200} max={4000} step={10} onChange={(depth) => setTruss({ depth })} />
        ) : (
          <NumberInput label={t("shape.pitch")} unit="°" value={truss.pitchDeg} min={2} max={60} step={0.5} onChange={(pitchDeg) => setTruss({ pitchDeg })} />
        )}
        {(truss.shapeKind === "trapezoidal" || truss.shapeKind === "mono") && (
          <NumberInput label={t("shape.heel")} unit={t("unit.mm")} value={truss.heelHeight} min={50} max={3000} step={10} onChange={(heelHeight) => setTruss({ heelHeight })} />
        )}
        {truss.pattern !== "fink" && <NumberInput label={t("shape.panels")} value={truss.panels} min={2} max={24} step={2} onChange={(panels) => setTruss({ panels })} />}
        <NumberInput label={t("shape.overhang")} unit={t("unit.mm")} value={truss.overhang} min={0} max={1500} step={10} onChange={(overhang) => setTruss({ overhang })} />
        <NumberInput label={t("shape.trussSpacing")} unit={t("unit.mm")} value={truss.spacing} min={300} max={1500} step={10} onChange={(spacing) => setTruss({ spacing })} />
        <NumberInput label={t("truss.maxPiece")} unit={t("unit.mm")} value={truss.maxPieceLength} min={1000} max={14000} step={100} onChange={(maxPieceLength) => setTruss({ maxPieceLength })} />
      </div>
      <Select label={t("truss.chordProfile")} value={truss.chordProfileId} options={memberOptions} onChange={(chordProfileId) => setTruss({ chordProfileId })} />
      <Select label={t("truss.webProfile")} value={truss.webProfileId} options={memberOptions} onChange={(webProfileId) => setTruss({ webProfileId })} />
    </Panel>
  );
}

export function ProfilePanel() {
  const t = useT();
  const { profile, setProfile } = useConfigurator();
  const options = useProfileOptions();
  return (
    <Panel title={t("mode.profile")}>
      <Select label={t("spec.section")} value={profile.profileId} options={options} onChange={(profileId) => setProfile({ profileId })} />
      <NumberInput label={t("wall.length")} unit={t("unit.mm")} value={profile.length} min={300} max={12000} onChange={(length) => setProfile({ length })} />
      <Toggle label={t("profile.service")} checked={profile.serviceHoles} onChange={(serviceHoles) => setProfile({ serviceHoles })} />
      <Toggle label={t("profile.slots")} checked={profile.thermalSlots} onChange={(thermalSlots) => setProfile({ thermalSlots })} />
      <Toggle label={t("profile.dimples")} checked={profile.endDimples} onChange={(endDimples) => setProfile({ endDimples })} />
    </Panel>
  );
}

export function ViewPanel() {
  const t = useT();
  const { mode, view, setView, building } = useConfigurator();
  return (
    <Panel title={t("view.title")}>
      <Segmented<LightingPreset>
        legend={t("view.light")}
        value={view.lighting}
        options={(["sunny", "dusk", "studio", "overcast"] as const).map((v) => ({ value: v, label: t.dyn(`light.${v}`) }))}
        onChange={(lighting) => setView({ lighting })}
      />
      {mode !== "profile" && (
        <Segmented
          legend={t("view.detail")}
          value={view.detail}
          options={[
            { value: "instanced", label: t("view.fast") },
            { value: "detailed", label: t("view.holes") },
          ]}
          onChange={(detail) => setView({ detail })}
        />
      )}
      {mode === "building" && (
        <>
          <Segmented
            legend={t("view.cut")}
            value={String(view.cut)}
            options={[{ value: "-1", label: t("view.all") }, ...building.levels.map((_, i) => ({ value: String(i), label: t("view.planN", { n: i + 1 }) }))]}
            onChange={(v) => setView({ cut: Number(v) })}
          />
          <Toggle label={t("view.skin")} checked={view.cladding} onChange={(cladding) => setView({ cladding })} />
          <Toggle label={t("view.props")} checked={view.props} onChange={(props) => setView({ props })} />
          <Toggle label={t("view.dims")} checked={view.dims} onChange={(dims) => setView({ dims })} />
        </>
      )}
      <Toggle label={t("view.grid")} checked={view.grid} onChange={(grid) => setView({ grid })} />
    </Panel>
  );
}
