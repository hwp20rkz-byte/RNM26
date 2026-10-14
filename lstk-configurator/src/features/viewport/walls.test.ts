import { describe, expect, it } from "vitest";
import { generateBuilding } from "@/domain/buildings/generate";
import { productInput } from "@/domain/catalog/products";
import { tourPoints } from "./CameraBar";
import { analyze, DEFAULT_SETTINGS } from "@/domain/planner/analyze";
import { collide, walkWalls } from "./walls";

const a = analyze(productInput("bjj"), DEFAULT_SETTINGS, { steelPerKg: 850, scrapPct: 3, fastenerEach: 15, boltEach: 400 });
const b = a.building;
const walls = walkWalls(b);
const p = tourPoints(a);

/** Walk in small steps from a to b; where does the walker end up? */
function walk(from: [number, number], to: [number, number]): [number, number] {
  let [x, z] = from;
  const dx = (to[0] - from[0]) / 400;
  const dz = (to[1] - from[1]) / 400;
  for (let i = 0; i < 400; i++) [x, z] = collide(x + dx, z + dz, walls);
  return [x, z];
}

describe("first-person walk collisions", () => {
  it("has the outer walls and the partitions, opened at the doors", () => {
    expect(walls.length).toBeGreaterThan(10);
    // The front wall is cut at the main entrance
    const ex = p.entrance!.x;
    expect(walls.some((w) => w.z0 === w.z1 && w.z0 < 100 && ex > w.x0 && ex < w.x1)).toBe(false);
  });

  it("goes in through the main door", () => {
    const ex = p.entrance!.x;
    const [, z] = walk([ex, -3000], [ex, 2000]);
    expect(z).toBeGreaterThan(1500);
  });

  it("stops at a solid wall", () => {
    // Straight at the front wall away from any door, from the street side
    const [, z] = walk([20000, -3000], [20000, 2000]);
    expect(z).toBeLessThan(0);
  });
});
