"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { projectOf, useConfigurator } from "@/store/configurator";
import { buildScene, type Scene } from "./buildScene";
import { ChecksPanel, SelectionCard, TrussForcesPanel } from "./Checks";
import { Range, Segmented } from "./controls";
import { BuildingPanel, ProfilePanel, TrussPanel, ViewPanel, WallPanel } from "./ParamPanels";
import { PrintSheet } from "./PrintSheet";
import { SpecPanel } from "./SpecPanel";
import { int, money, one } from "./format";

// WebGL only exists in the browser; static export pre-renders the shell without it
const Viewport = dynamic(() => import("@/features/viewport/Viewport"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-ink-mute">Загрузка 3D…</div>,
});

function useHydrated() {
  // The store restores the project from localStorage on the client; render the
  // model only after that, so the first build is the user's project, not the default
  const [ok, setOk] = useState(false);
  useEffect(() => setOk(true), []);
  return ok;
}

export default function Configurator() {
  const state = useConfigurator();
  const { mode, tab, view, selection, setMode, setTab, setView, select } = state;
  const hydrated = useHydrated();
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [printRequest, setPrintRequest] = useState(0);

  // Rebuild only when the project changes — not on tab/selection/explode
  const project = projectOf(state);
  const key = JSON.stringify({ ...project, view: { ...project.view, explode: 0, lighting: "", grid: false } });
  const scene = useMemo((): { result: Scene | null; error: string | null } => {
    try {
      return { result: buildScene(JSON.parse(key)), error: null };
    } catch (e) {
      return { result: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [key]);

  const print = () => {
    const canvas = document.querySelector("main canvas") as HTMLCanvasElement | null;
    setSnapshot(canvas ? canvas.toDataURL("image/png") : null);
    setPrintRequest((n) => n + 1);
  };
  useEffect(() => {
    // after React has painted the sheet with the new snapshot
    if (printRequest > 0) requestAnimationFrame(() => window.print());
  }, [printRequest]);

  const r = scene.result;

  return (
    <>
      <div className="flex min-h-dvh flex-col lg:h-dvh lg:flex-row print:hidden">
        <aside className="relative order-2 flex w-full flex-col gap-4 overflow-y-auto border-line p-4 lg:order-1 lg:w-[420px] lg:shrink-0 lg:border-r">
          <header className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">ЛСТК · 3D-конструктор</p>
            <h1 className="text-lg font-bold">Каркас из C89</h1>
            {r && (
              <p className="text-sm text-ink-mute">
                {int(r.bom.totals.pieces)} деталей · {one(r.bom.totals.massKg)} кг · {money(r.bom.totals.total)}
              </p>
            )}
          </header>

          <Segmented
            legend="Что проектируем"
            value={mode}
            options={[
              { value: "building", label: "Здание" },
              { value: "wall", label: "Стена" },
              { value: "truss", label: "Ферма" },
              { value: "profile", label: "Профиль" },
            ]}
            onChange={setMode}
          />
          <Segmented
            legend="Раздел"
            value={tab}
            options={[
              { value: "params", label: "Параметры" },
              { value: "spec", label: "Спецификация и файлы" },
            ]}
            onChange={setTab}
          />

          {tab === "params" ? (
            <>
              {mode === "building" && <BuildingPanel />}
              {mode === "wall" && <WallPanel />}
              {mode === "truss" && <TrussPanel />}
              {mode === "profile" && <ProfilePanel />}
              {r && <ChecksPanel scene={r} />}
              {r && <TrussForcesPanel scene={r} />}
              <ViewPanel />
            </>
          ) : r ? (
            <SpecPanel scene={r} onPrint={print} />
          ) : (
            <p className="text-sm text-danger">Исправьте параметры — спецификация строится по корректной модели.</p>
          )}
        </aside>

        <main className="relative order-1 h-[58dvh] w-full bg-viewport lg:order-2 lg:h-auto lg:flex-1">
          {hydrated && (
            <Viewport object={r?.object ?? null} lighting={view.lighting} grid={view.grid} explode={view.explode} selection={selection} onPick={select} />
          )}
          {scene.error && (
            <p role="alert" className="absolute inset-x-4 top-4 rounded-lg bg-danger-soft p-3 text-sm text-danger">
              {scene.error}
            </p>
          )}
          {r && <SelectionCard scene={r} />}
          {r && r.assemblies.length > 1 && (
            <div className="absolute bottom-4 left-4 w-[min(360px,calc(100%-2rem))] rounded-xl border border-line bg-surface/95 px-4 py-1 shadow-lg backdrop-blur">
              <Range label="Схема сборки" value={view.explode} onChange={(explode) => setView({ explode })} />
            </div>
          )}
          {!selection && r && (
            <p className="pointer-events-none absolute right-4 top-4 hidden rounded-lg bg-surface/80 px-3 py-2 text-xs text-ink-mute lg:block">
              Клик по элементу — его длина и операции
            </p>
          )}
        </main>
      </div>
      {r && <PrintSheet scene={r} snapshot={snapshot} />}
    </>
  );
}
