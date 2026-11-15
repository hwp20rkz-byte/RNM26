// Доменные типы — зеркалят ER-модель из ARCHITECTURE.md

export type Role = "ADMIN" | "CHAIRMAN" | "CLEANER";

export interface User {
  id: string;
  fullName: string;
  personnelCode: string; // "N" | "W" | расширяемо
  phoneE164: string;
  role: Role;
  gamificationScore: number;
  active: boolean;
}

export type BuildingCode =
  | "BLOCK_B" // Ақмешіт 9
  | "BLOCK_A" // Ақмешіт 9/1
  | "BLOCK_C" // Ақмешіт 9/2
  | "ANNEX_9A" // Ақмешіт 9А
  | "ANNEX_9B" // Ақмешіт 9Б
  | "PODIUM_ROOF"; // стилобат/кровля паркинга

export interface Building {
  id: string;
  code: BuildingCode;
  address: string;
  entrances: number;
}

export type ZoneType =
  | "LAWN"
  | "PATH"
  | "TBO"
  | "MAF"
  | "ENTRANCE"
  | "GATE"
  | "STAIRS"
  | "SPORT"
  | "PLAYGROUND"
  // отдельные малые архитектурные формы — точечные объекты конструктора,
  // не зоны обслуживания как таковые
  | "BENCH"
  | "TRASH_BIN"
  | "TREE"
  | "BUSH";

export type GeometryType = "POLYGON" | "POINT" | "LINE";

export interface Zone {
  id: string;
  buildingId: string | null;
  name: string;
  geometryType: GeometryType;
  /** GeoJSON geometry — координаты в WGS84 */
  geometry: GeoJSON.Geometry;
  zoneType: ZoneType;
  /** радиус допуска для гео-валидации чек-листа, метры */
  radiusMeters?: number;
}

export interface WorkTemplate {
  id: string;
  name: string;
  category: string;
  estimatedMinutes: number;
  referencePhotoUrl: string | null;
  checklistSchema: ChecklistItemSchema[];
}

export interface ChecklistItemSchema {
  key: string;
  label: string;
  requiresPhoto: boolean;
}

export type TaskStatus = "PLANNED" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Task {
  id: string;
  zoneId: string;
  workTemplateId: string;
  assigneeId: string | null;
  scheduledDate: string; // ISO date
  status: TaskStatus;
  startedAt: string | null;
  completedAt: string | null;
  checkInLocation: GeoPoint | null;
  geoValidated: boolean;
}

export interface ChecklistItem {
  id: string;
  taskId: string;
  label: string;
  checked: boolean;
  checkedAt: string | null;
}

export type MediaPhase = "BEFORE" | "AFTER";

export interface MediaAttachment {
  id: string;
  taskId: string;
  checklistItemId: string | null;
  phase: MediaPhase;
  storageUrl: string;
  capturedAt: string;
  capturedLocation: GeoPoint | null;
}

export interface GamificationEvent {
  id: string;
  userId: string;
  taskId: string;
  type: "SPEED_BADGE" | "QUALITY_BADGE" | "STREAK";
  points: number;
}
