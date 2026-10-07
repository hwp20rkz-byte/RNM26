import { describe, expect, it } from "vitest";
import { v3 } from "../geometry/vec";
import { connectionHoles, serviceHoles, thermalSlots } from "../members/punching";
import type { Member } from "../members/types";
import { C89_THICKNESSES, PROFILE_CATALOG, findProfile } from "../profiles/catalog";
import type { CSpec } from "../profiles/types";
import { memberOnMachine, profileOnMachine } from "./check";
import { GOLDEN_INTEGRITY_C89 as GI } from "./golden-integrity-c89";
import { known, type Spec } from "./types";

describe("Golden Integrity C89 — data transcribed from the offer", () => {
  it("profile and material match the PDF (pp. 2, 4)", () => {
    expect([GI.profile.web.value, GI.profile.flange.value, GI.profile.lip.value]).toEqual([89, 41, 11]);
    expect(GI.thickness.value).toEqual({ min: 0.75, max: 1.2 });
    expect(GI.coilWidth.value).toEqual({ min: 179, max: 182 });
    expect(GI.lengthAccuracy.value).toBe(0.5);
  });

  it("unknowns are explicit, not guessed", () => {
    const unknowns: Spec<unknown>[] = [GI.profile.innerRadius, GI.coating, GI.partLength, GI.inputFormat];
    for (const spec of unknowns) {
      expect(known(spec)).toBe(false);
    }
    // No tool comes with dimensions in the offer
    expect(GI.tools.every((t) => !known(t.size))).toBe(true);
  });

  it("every known value cites a page of the offer", () => {
    const specs: Spec<unknown>[] = [GI.profile.web, GI.profile.flange, GI.profile.lip, GI.thickness, GI.steelGrade, GI.coilWidth, GI.lengthAccuracy, GI.speed, GI.control, GI.designSoftware];
    for (const s of specs) {
      expect(known(s)).toBe(true);
      if (known(s)) expect(s.source).toMatch(/КП Golden Integrity LGS C89, с\. \d/);
    }
  });
});

describe("profileOnMachine", () => {
  it("catalogue C89 sizes are on the line, in its thickness range", () => {
    for (const t of C89_THICKNESSES) {
      const p = findProfile(`C89x41x11x${t}`);
      expect(p.machineId).toBe(GI.id);
      expect(profileOnMachine(p, GI).filter((i) => i.level === "error")).toEqual([]);
    }
  });

  it("flags the offer's own inconsistency: 89×41×11 does not fit a 179–182 mm strip", () => {
    // Even the thickest gauge with a generous radius develops wider than 182 mm
    const issues = profileOnMachine(findProfile("C89x41x11x1.2"), GI);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.level).toBe("warning");
    expect(issues[0]!.text).toMatch(/развёртка 18\d,\d мм не попадает в штрипс 179–182/);
  });

  it("rejects other sizes and thicknesses", () => {
    expect(profileOnMachine(findProfile("C150x50x13x1.5"), GI).some((i) => i.level === "error")).toBe(true);
    expect(profileOnMachine(findProfile("U152x40x1.2"), GI)[0]!.text).toMatch(/только C/);
    const thick: CSpec = { ...(findProfile("C89x41x11x1.2") as CSpec), thickness: 1.5 };
    expect(profileOnMachine(thick, GI).map((i) => i.text)).toEqual([expect.stringMatching(/вне диапазона линии 0,75–1,2/)]);
  });

  it("only the C89 entries in the catalogue are tied to the line", () => {
    expect(PROFILE_CATALOG.filter((p) => p.machineId === GI.id).map((p) => p.id)).toEqual(C89_THICKNESSES.map((t) => `C89x41x11x${t}`));
  });
});

describe("memberOnMachine", () => {
  const stud = (features: Member["features"]): Member => ({
    id: "s",
    role: "stud",
    profile: findProfile("C89x41x11x0.95"),
    start: v3(0, 0, 0),
    end: v3(0, 2700, 0),
    webAxis: v3(0, 0, 1),
    features,
  });

  it("service holes and dimples are tools of this line", () => {
    const p = findProfile("C89x41x11x0.95");
    const errors = memberOnMachine(stud([...serviceHoles(2700, p, { spacing: 600, endClearance: 300, width: 40, height: 20 }), ...connectionHoles(2700, [0, 2700])]), GI);
    expect(errors.filter((i) => i.level === "error")).toEqual([]);
  });

  it("thermal slots are not: the line has no slotting station", () => {
    const p = findProfile("C150x50x13x1.5");
    const issues = memberOnMachine({ ...stud(thermalSlots(2700, p)), profile: findProfile("C89x41x11x0.95") }, GI);
    expect(issues.some((i) => /термопрорези: такого инструмента у линии нет/.test(i.text))).toBe(true);
  });
});
