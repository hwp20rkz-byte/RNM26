import type { Zone } from "@/types/domain";
import { zones as seedZones } from "@/components/map/zones.data";

/**
 * Персистентность зон в браузере пользователя — без backend это единственное
 * доступное хранилище. Сид-зоны из zones.data.ts — черновые синтетические
 * прямоугольники (нет привязки к реальной геодезии), на карте показаны
 * пунктиром и правятся/удаляются прямо в конструкторе (см. CourtyardMap).
 */
const STORAGE_KEY = "hoa.zones.v1";

export function isSeedZone(zoneId: string): boolean {
  return seedZones.some((z) => z.id === zoneId);
}

export function loadZones(): Zone[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedZones;
    const parsed = JSON.parse(raw) as Zone[];
    return Array.isArray(parsed) ? parsed : seedZones;
  } catch {
    return seedZones;
  }
}

export function saveZones(zones: Zone[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(zones));
  } catch {
    // приватный режим/квота — молча не сохраняем, конструктор остаётся
    // рабочим в рамках сессии, просто без персистентности между визитами
  }
}

export function resetToSeed(): Zone[] {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  return seedZones;
}
