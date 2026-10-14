import { describe, expect, it } from "vitest";
import { productInput } from "./products";
import { analyze, DEFAULT_SETTINGS } from "../planner/analyze";

describe("house 20×16 after the Rg6346 layout", () => {
  const a = analyze(productInput("house20"), DEFAULT_SETTINGS, { steelPerKg: 850, scrapPct: 3, fastenerEach: 15, boltEach: 400 });
  const rooms = a.thermal.envelope.rooms[0]!;
  const n = (p: string) => rooms.filter((r) => r.purpose === p);

  it("has the outline and the room programme: open kitchen–living, three bedrooms, study, two baths, laundry, boiler", () => {
    expect(a.building.input.length).toBe(20270);
    expect(a.building.input.width).toBe(15920);
    expect(n("bedroom")).toHaveLength(3);
    expect(n("bathroom")).toHaveLength(2);
    expect(n("living")[0]!.area + n("kitchen")[0]!.area).toBeGreaterThan(85);
    expect(n("office")).toHaveLength(1);
    expect(n("washing")).toHaveLength(1);
    expect(n("technical")).toHaveLength(1);
    expect(a.areas.floor).toBeGreaterThan(300);
  });

  it("builds clean and passes with a margin; a terrace door on the garden side", () => {
    expect(a.building.assemblies.flatMap((x) => x.detailIssues ?? [])).toEqual([]);
    expect(a.design.worst).toBeLessThan(0.9);
    expect(a.building.input.levels[0]!.sides.back.openings.some((o) => o.kind === "door" && o.width >= 2400)).toBe(true);
  });
});
