import type { Boundary, ModuleContext } from './context';
import { resolveBoundary } from './context';
import { makePart, round } from './parts';
import type { DoorItem, FacadeMount, HandleType, HandleVisual, HardwareItem, Part, Vec3 } from '../../types/cad.types';

export interface FacadeFrame {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}

export interface FacadeZone {
  frame: FacadeFrame;
  bottom: Boundary;
  top: Boundary;
}

export interface FacadeResult {
  parts: Part[];
  hardware: HardwareItem[];
  handles: HandleVisual[];
  warnings: string[];
}

// Контур проёма под фасад между двумя горизонтами.
// Накладной фасад: сверху 3 мм до крыши (ТЗ), на общей полке и по бокам — по половине зазора,
// чтобы между соседними фасадами и соседними модулями выходило ровно 3 мм.
// Вкладной фасад: внутри проёма с зазором insertFacadeGap по периметру.
export function facadeZone(
  ctx: ModuleContext,
  bottomRef: string,
  topRef: string,
  mount: FacadeMount,
  bottomEdgeOverride?: number,
): FacadeZone | string {
  const bottom = resolveBoundary(ctx, bottomRef);
  const top = resolveBoundary(ctx, topRef);
  if (!bottom || !top) return 'Граница проёма ссылается на удалённую полку';
  if (top.y0 <= bottom.y1) return `Верхняя граница (${top.label}) ниже нижней (${bottom.label})`;

  const { W, D, T, Tf, n } = ctx;
  const half = n.facadeGap / 2;
  if (mount === 'overlay') {
    const y0 = bottomEdgeOverride ?? (bottom.kind === 'shelf' ? (bottom.y0 + bottom.y1) / 2 + half : bottom.y0 + half);
    const y1 = top.kind === 'shelf' ? (top.y0 + top.y1) / 2 - half : top.y1 - n.facadeGap;
    return { frame: { x0: half, x1: W - half, y0, y1, z0: D, z1: D + Tf }, bottom, top };
  }
  const g = n.insertFacadeGap;
  return {
    frame: { x0: T + g, x1: W - T - g, y0: bottom.y1 + g, y1: top.y0 - g, z0: D - Tf, z1: D },
    bottom,
    top,
  };
}

export function hingeCount(height: number, table: [number, number][]): number | null {
  const row = table.find(([h]) => height <= h);
  return row ? row[1] : null;
}

const HANDLE_NAMES: Record<Exclude<HandleType, 'none'>, string> = {
  bracket: 'Ручка-скоба',
  rail: 'Ручка-рейлинг',
  profile: 'Профиль-ручка',
};

// Ручка на фасаде: hardware для сметы и бокс для 3D.
// Для двери ручка у кромки, противоположной петлям; для ящика — по центру.
export function handleFor(
  handle: HandleType,
  f: FacadeFrame,
  orientation: 'vertical' | 'horizontal',
  hingeSide?: 'left' | 'right',
): { hardware: HardwareItem; visual: HandleVisual | null } | null {
  if (handle === 'none') return null;
  const width = f.x1 - f.x0;
  if (handle === 'profile') {
    const visual = { box: { min: { x: f.x0, y: f.y1 - 2, z: f.z1 }, size: { x: width, y: 2, z: 12 } } };
    return {
      hardware: { key: 'handle_profile', name: HANDLE_NAMES.profile, unit: 'м.п.', qty: round(width) / 1000 },
      visual,
    };
  }
  const len = handle === 'rail' ? Math.min(320, (orientation === 'vertical' ? f.y1 - f.y0 : width) * 0.6) : 128;
  const bar = 12;
  const zMin = f.z1;
  let min: Vec3;
  let size: Vec3;
  if (orientation === 'vertical') {
    const x = hingeSide === 'left' ? f.x1 - 40 - bar : f.x0 + 40;
    const yc = (f.y0 + f.y1) / 2;
    min = { x, y: yc - len / 2, z: zMin };
    size = { x: bar, y: len, z: 25 };
  } else {
    const xc = (f.x0 + f.x1) / 2;
    const y = f.y1 - 40 - bar;
    min = { x: xc - len / 2, y: Math.max(f.y0, y), z: zMin };
    size = { x: len, y: bar, z: 25 };
  }
  return {
    hardware: { key: `handle_${handle}`, name: HANDLE_NAMES[handle], unit: 'шт', qty: 1 },
    visual: { box: { min, size } },
  };
}

export function buildDoors(ctx: ModuleContext): FacadeResult {
  const out: FacadeResult = { parts: [], hardware: [], handles: [], warnings: [] };
  const { m, n } = ctx;
  m.subdivisions.doors.forEach((door: DoorItem, di) => {
    const zone = facadeZone(ctx, door.bottomRef, door.topRef, door.mount);
    if (typeof zone === 'string') {
      out.warnings.push(`Дверь ${di + 1}: ${zone}`);
      return;
    }
    const f = zone.frame;
    const height = f.y1 - f.y0;
    const leaves: { x0: number; x1: number; hinge: 'left' | 'right' }[] =
      door.leaves === 2
        ? (() => {
            const mid = (f.x0 + f.x1) / 2;
            const g = n.facadeGap / 2;
            return [
              { x0: f.x0, x1: mid - g, hinge: 'left' as const },
              { x0: mid + g, x1: f.x1, hinge: 'right' as const },
            ];
          })()
        : [{ x0: f.x0, x1: f.x1, hinge: door.hingeSide }];

    const hinges = hingeCount(height, n.hingeCountByHeight);
    if (hinges === null) out.warnings.push(`Дверь ${di + 1}: высота ${round(height)} мм больше таблицы петель`);
    const lastRow = n.hingeCountByHeight[n.hingeCountByHeight.length - 1];

    leaves.forEach((leaf, li) => {
      const hingeLabel = leaf.hinge === 'left' ? 'петли слева' : 'петли справа';
      out.parts.push(
        makePart({
          moduleId: m.id,
          role: 'door',
          key: `door:${door.id}:${li}`,
          name: `Дверь ${di + 1}${leaves.length > 1 ? `.${li + 1}` : ''} (${hingeLabel})`,
          materialId: m.materials.facadeMaterialId,
          min: { x: leaf.x0, y: f.y0, z: f.z0 },
          max: { x: leaf.x1, y: f.y1, z: f.z1 },
          edges: 'all',
        }),
      );
      out.hardware.push({
        key: `hinge_${door.mount}`,
        name: door.mount === 'overlay' ? 'Петля накладная' : 'Петля вкладная',
        unit: 'шт',
        qty: hinges ?? lastRow?.[1] ?? 2,
      });
      if (door.handle === 'none') {
        out.hardware.push({ key: 'tip_on', name: 'Толкатель Tip-On', unit: 'шт', qty: 1 });
      } else {
        const h = handleFor(door.handle, { ...f, x0: leaf.x0, x1: leaf.x1 }, 'vertical', leaf.hinge);
        if (h) {
          out.hardware.push(h.hardware);
          if (h.visual) out.handles.push(h.visual);
        }
      }
    });
  });
  return out;
}

// Фасады одного модуля не должны перекрываться: дверь и ящики в одном проёме — ошибка компоновки.
export function facadeOverlapWarnings(parts: Part[]): string[] {
  const facades = parts.filter((p) => p.role === 'door' || p.role === 'drawer_facade');
  const out: string[] = [];
  for (let i = 0; i < facades.length; i++) {
    for (let j = i + 1; j < facades.length; j++) {
      const a = facades[i]!.box;
      const b = facades[j]!.box;
      const hit = (['x', 'y'] as const).every(
        (k) => a.min[k] < b.min[k] + b.size[k] - 0.5 && b.min[k] < a.min[k] + a.size[k] - 0.5,
      );
      if (hit) out.push(`Фасады перекрываются: ${facades[i]!.name} и ${facades[j]!.name}`);
    }
  }
  return out;
}
