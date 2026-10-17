import { describe, expect, it } from 'vitest';
import { assembleCabinet } from './CabinetAssembler';
import { edgeBox, grooveBox, sideGeometry } from './parts';
import { DEFAULT_NORMS, normValues } from '../config/norms';
import { DEFAULT_MATERIALS } from '../config/catalog';
import { aggregateHardware, calculateBom } from '../../production/BomCalculator';
import { parseProjectFile, serializeProject } from '../../persistence/projectFile';
import type { DoorItem, FurnitureModule, GrooveSpec, Part, PartOverride } from '../../types/cad.types';

// Числа — из протоколов docs/video-analysis/parts/v1-01.md (Детали) и v4-02.md (паз под LED-профиль).
const N = normValues(DEFAULT_NORMS);
const MATS = new Map(DEFAULT_MATERIALS.map((m) => [m.id, m]));
const KNOWN = new Set(MATS.keys());

const door: DoorItem = { id: 'd1', bottomRef: 'bottom', topRef: 'top', mount: 'overlay', leaves: 1, hingeSide: 'left', handle: 'bracket' };

function mod(overrides: Record<string, PartOverride> = {}, extra: Partial<FurnitureModule['subdivisions']> = {}): FurnitureModule {
  return {
    id: 'm1',
    name: 'Модуль 1',
    type: 'base_cabinet',
    transform: { x: 0, y: 0, z: 0, rotationY: 0 },
    dimensions: { width: 600, height: 815, depth: 560 },
    plinth: { height: 0, setback: 0 },
    construction: {
      topType: 'overlay',
      bottomType: 'insert',
      backType: 'groove_hdf',
      connectorType: 'minifix',
      leftSideToFloor: false,
      rightSideToFloor: false,
    },
    materials: {
      carcassMaterialId: 'egger-u708-16',
      backMaterialId: 'hdf-white-3',
      facadeMaterialId: 'mdf-veneer-oak-19',
      plinthMaterialId: 'egger-u708-16',
    },
    subdivisions: { shelves: [{ id: 's1', lockedGapBelow: null }, { id: 's2', lockedGapBelow: null }], doors: [], drawers: [], ...extra },
    partOverrides: overrides,
  };
}

const get = (parts: Part[], key: string) => {
  const p = parts.find((x) => x.key === key);
  if (!p) throw new Error(`нет детали ${key}`);
  return p;
};

describe('Стороны детали L1/L2/W1/W2', () => {
  const side = get(assembleCabinet(mod(), MATS, N).parts, 'side_left');

  it('у боковины L — вдоль высоты, L1 — передний торец, W1 — верхний', () => {
    expect(side.axes).toEqual({ thickness: 'x', long: 'y', short: 'z' });
    expect(sideGeometry(side.axes, 'L1')).toEqual({ axis: 'z', at: 'max', along: 'y' });
    expect(sideGeometry(side.axes, 'W1')).toEqual({ axis: 'y', at: 'max', along: 'z' });
  });

  it('кромка по умолчанию — только передний торец', () => {
    expect(side.edges).toEqual({ L1: N.edgeThickness, L2: 0, W1: 0, W2: 0 });
  });

  it('полоса кромки L1 лежит на переднем торце', () => {
    const b = edgeBox(side, 'L1');
    expect(b.min.z).toBe(560);
    expect(b.size.y).toBe(side.box.size.y);
  });
});

describe('Направление текстуры', () => {
  it('«по ширине» меняет местами длину и ширину распила (видео: 815×560 → 560×815)', () => {
    const before = get(assembleCabinet(mod(), MATS, N).parts, 'side_left').cut;
    const after = get(assembleCabinet(mod({ side_left: { grain: 'short' } }), MATS, N).parts, 'side_left');
    expect(after.cut).toEqual({ length: before.width, width: before.length });
    expect(after.grainAxis).toBe('z');
    expect(after.edges.L1).toBe(N.edgeThickness); // стороны привязаны к геометрии и не переезжают
  });
});

describe('Удлинение стороны', () => {
  it('L1 +30: боковина выступает вперёд, 560 → 590 (видео 02:48), модуль не меняется', () => {
    const p = get(assembleCabinet(mod({ side_left: { edges: { L1: { extend: 30 } } } }), MATS, N).parts, 'side_left');
    expect(p.box.size.z).toBe(590);
    expect(p.box.min.z).toBe(0);
    expect(p.cut.width).toBe(590);
    expect(p.extend.L1).toBe(30);
  });

  it('W2 −16: укорочение снизу сдвигает нижний край вверх', () => {
    const base = get(assembleCabinet(mod(), MATS, N).parts, 'side_left');
    const p = get(assembleCabinet(mod({ side_left: { edges: { W2: { extend: -16 } } } }), MATS, N).parts, 'side_left');
    expect(p.box.min.y).toBe(base.box.min.y + 16);
    expect(p.box.size.y).toBe(base.box.size.y - 16);
  });

  it('укорочение больше детали — предупреждение, деталь не испорчена', () => {
    const a = assembleCabinet(mod({ side_left: { edges: { L1: { extend: -1000 } } } }), MATS, N);
    expect(get(a.parts, 'side_left').box.size.z).toBe(560);
    expect(a.warnings.some((w) => w.includes('укорочение L1'))).toBe(true);
  });
});

describe('Материал отдельной детали', () => {
  it('материал той же толщины применяется только к этой детали (видео 01:02)', () => {
    const a = assembleCabinet(mod({ side_left: { materialId: 'egger-w980-16' } }), MATS, N);
    expect(get(a.parts, 'side_left').materialId).toBe('egger-w980-16');
    expect(get(a.parts, 'side_right').materialId).toBe('egger-u708-16');
    const bom = calculateBom(a.parts, MATS, N);
    expect(bom.lines.find((l) => l.materialId === 'egger-w980-16')?.partCount).toBe(1);
  });

  it('материал другой толщины не применяется: геометрия и смета разошлись бы', () => {
    const a = assembleCabinet(mod({ side_left: { materialId: 'mdf-veneer-oak-19' } }), MATS, N);
    expect(get(a.parts, 'side_left').materialId).toBe('egger-u708-16');
    expect(a.warnings[0]).toContain('не подходит к детали 16 мм');
  });
});

describe('Кромка с толщиной по сторонам', () => {
  it('2 мм на W1 боковины попадает в смету отдельной строкой', () => {
    const a = assembleCabinet(mod({ side_left: { edges: { W1: { thickness: 2 } } } }), MATS, N);
    const p = get(a.parts, 'side_left');
    expect(p.edges.W1).toBe(2);
    const bom = calculateBom(a.parts, MATS, N);
    expect(bom.edging.find((e) => e.thickness === 2)?.meters).toBeCloseTo(560 / 1000, 3);
  });

  it('снятая кромка (0) уходит из сметы', () => {
    const with1 = calculateBom(assembleCabinet(mod(), MATS, N).parts, MATS, N);
    const without = calculateBom(assembleCabinet(mod({ side_left: { edges: { L1: { thickness: 0 } } } }), MATS, N).parts, MATS, N);
    const side = get(assembleCabinet(mod(), MATS, N).parts, 'side_left');
    expect(with1.edging[0]!.meters - without.edging[0]!.meters).toBeCloseTo(side.box.size.y / 1000, 2); // смета в м.п. с точностью до сотых
  });
});

describe('Удаление и восстановление', () => {
  it('удалённая задняя стенка уходит из деталей и сметы, но остаётся в списке удалённых', () => {
    const a = assembleCabinet(mod({ back: { deleted: true } }), MATS, N);
    expect(a.parts.some((p) => p.key === 'back')).toBe(false);
    expect(a.deletedParts).toEqual([{ key: 'back', name: 'Задняя стенка' }]);
    expect(calculateBom(a.parts, MATS, N).lines.some((l) => l.materialId === 'hdf-white-3')).toBe(false);
  });

  it('удалённая дверь забирает с собой петли и ручку (у QDesign цена не менялась)', () => {
    const a = assembleCabinet(mod({ 'door:d1:0': { deleted: true } }, { doors: [door] }), MATS, N);
    expect(a.hardware).toEqual([]);
    expect(a.handles).toEqual([]);
    const b = assembleCabinet(mod({}, { doors: [door] }), MATS, N);
    expect(aggregateHardware(b.hardware).map((h) => h.key).sort()).toEqual(['handle_bracket', 'hinge_overlay']);
  });

  it('восстановление — это просто снятие флага', () => {
    const a = assembleCabinet(mod({ back: { deleted: false } }), MATS, N);
    expect(a.parts.some((p) => p.key === 'back')).toBe(true);
    expect(a.deletedParts).toEqual([]);
  });

  it('правки полки привязаны к её id: удаление соседней полки их не переносит', () => {
    const a = assembleCabinet(mod({ 'shelf:s2': { materialId: 'egger-w980-16' } }), MATS, N);
    expect(get(a.parts, 'shelf:s2').materialId).toBe('egger-w980-16');
    const m = mod({ 'shelf:s2': { materialId: 'egger-w980-16' } });
    m.subdivisions.shelves = [{ id: 's2', lockedGapBelow: null }]; // первую полку удалили
    expect(get(assembleCabinet(m, MATS, N).parts, 'shelf:s2').materialId).toBe('egger-w980-16');
  });
});

describe('Паз под LED-профиль (видео v4 4:22: отступ 40, глубина 8, ширина 16)', () => {
  const led: GrooveSpec = { id: 'g1', side: 'L1', face: 'min', offset: 40, width: 16, depth: 8, insetStart: 0, insetEnd: 0 };

  it('паз снизу полки, в 40 мм от передней кромки, по всей ширине', () => {
    const a = assembleCabinet(mod({ 'shelf:s1': { grooves: [led] } }), MATS, N);
    const shelf = get(a.parts, 'shelf:s1');
    const g = grooveBox(shelf, led);
    const front = shelf.box.min.z + shelf.box.size.z;
    expect(g.min.z).toBe(front - 40 - 16);
    expect(g.size.z).toBe(16);
    expect(g.min.y).toBe(shelf.box.min.y); // нижняя пласть
    expect(g.size.y).toBe(8);
    expect(g.size.x).toBe(shelf.box.size.x);
    expect(calculateBom(a.parts, MATS, N).grooveM).toBeCloseTo(shelf.box.size.x / 1000, 2);
  });

  it('паз глубже толщины не принимается', () => {
    const a = assembleCabinet(mod({ 'shelf:s1': { grooves: [{ ...led, depth: 16 }] } }), MATS, N);
    expect(get(a.parts, 'shelf:s1').grooves).toEqual([]);
    expect(a.warnings[0]).toContain('прорежет деталь насквозь');
  });

  it('паз за пределами детали не принимается', () => {
    const a = assembleCabinet(mod({ 'shelf:s1': { grooves: [{ ...led, offset: 600 }] } }), MATS, N);
    expect(a.warnings[0]).toContain('выходит за деталь');
  });

  it('отступы по краям укорачивают паз', () => {
    const g2 = { ...led, insetStart: 50, insetEnd: 50 };
    const a = assembleCabinet(mod({ 'shelf:s1': { grooves: [g2] } }), MATS, N);
    const shelf = get(a.parts, 'shelf:s1');
    expect(grooveBox(shelf, g2).size.x).toBe(shelf.box.size.x - 100);
  });
});

describe('Файл проекта: правки деталей', () => {
  const project = { id: 'p', name: 'Тест', clientName: '', modules: [mod({ side_left: { grain: 'short', edges: { L1: { thickness: 2, extend: 30 } } } })] };

  it('правки сохраняются и читаются обратно', () => {
    const r = parseProjectFile(serializeProject(project, 1), KNOWN);
    expect(r.ok && r.file.project.modules[0]!.partOverrides.side_left).toEqual({ grain: 'short', edges: { L1: { thickness: 2, extend: 30 } } });
  });

  it('файл версии 1 открывается: правок нет', () => {
    const raw = JSON.parse(serializeProject(project, 1));
    raw.schemaVersion = 1;
    delete raw.project.modules[0].partOverrides;
    const r = parseProjectFile(JSON.stringify(raw), KNOWN);
    expect(r.ok && r.file.project.modules[0]!.partOverrides).toEqual({});
  });

  it('неизвестная сторона кромки — отказ с понятной ошибкой', () => {
    const raw = JSON.parse(serializeProject(project, 1));
    raw.project.modules[0].partOverrides.side_left.edges.X9 = { thickness: 1 };
    const r = parseProjectFile(JSON.stringify(raw), KNOWN);
    expect(!r.ok && r.error).toContain('неизвестная сторона «X9»');
  });
});
