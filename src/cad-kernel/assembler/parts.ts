import { EDGE_SIDES, type Axis, type EdgeSide, type GrooveSpec, type Part, type PartRole, type Vec3 } from '../../types/cad.types';

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

// Какие кромки облицованы по умолчанию: передняя, верхняя, все четыре или ни одной.
export type EdgeSpec = 'front' | 'top' | 'all' | 'none';

export const round = (v: number) => Math.round(v * 10) / 10;

function thicknessAxis(size: Vec3): Axis {
  if (size.x <= size.y && size.x <= size.z) return 'x';
  if (size.y <= size.z) return 'y';
  return 'z';
}

// Где лежит сторона детали: на какой оси (axis), с какого края (at) и вдоль какой оси тянется (along).
// L — вдоль длинной оси, лежит на короткой; W — наоборот. «1» — передняя (z), верхняя (y) или левая (x).
export interface SideGeometry {
  axis: Axis;
  at: 'min' | 'max';
  along: Axis;
}

export function sideGeometry(axes: Part['axes'], side: EdgeSide): SideGeometry {
  const isL = side.startsWith('L');
  const axis = isL ? axes.short : axes.long;
  const along = isL ? axes.long : axes.short;
  const firstAt = axis === 'x' ? 'min' : 'max';
  const at = side.endsWith('1') ? firstAt : firstAt === 'min' ? 'max' : 'min';
  return { axis, at, along };
}

export const sideLength = (p: Pick<Part, 'axes' | 'box'>, side: EdgeSide) => p.box.size[sideGeometry(p.axes, side).along];

export function cutOf(size: Vec3, axes: Part['axes'], grainAxis: Axis): Part['cut'] {
  const cross = grainAxis === axes.long ? axes.short : axes.long;
  return { length: size[grainAxis], width: size[cross] };
}

export interface PartInput {
  moduleId: string;
  role: PartRole;
  key: string; // уникален в пределах модуля и не зависит от порядка
  name: string;
  materialId: string;
  min: Vec3;
  max: Vec3;
  edges: EdgeSpec;
  edgeThickness: number; // толщина кромки по нормам цеха
}

const noSides = (): Record<EdgeSide, number> => ({ L1: 0, L2: 0, W1: 0, W2: 0 });

export function makePart(p: PartInput): Part {
  const { min, max } = p;
  const size = { x: round(max.x - min.x), y: round(max.y - min.y), z: round(max.z - min.z) };
  const tAxis = thicknessAxis(size);
  const [a, b] = (['x', 'y', 'z'] as Axis[]).filter((x) => x !== tAxis) as [Axis, Axis];
  const fixedGrain = GRAIN_AXIS[p.role];
  // При равных сторонах длинной считаем ту, вдоль которой идут волокна.
  const aLonger = size[a] > size[b] || (size[a] === size[b] && fixedGrain !== b);
  const axes = { thickness: tAxis, long: aLonger ? a : b, short: aLonger ? b : a };
  const grainAxis: Axis = fixedGrain && fixedGrain !== tAxis ? fixedGrain : axes.long;

  const edges = noSides();
  for (const side of EDGE_SIDES) {
    const g = sideGeometry(axes, side);
    const banded =
      p.edges === 'all' ||
      (p.edges === 'front' && g.axis === 'z' && g.at === 'max') ||
      (p.edges === 'top' && g.axis === 'y' && g.at === 'max');
    if (banded) edges[side] = p.edgeThickness;
  }

  return {
    id: `${p.moduleId}:${p.key}`,
    key: p.key,
    moduleId: p.moduleId,
    role: p.role,
    name: p.name,
    materialId: p.materialId,
    thickness: size[tAxis],
    box: { min: { x: round(min.x), y: round(min.y), z: round(min.z) }, size },
    cut: cutOf(size, axes, grainAxis),
    grainAxis,
    axes,
    edges,
    extend: noSides(),
    grooves: [],
    overridden: false,
  };
}

type Box = Part['box'];

// Полоса кромки на торце детали — для показа в 3D.
export function edgeBox(p: Pick<Part, 'axes' | 'box'>, side: EdgeSide, visual = 1.5): Box {
  const g = sideGeometry(p.axes, side);
  const min = { ...p.box.min };
  const size = { ...p.box.size };
  if (g.at === 'max') min[g.axis] = p.box.min[g.axis] + p.box.size[g.axis];
  else min[g.axis] = p.box.min[g.axis] - visual;
  size[g.axis] = visual;
  return { min, size };
}

// Тело паза в координатах модуля — для 3D и будущей выгрузки на ЧПУ.
export function grooveBox(p: Pick<Part, 'axes' | 'box'>, gr: GrooveSpec): Box {
  const g = sideGeometry(p.axes, gr.side);
  const t = p.axes.thickness;
  const min = { ...p.box.min };
  const size = { ...p.box.size };

  min[g.along] = p.box.min[g.along] + gr.insetStart;
  size[g.along] = p.box.size[g.along] - gr.insetStart - gr.insetEnd;

  const edgeAt = g.at === 'max' ? p.box.min[g.axis] + p.box.size[g.axis] : p.box.min[g.axis];
  min[g.axis] = g.at === 'max' ? edgeAt - gr.offset - gr.width : edgeAt + gr.offset;
  size[g.axis] = gr.width;

  min[t] = gr.face === 'max' ? p.box.min[t] + p.box.size[t] - gr.depth : p.box.min[t];
  size[t] = gr.depth;
  return { min, size };
}
