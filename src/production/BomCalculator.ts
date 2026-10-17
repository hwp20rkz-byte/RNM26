import { EDGE_SIDES, type HardwareItem, type MaterialDef, type Part } from '../types/cad.types';
import type { NormValues } from '../cad-kernel/config/norms';
import { sideLength } from '../cad-kernel/assembler/parts';
import { grooveLength } from '../cad-kernel/assembler/overrides';

export interface BomMaterialLine {
  materialId: string;
  materialName: string;
  materialCode: string;
  thickness: number;
  partCount: number;
  netAreaM2: number; // чистая площадь деталей
  grossAreaM2: number; // с коэффициентом отхода
  edgingM: number; // погонные метры кромки
  costRub: number | null; // null — нет цены в каталоге
}

export interface Bom {
  lines: BomMaterialLine[];
  edging: { thickness: number; meters: number }[]; // кромка по толщинам — так её закупают
  grooveM: number; // фрезеровка пазов, м.п.
  totalCostRub: number | null; // null, если хоть у одного материала нет цены
}

// Погонные миллиметры кромки детали, сгруппированные по толщине.
function edgingByThickness(p: Part): Map<number, number> {
  const out = new Map<number, number>();
  for (const side of EDGE_SIDES) {
    const t = p.edges[side];
    if (t > 0) out.set(t, (out.get(t) ?? 0) + sideLength(p, side));
  }
  return out;
}

const round = (v: number, digits: number) => Math.round(v * 10 ** digits) / 10 ** digits;

export function calculateBom(parts: Part[], materials: Map<string, MaterialDef>, n: NormValues): Bom {
  const byMaterial = new Map<string, Part[]>();
  for (const p of parts) {
    const list = byMaterial.get(p.materialId) ?? [];
    list.push(p);
    byMaterial.set(p.materialId, list);
  }

  const lines: BomMaterialLine[] = [];
  for (const [materialId, list] of byMaterial) {
    const mat = materials.get(materialId);
    const net = list.reduce((s, p) => s + (p.cut.length * p.cut.width) / 1e6, 0);
    const gross = net * n.wasteFactor;
    const edgingMm = list.reduce((s, p) => s + [...edgingByThickness(p).values()].reduce((a, b) => a + b, 0), 0);
    lines.push({
      materialId,
      materialName: mat?.name ?? materialId,
      materialCode: mat?.code ?? '',
      thickness: list[0]?.thickness ?? 0,
      partCount: list.length,
      netAreaM2: round(net, 3),
      grossAreaM2: round(gross, 3),
      edgingM: round(edgingMm / 1000, 2),
      costRub: mat?.pricePerM2 != null ? round(gross * mat.pricePerM2, 2) : null,
    });
  }

  const total = lines.every((l) => l.costRub !== null)
    ? round(lines.reduce((s, l) => s + (l.costRub ?? 0), 0), 2)
    : null;
  const byThickness = new Map<number, number>();
  for (const p of parts) for (const [t, mm] of edgingByThickness(p)) byThickness.set(t, (byThickness.get(t) ?? 0) + mm);
  const edging = [...byThickness]
    .sort(([a], [b]) => a - b)
    .map(([thickness, mm]) => ({ thickness, meters: round(mm / 1000, 2) }));
  const grooveM = round(parts.reduce((s, p) => s + grooveLength(p), 0) / 1000, 2);

  return { lines, edging, grooveM, totalCostRub: total };
}

// Фурнитура: одинаковые позиции из всех модулей сводятся в одну строку.
export function aggregateHardware(items: HardwareItem[]): HardwareItem[] {
  const map = new Map<string, HardwareItem>();
  for (const it of items) {
    const cur = map.get(it.key);
    if (cur) cur.qty = round(cur.qty + it.qty, 3);
    else map.set(it.key, { key: it.key, name: it.name, unit: it.unit, qty: it.qty }); // строка сметы общая, без привязки к детали
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}
