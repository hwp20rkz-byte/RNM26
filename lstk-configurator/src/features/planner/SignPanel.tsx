"use client";

import { SIGN_OFF, signPreset, type SignFont, type SignPlace, type SignSettings, type SignStyle } from "@/domain/signage/sign";
import type { Analysis } from "@/domain/planner/analyze";
import { useT } from "@/i18n";
import { useConfigurator } from "@/store/configurator";
import { Note, NumberInput, Panel, Segmented, Stat, Stats, Toggle } from "../configurator/controls";
import { int, money, one } from "../configurator/format";

const SWATCHES = ["#ffffff", "#16263d", "#c81e3a", "#f2b705", "#0f7b5f", "#111111", "#2f6fdb", "#e8590c"];

function Colour({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-sm text-ink-mute">{label}</legend>
      <div className="flex flex-wrap items-center gap-2">
        {SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={c}
            aria-pressed={value.toLowerCase() === c}
            onClick={() => onChange(c)}
            className={`size-11 rounded-lg border-2 ${value.toLowerCase() === c ? "border-primary" : "border-line"}`}
            style={{ background: c }}
          />
        ))}
        <input type="color" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-14 cursor-pointer rounded-lg border border-line bg-surface" />
      </div>
    </fieldset>
  );
}

/** Facade sign constructor: text, style, font, colours, light, size and place, with cost and power */
export function SignPanel({ a }: { a: Analysis }) {
  const t = useT();
  const { planner, setPlanner, building } = useConfigurator();
  const s: SignSettings = { ...SIGN_OFF, ...planner.sign };
  const set = (patch: Partial<SignSettings>) => setPlanner({ sign: { ...s, ...patch } });
  const l = a.sign;
  return (
    <Panel title={t("sign.title")}>
      <Toggle label={t("sign.enabled")} checked={s.enabled} onChange={(enabled) => setPlanner({ sign: enabled && !s.text ? signPreset(building.productId) : { ...s, enabled } })} />
      {s.enabled && (
        <>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-ink-mute">{t("sign.text")}</span>
            <input value={s.text} maxLength={28} onChange={(e) => set({ text: e.target.value })} className="min-h-11 rounded-lg border border-line bg-surface px-3 text-base" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-ink-mute">{t("sign.sub")}</span>
            <input value={s.sub} maxLength={48} onChange={(e) => set({ sub: e.target.value })} className="min-h-11 rounded-lg border border-line bg-surface px-3 text-base" />
          </label>
          <Segmented<SignStyle> legend={t("sign.style")} value={s.style} options={(["letters", "lightbox", "panel"] as const).map((v) => ({ value: v, label: t.dyn(`sign.style.${v}`) }))} onChange={(style) => set({ style })} />
          <Segmented<SignFont> legend={t("sign.font")} value={s.font} options={(["condensed", "sans", "serif"] as const).map((v) => ({ value: v, label: t.dyn(`sign.font.${v}`) }))} onChange={(font) => set({ font })} />
          <Segmented<SignPlace> legend={t("sign.place")} value={s.place} options={(["entrance", "frieze", "pylon"] as const).map((v) => ({ value: v, label: t.dyn(`sign.place.${v}`) }))} onChange={(place) => set({ place })} />
          <Colour label={t("sign.color")} value={s.color} onChange={(color) => set({ color })} />
          <Colour label={t("sign.background")} value={s.background} onChange={(background) => set({ background })} />
          <NumberInput label={t("sign.height")} value={s.height} min={150} max={1500} step={50} unit={t("unit.mm")} onChange={(height) => set({ height })} />
          <Toggle label={t("sign.lit")} checked={s.lit} onChange={(lit) => set({ lit })} />
          <Toggle label={t("sign.interior")} checked={s.interior} onChange={(interior) => set({ interior })} />
          {l && (
            <Stats>
              <Stat label={t("sign.size")} value={`${one(l.width / 1000)} × ${one(l.height / 1000)} ${t("unit.m")}`} />
              <Stat label={t("sign.read")} value={`≈ ${int(l.readM)} ${t("unit.m")}`} />
              {l.ledW > 0 && <Stat label={t("sign.power")} value={`${int(l.ledW)} ${t("unit.w")}`} />}
              <Stat label={t("sign.cost")} value={money(l.cost)} strong />
            </Stats>
          )}
          {l?.notes.map((n) => (
            <Note key={n} tone={n === "permit" ? "mute" : "warn"}>
              {t.dyn(`sign.note.${n}`)}
            </Note>
          ))}
        </>
      )}
    </Panel>
  );
}
