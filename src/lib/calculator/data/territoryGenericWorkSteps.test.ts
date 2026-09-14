import { describe, expect, it } from "vitest";
import { DEFAULT_GENERIC_WORK_STEPS, GENERIC_WORK_STEPS_BY_CATEGORY, genericWorkStepsForCategory } from "./territoryGenericWorkSteps";

describe("genericWorkStepsForCategory", () => {
  it("returns a non-empty list for a category with an explicit override", () => {
    expect(genericWorkStepsForCategory("maf_repair_wood").length).toBeGreaterThan(0);
  });

  it("returns the default fallback for a category without an explicit override", () => {
    expect(genericWorkStepsForCategory("other")).toBe(DEFAULT_GENERIC_WORK_STEPS);
  });

  it("returns different content for different mapped categories", () => {
    expect(genericWorkStepsForCategory("waste_site_service")).not.toEqual(genericWorkStepsForCategory("pavement_repair_asphalt"));
  });

  it("never returns an empty list, for any known category", () => {
    const categories: (keyof typeof GENERIC_WORK_STEPS_BY_CATEGORY | "other" | "snow_removal")[] = [
      "maf_repair_wood",
      "maf_repair_metal",
      "playground_surface",
      "waste_site_service",
      "pavement_repair_asphalt",
      "pavement_repair_tile",
      "other",
      "snow_removal",
    ];
    for (const category of categories) {
      expect(genericWorkStepsForCategory(category).length).toBeGreaterThan(0);
    }
  });
});
