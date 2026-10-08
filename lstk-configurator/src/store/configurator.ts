import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Prices } from "@/domain/bom/bom";
import { type BuildingInput, type FoundationConfig, type Level, type Partition, type RoofConfig, type RoomPurpose, type SideConfig, type WallSide } from "@/domain/buildings/types";
import { upperLevel } from "@/domain/buildings/levels";
import { findProduct, productInput } from "@/domain/catalog/products";
import type { FinishChoice } from "@/domain/finishes/catalog";
import { DEFAULT_SETTINGS, type PlannerSettings } from "@/domain/planner/analyze";
import type { TrussShape, WebPattern } from "@/domain/trusses/types";
import { PATTERNS_FOR_SHAPE } from "@/domain/trusses/types";
import type { Opening } from "@/domain/walls/types";
import type { Lang } from "@/i18n";

export type Mode = "building" | "wall" | "truss" | "profile";
export type LightingPreset = "studio" | "sunny" | "overcast" | "dusk";
export type Detail = "instanced" | "detailed";
export type PlannerTab = "catalog" | "shape" | "layout" | "climate" | "finish" | "mep" | "calc" | "nodes" | "estimate" | "delivery" | "drawings" | "files";
export type PartTab = "params" | "files";
export type CameraPreset = "iso" | "front" | "side" | "top";

export interface ProfileState {
  profileId: string;
  length: number;
  serviceHoles: boolean;
  thermalSlots: boolean;
  endDimples: boolean;
}

export interface TrussState {
  shapeKind: TrussShape["kind"];
  pitchDeg: number;
  heelHeight: number;
  depth: number;
  pattern: WebPattern;
  span: number;
  panels: number;
  overhang: number;
  chordProfileId: string;
  webProfileId: string;
  maxPieceLength: number;
  /** Truss spacing for the load per truss, mm */
  spacing: number;
}

export interface WallState {
  length: number;
  height: number;
  studSpacing: number;
  noggings: boolean;
  profileId: string;
  openings: Opening[];
}

export interface ViewState {
  lighting: LightingPreset;
  grid: boolean;
  detail: Detail;
  /** 0 = assembled, 1 = fully exploded */
  explode: number;
  /** Skin: cladding, roof, windows */
  cladding: boolean;
  /** Furniture, cars, stoves… */
  props: boolean;
  /** Dimension lines */
  dims: boolean;
  /** Show levels up to this index; the roof only when it is the top level. -1 = everything */
  cut: number;
}

export interface ProjectState {
  mode: Mode;
  building: BuildingInput;
  planner: PlannerSettings;
  wall: WallState;
  truss: TrussState;
  profile: ProfileState;
  prices: Prices;
  /** Design roof load on plan, kPa — entered by the user from the applicable code */
  roofLoadKpa: number;
  view: ViewState;
}

interface UiState {
  lang: Lang;
  tab: PlannerTab;
  partTab: PartTab;
  selection: string | null;
  camera: { preset: CameraPreset; n: number };
  /** Design Mode: full-screen presentation of the project */
  presentation: boolean;
}

interface Actions {
  setLang: (lang: Lang) => void;
  setMode: (mode: Mode) => void;
  applyProduct: (id: string) => void;
  setBuilding: (patch: Partial<BuildingInput>) => void;
  setRoof: (patch: Partial<RoofConfig>) => void;
  setFoundation: (patch: Partial<FoundationConfig>) => void;
  setLevelCount: (n: number) => void;
  setLevel: (i: number, patch: Partial<Level>) => void;
  setSide: (level: number, side: WallSide, patch: Partial<SideConfig>) => void;
  setPartitions: (level: number, partitions: Partition[]) => void;
  setRoom: (level: number, key: string, purpose: RoomPurpose) => void;
  setPlanner: (patch: Partial<PlannerSettings>) => void;
  setFinishes: (patch: Partial<FinishChoice>) => void;
  setWall: (patch: Partial<WallState>) => void;
  setTruss: (patch: Partial<TrussState>) => void;
  setProfile: (patch: Partial<ProfileState>) => void;
  setPrices: (patch: Partial<Prices>) => void;
  setRoofLoad: (kpa: number) => void;
  setView: (patch: Partial<ViewState>) => void;
  setTab: (tab: PlannerTab) => void;
  setPartTab: (tab: PartTab) => void;
  select: (id: string | null) => void;
  look: (preset: CameraPreset) => void;
  setPresentation: (on: boolean) => void;
  loadProject: (p: ProjectState) => void;
  reset: () => void;
}

const C89 = "C89x41x11x0.95";

export const DEFAULT_PROJECT: ProjectState = {
  mode: "building",
  building: productInput("house"),
  planner: DEFAULT_SETTINGS,
  wall: {
    length: 6000,
    height: 2700,
    studSpacing: 600,
    noggings: true,
    profileId: C89,
    openings: [
      { id: "o1", kind: "window", x: 1200, width: 1500, height: 1400, sill: 900 },
      { id: "o2", kind: "door", x: 3900, width: 900, height: 2100, sill: 0 },
    ],
  },
  truss: {
    shapeKind: "triangular",
    pitchDeg: 25,
    heelHeight: 400,
    depth: 900,
    pattern: "howe",
    span: 9000,
    panels: 6,
    overhang: 450,
    chordProfileId: C89,
    webProfileId: C89,
    maxPieceLength: 12000,
    spacing: 600,
  },
  profile: { profileId: C89, length: 2700, serviceHoles: true, thermalSlots: false, endDimples: true },
  // Placeholders, same as the business-plan model: replace with supplier quotes
  prices: { steelPerKg: 850, scrapPct: 3, fastenerEach: 15, boltEach: 400 },
  roofLoadKpa: 1.5,
  view: { lighting: "sunny", grid: false, detail: "instanced", explode: 0, cladding: true, props: true, dims: true, cut: -1 },
};

const fresh = (): ProjectState => structuredClone(DEFAULT_PROJECT);

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** Fill fields a saved project predates; reject foreign or v1 JSON */
export function parseProject(raw: unknown): ProjectState | null {
  if (!isObj(raw)) return null;
  const r = raw as Partial<ProjectState>;
  if (!isObj(r.building) || !Array.isArray(r.building.levels) || !r.wall || !r.truss || !r.profile) return null;
  const d = fresh();
  const b = r.building;
  return {
    mode: r.mode ?? d.mode,
    building: { ...d.building, ...b, roof: { ...d.building.roof, ...b.roof }, foundation: { ...d.building.foundation, ...b.foundation } },
    planner: { ...d.planner, ...r.planner, finishes: { ...d.planner.finishes, ...r.planner?.finishes }, doc: { ...d.planner.doc, ...r.planner?.doc } },
    wall: { ...d.wall, ...r.wall },
    truss: { ...d.truss, ...r.truss },
    profile: { ...d.profile, ...r.profile },
    prices: { ...d.prices, ...r.prices },
    roofLoadKpa: r.roofLoadKpa ?? d.roofLoadKpa,
    view: { ...d.view, ...r.view, explode: 0 },
  };
}

export function projectOf(s: ProjectState): ProjectState {
  const { mode, building, planner, wall, truss, profile, prices, roofLoadKpa, view } = s;
  return { mode, building, planner, wall, truss, profile, prices, roofLoadKpa, view };
}


export const useConfigurator = create<ProjectState & UiState & Actions>()(
  persist(
    (set) => {
      const editB = (fn: (b: BuildingInput) => BuildingInput) => set((s) => ({ building: fn(s.building), selection: null }));
      const editLevel = (i: number, fn: (l: Level) => Level) => editB((b) => ({ ...b, levels: b.levels.map((l, k) => (k === i ? fn(l) : l)) }));
      return {
        ...fresh(),
        lang: "ru",
        tab: "catalog",
        partTab: "params",
        selection: null,
        camera: { preset: "iso", n: 0 },
        presentation: false,
        setLang: (lang) => set({ lang }),
        setMode: (mode) => set({ mode, selection: null }),
        applyProduct: (id) =>
          set((s) => {
            const p = findProduct(id);
            const birds = p.capacity?.kind === "birds" ? p.capacity.default : s.planner.birds;
            return { building: productInput(id), planner: { ...s.planner, birds }, selection: null, view: { ...s.view, cut: -1, explode: 0 } };
          }),
        setBuilding: (patch) => editB((b) => ({ ...b, ...patch })),
        setRoof: (patch) => editB((b) => ({ ...b, roof: { ...b.roof, ...patch } })),
        setFoundation: (patch) => editB((b) => ({ ...b, foundation: { ...b.foundation, ...patch } })),
        setLevelCount: (n) => editB((b) => ({ ...b, levels: n <= 1 ? b.levels.slice(0, 1) : [b.levels[0]!, b.levels[1] ?? upperLevel(b.levels[0]!)] })),
        setLevel: (i, patch) => editLevel(i, (l) => ({ ...l, ...patch })),
        setSide: (level, side, patch) => editLevel(level, (l) => ({ ...l, sides: { ...l.sides, [side]: { ...l.sides[side], ...patch } } })),
        setPartitions: (level, partitions) => editLevel(level, (l) => ({ ...l, partitions })),
        setRoom: (level, key, purpose) => editLevel(level, (l) => ({ ...l, rooms: { ...l.rooms, [key]: purpose } })),
        setPlanner: (patch) => set((s) => ({ planner: { ...s.planner, ...patch } })),
        setFinishes: (patch) => set((s) => ({ planner: { ...s.planner, finishes: { ...s.planner.finishes, ...patch } } })),
        setWall: (patch) => set((s) => ({ wall: { ...s.wall, ...patch }, selection: null })),
        setTruss: (patch) =>
          set((s) => {
            const next = { ...s.truss, ...patch };
            const allowed = PATTERNS_FOR_SHAPE[next.shapeKind];
            if (!allowed.includes(next.pattern)) next.pattern = allowed[0]!;
            return { truss: next, selection: null };
          }),
        setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch }, selection: null })),
        setPrices: (patch) => set((s) => ({ prices: { ...s.prices, ...patch } })),
        setRoofLoad: (roofLoadKpa) => set({ roofLoadKpa }),
        setView: (patch) => set((s) => ({ view: { ...s.view, ...patch } })),
        setTab: (tab) => set({ tab }),
        setPartTab: (partTab) => set({ partTab }),
        select: (selection) => set({ selection }),
        look: (preset) => set((s) => ({ camera: { preset, n: s.camera.n + 1 } })),
        setPresentation: (presentation) => set((s) => ({ presentation, mode: "building", selection: null, camera: { preset: "iso", n: s.camera.n + 1 } })),
        loadProject: (p) => set({ ...p, selection: null }),
        reset: () => set({ ...fresh(), selection: null }),
      };
    },
    {
      name: "lstk-configurator:v2",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ ...projectOf(s), lang: s.lang }),
      // A stale or hand-edited entry must never break startup
      merge: (persisted, current) => {
        const lang = isObj(persisted) && (persisted.lang === "kk" || persisted.lang === "zh" || persisted.lang === "ru") ? persisted.lang : current.lang;
        return { ...current, ...(parseProject(persisted) ?? {}), lang };
      },
    },
  ),
);

export function trussShape(t: TrussState): TrussShape {
  switch (t.shapeKind) {
    case "triangular":
      return { kind: "triangular", pitchDeg: t.pitchDeg };
    case "trapezoidal":
      return { kind: "trapezoidal", pitchDeg: t.pitchDeg, heelHeight: t.heelHeight };
    case "parallel":
      return { kind: "parallel", depth: t.depth };
    case "mono":
      return { kind: "mono", pitchDeg: t.pitchDeg, heelHeight: t.heelHeight };
  }
}
