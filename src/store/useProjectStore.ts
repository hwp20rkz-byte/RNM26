import { create } from 'zustand';
import { produce } from 'immer';
import type { DoorItem, DrawerBlock, FurnitureModule, ProjectState } from '../types/cad.types';
import { newId } from '../utils/id';
import { describeChange, HISTORY_LIMIT } from './history';

export { newId };

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
    partOverrides: {},
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
  // История правок проекта: снимки до изменения (past) и отменённые (future).
  // Снимки дешёвые: immer делит неизменённые части между версиями.
  past: ProjectState[];
  future: ProjectState[];
  historyMessage: { text: string; at: number } | null;
  undo: () => void;
  redo: () => void;
  setShowFacades: (v: boolean) => void;
  select: (id: string | null) => void;
  addDoor: (moduleId: string) => void;
  addDrawerBlock: (moduleId: string) => void;
  removeShelf: (moduleId: string) => void;
  addModule: () => void;
  loadProject: (project: ProjectState) => void;
  setProjectMeta: (meta: Partial<Pick<ProjectState, 'name' | 'clientName'>>) => void;
  removeModule: (id: string) => void;
  updateModule: (id: string, recipe: (m: FurnitureModule) => void) => void;
}

// Демо из видео аналога: левая тумба 353 мм с дверью и правая 400 мм с ящиками.
export function createDemoProject(): ProjectState {
  const left = createBaseCabinet('Левая тумба', 0, 353);
  left.subdivisions.doors.push(newDoor());
  const right = createBaseCabinet('Правая тумба', 353, 400);
  right.subdivisions.shelves = [];
  right.subdivisions.drawers.push(newDrawerBlock());
  return { id: newId('prj'), name: 'Пример: две тумбы', clientName: '', modules: [left, right] };
}

export function createEmptyProject(): ProjectState {
  return { id: newId('prj'), name: 'Новый проект', clientName: '', modules: [createBaseCabinet('Модуль 1', 0, 400)] };
}

const initialProject = createDemoProject();

type Draft = Pick<ProjectStore, 'project' | 'selectedId'>;

// После отмены показываем затронутый модуль; если его больше нет — оставляем выбор как был.
function selectionAfter(project: ProjectState, preferred: string | null, current: string | null): string | null {
  const has = (id: string | null) => id !== null && project.modules.some((m) => m.id === id);
  if (has(preferred)) return preferred;
  if (has(current)) return current;
  return project.modules[0]?.id ?? null;
}

export const useProjectStore = create<ProjectStore>()((set, get) => {
  // Любая правка проекта идёт через change: она попадает в историю и сбрасывает «повторить».
  // Правка, которая ничего не поменяла (то же число в поле), шага в истории не создаёт.
  const change = (recipe: (d: Draft) => void) => {
    const s = get();
    const next = produce({ project: s.project, selectedId: s.selectedId }, recipe);
    if (next.project === s.project) {
      if (next.selectedId !== s.selectedId) set({ selectedId: next.selectedId });
      return;
    }
    set({
      project: next.project,
      selectedId: next.selectedId,
      past: [...s.past, s.project].slice(-HISTORY_LIMIT),
      future: [],
    });
  };

  return {
    project: initialProject,
    selectedId: initialProject.modules[0]?.id ?? null,
    showFacades: true,
    past: [],
    future: [],
    historyMessage: null,
    undo: () => {
      const s = get();
      const prev = s.past.at(-1);
      if (!prev) return;
      const d = describeChange(prev, s.project);
      set({
        project: prev,
        past: s.past.slice(0, -1),
        future: [...s.future, s.project],
        selectedId: selectionAfter(prev, d.moduleId, s.selectedId),
        historyMessage: { text: `Отменено: ${d.text}`, at: Date.now() },
      });
    },
    redo: () => {
      const s = get();
      const next = s.future.at(-1);
      if (!next) return;
      const d = describeChange(s.project, next);
      set({
        project: next,
        past: [...s.past, s.project].slice(-HISTORY_LIMIT),
        future: s.future.slice(0, -1),
        selectedId: selectionAfter(next, d.moduleId, s.selectedId),
        historyMessage: { text: `Повторено: ${d.text}`, at: Date.now() },
      });
    },
    setShowFacades: (v) => set({ showFacades: v }),
    select: (id) => set({ selectedId: id }),
    addDoor: (moduleId) =>
      change((s) => {
        s.project.modules.find((m) => m.id === moduleId)?.subdivisions.doors.push(newDoor());
      }),
    // Новый блок ящиков копирует настройки последнего добавленного в проекте (ТЗ: копирование параметров).
    addDrawerBlock: (moduleId) =>
      change((s) => {
        const last = s.project.modules.flatMap((m) => m.subdivisions.drawers).at(-1);
        const block = last
          ? { ...newDrawerBlock(), count: last.count, mount: last.mount, runnerType: last.runnerType, handle: last.handle }
          : newDrawerBlock();
        s.project.modules.find((m) => m.id === moduleId)?.subdivisions.drawers.push(block);
      }),
    // Фасады, опиравшиеся на удалённую полку, переезжают на дно или крышу.
    removeShelf: (moduleId) =>
      change((s) => {
        const m = s.project.modules.find((x) => x.id === moduleId);
        const removed = m?.subdivisions.shelves.pop();
        if (!m || !removed) return;
        for (const f of [...m.subdivisions.doors, ...m.subdivisions.drawers]) {
          if (f.bottomRef === removed.id) f.bottomRef = 'bottom';
          if (f.topRef === removed.id) f.topRef = 'top';
        }
      }),
    // Открытие другого проекта начинает историю заново: отмена не должна уводить в чужой проект.
    loadProject: (project) =>
      set({ project, selectedId: project.modules[0]?.id ?? null, past: [], future: [], historyMessage: null }),
    setProjectMeta: (meta) =>
      change((s) => {
        Object.assign(s.project, meta);
      }),
    addModule: () =>
      change((s) => {
        const mods = s.project.modules;
        const right = mods.reduce((mx, m) => Math.max(mx, m.transform.x + m.dimensions.width), 0);
        const m = createBaseCabinet(`Модуль ${mods.length + 1}`, right, 400);
        mods.push(m);
        s.selectedId = m.id;
      }),
    removeModule: (id) =>
      change((s) => {
        s.project.modules = s.project.modules.filter((m) => m.id !== id);
        if (s.selectedId === id) s.selectedId = s.project.modules[0]?.id ?? null;
      }),
    updateModule: (id, recipe) =>
      change((s) => {
        const m = s.project.modules.find((x) => x.id === id);
        if (m) recipe(m);
      }),
  };
});
