"use client";

import { Calculator, ClipboardText, CubeFocus, Drop, FileArrowDown, Gauge, Graph, Layout, PaintRoller, Ruler, SquaresFour, Truck } from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { LANGS, useT } from "@/i18n";
import { PURPOSE_COLOR } from "@/render/skin";
import { projectOf, useConfigurator, type CameraPreset, type Mode, type PlannerTab } from "@/store/configurator";
import { Presentation } from "../presentation/Presentation";
import { CalcPanel, NodesPanel } from "../planner/CalcPanel";
import { CatalogPanel } from "../planner/CatalogPanel";
import { DrawingsPanel } from "../planner/DrawingsPanel";
import { ClimatePanel } from "../planner/ClimatePanel";
import { DeliveryPanel } from "../planner/DeliveryPanel";
import { EstimatePanel } from "../planner/EstimatePanel";
import { FinishPanel } from "../planner/FinishPanel";
import { LayoutPanel } from "../planner/LayoutPanel";
import { MepPanel } from "../planner/MepPanel";
import { ShapePanel } from "../planner/ShapePanel";
import type { Dim, Label } from "../viewport/Viewport";
import { buildScene, type Scene } from "./buildScene";
import { ChecksPanel, SelectionCard, TrussForcesPanel } from "./Checks";
import { Range, Segmented } from "./controls";
import { ProfilePanel, TrussPanel, ViewPanel, WallPanel } from "./ParamPanels";
import { PrintSheet } from "./PrintSheet";
import { SpecPanel } from "./SpecPanel";
import { download, int, mln, money, one, setNumberLocale } from "./format";

// WebGL only exists in the browser; static export pre-renders the shell without it
const Viewport = dynamic(() => import("@/features/viewport/Viewport"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-ink-mute">3D…</div>,
});

function useHydrated() {
  // The store restores the project from localStorage on the client; render the
  // model only after that, so the first build is the user's project, not the default
  const [ok, setOk] = useState(false);
  useEffect(() => setOk(true), []);
  return ok;
}

const TABS: PlannerTab[] = ["catalog", "shape", "layout", "climate", "finish", "mep", "calc", "nodes", "estimate", "delivery", "drawings", "files"];
const MM = 0.001;
const TAB_ICON: Record<PlannerTab, typeof Ruler> = {
  catalog: SquaresFour,
  shape: CubeFocus,
  layout: Layout,
  climate: Drop,
  finish: PaintRoller,
  mep: Gauge,
  calc: Calculator,
  nodes: Graph,
  estimate: ClipboardText,
  delivery: Truck,
  drawings: Ruler,
  files: FileArrowDown,
};

export default function Configurator() {
  const state = useConfigurator();
  const { mode, tab, partTab, view, selection, camera, lang, presentation, setMode, setTab, setPartTab, setView, select, look, setLang, setPresentation } = state;
  const t = useT();
  const hydrated = useHydrated();
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [printRequest, setPrintRequest] = useState(0);
  const locale = LANGS.find((l) => l.id === lang)!;
  setNumberLocale(locale.locale);
  useEffect(() => {
    document.documentElement.lang = locale.html;
    document.title = t("app.title");
  }, [locale.html, t]);

  // Rebuild only when the project changes — not on tab/selection/explode/cut
  const project = projectOf(state);
  const key = JSON.stringify({ ...project, view: { ...project.view, explode: 0, lighting: "", grid: false, cut: 0, dims: false } });
  const scene = useMemo((): { result: Scene | null; error: string | null } => {
    try {
      return { result: buildScene(JSON.parse(key)), error: null };
    } catch (e) {
      return { result: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [key]);

  const canvas = () => document.querySelector("main canvas") as HTMLCanvasElement | null;
  const print = () => {
    const c = canvas();
    setSnapshot(c ? c.toDataURL("image/png") : null);
    setPrintRequest((n) => n + 1);
  };
  const shot = () => {
    const c = canvas();
    if (c) c.toBlob((blob) => blob && download(`lstk-${state.building.productId}.png`, blob, "image/png"));
  };
  useEffect(() => {
    if (!presentation) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPresentation(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presentation, setPresentation]);
  useEffect(() => {
    // after React has painted the sheet with the new snapshot
    if (printRequest > 0) requestAnimationFrame(() => window.print());
  }, [printRequest]);

  const r = scene.result;
  const a = r?.analysis ?? null;

  // Overlays in model metres (the viewport shifts them by the scene offset)
  const dims: Dim[] = [];
  const labels: Label[] = [];
  if (a && view.dims && view.explode === 0) {
    const { length: L, width: W } = a.building.input;
    const h = a.building.ridgeHeight;
    const gap = 0.9;
    dims.push({ from: [0, 0.02, -gap - W * MM * 0], to: [L * MM, 0.02, -gap], label: `${one(L / 1000)} ${t("unit.m")}` });
    dims.push({ from: [L * MM + gap, 0.02, 0], to: [L * MM + gap, 0.02, W * MM], label: `${one(W / 1000)} ${t("unit.m")}` });
    dims.push({ from: [L * MM + gap, 0, -gap], to: [L * MM + gap, h * MM, -gap], label: `${one(h / 1000)} ${t("unit.m")}` });
  }
  if (a && view.cut >= 0) {
    const li = Math.min(view.cut, a.building.levels.length - 1);
    const base = a.building.levels[li]!.base;
    for (const room of a.thermal.envelope.rooms[li] ?? []) {
      labels.push({ at: [((room.x0 + room.x1) / 2) * MM, (base + 400) * MM, ((room.z0 + room.z1) / 2) * MM], title: t.dyn(`room.${room.purpose}`), sub: `${one(room.area)} ${t("unit.m2")}`, color: PURPOSE_COLOR[room.purpose] });
    }
  }

  const header = (
    <header className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">{t("app.kicker")}</p>
          <h1 className="text-lg font-bold">{mode === "building" ? t.dyn(`product.${state.building.productId}`) : t("app.parts")}</h1>
        </div>
        <div className="flex gap-1 rounded-lg bg-sunken p-1" role="group" aria-label={t("app.lang")}>
          {LANGS.map((l) => (
            <button key={l.id} type="button" lang={l.html} aria-pressed={lang === l.id} onClick={() => setLang(l.id)} className={`min-h-11 min-w-11 rounded-md px-2 text-sm ${lang === l.id ? "bg-surface font-semibold text-primary shadow-sm" : "text-ink-mute"}`}>
              {l.label}
            </button>
          ))}
        </div>
      </div>
      {a && (
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-primary-soft p-3 text-center">
          <div>
            <p className="text-xs text-ink-mute">{t("sum.price")}</p>
            <p className="text-base font-bold tabular-nums text-primary">
              {mln(a.price)} {t("unit.mlnTg")}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-mute">{t("sum.area")}</p>
            <p className="text-base font-bold tabular-nums">
              {one(a.areas.floor)} {t("unit.m2")}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-mute">{t("sum.mass")}</p>
            <p className="text-base font-bold tabular-nums">
              {one(a.delivery.massKg / 1000)} {t("unit.t")}
            </p>
          </div>
        </div>
      )}
      {r && !a && (
        <p className="text-sm text-ink-mute">
          {int(r.bom.totals.pieces)} · {one(r.bom.totals.massKg)} {t("unit.kg")} · {money(r.bom.totals.total)}
        </p>
      )}
    </header>
  );

  return (
    <>
      <div className="flex min-h-dvh flex-col lg:h-dvh lg:flex-row print:hidden">
        <aside className={`relative order-2 flex w-full flex-col gap-4 overflow-y-auto border-line p-4 lg:order-1 lg:w-[440px] lg:shrink-0 lg:border-r ${presentation && a ? "hidden" : ""}`}>
          {header}
          <Segmented<Mode>
            legend={t("app.mode")}
            value={mode}
            options={(["building", "wall", "truss", "profile"] as const).map((m) => ({ value: m, label: t.dyn(`mode.${m}`) }))}
            onChange={setMode}
          />
          {mode === "building" ? (
            <>
              <nav aria-label={t("app.sections")} className="sticky -top-4 z-10 -mx-4 shrink-0 overflow-x-auto bg-bg px-4 py-2">
                <ul className="flex gap-1">
                  {TABS.map((x) => {
                    const Icon = TAB_ICON[x];
                    return (
                      <li key={x}>
                        <button
                          type="button"
                          aria-current={tab === x ? "page" : undefined}
                          onClick={() => setTab(x)}
                          className={`flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm transition-colors ${tab === x ? "bg-primary font-semibold text-surface shadow-sm" : "bg-sunken text-ink-mute hover:text-ink"}`}
                        >
                          <Icon size={18} weight={tab === x ? "fill" : "regular"} aria-hidden="true" />
                          {t.dyn(`tab.${x}`)}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
              {tab === "catalog" && <CatalogPanel />}
              {tab === "shape" && <ShapePanel />}
              {tab === "layout" && <LayoutPanel />}
              {a && tab === "climate" && <ClimatePanel a={a} />}
              {a && tab === "finish" && <FinishPanel a={a} />}
              {a && tab === "mep" && <MepPanel a={a} />}
              {a && tab === "calc" && <CalcPanel a={a} />}
              {a && tab === "nodes" && <NodesPanel a={a} />}
              {a && tab === "estimate" && <EstimatePanel a={a} />}
              {a && tab === "drawings" && <DrawingsPanel a={a} />}
              {a && tab === "delivery" && <DeliveryPanel a={a} />}
              {r && tab === "files" && <SpecPanel scene={r} onPrint={print} onShot={shot} />}
              {!a && tab !== "catalog" && tab !== "shape" && tab !== "layout" && <p className="text-sm text-danger">{t("app.fixParams")}</p>}
              {r && (tab === "shape" || tab === "files") && <ChecksPanel scene={r} />}
              {r && tab === "shape" && <TrussForcesPanel scene={r} />}
              {(tab === "shape" || tab === "catalog") && <ViewPanel />}
            </>
          ) : (
            <>
              <Segmented
                legend={t("app.sections")}
                value={partTab}
                options={[
                  { value: "params", label: t("app.params") },
                  { value: "files", label: t("tab.files") },
                ]}
                onChange={setPartTab}
              />
              {partTab === "params" ? (
                <>
                  {mode === "wall" && <WallPanel />}
                  {mode === "truss" && <TrussPanel />}
                  {mode === "profile" && <ProfilePanel />}
                  {r && <ChecksPanel scene={r} />}
                  {r && <TrussForcesPanel scene={r} />}
                  <ViewPanel />
                </>
              ) : r ? (
                <SpecPanel scene={r} onPrint={print} onShot={shot} />
              ) : (
                <p className="text-sm text-danger">{t("app.fixParams")}</p>
              )}
            </>
          )}
        </aside>

        <main className={`relative order-1 w-full bg-viewport lg:order-2 lg:flex-1 ${presentation && a ? "h-dvh" : "h-[58dvh] lg:h-auto"}`}>
          {hydrated && r && (
            <Viewport
              object={r.object}
              offset={r.offset}
              size={r.size}
              lighting={view.lighting}
              grid={view.grid}
              explode={view.explode}
              cut={mode === "building" ? view.cut : -1}
              selection={selection}
              camera={camera}
              dims={dims}
              labels={labels}
              ground={mode === "building" && view.lighting !== "studio"}
              autoRotate={presentation && !!a}
              onPick={select}
            />
          )}
          {scene.error && (
            <p role="alert" className="absolute inset-x-4 top-16 rounded-lg bg-danger-soft p-3 text-sm text-danger">
              {scene.error}
            </p>
          )}
          {r && <SelectionCard scene={r} />}
          {presentation && a && <Presentation a={a} />}
          <div className={`absolute left-4 top-4 flex flex-wrap gap-1 rounded-xl border border-line bg-surface/90 p-1 shadow backdrop-blur ${presentation && a ? "hidden" : ""}`}>
            {a && (
              <button type="button" onClick={() => setPresentation(true)} className="min-h-11 rounded-lg bg-primary px-3 text-sm font-semibold text-surface hover:opacity-90">
                {t("dm.toggle")}
              </button>
            )}
            {(["iso", "front", "side", "top"] as CameraPreset[]).map((p) => (
              <button key={p} type="button" onClick={() => look(p)} className="min-h-11 rounded-lg px-3 text-sm text-ink-mute hover:bg-sunken hover:text-ink">
                {t.dyn(`cam.${p}`)}
              </button>
            ))}
            {mode === "building" && (
              <button type="button" aria-pressed={view.cut >= 0} onClick={() => {
                  setView({ cut: view.cut >= 0 ? -1 : 0 });
                  look(view.cut >= 0 ? "iso" : "top");
                }} className={`min-h-11 rounded-lg px-3 text-sm ${view.cut >= 0 ? "bg-primary text-surface" : "text-ink-mute hover:bg-sunken"}`}>
                {t("view.plan")}
              </button>
            )}
            <button type="button" onClick={shot} className="min-h-11 rounded-lg px-3 text-sm text-ink-mute hover:bg-sunken hover:text-ink" aria-label={t("files.shot")}>
              ⤓
            </button>
          </div>
          {r && r.assemblies.length > 1 && !presentation && (
            <div className="absolute bottom-4 left-4 w-[min(360px,calc(100%-2rem))] rounded-xl border border-line bg-surface/95 px-4 py-1 shadow-lg backdrop-blur">
              <Range label={t("view.explode")} value={view.explode} onChange={(explode) => setView({ explode })} />
            </div>
          )}
        </main>
      </div>
      {r && <PrintSheet scene={r} snapshot={snapshot} />}
    </>
  );
}
