import type { Part, PlywoodThickness } from "../press/types";

/**
 * Раскладка деталей по листам: простой «полочный» алгоритм. Детали
 * сортируются по высоте, укладываются рядами слева направо; деталь шире
 * листа поворачивается. Этого достаточно для фанерного раскроя станка, где
 * деталей десятки, а не тысячи.
 */

export interface SheetSpec {
  width: number;
  height: number;
  margin: number;
  gap: number;
}

export const SHEET_1525: SheetSpec = { width: 1525, height: 1525, margin: 15, gap: 12 };

export interface PlacedPart {
  part: Part;
  /** Номер экземпляра среди qty */
  index: number;
  x: number;
  y: number;
  rotated: boolean;
  w: number;
  h: number;
}

export interface Sheet {
  thickness: PlywoodThickness;
  spec: SheetSpec;
  parts: PlacedPart[];
  /** Доля площади листа, занятая деталями */
  utilization: number;
}

export function nestParts(parts: Part[], spec: SheetSpec = SHEET_1525): Sheet[] {
  const sheets: Sheet[] = [];
  for (const thickness of [18, 12] as PlywoodThickness[]) {
    const items: { part: Part; index: number; w: number; h: number; rotated: boolean }[] = [];
    for (const p of parts.filter((q) => q.thickness === thickness)) {
      for (let i = 0; i < p.qty; i++) {
        let w = p.width;
        let h = p.height;
        let rotated = false;
        if (w > spec.width - 2 * spec.margin && h <= spec.width - 2 * spec.margin) {
          [w, h] = [h, w];
          rotated = true;
        }
        items.push({ part: p, index: i + 1, w, h, rotated });
      }
    }
    if (items.length === 0) continue;
    items.sort((a, b) => b.h - a.h || b.w - a.w);

    let current: Sheet | null = null;
    let cursorX = 0;
    let cursorY = 0;
    let rowH = 0;
    const open = () => {
      current = { thickness, spec, parts: [], utilization: 0 };
      sheets.push(current);
      cursorX = spec.margin;
      cursorY = spec.margin;
      rowH = 0;
    };
    open();
    for (const it of items) {
      if (it.w > spec.width - 2 * spec.margin || it.h > spec.height - 2 * spec.margin) {
        throw new Error(`Деталь ${it.part.id} ${it.w}×${it.h} не помещается на лист ${spec.width}×${spec.height}`);
      }
      if (cursorX + it.w > spec.width - spec.margin) {
        cursorX = spec.margin;
        cursorY += rowH + spec.gap;
        rowH = 0;
      }
      if (cursorY + it.h > spec.height - spec.margin) {
        open();
      }
      current!.parts.push({ part: it.part, index: it.index, x: cursorX, y: cursorY, rotated: it.rotated, w: it.w, h: it.h });
      cursorX += it.w + spec.gap;
      rowH = Math.max(rowH, it.h);
    }
  }
  for (const s of sheets) {
    const used = s.parts.reduce((a, p) => a + p.w * p.h, 0);
    s.utilization = used / (s.spec.width * s.spec.height);
  }
  return sheets;
}
