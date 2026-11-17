import type { BomLine, Part } from "../press/types";

function cell(v: string | number): string {
  const s = String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV с разделителем «;» — так его открывает Excel с русской локалью без мастера импорта */
export function bomCsv(lines: BomLine[]): string {
  const head = ["Поз.", "Группа", "Обозначение", "Характеристика", "Кол-во", "Ед.", "Цена от, ₸", "Цена до, ₸", "Поиск (RU)", "Поиск (EN)", "Где купить", "Примечание"];
  const rows = lines.map((l) => [l.id, l.group, l.designation, l.spec, l.qty, l.unit, l.priceLowKzt, l.priceHighKzt, l.searchRu, l.searchEn, l.where, l.note].map(cell).join(";"));
  return "﻿" + [head.join(";"), ...rows].join("\n") + "\n";
}

export function partsCsv(parts: Part[]): string {
  const head = ["Деталь", "Название", "Толщина, мм", "Ширина, мм", "Высота, мм", "Кол-во", "Отверстий", "Пазов", "Примечания"];
  const rows = parts.map((p) => [p.id, p.nameRu, p.thickness, p.width, p.height, p.qty, p.holes.length, p.slots.length, p.notes.join("; ")].map(cell).join(";"));
  return "﻿" + [head.join(";"), ...rows].join("\n") + "\n";
}
