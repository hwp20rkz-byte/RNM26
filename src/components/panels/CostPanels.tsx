import { useMemo, useState } from 'react';
import { WORKSHOPS, workshopById } from '../../cad-kernel/config/workshops';
import { DEFAULT_MATERIALS } from '../../cad-kernel/config/catalog';
import { calculateEstimate, cuttingPrice, type EstimateLine } from '../../production/Estimate';
import type { Bom } from '../../production/BomCalculator';
import { MATERIALS } from '../../store/useAssemblies';
import { usePriceSettings } from '../../store/usePriceSettings';
import type { HardwareItem } from '../../types/cad.types';

const tenge = (v: number) => `${v.toLocaleString('ru-RU')} ₸`;
const qtyFmt = (v: number) => v.toLocaleString('ru-RU', { maximumFractionDigits: 2 });

export function CostPanel({ bom, hardware, onOpenPrices }: { bom: Bom; hardware: HardwareItem[]; onOpenPrices: () => void }) {
  const settings = usePriceSettings();
  const workshop = workshopById(settings.workshopId);
  const est = useMemo(
    () => calculateEstimate(bom, hardware, MATERIALS, workshop, settings),
    [bom, hardware, workshop, settings],
  );
  const groups = [...new Set(est.lines.map((l) => l.group))];

  const priceCell = (l: EstimateLine) =>
    l.price === null ? <span className="text-amber-700">нет цены</span> : `${l.priceFrom ? 'от ' : ''}${tenge(l.price)}`;

  return (
    <div className="text-sm">
      <div className="sticky top-0 z-10">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-slate-200 bg-slate-50 px-3 py-2">
          <span>
            Цех: <b>{workshop.name}</b>
          </span>
          <span>
            {est.complete ? 'Итого' : 'Итого по известным ценам'}:{' '}
            <b className="tabular-nums">
              {est.hasFromPrices ? 'от ' : ''}
              {tenge(est.knownTotal)}
            </b>
          </span>
          <button className="text-blue-700 hover:underline" onClick={onOpenPrices}>
            Прайс и цех
          </button>
        </div>
        {!est.complete && (
          <div className="border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
            Итог неполный, не хватает: {est.missing.join('; ')}.
          </div>
        )}
      </div>
      <table className="w-full">
        <thead className="bg-white text-left text-xs text-slate-500">
          <tr>
            <th className="px-3 py-1">Позиция</th>
            <th className="px-3 py-1 text-right">Кол-во</th>
            <th className="px-3 py-1">Ед.</th>
            <th className="px-3 py-1 text-right">Цена</th>
            <th className="px-3 py-1 text-right">Сумма</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <GroupRows key={g} title={g} lines={est.lines.filter((l) => l.group === g)} priceCell={priceCell} />
          ))}
        </tbody>
      </table>
      <p className="px-3 py-2 text-xs text-slate-500">
        Листы посчитаны по площади деталей с отходом ×1,15, без раскроя — реальное число листов даст карта раскроя.
        «от» — нижняя граница из прайса цеха.
      </p>
    </div>
  );
}

function GroupRows({ title, lines, priceCell }: { title: string; lines: EstimateLine[]; priceCell: (l: EstimateLine) => React.ReactNode }) {
  const subtotal = lines.reduce((s, l) => s + (l.cost ?? 0), 0);
  return (
    <>
      <tr className="border-t border-slate-200 bg-slate-50/60">
        <td className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500" colSpan={4}>
          {title}
        </td>
        <td className="px-3 py-1 text-right text-xs font-semibold tabular-nums text-slate-600">{subtotal ? tenge(subtotal) : ''}</td>
      </tr>
      {lines.map((l) => (
        <tr key={`${l.group}:${l.name}`} className="border-t border-slate-100" title={l.note}>
          <td className="px-3 py-1">{l.name}</td>
          <td className="px-3 py-1 text-right tabular-nums">{qtyFmt(l.qty)}</td>
          <td className="px-3 py-1 text-slate-500">{l.unit}</td>
          <td className="px-3 py-1 text-right tabular-nums">{priceCell(l)}</td>
          <td className="px-3 py-1 text-right tabular-nums">{l.cost === null ? '—' : tenge(l.cost)}</td>
        </tr>
      ))}
    </>
  );
}

function SheetPriceInput({ materialId }: { materialId: string }) {
  const value = usePriceSettings((s) => s.sheetPrices[materialId]);
  const setPrice = usePriceSettings((s) => s.setSheetPrice);
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      id={`sheet-price-${materialId}`}
      aria-label="Цена листа, ₸"
      inputMode="numeric"
      placeholder="нет цены"
      className="w-28 rounded border border-slate-300 px-2 py-0.5 text-right tabular-nums"
      value={draft ?? (value === undefined ? '' : String(value))}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft === null) return;
        const t = draft.replace(/\s/g, '').replace(',', '.');
        if (t === '') setPrice(materialId, null);
        else {
          const v = Number(t);
          if (Number.isFinite(v) && v >= 0) setPrice(materialId, Math.round(v));
        }
        setDraft(null);
      }}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  );
}

export function PricesPanel({ bom }: { bom: Bom }) {
  const settings = usePriceSettings();
  const workshop = workshopById(settings.workshopId);
  const used = new Set(bom.lines.map((l) => l.materialId));
  const sheetMaterials = DEFAULT_MATERIALS.filter((m) => m.type !== 'mdf_film');
  const p = (v: { value: number; from: boolean } | null) => (v ? `${v.from ? 'от ' : ''}${tenge(v.value)}` : '—');

  return (
    <div className="grid gap-4 px-3 py-2 text-sm md:grid-cols-2">
      <section className="min-w-0">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Цех распила</h3>
        <select
          id="workshop"
          className="w-full rounded border border-slate-300 px-2 py-1"
          value={settings.workshopId}
          onChange={(e) => settings.setWorkshop(e.target.value)}
        >
          {WORKSHOPS.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <label className="mt-2 flex items-center gap-2">
          <input
            id="buy-at-workshop"
            type="checkbox"
            checked={settings.buyLdspAtWorkshop}
            onChange={(e) => settings.setBuyAtWorkshop(e.target.checked)}
          />
          ЛДСП покупаем в этом цехе
        </label>
        <table className="mt-2 w-full">
          <tbody className="[&_td]:py-0.5">
            <tr>
              <td className="text-slate-600">Распил своего ЛДСП</td>
              <td className="text-right tabular-nums">{p(workshop.cutting.ownLdsp)} / лист</td>
            </tr>
            <tr>
              <td className="text-slate-600">Распил стороннего ЛДСП</td>
              <td className="text-right tabular-nums">{p(workshop.cutting.ldsp)} / лист</td>
            </tr>
            <tr>
              <td className="text-slate-600">Распил ЛДСП Egger</td>
              <td className="text-right tabular-nums">{p(workshop.cutting.eggerLdsp)} / лист</td>
            </tr>
            <tr>
              <td className="text-slate-600">Кромка ПВХ</td>
              <td className="text-right tabular-nums">{p(workshop.edgingPerM)} / м</td>
            </tr>
            <tr>
              <td className="text-slate-600">Фасады МДФ в плёнке</td>
              <td className="text-right tabular-nums">{p(workshop.filmFacadePerM2)} / м²</td>
            </tr>
            <tr>
              <td className="text-slate-600">Столешницы</td>
              <td className="text-right tabular-nums">{p(workshop.countertop)} (единица не указана)</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-xs text-slate-500">
          {workshop.address && <>Адрес: {workshop.address}. </>}
          {workshop.contacts.length > 0 && <>Контакты: {workshop.contacts.join(', ')}. </>}
          Услуги: {workshop.services.join(', ')}. Источник: {workshop.source}.
        </p>
      </section>

      <section className="min-w-0">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Цены листов у вашего поставщика</h3>
        <table className="w-full">
          <tbody>
            {sheetMaterials.map((m) => (
              <tr key={m.id} className={`border-t border-slate-100 ${used.has(m.id) ? '' : 'text-slate-400'}`}>
                <td className="py-1 pr-2">
                  {m.code} · {m.name} {m.thickness} мм
                  {used.has(m.id) && <span className="ml-1 text-xs text-blue-700">в проекте</span>}
                </td>
                <td className="py-1 text-right">
                  <SheetPriceInput materialId={m.id} />
                </td>
                <td className="py-1 pl-1 text-xs text-slate-500">
                  ₸/лист
                  {m.type === 'ldsp' && cuttingPrice(workshop, m, settings.buyLdspAtWorkshop) === null && ' · распил: нет цены'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-slate-500">
          Цены листов сохраняются в этом браузере и действуют для всех проектов.
        </p>
      </section>
    </div>
  );
}
