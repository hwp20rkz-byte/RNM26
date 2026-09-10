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

describe("пресеты обслуживания", () => {
  it("стартует с 4 встроенных пресетов, включая применённый к демо-проекту", () => {
    const s = useProjectsStore.getState();
    expect(s.presets.length).toBe(4);
    expect(s.presets.every((p) => p.builtIn)).toBe(true);
    expect(selectActiveProject(s).presetId).toBe("standard");
  });

  it("setPreset применяет все 4 поля пресета к проекту и фильтрует статьи", () => {
    const s = useProjectsStore.getState();
    const before = selectActiveProject(s);
    expect(before.building.serviceClass).toBe("comfort");

    s.setPreset("economy");
    const after = selectActiveProject(useProjectsStore.getState());
    expect(after.presetId).toBe("economy");
    expect(after.priceMultiplier).toBe(0.85);
    expect(after.building.serviceClass).toBe("economy");
    expect(after.building.capitalRepairMrpMultiplier).toBe(0.005);
    // статьи с более высоким классом должны быть отключены
    const highClassItem = after.db.items.find((i) => i.minServiceClass === "comfort");
    expect(highClassItem?.enabled).toBe(false);
  });

  it("createPreset добавляет свой пресет, сразу доступный для setPreset", () => {
    const id = useProjectsStore.getState().createPreset({
      label: "Мой пресет",
      description: "тест",
      priceMultiplier: 1.5,
      maxServiceClass: "premium",
      capitalRepairMrpMultiplier: 0.02,
      commercialRateCoefficient: 2.5,
      forceEnabledItemIds: [],
      forceDisabledItemIds: [],
    });
    expect(useProjectsStore.getState().presets.find((p) => p.id === id)?.builtIn).toBe(false);

    useProjectsStore.getState().setPreset(id);
    const active = selectActiveProject(useProjectsStore.getState());
    expect(active.priceMultiplier).toBe(1.5);
    expect(active.building.commercialRateCoefficient).toBe(2.5);
  });

  it("updatePreset на применённом пресете немедленно пересчитывает проект", () => {
    const s = useProjectsStore.getState();
    expect(selectActiveProject(s).presetId).toBe("standard");
    s.updatePreset("standard", { priceMultiplier: 1.77 });
    expect(selectActiveProject(useProjectsStore.getState()).priceMultiplier).toBe(1.77);
  });

  it("duplicatePreset создаёт независимую копию, помеченную как своя", () => {
    const s = useProjectsStore.getState();
    const originalCount = s.presets.length;
    const newId = s.duplicatePreset("business");
    const copy = useProjectsStore.getState().presets.find((p) => p.id === newId)!;
    expect(copy.builtIn).toBe(false);
    expect(copy.label).toContain("копия");
    expect(useProjectsStore.getState().presets.length).toBe(originalCount + 1);
  });

  it("нельзя удалить встроенный пресет", () => {
    const before = useProjectsStore.getState().presets.length;
    useProjectsStore.getState().deletePreset("economy");
    expect(useProjectsStore.getState().presets.length).toBe(before);
    expect(useProjectsStore.getState().presets.find((p) => p.id === "economy")).toBeDefined();
  });

  it("deletePreset переводит проекты с удалённым своим пресетом на «Комфорт (Стандарт)»", () => {
    const s = useProjectsStore.getState();
    const customId = s.createPreset({
      label: "Временный",
      description: "",
      priceMultiplier: 1,
      maxServiceClass: "comfort",
      capitalRepairMrpMultiplier: 0.007,
      commercialRateCoefficient: 1.3,
      forceEnabledItemIds: [],
      forceDisabledItemIds: [],
    });
    useProjectsStore.getState().setPreset(customId);
    expect(selectActiveProject(useProjectsStore.getState()).presetId).toBe(customId);

    useProjectsStore.getState().deletePreset(customId);
    const active = selectActiveProject(useProjectsStore.getState());
    expect(active.presetId).toBe("standard");
    expect(useProjectsStore.getState().presets.find((p) => p.id === customId)).toBeUndefined();
  });
});

describe("реестр оборудования и износ", () => {
  it("демо-проект стартует с посеянным реестром активов", () => {
    const active = selectActiveProject(useProjectsStore.getState());
    expect(active.assets.length).toBeGreaterThan(0);
    expect(active.capitalFundBalance).toBe(0);
  });

  it("addAsset добавляет актив в реестр активного проекта", () => {
    const before = selectActiveProject(useProjectsStore.getState()).assets.length;
    useProjectsStore.getState().addAsset({
      name: "Насос тестовый",
      category: "heating",
      quantity: 1,
      installedYear: 2020,
      normativeLifeYears: 10,
      replacementUnitCost: 200_000,
    });
    const after = selectActiveProject(useProjectsStore.getState());
    expect(after.assets.length).toBe(before + 1);
    expect(after.assets.at(-1)?.name).toBe("Насос тестовый");
  });

  it("updateAsset точечно меняет поля актива", () => {
    const s = useProjectsStore.getState();
    const assetId = selectActiveProject(s).assets[0].id;
    useProjectsStore.getState().updateAsset(assetId, { manualWearOverridePercent: 55 });
    const asset = selectActiveProject(useProjectsStore.getState()).assets.find((a) => a.id === assetId);
    expect(asset?.manualWearOverridePercent).toBe(55);
  });

  it("removeAsset удаляет актив из реестра", () => {
    const s = useProjectsStore.getState();
    const assetId = selectActiveProject(s).assets[0].id;
    useProjectsStore.getState().removeAsset(assetId);
    const assets = selectActiveProject(useProjectsStore.getState()).assets;
    expect(assets.find((a) => a.id === assetId)).toBeUndefined();
  });

  it("setCapitalFundBalance обновляет баланс фонда капремонта активного проекта", () => {
    useProjectsStore.getState().setCapitalFundBalance(1_500_000);
    expect(selectActiveProject(useProjectsStore.getState()).capitalFundBalance).toBe(1_500_000);
  });

  it("addEquipmentType/updateEquipmentType/removeEquipmentType управляют справочником типов", () => {
    const before = useProjectsStore.getState().equipmentTypes.length;
    const id = useProjectsStore.getState().addEquipmentType({
      name: "Тестовый тип",
      category: "other",
      normativeLifeYears: 15,
      source: "тест",
    });
    expect(useProjectsStore.getState().equipmentTypes.length).toBe(before + 1);

    useProjectsStore.getState().updateEquipmentType(id, { normativeLifeYears: 20 });
    expect(useProjectsStore.getState().equipmentTypes.find((t) => t.id === id)?.normativeLifeYears).toBe(20);

    useProjectsStore.getState().removeEquipmentType(id);
    expect(useProjectsStore.getState().equipmentTypes.find((t) => t.id === id)).toBeUndefined();
  });

  it("insertReplacementIntoSmeta добавляет статью «Замена: …» в указанную категорию сметы", () => {
    const s = useProjectsStore.getState();
    const project = selectActiveProject(s);
    const asset = project.assets[0];
    const itemsBefore = project.db.items.length;

    useProjectsStore.getState().insertReplacementIntoSmeta(asset.id, "2.7");

    const after = selectActiveProject(useProjectsStore.getState());
    expect(after.db.items.length).toBe(itemsBefore + 1);
    const inserted = after.db.items.find((i) => i.name === `Замена: ${asset.name}`);
    expect(inserted).toBeDefined();
    expect(inserted?.categoryId).toBe("2.7");
    expect(inserted?.unitPrice).toBe(asset.quantity * asset.replacementUnitCost);
  });

  it("insertReplacementIntoSmeta ничего не делает для несуществующего актива", () => {
    const itemsBefore = selectActiveProject(useProjectsStore.getState()).db.items.length;
    useProjectsStore.getState().insertReplacementIntoSmeta("no-such-asset", "2.7");
    expect(selectActiveProject(useProjectsStore.getState()).db.items.length).toBe(itemsBefore);
  });
});

describe("реестр собственников и общие собрания", () => {
  it("демо-проект стартует с пустым реестром (не выдумываем ФИО реальных людей)", () => {
    const active = selectActiveProject(useProjectsStore.getState());
    expect(active.units).toEqual([]);
    expect(active.meetings).toEqual([]);
  });

  it("addUnit/updateUnit/removeUnit — CRUD реестра", () => {
    useProjectsStore.getState().addUnit({ unitType: "apartment", number: "1", area: 45, ownerName: "Тестов Т.Т." });
    let units = selectActiveProject(useProjectsStore.getState()).units;
    expect(units).toHaveLength(1);
    const id = units[0].id;

    useProjectsStore.getState().updateUnit(id, { area: 50 });
    units = selectActiveProject(useProjectsStore.getState()).units;
    expect(units[0].area).toBe(50);

    useProjectsStore.getState().removeUnit(id);
    units = selectActiveProject(useProjectsStore.getState()).units;
    expect(units).toHaveLength(0);
  });

  it("importUnits добавляет только строки с номером помещения", () => {
    const count = useProjectsStore.getState().importUnits([
      { unitType: "apartment", number: "1", area: 40, ownerName: "А" },
      { unitType: "apartment", number: "", area: 40, ownerName: "Пропуск" },
      { unitType: "commercial", number: "Н-1", area: 100, ownerName: "ТОО" },
    ]);
    expect(count).toBe(2);
    expect(selectActiveProject(useProjectsStore.getState()).units).toHaveLength(2);
  });

  it("createMeeting регистрирует участников по текущему составу реестра", () => {
    useProjectsStore.getState().addUnit({ unitType: "apartment", number: "1", area: 40, ownerName: "А" });
    useProjectsStore.getState().addUnit({ unitType: "apartment", number: "2", area: 60, ownerName: "Б" });
    const meetingId = useProjectsStore.getState().createMeeting("Годовое собрание", "2026-05-01", "in_person");
    const meeting = selectActiveProject(useProjectsStore.getState()).meetings.find((m) => m.id === meetingId)!;
    expect(meeting.participants).toHaveLength(2);
    expect(meeting.participants.every((p) => p.present === false)).toBe(true);
  });

  it("setParticipant и setVote фиксируют присутствие и голос по вопросу", () => {
    useProjectsStore.getState().addUnit({ unitType: "apartment", number: "1", area: 40, ownerName: "А" });
    const unitId = selectActiveProject(useProjectsStore.getState()).units[0].id;
    const meetingId = useProjectsStore.getState().createMeeting("Собрание", "2026-05-01", "in_person");

    useProjectsStore.getState().setParticipant(meetingId, unitId, { present: true });
    useProjectsStore.getState().addAgendaItem(meetingId, { title: "Вопрос 1", majorityRule: "simple" });
    const agendaItemId = selectActiveProject(useProjectsStore.getState()).meetings[0].agendaItems[0].id;

    useProjectsStore.getState().setVote(meetingId, agendaItemId, unitId, "for");
    let meeting = selectActiveProject(useProjectsStore.getState()).meetings.find((m) => m.id === meetingId)!;
    expect(meeting.participants.find((p) => p.unitId === unitId)?.present).toBe(true);
    expect(meeting.votes).toEqual([{ agendaItemId, unitId, choice: "for" }]);

    // повторный setVote для той же пары — обновляет, а не дублирует запись
    useProjectsStore.getState().setVote(meetingId, agendaItemId, unitId, "against");
    meeting = selectActiveProject(useProjectsStore.getState()).meetings.find((m) => m.id === meetingId)!;
    expect(meeting.votes).toHaveLength(1);
    expect(meeting.votes[0].choice).toBe("against");
  });

  it("removeAgendaItem удаляет вопрос и его голоса", () => {
    const meetingId = useProjectsStore.getState().createMeeting("Собрание", "2026-05-01", "in_person");
    useProjectsStore.getState().addAgendaItem(meetingId, { title: "Вопрос", majorityRule: "simple" });
    const itemId = selectActiveProject(useProjectsStore.getState()).meetings[0].agendaItems[0].id;
    useProjectsStore.getState().removeAgendaItem(meetingId, itemId);
    const meeting = selectActiveProject(useProjectsStore.getState()).meetings.find((m) => m.id === meetingId)!;
    expect(meeting.agendaItems).toHaveLength(0);
  });

  it("markAllPresent быстро отмечает всех участников", () => {
    useProjectsStore.getState().addUnit({ unitType: "apartment", number: "1", area: 40, ownerName: "А" });
    useProjectsStore.getState().addUnit({ unitType: "apartment", number: "2", area: 60, ownerName: "Б" });
    const meetingId = useProjectsStore.getState().createMeeting("Собрание", "2026-05-01", "in_person");
    useProjectsStore.getState().markAllPresent(meetingId, true);
    const meeting = selectActiveProject(useProjectsStore.getState()).meetings.find((m) => m.id === meetingId)!;
    expect(meeting.participants.every((p) => p.present)).toBe(true);
  });

  it("removeMeeting удаляет собрание", () => {
    const meetingId = useProjectsStore.getState().createMeeting("Собрание", "2026-05-01", "in_person");
    useProjectsStore.getState().removeMeeting(meetingId);
    expect(selectActiveProject(useProjectsStore.getState()).meetings.find((m) => m.id === meetingId)).toBeUndefined();
  });
});

describe("календарь регламентных работ", () => {
  it("демо-проект стартует с пустым календарём", () => {
    expect(selectActiveProject(useProjectsStore.getState()).maintenanceTasks).toEqual([]);
  });

  it("addMaintenanceTask/updateMaintenanceTask/removeMaintenanceTask — CRUD", () => {
    useProjectsStore.getState().addMaintenanceTask({ name: "Поверка теплосчётчиков", periodicityMonths: 48 });
    let tasks = selectActiveProject(useProjectsStore.getState()).maintenanceTasks;
    expect(tasks).toHaveLength(1);
    const id = tasks[0].id;

    useProjectsStore.getState().updateMaintenanceTask(id, { periodicityMonths: 36 });
    tasks = selectActiveProject(useProjectsStore.getState()).maintenanceTasks;
    expect(tasks[0].periodicityMonths).toBe(36);

    useProjectsStore.getState().removeMaintenanceTask(id);
    tasks = selectActiveProject(useProjectsStore.getState()).maintenanceTasks;
    expect(tasks).toHaveLength(0);
  });

  it("markMaintenanceTaskServiced проставляет дату последнего обслуживания", () => {
    useProjectsStore.getState().addMaintenanceTask({ name: "АПС", periodicityMonths: 12 });
    const id = selectActiveProject(useProjectsStore.getState()).maintenanceTasks[0].id;
    useProjectsStore.getState().markMaintenanceTaskServiced(id, "2026-03-01");
    const task = selectActiveProject(useProjectsStore.getState()).maintenanceTasks.find((t) => t.id === id);
    expect(task?.lastServiceDate).toBe("2026-03-01");
  });
});
