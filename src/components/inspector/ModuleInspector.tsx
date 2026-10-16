import { computeInnerSpace } from '../../cad-kernel/assembler/CabinetAssembler';
import { distributeShelves } from '../../cad-kernel/assembler/ShelfEngine';
import { selectRunnerLength } from '../../cad-kernel/assembler/DrawerEngine';
import { DEFAULT_MATERIALS } from '../../cad-kernel/config/catalog';
import { MATERIALS, NORMS } from '../../store/useAssemblies';
import { newId, useProjectStore } from '../../store/useProjectStore';
import type { BackJoinery, BottomJoinery, FurnitureModule, TopJoinery } from '../../types/cad.types';
import { MmInput, Row, Section, Select } from './fields';

const TOP: { value: TopJoinery; label: string }[] = [
  { value: 'overlay', label: 'Накладная' },
  { value: 'insert', label: 'Вкладная' },
  { value: 'none', label: 'Нет' },
];
const BOTTOM: { value: BottomJoinery; label: string }[] = [
  { value: 'overlay', label: 'Накладное' },
  { value: 'insert', label: 'Вкладное' },
];
const BACK: { value: BackJoinery; label: string }[] = [
  { value: 'groove_hdf', label: 'ХДФ в паз' },
  { value: 'overlay', label: 'ХДФ накладная' },
  { value: 'insert', label: 'Вкладная' },
  { value: 'none', label: 'Нет' },
];

const sheetOptions = (types: string[]) =>
  DEFAULT_MATERIALS.filter((m) => types.includes(m.type)).map((m) => ({
    value: m.id,
    label: `${m.code} · ${m.name} ${m.thickness}`,
  }));

export function ModuleInspector({ module: m, warnings }: { module: FurnitureModule; warnings: string[] }) {
  const update = useProjectStore((s) => s.updateModule);
  const remove = useProjectStore((s) => s.removeModule);
  const set = (recipe: (d: FurnitureModule) => void) => update(m.id, recipe);

  const inner = computeInnerSpace(m, MATERIALS, NORMS);
  const T = MATERIALS.get(m.materials.carcassMaterialId)?.thickness ?? 16;
  const layout = distributeShelves(inner.y1 - inner.y0, T, m.subdivisions.shelves);
  const runner = selectRunnerLength(inner.z1 - inner.z0, NORMS);

  return (
    <div className="text-sm">
      <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
        <input
          className="min-w-0 flex-1 rounded border border-transparent px-1 font-semibold hover:border-slate-300"
          value={m.name}
          onChange={(e) => set((d) => void (d.name = e.target.value))}
        />
        <button className="text-xs text-red-600 hover:underline" onClick={() => remove(m.id)}>
          Удалить
        </button>
      </div>

      {warnings.length > 0 && (
        <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
      )}

      <Section title="Габариты">
        <Row label="Ширина">
          <MmInput value={m.dimensions.width} min={50} onCommit={(v) => set((d) => void (d.dimensions.width = v))} />
        </Row>
        <Row label="Высота">
          <MmInput value={m.dimensions.height} min={50} onCommit={(v) => set((d) => void (d.dimensions.height = v))} />
        </Row>
        <Row label="Глубина">
          <MmInput value={m.dimensions.depth} min={50} onCommit={(v) => set((d) => void (d.dimensions.depth = v))} />
        </Row>
        <Row label="Позиция X">
          <MmInput value={m.transform.x} min={-20000} max={20000} onCommit={(v) => set((d) => void (d.transform.x = v))} />
        </Row>
        <Row label="Подъём от пола">
          <MmInput value={m.transform.y} onCommit={(v) => set((d) => void (d.transform.y = v))} />
        </Row>
      </Section>

      <Section title="Конструкция">
        <Row label="Крыша">
          <Select value={m.construction.topType} options={TOP} onChange={(v) => set((d) => void (d.construction.topType = v))} />
        </Row>
        <Row label="Дно">
          <Select
            value={m.construction.bottomType}
            options={BOTTOM}
            onChange={(v) => set((d) => void (d.construction.bottomType = v))}
          />
        </Row>
        <Row label="Задняя стенка">
          <Select value={m.construction.backType} options={BACK} onChange={(v) => set((d) => void (d.construction.backType = v))} />
        </Row>
        <Row label="Левая боковина до пола">
          <input
            type="checkbox"
            checked={m.construction.leftSideToFloor}
            onChange={(e) => set((d) => void (d.construction.leftSideToFloor = e.target.checked))}
          />
        </Row>
        <Row label="Правая боковина до пола">
          <input
            type="checkbox"
            checked={m.construction.rightSideToFloor}
            onChange={(e) => set((d) => void (d.construction.rightSideToFloor = e.target.checked))}
          />
        </Row>
        <Row label="Крепёж">
          <Select
            value={m.construction.connectorType}
            options={[
              { value: 'minifix', label: 'Минификс' },
              { value: 'confirmat', label: 'Конфирмат' },
              { value: 'dowel', label: 'Шкант' },
            ]}
            onChange={(v) => set((d) => void (d.construction.connectorType = v))}
          />
        </Row>
      </Section>

      <Section title="Цоколь">
        <Row label="Высота (0 — навесной)">
          <MmInput value={m.plinth.height} max={300} onCommit={(v) => set((d) => void (d.plinth.height = v))} />
        </Row>
        <Row label="Отступ от фасада">
          <MmInput value={m.plinth.setback} max={200} onCommit={(v) => set((d) => void (d.plinth.setback = v))} />
        </Row>
      </Section>

      <Section title="Материалы">
        <Row label="Корпус">
          <Select
            value={m.materials.carcassMaterialId}
            options={sheetOptions(['ldsp'])}
            onChange={(v) => set((d) => void (d.materials.carcassMaterialId = v))}
          />
        </Row>
        <Row label="Задняя стенка">
          <Select
            value={m.materials.backMaterialId}
            options={sheetOptions(m.construction.backType === 'insert' ? ['ldsp'] : ['hdf'])}
            onChange={(v) => set((d) => void (d.materials.backMaterialId = v))}
          />
        </Row>
        <Row label="Цоколь">
          <Select
            value={m.materials.plinthMaterialId}
            options={sheetOptions(['ldsp'])}
            onChange={(v) => set((d) => void (d.materials.plinthMaterialId = v))}
          />
        </Row>
      </Section>

      <Section title="Полки">
        <p className="mb-1 text-xs text-slate-500">
          Внутренний проём {Math.round(inner.y1 - inner.y0)} × {Math.round(inner.x1 - inner.x0)} × {Math.round(inner.z1 - inner.z0)} мм
        </p>
        {m.subdivisions.shelves.map((sh, i) => (
          <div key={sh.id} className="flex items-center justify-between gap-2 py-1">
            <span className="text-slate-600">
              Проём под полкой {i + 1}: <b className="tabular-nums">{layout.gaps[i]}</b> мм
            </span>
            <span className="flex items-center gap-1">
              <button
                title={sh.lockedGapBelow === null ? 'Зафиксировать проём' : 'Снять замок'}
                className={`rounded px-1.5 text-xs ${sh.lockedGapBelow === null ? 'bg-slate-100' : 'bg-blue-600 text-white'}`}
                onClick={() =>
                  set((d) => {
                    const s = d.subdivisions.shelves[i];
                    if (s) s.lockedGapBelow = s.lockedGapBelow === null ? (layout.gaps[i] ?? 0) : null;
                  })
                }
              >
                {sh.lockedGapBelow === null ? 'замок' : 'закреплён'}
              </button>
              {sh.lockedGapBelow !== null && (
                <MmInput
                  value={sh.lockedGapBelow}
                  onCommit={(v) =>
                    set((d) => {
                      const s = d.subdivisions.shelves[i];
                      if (s) s.lockedGapBelow = v;
                    })
                  }
                />
              )}
            </span>
          </div>
        ))}
        <p className="py-1 text-slate-600">
          Верхний проём: <b className="tabular-nums">{layout.gaps[layout.gaps.length - 1]}</b> мм
        </p>
        <div className="flex gap-2 pt-1">
          <button
            className="rounded bg-slate-100 px-2 py-0.5 hover:bg-slate-200"
            onClick={() => set((d) => void d.subdivisions.shelves.push({ id: newId('sh'), lockedGapBelow: null }))}
          >
            + полка
          </button>
          <button
            className="rounded bg-slate-100 px-2 py-0.5 hover:bg-slate-200 disabled:opacity-40"
            disabled={m.subdivisions.shelves.length === 0}
            onClick={() => set((d) => void d.subdivisions.shelves.pop())}
          >
            − полка
          </button>
        </div>
      </Section>

      <Section title="Ящики (подбор направляющих)">
        <p className="text-slate-600">
          Направляющая для этой глубины: <b>{runner ? `${runner} мм` : 'не помещается'}</b>
        </p>
      </Section>
    </div>
  );
}
