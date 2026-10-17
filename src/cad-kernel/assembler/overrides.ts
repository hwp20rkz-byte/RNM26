import { EDGE_SIDES, type Assembly, type MaterialDef, type Part, type PartOverride } from '../../types/cad.types';
import { cutOf, round, sideGeometry, sideLength } from './parts';

export interface OverrideResult {
  part: Part | null; // null — деталь удалена
  warnings: string[];
}

// Ручные правки одной детали поверх расчёта: материал, волокна, кромка, удлинение, пазы, удаление.
// Ничего не меняет в расчёте соседних деталей: удлинение наращивает только эту деталь (как в QDesign).
export function applyOverride(part: Part, ov: PartOverride | undefined, materials: Map<string, MaterialDef>): OverrideResult {
  if (!ov) return { part, warnings: [] };
  if (ov.deleted) return { part: null, warnings: [] };
  const warnings: string[] = [];
  const name = ov.name?.trim() || part.name;

  let materialId = part.materialId;
  if (ov.materialId && ov.materialId !== part.materialId) {
    const mat = materials.get(ov.materialId);
    if (!mat) warnings.push(`${name}: материала ${ov.materialId} нет в каталоге`);
    else if (mat.thickness !== part.thickness) {
      warnings.push(`${name}: материал ${mat.code} толщиной ${mat.thickness} мм не подходит к детали ${part.thickness} мм`);
    } else materialId = mat.id;
  }

  const min = { ...part.box.min };
  const size = { ...part.box.size };
  const edges = { ...part.edges };
  const extend = { ...part.extend };
  for (const side of EDGE_SIDES) {
    const e = ov.edges?.[side];
    if (!e) continue;
    if (e.thickness !== undefined) edges[side] = e.thickness;
    if (e.extend) {
      const g = sideGeometry(part.axes, side);
      if (size[g.axis] + e.extend < 1) {
        warnings.push(`${name}: укорочение ${side} на ${-e.extend} мм больше самой детали`);
        continue;
      }
      if (g.at === 'min') min[g.axis] -= e.extend;
      size[g.axis] = round(size[g.axis] + e.extend);
      extend[side] = e.extend;
    }
  }

  const grainAxis = ov.grain === 'long' ? part.axes.long : ov.grain === 'short' ? part.axes.short : part.grainAxis;
  const shaped: Part = {
    ...part,
    name,
    materialId,
    box: { min: { x: round(min.x), y: round(min.y), z: round(min.z) }, size },
    grainAxis,
    cut: cutOf(size, part.axes, grainAxis),
    edges,
    extend,
    overridden: true,
  };

  const grooves = (ov.grooves ?? []).filter((gr) => {
    const across = shaped.box.size[sideGeometry(part.axes, gr.side).axis];
    const length = sideLength(shaped, gr.side) - gr.insetStart - gr.insetEnd;
    const problem =
      gr.depth <= 0 || gr.width <= 0 || gr.offset < 0 || gr.insetStart < 0 || gr.insetEnd < 0
        ? 'размеры должны быть положительными'
        : gr.depth >= part.thickness
          ? `глубина ${gr.depth} мм не меньше толщины ${part.thickness} мм — паз прорежет деталь насквозь`
          : gr.offset + gr.width > across
            ? `паз выходит за деталь: отступ ${gr.offset} + ширина ${gr.width} > ${across} мм`
            : length <= 0
              ? 'отступы по краям съели всю длину паза'
              : null;
    if (problem) warnings.push(`${name}, паз от ${gr.side}: ${problem}`);
    return problem === null;
  });

  return { part: { ...shaped, grooves }, warnings };
}

// Применяет правки ко всем деталям модуля. Фурнитура и ручки удалённых деталей тоже уходят из сметы и сцены.
export function applyModuleOverrides(
  a: Assembly,
  overrides: Record<string, PartOverride>,
  materials: Map<string, MaterialDef>,
): Assembly {
  const parts: Part[] = [];
  const deletedParts: Assembly['deletedParts'] = [];
  const warnings = [...a.warnings];
  for (const p of a.parts) {
    const ov = overrides[p.key];
    const r = applyOverride(p, ov, materials);
    warnings.push(...r.warnings);
    if (r.part) parts.push(r.part);
    else deletedParts.push({ key: p.key, name: ov?.name?.trim() || p.name });
  }
  const gone = new Set(deletedParts.map((d) => d.key));
  return {
    ...a,
    parts,
    deletedParts,
    hardware: a.hardware.filter((h) => !h.partKey || !gone.has(h.partKey)),
    handles: a.handles.filter((h) => !h.partKey || !gone.has(h.partKey)),
    warnings,
  };
}

// Погонаж пазов детали — для сметы и будущей выгрузки на ЧПУ.
export function grooveLength(p: Part): number {
  return p.grooves.reduce((s, g) => s + sideLength(p, g.side) - g.insetStart - g.insetEnd, 0);
}
