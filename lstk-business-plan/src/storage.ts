import { DEFAULT_INPUTS } from "./model/defaults";
import type { PlanInputs } from "./model/types";

const KEY = "lstk-business-plan:v1";

/**
 * Проверка формы, а не полная валидация: отсекает чужой/битый JSON и
 * дополняет отсутствующие поля значениями по умолчанию (старые сохранения
 * продолжают открываться после добавления новых параметров).
 */
export function parseInputs(raw: unknown): PlanInputs | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<PlanInputs>;
  const arrays = [r.houses, r.costItems, r.capex, r.opex];
  if (!arrays.every(Array.isArray)) return null;
  const d = DEFAULT_INPUTS;
  return {
    houses: r.houses!,
    costItems: r.costItems!,
    capex: r.capex!,
    opex: r.opex!,
    frame: { ...d.frame, ...r.frame },
    sales: {
      ...d.sales,
      ...r.sales,
      seasonality: Array.isArray(r.sales?.seasonality) && r.sales.seasonality.length === 12 ? r.sales.seasonality : d.sales.seasonality
    },
    payments: { ...d.payments, ...r.payments },
    finance: { ...d.finance, ...r.finance }
  };
}

export function loadSaved(): PlanInputs | null {
  try {
    const s = window.localStorage.getItem(KEY);
    return s ? parseInputs(JSON.parse(s)) : null;
  } catch {
    return null;
  }
}

export function save(inputs: PlanInputs): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(inputs));
  } catch {
    /* приватный режим / заблокированное хранилище — автосохранение просто не работает */
  }
}

export function download(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
