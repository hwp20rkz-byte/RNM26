import type { GeoPoint, Zone } from "@/types/domain";

export class GeolocationError extends Error {}

/** Одноразовое определение позиции с высокой точностью — для гео-валидации чек-листа. */
export function getCurrentPosition(timeoutMs = 8000): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new GeolocationError("Геолокация недоступна на этом устройстве"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new GeolocationError(err.message)),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    );
  });
}

const EARTH_RADIUS_M = 6371000;

export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function isWithinZone(point: GeoPoint, zoneCenter: GeoPoint, radiusMeters: number): boolean {
  return haversineMeters(point, zoneCenter) <= radiusMeters;
}

/** Геометрический центр зоны для гео-валидации (усреднение вершин для полигона). */
export function getZoneCenter(zone: Zone): GeoPoint {
  if (zone.geometryType === "POINT") {
    const [lng, lat] = (zone.geometry as GeoJSON.Point).coordinates;
    return { lat, lng };
  }
  const rings =
    zone.geometryType === "POLYGON"
      ? (zone.geometry as GeoJSON.Polygon).coordinates[0]
      : (zone.geometry as GeoJSON.LineString).coordinates;
  const sum = rings.reduce((acc, [lng, lat]) => ({ lat: acc.lat + lat, lng: acc.lng + lng }), {
    lat: 0,
    lng: 0
  });
  return { lat: sum.lat / rings.length, lng: sum.lng / rings.length };
}
