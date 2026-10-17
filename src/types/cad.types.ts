// Единая схема проекта. Все размеры в миллиметрах.
// Система координат модуля: x — вправо (от наружной грани левой боковины),
// y — вверх (от пола), z — к зрителю (от задней грани корпуса).

export type TopJoinery = 'overlay' | 'insert' | 'none';
// overlay_left/overlay_right из спецификации выражаются через *SideToFloor:
// боковина, опущенная до пола, всегда проходит мимо дна, и с этой стороны дно становится вкладным.
export type BottomJoinery = 'overlay' | 'insert';
export type BackJoinery = 'groove_hdf' | 'insert' | 'overlay' | 'none';
export type ConnectorType = 'minifix' | 'confirmat' | 'dowel';
export type ModuleType = 'base_cabinet' | 'wall_cabinet' | 'tall_cabinet' | 'table' | 'shelf_unit';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface MaterialDef {
  id: string;
  name: string;
  code: string; // артикул, например "U708"
  type: 'ldsp' | 'mdf_veneer' | 'hdf';
  thickness: number;
  color: string; // цвет для превью, пока нет текстур
  sheetLength: number; // вдоль волокон, мм (Egger: 2800)
  sheetWidth: number; // мм (Egger: 2070)
  pricePerM2: number | null; // null — цена не задана в прайсе
}

export interface ShelfItem {
  id: string;
  // Высота проёма под полкой (от верха дна или предыдущей полки до низа этой полки).
  // null — проём рассчитывается автоматически; число — проём зафиксирован «замком».
  lockedGapBelow: number | null;
}

export type FacadeMount = 'overlay' | 'insert';
// 'none' — без ручки: Tip-On у дверей, Push-to-Open у ящиков.
export type HandleType = 'none' | 'bracket' | 'rail' | 'profile';
export type RunnerType = 'telescopic' | 'concealed_tandem';
// Граница проёма: дно, крыша или id полки.
export type BoundaryRef = string;

export interface DoorItem {
  id: string;
  bottomRef: BoundaryRef;
  topRef: BoundaryRef;
  mount: FacadeMount;
  leaves: 1 | 2;
  hingeSide: 'left' | 'right'; // для одностворчатой двери
  handle: HandleType;
}

export interface DrawerBlock {
  id: string;
  bottomRef: BoundaryRef;
  topRef: BoundaryRef;
  count: number; // ящиков в проёме, фасады делят его поровну
  mount: FacadeMount;
  runnerType: RunnerType;
  handle: HandleType;
}

// ---------- Правки отдельных деталей (инструмент «Детали») ----------

// L1/L2 — стороны вдоль длинного размера детали, W1/W2 — вдоль короткого.
// «1» — видимая сторона: передняя (z), верхняя (y) или левая (x).
export type EdgeSide = 'L1' | 'L2' | 'W1' | 'W2';
export const EDGE_SIDES: readonly EdgeSide[] = ['L1', 'L2', 'W1', 'W2'];

// Пласть детали по оси толщины: min — нижняя/задняя/левая, max — верхняя/передняя/правая.
export type PartFace = 'min' | 'max';

export interface GrooveSpec {
  id: string;
  side: EdgeSide; // от какой кромки отсчитывается отступ; паз идёт вдоль неё
  face: PartFace;
  offset: number; // от кромки до паза, мм
  width: number;
  depth: number;
  insetStart: number; // не доводить паз до начала кромки, мм
  insetEnd: number;
}

export interface PartOverride {
  name?: string;
  materialId?: string; // только материал той же толщины
  grain?: 'long' | 'short'; // волокна вдоль длинной или короткой стороны
  edges?: Partial<Record<EdgeSide, { thickness?: number; extend?: number }>>; // кромка 0 = нет; удлинение ±мм
  grooves?: GrooveSpec[];
  deleted?: boolean; // деталь убрана из сцены, раскроя и сметы, но её можно восстановить
}

export interface FurnitureModule {
  id: string;
  name: string;
  type: ModuleType;
  transform: Vec3 & { rotationY: number }; // rotationY в градусах
  dimensions: { width: number; height: number; depth: number };
  plinth: {
    height: number; // 0 — без цоколя (навесной модуль)
    setback: number; // отступ лицевой цокольной планки от переднего края корпуса
  };
  construction: {
    topType: TopJoinery;
    bottomType: BottomJoinery;
    backType: BackJoinery;
    connectorType: ConnectorType;
    leftSideToFloor: boolean;
    rightSideToFloor: boolean;
  };
  materials: {
    carcassMaterialId: string;
    backMaterialId: string;
    facadeMaterialId: string;
    plinthMaterialId: string;
  };
  subdivisions: {
    shelves: ShelfItem[];
    doors: DoorItem[];
    drawers: DrawerBlock[];
  };
  // Ключ — Part.key. Правки переживают пересборку модуля, пока деталь с этим ключом существует.
  partOverrides: Record<string, PartOverride>;
}

export interface ProjectState {
  id: string;
  name: string;
  clientName: string; // по нему менеджер ищет заказ в списке
  modules: FurnitureModule[];
}

// ---------- Результат расчёта ядра ----------

export type PartRole =
  | 'side_left'
  | 'side_right'
  | 'top'
  | 'bottom'
  | 'back'
  | 'plinth_front'
  | 'shelf'
  | 'door'
  | 'drawer_facade'
  | 'drawer_side'
  | 'drawer_front'
  | 'drawer_back'
  | 'drawer_bottom';

export const FACADE_ROLES: ReadonlySet<PartRole> = new Set(['door', 'drawer_facade']);

export type Axis = 'x' | 'y' | 'z';

export interface Part {
  id: string;
  key: string; // стабильный ключ детали внутри модуля
  moduleId: string;
  role: PartRole;
  name: string;
  materialId: string;
  thickness: number;
  // Габаритный бокс детали в координатах модуля.
  box: { min: Vec3; size: Vec3 };
  // Размеры для распила: length — вдоль волокон, width — поперёк.
  cut: { length: number; width: number };
  grainAxis: Axis;
  // Оси детали: толщина и две оси пласти. Длинная/короткая берутся до удлинений, чтобы L/W не прыгали.
  axes: { thickness: Axis; long: Axis; short: Axis };
  edges: Record<EdgeSide, number>; // толщина кромки по сторонам, 0 — без кромки
  extend: Record<EdgeSide, number>; // удлинение сторон, уже учтённое в box и cut
  grooves: GrooveSpec[];
  overridden: boolean; // у детали есть ручные правки
}

export interface HardwareItem {
  key: string; // одинаковый ключ — одна строка сметы
  name: string;
  unit: 'шт' | 'компл.' | 'м.п.';
  qty: number;
  partKey?: string; // фурнитура детали: уходит из сметы вместе с удалённой деталью
}

// Ручка для отображения в 3D. В смету идёт через HardwareItem.
export interface HandleVisual {
  box: { min: Vec3; size: Vec3 };
  partKey?: string;
}

export interface Assembly {
  moduleId: string;
  parts: Part[];
  hardware: HardwareItem[];
  handles: HandleVisual[];
  deletedParts: { key: string; name: string }[];
  warnings: string[];
}
