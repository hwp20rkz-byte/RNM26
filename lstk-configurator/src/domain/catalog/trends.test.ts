import { describe, expect, it } from "vitest";
import { PRODUCTS, productInput } from "./products";
import { analyze, DEFAULT_SETTINGS } from "../planner/analyze";
import { productPlant } from "../energy/autonomy";
import { hallKit } from "../interior/fitout";
import { buildScene } from "@/features/configurator/buildScene";
import { DEFAULT_PROJECT, useConfigurator } from "@/store/configurator";

const prices = { steelPerKg: 850, scrapPct: 3, fastenerEach: 15, boltEach: 400 };
const TREND = PRODUCTS.filter((p) => p.trend);

describe("trend library 2025–2027", () => {
  it("adds tourism and business products and three new sports, each tagged with its year", () => {
    expect(TREND.length).toBeGreaterThanOrEqual(11);
    for (const p of TREND) expect(p.trend!).toBeGreaterThanOrEqual(2025);
    expect(PRODUCTS.filter((p) => p.category === "tourism").map((p) => p.id)).toEqual(["capsule", "minsu"]);
    expect(PRODUCTS.filter((p) => p.category === "business")).toHaveLength(7);
    for (const id of ["pilates", "golfsim", "boulder"]) expect(PRODUCTS.find((p) => p.id === id)!.category).toBe("sport");
  });

  it.each(PRODUCTS.filter((p) => p.category === "business" || p.category === "tourism" || p.trend).map((p) => p.id))("%s: clean detailing and every check passes", (id) => {
    const a = analyze(productInput(id), DEFAULT_SETTINGS, prices);
    expect(a.building.assemblies.flatMap((x) => x.detailIssues ?? [])).toEqual([]);
    expect(a.design.worst).toBeLessThan(0.95);
  });

  it("the solar charging hub comes with its PV canopy, battery and chargers, and still passes", () => {
    const plant = productPlant("evhub")!;
    expect(plant.pv && plant.battery).toBe(true);
    const a = analyze(productInput("evhub"), { ...DEFAULT_SETTINGS, autonomy: plant }, prices);
    expect(a.autonomy.pv!.kwp).toBeGreaterThan(5);
    expect(a.autonomy.ev!.dc).toBe(3);
    expect(a.design.worst).toBeLessThan(1);
    useConfigurator.getState().applyProduct("evhub");
    expect(useConfigurator.getState().planner.autonomy.pv).toBe(true);
    expect(useConfigurator.getState().planner.sign.place).toBe("pylon");
    useConfigurator.getState().reset();
  });

  it("a business starts dressed with its sign and the plot; a guest house keeps its own finishes", () => {
    const st = useConfigurator.getState();
    st.applyProduct("coffee");
    let p = useConfigurator.getState().planner;
    expect(p.sign.enabled).toBe(true);
    expect(p.sign.text).toBe("COFFEE TO GO");
    expect(p.site.enabled).toBe(true);
    st.reset();
    st.applyProduct("evhub");
    st.applyProduct("minsu");
    p = useConfigurator.getState().planner;
    expect(p.finishes.facade).toBe("plaster");
    // The hub's PV plant and its pylon do not follow into the guest house
    expect(p.autonomy.pv).toBe(false);
    expect(p.sign.text).toBe("MINSU");
    st.applyProduct("house");
    expect(useConfigurator.getState().planner.sign.enabled).toBe(false);
    st.reset();
  });

  it("kits the new halls: reformers, simulator bays, climbing wall and mats", () => {
    expect(hallKit("pilates", 12900, 8800).reformer).toBe(12);
    expect(hallKit("golfsim", 15400, 8800).golfBay).toBe(3);
    const b = hallKit("boulder", 17900, 11800);
    expect(b.climbWall).toBeGreaterThan(80);
    expect(b.crashMat).toBeGreaterThan(50);
  });

  it.each(["evhub", "carwash", "warehouse", "esports", "pvz", "coffee", "minsu"])("%s: the 3D fit-out is drawn", (id) => {
    const s = buildScene({ ...structuredClone(DEFAULT_PROJECT), mode: "building", building: productInput(id) });
    const c = s.object.getObjectByName("commerce")!;
    expect(c).toBeDefined();
    let meshes = 0;
    c.traverse((o) => {
      if ((o as { isMesh?: boolean }).isMesh) meshes++;
    });
    expect(meshes).toBeGreaterThan(5);
  });
});
