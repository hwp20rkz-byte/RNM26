/**
 * Типы параметрической модели настольного печатного станка для шелкографии.
 * Все размеры в миллиметрах, массы в килограммах, силы в ньютонах.
 *
 * Система координат станка: X — поперёк (ширина стола), Y — вдоль печати
 * (0 у переднего края плиты основания, растёт назад к хребту), Z — вверх,
 * 0 на верхней плоскости плиты основания.
 */

export type Mm = number;
export type PlywoodThickness = 12 | 18;
export type SpineProfile = "4040" | "4080";
export type PressSizeId = "S" | "M" | "L" | "XL";
export type PlatenKind = "tee" | "hoodie" | "tote" | "flat";

export interface BedSize {
  width: Mm;
  depth: Mm;
}

export interface PressConfig {
  /** Идентификатор конфигурации, попадает в имена файлов экспорта */
  id: string;
  bed: BedSize;
  spineProfile: SpineProfile;
  spineLength: Mm;
  /** Максимальная толщина рамы, которую зажимает головка */
  maxFrameThickness: Mm;
  /** Расчётная масса рамы с сеткой для подбора пружин */
  frameMassKg: number;
  /** Расстояние от оси шарнира до центра масс рамы */
  frameCgOffset: Mm;
  platens: PlatenKind[];
  /** Микроприводка стола четырьмя упорными винтами */
  microRegistration: boolean;
  /** Число печатных столов (1 — одностаночный, больше — карусель/линейка, этап 3) */
  stations: number;
  structuralPly: 18;
  clampPly: 12;
}

export type HoleKind = "through" | "pocket" | "insert-nut";

export interface Hole {
  x: Mm;
  y: Mm;
  d: Mm;
  kind: HoleKind;
  /** Глубина кармана для kind = pocket */
  depth?: Mm;
  note?: string;
}

export interface Slot {
  /** Центр паза */
  x: Mm;
  y: Mm;
  length: Mm;
  width: Mm;
  angle: 0 | 90;
  note?: string;
}

export interface Rect {
  x: Mm;
  y: Mm;
  w: Mm;
  h: Mm;
  note?: string;
}

export interface Part {
  id: string;
  name: string;
  nameRu: string;
  thickness: PlywoodThickness;
  width: Mm;
  height: Mm;
  qty: number;
  holes: Hole[];
  slots: Slot[];
  /** Сквозные вырезы (например, вырез под горловину на платене) */
  cutouts: Rect[];
  /** Карманы (несквозные выборки) */
  pockets: Rect[];
  notes: string[];
}

export interface ProfileCut {
  profile: SpineProfile;
  length: Mm;
  qty: number;
  purpose: string;
}

export interface PressLayout {
  base: { width: Mm; depth: Mm };
  legHeight: Mm;
  bedTopZ: Mm;
  spine: { x: Mm; yFrom: Mm; yTo: Mm; topZ: Mm };
  carriage: { width: Mm; depth: Mm; topZ: Mm };
  pivot: { y: Mm; z: Mm };
  cheekHeight: Mm;
  jawWidth: Mm;
  overall: { width: Mm; depth: Mm; height: Mm };
}

export interface BomLine {
  id: string;
  group: string;
  designation: string;
  spec: string;
  qty: number;
  unit: string;
  priceLowKzt: number;
  priceHighKzt: number;
  searchRu: string;
  searchEn: string;
  where: string;
  note: string;
}
