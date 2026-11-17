/**
 * Подбор пружин растяжения, уравновешивающих раму.
 *
 * Геометрия в плоскости YZ, начало координат — ось шарнира. Рама в нижнем
 * положении горизонтальна (θ = 0), поднимается на θ до 70°. Рычаг пружины
 * направлен назад от оси; анкер пружины стоит ниже и дальше назад на задней
 * стойке, поэтому пружина тянет рычаг вниз и назад, то есть поднимает раму.
 */

export interface SpringSpec {
  /** Диаметр проволоки */
  wire: number;
  /** Наружный диаметр */
  outer: number;
  /** Длина в свободном состоянии между крючками */
  freeLength: number;
  /** Начальное натяжение, Н (у намотанных с преднатягом пружин 5–10 Н) */
  initialTension: number;
  /** Длина тела витков (без крючков) */
  bodyLength: number;
}

export interface BalanceGeometry {
  /** Длина рычага от оси до точки крепления пружины */
  armLength: number;
  /** Подъём точки крепления над осью при θ = 0 */
  armRise: number;
  /** Положение анкера относительно оси: назад (отрицательный Y) и вниз (отрицательный Z) */
  anchor: { y: number; z: number };
  /** Дополнительный преднатяг талрепом, мм */
  preload: number;
  springs: number;
}

const G = 9.81;
/** Модуль сдвига пружинной стали, Н/мм² */
const SHEAR_MODULUS = 79_000;

/** Жёсткость пружины растяжения по формуле k = G·d⁴ / (8·D³·n) */
export function springRate(s: SpringSpec): number {
  const meanD = s.outer - s.wire;
  const activeCoils = s.bodyLength / s.wire;
  return (SHEAR_MODULUS * Math.pow(s.wire, 4)) / (8 * Math.pow(meanD, 3) * activeCoils);
}

export function springForce(s: SpringSpec, extension: number): number {
  if (extension <= 0) return 0;
  return s.initialTension + springRate(s) * extension;
}

export interface BalancePoint {
  thetaDeg: number;
  extension: number;
  forcePerSpring: number;
  springTorque: number;
  gravityTorque: number;
  /** Отношение момента пружин к моменту рамы; 1 — равновесие */
  ratio: number;
}

export function balanceAt(
  thetaDeg: number,
  s: SpringSpec,
  g: BalanceGeometry,
  frameMassKg: number,
  frameCgOffset: number,
): BalancePoint {
  const th = (thetaDeg * Math.PI) / 180;
  // Рама уходит вперёд (+Y), рычаг пружины назад (-Y). Подъём передней части
  // рамы на θ поворачивает тело головки на +θ, и рычаг опускается к анкеру.
  const ay0 = -g.armLength;
  const az0 = g.armRise;
  const ay = ay0 * Math.cos(th) - az0 * Math.sin(th);
  const az = ay0 * Math.sin(th) + az0 * Math.cos(th);
  const dy = g.anchor.y - ay;
  const dz = g.anchor.z - az;
  const len = Math.hypot(dy, dz);
  const extension = len + g.preload - s.freeLength;
  const force = springForce(s, extension);
  const uy = dy / len;
  const uz = dz / len;
  // Плечо силы относительно оси: |r × u|
  const lever = Math.abs(ay * uz - az * uy);
  const springTorque = (g.springs * force * lever) / 1000;
  const gravityTorque = (frameMassKg * G * frameCgOffset * Math.cos(th)) / 1000;
  return { thetaDeg, extension, forcePerSpring: force, springTorque, gravityTorque, ratio: gravityTorque > 0 ? springTorque / gravityTorque : Infinity };
}

export interface BalanceReport {
  spring: SpringSpec;
  rate: number;
  down: BalancePoint;
  up: BalancePoint;
  /** Рама держится наверху без рук */
  holdsUp: boolean;
  /** Усилие на ручке при опускании с горизонтали не больше 25 Н */
  easyToLower: boolean;
  /** Растяжение не превышает 90 % длины тела витков (ресурс пружины) */
  withinStretch: boolean;
  verdict: "ok" | "weak" | "strong" | "overstretched";
}

/** Отчёт по уравновешиванию: внизу пружины должны почти снимать вес, наверху держать раму */
export function balanceReport(s: SpringSpec, g: BalanceGeometry, frameMassKg: number, frameCgOffset: number, handleArm = 450): BalanceReport {
  const down = balanceAt(0, s, g, frameMassKg, frameCgOffset);
  const up = balanceAt(70, s, g, frameMassKg, frameCgOffset);
  const holdsUp = up.springTorque >= up.gravityTorque;
  const residualDown = Math.abs(down.springTorque - down.gravityTorque) * 1000; // Н·мм
  const easyToLower = residualDown / handleArm <= 25;
  const maxExt = 0.9 * s.bodyLength;
  const withinStretch = Math.max(down.extension, up.extension) <= maxExt;
  let verdict: BalanceReport["verdict"] = "ok";
  if (!withinStretch) verdict = "overstretched";
  else if (down.ratio < 0.6) verdict = "weak";
  else if (down.ratio > 1.6) verdict = "strong";
  return { spring: s, rate: springRate(s), down, up, holdsUp, easyToLower, withinStretch, verdict };
}

/** Пружины, которые продаются в розницу (маркетплейсы, хозмаги) */
export const STOCK_SPRINGS: SpringSpec[] = [
  { wire: 1.4, outer: 14, freeLength: 100, bodyLength: 72, initialTension: 5 },
  { wire: 1.6, outer: 16, freeLength: 100, bodyLength: 70, initialTension: 8 },
  { wire: 1.8, outer: 18, freeLength: 100, bodyLength: 68, initialTension: 10 },
  { wire: 2.0, outer: 16, freeLength: 100, bodyLength: 70, initialTension: 12 },
  { wire: 2.0, outer: 20, freeLength: 120, bodyLength: 86, initialTension: 12 },
  { wire: 2.2, outer: 20, freeLength: 150, bodyLength: 115, initialTension: 15 },
  { wire: 2.5, outer: 22, freeLength: 150, bodyLength: 112, initialTension: 18 },
];

/** Первая пружина из складских, которая держит раму наверху и не требует усилия на ручке больше 25 Н */
export function pickSpring(g: BalanceGeometry, frameMassKg: number, frameCgOffset: number): BalanceReport {
  const reports = STOCK_SPRINGS.map((s) => balanceReport(s, g, frameMassKg, frameCgOffset));
  const good = reports.filter((r) => r.verdict === "ok" && r.holdsUp && r.easyToLower);
  const best = good.sort((a, b) => Math.abs(a.down.ratio - 1) - Math.abs(b.down.ratio - 1))[0];
  return best ?? reports.sort((a, b) => Math.abs(a.down.ratio - 1) - Math.abs(b.down.ratio - 1))[0]!;
}

export function describeSpring(s: SpringSpec): string {
  return `${s.wire.toFixed(1)}×${s.outer}×${s.freeLength}`;
}
