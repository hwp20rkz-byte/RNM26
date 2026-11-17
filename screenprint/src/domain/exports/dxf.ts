import type { Sheet } from "./nest";

/**
 * DXF R12 (ASCII) раскроя листа: слои CUT, HOLE, POCKET, TEXT; единицы мм
 * ($INSUNITS = 4). Контуры — LINE, отверстия — CIRCLE, пазы — четыре LINE и
 * две дуги заменены прямоугольником со скруглением через LINE (лазеру и ЧПУ
 * этого достаточно; точный профиль паза задаёт фреза).
 */

const LAYER_COLOR: Record<string, number> = { CUT: 7, HOLE: 5, POCKET: 1, TEXT: 3 };
const fmt = (v: number) => (Math.round(v * 1000) / 1000).toString();

class Writer {
  out: string[] = [];
  code(c: number, v: string | number) {
    this.out.push(String(c), typeof v === "number" ? fmt(v) : v);
  }
  line(layer: string, x1: number, y1: number, x2: number, y2: number) {
    this.code(0, "LINE");
    this.code(8, layer);
    this.code(10, x1);
    this.code(20, y1);
    this.code(30, 0);
    this.code(11, x2);
    this.code(21, y2);
    this.code(31, 0);
  }
  rect(layer: string, x: number, y: number, w: number, h: number) {
    this.line(layer, x, y, x + w, y);
    this.line(layer, x + w, y, x + w, y + h);
    this.line(layer, x + w, y + h, x, y + h);
    this.line(layer, x, y + h, x, y);
  }
  circle(layer: string, x: number, y: number, r: number) {
    this.code(0, "CIRCLE");
    this.code(8, layer);
    this.code(10, x);
    this.code(20, y);
    this.code(30, 0);
    this.code(40, r);
  }
  text(layer: string, x: number, y: number, h: number, s: string) {
    this.code(0, "TEXT");
    this.code(8, layer);
    this.code(10, x);
    this.code(20, y);
    this.code(30, 0);
    this.code(40, h);
    this.code(1, s);
  }
}

export function sheetDxf(sheet: Sheet): string {
  const w = new Writer();
  const H = sheet.spec.height; // DXF: Y вверх, SVG: Y вниз — переворачиваем
  const Y = (y: number) => H - y;

  w.code(0, "SECTION");
  w.code(2, "HEADER");
  w.code(9, "$INSUNITS");
  w.code(70, 4);
  w.code(0, "ENDSEC");
  w.code(0, "SECTION");
  w.code(2, "TABLES");
  w.code(0, "TABLE");
  w.code(2, "LAYER");
  w.code(70, 4);
  for (const [name, color] of Object.entries(LAYER_COLOR)) {
    w.code(0, "LAYER");
    w.code(2, name);
    w.code(70, 0);
    w.code(62, color);
    w.code(6, "CONTINUOUS");
  }
  w.code(0, "ENDTAB");
  w.code(0, "ENDSEC");
  w.code(0, "SECTION");
  w.code(2, "ENTITIES");

  for (const pp of sheet.parts) {
    const { part, x, y, rotated } = pp;
    const tx = (lx: number, ly: number): [number, number] => (rotated ? [x + (part.height - ly), y + lx] : [x + lx, y + ly]);
    // контур
    w.rect("CUT", x, Y(y + pp.h), pp.w, pp.h);
    for (const r of part.pockets) {
      const [px, py] = tx(r.x, r.y);
      const rw = rotated ? r.h : r.w;
      const rh = rotated ? r.w : r.h;
      const ox = rotated ? px - rw : px;
      w.rect("POCKET", ox, Y(py + rh), rw, rh);
    }
    for (const r of part.cutouts) {
      const [px, py] = tx(r.x, r.y);
      const rw = rotated ? r.h : r.w;
      const rh = rotated ? r.w : r.h;
      const ox = rotated ? px - rw : px;
      w.rect("CUT", ox, Y(py + rh), rw, rh);
    }
    for (const s of part.slots) {
      const [cx, cy] = tx(s.x, s.y);
      const horizontal = (s.angle === 0) !== rotated;
      const sw = horizontal ? s.length : s.width;
      const sh = horizontal ? s.width : s.length;
      w.rect("HOLE", cx - sw / 2, Y(cy + sh / 2), sw, sh);
    }
    for (const h of part.holes) {
      const [hx, hy] = tx(h.x, h.y);
      w.circle(h.kind === "pocket" ? "POCKET" : "HOLE", hx, Y(hy), h.d / 2);
    }
    w.text("TEXT", x + 8, Y(y + 16), 8, `${part.id}${part.qty > 1 ? ` ${pp.index}/${part.qty}` : ""} t${part.thickness}`);
  }

  w.code(0, "ENDSEC");
  w.code(0, "EOF");
  return w.out.join("\n") + "\n";
}
