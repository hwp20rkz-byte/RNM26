"use client";

import { useState } from "react";
import { sideOpenings, wallPlans } from "@/domain/buildings/generate";
import { WALL_SIDES, type Partition, type RoomPurpose } from "@/domain/buildings/types";
import { interior, rooms, validatePartitions } from "@/domain/layout/rooms";
import { findProfile } from "@/domain/profiles/catalog";
import { useT } from "@/i18n";
import { PURPOSE_COLOR } from "@/render/skin";
import { useConfigurator } from "@/store/configurator";
import { NumberInput, Panel, Segmented, Select, Stat, Stats } from "../configurator/controls";
import { int, one } from "../configurator/format";

const PURPOSES: RoomPurpose[] = ["living", "bedroom", "kitchen", "bathroom", "hall", "storage", "technical", "rest", "steam", "washing", "garage", "workshop", "poultry", "open"];

let seq = 0;
const newId = (p: string) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;

/**
 * Floor plan editor: an SVG plan to scale (x along the building to the right,
 * the front wall at the bottom), partitions as a list with exact positions,
 * rooms picked by clicking the plan.
 */
export function LayoutPanel() {
  const t = useT();
  const s = useConfigurator();
  const b = s.building;
  const [level, setLevel] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const li = Math.min(level, b.levels.length - 1);
  const lv = b.levels[li]!;
  const profile = findProfile(b.profileId);
  const d = profile.family === "Hat" ? profile.depth : profile.web;
  const inner = interior(b, d);
  const enclosed = WALL_SIDES.every((x) => lv.sides[x].type === "wall");
  const rs = rooms(lv, inner, d, enclosed ? "living" : "open");
  const errors = validatePartitions(lv, inner, d);
  const room = rs.find((r) => r.key === picked) ?? null;
  const { length: L, width: W } = b;
  const pad = 600;
  // SVG y grows down: put the front wall (z = 0) at the bottom
  const Y = (z: number) => W - z;

  const setParts = (p: Partition[]) => {
    s.setPartitions(li, p);
    setPicked(null);
  };
  const add = (axis: "x" | "z") => {
    const span = axis === "x" ? [inner.x0, inner.x1] : [inner.z0, inner.z1];
    const taken = lv.partitions.filter((p) => p.axis === axis).map((p) => p.at);
    const stops = [span[0]!, ...taken.sort((a, c) => a - c), span[1]!];
    let best = 0;
    for (let i = 1; i < stops.length; i++) if (stops[i]! - stops[i - 1]! > stops[best + 1]! - stops[best]!) best = i - 1;
    const at = Math.round((stops[best]! + stops[best + 1]!) / 2 / 50) * 50;
    const run = axis === "x" ? inner.z1 - inner.z0 : inner.x1 - inner.x0;
    setParts([...lv.partitions, { id: newId("p"), axis, at, doors: run > 1800 ? [{ id: newId("d"), kind: "door", x: Math.round((run / 2 - 400) / 50) * 50, width: 800, height: 2000, sill: 0 }] : [] }]);
  };
  const update = (id: string, patch: Partial<Partition>) => setParts(lv.partitions.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  return (
    <>
      <Panel title={t("layout.plan")}>
        {b.levels.length > 1 && (
          <Segmented legend={t("shape.level")} value={String(li)} options={b.levels.map((_, i) => ({ value: String(i), label: t("shape.levelN", { n: i + 1 }) }))} onChange={(v) => setLevel(Number(v))} />
        )}
        <svg viewBox={`${-pad} ${-pad} ${L + 2 * pad} ${W + 2 * pad}`} className="w-full rounded-lg bg-sunken" role="img" aria-label={t("layout.plan")}>
          {/* outer walls */}
          <rect x={0} y={0} width={L} height={W} fill="none" stroke="hsl(var(--ink))" strokeWidth={d} />
          {rs.map((r) => {
            const name = t.dyn(`room.${r.purpose}`);
            // fit the name into the room: ~0.6 em per character
            const fs = Math.min(380, (r.x1 - r.x0) / (0.62 * Math.max(4, name.length)), (r.z1 - r.z0) / 4);
            return (
            <g key={r.key} onClick={() => setPicked(r.key)} className="cursor-pointer">
              <rect x={r.x0} y={Y(r.z1)} width={r.x1 - r.x0} height={r.z1 - r.z0} fill={PURPOSE_COLOR[r.purpose]} opacity={picked === r.key ? 0.95 : 0.6} stroke={picked === r.key ? "hsl(var(--primary))" : "none"} strokeWidth={60} />
              <text x={(r.x0 + r.x1) / 2} y={Y((r.z0 + r.z1) / 2) - fs * 0.2} textAnchor="middle" fontSize={fs} fill="hsl(var(--ink))" fontWeight={600}>
                {name}
              </text>
              <text x={(r.x0 + r.x1) / 2} y={Y((r.z0 + r.z1) / 2) + fs * 1.1} textAnchor="middle" fontSize={fs * 0.85} fill="hsl(var(--ink))">
                {one(r.area)} {t("unit.m2")}
              </text>
            </g>
            );
          })}
          {/* partitions */}
          {lv.partitions.map((p) =>
            p.axis === "x" ? (
              <line key={p.id} x1={p.at} x2={p.at} y1={Y(inner.z0)} y2={Y(inner.z1)} stroke="hsl(var(--ink))" strokeWidth={d} />
            ) : (
              <line key={p.id} x1={inner.x0} x2={inner.x1} y1={Y(p.at)} y2={Y(p.at)} stroke="hsl(var(--ink))" strokeWidth={d} />
            ),
          )}
          {/* partition doors: gaps */}
          {lv.partitions.flatMap((p) =>
            p.doors.map((o) =>
              p.axis === "x" ? (
                <line key={o.id} x1={p.at} x2={p.at} y1={Y(inner.z0 + o.x)} y2={Y(inner.z0 + o.x + o.width)} stroke="hsl(var(--sunken))" strokeWidth={d + 20} />
              ) : (
                <line key={o.id} x1={inner.x0 + o.x} x2={inner.x0 + o.x + o.width} y1={Y(p.at)} y2={Y(p.at)} stroke="hsl(var(--sunken))" strokeWidth={d + 20} />
              ),
            ),
          )}
          {/* outer openings */}
          {wallPlans(b, li).flatMap((plan) => {
            const cfg = lv.sides[plan.side];
            const ops = sideOpenings(cfg, plan.length, lv.height, b, profile);
            return ops.map((o) => {
              const c = o.kind === "window" ? "hsl(205 60% 55%)" : o.kind === "door" ? "hsl(var(--accent))" : "hsl(var(--ink-mute))";
              const a0 = o.x;
              const a1 = o.x + o.width;
              const seg =
                plan.side === "front"
                  ? [a0, Y(0), a1, Y(0)]
                  : plan.side === "back"
                    ? [L - a0, Y(W), L - a1, Y(W)]
                    : plan.side === "left"
                      ? [0, Y(W - d - a0), 0, Y(W - d - a1)]
                      : [L, Y(d + a0), L, Y(d + a1)];
              return <line key={`${plan.side}${o.id}`} x1={seg[0]} y1={seg[1]} x2={seg[2]} y2={seg[3]} stroke={c} strokeWidth={d + 40} />;
            });
          })}
          {/* overall dimensions */}
          <text x={L / 2} y={W + pad * 0.7} textAnchor="middle" fontSize={300} fill="hsl(var(--ink-mute))">
            {int(L)} · {t("side.front")}
          </text>
          <text x={-pad * 0.35} y={W / 2} textAnchor="middle" fontSize={300} fill="hsl(var(--ink-mute))" transform={`rotate(-90 ${-pad * 0.35} ${W / 2})`}>
            {int(W)}
          </text>
        </svg>
        <p className="text-xs text-ink-mute">{t("layout.clickHint")}</p>
        {errors.length > 0 && <p className="rounded-lg bg-danger-soft p-2 text-xs text-danger">{errors.join("; ")}</p>}
      </Panel>

      {room && (
        <Panel title={t("layout.room", { area: one(room.area) })}>
          <Select<RoomPurpose> label={t("layout.purpose")} value={room.purpose} options={PURPOSES.map((p) => ({ value: p, label: t.dyn(`room.${p}`) }))} onChange={(p) => s.setRoom(li, room.key, p)} />
          <p className="text-xs text-ink-mute">
            {one((room.x1 - room.x0) / 1000)} × {one((room.z1 - room.z0) / 1000)} {t("unit.m")} · {t("layout.perimeter")} {one(room.perimeter)} {t("unit.m")}
          </p>
        </Panel>
      )}

      <Panel title={t("layout.partitions")}>
        {lv.partitions.length === 0 && <p className="text-sm text-ink-mute">{t("layout.noPartitions")}</p>}
        {lv.partitions.map((p, i) => {
          const run = p.axis === "x" ? inner.z1 - inner.z0 : inner.x1 - inner.x0;
          const door = p.doors[0];
          return (
            <div key={p.id} className="flex flex-col gap-2 rounded-lg bg-sunken p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">
                  {i + 1}. {t.dyn(`layout.axis.${p.axis}`)}
                </span>
                <button type="button" aria-label={t("layout.remove")} onClick={() => setParts(lv.partitions.filter((x) => x.id !== p.id))} className="grid size-11 place-items-center rounded-lg text-ink-mute hover:bg-danger-soft hover:text-danger">
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumberInput
                  label={t(p.axis === "x" ? "layout.atX" : "layout.atZ")}
                  unit={t("unit.mm")}
                  value={p.at}
                  min={(p.axis === "x" ? inner.x0 : inner.z0) + 900}
                  max={(p.axis === "x" ? inner.x1 : inner.z1) - 900}
                  step={50}
                  onChange={(at) => update(p.id, { at })}
                />
                {door ? (
                  <NumberInput label={t("layout.doorAt")} unit={t("unit.mm")} value={door.x} min={0} max={run - door.width} step={50} onChange={(x) => update(p.id, { doors: [{ ...door, x }] })} />
                ) : (
                  <button type="button" onClick={() => update(p.id, { doors: [{ id: newId("d"), kind: "door", x: Math.max(0, Math.round((run / 2 - 400) / 50) * 50), width: 800, height: 2000, sill: 0 }] })} className="min-h-11 self-end rounded-lg text-sm font-medium text-primary hover:bg-primary-soft">
                    + {t("opening.door")}
                  </button>
                )}
              </div>
              {door && (
                <button type="button" onClick={() => update(p.id, { doors: [] })} className="min-h-11 self-start rounded-lg px-2 text-xs text-ink-mute hover:bg-surface">
                  {t("layout.noDoor")}
                </button>
              )}
            </div>
          );
        })}
        {enclosed ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => add("x")} className="min-h-11 rounded-lg px-3 text-sm font-medium text-primary hover:bg-primary-soft">
              + {t("layout.axis.x")}
            </button>
            <button type="button" onClick={() => add("z")} className="min-h-11 rounded-lg px-3 text-sm font-medium text-primary hover:bg-primary-soft">
              + {t("layout.axis.z")}
            </button>
          </div>
        ) : (
          <p className="text-xs text-ink-mute">{t("layout.openNoPartitions")}</p>
        )}
      </Panel>

      <Panel title={t("layout.rooms")}>
        <Stats>
          {rs.map((r) => (
            <Stat
              key={r.key}
              label={
                <span className="inline-flex items-center gap-2">
                  <span className="size-3 rounded-sm" style={{ background: PURPOSE_COLOR[r.purpose] }} />
                  {t.dyn(`room.${r.purpose}`)}
                </span>
              }
              value={`${one(r.area)} ${t("unit.m2")}`}
            />
          ))}
          <Stat strong label={t("layout.total")} value={`${one(rs.reduce((x, r) => x + r.area, 0))} ${t("unit.m2")}`} />
        </Stats>
      </Panel>
    </>
  );
}
