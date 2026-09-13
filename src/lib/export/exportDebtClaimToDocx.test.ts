// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { DEFAULT_BUILDING } from "@/lib/calculator/presets";
import { exportDebtClaimToDocxBlob } from "./exportDebtClaimToDocx";
import type { OwnershipUnit } from "@/lib/calculator/types";

const ts = "2026-08-01T00:00:00.000Z";

function unit(partial: Partial<OwnershipUnit> = {}): OwnershipUnit {
  return {
    id: "u1",
    unitType: "apartment",
    number: "12",
    area: 55,
    ownerName: "Тестов Т.Т.",
    createdAt: ts,
    updatedAt: ts,
    ...partial,
  };
}

describe("exportDebtClaimToDocxBlob", () => {
  it("формирует документ на одного должника с долгом по обеим услугам", async () => {
    const blob = await exportDebtClaimToDocxBlob({
      building: DEFAULT_BUILDING,
      units: [
        unit({
          address: "ул.Тест, д.1",
          personalAccount: "ЛС-001",
          debtElevatorKzt: 3000,
          debtOperationalKzt: 4000,
          monthlyChargeElevatorKzt: 1500,
          monthlyChargeOperationalKzt: 2000,
          debtPeriod: "08/2026",
          debtImportedAt: ts,
        }),
      ],
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("формирует документ без данных о долге (пустые поля бланка)", async () => {
    const blob = await exportDebtClaimToDocxBlob({ building: DEFAULT_BUILDING, units: [unit()] });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("формирует сводный документ по нескольким должникам со сводной таблицей", async () => {
    const blob = await exportDebtClaimToDocxBlob({
      building: DEFAULT_BUILDING,
      units: [
        unit({
          id: "u1",
          number: "12",
          address: "ул.Тест, д.1",
          personalAccount: "ЛС-001",
          debtElevatorKzt: 3000,
          debtOperationalKzt: 4000,
          monthlyChargeElevatorKzt: 1500,
          monthlyChargeOperationalKzt: 2000,
          debtImportedAt: ts,
        }),
        unit({
          id: "u2",
          number: "13",
          ownerName: "Иванов И.И.",
          address: "ул.Тест, д.1",
          personalAccount: "ЛС-002",
          debtElevatorKzt: 1000,
          debtOperationalKzt: 2000,
          monthlyChargeElevatorKzt: 1500,
          monthlyChargeOperationalKzt: 2000,
          debtImportedAt: ts,
        }),
      ],
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("бросает ошибку при пустом списке должников", async () => {
    await expect(exportDebtClaimToDocxBlob({ building: DEFAULT_BUILDING, units: [] })).rejects.toThrow();
  });
});
