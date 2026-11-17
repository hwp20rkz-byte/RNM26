import type { PressConfig, PressSizeId } from "./types";

/**
 * Типоразмеры стола. M — базовый (формат A3, рамы 40×50 и 50×60 см).
 * Длина хребта растёт со столом: головка должна уходить назад так, чтобы
 * шарнир стоял у заднего края рамы, а рама покрывала весь стол.
 */
export const PRESS_SIZES: Record<PressSizeId, Pick<PressConfig, "bed" | "spineLength" | "spineProfile" | "frameMassKg" | "frameCgOffset">> = {
  S: { bed: { width: 250, depth: 350 }, spineLength: 500, spineProfile: "4040", frameMassKg: 1.2, frameCgOffset: 220 },
  M: { bed: { width: 300, depth: 400 }, spineLength: 600, spineProfile: "4040", frameMassKg: 2.0, frameCgOffset: 260 },
  L: { bed: { width: 400, depth: 500 }, spineLength: 700, spineProfile: "4040", frameMassKg: 2.6, frameCgOffset: 310 },
  XL: { bed: { width: 450, depth: 600 }, spineLength: 800, spineProfile: "4080", frameMassKg: 3.2, frameCgOffset: 360 },
};

export function pressConfig(size: PressSizeId, overrides: Partial<PressConfig> = {}): PressConfig {
  const s = PRESS_SIZES[size];
  return {
    id: `press-${size}`,
    bed: s.bed,
    spineLength: s.spineLength,
    spineProfile: s.spineProfile,
    frameMassKg: s.frameMassKg,
    frameCgOffset: s.frameCgOffset,
    maxFrameThickness: 45,
    platens: ["tee"],
    microRegistration: true,
    stations: 1,
    structuralPly: 18,
    clampPly: 12,
    ...overrides,
  };
}

/** Проверка конфигурации: возвращает список замечаний, пустой — всё в допуске */
export function validateConfig(cfg: PressConfig): string[] {
  const issues: string[] = [];
  if (cfg.bed.width < 200 || cfg.bed.width > 500) issues.push("Ширина стола вне диапазона 200–500 мм");
  if (cfg.bed.depth < 250 || cfg.bed.depth > 650) issues.push("Глубина стола вне диапазона 250–650 мм");
  if (cfg.spineLength < cfg.bed.depth + 100) issues.push("Хребет короче стола плюс 100 мм: головка не встанет за задним краем рамы");
  if (cfg.spineProfile === "4040" && cfg.bed.width > 420) issues.push("Для стола шире 420 мм нужен профиль 4080: момент от широкой рамы");
  if (cfg.maxFrameThickness < 20 || cfg.maxFrameThickness > 60) issues.push("Зажим рамы рассчитан на толщину 20–60 мм");
  if (cfg.frameMassKg > 4) issues.push("Рама тяжелее 4 кг: две пружины не уравновесят, нужен газлифт");
  if (cfg.stations < 1 || cfg.stations > 6) issues.push("Число столов 1–6");
  return issues;
}
