import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Prices } from "@/domain/bom/bom";
import { presetInput } from "@/domain/buildings/presets";
import type { BuildingInput } from "@/domain/buildings/types";
import type { TrussShape, WebPattern } from "@/domain/trusses/types";
import { PATTERNS_FOR_SHAPE } from "@/domain/trusses/types";
import type { Opening } from "@/domain/walls/types";

export type Mode = "building" | "wall" | "truss" | "profile";
export type LightingPreset = "studio" | "sunny" | "overcast";
export type Detail = "instanced" | "detailed";
export type SidebarTab = "params" | "spec";

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
  cladding: boolean;
}

export interface ProjectState {
  mode: Mode;
  presetId: string;
  building: BuildingInput;
  wall: WallState;
  truss: TrussState;
  profile: ProfileState;
  prices: Prices;
  /** Design roof load on plan, kPa — entered by the user from the applicable code */
  roofLoadKpa: number;
  view: ViewState;
}

interface UiState {
  tab: SidebarTab;
  selection: string | null;
}

interface Actions {
  setMode: (mode: Mode) => void;
  applyPreset: (id: string) => void;
  setBuilding: (patch: Partial<BuildingInput>) => void;
  setWall: (patch: Partial<WallState>) => void;
  setTruss: (patch: Partial<TrussState>) => void;
  setProfile: (patch: Partial<ProfileState>) => void;
  setPrices: (patch: Partial<Prices>) => void;
  setRoofLoad: (kpa: number) => void;
  setView: (patch: Partial<ViewState>) => void;
  setTab: (tab: SidebarTab) => void;
  select: (id: string | null) => void;
  loadProject: (p: ProjectState) => void;
  reset: () => void;
}

const C89 = "C89x41x11x0.95";

export const DEFAULT_PROJECT: ProjectState = {
  mode: "building",
  presetId: "house",
  building: presetInput("house"),
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
  roofLoadKpa: 1,
  view: { lighting: "studio", grid: true, detail: "instanced", explode: 0, cladding: false },
};

const fresh = (): ProjectState => structuredClone(DEFAULT_PROJECT);

/** Fill fields a saved project predates; reject foreign JSON */
export function parseProject(raw: unknown): ProjectState | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<ProjectState>;
  if (!r.building || !r.wall || !r.truss || !r.profile) return null;
  const d = fresh();
  return {
    mode: r.mode ?? d.mode,
    presetId: r.presetId ?? d.presetId,
    building: { ...d.building, ...r.building, openings: { ...d.building.openings, ...r.building.openings } },
    wall: { ...d.wall, ...r.wall },
    truss: { ...d.truss, ...r.truss },
    profile: { ...d.profile, ...r.profile },
    prices: { ...d.prices, ...r.prices },
    roofLoadKpa: r.roofLoadKpa ?? d.roofLoadKpa,
    view: { ...d.view, ...r.view, explode: 0 },
  };
}

export function projectOf(s: ProjectState): ProjectState {
  const { mode, presetId, building, wall, truss, profile, prices, roofLoadKpa, view } = s;
  return { mode, presetId, building, wall, truss, profile, prices, roofLoadKpa, view };
}

export const useConfigurator = create<ProjectState & UiState & Actions>()(
  persist(
    (set) => ({
      ...fresh(),
      tab: "params",
      selection: null,
      setMode: (mode) => set({ mode, selection: null }),
      applyPreset: (id) => set({ presetId: id, building: presetInput(id), selection: null }),
      setBuilding: (patch) => set((s) => ({ building: { ...s.building, ...patch }, selection: null })),
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
      select: (selection) => set({ selection }),
      loadProject: (p) => set({ ...p, selection: null }),
      reset: () => set({ ...fresh(), selection: null }),
    }),
    {
      name: "lstk-configurator:v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => projectOf(s),
      // A stale or hand-edited entry must never break startup
      merge: (persisted, current) => ({ ...current, ...(parseProject(persisted) ?? {}) }),
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
  }
}
