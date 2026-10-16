import { describe, expect, it } from 'vitest';
import { DEFAULT_MATERIALS } from '../cad-kernel/config/catalog';
import { createBaseCabinet, newDoor, newDrawerBlock } from '../store/useProjectStore';
import type { ProjectState } from '../types/cad.types';
import { parseProjectFile, serializeProject } from './projectFile';
import { LocalProjectRepository, memoryStore, type KeyValueStore } from './ProjectRepository';
import { ProjectSession } from './ProjectSession';

const KNOWN = new Set(DEFAULT_MATERIALS.map((m) => m.id));

function project(id = 'prj-1'): ProjectState {
  const a = createBaseCabinet('Тумба', 0, 400);
  a.subdivisions.doors.push(newDoor());
  a.subdivisions.shelves[0]!.lockedGapBelow = 300;
  const b = createBaseCabinet('Ящики', 400, 600);
  b.subdivisions.drawers.push(newDrawerBlock());
  return { id, name: 'Кухня Ивановых', clientName: 'Иванов', modules: [a, b] };
}

const repo = (store: KeyValueStore = memoryStore()) => new LocalProjectRepository(store, KNOWN);

describe('Файл проекта', () => {
  it('сохранение и чтение дают тот же проект', () => {
    const p = project();
    const r = parseProjectFile(serializeProject(p, 3), KNOWN);
    expect(r.ok && r.file.project).toEqual(p);
    expect(r.ok && r.file.revision).toBe(3);
    expect(r.ok && r.warnings).toEqual([]);
  });

  it('не JSON', () => {
    expect(parseProjectFile('{oops', KNOWN)).toEqual({ ok: false, error: 'Файл повреждён: это не JSON' });
  });

  it('чужой JSON', () => {
    const r = parseProjectFile('{"hello":1}', KNOWN);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toBe('Это не файл проекта RNM26');
  });

  it('файл из будущей версии не открывается молча', () => {
    const raw = JSON.parse(serializeProject(project(), 1));
    raw.schemaVersion = 99;
    const r = parseProjectFile(JSON.stringify(raw), KNOWN);
    expect(!r.ok && r.error).toContain('более новой версией');
  });

  it('называет испорченное поле', () => {
    const raw = JSON.parse(serializeProject(project(), 1));
    raw.project.modules[1].dimensions.width = 'шестьсот';
    const r = parseProjectFile(JSON.stringify(raw), KNOWN);
    expect(!r.ok && r.error).toContain('модуль 2.dimensions.width');
  });

  it('отклоняет недопустимое значение перечисления', () => {
    const raw = JSON.parse(serializeProject(project(), 1));
    raw.project.modules[0].subdivisions.doors[0].mount = 'sideways';
    const r = parseProjectFile(JSON.stringify(raw), KNOWN);
    expect(!r.ok && r.error).toContain('mount');
  });

  it('незнакомый материал — предупреждение, а не отказ', () => {
    const raw = JSON.parse(serializeProject(project(), 1));
    raw.project.modules[0].materials.carcassMaterialId = 'egger-xxx';
    const r = parseProjectFile(JSON.stringify(raw), KNOWN);
    expect(r.ok).toBe(true);
    expect(r.ok && r.warnings[0]).toContain('egger-xxx');
  });
});

describe('Хранилище в браузере', () => {
  it('список проектов: новые сверху, с клиентом и числом модулей', async () => {
    const r = repo();
    r.save(project('a'), null);
    await new Promise((res) => setTimeout(res, 5));
    r.save({ ...project('b'), name: 'Шкаф', clientName: 'Петрова' }, null);
    const list = r.list();
    expect(list.map((m) => m.id)).toEqual(['b', 'a']);
    expect(list[0]).toMatchObject({ name: 'Шкаф', clientName: 'Петрова', moduleCount: 2 });
  });

  it('испорченная запись не ломает список', () => {
    const store = memoryStore();
    const r = repo(store);
    r.save(project('a'), null);
    store.setItem('rnm26:project:broken', '{не json');
    expect(r.list().map((m) => m.id)).toEqual(['a']);
  });

  it('ревизия растёт с каждым сохранением', () => {
    const r = repo();
    const s1 = r.save(project(), null);
    const s2 = r.save(project(), 1);
    expect(s1.ok && s1.revision).toBe(1);
    expect(s2.ok && s2.revision).toBe(2);
  });

  it('нехватка места — понятная ошибка', () => {
    const store = memoryStore();
    store.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
    const res = repo(store).save(project(), null);
    expect(res.ok).toBe(false);
    expect(!res.ok && !res.conflict && res.error).toContain('Место в браузере закончилось');
  });

  it('удаление забывает и последний открытый', () => {
    const r = repo();
    r.save(project('a'), null);
    r.setLastOpenedId('a');
    r.remove('a');
    expect(r.list()).toEqual([]);
    expect(r.getLastOpenedId()).toBeNull();
  });
});

describe('Сессия: две вкладки', () => {
  it('вторая вкладка не затирает изменения первой молча', () => {
    const store = memoryStore();
    const tab1 = new ProjectSession(repo(store), KNOWN);
    const tab2 = new ProjectSession(repo(store), KNOWN);
    tab1.create(project());
    tab2.open('prj-1');

    expect(tab1.save({ ...project(), name: 'Правка из вкладки 1' }).ok).toBe(true);
    const res = tab2.save({ ...project(), name: 'Правка из вкладки 2' });
    expect(res).toEqual({ ok: false, conflict: true, storedRevision: 2 });

    const stored = repo(store).load('prj-1');
    expect(stored.ok && stored.file.project.name).toBe('Правка из вкладки 1');
  });

  it('«оставить мою версию» перезаписывает осознанно', () => {
    const store = memoryStore();
    const tab1 = new ProjectSession(repo(store), KNOWN);
    const tab2 = new ProjectSession(repo(store), KNOWN);
    tab1.create(project());
    tab2.open('prj-1');
    tab1.save(project());
    const res = tab2.overwrite({ ...project(), name: 'Моя' }, 2);
    expect(res.ok && res.revision).toBe(3);
    const stored = repo(store).load('prj-1');
    expect(stored.ok && stored.file.project.name).toBe('Моя');
  });

  it('после открытия сохраняет от загруженной ревизии', () => {
    const store = memoryStore();
    new ProjectSession(repo(store), KNOWN).create(project());
    const s = new ProjectSession(repo(store), KNOWN);
    expect(s.open('prj-1').ok).toBe(true);
    expect(s.save(project()).ok).toBe(true);
    expect(s.revision).toBe(2);
  });
});

describe('Импорт и экспорт', () => {
  it('экспорт открывается импортом в другом браузере', () => {
    const p = project();
    const a = new ProjectSession(repo(), KNOWN);
    a.create(p);
    const file = a.exportFile(p);

    const b = new ProjectSession(repo(), KNOWN);
    const r = b.importFile(file);
    expect(r.ok && r.project).toEqual(p);
    expect(b.repo.list()).toHaveLength(1);
  });

  it('импорт поверх существующего создаёт копию, а не затирает', () => {
    const s = new ProjectSession(repo(), KNOWN);
    s.create(project());
    const r = s.importFile(s.exportFile({ ...project(), name: 'Из файла' }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.project.id).not.toBe('prj-1');
    expect(r.project.name).toBe('Из файла (импорт)');
    expect(s.repo.list()).toHaveLength(2);
    const original = s.repo.load('prj-1');
    expect(original.ok && original.file.project.name).toBe('Кухня Ивановых');
  });

  it('битый файл не создаёт проект', () => {
    const s = new ProjectSession(repo(), KNOWN);
    expect(s.importFile('мусор').ok).toBe(false);
    expect(s.repo.list()).toEqual([]);
  });
});
