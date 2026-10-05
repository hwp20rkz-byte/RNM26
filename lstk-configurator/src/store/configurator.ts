import { create } from "zustand";
import type { TrussShape, WebPattern } from "@/domain/trusses/types";
import { PATTERNS_FOR_SHAPE } from "@/domain/trusses/types";

export type Mode = "profile" | "truss";
export type LightingPreset = "studio" | "sunny" | "overcast";
export type Detail = "instanced" | "detailed";

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
}

interface ConfiguratorState {
  mode: Mode;
  profile: ProfileState;
  truss: TrussState;
  view: { lighting: LightingPreset; grid: boolean; detail: Detail };
  setMode: (mode: Mode) => void;
  setProfile: (patch: Partial<ProfileState>) => void;
  setTruss: (patch: Partial<TrussState>) => void;
  setView: (patch: Partial<ConfiguratorState["view"]>) => void;
}

export const useConfigurator = create<ConfiguratorState>((set) => ({
  mode: "truss",
  profile: { profileId: "C150x50x13x1.5", length: 3000, serviceHoles: true, thermalSlots: false, endDimples: true },
  truss: {
    shapeKind: "triangular",
    pitchDeg: 25,
    heelHeight: 400,
    depth: 900,
    pattern: "howe",
    span: 9000,
    panels: 6,
    overhang: 450,
    chordProfileId: "C89x41x11x0.95s",
    webProfileId: "C89x41x11x0.95s",
    maxPieceLength: 12000,
  },
  view: { lighting: "studio", grid: true, detail: "instanced" },
  setMode: (mode) => set({ mode }),
  setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
  setTruss: (patch) =>
    set((s) => {
      const next = { ...s.truss, ...patch };
      // Keep the pattern valid when the shape changes
      const allowed = PATTERNS_FOR_SHAPE[next.shapeKind];
      if (!allowed.includes(next.pattern)) next.pattern = allowed[0]!;
      return { truss: next };
    }),
  setView: (patch) => set((s) => ({ view: { ...s.view, ...patch } })),
}));

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
