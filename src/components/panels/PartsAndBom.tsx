import { useMemo, useState } from 'react';
import { aggregateHardware, calculateBom } from '../../production/BomCalculator';
import { MATERIALS, NORMS } from '../../store/useAssemblies';
import { useProjectStore } from '../../store/useProjectStore';
import type { Assembly } from '../../types/cad.types';
import { DEFAULT_NORMS } from '../../cad-kernel/config/norms';

type Tab = 'parts' | 'bom' | 'hardware' | 'norms';

const fmt = (v: number, d = 0) => v.toLocaleString('ru-RU', { maximumFractionDigits: d, minimumFractionDigits: d });

function formatNorm(v: number | number[] | [number, number][]): string {
  if (!Array.isArray(v)) return String(v);
  return v.map((x) => (Array.isArray(x) ? `до ${x[0]} мм — ${x[1]}` : String(x))).join(', ');
}

export function PartsAndBom({ assemblies }: { assemblies: Assembly[] }) {
  const [tab, setTab] = useState<Tab>('parts');
  const modules = useProjectStore((s) => s.project.modules);
  const selectedId = useProjectStore((s) => s.selectedId);
  const allParts = useMemo(() => assemblies.flatMap((a) => a.parts), [assemblies]);
  const bom = useMemo(() => calculateBom(allParts, MATERIALS, NORMS), [allParts]);
  const hardware = useMemo(() => aggregateHardware(assemblies.flatMap((a) => a.hardware)), [assemblies]);
  const moduleName = (id: string) => modules.find((m) => m.id === id)?.name ?? id;

  const tabBtn = (t: Tab, label: string) => (
    <button
      className={`px-3 py-1.5 text-sm ${tab === t ? 'border-b-2 border-blue-600 font-semibold' : 'text-slate-500'}`}
      onClick={() => setTab(t)}
    >
      {label}
    </button>
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex border-b border-slate-200 px-2">
        {tabBtn('parts', `Деталировка (${allParts.length})`)}
        {tabBtn('bom', 'Смета материалов')}
        {tabBtn('hardware', `Фурнитура (${hardware.length})`)}
        {tabBtn('norms', 'Нормы цеха')}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {tab === 'parts' && (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-3 py-1">Модуль</th>
                <th className="px-3 py-1">Деталь</th>
                <th className="px-3 py-1">Материал</th>
                <th className="px-3 py-1 text-right">Длина (вдоль волокон)</th>
                <th className="px-3 py-1 text-right">Ширина</th>
                <th className="px-3 py-1 text-right">Толщ.</th>
                <th className="px-3 py-1">Кромка</th>
              </tr>
            </thead>
            <tbody>
              {allParts.map((p) => (
                <tr key={p.id} className={`border-t border-slate-100 ${p.moduleId === selectedId ? 'bg-blue-50' : ''}`}>
                  <td className="px-3 py-1">{moduleName(p.moduleId)}</td>
                  <td className="px-3 py-1">{p.name}</td>
                  <td className="px-3 py-1">{MATERIALS.get(p.materialId)?.code ?? p.materialId}</td>
                  <td className="px-3 py-1 text-right tabular-nums">{fmt(p.cut.length, 1)}</td>
                  <td className="px-3 py-1 text-right tabular-nums">{fmt(p.cut.width, 1)}</td>
                  <td className="px-3 py-1 text-right tabular-nums">{p.thickness}</td>
                  <td className="px-3 py-1 text-xs text-slate-500">
                    {p.edging.length + p.edging.width === 0
                      ? '—'
                      : [p.edging.length && `${p.edging.length}×Д`, p.edging.width && `${p.edging.width}×Ш`]
                          .filter(Boolean)
                          .join(' ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'bom' && (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-3 py-1">Материал</th>
                <th className="px-3 py-1 text-right">Деталей</th>
                <th className="px-3 py-1 text-right">Площадь, м²</th>
                <th className="px-3 py-1 text-right">С отходом ×{NORMS.wasteFactor}, м²</th>
                <th className="px-3 py-1 text-right">Кромка, м.п.</th>
                <th className="px-3 py-1 text-right">Стоимость</th>
              </tr>
            </thead>
            <tbody>
              {bom.lines.map((l) => (
                <tr key={l.materialId} className="border-t border-slate-100">
                  <td className="px-3 py-1">
                    {l.materialCode} · {l.materialName} {l.thickness} мм
                  </td>
                  <td className="px-3 py-1 text-right tabular-nums">{l.partCount}</td>
                  <td className="px-3 py-1 text-right tabular-nums">{fmt(l.netAreaM2, 3)}</td>
                  <td className="px-3 py-1 text-right tabular-nums">{fmt(l.grossAreaM2, 3)}</td>
                  <td className="px-3 py-1 text-right tabular-nums">{fmt(l.edgingM, 2)}</td>
                  <td className="px-3 py-1 text-right text-slate-400">
                    {l.costRub === null ? 'нет цены' : `${fmt(l.costRub, 2)} ₽`}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-300 font-semibold">
                <td className="px-3 py-1" colSpan={5}>
                  Итого
                </td>
                <td className="px-3 py-1 text-right">
                  {bom.totalCostRub === null ? 'нужен прайс' : `${fmt(bom.totalCostRub, 2)} ₽`}
                </td>
              </tr>
            </tfoot>
          </table>
        )}

        {tab === 'hardware' && (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-3 py-1">Позиция</th>
                <th className="px-3 py-1 text-right">Количество</th>
                <th className="px-3 py-1">Ед.</th>
                <th className="px-3 py-1 text-right">Стоимость</th>
              </tr>
            </thead>
            <tbody>
              {hardware.map((h) => (
                <tr key={h.key} className="border-t border-slate-100">
                  <td className="px-3 py-1">{h.name}</td>
                  <td className="px-3 py-1 text-right tabular-nums">{fmt(h.qty, h.unit === 'м.п.' ? 2 : 0)}</td>
                  <td className="px-3 py-1 text-slate-500">{h.unit}</td>
                  <td className="px-3 py-1 text-right text-slate-400">нет цены</td>
                </tr>
              ))}
              {hardware.length === 0 && (
                <tr>
                  <td className="px-3 py-2 text-slate-500" colSpan={4}>
                    Фурнитура появится, когда в модулях будут двери или ящики. Стяжки корпуса пока не считаются: нужна норма цеха.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {tab === 'norms' && (
          <table className="w-full text-sm">
            <tbody>
              {Object.entries(DEFAULT_NORMS).map(([key, n]) => (
                <tr key={key} className="border-t border-slate-100">
                  <td className="px-3 py-1">{n.note}</td>
                  <td className="px-3 py-1 text-right tabular-nums">
                    {formatNorm(n.value)}
                  </td>
                  <td className="px-3 py-1">
                    {n.source === 'spec' ? (
                      <span className="text-xs text-slate-500">из ТЗ</span>
                    ) : (
                      <span className="rounded bg-amber-100 px-1.5 text-xs text-amber-800">допущение — проверить</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
