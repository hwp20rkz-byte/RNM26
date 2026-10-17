import type { HardwareItem, MaterialDef } from '../types/cad.types';
import type { WorkshopPrices, Price } from '../cad-kernel/config/workshops';
import type { Bom } from './BomCalculator';

// Стоимость заказа в тенге: материалы (цены листов задаёт салон) + работы цеха (справочник цехов).
// Где цены нет, строка остаётся без суммы и попадает в список «не хватает цен» — нулём её не подменяем.

export interface PriceSettings {
  workshopId: string;
  buyLdspAtWorkshop: boolean; // ЛДСП покупаем в том же цехе — у некоторых цехов распил тогда дешевле
  sheetPrices: Record<string, number>; // ₸ за лист по id материала
}

export interface EstimateLine {
  group: 'Материалы' | 'Работы цеха' | 'Фасады под заказ' | 'Фурнитура';
  name: string;
  qty: number;
  unit: string;
  price: number | null; // ₸ за единицу
  priceFrom: boolean; // цена «от»
  cost: number | null;
  note?: string;
}

export interface Estimate {
  lines: EstimateLine[];
  knownTotal: number; // сумма строк с ценой
  complete: boolean; // у всех строк есть цена
  missing: string[]; // чего не хватает для полного итога
  hasFromPrices: boolean; // в итоге есть цены «от»
}

const round = (v: number) => Math.round(v);

// Листов на материал: площадь с отходом, делённая на площадь листа, вверх. Без раскроя — это оценка.
export function sheetsNeeded(grossAreaM2: number, m: Pick<MaterialDef, 'sheetLength' | 'sheetWidth'>): number {
  const sheet = (m.sheetLength * m.sheetWidth) / 1e6;
  return grossAreaM2 > 0 ? Math.ceil(grossAreaM2 / sheet - 1e-9) : 0;
}

export function cuttingPrice(w: WorkshopPrices, m: Pick<MaterialDef, 'type' | 'brand'>, buyAtWorkshop: boolean): Price | null {
  if (m.type !== 'ldsp') return null; // для ХДФ и МДФ цеха цену распила не дали
  if (buyAtWorkshop && w.cutting.ownLdsp) return w.cutting.ownLdsp;
  if (m.brand === 'Egger' && w.cutting.eggerLdsp) return w.cutting.eggerLdsp;
  return w.cutting.ldsp ?? w.cutting.eggerLdsp;
}

function line(
  group: EstimateLine['group'],
  name: string,
  qty: number,
  unit: string,
  price: Price | number | null,
  note?: string,
): EstimateLine {
  const p = typeof price === 'number' ? { value: price, from: false } : price;
  return {
    group,
    name,
    qty,
    unit,
    price: p?.value ?? null,
    priceFrom: p?.from ?? false,
    cost: p ? round(p.value * qty) : null,
    note,
  };
}

export function calculateEstimate(
  bom: Bom,
  hardware: HardwareItem[],
  materials: Map<string, MaterialDef>,
  workshop: WorkshopPrices,
  settings: PriceSettings,
): Estimate {
  const lines: EstimateLine[] = [];
  const missing: string[] = [];

  for (const l of bom.lines) {
    const m = materials.get(l.materialId);
    if (!m) {
      missing.push(`материал ${l.materialId} не найден в каталоге`);
      continue;
    }
    if (m.type === 'mdf_film') {
      // Фасады в плёнке цех делает сам и считает по площади готовых фасадов.
      const area = Math.round(l.netAreaM2 * 100) / 100;
      const ln = line('Фасады под заказ', `${m.name}, ${l.partCount} шт`, area, 'м²', workshop.filmFacadePerM2);
      if (ln.cost === null) missing.push(`фасады МДФ в плёнке: у «${workshop.name}» нет цены`);
      lines.push(ln);
      continue;
    }
    const sheets = sheetsNeeded(l.grossAreaM2, m);
    const sheetPrice = settings.sheetPrices[m.id];
    const mat = line('Материалы', `${m.code} · ${m.name} ${m.thickness} мм`, sheets, 'лист', sheetPrice ?? null, 'листов — по площади с отходом, без раскроя');
    if (mat.cost === null) missing.push(`цена листа ${m.code}`);
    lines.push(mat);

    const cut = cuttingPrice(workshop, m, settings.buyLdspAtWorkshop);
    const cutLine = line('Работы цеха', `Распил ${m.code}`, sheets, 'лист', cut);
    if (cutLine.cost === null) missing.push(`распил ${m.code}: у «${workshop.name}» нет цены`);
    lines.push(cutLine);
  }

  const edgingM = Math.round(bom.edging.reduce((s, e) => s + e.meters, 0) * 100) / 100;
  if (edgingM > 0) {
    const ln = line('Работы цеха', 'Кромка ПВХ', edgingM, 'м.п.', workshop.edgingPerM, 'цена в прайсе не зависит от толщины кромки');
    if (ln.cost === null) missing.push(`кромка: у «${workshop.name}» нет цены`);
    lines.push(ln);
  }
  if (bom.grooveM > 0) {
    lines.push(line('Работы цеха', 'Фрезеровка пазов', bom.grooveM, 'м.п.', null));
    missing.push('фрезеровка пазов');
  }

  const hw = hardware.filter((h) => h.qty > 0);
  for (const h of hw) lines.push(line('Фурнитура', h.name, h.qty, h.unit, null));
  if (hw.length) missing.push('цены фурнитуры');

  const priced = lines.filter((l) => l.cost !== null);
  return {
    lines,
    knownTotal: priced.reduce((s, l) => s + (l.cost ?? 0), 0),
    complete: priced.length === lines.length,
    missing: [...new Set(missing)],
    hasFromPrices: priced.some((l) => l.priceFrom),
  };
}
