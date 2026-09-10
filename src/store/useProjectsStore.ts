"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  BuildingProfile,
  CatalogEntry,
  CostItem,
  ObjectType,
  PayrollPosition,
  Project,
  SavedSmeta,
  ServicePreset,
} from "@/lib/calculator/types";
import { buildBlankDatabase, buildDefaultDatabase } from "@/lib/calculator/database";
import { BUILTIN_PRESETS, DEFAULT_BUILDING, buildBlankBuilding } from "@/lib/calculator/presets";
import { applyPreset, computeTariff } from "@/lib/calculator/engine";
import { seedCatalogFromDatabase } from "@/lib/calculator/catalogSeed";
import { genId } from "@/lib/id";

export type BudgetPeriod = "month" | "quarter" | "year";

const DEMO_PROJECT_ID = "demo-korkem1";
const DEFAULT_PRESET_ID = "standard";

function nowIso() {
  return new Date().toISOString();
}

function findPreset(presets: ServicePreset[], id: string): ServicePreset {
  return presets.find((p) => p.id === id) ?? presets.find((p) => p.id === DEFAULT_PRESET_ID) ?? presets[0];
}

function seedInitialProject(presets: ServicePreset[]): Project {
  const preset = findPreset(presets, DEFAULT_PRESET_ID);
  const baseDb = buildDefaultDatabase();
  const db = applyPreset(baseDb, preset);
  const ts = nowIso();
  return {
    id: DEMO_PROJECT_ID,
    name: 'ЖК «Коркем-1» (эталон)',
    building: DEFAULT_BUILDING,
    baseDb,
    db,
    presetId: preset.id,
    priceMultiplier: preset.priceMultiplier,
    createdAt: ts,
    updatedAt: ts,
  };
}

interface ProjectsState {
  projects: Record<string, Project>;
  projectOrder: string[];
  activeProjectId: string;
  catalog: CatalogEntry[];
  presets: ServicePreset[];
  savedSmetas: Record<string, SavedSmeta>;
  budgetPeriod: BudgetPeriod;

  // --- проекты ---
  createProject: (name: string, template: "blank" | "korkem1", objectType?: ObjectType) => string;
  switchProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;

  // --- профиль объекта ---
  setBuilding: (patch: Partial<BuildingProfile>) => void;

  // --- пресеты обслуживания ---
  setPreset: (id: string) => void;
  createPreset: (preset: Omit<ServicePreset, "id" | "builtIn">) => string;
  updatePreset: (id: string, patch: Partial<Omit<ServicePreset, "id" | "builtIn">>) => void;
  duplicatePreset: (id: string) => string;
  deletePreset: (id: string) => void;

  setBudgetPeriod: (p: BudgetPeriod) => void;

  // --- статьи ---
  toggleItem: (itemId: string) => void;
  updateItem: (itemId: string, patch: Partial<CostItem>) => void;
  addItem: (
    categoryId: string,
    item: Pick<CostItem, "name" | "unit" | "unitPrice" | "annualQty"> & Partial<CostItem>,
  ) => void;
  removeItem: (itemId: string) => void;

  // --- персонал ---
  togglePayroll: (id: string) => void;
  updatePayroll: (id: string, patch: Partial<PayrollPosition>) => void;
  addPayroll: (
    categoryId: string,
    position: Pick<PayrollPosition, "role" | "mode" | "headcount" | "monthlySalaryOrContract"> &
      Partial<PayrollPosition>,
  ) => void;
  removePayroll: (id: string) => void;
  toggleStaffOutsourceGroup: (group: string, mode: "staff" | "outsource") => void;

  // --- справочник ---
  addCatalogEntry: (entry: Omit<CatalogEntry, "id" | "createdAt" | "updatedAt">) => void;
  updateCatalogEntry: (id: string, patch: Partial<CatalogEntry>) => void;
  removeCatalogEntry: (id: string) => void;
  importCatalogRows: (
    rows: { name: string; unit: string; unitPrice: number; defaultQty: number; tag?: string; source?: string }[],
  ) => number;
  insertCatalogEntryIntoProject: (catalogId: string, categoryId: string, qty?: number) => void;

  // --- сохранённые сметы ---
  saveSmeta: (name: string) => string;
  deleteSmeta: (id: string) => void;
  restoreSmeta: (id: string) => void;
}

function touchProject(project: Project): Project {
  return { ...project, updatedAt: nowIso() };
}

/** Пересчитывает живую (db) базу проекта под применённый к нему пресет. */
function reapplyProjectPreset(p: Project, preset: ServicePreset): Project {
  return {
    ...p,
    db: applyPreset(p.baseDb, preset),
    presetId: preset.id,
    priceMultiplier: preset.priceMultiplier,
    building: {
      ...p.building,
      serviceClass: preset.maxServiceClass,
      capitalRepairMrpMultiplier: preset.capitalRepairMrpMultiplier,
      commercialRateCoefficient: preset.commercialRateCoefficient,
    },
  };
}

export const useProjectsStore = create<ProjectsState>()(
  persist(
    (set, get) => {
      const initialPresets = BUILTIN_PRESETS;
      const initial = seedInitialProject(initialPresets);
      return {
        projects: { [initial.id]: initial },
        projectOrder: [initial.id],
        activeProjectId: initial.id,
        catalog: seedCatalogFromDatabase(initial.baseDb),
        presets: initialPresets,
        savedSmetas: {},
        budgetPeriod: "month",

        createProject: (name, template, objectType = "residential") => {
          const id = genId("proj");
          const preset = findPreset(get().presets, DEFAULT_PRESET_ID);
          const baseDb = template === "korkem1" ? buildDefaultDatabase() : buildBlankDatabase();
          const db = applyPreset(baseDb, preset);
          const building =
            template === "korkem1" ? { ...DEFAULT_BUILDING, name } : buildBlankBuilding(name, objectType);
          const ts = nowIso();
          const project: Project = {
            id,
            name,
            building,
            baseDb,
            db,
            presetId: preset.id,
            priceMultiplier: preset.priceMultiplier,
            createdAt: ts,
            updatedAt: ts,
          };
          set((s) => ({
            projects: { ...s.projects, [id]: project },
            projectOrder: [...s.projectOrder, id],
            activeProjectId: id,
          }));
          return id;
        },

        switchProject: (id) => {
          if (get().projects[id]) set({ activeProjectId: id });
        },

        renameProject: (id, name) => {
          set((s) => {
            const p = s.projects[id];
            if (!p) return s;
            return { projects: { ...s.projects, [id]: touchProject({ ...p, name }) } };
          });
        },

        deleteProject: (id) => {
          const s = get();
          if (s.projectOrder.length <= 1) return; // всегда хотя бы один проект
          const projects = { ...s.projects };
          delete projects[id];
          const projectOrder = s.projectOrder.filter((x) => x !== id);
          const activeProjectId = s.activeProjectId === id ? projectOrder[0] : s.activeProjectId;
          set({ projects, projectOrder, activeProjectId });
        },

        setBuilding: (patch) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const building = { ...p.building, ...patch };
            return { projects: { ...s.projects, [p.id]: touchProject({ ...p, building }) } };
          });
        },

        setPreset: (id) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const preset = findPreset(s.presets, id);
            return { projects: { ...s.projects, [p.id]: touchProject(reapplyProjectPreset(p, preset)) } };
          });
        },

        createPreset: (preset) => {
          const id = genId("preset");
          set((s) => ({ presets: [...s.presets, { ...preset, id, builtIn: false }] }));
          return id;
        },

        updatePreset: (id, patch) => {
          set((s) => {
            const presets = s.presets.map((p) => (p.id === id ? { ...p, ...patch } : p));
            const active = s.projects[s.activeProjectId];
            // если пресет применён к активному проекту — пересчитать его немедленно
            if (active.presetId !== id) return { presets };
            const preset = findPreset(presets, id);
            return {
              presets,
              projects: { ...s.projects, [active.id]: touchProject(reapplyProjectPreset(active, preset)) },
            };
          });
        },

        duplicatePreset: (id) => {
          const source = findPreset(get().presets, id);
          const newId = genId("preset");
          const copy: ServicePreset = {
            ...source,
            id: newId,
            label: `${source.label} (копия)`,
            builtIn: false,
          };
          set((s) => ({ presets: [...s.presets, copy] }));
          return newId;
        },

        deletePreset: (id) => {
          const s = get();
          const preset = s.presets.find((p) => p.id === id);
          if (!preset || preset.builtIn) return; // встроенные пресеты не удаляются
          const presets = s.presets.filter((p) => p.id !== id);
          // проекты, использовавшие удалённый пресет, переводим на «Комфорт (Стандарт)»
          const fallback = findPreset(presets, DEFAULT_PRESET_ID);
          const projects = { ...s.projects };
          for (const pid of s.projectOrder) {
            if (projects[pid].presetId === id) {
              projects[pid] = touchProject(reapplyProjectPreset(projects[pid], fallback));
            }
          }
          set({ presets, projects });
        },

        setBudgetPeriod: (budgetPeriod) => set({ budgetPeriod }),

        toggleItem: (itemId) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const items = p.db.items.map((it) => (it.id === itemId ? { ...it, enabled: !it.enabled } : it));
            return { projects: { ...s.projects, [p.id]: touchProject({ ...p, db: { ...p.db, items } }) } };
          });
        },

        updateItem: (itemId, patch) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const items = p.db.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it));
            return { projects: { ...s.projects, [p.id]: touchProject({ ...p, db: { ...p.db, items } }) } };
          });
        },

        addItem: (categoryId, item) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const newItem: CostItem = {
              id: genId("item"),
              categoryId,
              frequency: "annual",
              enabled: true,
              ...item,
            };
            const items = [...p.db.items, newItem];
            const baseItems = [...p.baseDb.items, newItem];
            return {
              projects: {
                ...s.projects,
                [p.id]: touchProject({
                  ...p,
                  db: { ...p.db, items },
                  baseDb: { ...p.baseDb, items: baseItems },
                }),
              },
            };
          });
        },

        removeItem: (itemId) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const items = p.db.items.filter((it) => it.id !== itemId);
            const baseItems = p.baseDb.items.filter((it) => it.id !== itemId);
            return {
              projects: {
                ...s.projects,
                [p.id]: touchProject({
                  ...p,
                  db: { ...p.db, items },
                  baseDb: { ...p.baseDb, items: baseItems },
                }),
              },
            };
          });
        },

        togglePayroll: (id) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const payroll = p.db.payroll.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x));
            return { projects: { ...s.projects, [p.id]: touchProject({ ...p, db: { ...p.db, payroll } }) } };
          });
        },

        updatePayroll: (id, patch) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const payroll = p.db.payroll.map((x) => (x.id === id ? { ...x, ...patch } : x));
            return { projects: { ...s.projects, [p.id]: touchProject({ ...p, db: { ...p.db, payroll } }) } };
          });
        },

        addPayroll: (categoryId, position) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const newPos: PayrollPosition = {
              id: genId("pay"),
              categoryId,
              enabled: true,
              ...position,
            };
            const payroll = [...p.db.payroll, newPos];
            const basePayroll = [...p.baseDb.payroll, newPos];
            return {
              projects: {
                ...s.projects,
                [p.id]: touchProject({
                  ...p,
                  db: { ...p.db, payroll },
                  baseDb: { ...p.baseDb, payroll: basePayroll },
                }),
              },
            };
          });
        },

        removePayroll: (id) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const payroll = p.db.payroll.filter((x) => x.id !== id);
            const basePayroll = p.baseDb.payroll.filter((x) => x.id !== id);
            return {
              projects: {
                ...s.projects,
                [p.id]: touchProject({
                  ...p,
                  db: { ...p.db, payroll },
                  baseDb: { ...p.baseDb, payroll: basePayroll },
                }),
              },
            };
          });
        },

        toggleStaffOutsourceGroup: (group, mode) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const payroll = p.db.payroll.map((x) =>
              x.staffOutsourceGroup === group ? { ...x, enabled: x.mode === mode } : x,
            );
            const items = p.db.items.map((it) =>
              it.staffOutsourceGroup === group ? { ...it, enabled: it.mode === mode } : it,
            );
            return {
              projects: { ...s.projects, [p.id]: touchProject({ ...p, db: { ...p.db, payroll, items } }) },
            };
          });
        },

        // --- справочник ---
        addCatalogEntry: (entry) => {
          const ts = nowIso();
          set((s) => ({
            catalog: [...s.catalog, { ...entry, id: genId("cat"), createdAt: ts, updatedAt: ts }],
          }));
        },

        updateCatalogEntry: (id, patch) => {
          set((s) => ({
            catalog: s.catalog.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: nowIso() } : c)),
          }));
        },

        removeCatalogEntry: (id) => {
          set((s) => ({ catalog: s.catalog.filter((c) => c.id !== id) }));
        },

        importCatalogRows: (rows) => {
          const ts = nowIso();
          const newEntries: CatalogEntry[] = rows
            .filter((r) => r.name && r.name.trim().length > 0)
            .map((r) => ({
              id: genId("cat"),
              name: r.name.trim(),
              unit: r.unit || "шт.",
              unitPrice: Number.isFinite(r.unitPrice) ? r.unitPrice : 0,
              defaultQty: Number.isFinite(r.defaultQty) ? r.defaultQty : 1,
              tag: r.tag,
              source: r.source,
              createdAt: ts,
              updatedAt: ts,
            }));
          set((s) => ({ catalog: [...s.catalog, ...newEntries] }));
          return newEntries.length;
        },

        insertCatalogEntryIntoProject: (catalogId, categoryId, qty) => {
          const entry = get().catalog.find((c) => c.id === catalogId);
          if (!entry) return;
          get().addItem(categoryId, {
            name: entry.name,
            unit: entry.unit,
            unitPrice: entry.unitPrice,
            annualQty: qty ?? entry.defaultQty,
            tooltip: entry.tooltip,
            source: entry.source,
          });
        },

        // --- сохранённые сметы ---
        saveSmeta: (name) => {
          const s = get();
          const p = s.projects[s.activeProjectId];
          const tariff = computeTariff(p.db, p.building, p.priceMultiplier);
          const id = genId("smeta");
          const smeta: SavedSmeta = {
            id,
            projectId: p.id,
            name,
            savedAt: nowIso(),
            building: p.building,
            db: p.db,
            presetId: p.presetId,
            priceMultiplier: p.priceMultiplier,
            tariff,
          };
          set((st) => ({ savedSmetas: { ...st.savedSmetas, [id]: smeta } }));
          return id;
        },

        deleteSmeta: (id) => {
          set((s) => {
            const savedSmetas = { ...s.savedSmetas };
            delete savedSmetas[id];
            return { savedSmetas };
          });
        },

        restoreSmeta: (id) => {
          set((s) => {
            const smeta = s.savedSmetas[id];
            const p = s.projects[smeta.projectId] ?? s.projects[s.activeProjectId];
            if (!smeta || !p) return s;
            const restored = touchProject({
              ...p,
              building: smeta.building,
              db: smeta.db,
              baseDb: smeta.db,
              presetId: smeta.presetId,
              priceMultiplier: smeta.priceMultiplier,
            });
            return {
              activeProjectId: p.id,
              projects: { ...s.projects, [p.id]: restored },
            };
          });
        },
      };
    },
    {
      name: "qazaqosi-projects-v1",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      version: 1,
      // Версия 0 (без поля version) хранила project.scenario: "economy"|"standard"|"business"
      // и не знала о пресетах вовсе. Переносим её в текущую форму, а не выбрасываем
      // ранее сохранённые объекты/справочник/сметы пользователя.
      migrate: (persisted, version) => {
        if (version >= 1) return persisted as unknown;
        const old = persisted as {
          projects?: Record<string, Project & { scenario?: string }>;
          projectOrder?: string[];
          activeProjectId?: string;
          catalog?: CatalogEntry[];
          savedSmetas?: Record<string, SavedSmeta & { scenario?: string }>;
          budgetPeriod?: BudgetPeriod;
        };
        const presets = BUILTIN_PRESETS;
        const projects: Record<string, Project> = {};
        for (const [id, p] of Object.entries(old.projects ?? {})) {
          const { scenario, ...rest } = p;
          projects[id] = { ...rest, presetId: scenario ?? DEFAULT_PRESET_ID };
        }
        const savedSmetas: Record<string, SavedSmeta> = {};
        for (const [id, sm] of Object.entries(old.savedSmetas ?? {})) {
          const { scenario, ...rest } = sm;
          savedSmetas[id] = { ...rest, presetId: scenario ?? DEFAULT_PRESET_ID };
        }
        return {
          projects,
          projectOrder: old.projectOrder ?? [],
          activeProjectId: old.activeProjectId ?? "",
          catalog: old.catalog ?? [],
          presets,
          savedSmetas,
          budgetPeriod: old.budgetPeriod ?? "month",
        };
      },
    },
  ),
);

/** Активный проект (селектор-хелпер для компонентов). */
export function selectActiveProject(state: ProjectsState): Project {
  return state.projects[state.activeProjectId];
}
