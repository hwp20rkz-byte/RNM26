import type { Hole, Part, PlatenKind, PressConfig, PressLayout, ProfileCut, Slot } from "./types";

/**
 * Геометрия узлов станка: размеры деталей из фанеры, отверстия, пазы,
 * отрезки профиля и ключевые координаты. Это единственное место, где заданы
 * конструктивные размеры; сборка (assembly.ts), экспорт раскроя и
 * спецификация берут их отсюда.
 *
 * Компоновка (вид сбоку, Y назад, Z вверх):
 *   стол на боковинах ── платен ── [рама] ── губки ── язык головки ── ось в щеках
 *   плита основания ─────── хребет 4040 ─── каретка ─── анкеры пружин
 * Губки зажима целиком впереди оси (на 80…180 мм), поэтому при подъёме рамы
 * на 70° их задний верхний угол не доходит до щёк; язык головки вращается
 * между щеками. Ось шарнира на 11 мм ниже верха стола: верх нижней губки
 * (= низ рамы) оказывается на 3 мм выше платена толщиной 12 мм.
 * Каретка сдвинута вперёд (заканчивается на 5 мм позади оси), а нижний слой
 * языка почти не заходит за ось: при подъёме рамы на 70° рычаг пружин
 * (верхний слой, 75 мм назад) опускается позади каретки, а не в неё.
 */

export const T = 18; // несущая фанера
export const TC = 12; // прижимная плита и платен
export const PROFILE_H = 40; // высота профиля 4040/4080 над плитой
export const LEG_H = 90; // высота боковин стола
export const CARRIAGE_W = 160;
export const CARRIAGE_D = 140;
export const CARRIAGE_POCKET = 6; // карман под профиль в нижнем слое каретки
export const CHEEK_D = 90;
export const CHEEK_ABOVE_AXLE = 21; // подшипник 11 + стенка 10
export const HEAD_W = CARRIAGE_W - 4 * T - 2; // язык между щеками с зазором 1 мм
export const HEAD_FRONT = 140; // от передней кромки языка до оси
export const HEAD_REAR = 75; // от оси до задней кромки верхнего слоя языка (рычаг пружин)
export const HEAD_REAR_BOTTOM = 10; // нижний слой почти не заходит за ось: при подъёме он не должен бить в каретку
export const HEAD_D = HEAD_FRONT + HEAD_REAR;
export const HEAD_D_BOTTOM = HEAD_FRONT + HEAD_REAR_BOTTOM;
export const CARRIAGE_BEHIND_AXLE = 5; // каретка сдвинута вперёд: рычаг пружин при подъёме опускается позади неё
export const CHEEK_NUTS = [-35, -10] as const; // забивные гайки M6 в кромке щеки относительно оси
export const AXLE_BELOW_HEAD_TOP = 8;
export const JAW_D = 100;
export const JAW_REAR_GAP = 80; // от задней кромки губки до оси
export const ANCHOR_BEHIND = 140; // анкер пружины позади оси
export const ANCHOR_BLOCK = 60;
export const BEARING_OD = 22; // 608ZZ
export const INSERT_NUT_M8 = 10; // отверстие под забивную гайку M8 в фанере
export const PLATEN_T = TC;
export const OFF_CONTACT_BASE = 3; // низ рамы над платеном при упорах в нуле
export const BED_FRONT_OVERHANG = 60; // несущая плита выступает вперёд под передний упор приводки
export const BED_REAR_OVERHANG = 30;

export function pressLayout(cfg: PressConfig): PressLayout {
  const { width: bw, depth: bd } = cfg.bed;
  const baseW = Math.max(bw + 120, 420);
  const pivotY = bd + 210;
  const baseD = pivotY + ANCHOR_BEHIND + ANCHOR_BLOCK / 2 + 10;
  const bedTopZ = LEG_H + T + T;
  const spineTopZ = PROFILE_H;
  const carriageTopZ = spineTopZ - CARRIAGE_POCKET + 2 * T;
  // верх нижней губки = низ рамы = верх платена + OFF_CONTACT_BASE
  const jawTopZ = bedTopZ + PLATEN_T + OFF_CONTACT_BASE;
  const pivotZ = jawTopZ - T - AXLE_BELOW_HEAD_TOP;
  const cheekH = pivotZ - carriageTopZ + CHEEK_ABOVE_AXLE;
  const jawWidth = Math.max(300, bw);
  return {
    base: { width: baseW, depth: baseD },
    legHeight: LEG_H,
    bedTopZ,
    spine: { x: baseW / 2, yFrom: baseD - cfg.spineLength, yTo: baseD, topZ: spineTopZ },
    carriage: { width: CARRIAGE_W, depth: CARRIAGE_D, topZ: carriageTopZ },
    pivot: { y: pivotY, z: pivotZ },
    cheekHeight: cheekH,
    jawWidth,
    overall: { width: baseW, depth: baseD, height: T + jawTopZ + cfg.maxFrameThickness + TC + 60 },
  };
}

const hole = (x: number, y: number, d: number, kind: Hole["kind"] = "through", note?: string): Hole => ({ x, y, d, kind, note });
const slot = (x: number, y: number, length: number, width: number, angle: 0 | 90, note?: string): Slot => ({ x, y, length, width, angle, note });

function part(p: Omit<Part, "holes" | "slots" | "cutouts" | "pockets" | "notes"> & Partial<Pick<Part, "holes" | "slots" | "cutouts" | "pockets" | "notes">>): Part {
  return { holes: [], slots: [], cutouts: [], pockets: [], notes: [], ...p };
}

function cornerHoles(w: number, h: number, inset: number, d: number, note: string): Hole[] {
  return [hole(inset, inset, d, "through", note), hole(w - inset, inset, d, "through", note), hole(inset, h - inset, d, "through", note), hole(w - inset, h - inset, d, "through", note)];
}

export function platenSize(kind: PlatenKind, cfg: PressConfig): { w: number; h: number } {
  switch (kind) {
    case "tee":
      return { w: 350, h: 450 };
    case "hoodie":
      return { w: 400, h: 500 };
    case "tote":
      return { w: 300, h: 350 };
    case "flat":
      return { w: cfg.bed.width, h: cfg.bed.depth };
  }
}

/** Все детали из фанеры для одного станка. Координаты деталей: x слева направо, y сверху вниз на раскрое. */
export function pressParts(cfg: PressConfig): Part[] {
  const L = pressLayout(cfg);
  const { width: bw, depth: bd } = cfg.bed;
  const W = L.base.width;
  const parts: Part[] = [];

  // 1. Плита основания
  const spineCount = Math.max(3, Math.round(cfg.spineLength / 150));
  const spineHoles: Hole[] = [];
  for (let i = 0; i < spineCount; i++) {
    const y = L.spine.yFrom + 60 + ((cfg.spineLength - 120) * i) / (spineCount - 1);
    spineHoles.push(hole(L.spine.x, y, 8.5, "through", "M8 в Т-гайку хребта, снизу потай 16 мм"));
  }
  const legX = [W / 2 - bw / 2 - T / 2, W / 2 + bw / 2 + T / 2];
  const anchorX = [W / 2 - CARRIAGE_W / 2 - ANCHOR_BLOCK / 2 - 10, W / 2 + CARRIAGE_W / 2 + ANCHOR_BLOCK / 2 + 10];
  const anchorY = L.pivot.y + ANCHOR_BEHIND;
  parts.push(
    part({
      id: "BASE",
      name: "Base plate",
      nameRu: "Плита основания",
      thickness: T,
      width: W,
      height: L.base.depth,
      qty: 1,
      holes: [
        ...cornerHoles(W, L.base.depth, 25, 8.5, "резиновая ножка M8"),
        ...spineHoles,
        ...legX.flatMap((x) => [hole(x, 80, 4, "through", "уголок боковины"), hole(x, bd - 80, 4, "through", "уголок боковины")]),
        ...anchorX.flatMap((x) => [hole(x - 20, anchorY, 4, "through", "саморез анкерного блока"), hole(x + 20, anchorY, 4, "through", "саморез анкерного блока")]),
      ],
      pockets: [{ x: L.spine.x - 20.5, y: L.spine.yFrom, w: 41, h: cfg.spineLength, note: "паз 3 мм под профиль: фиксация от разворота" }],
      notes: ["Кромки шлифовать, покрыть маслом", "Отверстия под ножки раззенковать сверху"],
    }),
  );

  // 2. Боковины стола
  parts.push(
    part({
      id: "LEG",
      name: "Bed side leg",
      nameRu: "Боковина стола",
      thickness: T,
      width: bd,
      height: LEG_H,
      qty: 2,
      holes: [hole(80, 20, 4, "through", "уголок к основанию"), hole(bd - 80, 20, 4, "through", "уголок к основанию"), hole(80, LEG_H - 20, 4, "through", "уголок к несущей плите"), hole(bd - 80, LEG_H - 20, 4, "through", "уголок к несущей плите")],
    }),
  );

  // 3. Несущая плита стола: шире стола на 60 с каждой стороны (блоки приводки),
  //    выступает вперёд на 60 и назад на 30
  const cw = bw + 120;
  const cd = bd + BED_FRONT_OVERHANG + BED_REAR_OVERHANG;
  const ox = 60;
  const oy = BED_FRONT_OVERHANG;
  parts.push(
    part({
      id: "CARRIER",
      name: "Bed carrier",
      nameRu: "Несущая плита стола",
      thickness: T,
      width: cw,
      height: cd,
      qty: 1,
      holes: [
        hole(ox + 40, oy + 40, 6.5, "through", "M6 крепление стола"),
        hole(ox + bw - 40, oy + 40, 6.5, "through", "M6 крепление стола"),
        hole(ox + 40, oy + bd - 40, 6.5, "through", "M6 крепление стола"),
        hole(ox + bw - 40, oy + bd - 40, 6.5, "through", "M6 крепление стола"),
        hole(ox - T / 2, oy + 80, 4, "through", "уголок боковины"),
        hole(ox - T / 2, oy + bd - 80, 4, "through", "уголок боковины"),
        hole(ox + bw + T / 2, oy + 80, 4, "through", "уголок боковины"),
        hole(ox + bw + T / 2, oy + bd - 80, 4, "through", "уголок боковины"),
      ],
      notes: ["Крепится к боковинам уголками снизу", "Блоки приводки клеятся у середины каждой стороны стола"],
    }),
  );

  // 4. Стол (столешница)
  parts.push(
    part({
      id: "BED",
      name: "Print bed",
      nameRu: "Стол печатный",
      thickness: T,
      width: bw,
      height: bd,
      qty: 1,
      slots: cfg.microRegistration ? [slot(40, 40, 20, 7, 0, "ход приводки ±6"), slot(bw - 40, 40, 20, 7, 0), slot(40, bd - 40, 20, 7, 0), slot(bw - 40, bd - 40, 20, 7, 0)] : [],
      holes: [
        ...(cfg.microRegistration ? [] : cornerHoles(bw, bd, 40, 6.5, "M6 к несущей плите")),
        hole(bw / 2 - 100, bd - 60, 8, "through", "штифт платена"),
        hole(bw / 2 + 100, bd - 60, 8, "through", "штифт платена"),
        hole(bw / 2, 60, 6.5, "through", "винт платена M6 с ручкой"),
      ],
      notes: ["Верх: накладка HPL или ПВХ 3 мм на клей", "Печать всегда через платен (12 мм): от него считан зазор"],
    }),
  );

  // 5. Упорные блоки микроприводки: два по X (60×40) и два по Y (60×40 на переднем выступе 60 и заднем 30)
  if (cfg.microRegistration) {
    parts.push(
      part({
        id: "PUSH",
        name: "Registration push block",
        nameRu: "Блок упорного винта приводки",
        thickness: T,
        width: 60,
        height: 28,
        qty: 4,
        holes: [hole(30, 14, INSERT_NUT_M8, "insert-nut", "забивная M8, винт M8×50 с контргайкой")],
        notes: ["Клей + 2 самореза к несущей плите; винт упирается в кромку стола"],
      }),
    );
  }

  // 6. Каретка головки (два слоя по 18)
  const pocketW = cfg.spineProfile === "4080" ? 81 : 41;
  const carriageHoles: Hole[] =
    cfg.spineProfile === "4080"
      ? [hole(CARRIAGE_W / 2 - 20, 35, 8.5, "through", "M8 в Т-гайку"), hole(CARRIAGE_W / 2 + 20, 35, 8.5, "through", "M8 в Т-гайку"), hole(CARRIAGE_W / 2 - 20, CARRIAGE_D - 35, 8.5, "through", "M8 в Т-гайку"), hole(CARRIAGE_W / 2 + 20, CARRIAGE_D - 35, 8.5, "through", "M8 в Т-гайку")]
      : [hole(CARRIAGE_W / 2, 35, 8.5, "through", "M8 в Т-гайку"), hole(CARRIAGE_W / 2, CARRIAGE_D - 35, 8.5, "through", "M8 в Т-гайку")];
  const cheekX = [2 * T, CARRIAGE_W - 2 * T]; // центры щёк по X: слои 18…54 и 106…142
  const axleYc = CARRIAGE_D - CARRIAGE_BEHIND_AXLE; // ось в координатах каретки (от передней кромки)
  parts.push(
    part({
      id: "CARRIAGE",
      name: "Head carriage layer",
      nameRu: "Каретка головки (слой)",
      thickness: T,
      width: CARRIAGE_W,
      height: CARRIAGE_D,
      qty: 2,
      holes: [
        ...carriageHoles,
        ...cornerHoles(CARRIAGE_W, CARRIAGE_D, 12, 6.5, "M6 стяжка слоёв"),
        ...cheekX.flatMap((x) => CHEEK_NUTS.map((dy) => hole(x, axleYc + dy, 6.5, "through", "M6 снизу в забивную гайку щеки"))),
      ],
      pockets: [{ x: CARRIAGE_W / 2 - pocketW / 2, y: 0, w: pocketW, h: CARRIAGE_D, note: "нижний слой: карман 6 мм по ширине профиля" }],
      notes: ["Нижний слой с карманом под профиль, верхний слой без кармана", "Щёки стоят у задней кромки каретки: ось на 5 мм впереди неё", "Положение по хребту задаёт зазор рамы к заднему упору стола"],
    }),
  );

  // 7. Щёки шарнира (две склеенные пары по 18): гнездо подшипника, забивные гайки M6 в нижней кромке
  parts.push(
    part({
      id: "CHEEK",
      name: "Pivot cheek layer",
      nameRu: "Щека шарнира (слой)",
      thickness: T,
      width: CHEEK_D,
      height: L.cheekHeight,
      qty: 4,
      holes: [hole(CHEEK_D / 2, CHEEK_ABOVE_AXLE, BEARING_OD - 0.1, "pocket", "гнездо 608ZZ глубиной 7 мм в наружном слое; во внутреннем — сквозное 16 мм"), hole(25, L.cheekHeight - 25, 6.5, "through", "M6 стяжка слоёв"), hole(CHEEK_D - 25, L.cheekHeight - 25, 6.5, "through", "M6 стяжка слоёв")],
      notes: ["После склейки пары: в нижнюю кромку две забивные гайки M6 (отверстие 8, глубина 15) на 35 и 10 мм впереди оси", "Подшипник на каплю эпоксидки"],
    }),
  );

  // 8. Язык головки: верхний слой 215 мм (рычаг пружин 75 мм за осью), нижний 150 мм
  const headHoles = (len: number): Hole[] => [
    hole(25, HEAD_FRONT - 60, INSERT_NUT_M8, "insert-nut", "упорный винт зазора M8×40, упирается в каретку"),
    hole(HEAD_W - 25, HEAD_FRONT - 60, INSERT_NUT_M8, "insert-nut", "упорный винт зазора M8×40"),
    hole(HEAD_W / 2 - 25, 30, 6.5, "through", "M6 к нижней губке"),
    hole(HEAD_W / 2 + 25, 30, 6.5, "through", "M6 к нижней губке"),
    hole(HEAD_W / 2 - 25, 60, 6.5, "through", "M6 к нижней губке"),
    hole(HEAD_W / 2 + 25, 60, 6.5, "through", "M6 к нижней губке"),
    hole(HEAD_W / 2, 100, 6.5, "through", "M6 стяжка слоёв"),
    ...(len > HEAD_FRONT + 30 ? [hole(HEAD_W / 2, len - 15, 6.5, "through", "M6 стяжка слоёв с губкой-накладкой")] : []),
  ];
  parts.push(
    part({
      id: "HEAD_BOTTOM",
      name: "Head tongue, bottom layer",
      nameRu: "Язык головки, нижний слой",
      thickness: T,
      width: HEAD_W,
      height: HEAD_D_BOTTOM,
      qty: 1,
      holes: headHoles(HEAD_D_BOTTOM),
      pockets: [{ x: 0, y: HEAD_FRONT - 4.1, w: HEAD_W, h: 8.2, note: "полукруглая канавка 4,1 мм по всей ширине под вал" }],
      notes: ["Заканчивается на 10 мм за осью: при подъёме не задевает каретку"],
    }),
  );
  parts.push(
    part({
      id: "HEAD_TOP",
      name: "Head tongue, top layer",
      nameRu: "Язык головки, верхний слой",
      thickness: T,
      width: HEAD_W,
      height: HEAD_D,
      qty: 1,
      holes: headHoles(HEAD_D),
      pockets: [{ x: 0, y: HEAD_FRONT - 4.1, w: HEAD_W, h: 8.2, note: "полукруглая канавка 4,1 мм по всей ширине под вал (вал лежит между слоями на эпоксидке)" }],
      notes: ["Вал 8×200 зажат между слоями в канавках и вклеен; снаружи щёк — хомуты", "Два рым-винта M6 по дереву в заднюю кромку на высоте оси — крюки пружин", "Слои склеить ПВА D3 и стянуть M6; упорные винты зазора ввинчиваются снизу через оба слоя"],
    }),
  );

  // 9. Нижняя губка зажима: вся впереди оси
  parts.push(
    part({
      id: "JAW_LOWER",
      name: "Lower clamp jaw",
      nameRu: "Нижняя губка зажима рамы",
      thickness: T,
      width: L.jawWidth,
      height: JAW_D,
      qty: 1,
      holes: [
        hole(L.jawWidth / 2 - 110, 50, INSERT_NUT_M8, "insert-nut", "забивная M8 под барашек"),
        hole(L.jawWidth / 2 + 110, 50, INSERT_NUT_M8, "insert-nut", "забивная M8 под барашек"),
        hole(L.jawWidth / 2 - 25, JAW_D - 30, 6.5, "through", "M6 к языку"),
        hole(L.jawWidth / 2 + 25, JAW_D - 30, 6.5, "through", "M6 к языку"),
        hole(L.jawWidth / 2 - 25, JAW_D - 60, 6.5, "through", "M6 к языку"),
        hole(L.jawWidth / 2 + 25, JAW_D - 60, 6.5, "through", "M6 к языку"),
      ],
      notes: ["Задняя кромка — упор рамы; лента EPDM 3 мм на рабочую плоскость"],
    }),
  );

  // 10. Верхняя губка (прижимная плита)
  parts.push(
    part({
      id: "JAW_UPPER",
      name: "Upper clamp plate",
      nameRu: "Верхняя прижимная плита",
      thickness: TC,
      width: L.jawWidth,
      height: JAW_D,
      qty: 1,
      holes: [hole(L.jawWidth / 2 - 110, 50, 8.5, "through", "барашек M8×60"), hole(L.jawWidth / 2 + 110, 50, 8.5, "through", "барашек M8×60")],
      notes: ["Передняя кромка снять фаску 3 мм", `Раскрытие зажима до ${cfg.maxFrameThickness} мм`],
    }),
  );

  // 11. Анкерные блоки пружин на плите основания
  parts.push(
    part({
      id: "ANCHOR",
      name: "Spring anchor block",
      nameRu: "Анкерный блок пружины",
      thickness: T,
      width: ANCHOR_BLOCK,
      height: ANCHOR_BLOCK,
      qty: 2,
      holes: [hole(ANCHOR_BLOCK / 2, ANCHOR_BLOCK / 2, 6.5, "through", "рым-болт M6 DIN 580 вертикально, гайка снизу в потае"), hole(10, ANCHOR_BLOCK / 2, 4, "through", "саморез"), hole(ANCHOR_BLOCK - 10, ANCHOR_BLOCK / 2, 4, "through", "саморез")],
      notes: ["Два слоя 18 мм (клей), кольцо рым-болта на 28 мм над плитой", "Талреп M6 между рым-болтом и пружиной"],
    }),
  );

  // 12. Платены
  for (const kind of cfg.platens) {
    const s = platenSize(kind, cfg);
    parts.push(
      part({
        id: `PLATEN_${kind.toUpperCase()}`,
        name: `Platen ${kind}`,
        nameRu: `Платен: ${{ tee: "футболка", hoodie: "худи", tote: "шопер", flat: "плоский" }[kind]}`,
        thickness: PLATEN_T,
        width: s.w,
        height: s.h,
        qty: 1,
        holes: [hole(s.w / 2 - 100, s.h - 60, 8, "through", "штифт"), hole(s.w / 2 + 100, s.h - 60, 8, "through", "штифт"), hole(s.w / 2, s.h - bd + 60, 6.5, "through", "винт M6 с ручкой")],
        cutouts: kind === "tee" || kind === "hoodie" ? [{ x: s.w / 2 - 70, y: 0, w: 140, h: 50, note: "вырез под горловину, углы R20" }] : [],
        notes: ["Верх: неопрен 3 мм на клей", "Кромки скруглить R6", "Задняя кромка платена совпадает с задней кромкой стола"],
      }),
    );
  }

  return parts;
}

export function profileCuts(cfg: PressConfig): ProfileCut[] {
  return [{ profile: cfg.spineProfile, length: cfg.spineLength, qty: cfg.stations, purpose: "хребет: направляющая каретки головки" }];
}

/** Площадь фанеры по толщинам, м², с запасом на раскрой */
export function plywoodArea(parts: Part[], wasteFactor = 1.3): Record<"12" | "18", number> {
  const area = { "12": 0, "18": 0 };
  for (const p of parts) {
    area[String(p.thickness) as "12" | "18"] += (p.width * p.height * p.qty) / 1e6;
  }
  return { "12": area["12"] * wasteFactor, "18": area["18"] * wasteFactor };
}
