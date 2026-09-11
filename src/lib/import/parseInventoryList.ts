import ExcelJS from "exceljs";
import type { SparePartCategory } from "@/lib/calculator/types";

export interface ParsedInventoryRow {
  name: string;
  unit: string;
  category: SparePartCategory;
  quantityOnHand: number;
  minThreshold: number;
  avgUnitPrice: number;
}

export interface ParseInventoryListResult {
  rows: ParsedInventoryRow[];
  skipped: number;
  headerMap: Record<string, string>;
}

const NAME_KEYS = ["наименование", "название", "материал", "позиция", "товар", "name", "item"];
const UNIT_KEYS = ["ед.изм", "ед. изм", "единица", "ед", "unit", "uom"];
const QTY_KEYS = ["остаток", "кол-во", "количество", "qty", "quantity", "кол"];
const PRICE_KEYS = ["цена", "стоимость", "price", "cost", "тариф"];
const THRESHOLD_KEYS = ["неснижаемый", "мин. запас", "минимум", "threshold", "min"];
const CATEGORY_KEYS = ["категория", "тип", "category", "type"];

function normalizeHeader(h: string): string {
  return h.toLowerCase().trim().replace(/[.,]/g, "");
}

function matchColumn(headers: string[], keys: string[]): number {
  const normalized = headers.map(normalizeHeader);
  for (const key of keys) {
    const idx = normalized.findIndex((h) => h.includes(key));
    if (idx !== -1) return idx;
  }
  return -1;
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/\s/g, "").replace(",", ".").replace(/[^\d.-]/g, "");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function normalizeCategory(raw: string): SparePartCategory {
  const v = raw.toLowerCase();
  if (/электр/.test(v)) return "electrical";
  if (/инструмент/.test(v)) return "tool";
  if (/сантех|труб|кран|фитинг/.test(v)) return "sanitary";
  return "consumable";
}

function rowsToResult(headers: string[], dataRows: unknown[][]): ParseInventoryListResult {
  const nameIdx = matchColumn(headers, NAME_KEYS);
  const unitIdx = matchColumn(headers, UNIT_KEYS);
  const qtyIdx = matchColumn(headers, QTY_KEYS);
  const priceIdx = matchColumn(headers, PRICE_KEYS);
  const thresholdIdx = matchColumn(headers, THRESHOLD_KEYS);
  const categoryIdx = matchColumn(headers, CATEGORY_KEYS);

  const rows: ParsedInventoryRow[] = [];
  let skipped = 0;

  for (const r of dataRows) {
    const name = nameIdx >= 0 ? String(r[nameIdx] ?? "").trim() : "";
    if (!name) {
      skipped += 1;
      continue;
    }
    rows.push({
      name,
      unit: unitIdx >= 0 ? String(r[unitIdx] ?? "шт.").trim() || "шт." : "шт.",
      category: categoryIdx >= 0 ? normalizeCategory(String(r[categoryIdx] ?? "")) : "consumable",
      quantityOnHand: qtyIdx >= 0 ? toNumber(r[qtyIdx]) : 0,
      minThreshold: thresholdIdx >= 0 ? toNumber(r[thresholdIdx]) : 1,
      avgUnitPrice: priceIdx >= 0 ? toNumber(r[priceIdx]) : 0,
    });
  }

  return {
    rows,
    skipped,
    headerMap: {
      name: nameIdx >= 0 ? headers[nameIdx] : "не найдено",
      unit: unitIdx >= 0 ? headers[unitIdx] : "не найдено (по умолчанию «шт.»)",
      quantity: qtyIdx >= 0 ? headers[qtyIdx] : "не найдено (по умолчанию 0)",
      price: priceIdx >= 0 ? headers[priceIdx] : "не найдено (по умолчанию 0)",
    },
  };
}

function parseCsv(text: string): { headers: string[]; rows: unknown[][] } {
  const delimiter = text.split("\n")[0].includes(";") ? ";" : ",";
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const parseLine = (line: string): string[] => {
    const cells: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === delimiter && !inQuotes) {
        cells.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur);
    return cells.map((c) => c.trim());
  };
  const [headerLine, ...rest] = lines;
  return { headers: parseLine(headerLine), rows: rest.map(parseLine) };
}

async function parseXlsx(buffer: ArrayBuffer): Promise<{ headers: string[]; rows: unknown[][] }> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  const all: unknown[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const values = (row.values as unknown[]).slice(1);
    all.push(values.map((v) => (v && typeof v === "object" && "text" in v ? (v as { text: string }).text : v)));
  });
  const [headers, ...rows] = all;
  return { headers: (headers ?? []).map((h) => String(h ?? "")), rows };
}

export async function parseInventoryListFile(file: File): Promise<ParseInventoryListResult> {
  const isCsv = file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";
  if (isCsv) {
    const text = await file.text();
    const { headers, rows } = parseCsv(text);
    return rowsToResult(headers, rows);
  }
  const buffer = await file.arrayBuffer();
  const { headers, rows } = await parseXlsx(buffer);
  return rowsToResult(headers, rows);
}
