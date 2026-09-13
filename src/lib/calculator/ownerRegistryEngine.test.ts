import { describe, expect, it } from "vitest";
import {
  buildDebtNoticeMessage,
  buildWaLinkToPhone,
  computeAgendaItemResult,
  computeDebtMonths,
  computeQuorum,
  computeRegistryDebtSummary,
  computeRegistryTotals,
  computeUnitDebtStatus,
  computeUnitMonthlyAccrual,
  groupUnitsByAddress,
  normalizePhoneForWa,
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
  const coefficients = {
    commercialRateCoefficient: 1.5,
    storageRateCoefficient: 0.5,
    parkingRateCoefficient: 0.6,
    parkingFlatFeePerSpot: 0,
    parkingNonPaymentRatePercent: 0,
  };

  it("для квартиры — тариф × площадь без коэффициента", () => {
    const u = unit({ id: "u1", area: 50, unitType: "apartment" });
    expect(computeUnitMonthlyAccrual(u, 100, coefficients)).toBe(5000);
  });

  it("для нежилого — тариф × коэффициент нежилых × площадь", () => {
    const u = unit({ id: "u4", area: 100, unitType: "commercial" });
    expect(computeUnitMonthlyAccrual(u, 100, coefficients)).toBe(15000);
  });

  it("кладовая и машиноместо (без пола/резерва) — со своим коэффициентом, а не как жильё", () => {
    const storage = unit({ id: "s1", area: 5, unitType: "storage" });
    const parking = unit({ id: "p1", area: 15, unitType: "parking" });
    expect(computeUnitMonthlyAccrual(storage, 100, coefficients)).toBe(250);
    expect(computeUnitMonthlyAccrual(parking, 100, coefficients)).toBe(900);
  });

  it("машиноместо — пол поднимает начисление, если площадная ставка ниже минимума", () => {
    const parking = unit({ id: "p2", area: 10, unitType: "parking" }); // 100×0.6×10=600 < пол
    const withFloor = { ...coefficients, parkingFlatFeePerSpot: 7500 };
    expect(computeUnitMonthlyAccrual(parking, 100, withFloor)).toBe(7500);
  });

  it("машиноместо — резерв на неплатежи завышает начисление сверх пола", () => {
    const parking = unit({ id: "p3", area: 10, unitType: "parking" });
    const withFloorAndReserve = { ...coefficients, parkingFlatFeePerSpot: 7500, parkingNonPaymentRatePercent: 35 };
    // 7500 / (1 - 0.35) = 11538.46...
    expect(computeUnitMonthlyAccrual(parking, 100, withFloorAndReserve)).toBeCloseTo(11538.46, 1);
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

describe("groupUnitsByAddress", () => {
  it("группирует юниты по адресу и считает подытоги", () => {
    const units: OwnershipUnit[] = [
      unit({ id: "a1", area: 50, number: "1", address: "ул.А, д.1" }),
      unit({ id: "a2", area: 60, number: "2", address: "ул.А, д.1" }),
      unit({ id: "b1", area: 70, number: "1", address: "ул.Б, д.2" }),
    ];
    const groups = groupUnitsByAddress(units);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toEqual({ address: "ул.А, д.1", unitCount: 2, totalArea: 110 });
    expect(groups[1]).toEqual({ address: "ул.Б, д.2", unitCount: 1, totalArea: 70 });
  });

  it("юниты без адреса попадают в отдельную группу с пустым address, в конце списка", () => {
    const units: OwnershipUnit[] = [
      unit({ id: "a1", area: 50, number: "1", address: "ул.А, д.1" }),
      unit({ id: "n1", area: 30, number: "9" }),
    ];
    const groups = groupUnitsByAddress(units);
    expect(groups).toHaveLength(2);
    expect(groups[1]).toEqual({ address: "", unitCount: 1, totalArea: 30 });
  });

  it("один общий адрес — одна группа", () => {
    const groups = groupUnitsByAddress(UNITS);
    expect(groups).toHaveLength(1);
    expect(groups[0].address).toBe("");
    expect(groups[0].unitCount).toBe(4);
  });
});

describe("computeDebtMonths", () => {
  it("делит долг на текущее начисление", () => {
    expect(computeDebtMonths(9000, 1500)).toBe(6);
  });

  it("возвращает 0 для нулевого или отрицательного долга", () => {
    expect(computeDebtMonths(0, 1500)).toBe(0);
    expect(computeDebtMonths(-500, 1500)).toBe(0);
  });

  it("возвращает 0, если начисление за период неизвестно (0)", () => {
    expect(computeDebtMonths(9000, 0)).toBe(0);
  });

  it("округляет до 1 знака после запятой", () => {
    expect(computeDebtMonths(1000, 300)).toBeCloseTo(3.3, 5);
  });
});

describe("computeUnitDebtStatus", () => {
  function debtUnit(partial: Partial<OwnershipUnit> = {}): OwnershipUnit {
    return unit({
      id: "d1",
      area: 50,
      debtElevatorKzt: 3000,
      debtOperationalKzt: 2000,
      monthlyChargeElevatorKzt: 1500,
      monthlyChargeOperationalKzt: 1000,
      debtImportedAt: ts,
      ...partial,
    });
  }

  it("считает долг по услугам и месяцы просрочки", () => {
    const status = computeUnitDebtStatus(debtUnit());
    expect(status.elevatorDebtKzt).toBe(3000);
    expect(status.operationalDebtKzt).toBe(2000);
    expect(status.elevatorDebtMonths).toBe(2);
    expect(status.operationalDebtMonths).toBe(2);
    expect(status.totalDebtKzt).toBe(5000);
    expect(status.isDebtor).toBe(true);
  });

  it("переплата по одной услуге не считается долгом (Math.max(0, ...))", () => {
    const status = computeUnitDebtStatus(debtUnit({ debtElevatorKzt: -1000, debtOperationalKzt: 2000 }));
    expect(status.totalDebtKzt).toBe(2000); // -1000 не вычитается из долга к взысканию
    expect(status.totalBalanceKzt).toBe(1000); // сырая сумма — переплата уменьшает общий баланс
  });

  it("нулевой/отрицательный итоговый баланс — не должник", () => {
    const status = computeUnitDebtStatus(debtUnit({ debtElevatorKzt: -3000, debtOperationalKzt: 2000 }));
    expect(status.isDebtor).toBe(false);
  });
});

describe("computeRegistryDebtSummary", () => {
  const withDebtData: OwnershipUnit[] = [
    unit({
      id: "d1",
      area: 50,
      number: "1",
      debtElevatorKzt: 3000,
      debtOperationalKzt: 0,
      monthlyChargeElevatorKzt: 1500,
      monthlyChargeOperationalKzt: 1000,
      debtImportedAt: ts,
      debtPeriod: "08/2026",
    }),
    unit({
      id: "d2",
      area: 60,
      number: "2",
      debtElevatorKzt: 0,
      debtOperationalKzt: 4000,
      monthlyChargeElevatorKzt: 1500,
      monthlyChargeOperationalKzt: 2000,
      debtImportedAt: ts,
      debtPeriod: "08/2026",
    }),
    unit({ id: "d3", area: 40, number: "3" }), // без импорта долга — не учитывается
  ];

  it("считает должников, суммы и средние месяцы только по фактическим должникам", () => {
    const summary = computeRegistryDebtSummary(withDebtData);
    expect(summary.unitsWithDebtData).toBe(2);
    expect(summary.debtorCount).toBe(2);
    expect(summary.totalDebtKzt).toBe(7000);
    expect(summary.elevatorDebtKzt).toBe(3000);
    expect(summary.operationalDebtKzt).toBe(4000);
    expect(summary.averageDebtMonthsElevator).toBe(2); // только d1 (3000/1500)
    expect(summary.averageDebtMonthsOperational).toBe(2); // только d2 (4000/2000)
    expect(summary.debtPeriod).toBe("08/2026");
  });

  it("топ должников отсортирован по убыванию долга и ограничен topN", () => {
    const summary = computeRegistryDebtSummary(withDebtData, 1);
    expect(summary.topDebtors).toHaveLength(1);
    expect(summary.topDebtors[0].unit.id).toBe("d2"); // 4000 > 3000
  });

  it("пустой реестр без импорта долга — нулевая сводка", () => {
    const summary = computeRegistryDebtSummary([unit({ id: "x", area: 10 })]);
    expect(summary.unitsWithDebtData).toBe(0);
    expect(summary.debtorCount).toBe(0);
    expect(summary.totalDebtKzt).toBe(0);
  });
});

describe("normalizePhoneForWa", () => {
  it("переводит 8xxx в 7xxx (казахстанский формат)", () => {
    expect(normalizePhoneForWa("87071234567")).toBe("77071234567");
  });

  it("оставляет +7xxx как есть, убирая нецифровые символы", () => {
    expect(normalizePhoneForWa("+7 707 123 45 67")).toBe("77071234567");
  });

  it("добавляет код 7 к 10-значному номеру без кода страны", () => {
    expect(normalizePhoneForWa("7071234567")).toBe("77071234567");
  });
});

describe("buildWaLinkToPhone / buildDebtNoticeMessage", () => {
  it("строит wa.me-ссылку с номером телефона и закодированным текстом", () => {
    const link = buildWaLinkToPhone("+7 707 123 45 67", "тест");
    expect(link).toBe("https://wa.me/77071234567?text=%D1%82%D0%B5%D1%81%D1%82");
  });

  it("сообщение о долге включает суммы по услугам и не включает услугу с нулевым долгом", () => {
    const debtor = unit({
      id: "d1",
      area: 50,
      number: "5",
      ownerName: "Иванов И.И.",
      debtElevatorKzt: 3000,
      debtOperationalKzt: 0,
      monthlyChargeElevatorKzt: 1500,
      monthlyChargeOperationalKzt: 1000,
      debtImportedAt: ts,
      debtPeriod: "08/2026",
    });
    const status = computeUnitDebtStatus(debtor);
    const message = buildDebtNoticeMessage(debtor, status, "Bahyt Home");
    expect(message).toContain("Квартира №5, Иванов И.И.");
    expect(message).toContain("ТО лифтов");
    expect(message).not.toContain("Эксплуатационные расходы");
    expect(message).toContain("08/2026");
  });
});
