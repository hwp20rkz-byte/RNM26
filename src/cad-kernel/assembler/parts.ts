import type { Axis, Part, PartRole, Vec3 } from '../../types/cad.types';

// Ось, вдоль которой у детали идёт текстура. null — вдоль длинной стороны (ХДФ без рисунка).
const GRAIN_AXIS: Record<PartRole, Axis | null> = {
  side_left: 'y',
  side_right: 'y',
  top: 'x',
  bottom: 'x',
  back: null,
  plinth_front: 'x',
  shelf: 'x',
  door: 'y',
  drawer_facade: 'x',
  drawer_side: 'z',
  drawer_front: 'x',
  drawer_back: 'x',
  drawer_bottom: null,
};

// Какие кромки облицованы: передняя, верхняя, все четыре или ни одной.
export type EdgeSpec = 'front' | 'top' | 'all' | 'none';

export const round = (v: number) => Math.round(v * 10) / 10;

function thicknessAxis(size: Vec3): Axis {
  if (size.x <= size.y && size.x <= size.z) return 'x';
  if (size.y <= size.z) return 'y';
  return 'z';
}

export interface PartInput {
  moduleId: string;
  role: PartRole;
  key: string; // уникален в пределах модуля
  name: string;
  materialId: string;
  min: Vec3;
  max: Vec3;
  edges: EdgeSpec;
}

export function makePart(p: PartInput): Part {
  const { min, max } = p;
  const size = { x: round(max.x - min.x), y: round(max.y - min.y), z: round(max.z - min.z) };
  const tAxis = thicknessAxis(size);
  const faceAxes = (['x', 'y', 'z'] as Axis[]).filter((a) => a !== tAxis) as [Axis, Axis];
  const fixedGrain = GRAIN_AXIS[p.role];
  const grainAxis: Axis =
    fixedGrain && fixedGrain !== tAxis ? fixedGrain : size[faceAxes[0]] >= size[faceAxes[1]] ? faceAxes[0] : faceAxes[1];
  const crossAxis = faceAxes[0] === grainAxis ? faceAxes[1] : faceAxes[0];

  // Передняя кромка лежит в плоскости z = max.z, верхняя — в плоскости y = max.y.
  // Кромка тянется вдоль той оси пласти, которая не перпендикулярна этой плоскости.
  const edgeAlong = (normal: Axis) => {
    if (tAxis === normal) return { length: 0, width: 0 };
    const axis = faceAxes.find((a) => a !== normal);
    return axis === grainAxis ? { length: 1, width: 0 } : { length: 0, width: 1 };
  };
  const edging =
    p.edges === 'all'
      ? { length: 2, width: 2 }
      : p.edges === 'front'
        ? edgeAlong('z')
        : p.edges === 'top'
          ? edgeAlong('y')
          : { length: 0, width: 0 };

  return {
    id: `${p.moduleId}:${p.key}`,
    moduleId: p.moduleId,
    role: p.role,
    name: p.name,
    materialId: p.materialId,
    thickness: size[tAxis],
    box: { min: { x: round(min.x), y: round(min.y), z: round(min.z) }, size },
    cut: { length: size[grainAxis], width: size[crossAxis] },
    grainAxis,
    edging,
  };
}
