// Производственные нормы цеха. Всё, что помечено 'assumption', — заглушка до подтверждения технологом.
// Источник каждого значения указан явно, чтобы не путать норму из ТЗ с догадкой.

export type NormSource = 'spec' | 'assumption';

export interface Norm<T> {
  value: T;
  source: NormSource;
  note: string;
}

export interface ProductionNorms {
  hdfGrooveOffset: Norm<number>;
  hdfGrooveDepth: Norm<number>;
  hdfClearancePerSide: Norm<number>;
  overlayBackInset: Norm<number>;
  facadeGap: Norm<number>;
  insertFacadeGap: Norm<number>;
  hingeCountByHeight: Norm<[number, number][]>;
  runnerLengths: Norm<number[]>;
  runnerDepthClearance: Norm<number>;
  pushToOpenBottomOffset: Norm<number>;
  telescopicSideClearance: Norm<number>;
  concealedSideClearance: Norm<number>;
  drawerBoxHeightReduction: Norm<number>;
  drawerBoxVerticalClearance: Norm<number>;
  drawerBoxMinHeight: Norm<number>;
  edgeThickness: Norm<number>;
  wasteFactor: Norm<number>;
}

export const DEFAULT_NORMS: ProductionNorms = {
  hdfGrooveOffset: { value: 16, source: 'spec', note: 'Отступ паза под ХДФ от заднего торца боковины' },
  hdfGrooveDepth: { value: 8, source: 'spec', note: 'Глубина паза под ХДФ' },
  hdfClearancePerSide: {
    value: 1,
    source: 'assumption',
    note: 'Монтажный зазор ХДФ в пазу на сторону. В ТЗ не задан',
  },
  overlayBackInset: {
    value: 2,
    source: 'assumption',
    note: 'Отступ накладной задней стенки от наружных граней корпуса',
  },
  facadeGap: {
    value: 3,
    source: 'spec',
    note: 'Зазор между фасадами и до крыши/столешницы. По краям корпуса — половина (1,5 мм), чтобы между соседними модулями вышло 3 мм',
  },
  insertFacadeGap: {
    value: 2,
    source: 'assumption',
    note: 'Зазор вкладного фасада до кромок проёма по периметру',
  },
  hingeCountByHeight: {
    value: [
      [900, 2],
      [1600, 3],
      [2000, 4],
      [2400, 5],
    ],
    source: 'assumption',
    note: 'Число петель по высоте двери (типовая таблица производителей петель)',
  },
  runnerLengths: { value: [300, 350, 400, 450, 500, 550], source: 'spec', note: 'Ряд длин направляющих' },
  runnerDepthClearance: {
    value: 10,
    source: 'assumption',
    note: 'Запас между концом направляющей и задней стенкой, от внутренней глубины',
  },
  pushToOpenBottomOffset: {
    value: 25,
    source: 'spec',
    note: 'Нижний отступ фасада ящика для Push-to-Open. Направление в ТЗ не указано: принято, что нижняя кромка поднята над низом корпуса',
  },
  telescopicSideClearance: {
    value: 13,
    source: 'assumption',
    note: 'Место под шариковую направляющую с каждой стороны короба',
  },
  concealedSideClearance: {
    value: 5,
    source: 'assumption',
    note: 'Зазор короба до боковины на сторону для скрытых направляющих (Tandem/Movento)',
  },
  drawerBoxHeightReduction: {
    value: 40,
    source: 'assumption',
    note: 'На сколько короб ящика ниже своего фасада',
  },
  drawerBoxVerticalClearance: {
    value: 5,
    source: 'assumption',
    note: 'Зазор короба ящика до горизонтов проёма сверху и снизу',
  },
  drawerBoxMinHeight: { value: 50, source: 'assumption', note: 'Минимальная высота короба ящика' },
  edgeThickness: {
    value: 1,
    source: 'assumption',
    note: 'Толщина кромки ПВХ по умолчанию. В ТЗ перечислены 0.4 / 1 / 2 мм',
  },
  wasteFactor: { value: 1.15, source: 'spec', note: 'Коэффициент отхода листовых материалов' },
};

export type NormValues = { [K in keyof ProductionNorms]: ProductionNorms[K]['value'] };

export const normValues = (n: ProductionNorms): NormValues =>
  Object.fromEntries(Object.entries(n).map(([k, v]) => [k, v.value])) as NormValues;
