import type { Assembly, FurnitureModule, MaterialDef, Part } from '../../types/cad.types';
import type { NormValues } from '../config/norms';
import { distributeShelves } from './ShelfEngine';
import { buildDoors, facadeOverlapWarnings } from './FacadeEngine';
import { buildDrawers } from './DrawerEngine';
import { thicknessOf, type InnerSpace, type ModuleContext } from './context';
import { makePart } from './parts';
import { applyModuleOverrides } from './overrides';

export type { InnerSpace } from './context';

export function computeInnerSpace(m: FurnitureModule, materials: Map<string, MaterialDef>, n: NormValues): InnerSpace {
  const { width: W, height: H, depth: D } = m.dimensions;
  const T = thicknessOf(materials, m.materials.carcassMaterialId, 16);
  const Tb = thicknessOf(materials, m.materials.backMaterialId, 3);
  const P = m.plinth.height;
  const c = m.construction;

  const z0 = c.backType === 'groove_hdf' ? n.hdfGrooveOffset + Tb : c.backType === 'insert' ? Tb : 0;
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
  const Tf = thicknessOf(materials, m.materials.facadeMaterialId, 19);
  const carcass = m.materials.carcassMaterialId;
  const parts: Part[] = [];
  const warnings: string[] = [];
  const result: Assembly = { moduleId: m.id, parts, hardware: [], handles: [], deletedParts: [], warnings };

  if (W <= 2 * T || D <= 0 || H <= P + 2 * T) {
    warnings.push('Габариты меньше двух толщин плиты: корпус не собирается');
    return result;
  }

  const inner = computeInnerSpace(m, materials, n);
  const part = (role: Part['role'], key: string, name: string, materialId: string, min: Part['box']['min'], max: Part['box']['min'], edges: 'front' | 'none' = 'front') =>
    parts.push(makePart({ moduleId: m.id, role, key, name, materialId, min, max, edges, edgeThickness: n.edgeThickness }));

  // Боковины: верх упирается в накладную крышу, низ — в накладное дно или в пол.
  const sideTop = c.topType === 'overlay' ? H - T : H;
  const sideBottom = (toFloor: boolean) => (toFloor ? 0 : c.bottomType === 'overlay' ? P + T : P);
  part('side_left', 'side_left', 'Боковина левая', carcass, { x: 0, y: sideBottom(c.leftSideToFloor), z: 0 }, { x: T, y: sideTop, z: D });
  part('side_right', 'side_right', 'Боковина правая', carcass, { x: W - T, y: sideBottom(c.rightSideToFloor), z: 0 }, { x: W, y: sideTop, z: D });

  if (c.topType !== 'none') {
    const [x0, x1] = c.topType === 'overlay' ? [0, W] : [T, W - T];
    part('top', 'top', 'Крыша', carcass, { x: x0, y: H - T, z: 0 }, { x: x1, y: H, z: D });
  }

  // Дно: со стороны боковины, опущенной до пола, всегда вкладное.
  {
    const overlay = c.bottomType === 'overlay';
    const x0 = overlay && !c.leftSideToFloor ? 0 : T;
    const x1 = overlay && !c.rightSideToFloor ? W : W - T;
    part('bottom', 'bottom', 'Дно', carcass, { x: x0, y: P, z: 0 }, { x: x1, y: P + T, z: D });
  }

  const back = m.materials.backMaterialId;
  if (c.backType === 'groove_hdf') {
    // Паз выбран в боковинах и в горизонтах (крыше и дне). Без крыши стенка доходит до верха корпуса.
    const g = n.hdfGrooveDepth;
    const cl = n.hdfClearancePerSide;
    const y1 = c.topType === 'none' ? H - cl : inner.y1 + g - cl;
    part('back', 'back', 'Задняя стенка', back, { x: T - g + cl, y: inner.y0 - g + cl, z: n.hdfGrooveOffset }, { x: W - T + g - cl, y: y1, z: n.hdfGrooveOffset + Tb }, 'none');
  } else if (c.backType === 'insert') {
    part('back', 'back', 'Задняя стенка', back, { x: T, y: inner.y0, z: 0 }, { x: W - T, y: inner.y1, z: Tb }, 'none');
  } else if (c.backType === 'overlay') {
    const i = n.overlayBackInset;
    part('back', 'back', 'Задняя стенка', back, { x: i, y: P + i, z: -Tb }, { x: W - i, y: H - i, z: 0 }, 'none');
  }

  // Цоколь укорачивается на толщину каждой боковины, опущенной до пола.
  if (P > 0) {
    const x0 = c.leftSideToFloor ? T : 0;
    const x1 = c.rightSideToFloor ? W - T : W;
    const zFront = D - m.plinth.setback;
    part('plinth_front', 'plinth_front', 'Цоколь', m.materials.plinthMaterialId, { x: x0, y: 0, z: zFront - Tp }, { x: x1, y: P, z: zFront }, 'none');
  }

  // Полки. При вкладных фасадах полки утоплены на толщину фасада, чтобы дверь закрывалась.
  const hasInsertFacade =
    m.subdivisions.doors.some((d) => d.mount === 'insert') || m.subdivisions.drawers.some((d) => d.mount === 'insert');
  const shelfFront = hasInsertFacade ? D - Tf : D;
  const shelfLayout = distributeShelves(inner.y1 - inner.y0, T, m.subdivisions.shelves);
  warnings.push(...shelfLayout.warnings);
  const shelfY = new Map<string, { y: number; index: number }>();
  m.subdivisions.shelves.forEach((sh, i) => {
    const e = shelfLayout.elevations[i];
    if (e === undefined) return;
    const y = inner.y0 + e;
    shelfY.set(sh.id, { y, index: i });
    part('shelf', `shelf:${sh.id}`, `Полка ${i + 1}`, carcass, { x: inner.x0, y, z: inner.z0 }, { x: inner.x1, y: y + T, z: shelfFront });
  });

  const ctx: ModuleContext = { m, n, W, H, D, P, T, Tb, Tf, inner, shelfY };
  for (const r of [buildDoors(ctx), buildDrawers(ctx)]) {
    parts.push(...r.parts);
    result.hardware.push(...r.hardware);
    result.handles.push(...r.handles);
    warnings.push(...r.warnings);
  }
  warnings.push(...facadeOverlapWarnings(parts));

  return applyModuleOverrides(result, m.partOverrides, materials);
}
