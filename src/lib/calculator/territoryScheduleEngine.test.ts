import { describe, expect, it } from "vitest";
import {
  computeTerritorySchedule,
  computeTerritoryScheduleOccurrences,
  computeTerritoryScheduleStatus,
  getDayRange,
  getMonthRange,
  getQuarterRange,
  getWeekRange,
  isTerritoryItemSchedulable,
  summarizeTerritorySchedule,
} from "./territoryScheduleEngine";
import type { TerritoryTaskCompletion, TerritoryWorkItem } from "./types";

function makeItem(partial: Partial<TerritoryWorkItem> = {}): TerritoryWorkItem {
  return {
    id: "twi-test",
    name: "Тестовая работа",
    category: "manual_cleaning_warm",
    unit: "sqm",
    ratePerUnitMrp: 2,
    unitSize: 1000,
    periodDays: 213,
    intervalDays: 2,
    verified: false,
    source: "test",
    ...partial,
  };
}

describe("isTerritoryItemSchedulable", () => {
  it("K=1 позиции («по мере необходимости») не планируются", () => {
    expect(isTerritoryItemSchedulable(makeItem({ periodDays: 213, intervalDays: 213 }))).toBe(false);
  });

  it("позиции с кратностью >=2 планируются", () => {
    expect(isTerritoryItemSchedulable(makeItem({ periodDays: 213, intervalDays: 2 }))).toBe(true);
    expect(isTerritoryItemSchedulable(makeItem({ periodDays: 90, intervalDays: 45 }))).toBe(true);
  });
});

describe("computeTerritoryScheduleOccurrences", () => {
  it("непланируемая позиция не даёт дат", () => {
    expect(computeTerritoryScheduleOccurrences(makeItem({ periodDays: 213, intervalDays: 213 }), 2026)).toEqual([]);
  });

  it("тёплый короткий сезон (periodDays<=90) стартует 1 апреля", () => {
    const dates = computeTerritoryScheduleOccurrences(makeItem({ periodDays: 90, intervalDays: 30 }), 2026);
    expect(dates).toEqual(["2026-04-01", "2026-05-01", "2026-05-31"]);
  });

  it("холодный сезон (90<periodDays<=160) стартует 1 ноября", () => {
    const dates = computeTerritoryScheduleOccurrences(makeItem({ periodDays: 150, intervalDays: 50 }), 2026);
    expect(dates[0]).toBe("2026-11-01");
    expect(dates).toHaveLength(3);
  });

  it("длинный тёплый сезон (periodDays>160) стартует 1 апреля", () => {
    const dates = computeTerritoryScheduleOccurrences(makeItem({ periodDays: 213, intervalDays: 71 }), 2026);
    expect(dates[0]).toBe("2026-04-01");
    expect(dates).toHaveLength(3);
  });
});

describe("computeTerritoryScheduleStatus", () => {
  const ref = new Date("2026-09-15T12:00:00Z");

  it("выполненная задача всегда done, даже если дата в прошлом", () => {
    expect(computeTerritoryScheduleStatus("2026-09-01", true, ref)).toBe("done");
  });

  it("невыполненная задача в прошлом — overdue", () => {
    expect(computeTerritoryScheduleStatus("2026-09-01", false, ref)).toBe("overdue");
  });

  it("невыполненная задача сегодня — today", () => {
    expect(computeTerritoryScheduleStatus("2026-09-15", false, ref)).toBe("today");
  });

  it("невыполненная задача в будущем — upcoming", () => {
    expect(computeTerritoryScheduleStatus("2026-09-20", false, ref)).toBe("upcoming");
  });
});

describe("computeTerritorySchedule", () => {
  const item = makeItem({ id: "twi-a", name: "Работа А", periodDays: 90, intervalDays: 30 });
  const item2 = makeItem({ id: "twi-b", name: "Работа Б", periodDays: 213, intervalDays: 213 }); // K=1, исключена

  it("исключает непланируемые позиции и фильтрует по диапазону дат", () => {
    const entries = computeTerritorySchedule([item, item2], {}, "2026-04-01", "2026-04-30", new Date("2026-04-01T00:00:00Z"));
    expect(entries.every((e) => e.item.id === "twi-a")).toBe(true);
    expect(entries.map((e) => e.date)).toEqual(["2026-04-01"]);
  });

  it("подставляет completion по ключу `${itemId}__${date}`", () => {
    const completions: Record<string, TerritoryTaskCompletion> = {
      "twi-a__2026-04-01": { key: "twi-a__2026-04-01", territoryWorkItemId: "twi-a", date: "2026-04-01", completed: true },
    };
    const entries = computeTerritorySchedule([item], completions, "2026-04-01", "2026-04-01", new Date("2026-04-01T00:00:00Z"));
    expect(entries[0].status).toBe("done");
    expect(entries[0].completion?.completed).toBe(true);
  });

  it("сортирует по дате, затем по названию", () => {
    const itemZ = makeItem({ id: "twi-z", name: "Я-работа", periodDays: 90, intervalDays: 45 });
    const itemA = makeItem({ id: "twi-a2", name: "А-работа", periodDays: 90, intervalDays: 45 });
    const entries = computeTerritorySchedule([itemZ, itemA], {}, "2026-04-01", "2026-04-01");
    expect(entries.map((e) => e.item.name)).toEqual(["А-работа", "Я-работа"]);
  });
});

describe("диапазоны дат", () => {
  it("getDayRange возвращает один и тот же день", () => {
    expect(getDayRange(new Date("2026-09-15T18:00:00Z"))).toEqual({ start: "2026-09-15", end: "2026-09-15" });
  });

  it("getWeekRange возвращает понедельник-воскресенье", () => {
    // 15 сентября 2026 — вторник
    expect(getWeekRange(new Date("2026-09-15T00:00:00Z"))).toEqual({ start: "2026-09-14", end: "2026-09-20" });
  });

  it("getWeekRange корректно берёт воскресенье как конец недели, начавшейся в предыдущем году", () => {
    // 1 января 2026 — четверг
    expect(getWeekRange(new Date("2026-01-01T00:00:00Z"))).toEqual({ start: "2025-12-29", end: "2026-01-04" });
  });

  it("getMonthRange возвращает первый и последний день месяца", () => {
    expect(getMonthRange(new Date("2026-02-10T00:00:00Z"))).toEqual({ start: "2026-02-01", end: "2026-02-28" });
  });

  it("getQuarterRange возвращает границы квартала", () => {
    expect(getQuarterRange(new Date("2026-08-15T00:00:00Z"))).toEqual({ start: "2026-07-01", end: "2026-09-30" });
  });
});

describe("summarizeTerritorySchedule", () => {
  it("агрегирует total/completed/overdue и разбивки по категориям и исполнителям", () => {
    const entries = computeTerritorySchedule(
      [makeItem({ id: "twi-a", name: "А", category: "manual_cleaning_warm", periodDays: 90, intervalDays: 30 })],
      {
        "twi-a__2026-04-01": { key: "twi-a__2026-04-01", territoryWorkItemId: "twi-a", date: "2026-04-01", completed: true, completedBy: "Иванов" },
      },
      "2026-04-01",
      "2026-05-31",
      new Date("2026-04-15T00:00:00Z"),
    );
    const summary = summarizeTerritorySchedule(entries);
    expect(summary.total).toBe(3);
    expect(summary.completed).toBe(1);
    expect(summary.overdue).toBe(0); // 04-01 done, остальные в будущем относительно 04-15? проверим ниже
    expect(summary.byCategory[0]).toMatchObject({ category: "manual_cleaning_warm", total: 3, completed: 1 });
    expect(summary.byCompletedBy).toEqual([{ name: "Иванов", count: 1 }]);
  });
});
