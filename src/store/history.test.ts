import { beforeEach, describe, expect, it } from 'vitest';
import { createDemoProject, useProjectStore } from './useProjectStore';
import { HISTORY_LIMIT } from './history';

const st = () => useProjectStore.getState();
const mod = (i: number) => st().project.modules[i]!;

beforeEach(() => {
  st().loadProject(createDemoProject());
});

describe('Отмена и повтор', () => {
  it('удалённый модуль возвращается вместе с ящиками, повтор снова удаляет', () => {
    const right = mod(1);
    expect(right.subdivisions.drawers).toHaveLength(1);
    st().removeModule(right.id);
    expect(st().project.modules).toHaveLength(1);

    st().undo();
    expect(st().project.modules).toHaveLength(2);
    expect(mod(1)).toBe(right); // тот же объект: ничего не пересобрано и не потеряно
    expect(st().selectedId).toBe(right.id);
    expect(st().historyMessage?.text).toBe('Отменено: удалён модуль «Правая тумба»');

    st().redo();
    expect(st().project.modules).toHaveLength(1);
    expect(st().historyMessage?.text).toBe('Повторено: удалён модуль «Правая тумба»');
  });

  it('правки отменяются по одной в обратном порядке', () => {
    const id = mod(0).id;
    st().updateModule(id, (m) => void (m.dimensions.width = 500));
    st().updateModule(id, (m) => void (m.dimensions.height = 700));
    st().updateModule(id, (m) => void (m.construction.topType = 'insert'));

    st().undo();
    expect(mod(0).construction.topType).toBe('overlay');
    expect(mod(0).dimensions.height).toBe(700);
    st().undo();
    expect(mod(0).dimensions.height).toBe(634);
    expect(mod(0).dimensions.width).toBe(500);
    st().undo();
    expect(mod(0).dimensions.width).toBe(353);
    expect(st().past).toHaveLength(0);
  });

  it('новая правка после отмены сбрасывает «повторить»', () => {
    const id = mod(0).id;
    st().updateModule(id, (m) => void (m.dimensions.width = 500));
    st().undo();
    expect(st().future).toHaveLength(1);
    st().updateModule(id, (m) => void (m.dimensions.depth = 450));
    expect(st().future).toHaveLength(0);
  });

  it('то же значение в поле не создаёт шаг истории', () => {
    const id = mod(0).id;
    st().updateModule(id, (m) => void (m.dimensions.width = 353));
    expect(st().past).toHaveLength(0);
  });

  it('выбор модуля и показ фасадов не попадают в историю', () => {
    st().select(mod(1).id);
    st().setShowFacades(false);
    expect(st().past).toHaveLength(0);
  });

  it('отмена показывает модуль, который изменился, даже если выбран другой', () => {
    const right = mod(1).id;
    st().updateModule(right, (m) => void (m.subdivisions.drawers[0]!.count = 2));
    st().select(mod(0).id);
    st().undo();
    expect(st().selectedId).toBe(right);
    expect(st().historyMessage?.text).toBe('Отменено: «Правая тумба»: ящики');
  });

  it('добавление модуля отменяется, выбор возвращается на существующий', () => {
    st().addModule();
    const added = st().selectedId;
    st().undo();
    expect(st().project.modules.some((m) => m.id === added)).toBe(false);
    expect(st().project.modules.some((m) => m.id === st().selectedId)).toBe(true);
  });

  it('название проекта и клиент отменяются', () => {
    st().setProjectMeta({ clientName: 'Иванов' });
    st().undo();
    expect(st().project.clientName).toBe('');
    expect(st().historyMessage?.text).toBe('Отменено: клиент');
  });

  it('удаление полки с переездом фасадов отменяется целиком', () => {
    const left = mod(0);
    const shelfId = left.subdivisions.shelves[0]!.id;
    st().updateModule(left.id, (m) => void (m.subdivisions.doors[0]!.topRef = shelfId));
    st().removeShelf(left.id);
    expect(mod(0).subdivisions.doors[0]!.topRef).toBe('top');
    st().undo();
    expect(mod(0).subdivisions.shelves[0]!.id).toBe(shelfId);
    expect(mod(0).subdivisions.doors[0]!.topRef).toBe(shelfId);
  });

  it('открытие другого проекта очищает историю', () => {
    st().updateModule(mod(0).id, (m) => void (m.dimensions.width = 500));
    st().loadProject(createDemoProject());
    expect(st().past).toHaveLength(0);
    st().undo(); // ничего не делает
    expect(mod(0).dimensions.width).toBe(353);
  });

  it(`хранится не больше ${HISTORY_LIMIT} шагов`, () => {
    const id = mod(0).id;
    for (let i = 1; i <= HISTORY_LIMIT + 20; i++) st().updateModule(id, (m) => void (m.dimensions.width = 400 + i));
    expect(st().past).toHaveLength(HISTORY_LIMIT);
    for (let i = 0; i < HISTORY_LIMIT; i++) st().undo();
    expect(mod(0).dimensions.width).toBe(400 + 20); // старее лимита не вернуть
  });

  it('пустая история: отмена и повтор ничего не делают', () => {
    const before = st().project;
    st().undo();
    st().redo();
    expect(st().project).toBe(before);
    expect(st().historyMessage).toBeNull();
  });
});
