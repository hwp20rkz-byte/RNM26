"use client";

import { profileLabel } from "@/domain/bom/bom";
import { centrelineLength } from "@/domain/members/member";
import { sectionProperties } from "@/domain/profiles/section";
import { useT } from "@/i18n";
import { useConfigurator } from "@/store/configurator";
import { ACTIVE_MACHINE, type Scene } from "./buildScene";
import { NumberInput, Panel } from "./controls";
import { int, kn, one } from "./format";

export function ChecksPanel({ scene }: { scene: Scene }) {
  const t = useT();
  const errors = scene.machineIssues.filter((i) => i.level === "error");
  const warnings = scene.machineIssues.filter((i) => i.level === "warning");
  return (
    <Panel title={t("checks.title")}>
      <p className={`rounded-lg p-2 text-sm ${errors.length ? "bg-danger-soft text-danger" : "bg-ok-soft text-ok"}`}>
        {errors.length ? `! ${t("checks.bad")}` : `✓ ${t("checks.ok", { line: ACTIVE_MACHINE.shortName })}`}
      </p>
      {errors.map((i) => (
        <p key={i.text} className="text-sm text-danger">
          ! {i.text}
        </p>
      ))}
      {scene.featureIssues.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-lg bg-danger-soft p-2 text-sm text-danger" aria-label={t("checks.punching")}>
          {scene.featureIssues.slice(0, 5).map((x) => (
            <li key={x}>! {x}</li>
          ))}
          {scene.featureIssues.length > 5 && <li>… +{scene.featureIssues.length - 5}</li>}
        </ul>
      )}
      {warnings.map((i) => (
        <p key={i.text} className="text-xs text-ink-mute">
          ▲ {i.text}
        </p>
      ))}
      {warnings.length + errors.length > 0 && <p className="text-xs text-ink-mute">{t("checks.ruNote")}</p>}
    </Panel>
  );
}

export function TrussForcesPanel({ scene }: { scene: Scene }) {
  const t = useT();
  const { roofLoadKpa, setRoofLoad } = useConfigurator();
  const tr = scene.truss;
  if (!tr) return null;
  return (
    <Panel title={t("truss.title")}>
      <p className={`rounded-lg p-2 text-sm ${tr.determinacy.ok ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>
        {tr.determinacy.ok ? `✓ ${t("truss.stable")}` : `! ${t("truss.unstable")}`}
      </p>
      <NumberInput label={t("shape.roofLoad")} unit={t("unit.kpa")} value={roofLoadKpa} min={0} max={10} step={0.05} onChange={setRoofLoad} />
      {tr.forces && (
        <>
          <table className="w-full text-sm">
            <thead className="text-left text-ink-mute">
              <tr>
                <th className="py-1 font-medium">{t("truss.members")}</th>
                <th className="py-1 text-right font-medium">{t("truss.compression")}</th>
                <th className="py-1 text-right font-medium">{t("truss.tension")}</th>
              </tr>
            </thead>
            <tbody>
              {tr.forces.byRole.map((r) => (
                <tr key={r.role} className="border-t border-line">
                  <td className="py-1">{t.dyn(`bar.${r.role}`)}</td>
                  <td className="py-1 text-right tabular-nums">{r.maxCompression > 1 ? kn(r.maxCompression) : "—"}</td>
                  <td className="py-1 text-right tabular-nums">{r.maxTension > 1 ? kn(r.maxTension) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-sm">{t("truss.reaction", { r: kn(tr.forces.reactionN), s: int(tr.forces.spacing) })}</p>
        </>
      )}
      <p className="text-xs text-ink-mute">{t("truss.note")}</p>
    </Panel>
  );
}

export function SelectionCard({ scene }: { scene: Scene }) {
  const t = useT();
  const { selection, select } = useConfigurator();
  if (!selection) return null;
  const hit = scene.index.get(selection);
  if (!hit) return null;
  const m = hit.member;
  const length = centrelineLength(m);
  const kg = (sectionProperties(m.profile).massPerM * length) / 1000;
  const counts = new Map<string, number>();
  for (const f of m.features) counts.set(f.kind, (counts.get(f.kind) ?? 0) + 1);
  return (
    <div className="absolute right-4 top-16 w-72 max-w-[calc(100%-2rem)] rounded-xl border border-line bg-surface/95 p-4 text-sm shadow-lg backdrop-blur" role="status">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{t.dyn(`role.${m.role}`)}</p>
          <p className="text-xs text-ink-mute">
            {t("sel.assembly")} {hit.mark} · {m.id}
          </p>
        </div>
        <button type="button" aria-label={t("sel.clear")} onClick={() => select(null)} className="grid size-11 place-items-center rounded-md text-ink-mute hover:bg-sunken">
          ✕
        </button>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
        <dt className="text-ink-mute">{t("sel.profile")}</dt>
        <dd className="text-right">{profileLabel(m.profile.id)}</dd>
        <dt className="text-ink-mute">{t("sel.length")}</dt>
        <dd className="text-right tabular-nums">
          {one(length)} {t("unit.mm")}
        </dd>
        <dt className="text-ink-mute">{t("sel.mass")}</dt>
        <dd className="text-right tabular-nums">
          {one(kg)} {t("unit.kg")}
        </dd>
        {[...counts].map(([k, n]) => (
          <div key={k} className="contents">
            <dt className="text-ink-mute">{t.dyn(`op.${k}`)}</dt>
            <dd className="text-right tabular-nums">{n}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
