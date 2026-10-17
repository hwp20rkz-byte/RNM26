import type { FurnitureModule, ProjectState } from '../types/cad.types';

export const HISTORY_LIMIT = 100;

export interface ChangeDescription {
  text: string;
  moduleId: string | null; // модуль, который стоит показать после отмены/повтора
}

const PARTS: [keyof FurnitureModule | `subdivisions.${keyof FurnitureModule['subdivisions']}`, string][] = [
  ['name', 'название'],
  ['dimensions', 'габариты'],
  ['transform', 'положение'],
  ['construction', 'конструкция'],
  ['plinth', 'цоколь'],
  ['materials', 'материалы'],
  ['subdivisions.shelves', 'полки'],
  ['subdivisions.doors', 'двери'],
  ['subdivisions.drawers', 'ящики'],
  ['partOverrides', 'детали'],
];

function changedParts(a: FurnitureModule, b: FurnitureModule): string[] {
  return PARTS.filter(([key]) => {
    if (key.startsWith('subdivisions.')) {
      const k = key.slice('subdivisions.'.length) as keyof FurnitureModule['subdivisions'];
      return a.subdivisions[k] !== b.subdivisions[k];
    }
    return a[key as keyof FurnitureModule] !== b[key as keyof FurnitureModule];
  }).map(([, label]) => label);
}

// Что изменилось между двумя версиями проекта. Сравнение по ссылкам:
// immer оставляет нетронутые части теми же объектами, поэтому это дёшево и точно.
export function describeChange(before: ProjectState, after: ProjectState): ChangeDescription {
  const beforeIds = new Set(before.modules.map((m) => m.id));
  const afterIds = new Set(after.modules.map((m) => m.id));

  const added = after.modules.find((m) => !beforeIds.has(m.id));
  if (added) return { text: `добавлен модуль «${added.name}»`, moduleId: added.id };
  const removed = before.modules.find((m) => !afterIds.has(m.id));
  if (removed) return { text: `удалён модуль «${removed.name}»`, moduleId: removed.id };

  const changed = after.modules.find((m) => {
    const prev = before.modules.find((p) => p.id === m.id);
    return prev !== undefined && prev !== m;
  });
  if (changed) {
    const prev = before.modules.find((p) => p.id === changed.id)!;
    const parts = changedParts(prev, changed);
    const name = prev.name !== changed.name ? prev.name : changed.name;
    return { text: `«${name}»: ${parts.join(', ') || 'изменения'}`, moduleId: changed.id };
  }

  if (before.name !== after.name) return { text: 'название проекта', moduleId: null };
  if (before.clientName !== after.clientName) return { text: 'клиент', moduleId: null };
  return { text: 'изменение проекта', moduleId: null };
}
