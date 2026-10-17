import {
  EDGE_SIDES,
  type GrooveSpec,
  type PartOverride,
} from '../types/cad.types';
import type {
  DoorItem,
  DrawerBlock,
  FurnitureModule,
  ProjectState,
  ShelfItem,
} from '../types/cad.types';

// Формат файла проекта. Тот же формат лежит в хранилище браузера и уходит в экспорт,
// поэтому файл, скачанный менеджером, открывается так же, как проект из списка.
export const FILE_FORMAT = 'rnm26-project';
// История схемы:
// 1 — исходная.
// 2 — у модуля появились partOverrides (инструмент «Детали»). Файлы версии 1 читаются с пустыми правками.
export const SCHEMA_VERSION = 2;

export interface ProjectFile {
  format: typeof FILE_FORMAT;
  schemaVersion: number;
  savedAt: string; // ISO
  revision: number; // растёт с каждым сохранением; по нему ловим запись из другой вкладки
  project: ProjectState;
}

export type ParseResult =
  | { ok: true; file: ProjectFile; warnings: string[] }
  | { ok: false; error: string };

export function serializeProject(project: ProjectState, revision: number, savedAt = new Date()): string {
  const file: ProjectFile = {
    format: FILE_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    savedAt: savedAt.toISOString(),
    revision,
    project,
  };
  return JSON.stringify(file);
}

// ---------- Проверка ----------
// Файл приходит извне (импорт) или из хранилища, которое мог испортить кто угодно.
// Поэтому проверяется каждое поле, а не только верхний уровень.

class Invalid extends Error {}

type Obj = Record<string, unknown>;

function obj(v: unknown, path: string): Obj {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new Invalid(`${path}: ожидался объект`);
  return v as Obj;
}

function str(o: Obj, key: string, path: string, opts: { allowEmpty?: boolean; max?: number } = {}): string {
  const v = o[key];
  if (typeof v !== 'string') throw new Invalid(`${path}.${key}: ожидалась строка`);
  if (!opts.allowEmpty && v.length === 0) throw new Invalid(`${path}.${key}: пустая строка`);
  if (v.length > (opts.max ?? 200)) throw new Invalid(`${path}.${key}: строка длиннее ${opts.max ?? 200} символов`);
  return v;
}

function num(o: Obj, key: string, path: string, min: number, max: number): number {
  const v = o[key];
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Invalid(`${path}.${key}: ожидалось число`);
  if (v < min || v > max) throw new Invalid(`${path}.${key}: ${v} вне диапазона ${min}…${max}`);
  return v;
}

function bool(o: Obj, key: string, path: string): boolean {
  const v = o[key];
  if (typeof v !== 'boolean') throw new Invalid(`${path}.${key}: ожидалось да/нет`);
  return v;
}

function oneOf<T extends string>(o: Obj, key: string, path: string, values: readonly T[]): T {
  const v = o[key];
  if (typeof v !== 'string' || !values.includes(v as T)) {
    throw new Invalid(`${path}.${key}: «${String(v)}» — допустимо ${values.join(', ')}`);
  }
  return v as T;
}

function arr(o: Obj, key: string, path: string, max = 500): unknown[] {
  const v = o[key];
  if (!Array.isArray(v)) throw new Invalid(`${path}.${key}: ожидался список`);
  if (v.length > max) throw new Invalid(`${path}.${key}: больше ${max} элементов`);
  return v;
}

const MM = 20000; // верхний предел любого размера, мм

function parseShelf(v: unknown, path: string): ShelfItem {
  const o = obj(v, path);
  const locked = o.lockedGapBelow;
  if (locked !== null && (typeof locked !== 'number' || !Number.isFinite(locked) || locked < 0 || locked > MM)) {
    throw new Invalid(`${path}.lockedGapBelow: ожидалось число или null`);
  }
  return { id: str(o, 'id', path), lockedGapBelow: locked as number | null };
}

function parseDoor(v: unknown, path: string): DoorItem {
  const o = obj(v, path);
  const leaves = num(o, 'leaves', path, 1, 2);
  if (leaves !== 1 && leaves !== 2) throw new Invalid(`${path}.leaves: 1 или 2`);
  return {
    id: str(o, 'id', path),
    bottomRef: str(o, 'bottomRef', path),
    topRef: str(o, 'topRef', path),
    mount: oneOf(o, 'mount', path, ['overlay', 'insert'] as const),
    leaves,
    hingeSide: oneOf(o, 'hingeSide', path, ['left', 'right'] as const),
    handle: oneOf(o, 'handle', path, ['none', 'bracket', 'rail', 'profile'] as const),
  };
}

function parseDrawerBlock(v: unknown, path: string): DrawerBlock {
  const o = obj(v, path);
  return {
    id: str(o, 'id', path),
    bottomRef: str(o, 'bottomRef', path),
    topRef: str(o, 'topRef', path),
    count: Math.round(num(o, 'count', path, 1, 20)),
    mount: oneOf(o, 'mount', path, ['overlay', 'insert'] as const),
    runnerType: oneOf(o, 'runnerType', path, ['telescopic', 'concealed_tandem'] as const),
    handle: oneOf(o, 'handle', path, ['none', 'bracket', 'rail', 'profile'] as const),
  };
}

function optNum(o: Obj, key: string, path: string, min: number, max: number): number | undefined {
  return o[key] === undefined ? undefined : num(o, key, path, min, max);
}

function parseGroove(v: unknown, path: string): GrooveSpec {
  const o = obj(v, path);
  return {
    id: str(o, 'id', path),
    side: oneOf(o, 'side', path, EDGE_SIDES),
    face: oneOf(o, 'face', path, ['min', 'max'] as const),
    offset: num(o, 'offset', path, 0, MM),
    width: num(o, 'width', path, 0, MM),
    depth: num(o, 'depth', path, 0, 100),
    insetStart: num(o, 'insetStart', path, 0, MM),
    insetEnd: num(o, 'insetEnd', path, 0, MM),
  };
}

function parseOverride(v: unknown, path: string): PartOverride {
  const o = obj(v, path);
  const out: PartOverride = {};
  if (o.name !== undefined) out.name = str(o, 'name', path, { allowEmpty: true });
  if (o.materialId !== undefined) out.materialId = str(o, 'materialId', path);
  if (o.grain !== undefined) out.grain = oneOf(o, 'grain', path, ['long', 'short'] as const);
  if (o.deleted !== undefined) out.deleted = bool(o, 'deleted', path);
  if (o.edges !== undefined) {
    const e = obj(o.edges, `${path}.edges`);
    out.edges = {};
    for (const side of Object.keys(e)) {
      if (!(EDGE_SIDES as readonly string[]).includes(side)) throw new Invalid(`${path}.edges: неизвестная сторона «${side}»`);
      const se = obj(e[side], `${path}.edges.${side}`);
      out.edges[side as (typeof EDGE_SIDES)[number]] = {
        thickness: optNum(se, 'thickness', `${path}.edges.${side}`, 0, 10),
        extend: optNum(se, 'extend', `${path}.edges.${side}`, -MM, MM),
      };
    }
  }
  if (o.grooves !== undefined) out.grooves = arr(o, 'grooves', path, 50).map((g, i) => parseGroove(g, `${path}.grooves[${i}]`));
  return out;
}

function parseOverrides(v: unknown, path: string): Record<string, PartOverride> {
  const o = obj(v, path);
  const keys = Object.keys(o);
  if (keys.length > 2000) throw new Invalid(`${path}: больше 2000 правок`);
  const out: Record<string, PartOverride> = {};
  for (const k of keys) {
    if (k.length > 200) throw new Invalid(`${path}: слишком длинный ключ детали`);
    out[k] = parseOverride(o[k], `${path}[${k}]`);
  }
  return out;
}

function parseModule(
  v: unknown,
  path: string,
  knownMaterials: ReadonlySet<string>,
  warnings: string[],
  version: number,
): FurnitureModule {
  const o = obj(v, path);
  const t = obj(o.transform, `${path}.transform`);
  const d = obj(o.dimensions, `${path}.dimensions`);
  const pl = obj(o.plinth, `${path}.plinth`);
  const c = obj(o.construction, `${path}.construction`);
  const mt = obj(o.materials, `${path}.materials`);
  const sub = obj(o.subdivisions, `${path}.subdivisions`);
  const name = str(o, 'name', path);

  const materials = {
    carcassMaterialId: str(mt, 'carcassMaterialId', `${path}.materials`),
    backMaterialId: str(mt, 'backMaterialId', `${path}.materials`),
    facadeMaterialId: str(mt, 'facadeMaterialId', `${path}.materials`),
    plinthMaterialId: str(mt, 'plinthMaterialId', `${path}.materials`),
  };
  for (const id of Object.values(materials)) {
    if (!knownMaterials.has(id)) warnings.push(`«${name}»: материала ${id} нет в каталоге, толщина взята по умолчанию`);
  }

  return {
    id: str(o, 'id', path),
    name,
    type: oneOf(o, 'type', path, ['base_cabinet', 'wall_cabinet', 'tall_cabinet', 'table', 'shelf_unit'] as const),
    transform: {
      x: num(t, 'x', `${path}.transform`, -MM, MM),
      y: num(t, 'y', `${path}.transform`, -MM, MM),
      z: num(t, 'z', `${path}.transform`, -MM, MM),
      rotationY: num(t, 'rotationY', `${path}.transform`, -360, 360),
    },
    dimensions: {
      width: num(d, 'width', `${path}.dimensions`, 1, MM),
      height: num(d, 'height', `${path}.dimensions`, 1, MM),
      depth: num(d, 'depth', `${path}.dimensions`, 1, MM),
    },
    plinth: {
      height: num(pl, 'height', `${path}.plinth`, 0, MM),
      setback: num(pl, 'setback', `${path}.plinth`, 0, MM),
    },
    construction: {
      topType: oneOf(c, 'topType', `${path}.construction`, ['overlay', 'insert', 'none'] as const),
      bottomType: oneOf(c, 'bottomType', `${path}.construction`, ['overlay', 'insert'] as const),
      backType: oneOf(c, 'backType', `${path}.construction`, ['groove_hdf', 'insert', 'overlay', 'none'] as const),
      connectorType: oneOf(c, 'connectorType', `${path}.construction`, ['minifix', 'confirmat', 'dowel'] as const),
      leftSideToFloor: bool(c, 'leftSideToFloor', `${path}.construction`),
      rightSideToFloor: bool(c, 'rightSideToFloor', `${path}.construction`),
    },
    materials,
    subdivisions: {
      shelves: arr(sub, 'shelves', `${path}.subdivisions`).map((s, i) => parseShelf(s, `${path}.shelves[${i}]`)),
      doors: arr(sub, 'doors', `${path}.subdivisions`).map((s, i) => parseDoor(s, `${path}.doors[${i}]`)),
      drawers: arr(sub, 'drawers', `${path}.subdivisions`).map((s, i) => parseDrawerBlock(s, `${path}.drawers[${i}]`)),
    },
    // Миграция 1 → 2: в старых файлах правок деталей не было.
    partOverrides: version >= 2 ? parseOverrides(o.partOverrides, `${path}.partOverrides`) : {},
  };
}

export function parseProjectFile(text: string, knownMaterials: ReadonlySet<string>): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Файл повреждён: это не JSON' };
  }
  try {
    const o = obj(raw, 'файл');
    if (o.format !== FILE_FORMAT) return { ok: false, error: 'Это не файл проекта RNM26' };
    const version = num(o, 'schemaVersion', 'файл', 1, 1e6);
    if (version > SCHEMA_VERSION) {
      return { ok: false, error: `Файл сохранён более новой версией программы (схема ${version}). Обновите страницу` };
    }
    const p = obj(o.project, 'проект');
    const warnings: string[] = [];
    const modules = arr(p, 'modules', 'проект').map((m, i) => parseModule(m, `модуль ${i + 1}`, knownMaterials, warnings, version));
    const ids = new Set(modules.map((m) => m.id));
    if (ids.size !== modules.length) throw new Invalid('проект: у двух модулей одинаковый id');

    const file: ProjectFile = {
      format: FILE_FORMAT,
      schemaVersion: SCHEMA_VERSION,
      savedAt: str(o, 'savedAt', 'файл'),
      revision: num(o, 'revision', 'файл', 0, Number.MAX_SAFE_INTEGER),
      project: {
        id: str(p, 'id', 'проект'),
        name: str(p, 'name', 'проект', { max: 200 }),
        clientName: str(p, 'clientName', 'проект', { allowEmpty: true, max: 200 }),
        modules,
      },
    };
    return { ok: true, file, warnings };
  } catch (e) {
    if (e instanceof Invalid) return { ok: false, error: `Файл не прошёл проверку: ${e.message}` };
    throw e;
  }
}
