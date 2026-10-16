# CLAUDE.md — System Blueprint & Development Guide: 3D Furniture CAD Constructor

## 1. Project Overview & System Goals
Разработка промышленного веб-конструктора параметрической корпусной мебели и интерьеров (аналог Qdesign / Easy3D).
Ключевые особенности:
- Клиентский процедурный рендеринг геометрии на WebGL/Three.js без загрузки готовых мешей шкафов. Все элементы собираются из параметрических плит ЛДСП/МДФ.
- Автоматический расчет конструктивных сопряжений (накладные/вкладные горизонты, подрезка цоколя, пазы под ХДФ 3 мм).
- Авторасстановка внутреннего наполнения: полки, стойки, выдвижные ящики на телескопах (Push-to-Open) с контролем глубины и зазоров (3 мм).
- Стеновые панели с процедурной фрезеровкой («Волна», рейки) и правильной ориентацией волокон шпона.
- Двусторонняя реактивность: 3D-сцена <-> Дерево модулей <-> BOM (деталировка) <-> Смета и генератор КП в PDF.

---

## 2. Tech Stack & Architecture

- **Runtime & Language:** Node.js 20+, TypeScript 5.x (Strict mode)
- **3D Graphics:** `Three.js` (r160+), `three-bvh` (ускорение raycasting и детекции коллизий), `@types/three`
- **Frontend Core:** React 18+ (или Vue 3) + Tailwind CSS + Lucide React (иконки)
- **State Management:** `zustand` (с поддержкой middleware `immer` и `devtools`) для синхронизации единого состояния проекта
- **2D Floorplan Engine:** HTML5 Canvas API / `konva`
- **PDF Generation:** `pdfmake` или `jspdf` + `jspdf-autotable`
- **Math / Vector Utilities:** Встроенная библиотека `THREE.Vector3`, `THREE.Box3`, `THREE.Matrix4`

---

## 3. Directory & File Structure

```text
├── src/
│   ├── cad-kernel/              # Ядро параметрической геометрии
│   │   ├── geometry/
│   │   │   ├── BoardGenerator.ts      # Генератор меша плиты со скруглениями и UV
│   │   │   ├── MillingShader.ts       # Шейдер фрезеровки «Волна» / рейки
│   │   │   └── TextureManager.ts      # Менеджер текстур Egger, шпона, карт нормалей
│   │   ├── assembler/
│   │   │   ├── CabinetAssembler.ts    # Сборка короба (боковины, дно, крыша, цоколь)
│   │   │   ├── ShelfDividerEngine.ts  # Расчет проемов, полок и вертикальных стоек
│   │   │   ├── DrawerEngine.ts        # Расчет ящиков, зазоров и направляющих
│   │   │   └── FacadeEngine.ts        # Навеска фасадов и ориентация петель
│   │   ├── collision/
│   │   │   ├── WallConstraint.ts      # Ограничение движения модулей сквозь стены
│   │   │   └── SnappingEngine.ts      # Привязка модулей друг к другу
│   ├── components/              # UI компоненты
│   │   ├── viewport/
│   │   │   ├── Viewport3D.tsx         # Three.js холст, OrbitControls, свет
│   │   │   └── TransformGizmo.tsx     # Интерактивные стрелки трансформации
│   │   ├── inspector/
│   │   │   ├── RoomInspector.tsx      # Параметры комнаты и стен
│   │   │   ├── CarcassInspector.tsx   # Свойства модуля (крыша, дно, крепеж)
│   │   │   ├── SubdivisionsTab.tsx    # Настройки полок и ящиков
│   │   │   └── PanelsInspector.tsx    # Настройки стеновых панелей
│   │   ├── modals/
│   │   │   ├── MaterialCatalogModal.tsx # Каталог материалов и избранное
│   │   │   ├── EstimateModal.tsx        # Смета проекта (BOM)
│   │   │   └── ProposalModal.tsx        # Коммерческое предложение клиенту
│   ├── store/
│   │   ├── useProjectStore.ts   # Глобальное состояние проекта (JSON Schema)
│   │   └── useHistoryStore.ts   # Undo/Redo стек
│   ├── production/
│   │   ├── BomCalculator.ts     # Расчет расхода плит, кромки, фурнитуры
│   │   └── PdfExportService.ts  # Генерация клиентского КП в PDF
│   └── types/
│       └── cad.types.ts         # TypeScript интерфейсы ядра
├── public/textures/             # PBR текстуры ЛДСП, дерева и карты нормалей
└── package.json
```

## 4. Core TypeScript Data Models (src/types/cad.types.ts)

```typescript
export type TopJoineryType = 'overlay' | 'insert' | 'none';
export type BottomJoineryType = 'overlay' | 'insert' | 'overlay_left' | 'overlay_right';
export type BackJoineryType = 'groove_hdf' | 'insert' | 'overlay' | 'none';
export type ConnectorType = 'minifix' | 'confirmat' | 'dowel';
export type MillingType = 'smooth' | 'wave_slats' | 'fluted';
export type RunnerType = 'telescopic' | 'concealed_tandem';

export interface MaterialDef {
 id: string;
 name: string;
 code: string; // e.g. "U708"
 type: 'mdf_veneer' | 'ldsp' | 'hdf';
 thickness: number; // 16, 18, 3 mm
 textureUrl: string;
 roughness: number;
 metalness: number;
 pricePerM2: number;
 sheetWidth: number;  // 2800 mm
 sheetLength: number; // 2070 mm
}

export interface FurnitureModule {
 id: string;
 name: string;
 dimensions: {
   width: number;
   height: number;
   depth: number;
 };
 position: { x: number; y: number; z: number };
 plinth: {
   height: number;
   elevation: number;
 };
 construction: {
   topType: TopJoineryType;
   bottomType: BottomJoineryType;
   backType: BackJoineryType;
   connectorType: ConnectorType;
   leftSideToFloor: boolean;
   rightSideToFloor: boolean;
 };
 materials: {
   carcassId: string;
   backId: string;
   facadeId: string;
   plinthId: string;
 };
 subdivisions: {
   shelves: ShelfItem[];
   dividers: DividerItem[];
   drawers: DrawerItem[];
   doors: DoorItem[];
 };
}

export interface ShelfItem {
 id: string;
 elevation: number;
 isLocked: boolean; // замок высоты проема
 materialId: string;
}

export interface DividerItem {
 id: string;
 xOffset: number;
 isLocked: boolean;
}

export interface DrawerItem {
 id: string;
 cellIndex: number;
 runnerType: RunnerType;
 runnerLength: number; // 350, 400, 450, 500 mm
 topGap: number;       // default 3 mm
 bottomOffset: number; // default 25 mm
 boxHeight: number;
 facadeMaterialId: string;
}

export interface DoorItem {
 id: string;
 hingeSide: 'left' | 'right';
 hasHandle: boolean;
 boundaries: {
   topRefId: string;
   bottomRefId: string;
   leftRefId: string;
   rightRefId: string;
 };
}

export interface WallPanelItem {
 id: string;
 width: number;
 height: number;
 thickness: number;
 position: { x: number; y: number; z: number };
 materialId: string;
 milling: MillingType;
 grainOrientation: 'vertical' | 'horizontal';
}
```

## 5. Engineering & Joinery Rules (Правила сопряжения деталей)
При генерации мешей в CabinetAssembler.ts соблюдать строгие формулы раскроя плит ЛДСП (толщина T = 16 мм по умолчанию):
1. Боковины корпуса (Sides):
   * Если topType === 'overlay' и bottomType === 'overlay': SideHeight = TotalHeight - PlinthHeight - (2 * T).
   * Если topType === 'insert' и bottomType === 'insert': SideHeight = TotalHeight - PlinthHeight.
   * Если leftSideToFloor === true: Левая боковина продолжается вниз на высоту цоколя: LeftHeight = SideHeight + PlinthHeight. Ширина цоколя автоматически уменьшается: PlinthWidth = TotalWidth - T.
2. Горизонты (Крыша и Дно):
   * Накладной горизонт (overlay): Width = TotalWidth, Depth = TotalDepth.
   * Вкладной горизонт (insert): Width = TotalWidth - (2 * T), Depth = TotalDepth.
3. Задняя стенка (ХДФ 3 мм в паз):
   * Отступ паза от заднего торца боковин: 16 мм.
   * Глубина паза в боковине: 8 мм.
   * Ширина задней стенки ХДФ: Width = TotalWidth - (2 * T) + (2 * 8 мм).
4. Выдвижные ящики (Drawers Engine):
   * Автоподбор длины направляющих: RunnerLength = max(L ∈ [300, 350, 400, 450, 500, 550] | L <= Depth - 20 mm).
   * Технологические зазоры фасада: 3 мм сверху от столешницы/крыши, 3 мм между соседними фасадами.
   * Нижний отступ фасада для Push-to-Open: 25 мм.
5. Фрезеровка «Волна» на стеновых панелях:
   * Выполнять через процедурный Custom Normal Map / Displacement Shader в Three.js: N_x = \sin\left(\frac{2\pi \cdot x}{\text{step}}\right) \cdot \text{depth}
   * Направление волокон древесины строго вертикальное вдоль оси Y.

## 6. Step-by-Step Implementation Roadmap (Phases for Claude Code)
Phase 1: 3D Viewport & Procedural Board Generator
* Настроить сцену Three.js (PerspectiveCamera, DirectionalLight с тенями, мягкий AmbientLight, сетка координат).
* Реализовать BoardGenerator.createBoard(w, h, d, material):
   * Создание полигональной геометрии с корректной генерацией UV для текстур дерева.
   * Автоматическое выравнивание волокон текстуры вдоль длинной стороны детали.
Phase 2: Parametric Room & Wall Collision Engine
* Реализовать 2D/3D параметрическую стену с вводом габаритов (Длина: 3400 мм, Высота: 2950 мм).
* Интегрировать Three.js TransformControls (Красный = X, Зеленый = Y, Синий = Z).
* Реализовать WallConstraint: AABB-коллизия, запрещающая объекту пересекать плоскость стены и пола.
Phase 3: Module & Carcass Assembler
* Реализовать генерацию параметрических тумб и шкафов (левая тумба 353x634x400 мм, правая 400x634x400 мм).
* Поддержка накладных/вкладных деталей и автоматической подрезки цоколя.
* Сборка подвесного составного стола (две секции общей длиной 3400 мм со столешницей МДФ-шпон).
Phase 4: Subdivisions (Shelves, Dividers, Drawers)
* Реализовать автодобавление полок с замком проема (Lock Gap на 800 мм).
* Реализовать стойки-разделители подвесного стола под ящики.
* Реализовать установку выдвижных ящиков на телескопах (Push-to-Open) с автовычислением высоты фасадов и зазоров.
Phase 5: Facades, Hinges & Wall Panels
* Реализовать выбор границ ячейки кликом по 4 ограничивающим деталям.
* Переключение сторон петель (левое / правое открывание).
* Добавление трех стеновых панелей (800, 900, 300 мм) и наложение фрезеровки «Волна» на среднюю панель.
Phase 6: BOM Calculator & Proposal PDF Generator
* Рекурсивный обход FurnitureModule[]:
   * Квадратные метры плитных материалов (ЛДСП Egger U708, МДФ-шпон дуб, ХДФ) с коэффициентом отхода 1.15.
   * Штучный расчет крепежа: минификсы, конфирматы, комплекты направляющих ящиков, петли с толкателями Tip-On.
* Формирование сметы и экспорт коммерческого предложения в PDF с брендированной шапкой и спецификацией.

## 7. CLI Commands for Development

```bash
# Установка зависимостей
npm install three three-bvh zustand lucide-react jspdf jspdf-autotable tailwindcss

# Запуск dev-сервера
npm run dev

# Проверка типов TypeScript
npm run typecheck

# Сборка производственного бандла
npm run build
```
