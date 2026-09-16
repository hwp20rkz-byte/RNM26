import { useMemo, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip } from "react-leaflet";
import type { Layer, LeafletMouseEvent, PathOptions } from "leaflet";
import {
  MapPin,
  Trash2,
  Trash,
  Trees,
  TreePine,
  Shrub,
  Armchair,
  DoorOpen,
  Dumbbell,
  Baby,
  Waypoints,
  Pencil,
  Check,
  RotateCcw
} from "lucide-react";
import type { Zone, ZoneType } from "@/types/domain";
import { YARD_CENTER, buildings } from "./zones.data";
import { isSeedZone, loadZones, resetToSeed, saveZones } from "@/services/zoneStore";
import { ZoneEditorLayer } from "./ZoneEditorLayer";

// Цвета — CSS-переменные из tokens.css (--zone-*), не хардкод hex.
// TBO/ENTRANCE намеренно переиспользуют --accent, MAF/STAIRS — --text-mute.
const ZONE_STYLE: Record<ZoneType, PathOptions> = {
  LAWN: { color: "hsl(var(--zone-lawn))", fillColor: "hsl(var(--zone-lawn))", fillOpacity: 0.18, weight: 1.5 },
  PATH: { color: "hsl(var(--zone-path))", fillColor: "hsl(var(--zone-path))", fillOpacity: 0.15, weight: 1.5 },
  TBO: { color: "hsl(var(--accent))", fillColor: "hsl(var(--accent))", fillOpacity: 0.25, weight: 1.5 },
  MAF: { color: "hsl(var(--text-mute))", fillColor: "hsl(var(--zone-maf-fill))", fillOpacity: 0.35, weight: 1.5 },
  ENTRANCE: { color: "hsl(var(--accent))", fillColor: "hsl(var(--accent))", fillOpacity: 0.25, weight: 1.5 },
  GATE: { color: "hsl(var(--zone-gate))", fillColor: "hsl(var(--zone-gate))", fillOpacity: 0.25, weight: 1.5 },
  STAIRS: { color: "hsl(var(--text-mute))", fillColor: "hsl(var(--text-mute))", fillOpacity: 0.25, weight: 1.5 },
  SPORT: { color: "hsl(var(--zone-sport))", fillColor: "hsl(var(--zone-sport))", fillOpacity: 0.18, weight: 1.5 },
  PLAYGROUND: {
    color: "hsl(var(--zone-playground))",
    fillColor: "hsl(var(--zone-playground))",
    fillOpacity: 0.18,
    weight: 1.5
  },
  TREE: { color: "hsl(var(--zone-tree))", fillColor: "hsl(var(--zone-tree))", fillOpacity: 0.3, weight: 1.5 },
  BUSH: { color: "hsl(var(--zone-bush))", fillColor: "hsl(var(--zone-bush))", fillOpacity: 0.3, weight: 1.5 },
  BENCH: { color: "hsl(var(--zone-bench))", fillColor: "hsl(var(--zone-bench))", fillOpacity: 0.3, weight: 1.5 },
  TRASH_BIN: {
    color: "hsl(var(--zone-trash-bin))",
    fillColor: "hsl(var(--zone-trash-bin))",
    fillOpacity: 0.3,
    weight: 1.5
  }
};

const ZONE_ICON: Record<ZoneType, typeof MapPin> = {
  LAWN: Trees,
  PATH: Waypoints,
  TBO: Trash2,
  MAF: MapPin,
  ENTRANCE: DoorOpen,
  GATE: DoorOpen,
  STAIRS: Waypoints,
  SPORT: Dumbbell,
  PLAYGROUND: Baby,
  TREE: TreePine,
  BUSH: Shrub,
  BENCH: Armchair,
  TRASH_BIN: Trash
};

const ZONE_LABEL: Record<ZoneType, string> = {
  LAWN: "Газон",
  PATH: "Дорожка",
  TBO: "ТБО",
  MAF: "Корпус / МАФ",
  ENTRANCE: "Вход",
  GATE: "Ворота",
  STAIRS: "Лестница",
  SPORT: "Спортзона",
  PLAYGROUND: "Детская площадка",
  TREE: "Дерево",
  BUSH: "Кустарник",
  BENCH: "Лавочка",
  TRASH_BIN: "Урна"
};

interface CourtyardMapProps {
  /** вызывается при клике по зоне — точка входа для диспетчеризации задачи */
  onZoneSelect?: (zone: Zone) => void;
}

export function CourtyardMap({ onZoneSelect }: CourtyardMapProps) {
  const [zones, setZones] = useState<Zone[]>(() => loadZones());
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  const polygonZones = useMemo(() => zones.filter((z) => z.geometryType === "POLYGON"), [zones]);
  const pointZones = useMemo(() => zones.filter((z) => z.geometryType === "POINT"), [zones]);
  const selectedZone = zones.find((z) => z.id === selectedZoneId) ?? null;
  const hasDraftZones = useMemo(() => zones.some((z) => isSeedZone(z.id)), [zones]);

  function handleZoneClick(zone: Zone) {
    setSelectedZoneId(zone.id);
    onZoneSelect?.(zone);
  }

  function handleZonesChange(next: Zone[]) {
    setZones(next);
    saveZones(next);
  }

  function handleReset() {
    if (!confirm("Удалить все зоны и вернуть черновой набор по умолчанию?")) return;
    setZones(resetToSeed());
    setSelectedZoneId(null);
  }

  return (
    <div className="relative h-full w-full bg-surface">
      <MapContainer
        center={YARD_CENTER}
        zoom={18}
        maxZoom={21}
        className="h-full w-full"
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={21} />

        {editMode ? (
          <ZoneEditorLayer zones={zones} buildings={buildings} onZonesChange={handleZonesChange} />
        ) : (
          <>
            {polygonZones.map((zone) => {
              const draft = isSeedZone(zone.id);
              return (
                <GeoJSON
                  key={zone.id}
                  data={zone.geometry as GeoJSON.Geometry}
                  style={() => ({
                    ...ZONE_STYLE[zone.zoneType],
                    weight: zone.id === selectedZoneId ? 3 : ZONE_STYLE[zone.zoneType].weight,
                    dashArray: draft ? "6 5" : undefined
                  })}
                  eventHandlers={{
                    click: (e: LeafletMouseEvent) => {
                      e.originalEvent.stopPropagation();
                      handleZoneClick(zone);
                    }
                  }}
                  onEachFeature={(_feature, layer: Layer) => {
                    layer.bindTooltip(draft ? `${zone.name} (черновик)` : zone.name, {
                      sticky: true,
                      className: "!text-xs"
                    });
                  }}
                />
              );
            })}

            {pointZones.map((zone) => {
              const [lng, lat] = (zone.geometry as GeoJSON.Point).coordinates;
              const draft = isSeedZone(zone.id);
              return (
                <CircleMarker
                  key={zone.id}
                  center={[lat, lng]}
                  radius={zone.id === selectedZoneId ? 10 : 7}
                  pathOptions={{ ...ZONE_STYLE[zone.zoneType], dashArray: draft ? "4 3" : undefined }}
                  eventHandlers={{ click: () => handleZoneClick(zone) }}
                >
                  <Tooltip>{draft ? `${zone.name} (черновик)` : zone.name}</Tooltip>
                </CircleMarker>
              );
            })}
          </>
        )}
      </MapContainer>

      {/* Легенда */}
      {!editMode && (
        <div className="pointer-events-none absolute left-4 top-4 max-w-panel rounded-2xl bg-surface-raised/90 p-4 shadow-sm backdrop-blur">
          <p className="mb-2 text-xs font-medium text-ink-muted">Ақмешіт 9 · Двор</p>
          <ul className="max-h-64 space-y-2 overflow-y-auto pointer-events-auto">
            {(Object.keys(ZONE_LABEL) as ZoneType[]).map((type) => {
              const Icon = ZONE_ICON[type];
              return (
                <li key={type} className="flex items-center gap-2 text-xs text-ink">
                  <Icon size={13} style={{ color: ZONE_STYLE[type].color as string }} />
                  {ZONE_LABEL[type]}
                </li>
              );
            })}
          </ul>
          {hasDraftZones && (
            <p className="mt-2 border-t border-surface-sunken pt-2 text-xs leading-snug text-ink-faint">
              Пунктир — черновые зоны без привязки к реальной геодезии. Нажмите «Редактировать
              карту», чтобы поправить или удалить.
            </p>
          )}
        </div>
      )}

      {/* Переключатель режима редактирования */}
      <div className="absolute right-4 top-4 z-[1000] flex flex-col items-end gap-2">
        <button
          onClick={() => setEditMode((v) => !v)}
          className={`flex items-center gap-2 rounded-full px-4 py-4 text-sm font-medium shadow-sm transition ${
            editMode ? "bg-accent text-white" : "bg-surface-raised text-ink"
          }`}
        >
          {editMode ? <Check size={15} /> : <Pencil size={15} />}
          {editMode ? "Готово" : "Редактировать карту"}
        </button>
        {editMode && (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 rounded-full bg-surface-raised px-4 py-4 text-xs text-ink-muted shadow-sm"
          >
            <RotateCcw size={12} /> Сбросить к черновику
          </button>
        )}
      </div>

      {editMode && (
        <div className="pointer-events-none absolute left-4 top-4 max-w-panel rounded-2xl bg-surface-raised/90 p-4 text-xs leading-snug text-ink-muted shadow-sm backdrop-blur">
          Панель инструментов — внизу экрана. Выберите «Полигон»/«Прямоуг.»/«Точку», чтобы
          нарисовать зону, затем укажите название и тип. «Править» и «Удалить» работают с уже
          существующими зонами на карте.
        </div>
      )}

      {/* Карточка выбранной зоны — точка входа диспетчеризации задачи */}
      {!editMode && selectedZone && (
        <div className="absolute inset-x-0 bottom-0 z-[1000] rounded-t-2xl bg-surface-raised p-4 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-80 sm:rounded-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-ink">{selectedZone.name}</p>
              <p className="text-xs text-ink-muted">{ZONE_LABEL[selectedZone.zoneType]}</p>
            </div>
            <button
              onClick={() => setSelectedZoneId(null)}
              className="rounded-full p-4 text-xs text-ink-faint hover:bg-surface-sunken"
              aria-label="Закрыть"
            >
              ✕
            </button>
          </div>
          <button
            className="mt-4 w-full rounded-xl bg-accent px-4 py-4 text-sm font-medium text-white transition hover:opacity-90 active:scale-[0.98]"
            onClick={() => onZoneSelect?.(selectedZone)}
          >
            Создать задачу в этой зоне
          </button>
        </div>
      )}

      <p className="sr-only">Здания: {buildings.map((b) => b.address).join(", ")}</p>
    </div>
  );
}
