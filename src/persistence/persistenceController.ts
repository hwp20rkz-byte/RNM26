import { create } from 'zustand';
import { DEFAULT_MATERIALS } from '../cad-kernel/config/catalog';
import { createEmptyProject, useProjectStore } from '../store/useProjectStore';
import type { ProjectState } from '../types/cad.types';
import { parseProjectFile } from './projectFile';
import { browserStore, LocalProjectRepository, memoryStore, type ProjectMeta } from './ProjectRepository';
import { ProjectSession } from './ProjectSession';

const KNOWN = new Set(DEFAULT_MATERIALS.map((m) => m.id));
const AUTOSAVE_DELAY_MS = 600;

export type SaveState = 'saved' | 'dirty' | 'saving' | 'error' | 'conflict';

interface SaveStatus {
  state: SaveState;
  savedAt: string | null;
  error: string | null;
  storedRevision: number | null; // при конфликте — ревизия из другой вкладки
  notice: string | null; // разовое сообщение: предупреждения импорта, обновление из другой вкладки
  storage: 'browser' | 'memory';
}

export const useSaveStatus = create<SaveStatus>(() => ({
  state: 'saved',
  savedAt: null,
  error: null,
  storedRevision: null,
  notice: null,
  storage: 'browser',
}));

let session: ProjectSession;
let lastSaved: ProjectState | null = null; // проект в том виде, в каком он лежит в хранилище
let timer: ReturnType<typeof setTimeout> | null = null;

const status = (patch: Partial<SaveStatus>) => useSaveStatus.setState(patch);
const currentProject = () => useProjectStore.getState().project;

function makeSession(): { session: ProjectSession; storage: SaveStatus['storage'] } {
  try {
    const ls = window.localStorage;
    ls.setItem('rnm26:probe', '1');
    ls.removeItem('rnm26:probe');
    return { session: new ProjectSession(new LocalProjectRepository(browserStore(ls), KNOWN), KNOWN), storage: 'browser' };
  } catch {
    // Приватный режим или запрет сайта: работаем, но честно предупреждаем, что ничего не сохранится.
    return { session: new ProjectSession(new LocalProjectRepository(memoryStore(), KNOWN), KNOWN), storage: 'memory' };
  }
}

function show(project: ProjectState, savedAt: string | null, notice: string | null = null) {
  lastSaved = project;
  useProjectStore.getState().loadProject(project);
  status({ state: 'saved', savedAt, error: null, storedRevision: null, notice });
}

function savedAtOf(id: string): string | null {
  return session.repo.list().find((m) => m.id === id)?.savedAt ?? null;
}

export function flushSave(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  const project = currentProject();
  if (project === lastSaved) {
    // Правку отменили до сохранения: в хранилище уже ровно это состояние.
    if (useSaveStatus.getState().state === 'dirty') status({ state: 'saved' });
    return;
  }
  if (useSaveStatus.getState().state === 'conflict') return; // ждём решения менеджера
  status({ state: 'saving' });
  const r = session.save(project);
  if (r.ok) {
    lastSaved = project;
    status({ state: 'saved', savedAt: r.savedAt, error: null });
  } else if (r.conflict) {
    status({ state: 'conflict', storedRevision: r.storedRevision });
  } else {
    status({ state: 'error', error: r.error });
  }
}

function scheduleSave() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(flushSave, AUTOSAVE_DELAY_MS);
}

export function bootPersistence(): void {
  const made = makeSession();
  session = made.session;
  status({ storage: made.storage });
  void navigator.storage?.persist?.().catch(() => undefined);

  const lastId = session.repo.getLastOpenedId() ?? session.repo.list()[0]?.id ?? null;
  const opened = lastId ? session.open(lastId) : null;
  if (opened?.ok) {
    show(opened.project, savedAtOf(opened.project.id), opened.warnings.join('\n') || null);
  } else {
    // Первый запуск: демо-проект сразу попадает в список.
    const demo = currentProject();
    const r = session.create(demo);
    lastSaved = demo;
    if (r.ok) status({ state: 'saved', savedAt: r.savedAt });
    else status({ state: 'error', error: r.conflict ? 'Проект с таким id уже есть' : r.error });
  }

  useProjectStore.subscribe((s, prev) => {
    if (s.project === prev.project) return;
    if (s.project === lastSaved) {
      flushSave(); // отмена вернула сохранённое состояние: снять «Есть изменения» и отложенное сохранение
      return;
    }
    if (useSaveStatus.getState().state !== 'conflict') status({ state: 'dirty' });
    scheduleSave();
  });

  // Закрытие вкладки или уход в фон: сохраняем сразу, не дожидаясь таймера.
  window.addEventListener('pagehide', flushSave);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSave();
  });

  // Тот же проект сохранили в другой вкладке.
  window.addEventListener('storage', (e) => {
    const id = currentProject().id;
    if (e.key !== `rnm26:project:${id}` || e.newValue === null) return;
    const parsed = parseProjectFile(e.newValue, KNOWN);
    if (!parsed.ok || parsed.file.revision === session.revision) return;
    const unsaved = currentProject() !== lastSaved;
    if (unsaved) {
      status({ state: 'conflict', storedRevision: parsed.file.revision });
    } else {
      const r = session.open(id);
      if (r.ok) show(r.project, parsed.file.savedAt, 'Проект обновлён: его изменили в другой вкладке');
    }
  });
}

// ---------- Действия для интерфейса ----------

// Пока конфликт не решён, правки текущего проекта не сохранены: уйти с него — значит потерять их.
const CONFLICT_BLOCK = 'Сначала решите, какую версию проекта оставить (жёлтая плашка вверху)';
const blockedByConflict = () => useSaveStatus.getState().state === 'conflict';

export function listProjects(): ProjectMeta[] {
  return session.repo.list();
}

export function openProject(id: string): string | null {
  if (blockedByConflict()) return CONFLICT_BLOCK;
  flushSave();
  const r = session.open(id);
  if (!r.ok) return r.error;
  show(r.project, savedAtOf(id), r.warnings.join('\n') || null);
  return null;
}

export function newProject(): string | null {
  if (blockedByConflict()) return CONFLICT_BLOCK;
  flushSave();
  const p = createEmptyProject();
  const r = session.create(p);
  show(p, r.ok ? r.savedAt : null);
  if (!r.ok) status({ state: 'error', error: r.conflict ? 'Проект с таким id уже есть' : r.error });
  return null;
}

export function deleteProject(id: string): void {
  const isCurrent = currentProject().id === id;
  if (isCurrent && timer) {
    // Иначе отложенное автосохранение воскресит удалённый проект.
    clearTimeout(timer);
    timer = null;
  }
  session.repo.remove(id);
  if (!isCurrent) return;
  // Удалён открытый проект: его несохранённые правки и конфликт больше не важны.
  lastSaved = currentProject();
  status({ state: 'saved', storedRevision: null });
  const next = session.repo.list()[0];
  if (next) openProject(next.id);
  else newProject();
}

export function importProjectFile(text: string): string | null {
  if (blockedByConflict()) return CONFLICT_BLOCK;
  flushSave();
  const r = session.importFile(text);
  if (!r.ok) return r.error;
  show(r.project, savedAtOf(r.project.id), r.warnings.join('\n') || null);
  return null;
}

export function exportCurrentProject(): { fileName: string; text: string } {
  flushSave();
  const p = currentProject();
  const safe = (p.clientName ? `${p.name} — ${p.clientName}` : p.name)
    .replace(/[\\/:*?"<>|]+/g, '_')
    .slice(0, 80)
    .replace(/[.\s]+$/, '');
  return { fileName: `${safe}.rnm26.json`, text: session.exportFile(p) };
}

export function resolveConflict(choice: 'mine' | 'theirs'): void {
  const { storedRevision } = useSaveStatus.getState();
  const p = currentProject();
  if (choice === 'theirs') {
    const r = session.open(p.id);
    if (r.ok) show(r.project, savedAtOf(p.id));
    return;
  }
  const r = session.overwrite(p, storedRevision ?? 0);
  if (r.ok) {
    lastSaved = p;
    status({ state: 'saved', savedAt: r.savedAt, storedRevision: null, error: null });
  } else {
    status(r.conflict ? { state: 'conflict', storedRevision: r.storedRevision } : { state: 'error', error: r.error });
  }
}

export function dismissNotice(): void {
  status({ notice: null });
}
