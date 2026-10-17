import { describe, expect, it } from 'vitest';
import { calculateEstimate, cuttingPrice, sheetsNeeded, type PriceSettings } from './Estimate';
import type { Bom } from './BomCalculator';
import { DEFAULT_MATERIALS } from '../cad-kernel/config/catalog';
import { workshopById } from '../cad-kernel/config/workshops';
import type { HardwareItem } from '../types/cad.types';

// Цены — из списка цехов Астаны от заказчика (docs/prices/astana-2026-10.md).
const MATS = new Map(DEFAULT_MATERIALS.map((m) => [m.id, m]));
const U708 = MATS.get('egger-u708-16')!;
const SHEET_M2 = 2.8 * 2.07; // 5,796 м²

const bomLine = (materialId: string, netAreaM2: number, partCount = 10) => ({
  materialId,
  materialName: '',
  materialCode: '',
  thickness: 16,
  partCount,
  netAreaM2,
  grossAreaM2: netAreaM2 * 1.15,
  edgingM: 0,
});

const bom = (lines: Bom['lines'], edgingM = 0, grooveM = 0): Bom => ({
  lines,
  edging: edgingM ? [{ thickness: 1, meters: edgingM }] : [],
  grooveM,
});

const settings = (over: Partial<PriceSettings> = {}): PriceSettings => ({
  workshopId: 'damen',
  buyLdspAtWorkshop: false,
  sheetPrices: {},
  ...over,
});

const est = (b: Bom, s: PriceSettings, hw: HardwareItem[] = []) => calculateEstimate(b, hw, MATS, workshopById(s.workshopId), s);

describe('Число листов (оценка без раскроя)', () => {
  it('площадь с отходом делится на лист 2800×2070 и округляется вверх', () => {
    expect(sheetsNeeded(SHEET_M2, U708)).toBe(1);
    expect(sheetsNeeded(SHEET_M2 + 0.01, U708)).toBe(2);
    expect(sheetsNeeded(0, U708)).toBe(0);
  });
});

describe('Цена распила по цеху', () => {
  it('Damen: Egger со стороны — 2000 ₸/лист, свой ЛДСП — от 1500', () => {
    expect(cuttingPrice(workshopById('damen'), U708, false)).toEqual({ value: 2000, from: false });
    expect(cuttingPrice(workshopById('damen'), U708, true)).toEqual({ value: 1500, from: true });
  });

  it('Raspil Lemod: Egger — 2200 ₸/лист', () => {
    expect(cuttingPrice(workshopById('lemod'), U708, false)).toEqual({ value: 2200, from: false });
  });

  it('RoomSet (ЧПУ): от 2000 ₸/лист', () => {
    expect(cuttingPrice(workshopById('roomset'), U708, false)).toEqual({ value: 2000, from: true });
  });

  it('ХДФ: цеха цену распила не дали', () => {
    expect(cuttingPrice(workshopById('damen'), MATS.get('hdf-white-3')!, false)).toBeNull();
  });
});

describe('Смета', () => {
  // 5,5 м² ЛДСП × 1,15 = 6,325 м² → 2 листа
  const b = bom([bomLine('egger-u708-16', 5.5)], 13.34);

  it('Damen: распил 2 листов × 2000 и кромка 13,34 м × 150 (от)', () => {
    const e = est(b, settings());
    const cut = e.lines.find((l) => l.name === 'Распил U708')!;
    expect(cut).toMatchObject({ qty: 2, price: 2000, cost: 4000 });
    const edge = e.lines.find((l) => l.name === 'Кромка ПВХ')!;
    expect(edge).toMatchObject({ qty: 13.34, price: 150, priceFrom: true, cost: 2001 });
    expect(e.hasFromPrices).toBe(true);
  });

  it('без цены листа итог неполный и это сказано прямо', () => {
    const e = est(b, settings());
    expect(e.complete).toBe(false);
    expect(e.missing).toContain('цена листа U708');
    expect(e.knownTotal).toBe(4000 + 2001);
  });

  it('с ценой листа — полный итог', () => {
    const e = est(b, settings({ sheetPrices: { 'egger-u708-16': 25000 } }));
    expect(e.lines.find((l) => l.group === 'Материалы')).toMatchObject({ qty: 2, cost: 50000 });
    expect(e.complete).toBe(true);
    expect(e.knownTotal).toBe(50000 + 4000 + 2001);
  });

  it('ЛДСП покупаем в цехе Damen — распил дешевле: 2 × 1500', () => {
    const e = est(b, settings({ buyLdspAtWorkshop: true }));
    expect(e.lines.find((l) => l.name === 'Распил U708')).toMatchObject({ cost: 3000, priceFrom: true });
  });

  it('у Lemod нет цены кромки — строка без суммы, не ноль', () => {
    const e = est(b, settings({ workshopId: 'lemod' }));
    const edge = e.lines.find((l) => l.name === 'Кромка ПВХ')!;
    expect(edge.cost).toBeNull();
    expect(e.missing).toContain('кромка: у «Raspil Lemod» нет цены');
  });

  it('фасады МДФ в плёнке у Lemod: по площади, от 20 000 ₸/м², без листов и распила', () => {
    const e = est(bom([bomLine('mdf-film-18', 0.5, 4)]), settings({ workshopId: 'lemod' }));
    expect(e.lines).toHaveLength(1);
    expect(e.lines[0]).toMatchObject({ group: 'Фасады под заказ', qty: 0.5, unit: 'м²', price: 20000, cost: 10000 });
  });

  it('фасады в плёнке у Damen: цены нет', () => {
    const e = est(bom([bomLine('mdf-film-18', 0.5, 4)]), settings());
    expect(e.lines[0]!.cost).toBeNull();
    expect(e.missing[0]).toContain('фасады МДФ в плёнке');
  });

  it('фурнитура и пазы без цен попадают в список недостающего', () => {
    const hw: HardwareItem[] = [{ key: 'hinge_overlay', name: 'Петля накладная', unit: 'шт', qty: 4 }];
    const e = est(bom([bomLine('egger-u708-16', 1)], 0, 0.32), settings(), hw);
    expect(e.missing).toEqual(expect.arrayContaining(['фрезеровка пазов', 'цены фурнитуры']));
  });
});
