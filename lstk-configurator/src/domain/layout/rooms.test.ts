import { describe, expect, it } from "vitest";
import { generateBuilding, MAX_PANEL, panelCuts } from "../buildings/generate";
import type { Level, Partition } from "../buildings/types";
import { PRODUCTS, productInput } from "../catalog/products";
import { analyze, DEFAULT_SETTINGS } from "../planner/analyze";
import { findProfile } from "../profiles/catalog";
import { cellAt, interior, partitionSegments, rooms, validatePartitions } from "./rooms";

const d = 89;
const inner = interior({ length: 12000, width: 8000 }, d);
const lv = (partitions: Partition[], r: Level["rooms"] = {}): Level =>
  ({ height: 3000, sides: {} as Level["sides"], partitions, rooms: r }) as Level;

describe("partitions with a span", () => {
  // A cross wall at x = 6000 over the whole width, a short one at z = 4000 from the left wall to it
  const parts: Partition[] = [
    { id: "a", axis: "x", at: 6000, doors: [] },
    { id: "b", axis: "z", at: 4000, doors: [], span: { from: d, to: 6000 } },
  ];

  it("a short partition only splits the cells it runs past; the rest merge into one room", () => {
    const rs = rooms(lv(parts), inner, d);
    expect(rs).toHaveLength(3);
    const big = rs.find((r) => r.x0 > 5000)!;
    expect(big.area).toBeCloseTo(((inner.x1 - 6000 - d / 2) * (inner.z1 - inner.z0)) / 1e6, 0);
  });

  it("is cut only where it actually runs, and its doors land in the right segment", () => {
    const withDoor = [parts[0]!, { ...parts[1]!, doors: [{ id: "o", kind: "door" as const, x: 2000, width: 900, height: 2100, sill: 0 }] }];
    const segs = partitionSegments(lv(withDoor), inner, d).filter((s) => s.axis === "z");
    expect(segs).toHaveLength(1);
    expect(segs[0]!.to).toBeCloseTo(6000 - d / 2);
    expect(segs[0]!.doors[0]!.x).toBeCloseTo(2000 - (segs[0]!.from - inner.x0));
  });

  it("a partition ending in the middle of a room is an error", () => {
    const dangling: Partition[] = [{ id: "c", axis: "z", at: 4000, doors: [], span: { from: d, to: 5000 } }];
    expect(validatePartitions(lv(dangling), inner, d).join()).toMatch(/обрывается/);
  });

  it("cellAt finds the key used for room purposes", () => {
    const key = cellAt(lv(parts), inner, 9000, 2000);
    const rs = rooms(lv(parts, { [key]: "gym" }), inner, d);
    expect(rs.find((r) => r.x0 > 5000)!.purpose).toBe("gym");
  });
});

describe("long walls are split into transportable panels", () => {
  const p = findProfile("C89x41x11x1.2");
  it("short walls stay whole", () => expect(panelCuts(9000, [], [], p)).toEqual([[0, 9000]]));
  it("a 29.6 m wall becomes three panels, joints clear of openings", () => {
    const openings = [{ id: "w", kind: "window" as const, x: 9500, width: 2400, height: 1500, sill: 900 }];
    const cuts = panelCuts(29600, openings, [], p);
    expect(cuts).toHaveLength(3);
    for (const [a, b] of cuts) expect(b - a).toBeLessThanOrEqual(MAX_PANEL + 1000);
    for (const [, b] of cuts.slice(0, -1)) expect(b < 9500 - 300 || b > 11900 + 300).toBe(true);
  });
});

describe("sports library", () => {
  const sport = PRODUCTS.filter((x) => x.category === "sport").map((x) => x.id);
  it("has the BJJ centre and the other halls", () => expect(sport).toEqual(expect.arrayContaining(["bjj", "fitness", "yoga", "tabletennis", "crossfit"])));

  it("BJJ centre: 20 × 15 m mat hall, 4 m+ ceiling, M/F changing rooms, two WC + shower, lobby ≈ 30 m², office, boiler room, store ≈ 15 m²", () => {
    const inp = productInput("bjj");
    expect(inp.levels[0]!.height).toBeGreaterThanOrEqual(4000);
    const b = generateBuilding(inp);
    const rs = rooms(inp.levels[0]!, b.levels[0]!.inner, b.depth);
    const by = (p: string) => rs.filter((r) => r.purpose === p);
    const hall = by("gym")[0]!;
    expect(hall.x1 - hall.x0).toBeGreaterThanOrEqual(20000);
    expect(hall.z1 - hall.z0).toBeGreaterThanOrEqual(15000);
    expect(by("changing")).toHaveLength(2);
    for (const r of by("changing")) expect(r.area).toBeGreaterThan(25);
    expect(by("bathroom")).toHaveLength(2);
    expect(by("lobby")[0]!.area).toBeGreaterThan(28);
    expect(by("office")).toHaveLength(1);
    expect(by("technical")).toHaveLength(1);
    expect(Math.max(...by("storage").map((r) => r.area))).toBeGreaterThan(13);
    // two ways out of the hall: the back and the right end walls have doors
    expect(inp.levels[0]!.sides.back.openings.some((o) => o.kind === "door")).toBe(true);
    expect(inp.levels[0]!.sides.right.openings.some((o) => o.kind === "door")).toBe(true);
  });

  it.each(sport)("%s passes every structural check", (id) => {
    const a = analyze(productInput(id), DEFAULT_SETTINGS, { steelPerKg: 850, scrapPct: 3, fastenerEach: 15, boltEach: 400 });
    expect(a.design.worst).toBeLessThanOrEqual(1);
  });
});
