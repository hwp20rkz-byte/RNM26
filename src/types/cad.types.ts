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
  };
}

export interface ProjectState {
  id: string;
  name: string;
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
  | 'shelf';

export type Axis = 'x' | 'y' | 'z';

export interface Part {
  id: string;
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
  // Сколько кромок облицовано: по длинной стороне (0–2) и по короткой (0–2).
  edging: { length: number; width: number };
}

export interface Assembly {
  moduleId: string;
  parts: Part[];
  warnings: string[];
}
