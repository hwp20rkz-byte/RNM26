import type { ProjectState } from '../types/cad.types';
import { parseProjectFile, serializeProject, type ProjectFile } from './projectFile';

export interface ProjectMeta {
  id: string;
  name: string;
  clientName: string;
  savedAt: string;
  moduleCount: number;
}

export type LoadResult = { ok: true; file: ProjectFile; warnings: string[] } | { ok: false; error: string };

export type SaveResult =
  | { ok: true; revision: number; savedAt: string }
  // В хранилище лежит ревизия новее той, от которой мы начали: проект менялся в другой вкладке.
  | { ok: false; conflict: true; storedRevision: number }
  | { ok: false; conflict: false; error: string };

// Хранилище проектов. Сейчас — браузер; сервер подключится реализацией этого же интерфейса.
export interface ProjectRepository {
  list(): ProjectMeta[];
  load(id: string): LoadResult;
  // baseRevision — ревизия, которую редактор загрузил или сохранил последней. null — проект новый.
  save(project: ProjectState, baseRevision: number | null): SaveResult;
  remove(id: string): void;
  getLastOpenedId(): string | null;
  setLastOpenedId(id: string): void;
}

// Минимум от Storage, чтобы тестировать без браузера.
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  keys(): string[];
}

export function browserStore(storage: Storage): KeyValueStore {
  return {
    getItem: (k) => storage.getItem(k),
    setItem: (k, v) => storage.setItem(k, v),
    removeItem: (k) => storage.removeItem(k),
    keys: () => Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter((k): k is string => k !== null),
  };
}

export function memoryStore(): KeyValueStore {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    keys: () => [...m.keys()],
  };
}

const PREFIX = 'rnm26:project:';
const LAST = 'rnm26:last-opened';

export class LocalProjectRepository implements ProjectRepository {
  constructor(
    private readonly store: KeyValueStore,
    private readonly knownMaterials: ReadonlySet<string>,
  ) {}

  // Индекса нет намеренно: список собирается из самих записей и не может разойтись с ними.
  list(): ProjectMeta[] {
    const out: ProjectMeta[] = [];
    for (const key of this.store.keys()) {
      if (!key.startsWith(PREFIX)) continue;
      const r = this.load(key.slice(PREFIX.length));
      if (!r.ok) continue;
      const p = r.file.project;
      out.push({ id: p.id, name: p.name, clientName: p.clientName, savedAt: r.file.savedAt, moduleCount: p.modules.length });
    }
    return out.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  }

  load(id: string): LoadResult {
    const text = this.store.getItem(PREFIX + id);
    if (text === null) return { ok: false, error: 'Проект не найден в этом браузере' };
    return parseProjectFile(text, this.knownMaterials);
  }

  save(project: ProjectState, baseRevision: number | null): SaveResult {
    const existing = this.store.getItem(PREFIX + project.id);
    let storedRevision: number | null = null;
    if (existing !== null) {
      const parsed = parseProjectFile(existing, this.knownMaterials);
      // Испорченную запись перезаписываем: в ней нечего беречь, а без этого проект не сохранить.
      storedRevision = parsed.ok ? parsed.file.revision : null;
    }
    if (storedRevision !== null && storedRevision !== baseRevision) {
      return { ok: false, conflict: true, storedRevision };
    }
    const revision = (storedRevision ?? 0) + 1;
    const savedAt = new Date();
    try {
      this.store.setItem(PREFIX + project.id, serializeProject(project, revision, savedAt));
    } catch (e) {
      const quota = e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22);
      return {
        ok: false,
        conflict: false,
        error: quota ? 'Место в браузере закончилось. Скачайте файлы старых проектов и удалите их из списка' : `Браузер не дал сохранить: ${String(e)}`,
      };
    }
    return { ok: true, revision, savedAt: savedAt.toISOString() };
  }

  remove(id: string): void {
    this.store.removeItem(PREFIX + id);
    if (this.getLastOpenedId() === id) this.store.removeItem(LAST);
  }

  getLastOpenedId(): string | null {
    return this.store.getItem(LAST);
  }

  setLastOpenedId(id: string): void {
    try {
      this.store.setItem(LAST, id);
    } catch {
      // не критично: при следующем запуске откроется последний сохранённый по дате
    }
  }
}
