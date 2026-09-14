// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { DEFAULT_BUILDING } from "@/lib/calculator/presets";
import { exportMafInspectionActToDocxBlob } from "./exportMafInspectionActToDocx";
import type { TerritoryPassport } from "@/lib/calculator/types";

function passport(partial: Partial<TerritoryPassport> = {}): TerritoryPassport {
  return {
    id: "tp1",
    pavementAreaSqm: 0,
    accessRoadAreaSqm: 0,
    greeneryAreaSqm: 0,
    accessRoadLengthKm: 0,
    treeCount: 0,
    shrubCount: 0,
    urnCount: 0,
    lightingFixtureCount: 0,
    playgroundCount: 0,
    wasteSiteCount: 0,
    compiledAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("exportMafInspectionActToDocxBlob", () => {
  it("формирует документ без паспорта территории (только профиль дома)", async () => {
    const blob = await exportMafInspectionActToDocxBlob(DEFAULT_BUILDING);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("формирует документ со справочной строкой по паспорту, когда есть площадки/урны/освещение", async () => {
    const blob = await exportMafInspectionActToDocxBlob(
      DEFAULT_BUILDING,
      passport({ playgroundCount: 2, urnCount: 6, lightingFixtureCount: 10 }),
    );
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("формирует документ с нулевым паспортом (справочная строка не должна падать на пустых полях)", async () => {
    const blob = await exportMafInspectionActToDocxBlob(DEFAULT_BUILDING, passport());
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });
});
