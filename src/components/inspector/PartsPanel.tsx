import { useState } from 'react';
import { DEFAULT_MATERIALS } from '../../cad-kernel/config/catalog';
import { grooveBox, sideGeometry } from '../../cad-kernel/assembler/parts';
import { useProjectStore } from '../../store/useProjectStore';
import { newId } from '../../utils/id';
import { EDGE_SIDES, type Assembly, type Axis, type EdgeSide, type FurnitureModule, type GrooveSpec, type Part, type PartFace } from '../../types/cad.types';
import { MmInput, Row, Section } from './fields';

const EDGE_OPTIONS = [0, 0.4, 1, 2];
const fmt = (v: number) => v.toLocaleString('ru-RU', { maximumFractionDigits: 1 });

const ORIENTATION: Record<Axis, string> = { x: 'Вертикальная', y: 'Горизонтальная', z: 'Фронтальная' };
const FACE_NAMES: Record<Axis, Record<PartFace, string>> = {
  x: { min: 'левая пласть', max: 'правая пласть' },
  y: { min: 'нижняя пласть', max: 'верхняя пласть' },
  z: { min: 'задняя пласть', max: 'передняя пласть' },
};
const CARCASS_ROLES = new Set(['side_left', 'side_right', 'top', 'bottom', 'back']);

function faceLabel(p: Part, face: PartFace, m: FurnitureModule): string {
  const t = p.axes.thickness;
  const base = FACE_NAMES[t][face];
  if (!CARCASS_ROLES.has(p.role)) return base;
  const center = { x: m.dimensions.width / 2, y: m.dimensions.height / 2, z: m.dimensions.depth / 2 }[t];
  const partCenter = p.box.min[t] + p.box.size[t] / 2;
  const inner: PartFace = partCenter < center ? 'max' : 'min';
  return `${base} (${face === inner ? 'внутрь корпуса' : 'наружу'})`;
}

function groupOf(p: Part): string {
  if (CARCASS_ROLES.has(p.role)) return 'Корпус';
  if (p.role === 'plinth_front') return 'Цоколь';
  if (p.role === 'shelf') return 'Полки';
  if (p.role === 'door') return 'Двери';
  return p.name.split(' — ')[0] ?? 'Ящики';
}
const shortName = (p: Part) => (p.name.includes(' — ') ? p.name.split(' — ')[1]! : p.name);

// Общее значение у всех выбранных или null, если они различаются.
function common<T>(values: T[]): T | null {
  return values.every((v) => v === values[0]) ? (values[0] ?? null) : null;
}

// ---------- Чертёж детали ----------

function PartDrawing({ p }: { p: Part }) {
  const t = p.axes.thickness;
  const h: Axis = t === 'x' ? 'z' : 'x';
  const v: Axis = t === 'y' ? 'z' : 'y';
  const W = 250;
  const H = 150;
  const scale = Math.min((W - 60) / p.box.size[h], (H - 56) / p.box.size[v]); // поля под подписи сторон и размеры
  const w = p.box.size[h] * scale;
  const hh = p.box.size[v] * scale;
  const ox = (W - w) / 2;
  const oy = (H - hh) / 2;
  // По вертикали у горизонтальных деталей ось z: перёд (z max) рисуем снизу, как в QDesign.
  const X = (val: number) => ox + (val - p.box.min[h]) * scale;
  const Y = (val: number) => (v === 'y' ? oy + hh - (val - p.box.min[v]) * scale : oy + (val - p.box.min[v]) * scale);

  const sideLine = (side: EdgeSide) => {
    const g = sideGeometry(p.axes, side);
    const edge = g.at === 'max' ? p.box.min[g.axis] + p.box.size[g.axis] : p.box.min[g.axis];
    if (g.axis === h) return { x1: X(edge), y1: oy, x2: X(edge), y2: oy + hh };
    return { x1: ox, y1: Y(edge), x2: ox + w, y2: Y(edge) };
  };

  // Исходный контур до удлинений — пунктиром.
  const orig = { ...p.box.min };
  const origSize = { ...p.box.size };
  for (const side of EDGE_SIDES) {
    const e = p.extend[side];
    if (!e) continue;
    const g = sideGeometry(p.axes, side);
    origSize[g.axis] -= e;
    if (g.at === 'min') orig[g.axis] += e;
  }
  const extended = EDGE_SIDES.some((s) => p.extend[s] !== 0);
  const rect = (min: Part['box']['min'], size: Part['box']['size']) => {
    const xs = [X(min[h]), X(min[h] + size[h])];
    const ys = [Y(min[v]), Y(min[v] + size[v])];
    return { x: Math.min(...xs), y: Math.min(...ys), width: Math.abs(xs[1]! - xs[0]!), height: Math.abs(ys[1]! - ys[0]!) };
  };

  const grainAlongH = p.grainAxis === h;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded border border-slate-200 bg-white" role="img" aria-label="Чертёж детали">
      <rect x={ox} y={oy} width={w} height={hh} fill="#f8fafc" stroke="#334155" strokeWidth={1} />
      {extended && <rect {...rect(orig, origSize)} fill="none" stroke="#64748b" strokeDasharray="3 3" />}
      {[0.35, 0.65].map((k) =>
        grainAlongH ? (
          <line key={k} x1={ox + 6} x2={ox + w - 6} y1={oy + hh * k} y2={oy + hh * k} stroke="#cbd5e1" />
        ) : (
          <line key={k} y1={oy + 6} y2={oy + hh - 6} x1={ox + w * k} x2={ox + w * k} stroke="#cbd5e1" />
        ),
      )}
      {p.grooves.map((g) => {
        const b = grooveBox(p, g);
        return <rect key={g.id} {...rect(b.min, b.size)} fill="#fdba74" stroke="#ea580c" strokeWidth={0.8} />;
      })}
      {EDGE_SIDES.map((side) => {
        const l = sideLine(side);
        const banded = p.edges[side] > 0;
        const vertical = l.x1 === l.x2;
        const lx = vertical ? (l.x1 < W / 2 ? l.x1 - 12 : l.x1 + 12) : (l.x1 + l.x2) / 2;
        const ly = vertical ? (l.y1 + l.y2) / 2 : l.y1 < H / 2 ? l.y1 - 5 : l.y1 + 11;
        return (
          <g key={side}>
            {banded && <line {...l} stroke="#dc2626" strokeWidth={3} />}
            <text x={lx} y={ly} fontSize={9} textAnchor="middle" fill={banded ? '#dc2626' : '#2563eb'}>
              {side}
            </text>
          </g>
        );
      })}
      <text x={ox + w / 2} y={H - 3} fontSize={10} textAnchor="middle" fill="#334155">
        {fmt(p.box.size[h])}
      </text>
      <text x={W - 4} y={oy + hh / 2} fontSize={10} textAnchor="end" fill="#334155">
        {fmt(p.box.size[v])}
      </text>
    </svg>
  );
}

// ---------- Пазы ----------

const DEFAULT_GROOVE: Omit<GrooveSpec, 'id'> = { side: 'L1', face: 'min', offset: 40, width: 16, depth: 8, insetStart: 0, insetEnd: 0 };

// Передняя кромка детали. У узкой глубокой полки это W1, а не L1, поэтому по букве её не угадать.
function frontSide(p: Part): EdgeSide {
  return EDGE_SIDES.find((s) => {
    const g = sideGeometry(p.axes, s);
    return g.axis === 'z' && g.at === 'max';
  }) ?? 'L1';
}

function GrooveEditor({ p, m }: { p: Part; m: FurnitureModule }) {
  const update = useProjectStore((s) => s.updatePartOverrides);
  const last = useProjectStore((s) => s.lastGroove);
  const remember = useProjectStore((s) => s.rememberGroove);
  const [draft, setDraft] = useState<Omit<GrooveSpec, 'id'> | null>(null);
  const stored = m.partOverrides[p.key]?.grooves ?? [];
  const rejected = stored.filter((g) => !p.grooves.some((x) => x.id === g.id));
  const num = (k: keyof Omit<GrooveSpec, 'id' | 'side' | 'face'>, label: string) =>
    draft && (
      <Row label={label}>
        <MmInput value={draft[k]} max={5000} onCommit={(v) => setDraft({ ...draft, [k]: v })} />
      </Row>
    );

  return (
    <Section title="Пазы">
      {stored.map((g) => (
        <div key={g.id} className={`flex items-center justify-between py-0.5 text-xs ${rejected.includes(g) ? 'text-red-600' : 'text-slate-700'}`}>
          <span>
            от {g.side}, {FACE_NAMES[p.axes.thickness][g.face]}: отступ {g.offset}, {g.width}×{g.depth} мм
            {(g.insetStart || g.insetEnd) ? `, не доходя ${g.insetStart}/${g.insetEnd}` : ''}
            {rejected.includes(g) && ' — не применён'}
          </span>
          <button
            className="text-red-600 hover:underline"
            onClick={() => update(m.id, [p.key], (ov) => void (ov.grooves = (ov.grooves ?? []).filter((x) => x.id !== g.id)))}
          >
            убрать
          </button>
        </div>
      ))}
      {draft ? (
        <div className="mt-1 rounded border border-orange-200 bg-orange-50/50 px-2 py-1">
          <Row label="От кромки">
            <select className="rounded border border-slate-300 px-1 text-sm" value={draft.side} onChange={(e) => setDraft({ ...draft, side: e.target.value as EdgeSide })}>
              {EDGE_SIDES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Пласть">
            <select className="max-w-48 rounded border border-slate-300 px-1 text-sm" value={draft.face} onChange={(e) => setDraft({ ...draft, face: e.target.value as PartFace })}>
              {(['min', 'max'] as const).map((f) => (
                <option key={f} value={f}>
                  {faceLabel(p, f, m)}
                </option>
              ))}
            </select>
          </Row>
          {num('offset', 'Отступ от кромки')}
          {num('width', 'Ширина паза')}
          {num('depth', 'Глубина паза')}
          {num('insetStart', 'Не доходя до начала')}
          {num('insetEnd', 'Не доходя до конца')}
          <div className="flex gap-2 py-1">
            <button
              className="rounded bg-orange-600 px-2 py-0.5 text-white hover:bg-orange-700"
              onClick={() => {
                const g = { ...draft, id: newId('gr') };
                update(m.id, [p.key], (ov) => void (ov.grooves = [...(ov.grooves ?? []), g]));
                remember(draft);
                setDraft(null);
              }}
            >
              Добавить паз
            </button>
            <button className="rounded px-2 py-0.5 hover:bg-slate-100" onClick={() => setDraft(null)}>
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <button className="mt-1 rounded bg-slate-100 px-2 py-0.5 hover:bg-slate-200" onClick={() => setDraft({ ...(last ?? DEFAULT_GROOVE), side: frontSide(p) })}>
          + паз
        </button>
      )}
      <p className="pt-1 text-xs text-slate-500">Например, под LED-профиль: отступ 40, ширина 16, глубина 8 мм.</p>
    </Section>
  );
}

// ---------- Карточка выбранных деталей ----------

function PartCard({ parts, m }: { parts: Part[]; m: FurnitureModule }) {
  const update = useProjectStore((s) => s.updatePartOverrides);
  const reset = useProjectStore((s) => s.resetPartOverrides);
  const select = useProjectStore((s) => s.selectParts);
  const keys = parts.map((p) => p.key);
  const single = parts.length === 1 ? parts[0]! : null;
  const set = (recipe: Parameters<typeof update>[2]) => update(m.id, keys, recipe);

  const thickness = common(parts.map((p) => p.thickness));
  const material = common(parts.map((p) => p.materialId));
  const grain = common(parts.map((p) => (p.grainAxis === p.axes.long ? 'long' : 'short')));
  const matOptions = thickness === null ? [] : DEFAULT_MATERIALS.filter((mt) => mt.thickness === thickness);

  return (
    <div className="text-sm">
      <Section title={single ? 'Деталь' : `Выбрано деталей: ${parts.length}`}>
        {single ? (
          <>
            <Row label="Название">
              <input
                key={single.key + single.name}
                className="w-44 rounded border border-slate-300 px-1.5 py-0.5"
                defaultValue={single.name}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== single.name) set((ov) => void (ov.name = v));
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              />
            </Row>
            <Row label="Тип">
              <span>{ORIENTATION[single.axes.thickness]}</span>
            </Row>
          </>
        ) : (
          <p className="pb-1 text-xs text-slate-500">Изменение применится ко всем выбранным. «разные» — значения у деталей отличаются.</p>
        )}
        <Row label="Материал">
          {thickness === null ? (
            <span className="text-xs text-slate-500">у деталей разная толщина</span>
          ) : (
            <select
              className="max-w-48 rounded border border-slate-300 px-1 py-0.5 text-sm"
              value={material ?? ''}
              onChange={(e) => {
                const id = e.target.value;
                if (id) set((ov) => void (ov.materialId = id));
              }}
            >
              {material === null && <option value="">— разные —</option>}
              {matOptions.map((mt) => (
                <option key={mt.id} value={mt.id}>
                  {mt.code} · {mt.name}
                </option>
              ))}
            </select>
          )}
        </Row>
        <div role="radiogroup" aria-label="Текстура" className="flex items-center justify-between gap-2 py-1 text-sm">
          <span className="text-slate-600">Текстура</span>
          <span className="flex gap-2">
            {(['long', 'short'] as const).map((g) => (
              <label key={g} className="flex items-center gap-1">
                <input type="radio" checked={grain === g} onChange={() => set((ov) => void (ov.grain = g))} />
                {g === 'long' ? 'по длине' : 'по ширине'}
              </label>
            ))}
          </span>
        </div>
        {single && (
          <Row label="Размер распила">
            <span className="tabular-nums">
              {fmt(single.cut.length)} × {fmt(single.cut.width)} × {fmt(single.thickness)}
            </span>
          </Row>
        )}
      </Section>

      {single && (
        <div className="border-b border-slate-200 px-3 py-2">
          <PartDrawing p={single} />
          <p className="pt-1 text-xs text-slate-500">
            Красное — кромка. Длина распила — вдоль волокон.{EDGE_SIDES.some((s) => single.extend[s]) && ' Пунктир — исходный контур до удлинения.'}
          </p>
        </div>
      )}

      <Section title="Кромка и удлинение сторон">
        <div className="grid grid-cols-[auto_repeat(4,1fr)] items-center gap-x-1 gap-y-1 text-xs">
          <span />
          {EDGE_SIDES.map((s) => (
            <span key={s} className="text-center font-semibold text-slate-600">
              {s}
            </span>
          ))}
          <span className="text-slate-500">Кромка, мм</span>
          {EDGE_SIDES.map((side) => {
            const v = common(parts.map((p) => p.edges[side]));
            const options = v !== null && !EDGE_OPTIONS.includes(v) ? [...EDGE_OPTIONS, v] : EDGE_OPTIONS;
            return (
              <select
                key={side}
                aria-label={`Кромка ${side}`}
                className={`rounded border px-0.5 py-0.5 ${v ? 'border-red-300 bg-red-50 text-red-700' : 'border-slate-300'}`}
                value={v ?? ''}
                onChange={(e) => {
                  const t = Number(e.target.value);
                  set((ov) => {
                    ov.edges ??= {};
                    ov.edges[side] = { ...ov.edges[side], thickness: t };
                  });
                }}
              >
                {v === null && <option value="">разные</option>}
                {options.map((o) => (
                  <option key={o} value={o}>
                    {o === 0 ? 'нет' : fmt(o)}
                  </option>
                ))}
              </select>
            );
          })}
          <span className="text-slate-500">Удлинение</span>
          {EDGE_SIDES.map((side) => {
            const v = common(parts.map((p) => p.extend[side]));
            return (
              <SideExtend
                key={side}
                side={side}
                value={v}
                onCommit={(val) =>
                  set((ov) => {
                    ov.edges ??= {};
                    ov.edges[side] = { ...ov.edges[side], extend: val };
                  })
                }
              />
            );
          })}
        </div>
        <p className="pt-1 text-xs text-slate-500">Удлинение наращивает только эту деталь, размеры модуля не меняются. Минус — укоротить.</p>
      </Section>

      {single && <GrooveEditor p={single} m={m} />}

      <div className="flex flex-wrap gap-2 px-3 py-2">
        <button
          className="rounded border border-red-300 px-2 py-0.5 text-red-700 hover:bg-red-50"
          onClick={() => {
            const what = single ? `«${single.name}»` : `${parts.length} детали`;
            if (!confirm(`Удалить ${what}? Деталь уйдёт из сцены, деталировки и сметы. Вернуть можно в разделе «Удалённые детали».`)) return;
            set((ov) => void (ov.deleted = true));
            select(m.id, []);
          }}
        >
          Удалить
        </button>
        {parts.some((p) => p.overridden) && (
          <button className="rounded border border-slate-300 px-2 py-0.5 hover:bg-slate-50" onClick={() => reset(m.id, keys)}>
            Сбросить правки
          </button>
        )}
      </div>
    </div>
  );
}

function SideExtend({ side, value, onCommit }: { side: EdgeSide; value: number | null; onCommit: (v: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value === null ? '' : String(value));
  return (
    <input
      aria-label={`Удлинение ${side}`}
      className={`w-full rounded border px-1 py-0.5 text-right tabular-nums ${value ? 'border-blue-400 bg-blue-50' : 'border-slate-300'}`}
      placeholder={value === null ? 'разные' : ''}
      inputMode="decimal"
      value={shown}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== null) {
          const v = Number(draft.replace(',', '.'));
          if (Number.isFinite(v) && Math.abs(v) <= 2000 && v !== value) onCommit(v);
        }
        setDraft(null);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') setDraft(null);
      }}
    />
  );
}

// ---------- Панель целиком ----------

export function PartsPanel({ module: m, assembly }: { module: FurnitureModule; assembly: Assembly | undefined }) {
  const selected = useProjectStore((s) => s.selectedParts);
  const select = useProjectStore((s) => s.selectParts);
  const update = useProjectStore((s) => s.updatePartOverrides);
  const parts = assembly?.parts ?? [];
  const chosen = parts.filter((p) => selected.includes(p.key));

  const groups = new Map<string, Part[]>();
  for (const p of parts) {
    const g = groupOf(p);
    groups.set(g, [...(groups.get(g) ?? []), p]);
  }

  const click = (key: string, multi: boolean) =>
    select(m.id, multi ? (selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]) : [key]);

  return (
    <div className="text-sm">
      <div className="border-b border-slate-200 px-3 py-2">
        <div className="font-semibold">Детали: {m.name}</div>
        <div className="text-xs text-slate-500">Клик по детали на сцене или в списке, Ctrl+клик — несколько. A — выйти из режима.</div>
      </div>
      <div className="max-h-56 overflow-auto border-b border-slate-200 px-3 py-2">
        {[...groups].map(([g, list]) => (
          <div key={g} className="py-0.5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{g}</div>
            <div className="flex flex-wrap gap-1 py-0.5">
              {list.map((p) => (
                <button
                  key={p.key}
                  onClick={(e) => click(p.key, e.ctrlKey || e.metaKey)}
                  className={`rounded px-1.5 py-0.5 text-xs ${selected.includes(p.key) ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}
                  title={p.name}
                >
                  {shortName(p)}
                  {p.overridden && <span className="ml-0.5 text-orange-500">•</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
        {assembly && assembly.deletedParts.length > 0 && (
          <div className="mt-1 border-t border-dashed border-slate-300 pt-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Удалённые детали</div>
            {assembly.deletedParts.map((d) => (
              <div key={d.key} className="flex items-center justify-between py-0.5 text-xs text-slate-500">
                <span className="line-through">{d.name}</span>
                <button className="text-blue-700 hover:underline" onClick={() => update(m.id, [d.key], (ov) => void delete ov.deleted)}>
                  восстановить
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {chosen.length > 0 ? (
        <PartCard key={chosen.map((p) => p.key).join('|')} parts={chosen} m={m} />
      ) : (
        <p className="px-3 py-4 text-slate-500">Выберите деталь, чтобы настроить её материал, текстуру, кромку, удлинение и пазы.</p>
      )}
    </div>
  );
}
