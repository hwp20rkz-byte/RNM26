"use client";

import type { Opening, OpeningKind } from "@/domain/walls/types";
import { useT } from "@/i18n";
import { NumberInput, Select } from "./controls";
import { int } from "./format";

let seq = 0;
const newId = () => `o${Date.now().toString(36)}${(seq++).toString(36)}`;

const ALL: OpeningKind[] = ["window", "door", "gate"];

export function OpeningsEditor({ openings, wallLength, onChange, kinds = ALL }: { openings: Opening[]; wallLength: number; onChange: (o: Opening[]) => void; kinds?: OpeningKind[] }) {
  const t = useT();
  const update = (id: string, patch: Partial<Opening>) =>
    onChange(
      openings.map((o) => {
        if (o.id !== id) return o;
        const next = { ...o, ...patch };
        if (next.kind !== "window") next.sill = 0;
        else if (o.kind !== "window") next.sill = 900;
        return next;
      }),
    );
  const add = (kind: OpeningKind) => {
    const width = kind === "gate" ? 2500 : kind === "door" ? 900 : 1200;
    const last = [...openings].sort((a, b) => a.x + a.width - (b.x + b.width)).at(-1);
    const x = Math.min(last ? last.x + last.width + 600 : 600, Math.max(200, wallLength - width - 200));
    onChange([...openings, { id: newId(), kind, x, width, height: kind === "window" ? 1400 : kind === "door" ? 2100 : 2400, sill: kind === "window" ? 900 : 0 }]);
  };
  return (
    <div className="flex flex-col gap-3">
      {openings.length === 0 && <p className="text-sm text-ink-mute">{t("openings.none")}</p>}
      {openings.map((o, i) => (
        <div key={o.id} className="flex flex-col gap-2 rounded-lg bg-sunken p-3">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Select
                label={t("openings.n", { n: i + 1 })}
                value={o.kind}
                options={kinds.map((k) => ({ value: k, label: t.dyn(`opening.${k}`) }))}
                onChange={(kind) => update(o.id, { kind })}
              />
            </div>
            <button
              type="button"
              aria-label={t("openings.remove", { n: i + 1 })}
              onClick={() => onChange(openings.filter((x) => x.id !== o.id))}
              className="grid size-11 place-items-center rounded-lg text-ink-mute hover:bg-danger-soft hover:text-danger"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NumberInput label={t("openings.x")} unit={t("unit.mm")} value={o.x} min={0} max={wallLength} step={10} onChange={(x) => update(o.id, { x })} />
            <NumberInput label={t("openings.width")} unit={t("unit.mm")} value={o.width} min={300} max={wallLength} step={10} onChange={(width) => update(o.id, { width })} />
            <NumberInput label={t("openings.height")} unit={t("unit.mm")} value={o.height} min={300} max={4000} step={10} onChange={(height) => update(o.id, { height })} />
            {o.kind === "window" && <NumberInput label={t("openings.sill")} unit={t("unit.mm")} value={o.sill} min={0} max={2000} step={10} onChange={(sill) => update(o.id, { sill })} />}
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        {kinds.map((k) => (
          <button key={k} type="button" onClick={() => add(k)} className="min-h-11 rounded-lg px-3 text-sm font-medium text-primary hover:bg-primary-soft">
            + {t.dyn(`opening.${k}`)}
          </button>
        ))}
      </div>
      <p className="text-xs text-ink-mute">{t("openings.hint", { l: int(wallLength) })}</p>
    </div>
  );
}
