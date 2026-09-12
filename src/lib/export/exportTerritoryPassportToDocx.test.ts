// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { DEFAULT_BUILDING } from "@/lib/calculator/presets";
import { exportTerritoryPassportToDocxBlob } from "./exportTerritoryPassportToDocx";
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

describe("exportTerritoryPassportToDocxBlob", () => {
  it("формирует документ на полностью пустом паспорте (все поля бланка)", async () => {
    const blob = await exportTerritoryPassportToDocxBlob(DEFAULT_BUILDING, passport());
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("формирует документ с заполненными площадями/счётчиками", async () => {
    const blob = await exportTerritoryPassportToDocxBlob(
      DEFAULT_BUILDING,
      passport({ pavementAreaSqm: 3000, accessRoadAreaSqm: 2000, greeneryAreaSqm: 1500, treeCount: 15, shrubCount: 5 }),
    );
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });
});
