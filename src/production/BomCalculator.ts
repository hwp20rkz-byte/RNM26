import type { MaterialDef, Part } from '../types/cad.types';
import type { NormValues } from '../cad-kernel/config/norms';

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
  totalCostRub: number | null; // null, если хоть у одного материала нет цены
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
    const edgingMm = list.reduce((s, p) => s + p.edging.length * p.cut.length + p.edging.width * p.cut.width, 0);
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
  return { lines, totalCostRub: total };
}
