import type { PlacedPart, Sheet } from "./nest";
import type { Hole, Part } from "../press/types";

/**
 * SVG раскроя для лазера/ЧПУ: единицы — миллиметры (viewBox = размер листа,
 * width/height в mm). Слои по цвету обводки, как принято у лазерных
 * мастерских: чёрный — сквозной рез контура, синий — сквозные отверстия,
 * красный — карманы (несквозные), зелёный — гравировка маркировки.
 * Отверстия под забивные гайки выводятся как сквозные круги 10 мм.
 */

export const SVG_LAYERS = {
  cut: "#000000",
  hole: "#0000ff",
  pocket: "#ff0000",
  engrave: "#00a000",
} as const;

const f = (v: number) => (Math.round(v * 100) / 100).toString();

function transformHoles(pp: PlacedPart): { x: number; y: number; hole: Hole }[] {
  const { part, rotated, x, y } = pp;
  return part.holes.map((h) => {
    const lx = rotated ? part.height - h.y : h.x;
    const ly = rotated ? h.x : h.y;
    return { x: x + lx, y: y + ly, hole: h };
  });
}

function partSvg(pp: PlacedPart): string {
  const { part, x, y, w, h, rotated } = pp;
  const out: string[] = [];
  out.push(`<g id="${part.id}-${pp.index}" data-part="${part.id}" data-qty-index="${pp.index}">`);
  // карманы (сначала, чтобы фрезеровать до контура)
  for (const r of part.pockets) {
    const rx = rotated ? x + (part.height - r.y - r.h) : x + r.x;
    const ry = rotated ? y + r.x : y + r.y;
    const rw = rotated ? r.h : r.w;
    const rh = rotated ? r.w : r.h;
    out.push(`<rect x="${f(rx)}" y="${f(ry)}" width="${f(rw)}" height="${f(rh)}" fill="none" stroke="${SVG_LAYERS.pocket}" stroke-width="0.3"/>`);
  }
  for (const r of part.cutouts) {
    const rx = rotated ? x + (part.height - r.y - r.h) : x + r.x;
    const ry = rotated ? y + r.x : y + r.y;
    const rw = rotated ? r.h : r.w;
    const rh = rotated ? r.w : r.h;
    out.push(`<rect x="${f(rx)}" y="${f(ry)}" width="${f(rw)}" height="${f(rh)}" rx="20" fill="none" stroke="${SVG_LAYERS.cut}" stroke-width="0.3"/>`);
  }
  for (const s of part.slots) {
    const horizontal = (s.angle === 0) !== rotated;
    const sw = horizontal ? s.length : s.width;
    const sh = horizontal ? s.width : s.length;
    const cx = rotated ? x + (part.height - s.y) : x + s.x;
    const cy = rotated ? y + s.x : y + s.y;
    out.push(`<rect x="${f(cx - sw / 2)}" y="${f(cy - sh / 2)}" width="${f(sw)}" height="${f(sh)}" rx="${f(s.width / 2)}" fill="none" stroke="${SVG_LAYERS.hole}" stroke-width="0.3"/>`);
  }
  for (const { x: hx, y: hy, hole } of transformHoles(pp)) {
    const color = hole.kind === "pocket" ? SVG_LAYERS.pocket : SVG_LAYERS.hole;
    out.push(`<circle cx="${f(hx)}" cy="${f(hy)}" r="${f(hole.d / 2)}" fill="none" stroke="${color}" stroke-width="0.3"/>`);
  }
  // маркировка
  out.push(`<text x="${f(x + 8)}" y="${f(y + 14)}" font-size="8" font-family="sans-serif" fill="${SVG_LAYERS.engrave}" stroke="none">${part.id}${part.qty > 1 ? ` ${pp.index}/${part.qty}` : ""} · ${part.thickness} мм</text>`);
  // контур последним
  out.push(`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="3" fill="none" stroke="${SVG_LAYERS.cut}" stroke-width="0.3"/>`);
  out.push(`</g>`);
  return out.join("\n");
}

export function sheetSvg(sheet: Sheet, title: string): string {
  const { width, height } = sheet.spec;
  const header = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}">\n<title>${title}</title>\n<desc>Лист ${width}×${height}, фанера ${sheet.thickness} мм. Слои: чёрный рез, синий отверстия, красный карманы, зелёный гравировка. Единицы мм.</desc>\n<rect x="0" y="0" width="${width}" height="${height}" fill="none" stroke="#999999" stroke-width="0.3" stroke-dasharray="6 4"/>`;
  const body = sheet.parts.map(partSvg).join("\n");
  const legend = `<text x="${width - 8}" y="${height - 8}" text-anchor="end" font-size="10" font-family="sans-serif" fill="${SVG_LAYERS.engrave}">${title} · загрузка ${(sheet.utilization * 100).toFixed(0)} %</text>`;
  return `${header}\n${body}\n${legend}\n</svg>\n`;
}

/** Чертёж одной детали (для документации и 3D-конфигуратора) */
export function partDrawingSvg(part: Part): string {
  const pp: PlacedPart = { part, index: 1, x: 20, y: 20, rotated: false, w: part.width, h: part.height };
  const w = part.width + 40;
  const h = part.height + 40;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">\n<title>${part.id} — ${part.nameRu}</title>\n${partSvg(pp)}\n</svg>\n`;
}
