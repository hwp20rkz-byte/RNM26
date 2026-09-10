// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { buildDefaultDatabase } from "@/lib/calculator/database";
import { DEFAULT_BUILDING } from "@/lib/calculator/presets";
import { computeTariff } from "@/lib/calculator/engine";
import { exportProtocolToDocxBlob } from "./exportProtocolToDocx";
import type { Asset, GeneralMeeting, OwnershipUnit } from "@/lib/calculator/types";

const ts = "2024-01-01T00:00:00.000Z";

const UNITS: OwnershipUnit[] = [
  { id: "u1", unitType: "apartment", number: "1", area: 40, ownerName: "Иванов И.И.", createdAt: ts, updatedAt: ts },
  { id: "u2", unitType: "apartment", number: "2", area: 60, ownerName: "Петров П.П.", createdAt: ts, updatedAt: ts },
];

function meeting(partial: Partial<GeneralMeeting> = {}): GeneralMeeting {
  return {
    id: "m1",
    title: "Годовое собрание",
    meetingDate: "2026-05-01",
    format: "in_person",
    participants: [],
    agendaItems: [],
    votes: [],
    createdAt: ts,
    updatedAt: ts,
    ...partial,
  };
}

const ASSET: Asset = {
  id: "a1",
  name: "Насос",
  category: "heating",
  quantity: 1,
  installedYear: 2010,
  normativeLifeYears: 10,
  replacementUnitCost: 100000,
  createdAt: ts,
  updatedAt: ts,
};

function baseContext(overrides: Partial<Parameters<typeof exportProtocolToDocxBlob>[0]> = {}) {
  const db = buildDefaultDatabase();
  const tariff = computeTariff(db, DEFAULT_BUILDING);
  return {
    building: DEFAULT_BUILDING,
    meeting: meeting(),
    units: [],
    assets: [],
    maintenanceTasks: [],
    tariff,
    capitalFundBalance: 0,
    annualCapitalIncome: 0,
    capitalPlanTotalNeed: 0,
    capitalPlanHorizonYears: 5,
    ...overrides,
  };
}

describe("exportProtocolToDocxBlob", () => {
  it("формирует документ на полностью пустых данных (пустой реестр, пустая повестка)", async () => {
    const blob = await exportProtocolToDocxBlob(baseContext());
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("формирует документ с заполненным реестром, повесткой и голосами", async () => {
    const m = meeting({
      participants: [
        { unitId: "u1", present: true },
        { unitId: "u2", present: true },
      ],
      agendaItems: [{ id: "ag1", title: "Утвердить смету", majorityRule: "simple" }],
      votes: [
        { agendaItemId: "ag1", unitId: "u1", choice: "for" },
        { agendaItemId: "ag1", unitId: "u2", choice: "against" },
      ],
    });
    const blob = await exportProtocolToDocxBlob(
      baseContext({ meeting: m, units: UNITS, assets: [ASSET], capitalPlanTotalNeed: 500000, annualCapitalIncome: 100000 }),
    );
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("не падает, когда голос присутствующего не проставлен ни по одному вопросу", async () => {
    const m = meeting({
      participants: [{ unitId: "u1", present: true }],
      agendaItems: [{ id: "ag1", title: "Вопрос без голосов", majorityRule: "qualified" }],
      votes: [],
    });
    const blob = await exportProtocolToDocxBlob(baseContext({ meeting: m, units: UNITS }));
    expect(blob.size).toBeGreaterThan(0);
  });
});
