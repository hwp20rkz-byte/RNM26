import { describe, expect, it } from "vitest";
import {
  buildStatusQrValue,
  buildWaLink,
  buildWorkOrderMessage,
  computeChecklistProgress,
  computeOverdueHours,
  computeSlaStatus,
  computeWorkOrderCounts,
  generateTicketNumber,
} from "./workOrderEngine";
import type { WorkOrder } from "./types";

const ts = "2024-01-01T00:00:00.000Z";

function order(partial: Partial<WorkOrder> & Pick<WorkOrder, "id">): WorkOrder {
  return {
    ticketNumber: `WO-2024-${partial.id}`,
    title: "Тестовый наряд",
    description: "Описание",
    status: "scheduled",
    complexity: "L1_ROUTINE",
    seasonality: "all_year",
    isNightShift: false,
    isBatch: false,
    targetAssetIds: [],
    assignedStaffNames: [],
    plannedStartDate: "2026-01-01",
    deadline: "2026-06-15T12:00:00.000Z",
    approval: { required: false, status: "none" },
    checklist: [],
    createdAt: ts,
    updatedAt: ts,
    ...partial,
  };
}

describe("generateTicketNumber", () => {
  it("генерирует первый номер для пустого списка", () => {
    expect(generateTicketNumber([], new Date(2026, 0, 1))).toBe("WO-2026-0001");
  });

  it("считает только наряды текущего года", () => {
    const orders = [
      order({ id: "a", ticketNumber: "WO-2025-0001" }),
      order({ id: "b", ticketNumber: "WO-2026-0001" }),
      order({ id: "c", ticketNumber: "WO-2026-0002" }),
    ];
    expect(generateTicketNumber(orders, new Date(2026, 5, 1))).toBe("WO-2026-0003");
  });
});

describe("computeSlaStatus", () => {
  const ref = new Date("2026-06-15T10:00:00.000Z");

  it("дедлайн в прошлом — overdue", () => {
    const o = order({ id: "a", deadline: "2026-06-14T10:00:00.000Z" });
    expect(computeSlaStatus(o, ref)).toBe("overdue");
  });

  it("дедлайн в пределах 6 часов — due_soon", () => {
    const o = order({ id: "a", deadline: "2026-06-15T14:00:00.000Z" });
    expect(computeSlaStatus(o, ref)).toBe("due_soon");
  });

  it("дедлайн далеко в будущем — ok", () => {
    const o = order({ id: "a", deadline: "2026-06-20T10:00:00.000Z" });
    expect(computeSlaStatus(o, ref)).toBe("ok");
  });

  it("завершённый или отменённый наряд — n_a вне зависимости от дедлайна", () => {
    const completed = order({ id: "a", status: "completed", deadline: "2020-01-01T00:00:00.000Z" });
    const cancelled = order({ id: "b", status: "cancelled", deadline: "2020-01-01T00:00:00.000Z" });
    expect(computeSlaStatus(completed, ref)).toBe("n_a");
    expect(computeSlaStatus(cancelled, ref)).toBe("n_a");
  });

  it("пустой дедлайн — n_a", () => {
    const o = order({ id: "a", deadline: "" });
    expect(computeSlaStatus(o, ref)).toBe("n_a");
  });
});

describe("computeOverdueHours", () => {
  it("считает часы просрочки", () => {
    const ref = new Date("2026-06-15T10:00:00.000Z");
    const o = order({ id: "a", deadline: "2026-06-15T04:00:00.000Z" });
    expect(computeOverdueHours(o, ref)).toBe(6);
  });

  it("не просрочен — 0", () => {
    const ref = new Date("2026-06-15T10:00:00.000Z");
    const o = order({ id: "a", deadline: "2026-06-20T10:00:00.000Z" });
    expect(computeOverdueHours(o, ref)).toBe(0);
  });
});

describe("computeChecklistProgress", () => {
  it("считает прогресс выполнения", () => {
    const o = order({
      id: "a",
      checklist: [
        { id: "c1", text: "1", isCompleted: true },
        { id: "c2", text: "2", isCompleted: true },
        { id: "c3", text: "3", isCompleted: false },
      ],
    });
    const progress = computeChecklistProgress(o);
    expect(progress.completed).toBe(2);
    expect(progress.total).toBe(3);
    expect(progress.percent).toBe(67);
  });

  it("пустой чек-лист — 0%", () => {
    const progress = computeChecklistProgress(order({ id: "a" }));
    expect(progress.total).toBe(0);
    expect(progress.percent).toBe(0);
  });
});

describe("computeWorkOrderCounts", () => {
  const ref = new Date("2026-06-15T10:00:00.000Z");

  it("считает активные/ночные/на согласовании/просроченные/сезонные", () => {
    const orders = [
      order({ id: "a", status: "in_progress", isNightShift: true }),
      order({ id: "b", status: "pending_approval" }),
      order({ id: "c", status: "scheduled", deadline: "2020-01-01T00:00:00.000Z" }), // просрочен
      order({ id: "d", status: "completed" }), // не активен
      order({ id: "e", status: "scheduled", seasonality: "heating_prep_ozp" }),
    ];
    const counts = computeWorkOrderCounts(orders, ref);
    expect(counts.active).toBe(3); // a, c, e (in_progress/scheduled/scheduled)
    expect(counts.night).toBe(1);
    expect(counts.pendingApproval).toBe(1);
    expect(counts.overdue).toBe(1);
    expect(counts.seasonal).toBe(1);
  });
});

describe("buildWorkOrderMessage / buildWaLink", () => {
  it("формирует читаемый текст и корректную wa.me-ссылку", () => {
    const o = order({ id: "a", assignedStaffNames: ["Иванов И.И."] });
    const text = buildWorkOrderMessage(o, "ЖК «Тест»");
    expect(text).toContain(o.ticketNumber);
    expect(text).toContain("ЖК «Тест»");
    expect(text).toContain("Иванов И.И.");

    const link = buildWaLink(text);
    expect(link.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(link.replace("https://wa.me/?text=", ""))).toBe(text);
  });
});

describe("buildStatusQrValue", () => {
  it("возвращает короткую строку статуса, а не полный отчёт", () => {
    const o = order({ id: "a", status: "in_progress" });
    const value = buildStatusQrValue(o);
    expect(value).toContain(o.ticketNumber);
    expect(value).toContain("in_progress");
    expect(value.length).toBeLessThan(100);
  });
});
