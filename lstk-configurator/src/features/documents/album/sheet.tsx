import type { ReactNode } from "react";

/**
 * A3 landscape sheet (420 × 297 mm) per ГОСТ Р 21.101-2020: frame 20 mm on the
 * left, 5 mm elsewhere; main title block, form 3 (185 × 55 mm) bottom right.
 * All coordinates are paper millimetres.
 */
export const SHEET_W = 420;
export const SHEET_H = 297;
export const FRAME = { x0: 20, y0: 5, x1: 415, y1: 292 };
/** Free drawing field above the title block */
export const FIELD = { x0: 25, y0: 10, x1: 410, y1: 230 };

export const LINE = { main: 0.5, thin: 0.18, thick: 0.7 };
export const FONT = "'ISOCPEUR','GOST type B','Arial Narrow','Segoe UI','PingFang SC','Microsoft YaHei',sans-serif";

export interface SheetMeta {
  code: string;
  object: string;
  org: string;
  stage: string;
  developer: string;
  date: string;
  labels: { developer: string; checked: string; nControl: string; gip: string; stage: string; sheet: string; sheets: string; change: string; qty: string; doc: string; sign: string; dateL: string };
}

function T({ x, y, s = 2.5, a = "start", b = false, children }: { x: number; y: number; s?: number; a?: "start" | "middle" | "end"; b?: boolean; children: ReactNode }) {
  return (
    <text x={x} y={y} fontSize={s} textAnchor={a} fontFamily={FONT} fontStyle="italic" fontWeight={b ? 700 : 400}>
      {children}
    </text>
  );
}

/** Title block form 3, 185 × 55 mm, anchored at the frame's bottom-right corner */
function TitleBlock({ meta, title, n, total }: { meta: SheetMeta; title: string; n: number; total: number }) {
  const x = FRAME.x1 - 185;
  const y = FRAME.y1 - 55;
  const L = meta.labels;
  const rows = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
  const cols = [7, 17, 27, 42, 57, 65];
  return (
    <g stroke="black" strokeWidth={LINE.main} fill="none">
      <rect x={x} y={y} width={185} height={55} />
      {/* left grid: changes and signatures */}
      {rows.map((r) => (
        <line key={r} x1={x} y1={y + r} x2={x + 65} y2={y + r} strokeWidth={r === 25 || r === 30 ? LINE.main : LINE.thin} />
      ))}
      {cols.map((c) => (
        <line key={c} x1={x + c} y1={y} x2={x + c} y2={y + (c === 65 ? 55 : c <= 27 && c !== 7 ? 55 : 55)} strokeWidth={LINE.main} />
      ))}
      <line x1={x + 65} y1={y + 15} x2={x + 185} y2={y + 15} />
      <line x1={x + 65} y1={y + 40} x2={x + 185} y2={y + 40} />
      <line x1={x + 135} y1={y + 15} x2={x + 135} y2={y + 55} />
      <line x1={x + 135} y1={y + 20} x2={x + 185} y2={y + 20} />
      <line x1={x + 150} y1={y + 15} x2={x + 150} y2={y + 25} />
      <line x1={x + 165} y1={y + 15} x2={x + 165} y2={y + 25} />
      <line x1={x + 135} y1={y + 25} x2={x + 185} y2={y + 25} />
      <g stroke="none" fill="black">
        <T x={x + 3.5} y={y + 23.6} s={2} a="middle">{L.change}</T>
        <T x={x + 12} y={y + 23.6} s={2} a="middle">{L.qty}</T>
        <T x={x + 22} y={y + 23.6} s={2} a="middle">{L.sheet}</T>
        <T x={x + 34.5} y={y + 23.6} s={2} a="middle">{L.doc}</T>
        <T x={x + 49.5} y={y + 23.6} s={2} a="middle">{L.sign}</T>
        <T x={x + 61} y={y + 23.6} s={2} a="middle">{L.dateL}</T>
        <T x={x + 1} y={y + 28.8} s={2}>{L.developer}</T>
        <T x={x + 18} y={y + 28.8} s={2}>{meta.developer}</T>
        <T x={x + 58} y={y + 28.8} s={1.8}>{meta.date}</T>
        <T x={x + 1} y={y + 33.8} s={2}>{L.checked}</T>
        <T x={x + 1} y={y + 43.8} s={2}>{L.nControl}</T>
        <T x={x + 1} y={y + 48.8} s={2}>{L.gip}</T>
        <T x={x + 125} y={y + 6} s={3.5} a="middle" b>{meta.code}</T>
        <T x={x + 100} y={y + 11.5} s={2.5} a="middle">{meta.object}</T>
        <T x={x + 100} y={y + 29} s={3} a="middle" b>{title}</T>
        <T x={x + 142.5} y={y + 18.6} s={2} a="middle">{L.stage}</T>
        <T x={x + 157.5} y={y + 18.6} s={2} a="middle">{L.sheet}</T>
        <T x={x + 175} y={y + 18.6} s={2} a="middle">{L.sheets}</T>
        <T x={x + 142.5} y={y + 23.6} s={2.5} a="middle">{meta.stage}</T>
        <T x={x + 157.5} y={y + 23.6} s={2.5} a="middle">{n}</T>
        <T x={x + 175} y={y + 23.6} s={2.5} a="middle">{total}</T>
        <T x={x + 160} y={y + 41} s={2.5} a="middle" b>{meta.org}</T>
      </g>
    </g>
  );
}

export function Sheet({ meta, title, n, total, children }: { meta: SheetMeta; title: string; n: number; total: number; children: ReactNode }) {
  return (
    <section className="album-sheet">
      <svg viewBox={`0 0 ${SHEET_W} ${SHEET_H}`} width={`${SHEET_W}mm`} height={`${SHEET_H}mm`} xmlns="http://www.w3.org/2000/svg">
        <rect x={0} y={0} width={SHEET_W} height={SHEET_H} fill="white" />
        <rect x={FRAME.x0} y={FRAME.y0} width={FRAME.x1 - FRAME.x0} height={FRAME.y1 - FRAME.y0} fill="none" stroke="black" strokeWidth={LINE.thick} />
        <g>{children}</g>
        <TitleBlock meta={meta} title={title} n={n} total={total} />
        {/* small stamp: document code, top-left rotated per form 6 is omitted; code repeated at the top right */}
        <rect x={FRAME.x1 - 70} y={FRAME.y0} width={70} height={14} fill="white" stroke="black" strokeWidth={LINE.main} />
        <text x={FRAME.x1 - 35} y={FRAME.y0 + 9} fontSize={4} textAnchor="middle" fontFamily={FONT} fontStyle="italic">
          {meta.code}
        </text>
      </svg>
    </section>
  );
}

/** Text in a drawing (italic, GOST-like) */
export function Txt({ x, y, s = 2.5, a = "start", b = false, rot, children }: { x: number; y: number; s?: number; a?: "start" | "middle" | "end"; b?: boolean; rot?: number; children: ReactNode }) {
  return (
    <text x={x} y={y} fontSize={s} textAnchor={a} fontFamily={FONT} fontStyle="italic" fontWeight={b ? 700 : 400} transform={rot ? `rotate(${rot} ${x} ${y})` : undefined}>
      {children}
    </text>
  );
}

/** Linear dimension with 45° ticks; text in mm of the model */
export function Dim({ x1, y1, x2, y2, off, text }: { x1: number; y1: number; x2: number; y2: number; off: number; text: string }) {
  const horizontal = Math.abs(y2 - y1) < Math.abs(x2 - x1);
  const ax1 = horizontal ? x1 : x1 + off;
  const ay1 = horizontal ? y1 + off : y1;
  const ax2 = horizontal ? x2 : x2 + off;
  const ay2 = horizontal ? y2 + off : y2;
  const tick = (x: number, y: number) => <line x1={x - 1.2} y1={y + 1.2} x2={x + 1.2} y2={y - 1.2} strokeWidth={LINE.main} />;
  return (
    <g stroke="black" strokeWidth={LINE.thin} fill="black">
      <line x1={x1} y1={y1} x2={ax1 + (horizontal ? 0 : Math.sign(off) * 1.5)} y2={ay1 + (horizontal ? Math.sign(off) * 1.5 : 0)} />
      <line x1={x2} y1={y2} x2={ax2 + (horizontal ? 0 : Math.sign(off) * 1.5)} y2={ay2 + (horizontal ? Math.sign(off) * 1.5 : 0)} />
      <line x1={ax1 - (horizontal ? 1.5 : 0)} y1={ay1 - (horizontal ? 0 : 1.5)} x2={ax2 + (horizontal ? 1.5 : 0)} y2={ay2 + (horizontal ? 0 : 1.5)} />
      {tick(ax1, ay1)}
      {tick(ax2, ay2)}
      <g stroke="none">
        {horizontal ? (
          <Txt x={(ax1 + ax2) / 2} y={ay1 - 0.8} s={2.2} a="middle">
            {text}
          </Txt>
        ) : (
          <Txt x={ax1 - 0.8} y={(ay1 + ay2) / 2} s={2.2} a="middle" rot={-90}>
            {text}
          </Txt>
        )}
      </g>
    </g>
  );
}

/** Coordination axis: dash-dot line and a 6 mm circle with the label */
export function Axis({ x1, y1, x2, y2, label }: { x1: number; y1: number; x2: number; y2: number; label: string }) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l = Math.hypot(dx, dy) || 1;
  const cx = x2 + (dx / l) * 3;
  const cy = y2 + (dy / l) * 3;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="black" strokeWidth={LINE.thin} strokeDasharray="8 1.5 1 1.5" />
      <circle cx={cx} cy={cy} r={3} fill="white" stroke="black" strokeWidth={LINE.thin} />
      <Txt x={cx} y={cy + 1.1} s={3} a="middle">
        {label}
      </Txt>
    </g>
  );
}

/** Level mark (отметка): triangle and value in metres, e.g. +2,700 */
export function Mark({ x, y, value, left = false }: { x: number; y: number; value: number; left?: boolean }) {
  const v = `${value > 0 ? "+" : value < 0 ? "−" : "±"}${Math.abs(value / 1000).toFixed(3).replace(".", ",")}`;
  const s = left ? -1 : 1;
  return (
    <g stroke="black" strokeWidth={LINE.thin} fill="none">
      <path d={`M ${x} ${y} l ${-1.5} ${-2.2} l 3 0 z`} fill="black" />
      <line x1={x} y1={y - 2.2} x2={x + s * 14} y2={y - 2.2} />
      <g stroke="none" fill="black">
        <Txt x={x + s * 1.5} y={y - 3} s={2.5} a={left ? "end" : "start"}>
          {v}
        </Txt>
      </g>
    </g>
  );
}

/** Pick the largest standard scale (1:20 … 1:200) that fits `w × h` model mm into the box */
export function fitScale(w: number, h: number, boxW: number, boxH: number): number {
  for (const k of [20, 25, 50, 75, 100, 150, 200, 250]) if (w / k <= boxW && h / k <= boxH) return k;
  return 300;
}

/** Simple table: column widths (mm), header and rows */
export function Table({ x, y, widths, head, rows, rowH = 6, s = 2.3 }: { x: number; y: number; widths: number[]; head: string[]; rows: (string | number)[][]; rowH?: number; s?: number }) {
  const W = widths.reduce((a, b) => a + b, 0);
  const xs = widths.reduce<number[]>((acc, w, i) => [...acc, (acc[i] ?? 0) + w], [0]);
  const H = rowH * (rows.length + 1.5);
  return (
    <g>
      <rect x={x} y={y} width={W} height={H} fill="none" stroke="black" strokeWidth={LINE.main} />
      <line x1={x} y1={y + rowH * 1.5} x2={x + W} y2={y + rowH * 1.5} stroke="black" strokeWidth={LINE.main} />
      {xs.slice(1, -1).map((cx, i) => (
        <line key={i} x1={x + cx} y1={y} x2={x + cx} y2={y + H} stroke="black" strokeWidth={LINE.main} />
      ))}
      {rows.map((_, i) => (
        <line key={i} x1={x} y1={y + rowH * (i + 2.5)} x2={x + W} y2={y + rowH * (i + 2.5)} stroke="black" strokeWidth={LINE.thin} />
      ))}
      {head.map((h, i) => (
        <Txt key={i} x={x + xs[i]! + widths[i]! / 2} y={y + rowH * 0.95} s={s} a="middle">
          {h}
        </Txt>
      ))}
      {rows.map((r, j) =>
        r.map((c, i) => (
          <Txt key={`${j}-${i}`} x={i === 1 || (i === 0 && widths.length < 3) ? x + xs[i]! + 1.2 : x + xs[i]! + widths[i]! / 2} y={y + rowH * (j + 2.2)} s={s} a={i === 1 || (i === 0 && widths.length < 3) ? "start" : "middle"}>
            {String(c)}
          </Txt>
        )),
      )}
    </g>
  );
}
