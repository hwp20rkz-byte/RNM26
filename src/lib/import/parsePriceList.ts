import ExcelJS from "exceljs";

export interface ParsedPriceRow {
  name: string;
  unit: string;
  unitPrice: number;
  defaultQty: number;
}

export interface ParsePriceListResult {
  rows: ParsedPriceRow[];
  skipped: number;
  headerMap: Record<string, string>;
}

const NAME_KEYS = ["наименование", "название", "материал", "позиция", "товар", "name", "item"];
const UNIT_KEYS = ["ед.изм", "ед. изм", "единица", "ед", "unit", "uom"];
const QTY_KEYS = ["кол-во", "количество", "qty", "quantity", "кол"];
const PRICE_KEYS = ["цена", "стоимость", "price", "cost", "тариф"];

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

function rowsToResult(headers: string[], dataRows: unknown[][]): ParsePriceListResult {
  const nameIdx = matchColumn(headers, NAME_KEYS);
  const unitIdx = matchColumn(headers, UNIT_KEYS);
  const qtyIdx = matchColumn(headers, QTY_KEYS);
  const priceIdx = matchColumn(headers, PRICE_KEYS);

  const rows: ParsedPriceRow[] = [];
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
      unitPrice: priceIdx >= 0 ? toNumber(r[priceIdx]) : 0,
      defaultQty: qtyIdx >= 0 ? toNumber(r[qtyIdx]) || 1 : 1,
    });
  }

  return {
    rows,
    skipped,
    headerMap: {
      name: nameIdx >= 0 ? headers[nameIdx] : "не найдено",
      unit: unitIdx >= 0 ? headers[unitIdx] : "не найдено (по умолчанию «шт.»)",
      qty: qtyIdx >= 0 ? headers[qtyIdx] : "не найдено (по умолчанию 1)",
      price: priceIdx >= 0 ? headers[priceIdx] : "не найдено (по умолчанию 0)",
    },
  };
}

function parseCsv(text: string): { headers: string[]; rows: unknown[][] } {
  const delimiter = text.includes(";") && !text.includes(",") ? ";" : text.split("\n")[0].includes(";") ? ";" : ",";
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
    const values = (row.values as unknown[]).slice(1); // exceljs 1-indexes; drop the leading empty slot
    all.push(values.map((v) => (v && typeof v === "object" && "text" in v ? (v as { text: string }).text : v)));
  });
  const [headers, ...rows] = all;
  return { headers: (headers ?? []).map((h) => String(h ?? "")), rows };
}

export async function parsePriceListFile(file: File): Promise<ParsePriceListResult> {
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
