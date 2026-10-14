import { describe, expect, it } from "vitest";
import { PRODUCTS } from "../catalog/products";
import { signPreset } from "../signage/sign";
import { useConfigurator } from "@/store/configurator";
import { CLUB_FINISHES, THEMES } from "./theme";

describe("club design themes", () => {
  const sport = PRODUCTS.filter((p) => p.category === "sport").map((p) => p.id);

  it("every sports club has a theme and its sign wears the brand colours", () => {
    for (const id of sport) {
      expect(THEMES[id], id).toBeDefined();
      const s = signPreset(id);
      expect(s.background).toBe(THEMES[id]!.accent);
      expect(s.color).toBe(THEMES[id]!.letters);
    }
  });

  it("picking a club dresses it: European facade, sign, site; a house keeps its finishes", () => {
    const st = useConfigurator.getState();
    st.applyProduct("fitness");
    let p = useConfigurator.getState().planner;
    expect(p.finishes.facade).toBe(CLUB_FINISHES.facade);
    expect(p.sign.enabled).toBe(true);
    expect(p.site.enabled).toBe(true);
    st.reset();
    st.applyProduct("house");
    p = useConfigurator.getState().planner;
    expect(p.finishes.facade).not.toBe(CLUB_FINISHES.facade);
  });
});
