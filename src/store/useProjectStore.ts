import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { DoorItem, DrawerBlock, FurnitureModule, ProjectState } from '../types/cad.types';

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
    subdivisions: { shelves: [{ id: newId('sh'), lockedGapBelow: null }], doors: [], drawers: [] },
  };
}

export const newDoor = (): DoorItem => ({
  id: newId('door'),
  bottomRef: 'bottom',
  topRef: 'top',
  mount: 'overlay',
  leaves: 1,
  hingeSide: 'left',
  handle: 'none',
});

export const newDrawerBlock = (): DrawerBlock => ({
  id: newId('drw'),
  bottomRef: 'bottom',
  topRef: 'top',
  count: 3,
  mount: 'overlay',
  runnerType: 'telescopic',
  handle: 'none',
});

interface ProjectStore {
  project: ProjectState;
  selectedId: string | null;
  showFacades: boolean;
  setShowFacades: (v: boolean) => void;
  select: (id: string | null) => void;
  addDoor: (moduleId: string) => void;
  addDrawerBlock: (moduleId: string) => void;
  removeShelf: (moduleId: string) => void;
  addModule: () => void;
  removeModule: (id: string) => void;
  updateModule: (id: string, recipe: (m: FurnitureModule) => void) => void;
}

// Демо из видео аналога: левая тумба 353 мм с дверью и правая 400 мм с ящиками.
const initialModules = (() => {
  const left = createBaseCabinet('Левая тумба', 0, 353);
  left.subdivisions.doors.push(newDoor());
  const right = createBaseCabinet('Правая тумба', 353, 400);
  right.subdivisions.shelves = [];
  right.subdivisions.drawers.push(newDrawerBlock());
  return [left, right];
})();

export const useProjectStore = create<ProjectStore>()(
  immer((set) => ({
    project: { id: newId('prj'), name: 'Новый проект', modules: initialModules },
    selectedId: initialModules[0]?.id ?? null,
    showFacades: true,
    setShowFacades: (v) => set({ showFacades: v }),
    select: (id) => set({ selectedId: id }),
    addDoor: (moduleId) =>
      set((s) => {
        s.project.modules.find((m) => m.id === moduleId)?.subdivisions.doors.push(newDoor());
      }),
    // Новый блок ящиков копирует настройки последнего добавленного в проекте (ТЗ: копирование параметров).
    addDrawerBlock: (moduleId) =>
      set((s) => {
        const last = s.project.modules.flatMap((m) => m.subdivisions.drawers).at(-1);
        const block = last
          ? { ...newDrawerBlock(), count: last.count, mount: last.mount, runnerType: last.runnerType, handle: last.handle }
          : newDrawerBlock();
        s.project.modules.find((m) => m.id === moduleId)?.subdivisions.drawers.push(block);
      }),
    // Фасады, опиравшиеся на удалённую полку, переезжают на дно или крышу.
    removeShelf: (moduleId) =>
      set((s) => {
        const m = s.project.modules.find((x) => x.id === moduleId);
        const removed = m?.subdivisions.shelves.pop();
        if (!m || !removed) return;
        for (const f of [...m.subdivisions.doors, ...m.subdivisions.drawers]) {
          if (f.bottomRef === removed.id) f.bottomRef = 'bottom';
          if (f.topRef === removed.id) f.topRef = 'top';
        }
      }),
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
