"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { PROFILE_CATALOG, findProfile } from "@/domain/profiles/catalog";
import { designation, sectionProperties } from "@/domain/profiles/section";
import type { ProfileFamily } from "@/domain/profiles/types";
import { PATTERNS_FOR_SHAPE, type TrussShape, type WebPattern } from "@/domain/trusses/types";
import { useConfigurator } from "@/store/configurator";
import { ACTIVE_MACHINE, buildProfileScene, buildTrussScene, cutList, metresByProfile, type SceneResult } from "./buildScene";
import { NumberInput, Panel, Segmented, Select, Toggle } from "./controls";

// WebGL only exists in the browser; static export pre-renders the shell without it
const Viewport = dynamic(() => import("@/features/viewport/Viewport"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-ink-mute">Загрузка 3D…</div>,
});

const FAMILY_LABEL: Record<ProfileFamily, string> = { C: "C — стойки, пояса", U: "U — направляющие", Z: "Z — прогоны", Hat: "Ω — обрешётка" };
const LINE_GROUP = "C89 — линия Golden Integrity";
const profileOptions = PROFILE_CATALOG.map((p) => ({
  value: p.id,
  label: designation(p),
  group: p.machineId ? LINE_GROUP : `${FAMILY_LABEL[p.family]} (не на линии)`,
}));
const memberOptions = profileOptions.filter((o) => findProfile(o.value).family === "C");

const SHAPE_LABEL: Record<TrussShape["kind"], string> = { triangular: "Треугольная", trapezoidal: "Трапециевидная", parallel: "Параллельные пояса" };
const PATTERN_LABEL: Record<WebPattern, string> = { fink: "Финк (W)", howe: "Хау", pratt: "Пратт", warren: "Уоррен" };
const ROLE_LABEL: Record<string, string> = { "top-chord": "Верхний пояс", "bottom-chord": "Нижний пояс", "truss-web": "Решётка", stud: "Профиль" };

const num = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });
const num0 = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });

export default function Configurator() {
  const { mode, profile, truss, view, setMode, setProfile, setTruss, setView } = useConfigurator();

  const scene = useMemo((): { result: SceneResult | null; error: string | null } => {
    try {
      return { result: mode === "profile" ? buildProfileScene(profile) : buildTrussScene(truss, view.detail), error: null };
    } catch (e) {
      return { result: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [mode, profile, truss, view.detail]);

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:flex-row">
      <aside className="relative order-2 flex w-full flex-col gap-4 overflow-y-auto border-line p-4 lg:order-1 lg:w-[400px] lg:shrink-0 lg:border-r">
        <header className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">ЛСТК · конфигуратор</p>
          <h1 className="text-lg font-bold">Параметрическая геометрия</h1>
          <p className="text-sm text-ink-mute">Профили и фермы строятся по параметрам; длины — по осевым линиям, без деталировки узлов.</p>
        </header>

        <Segmented
          legend="Что строим"
          value={mode}
          options={[
            { value: "truss", label: "Ферма" },
            { value: "profile", label: "Профиль" },
          ]}
          onChange={setMode}
        />

        {mode === "profile" ? (
          <Panel title="Профиль">
            <Select label="Сечение" value={profile.profileId} options={profileOptions} onChange={(profileId) => setProfile({ profileId })} />
            <NumberInput label="Длина" unit="мм" value={profile.length} min={300} max={12000} onChange={(length) => setProfile({ length })} />
            <Toggle label="Сервисные отверстия" checked={profile.serviceHoles} onChange={(serviceHoles) => setProfile({ serviceHoles })} />
            <Toggle label="Термопрорези в стенке" checked={profile.thermalSlots} onChange={(thermalSlots) => setProfile({ thermalSlots })} />
            <Toggle label="Димплы на концах" checked={profile.endDimples} onChange={(endDimples) => setProfile({ endDimples })} />
          </Panel>
        ) : (
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
              {truss.pattern !== "fink" && (
                <NumberInput label="Панелей" value={truss.panels} min={2} max={24} step={2} onChange={(panels) => setTruss({ panels })} />
              )}
              <NumberInput label="Свес" unit="мм" value={truss.overhang} min={0} max={1500} step={10} onChange={(overhang) => setTruss({ overhang })} />
              <NumberInput label="Макс. заготовка" unit="мм" value={truss.maxPieceLength} min={1000} max={14000} step={100} onChange={(maxPieceLength) => setTruss({ maxPieceLength })} />
            </div>
            <Select label="Профиль поясов" value={truss.chordProfileId} options={memberOptions} onChange={(chordProfileId) => setTruss({ chordProfileId })} />
            <Select label="Профиль решётки" value={truss.webProfileId} options={memberOptions} onChange={(webProfileId) => setTruss({ webProfileId })} />
          </Panel>
        )}

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
          {mode === "truss" && (
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
          <Toggle label="Сетка 0,1 / 1 м" checked={view.grid} onChange={(grid) => setView({ grid })} />
        </Panel>

        <Summary mode={mode} scene={scene} profileId={profile.profileId} />
        {scene.result && <MachinePanel issues={scene.result.machineIssues} />}
      </aside>

      <main className="relative order-1 h-[55dvh] w-full bg-viewport lg:order-2 lg:h-auto lg:flex-1">
        <Viewport object={scene.result?.object ?? null} lighting={view.lighting} grid={view.grid} />
        {scene.error && (
          <p role="alert" className="absolute inset-x-4 top-4 rounded-lg bg-danger-soft p-3 text-sm text-danger">
            {scene.error}
          </p>
        )}
      </main>
    </div>
  );
}

function Summary({ mode, scene, profileId }: { mode: string; scene: { result: SceneResult | null }; profileId: string }) {
  const r = scene.result;
  if (!r) return null;
  const issues = r.issues;

  if (mode === "profile") {
    const spec = findProfile(profileId);
    const p = sectionProperties(spec);
    const m = r.members[0]!;
    return (
      <Panel title={designation(spec)}>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-ink-mute">Площадь</dt>
          <dd className="text-right tabular-nums">{num.format(p.area)} мм²</dd>
          <dt className="text-ink-mute">Масса с цинком</dt>
          <dd className="text-right tabular-nums">{num.format(p.massPerM)} кг/м</dd>
          <dt className="text-ink-mute">Ширина штрипса</dt>
          <dd className="text-right tabular-nums">{num.format(p.developedWidth)} мм</dd>
          <dt className="text-ink-mute">Ix / Iy</dt>
          <dd className="text-right tabular-nums">
            {num.format(p.ix / 1e4)} / {num.format(p.iy / 1e4)} см⁴
          </dd>
          <dt className="text-ink-mute">Операций пробивки</dt>
          <dd className="text-right tabular-nums">{m.features.length}</dd>
        </dl>
        <Issues issues={issues.map((i) => i.reason)} />
      </Panel>
    );
  }

  const rows = cutList(r.members);
  const metres = metresByProfile(r.members);
  const mass = [...metres].reduce((a, [id, len]) => a + sectionProperties(findProfile(id)).massPerM * len, 0);
  const det = r.truss!.determinacy;
  return (
    <Panel title="Ферма: раскрой">
      <p className={`rounded-lg p-2 text-sm ${det.ok ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>
        {det.ok ? "✓ Геометрически неизменяема, статически определима" : "! Схема изменяема или неопределима"}
      </p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-ink-mute">Высота в коньке</dt>
        <dd className="text-right tabular-nums">{num0.format(r.truss!.model.height)} мм</dd>
        <dt className="text-ink-mute">Элементов</dt>
        <dd className="text-right tabular-nums">{r.members.length}</dd>
        <dt className="text-ink-mute">Погонаж</dt>
        <dd className="text-right tabular-nums">{num.format([...metres.values()].reduce((a, b) => a + b, 0))} м</dd>
        <dt className="text-ink-mute">Масса стали</dt>
        <dd className="text-right tabular-nums">{num.format(mass)} кг</dd>
        <dt className="text-ink-mute">Стыков пояса</dt>
        <dd className="text-right tabular-nums">{r.truss!.splices}</dd>
      </dl>
      <div className="max-h-72 overflow-auto rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface text-left text-ink-mute">
            <tr>
              <th className="p-2 font-medium">Элемент</th>
              <th className="p-2 text-right font-medium">Длина, мм</th>
              <th className="p-2 text-right font-medium">Шт.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-line">
                <td className="p-2">
                  {ROLE_LABEL[row.role] ?? row.role}
                  <span className="block text-xs text-ink-mute">{designation(findProfile(row.profileId))}</span>
                </td>
                <td className="p-2 text-right tabular-nums">{num.format(row.length)}</td>
                <td className="p-2 text-right tabular-nums">{row.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Issues issues={[...new Set(issues.map((i) => i.reason))]} />
      <p className="text-xs text-ink-mute">
        Схема проверяется только на неизменяемость. Подбор сечений под снег, ветер и сейсмику — следующий этап, с нормативными данными по региону.
      </p>
    </Panel>
  );
}

function Issues({ issues }: { issues: string[] }) {
  if (issues.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1 rounded-lg bg-danger-soft p-2 text-sm text-danger" aria-label="Замечания">
      {issues.slice(0, 6).map((t, i) => (
        <li key={i}>! {t}</li>
      ))}
      {issues.length > 6 && <li>… и ещё {issues.length - 6}</li>}
    </ul>
  );
}

function MachinePanel({ issues }: { issues: SceneResult["machineIssues"] }) {
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");
  return (
    <Panel title="Изготовление на линии">
      <p className="text-sm text-ink-mute">{ACTIVE_MACHINE.vendor.split(" (")[0]}, C89</p>
      <p className={`rounded-lg p-2 text-sm ${errors.length ? "bg-danger-soft text-danger" : "bg-ok-soft text-ok"}`}>
        {errors.length ? "! Нельзя изготовить на этой линии" : "✓ Профиль и операции есть на линии"}
      </p>
      {errors.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm text-danger">
          {errors.map((i) => (
            <li key={i.text}>! {i.text}</li>
          ))}
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
