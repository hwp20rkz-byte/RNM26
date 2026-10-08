import type { Analysis } from "@/domain/planner/analyze";
import { estLabel, unitLabel } from "./estimateLabels";

/**
 * Estimate exports: Excel with live formulas (the client can change a price
 * and the totals follow), CSV for 1C / accounting, and a self-contained HTML
 * document used for Word (.doc), print and "Save as PDF".
 */

export interface DocMeta {
  title: string;
  city: string;
  date: string;
  size: string;
  lang: string;
  dyn: (k: string) => string;
}

const money = (v: number, locale: string) => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(v));
const qty = (v: number, locale: string) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(v);

export function estimateCsv(a: Analysis, m: DocMeta): string {
  const d = m.dyn;
  const rows: string[][] = [[d("doc.code"), d("doc.item"), d("doc.unit"), d("doc.qty"), d("doc.priceMat"), d("doc.priceLab"), d("doc.material"), d("doc.labour"), d("doc.amount")]];
  const n = (v: number) => (Math.round(v * 100) / 100).toString().replace(".", ",");
  for (const s of a.estimate.sections) {
    rows.push([s.code, d(`estsec.${s.id}`), "", "", "", "", n(s.material), n(s.labour), n(s.total)]);
    for (const l of s.lines) rows.push([l.code, estLabel(l.id, d), unitLabel(l.unit, d), n(l.qty), n(l.material), n(l.labour), n(l.qty * l.material), n(l.qty * l.labour), n(l.amount)]);
  }
  for (const [k, v] of totals(a, d)) rows.push(["", k, "", "", "", "", "", "", n(v)]);
  return "﻿" + rows.map((r) => r.map((c) => (/[;"\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(";")).join("\r\n");
}

function totals(a: Analysis, d: (k: string) => string): [string, number][] {
  const e = a.estimate;
  const o = e.options;
  const out: [string, number][] = [
    [d("doc.direct"), e.direct],
    [`${d("doc.overhead")} ${o.overheadPct}%`, e.overhead],
    [`${d("doc.contingency")} ${o.contingencyPct}%`, e.contingency],
    [d("doc.cost"), e.cost],
    [`${d("doc.margin")} ${o.marginPct}%`, e.margin],
  ];
  if (o.vat) out.push([`${d("doc.vat")} ${o.vatPct}%`, e.vat]);
  out.push([d(o.vat ? "doc.totalVat" : "doc.total"), e.total]);
  return out;
}

export async function estimateXlsx(a: Analysis, m: DocMeta): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default;
  const d = m.dyn;
  const wb = new ExcelJS.Workbook();
  wb.creator = "LSTK Planner";
  wb.created = new Date();
  const ACCENT = "FF1F4E8C";
  const SOFT = "FFE8EEF6";
  const ws = wb.addWorksheet(d("doc.sheetEstimate"), { views: [{ state: "frozen", ySplit: 7 }], pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  ws.columns = [{ width: 9 }, { width: 52 }, { width: 8 }, { width: 11 }, { width: 13 }, { width: 13 }, { width: 15 }, { width: 15 }, { width: 16 }];
  ws.mergeCells("A1:I1");
  ws.getCell("A1").value = `${d("doc.estimateTitle")}: ${m.title}`;
  ws.getCell("A1").font = { size: 16, bold: true, color: { argb: ACCENT } };
  ws.getCell("A2").value = `${d("climate.city")}: ${m.city}`;
  ws.getCell("A3").value = `${d("delivery.size")}: ${m.size}`;
  ws.getCell("A4").value = `${d("doc.date")}: ${m.date}`;
  ws.getCell("A5").value = d("doc.priceNote");
  ws.getCell("A5").font = { italic: true, color: { argb: "FF6B7280" } };
  const head = ws.getRow(7);
  head.values = [d("doc.code"), d("doc.item"), d("doc.unit"), d("doc.qty"), d("doc.priceMat"), d("doc.priceLab"), d("doc.material"), d("doc.labour"), d("doc.amount")];
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ACCENT } };
  head.alignment = { vertical: "middle", wrapText: true };
  head.height = 30;
  const NUM = "#,##0";
  let r = 8;
  const sectionRows: number[] = [];
  for (const s of a.estimate.sections) {
    const sr = r++;
    sectionRows.push(sr);
    const first = r;
    for (const l of s.lines) {
      const row = ws.getRow(r);
      row.values = [l.code, estLabel(l.id, d), unitLabel(l.unit, d), Math.round(l.qty * 100) / 100, Math.round(l.material), Math.round(l.labour)];
      row.getCell(7).value = { formula: `D${r}*E${r}` };
      row.getCell(8).value = { formula: `D${r}*F${r}` };
      row.getCell(9).value = { formula: `G${r}+H${r}` };
      for (const c of [4]) row.getCell(c).numFmt = "#,##0.00";
      for (const c of [5, 6, 7, 8, 9]) row.getCell(c).numFmt = NUM;
      r++;
    }
    const last = r - 1;
    const row = ws.getRow(sr);
    row.values = [s.code, d(`estsec.${s.id}`)];
    for (const [c, col] of [
      [7, "G"],
      [8, "H"],
      [9, "I"],
    ] as const)
      row.getCell(c).value = { formula: `SUM(${col}${first}:${col}${last})` };
    row.font = { bold: true };
    row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SOFT } };
    for (const c of [7, 8, 9]) row.getCell(c).numFmt = NUM;
  }
  r++;
  const o = a.estimate.options;
  const sumSections = sectionRows.map((x) => `I${x}`).join("+");
  const tr = (label: string, formula: string, bold = false) => {
    const row = ws.getRow(r);
    row.getCell(2).value = label;
    row.getCell(9).value = { formula };
    row.getCell(9).numFmt = NUM;
    if (bold) row.font = { bold: true };
    return r++;
  };
  const direct = tr(d("doc.direct"), sumSections, true);
  const oh = tr(`${d("doc.overhead")} ${o.overheadPct}%`, `I${direct}*${o.overheadPct / 100}`);
  const ct = tr(`${d("doc.contingency")} ${o.contingencyPct}%`, `I${direct}*${o.contingencyPct / 100}`);
  const cost = tr(d("doc.cost"), `I${direct}+I${oh}+I${ct}`, true);
  const mg = tr(`${d("doc.margin")} ${o.marginPct}%`, `I${cost}*${o.marginPct / 100}`);
  const net = tr(d("doc.net"), `I${cost}+I${mg}`, true);
  if (o.vat) {
    const vat = tr(`${d("doc.vat")} ${o.vatPct}%`, `I${net}*${o.vatPct / 100}`);
    const t = tr(d("doc.totalVat"), `I${net}+I${vat}`, true);
    ws.getRow(t).font = { bold: true, size: 13, color: { argb: ACCENT } };
  } else ws.getRow(net).font = { bold: true, size: 13, color: { argb: ACCENT } };

  // Frame specification and cut list
  const cs = wb.addWorksheet(d("doc.sheetCut"), { views: [{ state: "frozen", ySplit: 1 }] });
  cs.columns = [
    { header: d("spec.mark"), width: 12 },
    { header: d("doc.role"), width: 22 },
    { header: d("spec.section"), width: 20 },
    { header: d("spec.length"), width: 12 },
    { header: d("unit.pcs"), width: 8 },
    { header: d("doc.operations"), width: 90 },
  ];
  cs.getRow(1).font = { bold: true };
  for (const c of a.bom.cutList) cs.addRow([c.pieceMark, d(`role.${c.role}`), c.profileId, Math.round(c.length * 10) / 10, c.qty, c.operations]);

  // Connections
  const hs = wb.addWorksheet(d("doc.sheetNodes"));
  hs.columns = [{ header: d("doc.item"), width: 40 }, { header: d("doc.qty"), width: 12 }, { header: d("doc.unit"), width: 10 }];
  hs.getRow(1).font = { bold: true };
  for (const n of a.building.nodes) hs.addRow([d(`node.${n.type}`), n.count, d("unit.pcs")]);
  hs.addRow([]);
  for (const h of a.hardware) hs.addRow([d(`cost.hw.${h.kind}`), Math.round(h.qty * 10) / 10, d(h.unit === "m" ? "unit.m" : "unit.pcs")]);

  // Structural checks
  const ds = wb.addWorksheet(d("doc.sheetDesign"));
  ds.columns = [{ header: d("doc.element"), width: 32 }, { header: d("doc.where"), width: 18 }, { header: d("doc.kind"), width: 16 }, { header: d("doc.util"), width: 12 }, { header: d("doc.result"), width: 14 }, { header: d("doc.suggest"), width: 22 }];
  ds.getRow(1).font = { bold: true };
  for (const c of a.design.checks) {
    const row = ds.addRow([d(c.element), c.where, d(`chkkind.${c.kind}`), Math.round(c.utilisation * 100) / 100, c.ok ? "OK" : "!", c.suggest ?? ""]);
    row.getCell(4).numFmt = "0%";
    if (!c.ok) row.font = { color: { argb: "FFB91C1C" }, bold: true };
  }
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Self-contained A4 HTML: opens in Word as .doc, prints to PDF */
export function estimateHtml(a: Analysis, m: DocMeta, locale: string): string {
  const d = m.dyn;
  const rows: string[] = [];
  for (const s of a.estimate.sections) {
    rows.push(`<tr class="sec"><td>${s.code}</td><td colspan="5">${esc(d(`estsec.${s.id}`))}</td><td>${money(s.material, locale)}</td><td>${money(s.labour, locale)}</td><td>${money(s.total, locale)}</td></tr>`);
    for (const l of s.lines)
      rows.push(
        `<tr><td>${l.code}</td><td>${esc(estLabel(l.id, d))}</td><td>${esc(unitLabel(l.unit, d))}</td><td>${qty(l.qty, locale)}</td><td>${money(l.material, locale)}</td><td>${money(l.labour, locale)}</td><td>${money(l.qty * l.material, locale)}</td><td>${money(l.qty * l.labour, locale)}</td><td>${money(l.amount, locale)}</td></tr>`,
      );
  }
  const tot = totals(a, d)
    .map(([k, v], i, arr) => `<tr class="${i === arr.length - 1 ? "grand" : "tot"}"><td></td><td colspan="7">${esc(k)}</td><td>${money(v, locale)}</td></tr>`)
    .join("");
  return `<!doctype html><html lang="${m.lang}"><head><meta charset="utf-8"><title>${esc(m.title)}</title>
<style>
@page{size:A4 landscape;margin:12mm}
body{font-family:"Segoe UI","PingFang SC","Microsoft YaHei","Noto Sans",Arial,sans-serif;font-size:10pt;color:#1b2430;margin:0}
h1{font-size:16pt;margin:0 0 4px;color:#1f4e8c}
.meta{color:#4b5563;margin-bottom:10px}
table{border-collapse:collapse;width:100%}
th{background:#1f4e8c;color:#fff;text-align:left;padding:4px 6px;font-weight:600}
td{padding:3px 6px;border-bottom:1px solid #e5e7eb;vertical-align:top}
td:nth-child(n+4){text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
tr.sec td{background:#e8eef6;font-weight:700}
tr.tot td{font-weight:600}
tr.grand td{font-weight:800;font-size:12pt;color:#1f4e8c;border-top:2px solid #1f4e8c}
.note{margin-top:10px;color:#6b7280;font-size:8.5pt}
</style></head><body>
<h1>${esc(d("doc.estimateTitle"))}: ${esc(m.title)}</h1>
<div class="meta">${esc(d("climate.city"))}: ${esc(m.city)} | ${esc(d("delivery.size"))}: ${esc(m.size)} | ${esc(d("doc.date"))}: ${esc(m.date)}</div>
<table><thead><tr><th>${esc(d("doc.code"))}</th><th>${esc(d("doc.item"))}</th><th>${esc(d("doc.unit"))}</th><th>${esc(d("doc.qty"))}</th><th>${esc(d("doc.priceMat"))}</th><th>${esc(d("doc.priceLab"))}</th><th>${esc(d("doc.material"))}</th><th>${esc(d("doc.labour"))}</th><th>${esc(d("doc.amount"))}</th></tr></thead>
<tbody>${rows.join("")}${tot}</tbody></table>
<p class="note">${esc(d("doc.priceNote"))}</p>
</body></html>`;
}

/** Print an HTML document through a hidden iframe (the browser offers "Save as PDF") */
export function printHtml(html: string): void {
  const f = document.createElement("iframe");
  Object.assign(f.style, { position: "fixed", width: "0", height: "0", border: "0" });
  document.body.appendChild(f);
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    f.contentWindow!.focus();
    f.contentWindow!.print();
    setTimeout(() => f.remove(), 1000);
  };
  f.onload = go;
  const doc = f.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();
  // some browsers fire no load event for document.write
  setTimeout(go, 600);
}
