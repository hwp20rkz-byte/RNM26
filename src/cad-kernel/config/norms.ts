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
  runnerLengths: Norm<number[]>;
  runnerDepthClearance: Norm<number>;
  facadeGap: Norm<number>;
  pushToOpenBottomOffset: Norm<number>;
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
  runnerLengths: { value: [300, 350, 400, 450, 500, 550], source: 'spec', note: 'Ряд длин направляющих' },
  runnerDepthClearance: {
    value: 10,
    source: 'assumption',
    note: 'Запас между концом направляющей и задней стенкой, от внутренней глубины',
  },
  facadeGap: { value: 3, source: 'spec', note: 'Зазор между фасадами и до крыши/столешницы' },
  pushToOpenBottomOffset: { value: 25, source: 'spec', note: 'Нижний отступ фасада ящика для Push-to-Open' },
  edgeThickness: {
    value: 1,
    source: 'assumption',
    note: 'Толщина кромки ПВХ по умолчанию. В ТЗ перечислены 0.4 / 1 / 2 мм',
  },
  wasteFactor: { value: 1.15, source: 'spec', note: 'Коэффициент отхода листовых материалов' },
};

export const normValues = (n: ProductionNorms) => ({
  hdfGrooveOffset: n.hdfGrooveOffset.value,
  hdfGrooveDepth: n.hdfGrooveDepth.value,
  hdfClearancePerSide: n.hdfClearancePerSide.value,
  overlayBackInset: n.overlayBackInset.value,
  runnerLengths: n.runnerLengths.value,
  runnerDepthClearance: n.runnerDepthClearance.value,
  facadeGap: n.facadeGap.value,
  pushToOpenBottomOffset: n.pushToOpenBottomOffset.value,
  edgeThickness: n.edgeThickness.value,
  wasteFactor: n.wasteFactor.value,
});

export type NormValues = ReturnType<typeof normValues>;
