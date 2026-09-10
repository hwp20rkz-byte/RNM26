import { describe, expect, it } from "vitest";
import {
  computeDaysUntil,
  computeMaintenanceStatus,
  computeMaintenanceTasks,
  computeNextServiceDate,
  MAINTENANCE_STATUS_LABELS,
} from "./maintenanceCalendar";
import type { MaintenanceTask } from "./types";

const ts = "2024-01-01T00:00:00.000Z";

function task(partial: Partial<MaintenanceTask> = {}): MaintenanceTask {
  return {
    id: "t1",
    name: "Тестовая работа",
    periodicityMonths: 12,
    createdAt: ts,
    updatedAt: ts,
    ...partial,
  };
}

describe("computeNextServiceDate", () => {
  it("без даты последнего обслуживания — null", () => {
    expect(computeNextServiceDate(task({ lastServiceDate: undefined }))).toBeNull();
  });

  it("прибавляет периодичность в месяцах к дате последнего обслуживания", () => {
    const next = computeNextServiceDate(task({ lastServiceDate: "2024-01-15", periodicityMonths: 4 }));
    expect(next).not.toBeNull();
    expect(next!.getFullYear()).toBe(2024);
    expect(next!.getMonth()).toBe(4); // май (0-indexed)
    expect(next!.getDate()).toBe(15);
  });

  it("некорректная дата — null", () => {
    expect(computeNextServiceDate(task({ lastServiceDate: "не дата" }))).toBeNull();
  });
});

describe("computeDaysUntil", () => {
  it("считает разницу в днях", () => {
    const ref = new Date("2026-01-01T00:00:00.000Z");
    const next = new Date("2026-01-11T00:00:00.000Z");
    expect(computeDaysUntil(next, ref)).toBe(10);
  });
});

describe("computeMaintenanceStatus", () => {
  const ref = new Date("2026-06-15T00:00:00.000Z");

  it("нет даты последнего обслуживания — no_date", () => {
    expect(computeMaintenanceStatus(task({ lastServiceDate: undefined }), ref)).toBe("no_date");
  });

  it("следующая дата в прошлом — overdue", () => {
    const t = task({ lastServiceDate: "2025-01-01", periodicityMonths: 12 }); // след. 2026-01-01, до ref
    expect(computeMaintenanceStatus(t, ref)).toBe("overdue");
  });

  it("следующая дата в пределах 30 дней — upcoming", () => {
    const t = task({ lastServiceDate: "2025-06-20", periodicityMonths: 12 }); // след. 2026-06-20
    expect(computeMaintenanceStatus(t, ref)).toBe("upcoming");
  });

  it("следующая дата далеко в будущем — ok", () => {
    const t = task({ lastServiceDate: "2026-01-01", periodicityMonths: 12 }); // след. 2027-01-01
    expect(computeMaintenanceStatus(t, ref)).toBe("ok");
  });

  it("для каждого статуса есть русская подпись", () => {
    for (const key of Object.keys(MAINTENANCE_STATUS_LABELS)) {
      expect(MAINTENANCE_STATUS_LABELS[key as keyof typeof MAINTENANCE_STATUS_LABELS]).toBeTruthy();
    }
  });
});

describe("computeMaintenanceTasks", () => {
  it("сортирует: просроченные и ближайшие сначала, без даты — в конец", () => {
    const ref = new Date("2026-06-15T00:00:00.000Z");
    const tasks: MaintenanceTask[] = [
      task({ id: "no-date", lastServiceDate: undefined }),
      task({ id: "far", lastServiceDate: "2026-01-01", periodicityMonths: 12 }), // след. 2027-01-01
      task({ id: "overdue", lastServiceDate: "2024-01-01", periodicityMonths: 12 }), // след. 2025-01-01, просрочено
      task({ id: "soon", lastServiceDate: "2025-06-20", periodicityMonths: 12 }), // след. 2026-06-20
    ];
    const result = computeMaintenanceTasks(tasks, ref);
    expect(result.map((r) => r.task.id)).toEqual(["overdue", "soon", "far", "no-date"]);
    expect(result[0].status).toBe("overdue");
    expect(result[3].status).toBe("no_date");
  });
});
