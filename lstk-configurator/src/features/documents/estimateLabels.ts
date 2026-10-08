import type { EstUnit } from "@/domain/estimate/estimate";

type Dyn = (key: string) => string;

/** Human label of an estimate line id (some ids carry a parameter after ":") */
export function estLabel(id: string, dyn: Dyn): string {
  const [head, arg] = id.split(":");
  if (head === "steel") return `${dyn("est.steel")} ${arg}`;
  if (head!.startsWith("finish.")) return dyn(head!);
  if (head!.startsWith("hw.")) return dyn(`cost.${head}`);
  if (head!.startsWith("vehicle.")) return `${dyn("est.transport")}: ${dyn(head!)}`;
  if (head!.startsWith("ext.")) return dyn(`layer.${head}`);
  return dyn(`est.${head}`);
}

export const unitLabel = (u: EstUnit, dyn: Dyn) => dyn(`eu.${u}`);
