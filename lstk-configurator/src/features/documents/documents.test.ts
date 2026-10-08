import ExcelJS from "exceljs";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { productInput } from "@/domain/catalog/products";
import { analyze, DEFAULT_SETTINGS } from "@/domain/planner/analyze";
import { tryTranslate } from "@/i18n";
import { Album, albumSheets } from "./album/Album";
import { estimateCsv, estimateHtml, estimateXlsx, type DocMeta } from "./exportEstimate";

const prices = { steelPerKg: 850, scrapPct: 3, fastenerEach: 15, boltEach: 400 };
const dyn = (k: string) => tryTranslate("ru", k);
const meta: DocMeta = { title: "Дом", city: "Астана", date: "01.01.2026", size: "10 × 8 × 5", lang: "ru", dyn };
const a = analyze(productInput("house2"), DEFAULT_SETTINGS, prices);

describe("estimate exports", () => {
  it("CSV: one row per line and section, totals at the end, no missing labels", () => {
    const csv = estimateCsv(a, meta);
    const rows = csv.split("\r\n");
    const lines = a.estimate.sections.reduce((s, x) => s + x.lines.length + 1, 0);
    expect(rows.length).toBe(1 + lines + 6);
    expect(csv).not.toMatch(/(^|;)(est|estsec|eu|cost)\./m);
  });
  it("XLSX: formulas recompute the grand total", async () => {
    const blob = await estimateXlsx(a, meta);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await blob.arrayBuffer());
    const ws = wb.worksheets[0]!;
    let amountFormulas = 0;
    ws.eachRow((row) => {
      const v = row.getCell(9).value as { formula?: string } | null;
      if (v && typeof v === "object" && v.formula) amountFormulas++;
    });
    expect(amountFormulas).toBeGreaterThan(50);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Смета", "Раскрой", "Узлы и метизы", "Расчёт"]);
  });
  it("HTML for Word / PDF carries every section", () => {
    const html = estimateHtml(a, meta, "ru-RU");
    for (const s of a.estimate.sections) expect(html).toContain(dyn(`estsec.${s.id}`));
  });
});

describe("drawing album", () => {
  it("has general data, both plans, facades, section, schemes, every panel and truss, spec and nodes", () => {
    const sheets = albumSheets(a, dyn);
    const marks = new Set(a.building.assemblies.map((x) => x.mark));
    expect(sheets.length).toBe(1 + 2 + 1 + 1 + 3 + marks.size + 2);
    const html = renderToStaticMarkup(
      createElement(Album, {
        a,
        d: dyn,
        meta: { code: "X", object: "Y", org: "", stage: "П", developer: "", date: "", labels: { developer: "Разраб.", checked: "", nControl: "", gip: "", stage: "", sheet: "", sheets: "", change: "", qty: "", doc: "", sign: "", dateL: "" } },
      }),
    );
    expect((html.match(/class="album-sheet"/g) ?? []).length).toBe(sheets.length);
    expect(html).not.toContain("NaN");
  });
});
