import type { NormValues } from '../config/norms';
import type { InnerSpace, ModuleContext } from './context';
import { shelvesBetween } from './context';
import { facadeZone, handleFor, type FacadeResult } from './FacadeEngine';
import { makePart, round } from './parts';
import type { DrawerBlock, FacadeMount, RunnerType } from '../../types/cad.types';

// Самая длинная направляющая из ряда, которая помещается во внутреннюю глубину корпуса
// (от задней стенки до переднего края) с технологическим запасом. null — не помещается ни одна.
export function selectRunnerLength(innerDepth: number, n: NormValues): number | null {
  const fits = n.runnerLengths.filter((l) => l <= innerDepth - n.runnerDepthClearance);
  return fits.length ? Math.max(...fits) : null;
}

// Глубина, доступная под ящик: вкладной фасад съедает свою толщину спереди.
export function drawerDepthAvailable(inner: InnerSpace, facadeThickness: number, mount: FacadeMount): number {
  return inner.z1 - inner.z0 - (mount === 'insert' ? facadeThickness : 0);
}

export function sideClearance(type: RunnerType, n: NormValues): number {
  return type === 'telescopic' ? n.telescopicSideClearance : n.concealedSideClearance;
}

const RUNNER_NAMES: Record<RunnerType, string> = {
  telescopic: 'Направляющие шариковые полного выдвижения',
  concealed_tandem: 'Направляющие скрытого монтажа',
};

export function buildDrawers(ctx: ModuleContext): FacadeResult {
  const out: FacadeResult = { parts: [], hardware: [], handles: [], warnings: [] };
  const { m, n, P, T, Tb } = ctx;

  m.subdivisions.drawers.forEach((block: DrawerBlock, bi) => {
    const label = `Ящики ${bi + 1}`;
    const count = Math.max(1, Math.round(block.count));
    const pushToOpen = block.handle === 'none';

    // Push-to-Open: нижняя кромка поднята над низом корпуса (ТЗ: 25 мм), только у накладных фасадов на дне.
    const override =
      pushToOpen && block.mount === 'overlay' && block.bottomRef === 'bottom' ? P + n.pushToOpenBottomOffset : undefined;
    const zone = facadeZone(ctx, block.bottomRef, block.topRef, block.mount, override);
    if (typeof zone === 'string') {
      out.warnings.push(`${label}: ${zone}`);
      return;
    }

    const between = shelvesBetween(ctx, zone.bottom, zone.top);
    if (between.length) {
      out.warnings.push(`${label}: в проёме стоит полка ${between.map((i) => i + 1).join(', ')} — короба в неё упрутся`);
    }

    const runner = selectRunnerLength(drawerDepthAvailable(ctx.inner, ctx.Tf, block.mount), n);
    if (runner === null) {
      out.warnings.push(`${label}: ни одна направляющая не помещается в глубину корпуса`);
      return;
    }

    const f = zone.frame;
    const facadeH = (f.y1 - f.y0 - (count - 1) * n.facadeGap) / count;
    if (facadeH < 80) out.warnings.push(`${label}: фасад ${round(facadeH)} мм — слишком низкий`);

    const clearance = sideClearance(block.runnerType, n);
    const bx0 = ctx.inner.x0 + clearance;
    const bx1 = ctx.inner.x1 - clearance;
    const bz1 = block.mount === 'insert' ? ctx.D - ctx.Tf : ctx.D;
    const bz0 = bz1 - runner;
    const cellBottom = zone.bottom.y1;
    const cellTop = zone.top.y0;

    for (let i = 0; i < count; i++) {
      const fy0 = f.y0 + i * (facadeH + n.facadeGap);
      const fy1 = fy0 + facadeH;
      const key = `drawer:${block.id}:${i}`;
      const name = `Ящик ${bi + 1}.${i + 1}`;
      out.parts.push(
        makePart({
          moduleId: m.id,
          role: 'drawer_facade',
          key: `${key}:facade`,
          name: `${name} — фасад`,
          materialId: m.materials.facadeMaterialId,
          min: { x: f.x0, y: fy0, z: f.z0 },
          max: { x: f.x1, y: fy1, z: f.z1 },
          edges: 'all',
          edgeThickness: n.edgeThickness,
        }),
      );

      // Короб стоит за своим фасадом, но не выходит за горизонты проёма.
      const by0 = Math.max(fy0, cellBottom) + n.drawerBoxVerticalClearance;
      const byMax = Math.min(fy1, cellTop) - n.drawerBoxVerticalClearance;
      const boxH = Math.min(facadeH - n.drawerBoxHeightReduction, byMax - by0);
      if (boxH < n.drawerBoxMinHeight) {
        out.warnings.push(`${name}: короб ${round(boxH)} мм — ниже минимума ${n.drawerBoxMinHeight} мм`);
        continue;
      }
      const by1 = by0 + boxH;
      const wallY0 = by0 + Tb; // дно ХДФ подшито снизу
      const carcass = m.materials.carcassMaterialId;

      out.parts.push(
        makePart({ moduleId: m.id, role: 'drawer_side', key: `${key}:sl`, name: `${name} — бок левый`, materialId: carcass,
          min: { x: bx0, y: wallY0, z: bz0 }, max: { x: bx0 + T, y: by1, z: bz1 }, edges: 'top', edgeThickness: n.edgeThickness }),
        makePart({ moduleId: m.id, role: 'drawer_side', key: `${key}:sr`, name: `${name} — бок правый`, materialId: carcass,
          min: { x: bx1 - T, y: wallY0, z: bz0 }, max: { x: bx1, y: by1, z: bz1 }, edges: 'top', edgeThickness: n.edgeThickness }),
        makePart({ moduleId: m.id, role: 'drawer_front', key: `${key}:fr`, name: `${name} — передняя царга`, materialId: carcass,
          min: { x: bx0 + T, y: wallY0, z: bz1 - T }, max: { x: bx1 - T, y: by1, z: bz1 }, edges: 'top', edgeThickness: n.edgeThickness }),
        makePart({ moduleId: m.id, role: 'drawer_back', key: `${key}:bk`, name: `${name} — задняя царга`, materialId: carcass,
          min: { x: bx0 + T, y: wallY0, z: bz0 }, max: { x: bx1 - T, y: by1, z: bz0 + T }, edges: 'top', edgeThickness: n.edgeThickness }),
        makePart({ moduleId: m.id, role: 'drawer_bottom', key: `${key}:bt`, name: `${name} — дно`, materialId: m.materials.backMaterialId,
          min: { x: bx0, y: by0, z: bz0 }, max: { x: bx1, y: wallY0, z: bz1 }, edges: 'none', edgeThickness: n.edgeThickness }),
      );

      out.hardware.push({
        key: `runner_${block.runnerType}_${runner}${pushToOpen ? '_pto' : ''}`,
        name: `${RUNNER_NAMES[block.runnerType]} ${runner} мм${pushToOpen ? ', Push-to-Open' : ''}`,
        unit: 'компл.',
        qty: 1,
      });
      const h = handleFor(block.handle, { ...f, y0: fy0, y1: fy1 }, 'horizontal');
      if (h) {
        out.hardware.push({ ...h.hardware, partKey: `${key}:facade` });
        if (h.visual) out.handles.push({ ...h.visual, partKey: `${key}:facade` });
      }
    }
  });
  return out;
}
