// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { useProjectsStore, selectActiveProject } from "./useProjectsStore";
import { computeTariff } from "@/lib/calculator/engine";

const INITIAL_STATE = useProjectsStore.getState();

beforeEach(() => {
  useProjectsStore.setState(INITIAL_STATE, true);
});

describe("проекты", () => {
  it("стартует с одного эталонного проекта", () => {
    const s = useProjectsStore.getState();
    expect(s.projectOrder.length).toBe(1);
    expect(selectActiveProject(s).name).toContain("Коркем-1");
  });

  it("createProject(blank) создаёт объект без калиброванных позиций Коркем-1", () => {
    const id = useProjectsStore.getState().createProject("Тестовый БЦ", "blank", "commercial");
    const s = useProjectsStore.getState();
    expect(s.activeProjectId).toBe(id);
    const p = s.projects[id];
    expect(p.building.objectType).toBe("commercial");
    // только председатель, никаких статей 2.2.2 из Коркем-1
    expect(p.db.items.length).toBe(0);
    expect(p.db.payroll.length).toBe(1);
  });

  it("createProject(korkem1) клонирует полную эталонную базу", () => {
    const id = useProjectsStore.getState().createProject("Клон Коркем-1", "korkem1");
    const p = useProjectsStore.getState().projects[id];
    expect(p.db.items.length).toBeGreaterThan(100);
  });

  it("switchProject переключает активный объект", () => {
    const id = useProjectsStore.getState().createProject("Объект Б", "blank");
    useProjectsStore.getState().switchProject("demo-korkem1");
    expect(useProjectsStore.getState().activeProjectId).toBe("demo-korkem1");
    useProjectsStore.getState().switchProject(id);
    expect(useProjectsStore.getState().activeProjectId).toBe(id);
  });

  it("нельзя удалить последний оставшийся проект", () => {
    const onlyId = useProjectsStore.getState().projectOrder[0];
    useProjectsStore.getState().deleteProject(onlyId);
    expect(useProjectsStore.getState().projectOrder).toContain(onlyId);
  });

  it("renameProject переименовывает проект", () => {
    const id = useProjectsStore.getState().activeProjectId;
    useProjectsStore.getState().renameProject(id, "Новое имя");
    expect(useProjectsStore.getState().projects[id].name).toBe("Новое имя");
  });
});

describe("статьи расходов — CRUD", () => {
  it("addItem добавляет позицию и она сразу учитывается в тарифе", () => {
    const s = useProjectsStore.getState();
    const before = computeTariff(selectActiveProject(s).db, selectActiveProject(s).building);
    s.addItem("2.8", { name: "Тестовый материал", unit: "шт.", unitPrice: 1000, annualQty: 12 });
    const after = computeTariff(selectActiveProject(useProjectsStore.getState()).db, selectActiveProject(useProjectsStore.getState()).building);
    expect(after.annualTotalCost).toBeCloseTo(before.annualTotalCost + 12000, 2);
  });

  it("updateItem меняет цену и это отражается в общей сумме", () => {
    const s = useProjectsStore.getState();
    s.addItem("2.8", { name: "X", unit: "шт.", unitPrice: 100, annualQty: 1 });
    const item = selectActiveProject(useProjectsStore.getState()).db.items.at(-1)!;
    useProjectsStore.getState().updateItem(item.id, { unitPrice: 500 });
    const updated = selectActiveProject(useProjectsStore.getState()).db.items.find((i) => i.id === item.id)!;
    expect(updated.unitPrice).toBe(500);
  });

  it("removeItem удаляет позицию из живой и пристинной базы", () => {
    const s = useProjectsStore.getState();
    s.addItem("2.8", { name: "Удали меня", unit: "шт.", unitPrice: 1, annualQty: 1 });
    const item = selectActiveProject(useProjectsStore.getState()).db.items.at(-1)!;
    useProjectsStore.getState().removeItem(item.id);
    const p = selectActiveProject(useProjectsStore.getState());
    expect(p.db.items.find((i) => i.id === item.id)).toBeUndefined();
    expect(p.baseDb.items.find((i) => i.id === item.id)).toBeUndefined();
  });

  it("addPayroll/removePayroll работают симметрично addItem/removeItem", () => {
    const s = useProjectsStore.getState();
    s.addPayroll("2.3.1", { role: "Тестовый сотрудник", mode: "staff", headcount: 2, monthlySalaryOrContract: 100000 });
    const pos = selectActiveProject(useProjectsStore.getState()).db.payroll.at(-1)!;
    expect(pos.role).toBe("Тестовый сотрудник");
    useProjectsStore.getState().removePayroll(pos.id);
    expect(selectActiveProject(useProjectsStore.getState()).db.payroll.find((p) => p.id === pos.id)).toBeUndefined();
  });
});

describe("справочник (каталог)", () => {
  it("addCatalogEntry / updateCatalogEntry / removeCatalogEntry", () => {
    const s = useProjectsStore.getState();
    s.addCatalogEntry({ name: "Позиция каталога", unit: "шт.", unitPrice: 10, defaultQty: 1 });
    const entry = useProjectsStore.getState().catalog.at(-1)!;
    useProjectsStore.getState().updateCatalogEntry(entry.id, { unitPrice: 999 });
    expect(useProjectsStore.getState().catalog.find((c) => c.id === entry.id)?.unitPrice).toBe(999);
    useProjectsStore.getState().removeCatalogEntry(entry.id);
    expect(useProjectsStore.getState().catalog.find((c) => c.id === entry.id)).toBeUndefined();
  });

  it("importCatalogRows пропускает строки без названия и добавляет остальные", () => {
    const before = useProjectsStore.getState().catalog.length;
    const count = useProjectsStore.getState().importCatalogRows([
      { name: "Импорт 1", unit: "шт.", unitPrice: 100, defaultQty: 2 },
      { name: "", unit: "шт.", unitPrice: 100, defaultQty: 2 },
      { name: "Импорт 2", unit: "кг", unitPrice: 50, defaultQty: 5 },
    ]);
    expect(count).toBe(2);
    expect(useProjectsStore.getState().catalog.length).toBe(before + 2);
  });

  it("insertCatalogEntryIntoProject добавляет статью в текущий проект", () => {
    const s = useProjectsStore.getState();
    s.addCatalogEntry({ name: "Из каталога", unit: "шт.", unitPrice: 250, defaultQty: 4 });
    const entry = useProjectsStore.getState().catalog.at(-1)!;
    useProjectsStore.getState().insertCatalogEntryIntoProject(entry.id, "2.8");
    const inserted = selectActiveProject(useProjectsStore.getState()).db.items.find((i) => i.name === "Из каталога");
    expect(inserted?.unitPrice).toBe(250);
    expect(inserted?.annualQty).toBe(4);
  });
});

describe("сохранённые сметы", () => {
  it("saveSmeta сохраняет снимок, restoreSmeta возвращает его", () => {
    const s = useProjectsStore.getState();
    const projectId = s.activeProjectId;
    s.addItem("2.8", { name: "До сохранения", unit: "шт.", unitPrice: 1, annualQty: 1 });
    const smetaId = useProjectsStore.getState().saveSmeta("Версия 1");
    useProjectsStore.getState().addItem("2.8", { name: "После сохранения", unit: "шт.", unitPrice: 1, annualQty: 1 });

    expect(selectActiveProject(useProjectsStore.getState()).db.items.some((i) => i.name === "После сохранения")).toBe(true);

    useProjectsStore.getState().restoreSmeta(smetaId);
    const restored = selectActiveProject(useProjectsStore.getState());
    expect(restored.id).toBe(projectId);
    expect(restored.db.items.some((i) => i.name === "До сохранения")).toBe(true);
    expect(restored.db.items.some((i) => i.name === "После сохранения")).toBe(false);
  });

  it("deleteSmeta удаляет сохранённую версию", () => {
    const id = useProjectsStore.getState().saveSmeta("К удалению");
    useProjectsStore.getState().deleteSmeta(id);
    expect(useProjectsStore.getState().savedSmetas[id]).toBeUndefined();
  });
});
