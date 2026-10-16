import { drawerDepthAvailable, selectRunnerLength } from '../../cad-kernel/assembler/DrawerEngine';
import { computeInnerSpace } from '../../cad-kernel/assembler/CabinetAssembler';
import { MATERIALS, NORMS } from '../../store/useAssemblies';
import { useProjectStore } from '../../store/useProjectStore';
import type { DoorItem, DrawerBlock, FacadeMount, FurnitureModule, HandleType, RunnerType } from '../../types/cad.types';
import { Row, Section, Select } from './fields';

const MOUNT: { value: FacadeMount; label: string }[] = [
  { value: 'overlay', label: 'Накладной' },
  { value: 'insert', label: 'Вкладной' },
];
const DOOR_HANDLE: { value: HandleType; label: string }[] = [
  { value: 'none', label: 'Нет (Tip-On)' },
  { value: 'bracket', label: 'Скоба' },
  { value: 'rail', label: 'Рейлинг' },
  { value: 'profile', label: 'Профиль' },
];
const DRAWER_HANDLE: { value: HandleType; label: string }[] = [
  { value: 'none', label: 'Нет (Push-to-Open)' },
  ...DOOR_HANDLE.slice(1),
];
const RUNNER: { value: RunnerType; label: string }[] = [
  { value: 'telescopic', label: 'Шариковые' },
  { value: 'concealed_tandem', label: 'Скрытые' },
];

function boundaryOptions(m: FurnitureModule) {
  const shelves = m.subdivisions.shelves.map((s, i) => ({ value: s.id, label: `Полка ${i + 1}` }));
  return {
    bottom: [{ value: 'bottom', label: 'Дно' }, ...shelves],
    top: [...shelves, { value: 'top', label: m.construction.topType === 'none' ? 'Верх корпуса' : 'Крыша' }],
  };
}

function Card({ title, onRemove, children }: { title: string; onRemove: () => void; children: React.ReactNode }) {
  return (
    <div className="mb-2 rounded border border-slate-200 px-2 py-1">
      <div className="flex items-center justify-between">
        <span className="font-medium">{title}</span>
        <button className="text-xs text-red-600 hover:underline" onClick={onRemove}>
          убрать
        </button>
      </div>
      {children}
    </div>
  );
}

export function FacadesInspector({ module: m }: { module: FurnitureModule }) {
  const update = useProjectStore((s) => s.updateModule);
  const addDoor = useProjectStore((s) => s.addDoor);
  const addDrawerBlock = useProjectStore((s) => s.addDrawerBlock);
  const refs = boundaryOptions(m);
  const inner = computeInnerSpace(m, MATERIALS, NORMS);

  const setDoor = (i: number, recipe: (d: DoorItem) => void) =>
    update(m.id, (mod) => {
      const d = mod.subdivisions.doors[i];
      if (d) recipe(d);
    });
  const setBlock = (i: number, recipe: (d: DrawerBlock) => void) =>
    update(m.id, (mod) => {
      const d = mod.subdivisions.drawers[i];
      if (d) recipe(d);
    });

  return (
    <>
      <Section title="Двери">
        {m.subdivisions.doors.map((d, i) => (
          <Card key={d.id} title={`Дверь ${i + 1}`} onRemove={() => update(m.id, (mod) => void mod.subdivisions.doors.splice(i, 1))}>
            <Row label="Снизу">
              <Select value={d.bottomRef} options={refs.bottom} onChange={(v) => setDoor(i, (x) => void (x.bottomRef = v))} />
            </Row>
            <Row label="Сверху">
              <Select value={d.topRef} options={refs.top} onChange={(v) => setDoor(i, (x) => void (x.topRef = v))} />
            </Row>
            <Row label="Установка">
              <Select value={d.mount} options={MOUNT} onChange={(v) => setDoor(i, (x) => void (x.mount = v))} />
            </Row>
            <Row label="Створки">
              <Select
                value={String(d.leaves) as '1' | '2'}
                options={[
                  { value: '1', label: 'Одна' },
                  { value: '2', label: 'Две' },
                ]}
                onChange={(v) => setDoor(i, (x) => void (x.leaves = v === '2' ? 2 : 1))}
              />
            </Row>
            {d.leaves === 1 && (
              <Row label="Петли">
                <Select
                  value={d.hingeSide}
                  options={[
                    { value: 'left', label: 'Слева' },
                    { value: 'right', label: 'Справа' },
                  ]}
                  onChange={(v) => setDoor(i, (x) => void (x.hingeSide = v))}
                />
              </Row>
            )}
            <Row label="Ручка">
              <Select value={d.handle} options={DOOR_HANDLE} onChange={(v) => setDoor(i, (x) => void (x.handle = v))} />
            </Row>
          </Card>
        ))}
        <button className="rounded bg-slate-100 px-2 py-0.5 hover:bg-slate-200" onClick={() => addDoor(m.id)}>
          + дверь
        </button>
      </Section>

      <Section title="Ящики">
        {m.subdivisions.drawers.map((b, i) => {
          const runner = selectRunnerLength(
            drawerDepthAvailable(inner, MATERIALS.get(m.materials.facadeMaterialId)?.thickness ?? 19, b.mount),
            NORMS,
          );
          return (
            <Card
              key={b.id}
              title={`Блок ящиков ${i + 1}`}
              onRemove={() => update(m.id, (mod) => void mod.subdivisions.drawers.splice(i, 1))}
            >
              <Row label="Снизу">
                <Select value={b.bottomRef} options={refs.bottom} onChange={(v) => setBlock(i, (x) => void (x.bottomRef = v))} />
              </Row>
              <Row label="Сверху">
                <Select value={b.topRef} options={refs.top} onChange={(v) => setBlock(i, (x) => void (x.topRef = v))} />
              </Row>
              <Row label="Количество">
                <Select
                  value={String(b.count)}
                  options={[1, 2, 3, 4, 5, 6].map((k) => ({ value: String(k), label: String(k) }))}
                  onChange={(v) => setBlock(i, (x) => void (x.count = Number(v)))}
                />
              </Row>
              <Row label="Фасады">
                <Select value={b.mount} options={MOUNT} onChange={(v) => setBlock(i, (x) => void (x.mount = v))} />
              </Row>
              <Row label="Направляющие">
                <Select value={b.runnerType} options={RUNNER} onChange={(v) => setBlock(i, (x) => void (x.runnerType = v))} />
              </Row>
              <Row label="Ручка">
                <Select value={b.handle} options={DRAWER_HANDLE} onChange={(v) => setBlock(i, (x) => void (x.handle = v))} />
              </Row>
              <p className="py-1 text-xs text-slate-500">
                Длина направляющей: <b>{runner ? `${runner} мм` : 'не помещается'}</b>
              </p>
            </Card>
          );
        })}
        <button className="rounded bg-slate-100 px-2 py-0.5 hover:bg-slate-200" onClick={() => addDrawerBlock(m.id)}>
          + блок ящиков
        </button>
      </Section>
    </>
  );
}
