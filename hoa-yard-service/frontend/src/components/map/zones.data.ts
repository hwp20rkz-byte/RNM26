import type { Building, Zone } from "@/types/domain";

// [Предположение] Координаты — плейсхолдер для разработки, центр условный
// (район ул. Ақмешіт, Астана). Перед реальным запуском зоны нужно перерисовать
// в UI-конструкторе (Спринт 2) по факту съёмки/генплана — не использовать как есть.
export const YARD_CENTER: [number, number] = [51.1284, 71.4304];

export const buildings: Building[] = [
  { id: "b-block-b", code: "BLOCK_B", address: "ул. Ақмешіт 9", entrances: 2 },
  { id: "b-block-a", code: "BLOCK_A", address: "ул. Ақмешіт 9/1", entrances: 2 },
  { id: "b-block-c", code: "BLOCK_C", address: "ул. Ақмешіт 9/2", entrances: 2 },
  { id: "b-annex-9a", code: "ANNEX_9A", address: "ул. Ақмешіт 9А", entrances: 0 },
  { id: "b-annex-9b", code: "ANNEX_9B", address: "ул. Ақмешіт 9Б", entrances: 0 },
  { id: "b-podium", code: "PODIUM_ROOF", address: "Стилобат / кровля паркинга", entrances: 0 }
];

function rectPolygon(centerLat: number, centerLng: number, dLat: number, dLng: number): GeoJSON.Polygon {
  return {
    type: "Polygon",
    coordinates: [
      [
        [centerLng - dLng, centerLat - dLat],
        [centerLng + dLng, centerLat - dLat],
        [centerLng + dLng, centerLat + dLat],
        [centerLng - dLng, centerLat + dLat],
        [centerLng - dLng, centerLat - dLat]
      ]
    ]
  };
}

const [clat, clng] = YARD_CENTER;

export const zones: Zone[] = [
  {
    id: "z-block-b-footprint",
    buildingId: "b-block-b",
    name: "Ақмешіт 9 — корпус",
    geometryType: "POLYGON",
    zoneType: "MAF",
    geometry: rectPolygon(clat + 0.0009, clng - 0.0016, 0.00035, 0.0009)
  },
  {
    id: "z-block-a-footprint",
    buildingId: "b-block-a",
    name: "Ақмешіт 9/1 — корпус",
    geometryType: "POLYGON",
    zoneType: "MAF",
    geometry: rectPolygon(clat + 0.0009, clng + 0.0002, 0.00035, 0.0009)
  },
  {
    id: "z-block-c-footprint",
    buildingId: "b-block-c",
    name: "Ақмешіт 9/2 — корпус",
    geometryType: "POLYGON",
    zoneType: "MAF",
    geometry: rectPolygon(clat + 0.0009, clng + 0.002, 0.00035, 0.0009)
  },
  {
    id: "z-lawn-central",
    buildingId: null,
    name: "Центральный газон",
    geometryType: "POLYGON",
    zoneType: "LAWN",
    geometry: rectPolygon(clat, clng, 0.0006, 0.0022)
  },
  {
    id: "z-tbo",
    buildingId: null,
    name: "Площадка ТБО",
    geometryType: "POINT",
    zoneType: "TBO",
    radiusMeters: 15,
    geometry: { type: "Point", coordinates: [clng - 0.0022, clat - 0.0006] }
  },
  {
    id: "z-stairs-1",
    buildingId: null,
    name: "Лестница спуска во двор №1",
    geometryType: "POINT",
    zoneType: "STAIRS",
    radiusMeters: 10,
    geometry: { type: "Point", coordinates: [clng - 0.0018, clat + 0.0003] }
  },
  {
    id: "z-stairs-2",
    buildingId: null,
    name: "Лестница спуска во двор №2",
    geometryType: "POINT",
    zoneType: "STAIRS",
    radiusMeters: 10,
    geometry: { type: "Point", coordinates: [clng + 0.0018, clat + 0.0003] }
  },
  {
    id: "z-gate-main",
    buildingId: null,
    name: "Главные ворота (откатные, 2 калитки)",
    geometryType: "POINT",
    zoneType: "GATE",
    radiusMeters: 10,
    geometry: { type: "Point", coordinates: [clng, clat - 0.0009] }
  },
  {
    id: "z-gate-2",
    buildingId: null,
    name: "Ворота №2",
    geometryType: "POINT",
    zoneType: "GATE",
    radiusMeters: 10,
    geometry: { type: "Point", coordinates: [clng + 0.0009, clat - 0.0007] }
  },
  {
    id: "z-podium-sport",
    buildingId: "b-podium",
    name: "Тренажёрная зона (стилобат)",
    geometryType: "POLYGON",
    zoneType: "SPORT",
    geometry: rectPolygon(clat - 0.0006, clng, 0.0003, 0.0004)
  },
  {
    id: "z-podium-playground",
    buildingId: "b-podium",
    name: "Детская игровая площадка (стилобат)",
    geometryType: "POLYGON",
    zoneType: "PLAYGROUND",
    geometry: rectPolygon(clat - 0.0006, clng + 0.0009, 0.0003, 0.0004)
  }
];
