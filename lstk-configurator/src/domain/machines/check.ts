import { centrelineLength } from "../members/member";
import type { Member } from "../members/types";
import { sectionProperties } from "../profiles/section";
import type { ProfileSpec } from "../profiles/types";
import { known, type RollFormingMachine } from "./types";

export interface MachineIssue {
  level: "error" | "warning";
  text: string;
}

const close = (a: number, b: number) => Math.abs(a - b) < 1e-6;
const mm = (v: number) => v.toLocaleString("ru-RU", { maximumFractionDigits: 2 });

const FEATURE_LABEL: Record<Member["features"][number]["kind"], string> = {
  "service-hole": "сервисные отверстия",
  dimple: "димплы",
  "bolt-hole": "болтовые отверстия",
  "web-slot": "термопрорези",
  "lip-cut": "подрезка отгиба",
  "flange-cut": "подрезка полки",
};

/** Can this line roll this profile at all (section family, dimensions, thickness)? */
export function profileOnMachine(profile: ProfileSpec, machine: RollFormingMachine): MachineIssue[] {
  const p = machine.profile;
  const issues: MachineIssue[] = [];
  if (profile.family !== p.family) {
    return [{ level: "error", text: `Линия ${machine.model} катает только ${p.family}-профиль` }];
  }
  const dims: [string, number, (typeof p)["web"]][] = [
    ["стенка", profile.web, p.web],
    ["полка", profile.flange, p.flange],
    ["отгиб", profile.lip, p.lip],
  ];
  for (const [name, v, spec] of dims) {
    if (known(spec) && !close(v, spec.value)) issues.push({ level: "error", text: `${name} ${mm(v)} мм — оснастка линии даёт ${mm(spec.value)} мм` });
  }
  if (known(machine.thickness)) {
    const { min, max } = machine.thickness.value;
    if (profile.thickness < min - 1e-9 || profile.thickness > max + 1e-9) {
      issues.push({ level: "error", text: `толщина ${mm(profile.thickness)} мм вне диапазона линии ${mm(min)}–${mm(max)} мм` });
    }
  }
  if (issues.length > 0) return issues;

  // Consistency of the vendor's own data: developed width must fit the coil they specify
  if (known(machine.coilWidth)) {
    const { min, max } = machine.coilWidth.value;
    const w = sectionProperties(profile).developedWidth;
    if (w < min - 0.5 || w > max + 0.5) {
      issues.push({
        level: "warning",
        text: `развёртка ${w.toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} мм не попадает в штрипс ${mm(min)}–${mm(max)} мм из КП: размеры профиля или радиус гиба в КП неполные — масса и раскрой приблизительны`,
      });
    }
  }
  return issues;
}

/** Everything that stops a member from being made on this line */
export function memberOnMachine(member: Member, machine: RollFormingMachine): MachineIssue[] {
  const issues = profileOnMachine(member.profile, machine);
  const supported = new Set(machine.tools.map((t) => t.feature).filter((f) => f !== null));
  const missing = new Set(member.features.filter((f) => !supported.has(f.kind)).map((f) => f.kind));
  for (const kind of missing) issues.push({ level: "error", text: `${FEATURE_LABEL[kind]}: такого инструмента у линии нет` });
  if (known(machine.partLength)) {
    const { min, max } = machine.partLength.value;
    const l = centrelineLength(member);
    if (l < min || l > max) issues.push({ level: "error", text: `длина ${mm(l)} мм вне диапазона линии ${mm(min)}–${mm(max)} мм` });
  }
  return issues;
}
