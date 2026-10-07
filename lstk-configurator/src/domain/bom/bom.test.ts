import DxfParser from "dxf-parser";
import { describe, expect, it } from "vitest";
import { generateBuilding } from "../buildings/generate";
import { presetInput } from "../buildings/presets";
import { envelopeQuantities } from "../buildings/quantities";
import { assembliesDxf } from "../exports/dxf";
import { bomCsv, cutListCsv } from "../exports/csv";
import { centrelineLength } from "../members/member";
import { sectionProperties } from "../profiles/section";
import { forceSummary, roofNodeLoads } from "../trusses/loads";
import { solveTruss } from "../trusses/analysis";
import { computeBom, operationsString, type Prices } from "./bom";

const prices: Prices = { steelPerKg: 850, scrapPct: 3, fastenerEach: 15, boltEach: 400 };
const house = generateBuilding(presetInput("house"));
const bom = computeBom(house.assemblies, prices);

describe("computeBom", () => {
  it("piece count and metres equal the sum over every member", () => {
    const members = house.assemblies.flatMap((a) => a.members);
    expect(bom.totals.pieces).toBe(members.length);
    expect(bom.totals.metres).toBeCloseTo(members.reduce((s, m) => s + centrelineLength(m) / 1000, 0), 6);
  });

  it("mass = Σ length × kg/m; scrap and prices applied once", () => {
    const members = house.assemblies.flatMap((a) => a.members);
    const mass = members.reduce((s, m) => s + (sectionProperties(m.profile).massPerM * centrelineLength(m)) / 1000, 0);
    expect(bom.totals.massKg).toBeCloseTo(mass, 6);
    expect(bom.totals.massWithScrapKg).toBeCloseTo(mass * 1.03, 6);
    expect(bom.totals.steelCost).toBeCloseTo(mass * 1.03 * 850, 3);
    expect(bom.totals.total).toBeCloseTo(bom.totals.steelCost + bom.totals.fastenerCost, 6);
  });

  it("cut list quantities add up and piece marks are unique", () => {
    expect(bom.cutList.reduce((s, c) => s + c.qty, 0)).toBe(bom.totals.pieces);
    expect(new Set(bom.cutList.map((c) => c.pieceMark)).size).toBe(bom.cutList.length);
  });

  it("identical trusses collapse into one assembly line", () => {
    const t1 = bom.assemblies.find((a) => a.mark === "T1")!;
    expect(t1.qty).toBe(house.trussPositions.length);
    // and their pieces into shared cut lines (qty is a multiple of the truss count)
    for (const c of bom.cutList.filter((x) => x.assemblyMark === "T1")) expect(c.qty % house.trussPositions.length).toBe(0);
  });

  it("operations string is order-independent", () => {
    const a = operationsString([
      { kind: "dimple", position: 20, offset: 15, diameter: 5 },
      { kind: "swage", position: 0, length: 45 },
    ]);
    const b = operationsString([
      { kind: "swage", position: 0, length: 45 },
      { kind: "dimple", position: 20, offset: 15, diameter: 5 },
    ]);
    expect(a).toBe(b);
    expect(a).toBe("SWAGE@0+45 DIMPLE@20/15");
  });
});

describe("roof loads", () => {
  it("node loads add up to q × spacing × (span + 2 overhangs on plan)", () => {
    const t = house.truss;
    const q = 1.5;
    const loads = roofNodeLoads(t, q, 600);
    const plan = t.input.span / 1000 + 2 * (t.input.overhang / 1000) * Math.cos((25 * Math.PI) / 180);
    expect(-loads.reduce((s, l) => s + l.fy, 0)).toBeCloseTo(q * 0.6 * plan * 1000, 6);
    const sol = solveTruss(t, loads);
    const ry = [...sol.reactions.values()].reduce((s, r) => s + r.ry, 0);
    expect(ry).toBeCloseTo(q * 0.6 * plan * 1000, 6);
  });

  it("gravity puts the top chord in compression and the bottom chord in tension", () => {
    const { byRole } = forceSummary(house.truss, roofNodeLoads(house.truss, 1, 600));
    const top = byRole.find((r) => r.role === "top-chord")!;
    const bottom = byRole.find((r) => r.role === "bottom-chord")!;
    expect(top.maxCompression).toBeGreaterThan(0);
    expect(bottom.maxTension).toBeGreaterThan(0);
    expect(bottom.maxCompression).toBeCloseTo(0, 6);
  });
});

describe("envelope quantities", () => {
  it("roof area = 2 × rafter (with eaves) × length", () => {
    const q = envelopeQuantities(house);
    const rafter = 4 / Math.cos((25 * Math.PI) / 180) + 0.45;
    expect(q.roofM2).toBeCloseTo(2 * rafter * 10, 6);
    expect(q.wallsM2).toBeCloseTo(2 * (10 + 8) * 2.7 - q.openingsM2, 6);
  });
});

describe("exports", () => {
  it("CSV: Excel-friendly, one row per cut line", () => {
    const csv = cutListCsv(bom);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv.trim().split("\r\n")).toHaveLength(bom.cutList.length + 1);
    expect(bomCsv(bom)).toMatch(/Сталь с отходом/);
  });

  it("DXF: parses, one drawing per mark, layers per role, 4 lines per member", () => {
    const dxf = assembliesDxf(house.assemblies);
    const parsed = new DxfParser().parseSync(dxf)!;
    const marks = new Set(house.assemblies.map((a) => a.mark));
    const uniqueMembers = [...new Map(house.assemblies.map((a) => [a.mark, a])).values()].reduce((s, a) => s + a.members.length, 0);
    const lines = parsed.entities.filter((e) => e.type === "LINE");
    expect(lines).toHaveLength(uniqueMembers * 4);
    const texts = parsed.entities.filter((e) => e.type === "TEXT");
    expect(texts).toHaveLength(marks.size * 2);
    expect(Object.keys(parsed.tables.layer.layers)).toEqual(expect.arrayContaining(["stud", "track", "top-chord", "truss-web", "TEXT"]));
    // Truss webs are in the drawing plane: dimples drawn as circles
    expect(parsed.entities.some((e) => e.type === "CIRCLE")).toBe(true);
  });
});
