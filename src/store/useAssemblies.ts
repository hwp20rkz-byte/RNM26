import { useMemo } from 'react';
import { assembleCabinet } from '../cad-kernel/assembler/CabinetAssembler';
import { DEFAULT_MATERIALS } from '../cad-kernel/config/catalog';
import { DEFAULT_NORMS, normValues } from '../cad-kernel/config/norms';
import type { Assembly } from '../types/cad.types';
import { useProjectStore } from './useProjectStore';

export const MATERIALS = new Map(DEFAULT_MATERIALS.map((m) => [m.id, m]));
export const NORMS = normValues(DEFAULT_NORMS);

// Единственное место, где модули превращаются в детали. 3D, деталировка и смета читают отсюда.
export function useAssemblies(): Assembly[] {
  const modules = useProjectStore((s) => s.project.modules);
  return useMemo(() => modules.map((m) => assembleCabinet(m, MATERIALS, NORMS)), [modules]);
}
