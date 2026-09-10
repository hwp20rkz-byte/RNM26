import ExcelJS from "exceljs";
import type { UnitType } from "@/lib/calculator/types";

export interface ParsedOwnerRow {
  unitType: UnitType;
  number: string;
  entrance?: number;
  floor?: number;
  area: number;
  ownerName: string;
  ownerIin?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  documentRef?: string;
}

export interface ParseOwnersListResult {
  rows: ParsedOwnerRow[];
  skipped: number;
  headerMap: Record<string, string>;
}

const TYPE_KEYS = ["тип помещения", "тип", "type"];
const NUMBER_KEYS = ["№ квартиры/помещения", "№ помещения", "№ квартиры", "квартира", "помещение", "номер", "№", "number", "unit"];
const ENTRANCE_KEYS = ["подъезд", "entrance"];
const FLOOR_KEYS = ["этаж", "floor"];
const AREA_KEYS = ["площадь", "площадь, м2", "площадь, м²", "area", "s, м2"];
const NAME_KEYS = ["фио собственника", "фио", "собственник", "владелец", "owner", "name"];
const IIN_KEYS = ["иин", "iin"];
const PHONE_KEYS = ["телефон", "тел.", "тел", "phone"];
const EMAIL_KEYS = ["email", "e-mail", "почта"];
const DOC_KEYS = ["документ", "правоустанавливающий документ", "свидетельство", "document"];

// ЕРЦ-ведомости обычно используют текстовые пометки типа помещения —
// сопоставляем гибко, по умолчанию считаем «квартира» (самый частый случай).
function normalizeUnitType(raw: string): UnitType {
  const v = raw.toLowerCase();
  if (/кладов/.test(v)) return "storage";
  if (/машиномест|парков|паркинг/.test(v)) return "parking";
  if (/нежил|офис|коммерч/.test(v)) return "commercial";
  return "apartment";
}

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

function toText(v: unknown): string {
  return v === undefined || v === null ? "" : String(v).trim();
}

function rowsToResult(headers: string[], dataRows: unknown[][]): ParseOwnersListResult {
  const typeIdx = matchColumn(headers, TYPE_KEYS);
  const numberIdx = matchColumn(headers, NUMBER_KEYS);
  const entranceIdx = matchColumn(headers, ENTRANCE_KEYS);
  const floorIdx = matchColumn(headers, FLOOR_KEYS);
  const areaIdx = matchColumn(headers, AREA_KEYS);
  const nameIdx = matchColumn(headers, NAME_KEYS);
  const iinIdx = matchColumn(headers, IIN_KEYS);
  const phoneIdx = matchColumn(headers, PHONE_KEYS);
  const emailIdx = matchColumn(headers, EMAIL_KEYS);
  const docIdx = matchColumn(headers, DOC_KEYS);

  const rows: ParsedOwnerRow[] = [];
  let skipped = 0;

  for (const r of dataRows) {
    const number = numberIdx >= 0 ? toText(r[numberIdx]) : "";
    const area = areaIdx >= 0 ? toNumber(r[areaIdx]) : 0;
    if (!number || area <= 0) {
      skipped += 1;
      continue;
    }
    rows.push({
      unitType: typeIdx >= 0 ? normalizeUnitType(toText(r[typeIdx])) : "apartment",
      number,
      entrance: entranceIdx >= 0 ? toNumber(r[entranceIdx]) || undefined : undefined,
      floor: floorIdx >= 0 ? toNumber(r[floorIdx]) || undefined : undefined,
      area,
      ownerName: nameIdx >= 0 ? toText(r[nameIdx]) : "",
      ownerIin: iinIdx >= 0 ? toText(r[iinIdx]) || undefined : undefined,
      ownerPhone: phoneIdx >= 0 ? toText(r[phoneIdx]) || undefined : undefined,
      ownerEmail: emailIdx >= 0 ? toText(r[emailIdx]) || undefined : undefined,
      documentRef: docIdx >= 0 ? toText(r[docIdx]) || undefined : undefined,
    });
  }

  return {
    rows,
    skipped,
    headerMap: {
      unitType: typeIdx >= 0 ? headers[typeIdx] : "не найдено (по умолчанию «квартира»)",
      number: numberIdx >= 0 ? headers[numberIdx] : "не найдено",
      area: areaIdx >= 0 ? headers[areaIdx] : "не найдено",
      ownerName: nameIdx >= 0 ? headers[nameIdx] : "не найдено",
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

export async function parseOwnersListFile(file: File): Promise<ParseOwnersListResult> {
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
