import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { FurnitureModule, ProjectState } from '../types/cad.types';

let counter = 0;
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

export function createBaseCabinet(name: string, x: number, width: number): FurnitureModule {
  return {
    id: newId('mod'),
    name,
    type: 'base_cabinet',
    transform: { x, y: 0, z: 0, rotationY: 0 },
    dimensions: { width, height: 634, depth: 400 },
    plinth: { height: 50, setback: 0 },
    construction: {
      topType: 'overlay',
      bottomType: 'overlay',
      backType: 'groove_hdf',
      connectorType: 'minifix',
      leftSideToFloor: false,
      rightSideToFloor: false,
    },
    materials: {
      carcassMaterialId: 'egger-u708-16',
      backMaterialId: 'hdf-white-3',
      facadeMaterialId: 'mdf-veneer-oak-19',
      plinthMaterialId: 'egger-u708-16',
    },
    subdivisions: { shelves: [{ id: newId('sh'), lockedGapBelow: null }] },
  };
}

interface ProjectStore {
  project: ProjectState;
  selectedId: string | null;
  select: (id: string | null) => void;
  addModule: () => void;
  removeModule: (id: string) => void;
  updateModule: (id: string, recipe: (m: FurnitureModule) => void) => void;
}

// Демо из видео аналога: левая тумба 353 и правая 400 мм.
const initialModules = [createBaseCabinet('Левая тумба', 0, 353), createBaseCabinet('Правая тумба', 353, 400)];

export const useProjectStore = create<ProjectStore>()(
  immer((set) => ({
    project: { id: newId('prj'), name: 'Новый проект', modules: initialModules },
    selectedId: initialModules[0]?.id ?? null,
    select: (id) => set({ selectedId: id }),
    addModule: () =>
      set((s) => {
        const mods = s.project.modules;
        const right = mods.reduce((mx, m) => Math.max(mx, m.transform.x + m.dimensions.width), 0);
        const m = createBaseCabinet(`Модуль ${mods.length + 1}`, right, 400);
        mods.push(m);
        s.selectedId = m.id;
      }),
    removeModule: (id) =>
      set((s) => {
        s.project.modules = s.project.modules.filter((m) => m.id !== id);
        if (s.selectedId === id) s.selectedId = s.project.modules[0]?.id ?? null;
      }),
    updateModule: (id, recipe) =>
      set((s) => {
        const m = s.project.modules.find((x) => x.id === id);
        if (m) recipe(m);
      }),
  })),
);
