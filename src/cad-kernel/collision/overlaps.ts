import type { FurnitureModule } from '../../types/cad.types';

export interface Aabb {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

// Габаритный бокс модуля в мировых координатах. Поворот вокруг Y считается вокруг
// левого заднего угла; при повороте не на 90° бокс описанный, то есть с запасом.
export function moduleAabb(m: FurnitureModule): Aabb {
  const { width: W, height: H, depth: D } = m.dimensions;
  const a = (m.transform.rotationY * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const corners = [
    [0, 0],
    [W, 0],
    [0, D],
    [W, D],
  ].map(([x, z]) => [m.transform.x + x! * cos + z! * sin, m.transform.z - x! * sin + z! * cos] as const);
  const xs = corners.map((c) => c[0]);
  const zs = corners.map((c) => c[1]);
  return {
    min: { x: Math.min(...xs), y: m.transform.y, z: Math.min(...zs) },
    max: { x: Math.max(...xs), y: m.transform.y + H, z: Math.max(...zs) },
  };
}

// Допуск 0.5 мм: модули, стоящие вплотную, пересечением не считаются.
const EPS = 0.5;

export function findOverlaps(modules: FurnitureModule[]): [string, string][] {
  const boxes = modules.map((m) => ({ id: m.id, b: moduleAabb(m) }));
  const pairs: [string, string][] = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const p = boxes[i]!.b;
      const q = boxes[j]!.b;
      const hit = (['x', 'y', 'z'] as const).every((k) => p.min[k] < q.max[k] - EPS && q.min[k] < p.max[k] - EPS);
      if (hit) pairs.push([boxes[i]!.id, boxes[j]!.id]);
    }
  }
  return pairs;
}
