import type { Assembly, Axis, FurnitureModule, MaterialDef, Part, PartRole, Vec3 } from '../../types/cad.types';
import type { NormValues } from '../config/norms';
import { distributeShelves } from './ShelfEngine';

export interface InnerSpace {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}

const PART_NAMES: Record<PartRole, string> = {
  side_left: 'Боковина левая',
  side_right: 'Боковина правая',
  top: 'Крыша',
  bottom: 'Дно',
  back: 'Задняя стенка',
  plinth_front: 'Цоколь',
  shelf: 'Полка',
};

// Ось, вдоль которой у детали идёт текстура. Для ХДФ без рисунка — вдоль длинной стороны.
const GRAIN_AXIS: Record<PartRole, Axis | null> = {
  side_left: 'y',
  side_right: 'y',
  top: 'x',
  bottom: 'x',
  back: null,
  plinth_front: 'x',
  shelf: 'x',
};

// Детали с облицованной передней кромкой.
const FRONT_EDGED: ReadonlySet<PartRole> = new Set(['side_left', 'side_right', 'top', 'bottom', 'shelf']);

const round = (v: number) => Math.round(v * 10) / 10;

function thicknessAxis(size: Vec3): Axis {
  if (size.x <= size.y && size.x <= size.z) return 'x';
  if (size.y <= size.z) return 'y';
  return 'z';
}

function makePart(
  moduleId: string,
  role: PartRole,
  index: number,
  materialId: string,
  min: Vec3,
  max: Vec3,
): Part {
  const size = { x: round(max.x - min.x), y: round(max.y - min.y), z: round(max.z - min.z) };
  const tAxis = thicknessAxis(size);
  const faceAxes = (['x', 'y', 'z'] as Axis[]).filter((a) => a !== tAxis) as [Axis, Axis];
  const fixedGrain = GRAIN_AXIS[role];
  const grainAxis: Axis =
    fixedGrain && fixedGrain !== tAxis ? fixedGrain : size[faceAxes[0]] >= size[faceAxes[1]] ? faceAxes[0] : faceAxes[1];
  const crossAxis = faceAxes[0] === grainAxis ? faceAxes[1] : faceAxes[0];

  // Передняя кромка лежит в плоскости z = max.z и тянется вдоль оси, отличной от z и от оси толщины.
  let edging = { length: 0, width: 0 };
  if (FRONT_EDGED.has(role) && tAxis !== 'z') {
    const frontEdgeAxis = faceAxes.find((a) => a !== 'z');
    edging = frontEdgeAxis === grainAxis ? { length: 1, width: 0 } : { length: 0, width: 1 };
  }

  const suffix = role === 'shelf' ? ` ${index + 1}` : '';
  return {
    id: `${moduleId}:${role}${role === 'shelf' ? `:${index}` : ''}`,
    moduleId,
    role,
    name: PART_NAMES[role] + suffix,
    materialId,
    thickness: size[tAxis],
    box: { min: { x: round(min.x), y: round(min.y), z: round(min.z) }, size },
    cut: { length: size[grainAxis], width: size[crossAxis] },
    grainAxis,
    edging,
  };
}

function thicknessOf(materials: Map<string, MaterialDef>, id: string, fallback: number): number {
  return materials.get(id)?.thickness ?? fallback;
}

export function computeInnerSpace(m: FurnitureModule, materials: Map<string, MaterialDef>, n: NormValues): InnerSpace {
  const { width: W, height: H, depth: D } = m.dimensions;
  const T = thicknessOf(materials, m.materials.carcassMaterialId, 16);
  const Tb = thicknessOf(materials, m.materials.backMaterialId, 3);
  const P = m.plinth.height;
  const c = m.construction;

  const z0 =
    c.backType === 'groove_hdf' ? n.hdfGrooveOffset + Tb : c.backType === 'insert' ? Tb : 0;
  return {
    x0: T,
    x1: W - T,
    y0: P + T,
    y1: c.topType === 'none' ? H : H - T,
    z0,
    z1: D,
  };
}

export function assembleCabinet(
  m: FurnitureModule,
  materials: Map<string, MaterialDef>,
  n: NormValues,
): Assembly {
  const { width: W, height: H, depth: D } = m.dimensions;
  const c = m.construction;
  const P = m.plinth.height;
  const T = thicknessOf(materials, m.materials.carcassMaterialId, 16);
  const Tb = thicknessOf(materials, m.materials.backMaterialId, 3);
  const Tp = thicknessOf(materials, m.materials.plinthMaterialId, T);
  const carcass = m.materials.carcassMaterialId;
  const parts: Part[] = [];
  const warnings: string[] = [];

  if (W <= 2 * T || D <= 0 || H <= P + 2 * T) {
    warnings.push('Габариты меньше двух толщин плиты: корпус не собирается');
    return { moduleId: m.id, parts, warnings };
  }

  const inner = computeInnerSpace(m, materials, n);

  // Боковины: верх упирается в накладную крышу, низ — в накладное дно или в пол.
  const sideTop = c.topType === 'overlay' ? H - T : H;
  const sideBottom = (toFloor: boolean) => (toFloor ? 0 : c.bottomType === 'overlay' ? P + T : P);
  parts.push(
    makePart(m.id, 'side_left', 0, carcass, { x: 0, y: sideBottom(c.leftSideToFloor), z: 0 }, { x: T, y: sideTop, z: D }),
    makePart(
      m.id,
      'side_right',
      0,
      carcass,
      { x: W - T, y: sideBottom(c.rightSideToFloor), z: 0 },
      { x: W, y: sideTop, z: D },
    ),
  );

  // Крыша
  if (c.topType !== 'none') {
    const [x0, x1] = c.topType === 'overlay' ? [0, W] : [T, W - T];
    parts.push(makePart(m.id, 'top', 0, carcass, { x: x0, y: H - T, z: 0 }, { x: x1, y: H, z: D }));
  }

  // Дно: со стороны боковины, опущенной до пола, всегда вкладное.
  {
    const overlay = c.bottomType === 'overlay';
    const x0 = overlay && !c.leftSideToFloor ? 0 : T;
    const x1 = overlay && !c.rightSideToFloor ? W : W - T;
    parts.push(makePart(m.id, 'bottom', 0, carcass, { x: x0, y: P, z: 0 }, { x: x1, y: P + T, z: D }));
  }

  // Задняя стенка
  const back = m.materials.backMaterialId;
  if (c.backType === 'groove_hdf') {
    // Паз выбран в боковинах и в горизонтах (крыше и дне). Без крыши стенка доходит до верха корпуса.
    const g = n.hdfGrooveDepth;
    const cl = n.hdfClearancePerSide;
    const y0 = inner.y0 - g + cl;
    const y1 = c.topType === 'none' ? H - cl : inner.y1 + g - cl;
    parts.push(
      makePart(
        m.id,
        'back',
        0,
        back,
        { x: T - g + cl, y: y0, z: n.hdfGrooveOffset },
        { x: W - T + g - cl, y: y1, z: n.hdfGrooveOffset + Tb },
      ),
    );
  } else if (c.backType === 'insert') {
    parts.push(makePart(m.id, 'back', 0, back, { x: T, y: inner.y0, z: 0 }, { x: W - T, y: inner.y1, z: Tb }));
  } else if (c.backType === 'overlay') {
    const i = n.overlayBackInset;
    parts.push(makePart(m.id, 'back', 0, back, { x: i, y: P + i, z: -Tb }, { x: W - i, y: H - i, z: 0 }));
  }

  // Цоколь укорачивается на толщину каждой боковины, опущенной до пола.
  if (P > 0) {
    const x0 = c.leftSideToFloor ? T : 0;
    const x1 = c.rightSideToFloor ? W - T : W;
    const zFront = D - m.plinth.setback;
    parts.push(
      makePart(m.id, 'plinth_front', 0, m.materials.plinthMaterialId, { x: x0, y: 0, z: zFront - Tp }, { x: x1, y: P, z: zFront }),
    );
  }

  // Полки
  const shelfLayout = distributeShelves(inner.y1 - inner.y0, T, m.subdivisions.shelves);
  warnings.push(...shelfLayout.warnings);
  shelfLayout.elevations.forEach((e, i) => {
    const y = inner.y0 + e;
    parts.push(makePart(m.id, 'shelf', i, carcass, { x: inner.x0, y, z: inner.z0 }, { x: inner.x1, y: y + T, z: D }));
  });

  return { moduleId: m.id, parts, warnings };
}
