import { plywoodArea, pressParts, profileCuts } from "./geometry";
import { describeSpring, pickSpring } from "./springs";
import type { BomLine, PressConfig } from "./types";
import { balanceGeometry } from "./balance";

/**
 * Спецификация (BOM) печатного станка. Цены — диапазоны в тенге по открытым
 * каталогам Kaspi, Satu, AliExpress и строительных гипермаркетов на ноябрь
 * 2026; это ориентиры [Предположение], а не оферта. Поисковая строка нужна
 * потому, что артикулы карточек маркетплейсов живут недели, а нормативное
 * обозначение (DIN, ISO, ГОСТ, типоразмер) — десятилетия.
 */

const SHEET_AREA_M2 = 1.525 * 1.525;

function line(l: Omit<BomLine, "note"> & { note?: string }): BomLine {
  return { note: "", ...l };
}

export function pressBom(cfg: PressConfig): BomLine[] {
  const parts = pressParts(cfg);
  const cuts = profileCuts(cfg);
  const area = plywoodArea(parts);
  const spring = pickSpring(balanceGeometry(cfg), cfg.frameMassKg, cfg.frameCgOffset);
  const tNuts = cfg.spineProfile === "4080" ? 4 + 4 : 2 + 4; // каретка + хребет к основанию
  const insertNuts = parts.reduce((n, p) => n + p.qty * p.holes.filter((h) => h.kind === "insert-nut").length, 0);
  const m6Joints = parts.reduce((n, p) => n + p.qty * p.holes.filter((h) => h.d === 6.5).length, 0);
  const screws4 = parts.reduce((n, p) => n + p.qty * p.holes.filter((h) => h.d === 4).length, 0) * 2;
  const sheets18 = Math.round((area["18"] / SHEET_AREA_M2) * 100) / 100;
  const sheets12 = Math.round((area["12"] / SHEET_AREA_M2) * 100) / 100;

  const lines: BomLine[] = [
    // Профиль
    ...cuts.map((c, i) =>
      line({
        id: `P${i + 1}`,
        group: "Профиль",
        designation: `Профиль алюминиевый ${c.profile}, паз 8`,
        spec: `L = ${c.length} мм, анодированный, станочный (не мебельный)`,
        qty: c.qty,
        unit: "шт",
        priceLowKzt: Math.round((c.length / 1000) * 8000 * (c.profile === "4080" ? 1.8 : 1)),
        priceHighKzt: Math.round((c.length / 1000) * 15000 * (c.profile === "4080" ? 1.8 : 1)),
        searchRu: `алюминиевый профиль ${c.profile} станочный паз 8 ${c.length} мм`,
        searchEn: `${c.profile} T-slot aluminum extrusion ${c.length}mm slot 8`,
        where: "AliExpress, Satu, местные поставщики станочного профиля",
        note: c.purpose,
      }),
    ),
    line({ id: "P2", group: "Профиль", designation: "Т-гайка M8 для паза 8 (пружинная или сухарь)", spec: "сталь оцинкованная, под профиль 40-й серии", qty: tNuts + 4, unit: "шт", priceLowKzt: 100 * (tNuts + 4), priceHighKzt: 220 * (tNuts + 4), searchRu: "т-гайка M8 паз 8 профиль 4040", searchEn: "T-nut M8 slot 8 4040 spring loaded", where: "AliExpress, Satu" }),
    line({ id: "P3", group: "Профиль", designation: "Заглушка торцевая 4040", spec: "пластик", qty: 2, unit: "шт", priceLowKzt: 200, priceHighKzt: 400, searchRu: "заглушка профиля 4040", searchEn: "4040 end cap", where: "AliExpress, Satu" }),

    // Фанера и резка
    line({ id: "W1", group: "Фанера и резка", designation: "Фанера ФСФ 18 мм, 1525×1525, сорт 2/2 или 2/3, шлифованная", spec: `${sheets18} листа (${area["18"].toFixed(2)} м² с запасом на раскрой)`, qty: sheets18, unit: "листа", priceLowKzt: Math.round(12000 * sheets18), priceHighKzt: Math.round(16000 * sheets18), searchRu: "фанера ФСФ 18 мм 1525х1525 шлифованная", searchEn: "birch plywood 18mm exterior", where: "Склады фанеры, строительные гипермаркеты", note: "Цена за долю листа; покупается целый лист 12–16 тыс. ₸, остаток идёт на второй станок или экспокамеру" }),
    line({ id: "W2", group: "Фанера и резка", designation: "Фанера ФСФ 12 мм, 1525×1525, сорт 2/2", spec: `${sheets12} листа (${area["12"].toFixed(2)} м²)`, qty: sheets12, unit: "листа", priceLowKzt: Math.round(7000 * sheets12), priceHighKzt: Math.round(9500 * sheets12), searchRu: "фанера ФСФ 12 мм 1525х1525", searchEn: "birch plywood 12mm", where: "Склады фанеры", note: "Прижимная плита и платены; можно заменить обрезком" }),
    line({ id: "W3", group: "Фанера и резка", designation: "Фрезеровка ЧПУ по файлам SVG/DXF", spec: `${parts.reduce((n, p) => n + p.qty, 0)} заготовок, контур + отверстия + карманы, фреза 6 мм`, qty: 1, unit: "компл", priceLowKzt: 6000, priceHighKzt: 10000, searchRu: "фрезеровка фанеры ЧПУ Алматы", searchEn: "CNC plywood cutting service", where: "Фрезерные мастерские, рекламные производства" }),

    // Крепёж
    line({ id: "F0", group: "Крепёж", designation: "Гайка забивная M6 усовая", spec: "нижняя кромка щёк шарнира, отверстие 8 мм", qty: 4, unit: "шт", priceLowKzt: 160, priceHighKzt: 320, searchRu: "гайка забивная M6 усовая", searchEn: "M6 pronged T-nut wood", where: "Крепёжные магазины" }),
    line({ id: "F1", group: "Крепёж", designation: "Винт DIN 912 M8×20, оцинк. 8.8", spec: "хребет к плите основания через Т-гайки", qty: 6, unit: "шт", priceLowKzt: 300, priceHighKzt: 600, searchRu: "винт DIN 912 M8x20 внутренний шестигранник", searchEn: "DIN 912 M8x20 socket head cap screw", where: "Крепёжные магазины, Kaspi" }),
    line({ id: "F2", group: "Крепёж", designation: "Винт DIN 912 M8×45", spec: "каретка к хребту через Т-гайки (два слоя фанеры 36 мм)", qty: 4, unit: "шт", priceLowKzt: 300, priceHighKzt: 600, searchRu: "винт DIN 912 M8x45", searchEn: "DIN 912 M8x45", where: "Крепёжные магазины" }),
    line({ id: "F3", group: "Крепёж", designation: "Болт DIN 933 M8×40 + гайка DIN 985 M8", spec: "упорные винты зазора (off-contact), 2 шт + 2 запас", qty: 4, unit: "компл", priceLowKzt: 400, priceHighKzt: 800, searchRu: "болт DIN 933 M8x40 гайка самоконтрящаяся M8", searchEn: "DIN 933 M8x40 hex bolt nyloc nut", where: "Крепёжные магазины" }),
    line({ id: "F4", group: "Крепёж", designation: "Винт DIN 912 M6×45 + гайка DIN 985 M6 + 2 шайбы DIN 9021 M6", spec: "стяжки слоёв, щёки, губка, стол", qty: m6Joints, unit: "компл", priceLowKzt: 60 * m6Joints, priceHighKzt: 120 * m6Joints, searchRu: "винт DIN 912 M6x45 комплект гайка шайба", searchEn: "DIN 912 M6x45 kit", where: "Крепёжные магазины" }),
    line({ id: "F5", group: "Крепёж", designation: "Саморез по дереву 4×35, потай, жёлтый цинк", spec: "уголки боковин, стоек, упорных блоков", qty: screws4, unit: "шт", priceLowKzt: 10 * screws4, priceHighKzt: 20 * screws4, searchRu: "саморез по дереву 4x35 желтый", searchEn: "wood screw 4x35", where: "Строительные гипермаркеты" }),
    line({ id: "F6", group: "Крепёж", designation: "Уголок мебельный 40×40×20, сталь 2 мм", spec: "боковины к основанию и к несущей плите", qty: 8, unit: "шт", priceLowKzt: 800, priceHighKzt: 1600, searchRu: "уголок мебельный усиленный 40x40", searchEn: "steel corner bracket 40x40", where: "Строительные гипермаркеты, Kaspi" }),

    // Шарнир
    line({ id: "H1", group: "Шарнир", designation: "Вал стальной 8 мм h6, шлифованный", spec: "L = 200 мм (вал для 3D-принтера/ЧПУ)", qty: 1, unit: "шт", priceLowKzt: 800, priceHighKzt: 1500, searchRu: "вал 8 мм шлифованный 200 мм 3D принтер", searchEn: "8mm linear shaft 200mm", where: "AliExpress, Kaspi" }),
    line({ id: "H2", group: "Шарнир", designation: "Подшипник 608ZZ (8×22×7)", spec: "по два в каждой щеке", qty: 4, unit: "шт", priceLowKzt: 800, priceHighKzt: 1600, searchRu: "подшипник 608ZZ", searchEn: "608ZZ bearing", where: "Kaspi, магазины подшипников, AliExpress" }),
    line({ id: "H3", group: "Шарнир", designation: "Кольцо стопорное установочное 8 мм с винтом (SC8 / муфта стопорная)", spec: "фиксация вала от осевого смещения", qty: 2, unit: "шт", priceLowKzt: 600, priceHighKzt: 1200, searchRu: "стопорное кольцо на вал 8 мм с винтом", searchEn: "shaft collar 8mm set screw", where: "AliExpress" }),

    // Пружины
    line({ id: "S1", group: "Пружины", designation: `Пружина растяжения ${describeSpring(spring.spring)} с крючками`, spec: `подобрана под раму ${cfg.frameMassKg} кг: жёсткость ${spring.rate.toFixed(2)} Н/мм, ${spring.down.forcePerSpring.toFixed(0)} Н на пружину внизу`, qty: 4, unit: "шт", priceLowKzt: 1200, priceHighKzt: 2400, searchRu: `пружина растяжения ${spring.spring.wire}x${spring.spring.outer}x${spring.spring.freeLength} крючки`, searchEn: `extension spring ${spring.spring.wire}x${spring.spring.outer}x${spring.spring.freeLength}mm`, where: "Kaspi, хозмаги, AliExpress", note: "2 рабочие + 2 запасные" }),
    line({ id: "S2", group: "Пружины", designation: "Талреп M6 крюк-крюк DIN 1480", spec: "регулировка преднатяга 0–30 мм", qty: 2, unit: "шт", priceLowKzt: 800, priceHighKzt: 1600, searchRu: "талреп M6 крюк-крюк", searchEn: "turnbuckle M6 hook-hook", where: "Строительные гипермаркеты" }),
    line({ id: "S3", group: "Пружины", designation: "Рым-болт M6 DIN 580 с гайкой", spec: "анкер пружины на блоке плиты основания", qty: 2, unit: "шт", priceLowKzt: 400, priceHighKzt: 800, searchRu: "рым-болт M6 DIN 580", searchEn: "eye bolt M6 DIN 580", where: "Строительные гипермаркеты" }),
    line({ id: "S5", group: "Пружины", designation: "Рым-винт M6 по дереву (кольцо), оцинкованный", spec: "крюк пружины в задней кромке языка головки, на высоте оси", qty: 2, unit: "шт", priceLowKzt: 200, priceHighKzt: 500, searchRu: "рым-винт кольцо M6 по дереву", searchEn: "screw eye M6 wood", where: "Строительные гипермаркеты" }),
    line({ id: "S4", group: "Пружины", designation: "S-крюк 4 мм оцинкованный", spec: "пружина к рычагу головки", qty: 4, unit: "шт", priceLowKzt: 200, priceHighKzt: 400, searchRu: "s-крюк 4 мм оцинкованный", searchEn: "S hook 4mm zinc", where: "Строительные гипермаркеты" }),

    // Зажим рамы
    line({ id: "C1", group: "Зажим рамы", designation: "Ручка-звёздочка (барашек) M8×60 с резьбовым штифтом", spec: "пластик или бакелит, 5 лучей, Ø50", qty: 2, unit: "шт", priceLowKzt: 800, priceHighKzt: 1600, searchRu: "ручка звездочка M8x60 резьбовой штифт", searchEn: "star knob M8x60 threaded stud", where: "AliExpress, Kaspi" }),
    line({ id: "C2", group: "Зажим рамы", designation: "Гайка забивная (врезная) M8, усовая", spec: `отверстие 10 мм; губка, упоры зазора, блоки приводки`, qty: insertNuts + 2, unit: "шт", priceLowKzt: 50 * (insertNuts + 2), priceHighKzt: 100 * (insertNuts + 2), searchRu: "гайка забивная M8 усовая", searchEn: "M8 T-nut pronged insert for wood", where: "Строительные гипермаркеты, крепёж" }),
    line({ id: "C3", group: "Зажим рамы", designation: "Лента EPDM самоклеящаяся 3×20 мм", spec: "рабочие плоскости губок, 1 м", qty: 1, unit: "м", priceLowKzt: 300, priceHighKzt: 600, searchRu: "уплотнитель EPDM самоклеющийся 3 мм 20 мм", searchEn: "EPDM adhesive foam strip 3x20mm", where: "Строительные гипермаркеты" }),

    // Стол и платен
    line({ id: "B1", group: "Стол и платен", designation: "Накладка стола: HPL/ЛДСП 3 мм или ПВХ лист 3 мм", spec: `${cfg.bed.width}×${cfg.bed.depth} мм, гладкая, светлая`, qty: 1, unit: "шт", priceLowKzt: 1500, priceHighKzt: 3000, searchRu: "лист ПВХ 3 мм белый", searchEn: "PVC sheet 3mm", where: "Рекламные материалы, строительные гипермаркеты" }),
    line({ id: "B2", group: "Стол и платен", designation: "Неопрен или фетр 3 мм", spec: "покрытие платена, 500×500 мм", qty: cfg.platens.length, unit: "шт", priceLowKzt: 1500 * cfg.platens.length, priceHighKzt: 3000 * cfg.platens.length, searchRu: "неопрен лист 3 мм", searchEn: "neoprene sheet 3mm", where: "Kaspi, AliExpress" }),
    line({ id: "B3", group: "Стол и платен", designation: "Клей-спрей временной фиксации текстиля", spec: "баллон 400–500 мл", qty: 1, unit: "шт", priceLowKzt: 2500, priceHighKzt: 4500, searchRu: "клей спрей для шелкографии временная фиксация", searchEn: "pallet adhesive spray screen printing", where: "Магазины шелкографии, Kaspi" }),
    line({ id: "B4", group: "Стол и платен", designation: "Штифт цилиндрический 8×40 DIN 7", spec: "фиксация платена на столе", qty: 2, unit: "шт", priceLowKzt: 200, priceHighKzt: 400, searchRu: "штифт цилиндрический 8x40", searchEn: "dowel pin 8x40", where: "Крепёжные магазины" }),
    line({ id: "B5", group: "Стол и платен", designation: "Гайка-барашек или ручка M6 с внутренней резьбой", spec: "крепление стола и платена без инструмента", qty: 5, unit: "шт", priceLowKzt: 1000, priceHighKzt: 2000, searchRu: "ручка с внутренней резьбой M6 барашек", searchEn: "M6 female thread knob", where: "AliExpress, Kaspi" }),
    ...(cfg.microRegistration
      ? [line({ id: "B6", group: "Стол и платен", designation: "Болт DIN 933 M8×50 + контргайка DIN 439 M8", spec: "упорные винты приводки стола", qty: 4, unit: "компл", priceLowKzt: 400, priceHighKzt: 800, searchRu: "болт M8x50 DIN 933 контргайка M8", searchEn: "M8x50 hex bolt jam nut", where: "Крепёжные магазины" })]
      : []),

    // Мелочь
    line({ id: "M1", group: "Мелочь", designation: "Ножка резиновая M8 с резьбовым штифтом, Ø30", spec: "антивибрационная", qty: 4, unit: "шт", priceLowKzt: 800, priceHighKzt: 1500, searchRu: "ножка резиновая M8 антивибрационная", searchEn: "rubber foot M8 stud", where: "Kaspi, AliExpress" }),
    line({ id: "M2", group: "Мелочь", designation: "Клей ПВА D3 влагостойкий", spec: "склейка слоёв каретки, щёк, тела головки, 250 г", qty: 1, unit: "шт", priceLowKzt: 500, priceHighKzt: 900, searchRu: "клей ПВА D3 столярный", searchEn: "PVA D3 wood glue", where: "Строительные гипермаркеты" }),
    line({ id: "M3", group: "Мелочь", designation: "Масло или лак для фанеры", spec: "защита от влаги и краски, 0,5 л", qty: 1, unit: "шт", priceLowKzt: 1500, priceHighKzt: 2500, searchRu: "масло для дерева твердое 0.5 л", searchEn: "hardwax oil 0.5l", where: "Строительные гипермаркеты" }),
    line({ id: "M4", group: "Мелочь", designation: "Эпоксидный клей двухкомпонентный", spec: "посадка вала и подшипников", qty: 1, unit: "шт", priceLowKzt: 500, priceHighKzt: 1000, searchRu: "эпоксидный клей двухкомпонентный", searchEn: "2-part epoxy adhesive", where: "Строительные гипермаркеты" }),
  ];
  return lines;
}

export interface BomTotals {
  low: number;
  high: number;
  byGroup: { group: string; low: number; high: number }[];
}

export function bomTotals(lines: BomLine[]): BomTotals {
  const groups = new Map<string, { low: number; high: number }>();
  let low = 0;
  let high = 0;
  for (const l of lines) {
    low += l.priceLowKzt;
    high += l.priceHighKzt;
    const g = groups.get(l.group) ?? { low: 0, high: 0 };
    g.low += l.priceLowKzt;
    g.high += l.priceHighKzt;
    groups.set(l.group, g);
  }
  return { low, high, byGroup: [...groups.entries()].map(([group, v]) => ({ group, ...v })) };
}
