import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { productInput } from "../catalog/products";
import { analyze, DEFAULT_SETTINGS } from "../planner/analyze";
import { ru } from "@/i18n/ru";
import { buildScene } from "@/features/configurator/buildScene";
import { DEFAULT_PROJECT } from "@/store/configurator";

const prices = { steelPerKg: 850, scrapPct: 3, fastenerEach: 15, boltEach: 400 };
const bjj = analyze(productInput("bjj"), DEFAULT_SETTINGS, prices);
const qty = (a: ReturnType<typeof analyze>, k: string) => a.fitout.find((x) => x.key === k)?.qty ?? 0;

describe("sports club finishes and fit-out", () => {
  it("lines and ceils every room of the club, not just the corridors", () => {
    const interior = bjj.finishes.filter((f) => f.zone === "interior").reduce((s, f) => s + f.areaM2, 0);
    const wet = bjj.finishes.filter((f) => f.zone === "wet").reduce((s, f) => s + f.areaM2, 0);
    // The 300 m² hall alone has ~300 m² of ceiling and ~280 m² of walls
    expect(interior).toBeGreaterThan(700);
    expect(wet).toBeGreaterThan(200);
    expect(bjj.finishes.some((f) => f.zone === "floorHall")).toBe(true);
  });

  it("furnishes the BJJ centre: tatami over the hall, padding, 40 lockers per changing room, showers, reception", () => {
    const hall = bjj.thermal.envelope.rooms[0]!.find((r) => r.purpose === "gym")!;
    expect(qty(bjj, "tatami")).toBeCloseTo(hall.area, 0);
    expect(qty(bjj, "wallPad")).toBeGreaterThan(100);
    expect(qty(bjj, "locker")).toBe(80);
    expect(qty(bjj, "showerCabin")).toBe(2);
    expect(qty(bjj, "reception")).toBe(1);
    const sec = bjj.estimate.sections.find((s) => s.id === "fitout")!;
    expect(sec.total).toBeCloseTo(bjj.fitout.reduce((s, f) => s + f.qty * f.price, 0), -1);
    const keys = new Set(Object.keys(ru));
    for (const f of bjj.fitout) expect(keys.has(`est.fit.${f.key}`), f.key).toBe(true);
  });

  it("puts the right floor in each hall and kits it for the sport", () => {
    const fit = analyze(productInput("fitness"), DEFAULT_SETTINGS, prices);
    expect(fit.finishes.find((f) => f.zone === "floorHall")!.finishId).toBe("sportRubber");
    expect(qty(fit, "treadmill")).toBeGreaterThan(3);
    const tt = analyze(productInput("tabletennis"), DEFAULT_SETTINGS, prices);
    expect(tt.finishes.find((f) => f.zone === "floorHall")!.finishId).toBe("sportPvc");
    expect(qty(tt, "ttTable")).toBe(4);
    expect(analyze(productInput("house"), DEFAULT_SETTINGS, prices).fitout).toEqual([]);
  });

  it("draws the lining, the ceiling and the attic wool in 3D; the plan cut hides the ceiling", () => {
    const s = buildScene({ ...structuredClone(DEFAULT_PROJECT), mode: "building", building: productInput("bjj") });
    const interior = s.object.getObjectByName("interior")!;
    expect(interior).toBeDefined();
    let lids = 0;
    let walls = 0;
    interior.traverse((o) => {
      if (o.userData.level === 0.5) lids++;
      if (o instanceof THREE.Mesh && o.geometry instanceof THREE.ExtrudeGeometry) walls++;
    });
    expect(lids).toBe(1);
    expect(walls).toBeGreaterThanOrEqual(40); // 4 sides × 10 rooms
  });
});
