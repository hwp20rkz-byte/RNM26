"use client";

import { profileLabel } from "@/domain/bom/bom";
import { roleLabel } from "@/domain/exports/csv";
import { centrelineLength } from "@/domain/members/member";
import { sectionProperties } from "@/domain/profiles/section";
import { useConfigurator } from "@/store/configurator";
import { ACTIVE_MACHINE, type Scene } from "./buildScene";
import { NumberInput, Panel } from "./controls";
import { int, kn, one } from "./format";

const BAR_ROLE: Record<string, string> = { "top-chord": "Верхний пояс", "bottom-chord": "Нижний пояс", vertical: "Стойки решётки", diagonal: "Раскосы" };

export function ChecksPanel({ scene }: { scene: Scene }) {
  const errors = scene.machineIssues.filter((i) => i.level === "error");
  const warnings = scene.machineIssues.filter((i) => i.level === "warning");
  return (
    <Panel title="Проверки">
      <p className={`rounded-lg p-2 text-sm ${errors.length ? "bg-danger-soft text-danger" : "bg-ok-soft text-ok"}`}>
        {errors.length ? "! Есть детали, которые линия C89 не изготовит" : `✓ Все детали изготавливаются на линии ${ACTIVE_MACHINE.shortName}`}
      </p>
      {errors.map((i) => (
        <p key={i.text} className="text-sm text-danger">
          ! {i.text}
        </p>
      ))}
      {scene.featureIssues.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-lg bg-danger-soft p-2 text-sm text-danger" aria-label="Замечания по пробивке">
          {scene.featureIssues.slice(0, 5).map((t) => (
            <li key={t}>! {t}</li>
          ))}
          {scene.featureIssues.length > 5 && <li>… и ещё {scene.featureIssues.length - 5}</li>}
        </ul>
      )}
      {warnings.map((i) => (
        <p key={i.text} className="text-xs text-ink-mute">
          ▲ {i.text}
        </p>
      ))}
    </Panel>
  );
}

export function TrussForcesPanel({ scene }: { scene: Scene }) {
  const { roofLoadKpa, setRoofLoad } = useConfigurator();
  const t = scene.truss;
  if (!t) return null;
  return (
    <Panel title="Ферма: схема и усилия">
      <p className={`rounded-lg p-2 text-sm ${t.determinacy.ok ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>
        {t.determinacy.ok ? "✓ Геометрически неизменяема, статически определима" : "! Схема изменяема или неопределима"}
      </p>
      <NumberInput label="Расчётная нагрузка на кровлю (в плане)" unit="кПа" value={roofLoadKpa} min={0} max={10} step={0.05} onChange={setRoofLoad} />
      {t.forces && (
        <>
          <table className="w-full text-sm">
            <thead className="text-left text-ink-mute">
              <tr>
                <th className="py-1 font-medium">Элементы</th>
                <th className="py-1 text-right font-medium">Сжатие</th>
                <th className="py-1 text-right font-medium">Растяжение</th>
              </tr>
            </thead>
            <tbody>
              {t.forces.byRole.map((r) => (
                <tr key={r.role} className="border-t border-line">
                  <td className="py-1">{BAR_ROLE[r.role] ?? r.role}</td>
                  <td className="py-1 text-right tabular-nums">{r.maxCompression > 1 ? kn(r.maxCompression) : "—"}</td>
                  <td className="py-1 text-right tabular-nums">{r.maxTension > 1 ? kn(r.maxTension) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-sm">
            Опорная реакция: <span className="tabular-nums">{kn(t.forces.reactionN)}</span> при шаге {int(t.forces.spacing)} мм
          </p>
        </>
      )}
      <p className="text-xs text-ink-mute">
        Нагрузку вводите по СП РК для вашего района, с коэффициентами сочетаний. Узлы считаются шарнирными. Это усилия, а не проверка сечения: устойчивость C89, местную потерю устойчивости и узлы проверяет проектировщик.
      </p>
    </Panel>
  );
}

export function SelectionCard({ scene }: { scene: Scene }) {
  const { selection, select } = useConfigurator();
  if (!selection) return null;
  const hit = scene.index.get(selection);
  if (!hit) return null;
  const m = hit.member;
  const length = centrelineLength(m);
  const kg = (sectionProperties(m.profile).massPerM * length) / 1000;
  const counts = new Map<string, number>();
  for (const f of m.features) counts.set(f.kind, (counts.get(f.kind) ?? 0) + 1);
  const OPS: Record<string, string> = { dimple: "димплы", swage: "обжатия", "service-hole": "сервисные отв.", "bolt-hole": "болтовые отв.", "web-slot": "термопрорези", "lip-cut": "подрезки отгиба", "flange-cut": "подрезки полки" };
  return (
    <div className="absolute right-4 top-4 w-72 rounded-xl border border-line bg-surface/95 p-4 text-sm shadow-lg backdrop-blur" role="status">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{roleLabel(m.role)}</p>
          <p className="text-xs text-ink-mute">
            Сборка {hit.mark} · {m.id}
          </p>
        </div>
        <button type="button" aria-label="Снять выделение" onClick={() => select(null)} className="grid size-8 place-items-center rounded-md text-ink-mute hover:bg-sunken">
          ✕
        </button>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
        <dt className="text-ink-mute">Профиль</dt>
        <dd className="text-right">{profileLabel(m.profile.id)}</dd>
        <dt className="text-ink-mute">Длина реза</dt>
        <dd className="text-right tabular-nums">{one(length)} мм</dd>
        <dt className="text-ink-mute">Масса</dt>
        <dd className="text-right tabular-nums">{one(kg)} кг</dd>
        {[...counts].map(([k, n]) => (
          <div key={k} className="contents">
            <dt className="text-ink-mute">{OPS[k] ?? k}</dt>
            <dd className="text-right tabular-nums">{n}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
