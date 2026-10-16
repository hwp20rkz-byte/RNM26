import type { ShelfItem } from '../../types/cad.types';

export interface ShelfLayout {
  // Отметка низа каждой полки от низа внутреннего проёма (верха дна), мм.
  elevations: number[];
  // Высоты всех проёмов снизу вверх: под каждой полкой и над последней.
  gaps: number[];
  warnings: string[];
}

const round = (v: number) => Math.round(v * 10) / 10;

// Делит внутреннюю высоту на проёмы. Зафиксированные «замком» проёмы сохраняются,
// остаток поровну делится между свободными, включая проём над верхней полкой.
export function distributeShelves(innerHeight: number, thickness: number, shelves: ShelfItem[]): ShelfLayout {
  const warnings: string[] = [];
  const n = shelves.length;
  if (n === 0) return { elevations: [], gaps: [round(innerHeight)], warnings };

  const lockedSum = shelves.reduce((s, sh) => s + (sh.lockedGapBelow ?? 0), 0);
  const autoCount = shelves.filter((sh) => sh.lockedGapBelow === null).length + 1;
  const autoGap = (innerHeight - n * thickness - lockedSum) / autoCount;

  if (autoGap < 0) {
    warnings.push(
      `Полки не помещаются: зафиксированные проёмы (${lockedSum} мм) и ${n} полок по ${thickness} мм больше внутренней высоты ${round(innerHeight)} мм`,
    );
  }

  const gaps: number[] = [];
  const elevations: number[] = [];
  let y = 0;
  for (const sh of shelves) {
    const gap = sh.lockedGapBelow ?? autoGap;
    gaps.push(round(gap));
    y += gap;
    elevations.push(round(y));
    y += thickness;
  }
  gaps.push(round(innerHeight - y));
  return { elevations, gaps, warnings };
}
