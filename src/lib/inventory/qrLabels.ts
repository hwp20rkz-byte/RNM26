import QRCode from "qrcode";

export interface LabelData {
  title: string;
  qrValue: string;
  subtitle?: string;
  footer?: string;
}

async function svgFor(value: string): Promise<string> {
  return QRCode.toString(value, { type: "svg", margin: 0, width: 120 });
}

/** Собирает автономный HTML-документ с сеткой этикеток 50×30мм — печатается через отдельное окно, не пересекается с print-CSS основной страницы. */
export async function buildLabelSheetHtml(labels: LabelData[]): Promise<string> {
  const cells = await Promise.all(
    labels.map(async (l) => {
      const svg = await svgFor(l.qrValue);
      return `
        <div class="label">
          <div class="qr">${svg}</div>
          <div class="text">
            <div class="title">${escapeHtml(l.title)}</div>
            ${l.subtitle ? `<div class="subtitle">${escapeHtml(l.subtitle)}</div>` : ""}
            ${l.footer ? `<div class="footer">${escapeHtml(l.footer)}</div>` : ""}
          </div>
        </div>`;
    }),
  );

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<title>Этикетки — QazaqOSI</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; margin: 8mm; background: white; }
  .sheet { display: grid; grid-template-columns: repeat(3, 50mm); gap: 3mm; }
  .label {
    width: 50mm; height: 30mm; border: 1px solid #94a3b8; border-radius: 2mm;
    padding: 2mm; display: flex; gap: 2mm; align-items: center; break-inside: avoid;
  }
  .qr { width: 22mm; height: 22mm; flex-shrink: 0; }
  .qr svg { width: 100%; height: 100%; }
  .text { min-width: 0; }
  .title { font-size: 8pt; font-weight: bold; line-height: 1.15; overflow-wrap: break-word; color: #0f172a; }
  .subtitle { font-size: 7pt; color: #334155; margin-top: 1mm; }
  .footer { font-size: 6.5pt; color: #64748b; margin-top: 1mm; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
  <div class="sheet">${cells.join("\n")}</div>
  <script>window.onload = () => setTimeout(() => window.print(), 200);<\/script>
</body>
</html>`;
}

/** Открывает лист этикеток в новом окне и запускает печать. Возвращает false, если окно заблокировано браузером. */
export function openLabelSheet(html: string): boolean {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
