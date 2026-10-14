import { describe, expect, it } from "vitest";
import { productInput } from "@/domain/catalog/products";
import { analyze, DEFAULT_SETTINGS } from "@/domain/planner/analyze";
import { tourPoints } from "./CameraBar";
import { tourKeys } from "./Tour";

const a = analyze(productInput("bjj"), DEFAULT_SETTINGS, { steelPerKg: 850, scrapPct: 3, fastenerEach: 15, boltEach: 400 });
const p = tourPoints(a);

describe("camera tours", () => {
  it("finds the entrance on the front wall, the lobby and the hall of the BJJ centre", () => {
    expect(p.entrance!.x).toBeCloseTo(3400 + 750);
    expect(a.thermal.envelope.rooms[0]!.find((r) => r.purpose === "lobby")).toBeDefined();
    expect(p.hall!.x).toBeGreaterThan(9500);
  });

  it("the interior walk starts on the street, goes in through the main door at eye height and ends in the hall", () => {
    const k = tourKeys("interior", p);
    expect(k.pos[0]![2]).toBeLessThan(0);
    const inDoor = k.pos.find((x) => x[2] > 0)!;
    expect(inDoor[0]).toBeCloseTo(p.entrance!.x);
    for (const x of k.pos) expect(x[1]).toBeCloseTo(p.floor + 1600);
    const last = k.pos.at(-1)!;
    expect(last[0]).toBeGreaterThan(9500);
  });

  it("the orbit circles the building outside its footprint and above the ridge", () => {
    const k = tourKeys("orbit", p);
    for (const [x, y, z] of k.pos) {
      const inside = x > 0 && x < p.length && z > 0 && z < p.width;
      expect(inside).toBe(false);
      expect(y).toBeGreaterThan(p.ridge);
    }
    expect(k.pos.length).toBe(k.look.length);
  });

  it("the flyover passes over the roof", () => {
    const k = tourKeys("flyover", p);
    expect(Math.max(...k.pos.map((x) => x[1]))).toBeGreaterThan(p.ridge + 5000);
  });
});
