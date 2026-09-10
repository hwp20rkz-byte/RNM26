import type { CalculatorDatabase, CatalogEntry } from "./types";
import { genId } from "@/lib/id";

/** Превращает все атомарные статьи базы (обычно эталонной ЖК «Коркем-1») в записи справочника. */
export function seedCatalogFromDatabase(db: CalculatorDatabase): CatalogEntry[] {
  const now = new Date().toISOString();
  const seen = new Set<string>();
  const entries: CatalogEntry[] = [];

  for (const it of db.items) {
    const key = `${it.name}__${it.unit}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({
      id: genId("cat"),
      name: it.name,
      unit: it.unit,
      unitPrice: it.unitPrice,
      defaultQty: it.annualQty,
      suggestedCategoryId: it.categoryId,
      tooltip: it.tooltip,
      source: it.source,
      createdAt: now,
      updatedAt: now,
    });
  }

  for (const p of db.payroll) {
    const key = `${p.role}__мес.`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({
      id: genId("cat"),
      name: p.role,
      unit: "мес.",
      unitPrice: p.monthlySalaryOrContract,
      defaultQty: 12,
      suggestedCategoryId: p.categoryId,
      tag: p.mode === "staff" ? "Персонал (штат)" : "Персонал (аутсорс)",
      tooltip: p.tooltip,
      source: p.source,
      createdAt: now,
      updatedAt: now,
    });
  }

  return entries;
}
