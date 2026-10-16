import { describe, expect, it } from 'vitest';
import { findOverlaps, moduleAabb } from './overlaps';
import { createBaseCabinet } from '../../store/useProjectStore';

describe('Пересечение модулей', () => {
  it('модули вплотную не пересекаются', () => {
    const a = createBaseCabinet('A', 0, 353);
    const b = createBaseCabinet('B', 353, 400);
    expect(findOverlaps([a, b])).toEqual([]);
  });

  it('расширенный модуль залезает в соседний', () => {
    const a = createBaseCabinet('A', 0, 600);
    const b = createBaseCabinet('B', 353, 400);
    expect(findOverlaps([a, b])).toEqual([[a.id, b.id]]);
  });

  it('навесной модуль над тумбой не пересекается с ней', () => {
    const a = createBaseCabinet('A', 0, 400);
    const b = createBaseCabinet('B', 0, 400);
    b.transform.y = 1400;
    expect(findOverlaps([a, b])).toEqual([]);
  });

  it('поворот на 90° меняет местами ширину и глубину в плане', () => {
    const a = createBaseCabinet('A', 0, 600);
    a.transform.rotationY = 90;
    const box = moduleAabb(a);
    expect(Math.round(box.max.x - box.min.x)).toBe(400);
    expect(Math.round(box.max.z - box.min.z)).toBe(600);
  });
});
