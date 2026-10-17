import { describe, expect, it } from 'vitest';
import { assembleCabinet, computeInnerSpace } from './CabinetAssembler';
import { distributeShelves } from './ShelfEngine';
import { selectRunnerLength } from './DrawerEngine';
import { DEFAULT_NORMS, normValues } from '../config/norms';
import { DEFAULT_MATERIALS } from '../config/catalog';
import { calculateBom } from '../../production/BomCalculator';
import type { FurnitureModule, Part, PartRole } from '../../types/cad.types';

const N = normValues(DEFAULT_NORMS);
const MATS = new Map(DEFAULT_MATERIALS.map((m) => [m.id, m]));
const T = 16;

function mod(over: {
  dimensions?: Partial<FurnitureModule['dimensions']>;
  plinth?: Partial<FurnitureModule['plinth']>;
  construction?: Partial<FurnitureModule['construction']>;
  shelves?: FurnitureModule['subdivisions']['shelves'];
} = {}): FurnitureModule {
  return {
    id: 'm1',
    name: 'Тумба',
    type: 'base_cabinet',
    transform: { x: 0, y: 0, z: 0, rotationY: 0 },
    dimensions: { width: 400, height: 720, depth: 500, ...over.dimensions },
    plinth: { height: 100, setback: 0, ...over.plinth },
    construction: {
      topType: 'overlay',
      bottomType: 'overlay',
      backType: 'groove_hdf',
      connectorType: 'minifix',
      leftSideToFloor: false,
      rightSideToFloor: false,
      ...over.construction,
    },
    materials: {
      carcassMaterialId: 'egger-u708-16',
      backMaterialId: 'hdf-white-3',
      facadeMaterialId: 'mdf-veneer-oak-19',
      plinthMaterialId: 'egger-u708-16',
    },
    subdivisions: { shelves: over.shelves ?? [], doors: [], drawers: [] },
    partOverrides: {},
  };
}

const part = (parts: Part[], role: PartRole): Part => {
  const p = parts.find((x) => x.role === role);
  if (!p) throw new Error(`нет детали ${role}`);
  return p;
};

describe('Боковины', () => {
  it('накладные крыша и дно: H − цоколь − 2T', () => {
    const { parts } = assembleCabinet(mod(), MATS, N);
    expect(part(parts, 'side_left').box.size.y).toBe(720 - 100 - 2 * T);
    expect(part(parts, 'side_left').box.min.y).toBe(100 + T);
  });

  it('вкладные крыша и дно: H − цоколь', () => {
    const { parts } = assembleCabinet(mod({ construction: { topType: 'insert', bottomType: 'insert' } }), MATS, N);
    expect(part(parts, 'side_right').box.size.y).toBe(720 - 100);
  });

  it('левая боковина до пола удлиняется на высоту цоколя, цоколь короче на T', () => {
    const { parts } = assembleCabinet(
      mod({ construction: { topType: 'insert', bottomType: 'insert', leftSideToFloor: true } }),
      MATS,
      N,
    );
    expect(part(parts, 'side_left').box.size.y).toBe(720 - 100 + 100);
    expect(part(parts, 'side_left').box.min.y).toBe(0);
    expect(part(parts, 'plinth_front').box.size.x).toBe(400 - T);
    expect(part(parts, 'plinth_front').box.min.x).toBe(T);
  });

  it('при боковине до пола накладное дно с этой стороны становится вкладным', () => {
    const { parts } = assembleCabinet(mod({ construction: { rightSideToFloor: true } }), MATS, N);
    const bottom = part(parts, 'bottom');
    expect(bottom.box.min.x).toBe(0);
    expect(bottom.box.size.x).toBe(400 - T);
  });

  it('волокна боковины вертикальные, кромка по передней длинной стороне', () => {
    const side = part(assembleCabinet(mod(), MATS, N).parts, 'side_left');
    expect(side.grainAxis).toBe('y');
    expect(side.cut).toEqual({ length: 720 - 100 - 2 * T, width: 500 });
    expect(side.edges).toEqual({ L1: N.edgeThickness, L2: 0, W1: 0, W2: 0 });
  });
});

describe('Горизонты', () => {
  it('накладная крыша на всю ширину, вкладная — W − 2T', () => {
    expect(part(assembleCabinet(mod(), MATS, N).parts, 'top').box.size.x).toBe(400);
    expect(
      part(assembleCabinet(mod({ construction: { topType: 'insert' } }), MATS, N).parts, 'top').box.size.x,
    ).toBe(400 - 2 * T);
  });

  it('без крыши детали крыши нет', () => {
    const { parts } = assembleCabinet(mod({ construction: { topType: 'none' } }), MATS, N);
    expect(parts.some((p) => p.role === 'top')).toBe(false);
  });
});

describe('Задняя стенка ХДФ в паз', () => {
  it('ширина = W − 2T + 2·8 − 2·зазор, отступ паза 16 мм', () => {
    const back = part(assembleCabinet(mod(), MATS, N).parts, 'back');
    expect(back.box.size.x).toBe(400 - 2 * T + 2 * 8 - 2 * N.hdfClearancePerSide);
    expect(back.box.min.z).toBe(16);
    expect(back.thickness).toBe(3);
  });

  it('высота заходит в пазы крыши и дна', () => {
    const back = part(assembleCabinet(mod(), MATS, N).parts, 'back');
    const innerH = 720 - 100 - 2 * T;
    expect(back.box.size.y).toBe(innerH + 2 * 8 - 2 * N.hdfClearancePerSide);
  });

  it('внутренняя глубина считается от ХДФ: 500 − (16 + 3)', () => {
    const inner = computeInnerSpace(mod(), MATS, N);
    expect(inner.z1 - inner.z0).toBe(481);
  });
});

describe('Направляющие ящиков', () => {
  it('стол глубиной 500 мм: телескоп 450, 500 не входит (пример из ТЗ)', () => {
    const inner = computeInnerSpace(mod({ dimensions: { depth: 500 } }), MATS, N);
    expect(selectRunnerLength(inner.z1 - inner.z0, N)).toBe(450);
  });

  it('глубина 400: телескоп 350', () => {
    const inner = computeInnerSpace(mod({ dimensions: { depth: 400 } }), MATS, N);
    expect(selectRunnerLength(inner.z1 - inner.z0, N)).toBe(350);
  });

  it('слишком мелкий корпус: направляющая не подбирается', () => {
    expect(selectRunnerLength(250, N)).toBeNull();
  });
});

describe('Полки', () => {
  it('две полки без замка делят проём на три равные части', () => {
    const r = distributeShelves(1000, T, [
      { id: 'a', lockedGapBelow: null },
      { id: 'b', lockedGapBelow: null },
    ]);
    const g = (1000 - 2 * T) / 3;
    expect(r.gaps[0]).toBeCloseTo(g, 1);
    expect(r.gaps[2]).toBeCloseTo(g, 1);
    expect(r.warnings).toEqual([]);
  });

  it('замок проёма 800 мм: полка на 800, остаток над ней', () => {
    const r = distributeShelves(1000, T, [{ id: 'a', lockedGapBelow: 800 }]);
    expect(r.elevations).toEqual([800]);
    expect(r.gaps).toEqual([800, 1000 - 800 - T]);
  });

  it('замок плюс свободные полки: остаток делится поровну', () => {
    const r = distributeShelves(2000, T, [
      { id: 'a', lockedGapBelow: 800 },
      { id: 'b', lockedGapBelow: null },
    ]);
    const free = (2000 - 800 - 2 * T) / 2;
    expect(r.gaps[1]).toBeCloseTo(free, 1);
    expect(r.gaps[2]).toBeCloseTo(free, 1);
  });

  it('не помещаются — предупреждение', () => {
    const r = distributeShelves(500, T, [{ id: 'a', lockedGapBelow: 800 }]);
    expect(r.warnings.length).toBe(1);
  });

  it('полки в корпусе стоят между боковинами и от ХДФ до фасада', () => {
    const { parts } = assembleCabinet(mod({ shelves: [{ id: 's', lockedGapBelow: null }] }), MATS, N);
    const shelf = part(parts, 'shelf');
    expect(shelf.box.size.x).toBe(400 - 2 * T);
    expect(shelf.box.size.z).toBe(481);
  });
});

describe('Смета материалов', () => {
  it('площадь с коэффициентом 1.15 и кромка по передним кромкам', () => {
    const { parts } = assembleCabinet(mod({ plinth: { height: 0 } }), MATS, N);
    const bom = calculateBom(parts, MATS, N);
    const ldsp = bom.lines.find((l) => l.materialId === 'egger-u708-16');
    if (!ldsp) throw new Error('нет ЛДСП');
    const sideH = 720 - 2 * T;
    const net = (2 * sideH * 500 + 2 * 400 * 500) / 1e6;
    expect(ldsp.netAreaM2).toBeCloseTo(net, 3);
    expect(ldsp.grossAreaM2).toBeCloseTo(net * 1.15, 3);
    expect(ldsp.edgingM).toBeCloseTo((2 * sideH + 2 * 400) / 1000, 2);
    expect(bom.totalCostRub).toBeNull();
  });
});

describe('Защита от невозможных габаритов', () => {
  it('ширина меньше 2T — предупреждение и нет деталей', () => {
    const r = assembleCabinet(mod({ dimensions: { width: 20 } }), MATS, N);
    expect(r.parts).toEqual([]);
    expect(r.warnings.length).toBe(1);
  });
});
