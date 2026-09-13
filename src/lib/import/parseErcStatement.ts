import ExcelJS from "exceljs";

/**
 * Разбор сальдовой ведомости Астана ЕРЦ (форма №215) — двухстрочный формат
 * на лицевой счёт (ЛС): одна строка «ТО лифтов», одна «Эксплуатационные
 * расходы КСК». Формат жёстко фиксирован Астана ЕРЦ (13 колонок, заголовок
 * с точным текстом), поэтому парсер сверяет заголовки точным совпадением,
 * а не эвристикой как parseOwnersList.ts — так надёжнее для машинно
 * сгенерированного отчёта и явно падает, если формат реально поменялся.
 */

export type ErcServiceKind = "elevator_maintenance" | "operational_expenses" | "other";

export interface ErcServiceBreakdown {
  serviceLabel: string;
  kind: ErcServiceKind;
  tariff: number;
  openingBalanceKzt: number;
  accrualKzt: number;
  paymentKzt: number;
  thirdPartyPaymentKzt: number;
  adjustmentKzt: number;
  closingBalanceKzt: number;
}

export interface ErcUnitStatement {
  personalAccount: string;
  address: string;
  unitNumber: string;
  area: number;
  services: ErcServiceBreakdown[];
  /** Сумма «Конечное сальдо» по всем услугам — положительное = должен, отрицательное = переплата */
  totalClosingBalanceKzt: number;
}

export interface ErcAddressSummary {
  address: string;
  unitCount: number;
  debtorCount: number;
  totalDebtKzt: number;
}

export interface ParseErcStatementResult {
  /** Расчётный месяц ведомости, напр. «08/2026» — «» если не распознан */
  period: string;
  /** Заголовок листа целиком — для отображения пользователю без потери контекста */
  periodLabel: string;
  serviceProvider: string;
  units: ErcUnitStatement[];
  addresses: ErcAddressSummary[];
  skippedRows: number;
  /** Метки услуг, не распознанные как «ТО лифтов»/«Эксплуатационные расходы» — их суммы учтены в totalClosingBalanceKzt, но не разбиты по выделенным полям */
  unknownServiceLabels: string[];
}

const DEBT_EPSILON = 0.5;

const HEADER_KEYS: Record<string, keyof HeaderIndex> = {
  фио: "fio",
  лс: "ls",
  адрес: "address",
  "№ кв": "unitNumber",
  площадь: "area",
  услуга: "service",
  тариф: "tariff",
  "начальное сальдо": "opening",
  начисление: "accrual",
  платеж: "payment",
  "платеж сторонний": "thirdParty",
  корректировки: "adjustment",
  "конечное сальдо": "closing",
};

interface HeaderIndex {
  fio: number;
  ls: number;
  address: number;
  unitNumber: number;
  area: number;
  service: number;
  tariff: number;
  opening: number;
  accrual: number;
  payment: number;
  thirdParty: number;
  adjustment: number;
  closing: number;
}

function normalizeHeader(h: unknown): string {
  return String(h ?? "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Ищет строку-заголовок среди первых 20 строк — устойчиво к вариациям числа строк в шапке (título/поставщик). */
function findHeaderRow(ws: ExcelJS.Worksheet): { rowNumber: number; index: HeaderIndex } | null {
  const maxScan = Math.min(20, ws.rowCount);
  for (let r = 1; r <= maxScan; r++) {
    const row = ws.getRow(r);
    const cells: string[] = [];
    for (let c = 1; c <= (row.cellCount || 13); c++) {
      cells.push(normalizeHeader(row.getCell(c).value));
    }
    const found: Partial<HeaderIndex> = {};
    for (let c = 0; c < cells.length; c++) {
      const key = HEADER_KEYS[cells[c]];
      if (key) found[key] = c + 1;
    }
    // Платеж и «Платеж сторонний» оба содержат «платеж» — точное совпадение
    // нормализованного текста (без подстрок) снимает эту неоднозначность.
    if (found.ls && found.address && found.service && found.closing) {
      return { rowNumber: r, index: found as HeaderIndex };
    }
  }
  return null;
}

function findPeriodAndProvider(ws: ExcelJS.Worksheet, headerRow: number): { period: string; periodLabel: string; serviceProvider: string } {
  let periodLabel = "";
  let period = "";
  let serviceProvider = "";
  for (let r = 1; r < headerRow; r++) {
    const text = String(ws.getRow(r).getCell(1).value ?? "").trim();
    if (!text) continue;
    if (!periodLabel && /ведомост/i.test(text)) {
      periodLabel = text;
      const m = text.match(/(\d{2}\/\d{4})/);
      if (m) period = m[1];
    }
    const providerMatch = text.match(/поставщик:\s*(.+)/i);
    if (providerMatch) serviceProvider = providerMatch[1].trim();
  }
  return { period, periodLabel, serviceProvider };
}

function classifyService(label: string): ErcServiceKind {
  const v = label.toLowerCase();
  if (v.includes("лифт")) return "elevator_maintenance";
  if (v.includes("эксплуатацион")) return "operational_expenses";
  return "other";
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && "result" in (v as object)) return toNumber((v as { result: unknown }).result);
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function toText(v: unknown): string {
  if (v && typeof v === "object" && "text" in (v as object)) return String((v as { text: unknown }).text ?? "").trim();
  return v === undefined || v === null ? "" : String(v).trim();
}

export async function parseErcStatementFile(file: File): Promise<ParseErcStatementResult> {
  const buffer = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) {
    return { period: "", periodLabel: "", serviceProvider: "", units: [], addresses: [], skippedRows: 0, unknownServiceLabels: [] };
  }

  const header = findHeaderRow(ws);
  if (!header) {
    return { period: "", periodLabel: "", serviceProvider: "", units: [], addresses: [], skippedRows: 0, unknownServiceLabels: [] };
  }
  const { period, periodLabel, serviceProvider } = findPeriodAndProvider(ws, header.rowNumber);
  const idx = header.index;

  const byLs = new Map<string, ErcUnitStatement>();
  const unknownServiceLabels = new Set<string>();
  let skippedRows = 0;

  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= header.rowNumber) return;
    const ls = toText(row.getCell(idx.ls).value);
    const address = toText(row.getCell(idx.address).value);
    const unitNumber = toText(row.getCell(idx.unitNumber).value);
    if (!ls || !address || !unitNumber) {
      skippedRows += 1;
      return;
    }
    const serviceLabel = toText(row.getCell(idx.service).value);
    const kind = classifyService(serviceLabel);
    if (kind === "other" && serviceLabel) unknownServiceLabels.add(serviceLabel);

    const breakdown: ErcServiceBreakdown = {
      serviceLabel,
      kind,
      tariff: toNumber(row.getCell(idx.tariff).value),
      openingBalanceKzt: toNumber(row.getCell(idx.opening).value),
      accrualKzt: toNumber(row.getCell(idx.accrual).value),
      paymentKzt: toNumber(row.getCell(idx.payment).value),
      thirdPartyPaymentKzt: toNumber(row.getCell(idx.thirdParty).value),
      adjustmentKzt: toNumber(row.getCell(idx.adjustment).value),
      closingBalanceKzt: toNumber(row.getCell(idx.closing).value),
    };

    let unit = byLs.get(ls);
    if (!unit) {
      unit = {
        personalAccount: ls,
        address,
        unitNumber,
        area: toNumber(row.getCell(idx.area).value),
        services: [],
        totalClosingBalanceKzt: 0,
      };
      byLs.set(ls, unit);
    }
    unit.services.push(breakdown);
    unit.totalClosingBalanceKzt = round2(unit.totalClosingBalanceKzt + breakdown.closingBalanceKzt);
  });

  const units = [...byLs.values()];

  const byAddress = new Map<string, ErcAddressSummary>();
  for (const u of units) {
    const s = byAddress.get(u.address) ?? { address: u.address, unitCount: 0, debtorCount: 0, totalDebtKzt: 0 };
    s.unitCount += 1;
    if (u.totalClosingBalanceKzt > DEBT_EPSILON) {
      s.debtorCount += 1;
      s.totalDebtKzt = round2(s.totalDebtKzt + u.totalClosingBalanceKzt);
    }
    byAddress.set(u.address, s);
  }

  return {
    period,
    periodLabel,
    serviceProvider,
    units,
    addresses: [...byAddress.values()].sort((a, b) => a.address.localeCompare(b.address, "ru")),
    skippedRows,
    unknownServiceLabels: [...unknownServiceLabels],
  };
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
