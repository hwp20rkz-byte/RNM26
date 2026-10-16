import type { BoundaryRef, FurnitureModule, MaterialDef } from '../../types/cad.types';
import type { NormValues } from '../config/norms';

export interface InnerSpace {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}

// Горизонт, ограничивающий проём: нижняя и верхняя пласть по высоте.
export interface Boundary {
  kind: 'bottom' | 'top' | 'shelf';
  y0: number;
  y1: number;
  label: string;
}

export interface ModuleContext {
  m: FurnitureModule;
  n: NormValues;
  W: number;
  H: number;
  D: number;
  P: number;
  T: number; // корпус
  Tb: number; // задняя стенка
  Tf: number; // фасад
  inner: InnerSpace;
  shelfY: Map<string, { y: number; index: number }>; // низ каждой полки
}

export function thicknessOf(materials: Map<string, MaterialDef>, id: string, fallback: number): number {
  return materials.get(id)?.thickness ?? fallback;
}

export function resolveBoundary(ctx: ModuleContext, ref: BoundaryRef): Boundary | null {
  const { m, H, P, T } = ctx;
  if (ref === 'bottom') return { kind: 'bottom', y0: P, y1: P + T, label: 'дно' };
  if (ref === 'top') {
    return m.construction.topType === 'none'
      ? { kind: 'top', y0: H, y1: H, label: 'верх корпуса' }
      : { kind: 'top', y0: H - T, y1: H, label: 'крыша' };
  }
  const s = ctx.shelfY.get(ref);
  return s ? { kind: 'shelf', y0: s.y, y1: s.y + T, label: `полка ${s.index + 1}` } : null;
}

// Полки, лежащие строго между двумя границами проёма.
export function shelvesBetween(ctx: ModuleContext, bottom: Boundary, top: Boundary): number[] {
  return [...ctx.shelfY.values()].filter((s) => s.y > bottom.y0 + 0.1 && s.y < top.y0 - 0.1).map((s) => s.index);
}
