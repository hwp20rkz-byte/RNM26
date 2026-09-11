import { describe, expect, it } from "vitest";
import {
  computeAgendaItemResult,
  computeQuorum,
  computeRegistryTotals,
  computeUnitMonthlyAccrual,
} from "./ownerRegistryEngine";
import type { AgendaItem, GeneralMeeting, OwnershipUnit } from "./types";

const ts = "2024-01-01T00:00:00.000Z";

function unit(partial: Partial<OwnershipUnit> & Pick<OwnershipUnit, "id" | "area">): OwnershipUnit {
  return {
    unitType: "apartment",
    number: partial.id,
    ownerName: "Тест",
    createdAt: ts,
    updatedAt: ts,
    ...partial,
  };
}

function meeting(partial: Partial<GeneralMeeting> = {}): GeneralMeeting {
  return {
    id: "m1",
    title: "Собрание",
    meetingDate: "2026-01-01",
    format: "in_person",
    participants: [],
    agendaItems: [],
    votes: [],
    createdAt: ts,
    updatedAt: ts,
    ...partial,
  };
}

const UNITS: OwnershipUnit[] = [
  unit({ id: "u1", area: 10 }),
  unit({ id: "u2", area: 10 }),
  unit({ id: "u3", area: 10 }),
  unit({ id: "u4", area: 10, unitType: "commercial" }),
];

describe("computeQuorum", () => {
  it("ровно 50% присутствующих — кворум НЕ состоялся (нужно строго больше половины)", () => {
    const m = meeting({
      participants: [
        { unitId: "u1", present: true },
        { unitId: "u2", present: true },
        { unitId: "u3", present: false },
        { unitId: "u4", present: false },
      ],
    });
    const q = computeQuorum(UNITS, m);
    expect(q.presentArea).toBe(20);
    expect(q.totalArea).toBe(40);
    expect(q.quorumPercent).toBe(50);
    expect(q.quorumMet).toBe(false);
  });

  it("75% присутствующих — кворум состоялся", () => {
    const m = meeting({
      participants: [
        { unitId: "u1", present: true },
        { unitId: "u2", present: true },
        { unitId: "u3", present: true },
        { unitId: "u4", present: false },
      ],
    });
    const q = computeQuorum(UNITS, m);
    expect(q.quorumPercent).toBe(75);
    expect(q.quorumMet).toBe(true);
  });

  it("пустой реестр — кворум не может считаться состоявшимся", () => {
    const q = computeQuorum([], meeting());
    expect(q.totalArea).toBe(0);
    expect(q.quorumMet).toBe(false);
  });
});

describe("computeAgendaItemResult", () => {
  const presentParticipants: GeneralMeeting["participants"] = [
    { unitId: "u1", present: true },
    { unitId: "u2", present: true },
    { unitId: "u3", present: true },
    { unitId: "u4", present: false },
  ];
  const simpleItem: AgendaItem = { id: "a1", title: "Вопрос 1", majorityRule: "simple" };
  const qualifiedItem: AgendaItem = { id: "a2", title: "Вопрос 2", majorityRule: "qualified" };

  it("простое большинство: 1 из 3 присутствующих «за» — решение НЕ принято", () => {
    const m = meeting({
      participants: presentParticipants,
      agendaItems: [simpleItem],
      votes: [
        { agendaItemId: "a1", unitId: "u1", choice: "for" },
        { agendaItemId: "a1", unitId: "u2", choice: "against" },
        { agendaItemId: "a1", unitId: "u3", choice: "abstain" },
      ],
    });
    const r = computeAgendaItemResult(UNITS, m, simpleItem);
    expect(r.forArea).toBe(10);
    expect(r.againstArea).toBe(10);
    expect(r.abstainArea).toBe(10);
    expect(r.presentArea).toBe(30);
    expect(r.forPercentOfPresent).toBeCloseTo(33.33, 1);
    expect(r.passed).toBe(false);
  });

  it("простое большинство: 2 из 3 присутствующих «за» — решение принято", () => {
    const m = meeting({
      participants: presentParticipants,
      agendaItems: [simpleItem],
      votes: [
        { agendaItemId: "a1", unitId: "u1", choice: "for" },
        { agendaItemId: "a1", unitId: "u2", choice: "for" },
        { agendaItemId: "a1", unitId: "u3", choice: "against" },
      ],
    });
    const r = computeAgendaItemResult(UNITS, m, simpleItem);
    expect(r.forPercentOfPresent).toBeCloseTo(66.67, 1);
    expect(r.passed).toBe(true);
    expect(r.thresholdPercent).toBe(50);
  });

  it("квалифицированное большинство: ровно 2/3 присутствующих «за» — принято", () => {
    const m = meeting({
      participants: presentParticipants,
      agendaItems: [qualifiedItem],
      votes: [
        { agendaItemId: "a2", unitId: "u1", choice: "for" },
        { agendaItemId: "a2", unitId: "u2", choice: "for" },
        { agendaItemId: "a2", unitId: "u3", choice: "against" },
      ],
    });
    const r = computeAgendaItemResult(UNITS, m, qualifiedItem);
    expect(r.passed).toBe(true);
    expect(r.thresholdPercent).toBeCloseTo(66.67, 1);
  });

  it("квалифицированное большинство: 1 из 3 «за» — не принято", () => {
    const m = meeting({
      participants: presentParticipants,
      agendaItems: [qualifiedItem],
      votes: [{ agendaItemId: "a2", unitId: "u1", choice: "for" }],
    });
    const r = computeAgendaItemResult(UNITS, m, qualifiedItem);
    expect(r.passed).toBe(false);
  });

  it("голос отсутствующего (не зарегистрированного участником) не учитывается", () => {
    const m = meeting({
      participants: presentParticipants, // u4 отсутствует
      agendaItems: [simpleItem],
      votes: [
        { agendaItemId: "a1", unitId: "u1", choice: "for" },
        { agendaItemId: "a1", unitId: "u4", choice: "for" }, // не в счёт — u4 не present
      ],
    });
    const r = computeAgendaItemResult(UNITS, m, simpleItem);
    expect(r.forArea).toBe(10);
    expect(r.presentArea).toBe(30);
  });

  it("присутствовал, но не проголосовал по вопросу — попадает в notVotedArea", () => {
    const m = meeting({
      participants: presentParticipants,
      agendaItems: [simpleItem],
      votes: [{ agendaItemId: "a1", unitId: "u1", choice: "for" }],
    });
    const r = computeAgendaItemResult(UNITS, m, simpleItem);
    expect(r.notVotedArea).toBe(20);
  });
});

describe("computeUnitMonthlyAccrual", () => {
  const coefficients = { commercialRateCoefficient: 1.5, storageRateCoefficient: 0.5, parkingRateCoefficient: 0.6 };

  it("для квартиры — тариф × площадь без коэффициента", () => {
    const u = unit({ id: "u1", area: 50, unitType: "apartment" });
    expect(computeUnitMonthlyAccrual(u, 100, coefficients)).toBe(5000);
  });

  it("для нежилого — тариф × коэффициент нежилых × площадь", () => {
    const u = unit({ id: "u4", area: 100, unitType: "commercial" });
    expect(computeUnitMonthlyAccrual(u, 100, coefficients)).toBe(15000);
  });

  it("кладовая и машиноместо — со своим коэффициентом, а не как жильё", () => {
    const storage = unit({ id: "s1", area: 5, unitType: "storage" });
    const parking = unit({ id: "p1", area: 15, unitType: "parking" });
    expect(computeUnitMonthlyAccrual(storage, 100, coefficients)).toBe(250);
    expect(computeUnitMonthlyAccrual(parking, 100, coefficients)).toBe(900);
  });
});

describe("computeRegistryTotals", () => {
  it("считает количество и площадь по типам", () => {
    const totals = computeRegistryTotals(UNITS);
    expect(totals.totalUnits).toBe(4);
    expect(totals.totalArea).toBe(40);
    expect(totals.byType.apartment.count).toBe(3);
    expect(totals.byType.apartment.area).toBe(30);
    expect(totals.byType.commercial.count).toBe(1);
    expect(totals.byType.commercial.area).toBe(10);
    expect(totals.byType.storage.count).toBe(0);
  });
});
