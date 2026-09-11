"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  ActualExpenseEntry,
  AgendaItem,
  Asset,
  BuildingProfile,
  CatalogEntry,
  CostItem,
  EquipmentType,
  GeneralMeeting,
  MaintenanceLogEntry,
  MaintenanceTask,
  MaintenanceWorkType,
  MaterialUsage,
  MeetingFormat,
  MeetingParticipant,
  ObjectType,
  OwnershipUnit,
  PayrollPosition,
  Project,
  SavedSmeta,
  ServicePreset,
  SparePartItem,
  VoteChoice,
  WorkOrder,
  WorkOrderChecklistItem,
  WorkOrderStatus,
} from "@/lib/calculator/types";
import { applyWriteOffToStock, computeMaterialsCost } from "@/lib/calculator/inventoryEngine";
import { generateTicketNumber } from "@/lib/calculator/workOrderEngine";
import { buildBlankDatabase, buildDefaultDatabase } from "@/lib/calculator/database";
import { BUILTIN_PRESETS, DEFAULT_BUILDING, buildBlankBuilding } from "@/lib/calculator/presets";
import { applyPreset, computeTariff } from "@/lib/calculator/engine";
import { seedCatalogFromDatabase } from "@/lib/calculator/catalogSeed";
import { EQUIPMENT_TYPES } from "@/lib/calculator/data/equipmentTypes";
import { seedDemoAssets } from "@/lib/calculator/data/demoAssets";
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
    assets: seedDemoAssets(DEFAULT_BUILDING),
    capitalFundBalance: 0,
    units: [],
    meetings: [],
    maintenanceTasks: [],
    actuals: [],
    spareParts: [],
    maintenanceLogs: [],
    workOrders: [],
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
  equipmentTypes: EquipmentType[];
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

  // --- износ оборудования и план капремонта ---
  addAsset: (
    asset: Pick<Asset, "name" | "category" | "quantity" | "installedYear" | "normativeLifeYears" | "replacementUnitCost"> &
      Partial<Asset>,
  ) => void;
  updateAsset: (id: string, patch: Partial<Asset>) => void;
  removeAsset: (id: string) => void;
  setCapitalFundBalance: (balance: number) => void;
  addEquipmentType: (type: Omit<EquipmentType, "id">) => string;
  updateEquipmentType: (id: string, patch: Partial<Omit<EquipmentType, "id">>) => void;
  removeEquipmentType: (id: string) => void;
  /** Добавляет статью «Замена: <актив>» в смету активного проекта на основе расчётной стоимости замены */
  insertReplacementIntoSmeta: (assetId: string, categoryId: string) => void;

  // --- реестр собственников ---
  addUnit: (
    unit: Pick<OwnershipUnit, "unitType" | "number" | "area" | "ownerName"> & Partial<OwnershipUnit>,
  ) => void;
  updateUnit: (id: string, patch: Partial<OwnershipUnit>) => void;
  removeUnit: (id: string) => void;
  importUnits: (
    rows: (Pick<OwnershipUnit, "unitType" | "number" | "area" | "ownerName"> & Partial<OwnershipUnit>)[],
  ) => number;

  // --- общие собрания ---
  createMeeting: (title: string, meetingDate: string, format: MeetingFormat) => string;
  updateMeeting: (
    id: string,
    patch: Partial<Omit<GeneralMeeting, "id" | "participants" | "agendaItems" | "votes">>,
  ) => void;
  removeMeeting: (id: string) => void;
  setParticipant: (meetingId: string, unitId: string, patch: Partial<MeetingParticipant>) => void;
  markAllPresent: (meetingId: string, present: boolean) => void;
  addAgendaItem: (
    meetingId: string,
    item: Pick<AgendaItem, "title" | "majorityRule"> & Partial<AgendaItem>,
  ) => void;
  updateAgendaItem: (meetingId: string, itemId: string, patch: Partial<AgendaItem>) => void;
  removeAgendaItem: (meetingId: string, itemId: string) => void;
  setVote: (meetingId: string, agendaItemId: string, unitId: string, choice: VoteChoice) => void;

  // --- календарь регламентных работ ---
  addMaintenanceTask: (
    task: Pick<MaintenanceTask, "name" | "periodicityMonths"> & Partial<MaintenanceTask>,
  ) => void;
  updateMaintenanceTask: (id: string, patch: Partial<MaintenanceTask>) => void;
  removeMaintenanceTask: (id: string) => void;
  markMaintenanceTaskServiced: (id: string, date: string) => void;

  // --- план/факт ---
  addActual: (
    entry: Pick<ActualExpenseEntry, "month" | "categoryId" | "amount"> & Partial<ActualExpenseEntry>,
  ) => void;
  updateActual: (id: string, patch: Partial<ActualExpenseEntry>) => void;
  removeActual: (id: string) => void;
  /** Создаёт или обновляет единственную запись факта для пары месяц+категория */
  setActualAmount: (month: string, categoryId: string, amount: number) => void;

  // --- склад ЗИП и журнал работ ---
  addSparePart: (
    item: Pick<SparePartItem, "name" | "unit" | "category" | "quantityOnHand" | "minThreshold" | "avgUnitPrice"> &
      Partial<SparePartItem>,
  ) => void;
  updateSparePart: (id: string, patch: Partial<SparePartItem>) => void;
  removeSparePart: (id: string) => void;
  importSpareParts: (
    rows: (Pick<SparePartItem, "name" | "unit" | "category" | "quantityOnHand" | "minThreshold" | "avgUnitPrice"> &
      Partial<SparePartItem>)[],
  ) => number;
  /** Добавляет наряд в журнал, списывает использованные материалы со склада и (если указана статья сметы) фиксирует расход в Плане/факте текущего месяца */
  recordMaintenanceLog: (
    entry: Pick<MaintenanceLogEntry, "date" | "technicianName" | "workType" | "description"> &
      Partial<MaintenanceLogEntry>,
  ) => void;
  removeMaintenanceLog: (id: string) => void;

  // --- наряды (WorkOrder) ---
  createWorkOrder: (
    order: Pick<WorkOrder, "title" | "description" | "deadline"> & Partial<WorkOrder>,
  ) => string;
  updateWorkOrder: (id: string, patch: Partial<WorkOrder>) => void;
  removeWorkOrder: (id: string) => void;
  setWorkOrderStatus: (id: string, status: WorkOrderStatus) => void;
  addWorkOrderChecklistItem: (id: string, text: string, assetId?: string) => void;
  toggleWorkOrderChecklistItem: (id: string, itemId: string) => void;
  removeWorkOrderChecklistItem: (id: string, itemId: string) => void;
  approveWorkOrder: (id: string, approvedBy: string) => void;
  /** Закрывает наряд: статус → completed, и создаёт MaintenanceLogEntry (по одной на каждый целевой актив для группового наряда) — списывает материалы и пишет План/факт через уже существующую логику */
  completeWorkOrder: (
    id: string,
    completion: {
      actualEndDate?: string;
      materialsUsed?: MaterialUsage[];
      technicianName?: string;
      workType?: MaintenanceWorkType;
    },
  ) => void;

  // --- сохранённые сметы ---
  saveSmeta: (name: string) => string;
  deleteSmeta: (id: string) => void;
  restoreSmeta: (id: string) => void;
}

function touchProject(project: Project): Project {
  return { ...project, updatedAt: nowIso() };
}

function updateMeetingInProject(
  p: Project,
  meetingId: string,
  updater: (m: GeneralMeeting) => GeneralMeeting,
): Project {
  return { ...p, meetings: p.meetings.map((m) => (m.id === meetingId ? updater(m) : m)) };
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
        equipmentTypes: EQUIPMENT_TYPES,
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
            assets: [],
            capitalFundBalance: 0,
            units: [],
            meetings: [],
            maintenanceTasks: [],
            actuals: [],
            spareParts: [],
            maintenanceLogs: [],
            workOrders: [],
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

        // --- износ оборудования и план капремонта ---
        addAsset: (asset) => {
          const ts = nowIso();
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const newAsset: Asset = { id: genId("asset"), createdAt: ts, updatedAt: ts, ...asset };
            return {
              projects: { ...s.projects, [p.id]: touchProject({ ...p, assets: [...p.assets, newAsset] }) },
            };
          });
        },

        updateAsset: (id, patch) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const assets = p.assets.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: nowIso() } : a));
            return { projects: { ...s.projects, [p.id]: touchProject({ ...p, assets }) } };
          });
        },

        removeAsset: (id) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const assets = p.assets.filter((a) => a.id !== id);
            return { projects: { ...s.projects, [p.id]: touchProject({ ...p, assets }) } };
          });
        },

        setCapitalFundBalance: (balance) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            return { projects: { ...s.projects, [p.id]: touchProject({ ...p, capitalFundBalance: balance }) } };
          });
        },

        addEquipmentType: (type) => {
          const id = genId("eqtype");
          set((s) => ({ equipmentTypes: [...s.equipmentTypes, { ...type, id }] }));
          return id;
        },

        updateEquipmentType: (id, patch) => {
          set((s) => ({
            equipmentTypes: s.equipmentTypes.map((t) => (t.id === id ? { ...t, ...patch } : t)),
          }));
        },

        removeEquipmentType: (id) => {
          set((s) => ({ equipmentTypes: s.equipmentTypes.filter((t) => t.id !== id) }));
        },

        insertReplacementIntoSmeta: (assetId, categoryId) => {
          const s = get();
          const p = s.projects[s.activeProjectId];
          const asset = p.assets.find((a) => a.id === assetId);
          if (!asset) return;
          get().addItem(categoryId, {
            name: `Замена: ${asset.name}`,
            unit: "усл.",
            unitPrice: asset.quantity * asset.replacementUnitCost,
            annualQty: 1,
            tooltip: `Добавлено из реестра оборудования по плану замены (введено в эксплуатацию в ${asset.installedYear} г.)`,
            source: "Реестр оборудования / план капремонта",
          });
        },

        // --- реестр собственников ---
        addUnit: (unit) => {
          const ts = nowIso();
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const newUnit: OwnershipUnit = { id: genId("unit"), createdAt: ts, updatedAt: ts, ...unit };
            return { projects: { ...s.projects, [p.id]: touchProject({ ...p, units: [...p.units, newUnit] }) } };
          });
        },

        updateUnit: (id, patch) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const units = p.units.map((u) => (u.id === id ? { ...u, ...patch, updatedAt: nowIso() } : u));
            return { projects: { ...s.projects, [p.id]: touchProject({ ...p, units }) } };
          });
        },

        removeUnit: (id) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const units = p.units.filter((u) => u.id !== id);
            return { projects: { ...s.projects, [p.id]: touchProject({ ...p, units }) } };
          });
        },

        importUnits: (rows) => {
          const ts = nowIso();
          const newUnits: OwnershipUnit[] = rows
            .filter((r) => r.number && r.number.trim().length > 0)
            .map((r) => ({
              id: genId("unit"),
              createdAt: ts,
              updatedAt: ts,
              ...r,
              area: Number.isFinite(r.area) ? r.area : 0,
              ownerName: r.ownerName ?? "",
            }));
          set((s) => {
            const p = s.projects[s.activeProjectId];
            return {
              projects: { ...s.projects, [p.id]: touchProject({ ...p, units: [...p.units, ...newUnits] }) },
            };
          });
          return newUnits.length;
        },

        // --- общие собрания ---
        createMeeting: (title, meetingDate, format) => {
          const id = genId("meeting");
          const ts = nowIso();
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const participants: MeetingParticipant[] = p.units.map((u) => ({ unitId: u.id, present: false }));
            const meeting: GeneralMeeting = {
              id,
              title,
              meetingDate,
              format,
              participants,
              agendaItems: [],
              votes: [],
              createdAt: ts,
              updatedAt: ts,
            };
            return {
              projects: { ...s.projects, [p.id]: touchProject({ ...p, meetings: [...p.meetings, meeting] }) },
            };
          });
          return id;
        },

        updateMeeting: (id, patch) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            return {
              projects: {
                ...s.projects,
                [p.id]: touchProject(
                  updateMeetingInProject(p, id, (m) => ({ ...m, ...patch, updatedAt: nowIso() })),
                ),
              },
            };
          });
        },

        removeMeeting: (id) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const meetings = p.meetings.filter((m) => m.id !== id);
            return { projects: { ...s.projects, [p.id]: touchProject({ ...p, meetings }) } };
          });
        },

        setParticipant: (meetingId, unitId, patch) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            return {
              projects: {
                ...s.projects,
                [p.id]: touchProject(
                  updateMeetingInProject(p, meetingId, (m) => ({
                    ...m,
                    participants: m.participants.some((pt) => pt.unitId === unitId)
                      ? m.participants.map((pt) => (pt.unitId === unitId ? { ...pt, ...patch } : pt))
                      : [...m.participants, { unitId, present: false, ...patch }],
                    updatedAt: nowIso(),
                  })),
                ),
              },
            };
          });
        },

        markAllPresent: (meetingId, present) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            return {
              projects: {
                ...s.projects,
                [p.id]: touchProject(
                  updateMeetingInProject(p, meetingId, (m) => ({
                    ...m,
                    participants: m.participants.map((pt) => ({ ...pt, present })),
                    updatedAt: nowIso(),
                  })),
                ),
              },
            };
          });
        },

        addAgendaItem: (meetingId, item) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const newItem: AgendaItem = { id: genId("agenda"), ...item };
            return {
              projects: {
                ...s.projects,
                [p.id]: touchProject(
                  updateMeetingInProject(p, meetingId, (m) => ({
                    ...m,
                    agendaItems: [...m.agendaItems, newItem],
                    updatedAt: nowIso(),
                  })),
                ),
              },
            };
          });
        },

        updateAgendaItem: (meetingId, itemId, patch) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            return {
              projects: {
                ...s.projects,
                [p.id]: touchProject(
                  updateMeetingInProject(p, meetingId, (m) => ({
                    ...m,
                    agendaItems: m.agendaItems.map((a) => (a.id === itemId ? { ...a, ...patch } : a)),
                    updatedAt: nowIso(),
                  })),
                ),
              },
            };
          });
        },

        removeAgendaItem: (meetingId, itemId) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            return {
              projects: {
                ...s.projects,
                [p.id]: touchProject(
                  updateMeetingInProject(p, meetingId, (m) => ({
                    ...m,
                    agendaItems: m.agendaItems.filter((a) => a.id !== itemId),
                    votes: m.votes.filter((v) => v.agendaItemId !== itemId),
                    updatedAt: nowIso(),
                  })),
                ),
              },
            };
          });
        },

        setVote: (meetingId, agendaItemId, unitId, choice) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            return {
              projects: {
                ...s.projects,
                [p.id]: touchProject(
                  updateMeetingInProject(p, meetingId, (m) => {
                    const exists = m.votes.some((v) => v.agendaItemId === agendaItemId && v.unitId === unitId);
                    const votes = exists
                      ? m.votes.map((v) =>
                          v.agendaItemId === agendaItemId && v.unitId === unitId ? { ...v, choice } : v,
                        )
                      : [...m.votes, { agendaItemId, unitId, choice }];
                    return { ...m, votes, updatedAt: nowIso() };
                  }),
                ),
              },
            };
          });
        },

        // --- календарь регламентных работ ---
        addMaintenanceTask: (task) => {
          const ts = nowIso();
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const newTask: MaintenanceTask = { id: genId("mtask"), createdAt: ts, updatedAt: ts, ...task };
            return {
              projects: { ...s.projects, [p.id]: touchProject({ ...p, maintenanceTasks: [...p.maintenanceTasks, newTask] }) },
            };
          });
        },

        updateMaintenanceTask: (id, patch) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const maintenanceTasks = p.maintenanceTasks.map((t) =>
              t.id === id ? { ...t, ...patch, updatedAt: nowIso() } : t,
            );
            return { projects: { ...s.projects, [p.id]: touchProject({ ...p, maintenanceTasks }) } };
          });
        },

        removeMaintenanceTask: (id) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const maintenanceTasks = p.maintenanceTasks.filter((t) => t.id !== id);
            return { projects: { ...s.projects, [p.id]: touchProject({ ...p, maintenanceTasks }) } };
          });
        },

        markMaintenanceTaskServiced: (id, date) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const maintenanceTasks = p.maintenanceTasks.map((t) =>
              t.id === id ? { ...t, lastServiceDate: date, updatedAt: nowIso() } : t,
            );
            return { projects: { ...s.projects, [p.id]: touchProject({ ...p, maintenanceTasks }) } };
          });
        },

        // --- план/факт ---
        addActual: (entry) => {
          const ts = nowIso();
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const newEntry: ActualExpenseEntry = { id: genId("actual"), createdAt: ts, updatedAt: ts, ...entry };
            return { projects: { ...s.projects, [p.id]: touchProject({ ...p, actuals: [...p.actuals, newEntry] }) } };
          });
        },

        updateActual: (id, patch) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const actuals = p.actuals.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: nowIso() } : a));
            return { projects: { ...s.projects, [p.id]: touchProject({ ...p, actuals }) } };
          });
        },

        removeActual: (id) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const actuals = p.actuals.filter((a) => a.id !== id);
            return { projects: { ...s.projects, [p.id]: touchProject({ ...p, actuals }) } };
          });
        },

        setActualAmount: (month, categoryId, amount) => {
          const ts = nowIso();
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const existing = p.actuals.find((a) => a.month === month && a.categoryId === categoryId);
            const actuals = existing
              ? p.actuals.map((a) => (a.id === existing.id ? { ...a, amount, updatedAt: ts } : a))
              : [...p.actuals, { id: genId("actual"), month, categoryId, amount, createdAt: ts, updatedAt: ts }];
            return { projects: { ...s.projects, [p.id]: touchProject({ ...p, actuals }) } };
          });
        },

        // --- склад ЗИП и журнал работ ---
        addSparePart: (item) => {
          const ts = nowIso();
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const newItem: SparePartItem = { id: genId("part"), createdAt: ts, updatedAt: ts, ...item };
            return {
              projects: { ...s.projects, [p.id]: touchProject({ ...p, spareParts: [...p.spareParts, newItem] }) },
            };
          });
        },

        updateSparePart: (id, patch) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const spareParts = p.spareParts.map((sp) => (sp.id === id ? { ...sp, ...patch, updatedAt: nowIso() } : sp));
            return { projects: { ...s.projects, [p.id]: touchProject({ ...p, spareParts }) } };
          });
        },

        removeSparePart: (id) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const spareParts = p.spareParts.filter((sp) => sp.id !== id);
            return { projects: { ...s.projects, [p.id]: touchProject({ ...p, spareParts }) } };
          });
        },

        importSpareParts: (rows) => {
          const ts = nowIso();
          const newItems: SparePartItem[] = rows
            .filter((r) => r.name && r.name.trim().length > 0)
            .map((r) => ({ id: genId("part"), createdAt: ts, updatedAt: ts, ...r }));
          set((s) => {
            const p = s.projects[s.activeProjectId];
            return {
              projects: { ...s.projects, [p.id]: touchProject({ ...p, spareParts: [...p.spareParts, ...newItems] }) },
            };
          });
          return newItems.length;
        },

        recordMaintenanceLog: (entry) => {
          const ts = nowIso();
          const newLog: MaintenanceLogEntry = {
            id: genId("mlog"),
            materialsUsed: [],
            createdAt: ts,
            updatedAt: ts,
            ...entry,
          };
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const spareParts = applyWriteOffToStock(p.spareParts, newLog.materialsUsed);
            return {
              projects: {
                ...s.projects,
                [p.id]: touchProject({ ...p, maintenanceLogs: [...p.maintenanceLogs, newLog], spareParts }),
              },
            };
          });
          const materialsCost = computeMaterialsCost(newLog.materialsUsed);
          if (newLog.costItemId && materialsCost > 0) {
            get().addActual({
              month: newLog.date.slice(0, 7),
              categoryId: newLog.costItemId,
              amount: materialsCost,
              note: `Списание по наряду от ${newLog.date}`,
            });
          }
        },

        removeMaintenanceLog: (id) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const maintenanceLogs = p.maintenanceLogs.filter((l) => l.id !== id);
            return { projects: { ...s.projects, [p.id]: touchProject({ ...p, maintenanceLogs }) } };
          });
        },

        // --- наряды (WorkOrder) ---
        createWorkOrder: (order) => {
          const ts = nowIso();
          const id = genId("wo");
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const newOrder: WorkOrder = {
              id,
              ticketNumber: generateTicketNumber(p.workOrders),
              status: "draft",
              complexity: "L1_ROUTINE",
              seasonality: "all_year",
              isNightShift: false,
              isBatch: false,
              targetAssetIds: [],
              assignedStaffNames: [],
              plannedStartDate: ts.slice(0, 10),
              approval: { required: false, status: "none" },
              checklist: [],
              createdAt: ts,
              updatedAt: ts,
              ...order,
            };
            return {
              projects: { ...s.projects, [p.id]: touchProject({ ...p, workOrders: [...p.workOrders, newOrder] }) },
            };
          });
          return id;
        },

        updateWorkOrder: (id, patch) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const workOrders = p.workOrders.map((o) => (o.id === id ? { ...o, ...patch, updatedAt: nowIso() } : o));
            return { projects: { ...s.projects, [p.id]: touchProject({ ...p, workOrders }) } };
          });
        },

        removeWorkOrder: (id) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const workOrders = p.workOrders.filter((o) => o.id !== id);
            return { projects: { ...s.projects, [p.id]: touchProject({ ...p, workOrders }) } };
          });
        },

        setWorkOrderStatus: (id, status) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const ts = nowIso();
            const workOrders = p.workOrders.map((o) => {
              if (o.id !== id) return o;
              const actualStartDate = status === "in_progress" && !o.actualStartDate ? ts.slice(0, 10) : o.actualStartDate;
              return { ...o, status, actualStartDate, updatedAt: ts };
            });
            return { projects: { ...s.projects, [p.id]: touchProject({ ...p, workOrders }) } };
          });
        },

        addWorkOrderChecklistItem: (id, text, assetId) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const newItem: WorkOrderChecklistItem = { id: genId("check"), text, isCompleted: false, assetId };
            const workOrders = p.workOrders.map((o) =>
              o.id === id ? { ...o, checklist: [...o.checklist, newItem], updatedAt: nowIso() } : o,
            );
            return { projects: { ...s.projects, [p.id]: touchProject({ ...p, workOrders }) } };
          });
        },

        toggleWorkOrderChecklistItem: (id, itemId) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const workOrders = p.workOrders.map((o) =>
              o.id === id
                ? {
                    ...o,
                    checklist: o.checklist.map((c) => (c.id === itemId ? { ...c, isCompleted: !c.isCompleted } : c)),
                    updatedAt: nowIso(),
                  }
                : o,
            );
            return { projects: { ...s.projects, [p.id]: touchProject({ ...p, workOrders }) } };
          });
        },

        removeWorkOrderChecklistItem: (id, itemId) => {
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const workOrders = p.workOrders.map((o) =>
              o.id === id ? { ...o, checklist: o.checklist.filter((c) => c.id !== itemId), updatedAt: nowIso() } : o,
            );
            return { projects: { ...s.projects, [p.id]: touchProject({ ...p, workOrders }) } };
          });
        },

        approveWorkOrder: (id, approvedBy) => {
          const ts = nowIso();
          set((s) => {
            const p = s.projects[s.activeProjectId];
            const workOrders = p.workOrders.map((o) =>
              o.id === id
                ? {
                    ...o,
                    approval: { ...o.approval, status: "approved" as const, approvedBy, approvedAt: ts },
                    status: o.status === "pending_approval" ? ("scheduled" as const) : o.status,
                    updatedAt: ts,
                  }
                : o,
            );
            return { projects: { ...s.projects, [p.id]: touchProject({ ...p, workOrders }) } };
          });
        },

        completeWorkOrder: (id, completion) => {
          const order = get().projects[get().activeProjectId].workOrders.find((o) => o.id === id);
          if (!order) return;
          const actualEndDate = completion.actualEndDate || nowIso().slice(0, 10);
          const materialsUsed = completion.materialsUsed ?? [];
          const technicianName = completion.technicianName || order.assignedStaffNames[0] || "—";
          const workType = completion.workType ?? "repair";

          // Групповой наряд -> отдельная MaintenanceLogEntry на каждый целевой актив (материалы
          // относятся целиком к первой записи, чтобы не задваивать списание со склада).
          const targets = order.targetAssetIds.length > 0 ? order.targetAssetIds : [undefined];
          targets.forEach((assetId, i) => {
            get().recordMaintenanceLog({
              date: actualEndDate,
              technicianName,
              workType,
              description: `${order.ticketNumber}: ${order.title}`,
              assetId,
              materialsUsed: i === 0 ? materialsUsed : [],
              costItemId: order.costItemId,
            });
          });

          set((s) => {
            const p = s.projects[s.activeProjectId];
            const workOrders = p.workOrders.map((o) =>
              o.id === id ? { ...o, status: "completed" as const, actualEndDate, updatedAt: nowIso() } : o,
            );
            return { projects: { ...s.projects, [p.id]: touchProject({ ...p, workOrders }) } };
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
      version: 7,
      // v0 → v1: project.scenario:"economy"|"standard"|"business" → presetId,
      //          пресетов не существовало вовсе.
      // v1 → v2: у проектов не было assets[]/capitalFundBalance, справочника
      //          equipmentTypes не существовало. Переносим шаг за шагом, а не
      //          выбрасываем ранее сохранённые объекты/справочник/сметы пользователя.
      // v2 → v3: у проектов не было реестра собственников (units), собраний
      //          (meetings), календаря регламентных работ (maintenanceTasks) и
      //          фактических расходов (actuals) — добавляем как пустые массивы.
      // v3 → v4: у проектов не было склада ЗИП (spareParts) и журнала работ
      //          (maintenanceLogs) — добавляем как пустые массивы.
      // v4 → v5: у проектов не было нарядов (workOrders) — добавляем как
      //          пустой массив.
      // v5 → v6: у BuildingProfile (в проектах и сохранённых сметах) и у
      //          ServicePreset не было storageRateCoefficient/
      //          parkingRateCoefficient — раньше кладовые и машиноместа
      //          неявно начислялись по базовому тарифу (коэффициент 1),
      //          проставляем это явно, чтобы расчёт не превратился в NaN.
      // v6 → v7: у BuildingProfile не было parkingFlatFeePerSpot/
      //          parkingNonPaymentRatePercent (пол и резерв на неплатежи
      //          для паркинга) — бэкофилл нейтральными 0/0 (пол/резерв не
      //          действуют), не меняет расчёт существующих проектов, пока
      //          пользователь не включит их явно на Шаге 1.
      migrate: (persisted, version) => {
        type LooseProject = Project & {
          scenario?: string;
          assets?: Asset[];
          capitalFundBalance?: number;
          units?: Project["units"];
          meetings?: Project["meetings"];
          maintenanceTasks?: Project["maintenanceTasks"];
          actuals?: Project["actuals"];
          spareParts?: Project["spareParts"];
          maintenanceLogs?: Project["maintenanceLogs"];
          workOrders?: Project["workOrders"];
        };
        let state = persisted as {
          projects?: Record<string, LooseProject>;
          projectOrder?: string[];
          activeProjectId?: string;
          catalog?: CatalogEntry[];
          presets?: ServicePreset[];
          equipmentTypes?: EquipmentType[];
          savedSmetas?: Record<string, SavedSmeta & { scenario?: string }>;
          budgetPeriod?: BudgetPeriod;
        };

        if (version < 1) {
          const projects: Record<string, LooseProject> = {};
          for (const [id, p] of Object.entries(state.projects ?? {})) {
            const { scenario, ...rest } = p;
            projects[id] = { ...rest, presetId: scenario ?? DEFAULT_PRESET_ID };
          }
          const savedSmetas: Record<string, SavedSmeta> = {};
          for (const [id, sm] of Object.entries(state.savedSmetas ?? {})) {
            const { scenario, ...rest } = sm;
            savedSmetas[id] = { ...rest, presetId: scenario ?? DEFAULT_PRESET_ID };
          }
          state = { ...state, projects, presets: BUILTIN_PRESETS, savedSmetas };
        }

        if (version < 2) {
          const projects: Record<string, LooseProject> = {};
          for (const [id, p] of Object.entries(state.projects ?? {})) {
            projects[id] = { ...p, assets: p.assets ?? [], capitalFundBalance: p.capitalFundBalance ?? 0 };
          }
          state = { ...state, projects, equipmentTypes: EQUIPMENT_TYPES };
        }

        if (version < 3) {
          const projects: Record<string, LooseProject> = {};
          for (const [id, p] of Object.entries(state.projects ?? {})) {
            projects[id] = {
              ...p,
              units: p.units ?? [],
              meetings: p.meetings ?? [],
              maintenanceTasks: p.maintenanceTasks ?? [],
              actuals: p.actuals ?? [],
            };
          }
          state = { ...state, projects };
        }

        if (version < 4) {
          const projects: Record<string, LooseProject> = {};
          for (const [id, p] of Object.entries(state.projects ?? {})) {
            projects[id] = {
              ...p,
              spareParts: p.spareParts ?? [],
              maintenanceLogs: p.maintenanceLogs ?? [],
            };
          }
          state = { ...state, projects };
        }

        if (version < 5) {
          const projects: Record<string, LooseProject> = {};
          for (const [id, p] of Object.entries(state.projects ?? {})) {
            projects[id] = { ...p, workOrders: p.workOrders ?? [] };
          }
          state = { ...state, projects };
        }

        if (version < 6) {
          const backfillCoefficients = (b: BuildingProfile): BuildingProfile => ({
            ...b,
            storageRateCoefficient: b.storageRateCoefficient ?? 1,
            parkingRateCoefficient: b.parkingRateCoefficient ?? 1,
          });
          const projects: Record<string, LooseProject> = {};
          for (const [id, p] of Object.entries(state.projects ?? {})) {
            projects[id] = { ...p, building: backfillCoefficients(p.building) };
          }
          const savedSmetas: Record<string, SavedSmeta & { scenario?: string }> = {};
          for (const [id, sm] of Object.entries(state.savedSmetas ?? {})) {
            savedSmetas[id] = { ...sm, building: backfillCoefficients(sm.building) };
          }
          const presets = (state.presets ?? BUILTIN_PRESETS).map((pr) => ({
            ...pr,
            storageRateCoefficient: pr.storageRateCoefficient ?? 1,
            parkingRateCoefficient: pr.parkingRateCoefficient ?? 1,
          }));
          state = { ...state, projects, savedSmetas, presets };
        }

        if (version < 7) {
          const backfillParking = (b: BuildingProfile): BuildingProfile => ({
            ...b,
            parkingFlatFeePerSpot: b.parkingFlatFeePerSpot ?? 0,
            parkingNonPaymentRatePercent: b.parkingNonPaymentRatePercent ?? 0,
          });
          const projects: Record<string, LooseProject> = {};
          for (const [id, p] of Object.entries(state.projects ?? {})) {
            projects[id] = { ...p, building: backfillParking(p.building) };
          }
          const savedSmetas: Record<string, SavedSmeta & { scenario?: string }> = {};
          for (const [id, sm] of Object.entries(state.savedSmetas ?? {})) {
            savedSmetas[id] = { ...sm, building: backfillParking(sm.building) };
          }
          state = { ...state, projects, savedSmetas };
        }

        return {
          projects: state.projects ?? {},
          projectOrder: state.projectOrder ?? [],
          activeProjectId: state.activeProjectId ?? "",
          catalog: state.catalog ?? [],
          presets: state.presets ?? BUILTIN_PRESETS,
          equipmentTypes: state.equipmentTypes ?? EQUIPMENT_TYPES,
          savedSmetas: state.savedSmetas ?? {},
          budgetPeriod: state.budgetPeriod ?? "month",
        };
      },
    },
  ),
);

/** Активный проект (селектор-хелпер для компонентов). */
export function selectActiveProject(state: ProjectsState): Project {
  return state.projects[state.activeProjectId];
}
