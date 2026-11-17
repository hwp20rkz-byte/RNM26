import { ANCHOR_BEHIND, ANCHOR_BLOCK, BED_FRONT_OVERHANG, BED_REAR_OVERHANG, CARRIAGE_BEHIND_AXLE, CARRIAGE_D, CARRIAGE_POCKET, CARRIAGE_W, CHEEK_D, HEAD_D, HEAD_D_BOTTOM, HEAD_FRONT, HEAD_W, JAW_D, JAW_REAR_GAP, LEG_H, PLATEN_T, PROFILE_H, T, TC, platenSize, pressLayout } from "./geometry";
import type { PressConfig } from "./types";

/**
 * Сборка станка в координатах станка (X поперёк, Y назад, Z вверх от верха
 * плиты основания): каждая деталь — параллелепипед с центром и размерами.
 * Этого достаточно для 3D-конфигуратора (слои, взрыв-схема), проверки
 * пересечений и анимации подъёма рамы; точные контуры берутся из geometry.ts.
 */

export type AssemblyLayer = "plywood" | "profile" | "hardware" | "frame";

export interface PlacedBox {
  id: string;
  partId: string;
  nameRu: string;
  layer: AssemblyLayer;
  center: [number, number, number];
  size: [number, number, number];
  /** Направление разлёта для взрыв-схемы, единичный вектор */
  explode: [number, number, number];
  /** Деталь вращается вместе с рамой вокруг оси шарнира */
  rotatesWithHead: boolean;
}

export const LAYER_COLORS: Record<AssemblyLayer, string> = {
  plywood: "#C9A46A",
  profile: "#9AA5B1",
  hardware: "#4A5568",
  frame: "#3F7392",
};

export interface AssemblyOptions {
  /** Толщина рамы для визуализации */
  frameThickness?: number;
  frame?: { width: number; length: number } | null;
}

export function pressAssembly(cfg: PressConfig, opts: AssemblyOptions = {}): PlacedBox[] {
  const L = pressLayout(cfg);
  const { width: bw, depth: bd } = cfg.bed;
  const W = L.base.width;
  const D = L.base.depth;
  const cx = W / 2;
  const py = L.pivot.y;
  const pz = L.pivot.z;
  const ft = opts.frameThickness ?? 30;
  const frame = opts.frame === undefined ? { width: Math.max(400, bw + 100), length: bd + 100 } : opts.frame;
  const boxes: PlacedBox[] = [];
  const add = (b: Omit<PlacedBox, "rotatesWithHead"> & { rotatesWithHead?: boolean }) => boxes.push({ rotatesWithHead: false, ...b });

  add({ id: "BASE", partId: "BASE", nameRu: "Плита основания", layer: "plywood", center: [cx, D / 2, -T / 2], size: [W, D, T], explode: [0, 0, -1] });
  const spineW = cfg.spineProfile === "4080" ? 80 : 40;
  add({ id: "SPINE", partId: "SPINE", nameRu: `Хребет ${cfg.spineProfile}`, layer: "profile", center: [cx, L.spine.yFrom + cfg.spineLength / 2, PROFILE_H / 2], size: [spineW, cfg.spineLength, PROFILE_H], explode: [0, 0, 0.4] });

  const legX = [cx - bw / 2 - T / 2, cx + bw / 2 + T / 2];
  legX.forEach((x, i) => add({ id: `LEG_${i + 1}`, partId: "LEG", nameRu: "Боковина стола", layer: "plywood", center: [x, bd / 2, LEG_H / 2], size: [T, bd, LEG_H], explode: [i === 0 ? -1 : 1, 0, 0] }));

  const carrierZ = LEG_H + T / 2;
  add({ id: "CARRIER", partId: "CARRIER", nameRu: "Несущая плита стола", layer: "plywood", center: [cx, (bd + BED_REAR_OVERHANG - BED_FRONT_OVERHANG) / 2, carrierZ], size: [bw + 120, bd + BED_FRONT_OVERHANG + BED_REAR_OVERHANG, T], explode: [0, 0, 1] });
  const bedZ = LEG_H + T + T / 2;
  add({ id: "BED", partId: "BED", nameRu: "Стол печатный", layer: "plywood", center: [cx, bd / 2, bedZ], size: [bw, bd, T], explode: [0, 0, 1.6] });
  if (cfg.microRegistration) {
    const pushes: [number, number, number, number][] = [
      [cx, -BED_FRONT_OVERHANG / 2, 60, 28],
      [cx, bd + BED_REAR_OVERHANG / 2, 60, 28],
      [cx - bw / 2 - 30, bd / 2, 28, 60],
      [cx + bw / 2 + 30, bd / 2, 28, 60],
    ];
    pushes.forEach(([x, y, sx, sy], i) => add({ id: `PUSH_${i + 1}`, partId: "PUSH", nameRu: "Блок упорного винта приводки", layer: "plywood", center: [x, y, bedZ], size: [sx, sy, T], explode: [0, 0, 1.6] }));
  }
  for (const kind of cfg.platens) {
    const s = platenSize(kind, cfg);
    add({ id: `PLATEN_${kind.toUpperCase()}`, partId: `PLATEN_${kind.toUpperCase()}`, nameRu: "Платен", layer: "plywood", center: [cx, bd - s.h / 2, L.bedTopZ + PLATEN_T / 2], size: [s.w, s.h, PLATEN_T], explode: [0, 0, 2.4] });
  }

  // Каретка: нижний слой с карманом надет на профиль
  const carriageBottom = PROFILE_H - CARRIAGE_POCKET;
  add({ id: "CARRIAGE", partId: "CARRIAGE", nameRu: "Каретка головки", layer: "plywood", center: [cx, py + CARRIAGE_BEHIND_AXLE - CARRIAGE_D / 2, carriageBottom + T], size: [CARRIAGE_W, CARRIAGE_D, 2 * T], explode: [0, 1, 0] });
  const cheekX = [cx - CARRIAGE_W / 2 + T, cx + CARRIAGE_W / 2 - T];
  cheekX.forEach((x, i) =>
    add({ id: `CHEEK_${i + 1}`, partId: "CHEEK", nameRu: "Щека шарнира", layer: "plywood", center: [x, py, L.carriage.topZ + L.cheekHeight / 2], size: [2 * T, CHEEK_D, L.cheekHeight], explode: [i === 0 ? -1 : 1, 0, 0.3] }),
  );
  add({ id: "AXLE", partId: "AXLE", nameRu: "Вал 8 мм", layer: "hardware", center: [cx, py, pz], size: [200, 8, 8], explode: [0, 0, 1], rotatesWithHead: true });

  // Язык головки: верх на 8 мм выше оси
  const headTop = pz + 8;
  add({ id: "HEAD_TOP", partId: "HEAD_TOP", nameRu: "Язык головки, верхний слой", layer: "plywood", center: [cx, py - HEAD_FRONT + HEAD_D / 2, headTop - T / 2], size: [HEAD_W, HEAD_D, T], explode: [0, 0, 1.2], rotatesWithHead: true });
  add({ id: "HEAD_BOTTOM", partId: "HEAD_BOTTOM", nameRu: "Язык головки, нижний слой", layer: "plywood", center: [cx, py - HEAD_FRONT + HEAD_D_BOTTOM / 2, headTop - T - T / 2], size: [HEAD_W, HEAD_D_BOTTOM, T], explode: [0, 0, 0.9], rotatesWithHead: true });
  const jawY = py - JAW_REAR_GAP - JAW_D / 2;
  add({ id: "JAW_LOWER", partId: "JAW_LOWER", nameRu: "Нижняя губка", layer: "plywood", center: [cx, jawY, headTop + T / 2], size: [L.jawWidth, JAW_D, T], explode: [0, 0, 1.8], rotatesWithHead: true });
  const jawTop = headTop + T;
  add({ id: "JAW_UPPER", partId: "JAW_UPPER", nameRu: "Верхняя прижимная плита", layer: "plywood", center: [cx, jawY, jawTop + ft + TC / 2], size: [L.jawWidth, JAW_D, TC], explode: [0, 0, 2.6], rotatesWithHead: true });
  [-110, 110].forEach((dx, i) => add({ id: `KNOB_${i + 1}`, partId: "KNOB", nameRu: "Барашек M8", layer: "hardware", center: [cx + dx, jawY, jawTop + ft + TC + 18], size: [50, 50, 36], explode: [0, 0, 3.2], rotatesWithHead: true }));
  if (frame) {
    add({ id: "FRAME", partId: "FRAME", nameRu: "Рама с сеткой", layer: "frame", center: [cx, py - JAW_REAR_GAP - frame.length / 2, jawTop + ft / 2], size: [frame.width, frame.length, ft], explode: [0, 0, 2.2], rotatesWithHead: true });
  }

  // Анкеры пружин, пружины
  const anchorX = [cx - CARRIAGE_W / 2 - ANCHOR_BLOCK / 2 - 10, cx + CARRIAGE_W / 2 + ANCHOR_BLOCK / 2 + 10];
  anchorX.forEach((x, i) => {
    add({ id: `ANCHOR_${i + 1}`, partId: "ANCHOR", nameRu: "Анкерный блок", layer: "plywood", center: [x, py + ANCHOR_BEHIND, T], size: [ANCHOR_BLOCK, ANCHOR_BLOCK, 2 * T], explode: [i === 0 ? -1 : 1, 0.5, 0] });
    add({ id: `SPRING_${i + 1}`, partId: "SPRING", nameRu: "Пружина с талрепом", layer: "hardware", center: [x, py + (75 + ANCHOR_BEHIND) / 2, (pz + 28) / 2], size: [16, ANCHOR_BEHIND - 75, pz - 28], explode: [i === 0 ? -1 : 1, 0, 0] });
  });

  return boxes;
}

/** Пары деталей, объёмы которых пересекаются глубже tolerance (мм) по всем трём осям */
export function collisions(boxes: PlacedBox[], tolerance = 0.5, ignore: (a: PlacedBox, b: PlacedBox) => boolean = () => false): [string, string][] {
  const out: [string, string][] = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]!;
      const b = boxes[j]!;
      if (ignore(a, b)) continue;
      let overlap = true;
      for (let k = 0; k < 3; k++) {
        const aMin = a.center[k]! - a.size[k]! / 2;
        const aMax = a.center[k]! + a.size[k]! / 2;
        const bMin = b.center[k]! - b.size[k]! / 2;
        const bMax = b.center[k]! + b.size[k]! / 2;
        if (Math.min(aMax, bMax) - Math.max(aMin, bMin) <= tolerance) {
          overlap = false;
          break;
        }
      }
      if (overlap) out.push([a.id, b.id]);
    }
  }
  return out;
}

/** Пересечения, которые заложены конструкцией: вал проходит сквозь щёки и язык, пружина нарисована сплошным объёмом, каретка надета на профиль */
export function designedOverlap(a: PlacedBox, b: PlacedBox): boolean {
  const ids = new Set([a.partId, b.partId]);
  if (ids.has("AXLE")) return true;
  if (ids.has("SPRING")) return true;
  if (ids.has("CARRIAGE") && ids.has("SPINE")) return true;
  return false;
}

/** Положение точки, вращающейся с головкой, при подъёме рамы на thetaDeg (для анимации) */
export function rotateWithHead(point: [number, number, number], cfg: PressConfig, thetaDeg: number): [number, number, number] {
  const L = pressLayout(cfg);
  const a = (-thetaDeg * Math.PI) / 180;
  const dy = point[1] - L.pivot.y;
  const dz = point[2] - L.pivot.z;
  // Поворот на -θ в плоскости YZ: передняя часть (dy < 0) уходит вверх, рычаг пружин (dy > 0) — вниз
  const y = L.pivot.y + dy * Math.cos(a) - dz * Math.sin(a);
  const z = L.pivot.z + dy * Math.sin(a) + dz * Math.cos(a);
  return [point[0], y, z];
}
