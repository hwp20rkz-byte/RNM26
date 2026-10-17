import { describe, expect, it } from 'vitest';
import { assembleCabinet } from './CabinetAssembler';
import { hingeCount } from './FacadeEngine';
import { DEFAULT_NORMS, normValues } from '../config/norms';
import { DEFAULT_MATERIALS } from '../config/catalog';
import { aggregateHardware, calculateBom } from '../../production/BomCalculator';
import type { DoorItem, DrawerBlock, FurnitureModule, Part } from '../../types/cad.types';

const N = normValues(DEFAULT_NORMS);
const MATS = new Map(DEFAULT_MATERIALS.map((m) => [m.id, m]));
const T = 16;
const TF = 19; // МДФ шпон
const W = 400;
const H = 720;
const P = 100;
const D = 500;

const door = (over: Partial<DoorItem> = {}): DoorItem => ({
  id: 'd1',
  bottomRef: 'bottom',
  topRef: 'top',
  mount: 'overlay',
  leaves: 1,
  hingeSide: 'left',
  handle: 'none',
  ...over,
});

const drawers = (over: Partial<DrawerBlock> = {}): DrawerBlock => ({
  id: 'b1',
  bottomRef: 'bottom',
  topRef: 'top',
  count: 3,
  mount: 'overlay',
  runnerType: 'telescopic',
  handle: 'none',
  ...over,
});

function mod(sub: Partial<FurnitureModule['subdivisions']> = {}, over: Partial<FurnitureModule> = {}): FurnitureModule {
  return {
    id: 'm1',
    name: 'Тумба',
    type: 'base_cabinet',
    transform: { x: 0, y: 0, z: 0, rotationY: 0 },
    dimensions: { width: W, height: H, depth: D },
    plinth: { height: P, setback: 0 },
    construction: {
      topType: 'overlay',
      bottomType: 'overlay',
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
    subdivisions: { shelves: [], doors: [], drawers: [], ...sub },
    partOverrides: {},
    ...over,
  };
}

const facades = (parts: Part[], role: Part['role']) => parts.filter((p) => p.role === role);
const top = (p: Part) => p.box.min.y + p.box.size.y;
const right = (p: Part) => p.box.min.x + p.box.size.x;

describe('Накладная дверь', () => {
  const a = assembleCabinet(mod({ doors: [door()] }), MATS, N);
  const d = facades(a.parts, 'door')[0]!;

  it('сверху 3 мм до крыши (ТЗ)', () => {
    expect(top(d)).toBe(H - 3);
  });

  it('по бокам по 1,5 мм, ширина W − 3', () => {
    expect(d.box.min.x).toBe(1.5);
    expect(d.box.size.x).toBe(W - 3);
  });

  it('снизу 1,5 мм от низа дна, стоит перед корпусом', () => {
    expect(d.box.min.y).toBe(P + 1.5);
    expect(d.box.min.z).toBe(D);
    expect(d.thickness).toBe(TF);
  });

  it('облицована по всем четырём кромкам, волокна вертикальные', () => {
    expect(d.edges).toEqual({ L1: N.edgeThickness, L2: N.edgeThickness, W1: N.edgeThickness, W2: N.edgeThickness });
    expect(d.grainAxis).toBe('y');
  });

  it('петли по высоте и Tip-On без ручки', () => {
    expect(a.hardware).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'hinge_overlay', name: 'Петля накладная', unit: 'шт', qty: 2, partKey: 'door:d1:0' }),
        expect.objectContaining({ key: 'tip_on', name: 'Толкатель Tip-On', unit: 'шт', qty: 1, partKey: 'door:d1:0' }),
      ]),
    );
    expect(a.warnings).toEqual([]);
  });
});

describe('Межфасадный зазор 3 мм (ТЗ)', () => {
  it('две створки: (W − 1,5 − 3 − 1,5) / 2, между ними 3 мм', () => {
    const [l, r] = facades(assembleCabinet(mod({ doors: [door({ leaves: 2 })] }), MATS, N).parts, 'door');
    expect(l!.box.size.x).toBe((W - 6) / 2);
    expect(r!.box.min.x - right(l!)).toBe(3);
    expect(l!.name).toContain('петли слева');
    expect(r!.name).toContain('петли справа');
  });

  it('двери над полкой и под полкой: 3 мм, по центру полки', () => {
    const a = assembleCabinet(
      mod({
        shelves: [{ id: 's1', lockedGapBelow: 300 }],
        doors: [door({ id: 'lo', topRef: 's1' }), door({ id: 'hi', bottomRef: 's1' })],
      }),
      MATS,
      N,
    );
    const [lo, hi] = facades(a.parts, 'door');
    const shelfMid = P + T + 300 + T / 2;
    expect(hi!.box.min.y - top(lo!)).toBe(3);
    expect((top(lo!) + hi!.box.min.y) / 2).toBe(shelfMid);
    expect(a.warnings).toEqual([]);
  });

  it('соседние модули вплотную: между фасадами 3 мм', () => {
    const left = assembleCabinet(mod({ doors: [door()] }), MATS, N);
    const rightMod = assembleCabinet(mod({ doors: [door()] }, { id: 'm2', transform: { x: W, y: 0, z: 0, rotationY: 0 } }), MATS, N);
    const a = facades(left.parts, 'door')[0]!;
    const b = facades(rightMod.parts, 'door')[0]!;
    expect(W + b.box.min.x - right(a)).toBe(3);
  });
});

describe('Вкладная дверь', () => {
  it('внутри проёма с зазором по периметру, полки утоплены на толщину фасада', () => {
    const a = assembleCabinet(mod({ shelves: [{ id: 's1', lockedGapBelow: null }], doors: [door({ mount: 'insert' })] }), MATS, N);
    const d = facades(a.parts, 'door')[0]!;
    const g = N.insertFacadeGap;
    expect(d.box.size.x).toBe(W - 2 * T - 2 * g);
    expect(d.box.min.y).toBe(P + T + g);
    expect(top(d)).toBe(H - T - g);
    expect(d.box.min.z).toBe(D - TF);
    const shelf = a.parts.find((p) => p.role === 'shelf')!;
    expect(shelf.box.min.z + shelf.box.size.z).toBe(D - TF);
    expect(a.hardware.find((h) => h.key === 'hinge_insert')?.qty).toBe(2);
  });
});

describe('Число петель', () => {
  it('по таблице высот', () => {
    expect(hingeCount(615, N.hingeCountByHeight)).toBe(2);
    expect(hingeCount(1200, N.hingeCountByHeight)).toBe(3);
    expect(hingeCount(2000, N.hingeCountByHeight)).toBe(4);
    expect(hingeCount(2500, N.hingeCountByHeight)).toBeNull();
  });
});

describe('Ящики Push-to-Open', () => {
  const a = assembleCabinet(mod({ drawers: [drawers()] }), MATS, N);
  const fs = facades(a.parts, 'drawer_facade');

  it('нижняя кромка поднята на 25 мм над низом корпуса (ТЗ)', () => {
    expect(fs[0]!.box.min.y).toBe(P + 25);
  });

  it('три равных фасада с зазором 3 мм, верхний — 3 мм до крыши', () => {
    const h = (H - 3 - (P + 25) - 2 * 3) / 3;
    fs.forEach((f) => expect(f.box.size.y).toBeCloseTo(h, 1));
    expect(fs[1]!.box.min.y - top(fs[0]!)).toBeCloseTo(3, 1);
    expect(top(fs[2]!)).toBeCloseTo(H - 3, 1);
  });

  it('волокна фасада ящика горизонтальные', () => {
    expect(fs[0]!.grainAxis).toBe('x');
  });

  it('стол глубиной 500: направляющие 450 Push-to-Open, по комплекту на ящик', () => {
    expect(a.hardware).toEqual([
      {
        key: 'runner_telescopic_450_pto',
        name: 'Направляющие шариковые полного выдвижения 450 мм, Push-to-Open',
        unit: 'компл.',
        qty: 1,
      },
      expect.objectContaining({ qty: 1 }),
      expect.objectContaining({ qty: 1 }),
    ]);
    expect(aggregateHardware(a.hardware)).toEqual([expect.objectContaining({ key: 'runner_telescopic_450_pto', qty: 3 })]);
  });

  it('короб: ширина проёма минус место под направляющие, глубина = длина направляющей', () => {
    const sides = a.parts.filter((p) => p.role === 'drawer_side');
    const bottom = a.parts.find((p) => p.role === 'drawer_bottom')!;
    expect(bottom.box.size.x).toBe(W - 2 * T - 2 * 13);
    expect(bottom.box.size.z).toBe(450);
    expect(sides).toHaveLength(6);
    expect(sides[0]!.edges).toEqual({ L1: N.edgeThickness, L2: 0, W1: 0, W2: 0 }); // верхний торец бока ящика (длинная сторона)
  });

  it('короб не выходит за горизонты корпуса и ниже фасада на 40 мм', () => {
    const boxParts = a.parts.filter((p) => p.role.startsWith('drawer_') && p.role !== 'drawer_facade');
    boxParts.forEach((p) => {
      expect(p.box.min.y).toBeGreaterThanOrEqual(P + T);
      expect(top(p)).toBeLessThanOrEqual(H - T);
    });
    const firstBottom = a.parts.find((p) => p.role === 'drawer_bottom')!;
    const firstSide = a.parts.find((p) => p.role === 'drawer_side')!;
    expect(top(firstSide) - firstBottom.box.min.y).toBeCloseTo(fs[0]!.box.size.y - 40, 1);
  });

  it('с ручкой нижняя кромка обычная (1,5 мм), направляющие без Push-to-Open', () => {
    const b = assembleCabinet(mod({ drawers: [drawers({ handle: 'bracket' })] }), MATS, N);
    expect(facades(b.parts, 'drawer_facade')[0]!.box.min.y).toBe(P + 1.5);
    expect(aggregateHardware(b.hardware)).toEqual([
      expect.objectContaining({ key: 'runner_telescopic_450', qty: 3 }),
      { key: 'handle_bracket', name: 'Ручка-скоба', unit: 'шт', qty: 3 },
    ]);
    expect(b.handles).toHaveLength(3);
  });
});

describe('Подбор направляющих для ящиков', () => {
  it('скрытые направляющие: короб уже на 2 × 5 мм', () => {
    const a = assembleCabinet(mod({ drawers: [drawers({ runnerType: 'concealed_tandem' })] }), MATS, N);
    expect(a.parts.find((p) => p.role === 'drawer_bottom')!.box.size.x).toBe(W - 2 * T - 10);
  });

  it('вкладной фасад съедает глубину: в корпус 480 ставится 400 вместо 450', () => {
    const over = assembleCabinet(mod({ drawers: [drawers()] }, { dimensions: { width: W, height: H, depth: 480 } }), MATS, N);
    const ins = assembleCabinet(
      mod({ drawers: [drawers({ mount: 'insert' })] }, { dimensions: { width: W, height: H, depth: 480 } }),
      MATS,
      N,
    );
    expect(over.parts.find((p) => p.role === 'drawer_bottom')!.box.size.z).toBe(450);
    expect(ins.parts.find((p) => p.role === 'drawer_bottom')!.box.size.z).toBe(400);
  });

  it('мелкий корпус: предупреждение и без ящиков', () => {
    const a = assembleCabinet(mod({ drawers: [drawers()] }, { dimensions: { width: W, height: H, depth: 300 } }), MATS, N);
    expect(facades(a.parts, 'drawer_facade')).toHaveLength(0);
    expect(a.warnings[0]).toContain('направляющая не помещается');
  });
});

describe('Ошибки компоновки', () => {
  it('дверь и ящики в одном проёме — перекрытие фасадов', () => {
    const a = assembleCabinet(mod({ doors: [door()], drawers: [drawers()] }), MATS, N);
    expect(a.warnings.some((w) => w.startsWith('Фасады перекрываются'))).toBe(true);
  });

  it('полка внутри зоны ящиков', () => {
    const a = assembleCabinet(mod({ shelves: [{ id: 's1', lockedGapBelow: null }], drawers: [drawers()] }), MATS, N);
    expect(a.warnings.some((w) => w.includes('в проёме стоит полка 1'))).toBe(true);
  });

  it('верх ниже низа', () => {
    const a = assembleCabinet(
      mod({ shelves: [{ id: 's1', lockedGapBelow: null }], doors: [door({ bottomRef: 's1', topRef: 'bottom' })] }),
      MATS,
      N,
    );
    expect(a.warnings[0]).toContain('ниже нижней');
  });

  it('ссылка на удалённую полку', () => {
    const a = assembleCabinet(mod({ doors: [door({ topRef: 'нет-такой' })] }), MATS, N);
    expect(a.warnings[0]).toContain('удалённую полку');
  });
});

describe('Смета', () => {
  it('кромка двери по периметру', () => {
    const a = assembleCabinet(mod({ doors: [door()] }), MATS, N);
    const bom = calculateBom(a.parts, MATS, N);
    const mdf = bom.lines.find((l) => l.materialId === 'mdf-veneer-oak-19')!;
    const d = facades(a.parts, 'door')[0]!;
    expect(mdf.edgingM).toBeCloseTo((2 * d.cut.length + 2 * d.cut.width) / 1000, 2);
  });
});
