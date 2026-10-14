import { describe, expect, it } from "vitest";
import { generateBuilding, sideOpenings } from "../buildings/generate";
import { productInput } from "../catalog/products";
import { analyze, DEFAULT_SETTINGS } from "../planner/analyze";
import { ru } from "@/i18n/ru";
import { SIGN_OFF, signLayout, signPreset } from "./sign";

const prices = { steelPerKg: 850, scrapPct: 3, fastenerEach: 15, boltEach: 400 };
const inp = productInput("bjj");
const b = generateBuilding(inp);
const front = sideOpenings(inp.levels[0]!.sides.front, inp.length, inp.levels[0]!.height, inp, b.profile);

describe("facade sign", () => {
  it("is off without text or when disabled", () => {
    expect(signLayout(b, SIGN_OFF, front)).toBeNull();
    expect(signLayout(b, { ...signPreset("bjj"), text: "  " }, front)).toBeNull();
  });

  it("sits over the main entrance, between the door head and the eaves", () => {
    const l = signLayout(b, signPreset("bjj"), front)!;
    const door = front.filter((o) => o.kind === "door").sort((x, y) => y.width * y.height - x.width * x.height)[0]!;
    expect(l.x).toBeCloseTo(door.x + door.width / 2);
    expect(l.y).toBeGreaterThan(door.height);
    expect(l.y + l.height).toBeLessThanOrEqual(inp.levels[0]!.height);
    expect(l.readM).toBe(150); // 600 mm letters
    expect(l.notes).toContain("permit");
  });

  it("taller letters cost more, a lightbox draws more LED power than letters", () => {
    const s = signPreset("bjj");
    const small = signLayout(b, { ...s, height: 400 }, front)!;
    const big = signLayout(b, { ...s, height: 800 }, front)!;
    expect(big.cost).toBeGreaterThan(small.cost);
    const box = signLayout(b, { ...s, style: "lightbox" }, front)!;
    expect(box.ledW / box.areaM2).toBeGreaterThan(signLayout(b, s, front)!.ledW / signLayout(b, s, front)!.areaM2);
    expect(signLayout(b, { ...s, lit: false }, front)!.ledW).toBe(0);
  });

  it("goes on a pylon by the driveway when asked, and into the facade estimate", () => {
    const l = signLayout(b, { ...signPreset("bjj"), place: "pylon" }, front)!;
    expect(l.pylon).not.toBeNull();
    expect(l.pylon!.z).toBeLessThan(-3000 - 5300 - 6000); // past the parking aisle
    const a = analyze(inp, { ...DEFAULT_SETTINGS, sign: signPreset("bjj") }, prices);
    const facade = a.estimate.sections.find((x) => x.id === "facade")!;
    expect(facade.lines.some((x) => x.id === "sign")).toBe(true);
    expect(Object.keys(ru)).toContain("est.sign");
    for (const n of a.sign!.notes) expect(Object.keys(ru)).toContain(`sign.note.${n}`);
  });
});
