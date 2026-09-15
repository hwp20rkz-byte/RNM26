import { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";
import { Check, X, PenTool, Square, MapPinPlus, Move, Eraser } from "lucide-react";
import type { Building, GeometryType, Zone, ZoneType } from "@/types/domain";

interface ZoneEditorLayerProps {
  zones: Zone[];
  buildings: Building[];
  onZonesChange: (zones: Zone[]) => void;
}

interface ZoneMeta {
  id: string;
  name: string;
  zoneType: ZoneType;
  buildingId: string | null;
  radiusMeters?: number;
}

type ToolMode = "idle" | "draw-polygon" | "draw-rectangle" | "draw-marker" | "edit" | "delete";

const ZONE_TYPE_OPTIONS: { value: ZoneType; label: string }[] = [
  { value: "LAWN", label: "Газон" },
  { value: "PATH", label: "Дорожка" },
  { value: "TBO", label: "Площадка ТБО" },
  { value: "MAF", label: "Корпус / МАФ" },
  { value: "ENTRANCE", label: "Вход" },
  { value: "GATE", label: "Ворота" },
  { value: "STAIRS", label: "Лестница" },
  { value: "SPORT", label: "Спортзона" },
  { value: "PLAYGROUND", label: "Детская площадка" }
];

const TOOL_BUTTONS: { mode: ToolMode; label: string; icon: typeof PenTool }[] = [
  { mode: "draw-polygon", label: "Полигон", icon: PenTool },
  { mode: "draw-rectangle", label: "Прямоуг.", icon: Square },
  { mode: "draw-marker", label: "Точка", icon: MapPinPlus },
  { mode: "edit", label: "Править", icon: Move },
  { mode: "delete", label: "Удалить", icon: Eraser }
];

let seq = 0;
function nextId(): string {
  seq += 1;
  return `user-zone-${Date.now()}-${seq}`;
}

/** Кольцо координат GeoJSON [lng,lat] <-> Leaflet [lat,lng]. */
function toLatLngs(ring: GeoJSON.Position[]): L.LatLngExpression[] {
  return ring.map(([lng, lat]) => [lat, lng]);
}

function zoneToLayer(zone: Zone): L.Layer {
  if (zone.geometryType === "POINT") {
    const [lng, lat] = (zone.geometry as GeoJSON.Point).coordinates;
    return L.marker([lat, lng]);
  }
  if (zone.geometryType === "POLYGON") {
    const ring = (zone.geometry as GeoJSON.Polygon).coordinates[0];
    return L.polygon(toLatLngs(ring));
  }
  const coords = (zone.geometry as GeoJSON.LineString).coordinates;
  return L.polyline(toLatLngs(coords));
}

function layerToGeometry(layer: L.Layer): { geometryType: GeometryType; geometry: GeoJSON.Geometry } | null {
  if (layer instanceof L.Marker) {
    const { lat, lng } = layer.getLatLng();
    return { geometryType: "POINT", geometry: { type: "Point", coordinates: [lng, lat] } };
  }
  if (layer instanceof L.Polygon) {
    const latlngs = (layer.getLatLngs()[0] as L.LatLng[]).map((p) => [p.lng, p.lat] as GeoJSON.Position);
    if (latlngs.length > 0) latlngs.push(latlngs[0]); // GeoJSON polygon ring must close
    return { geometryType: "POLYGON", geometry: { type: "Polygon", coordinates: [latlngs] } };
  }
  if (layer instanceof L.Polyline) {
    const latlngs = (layer.getLatLngs() as L.LatLng[]).map((p) => [p.lng, p.lat] as GeoJSON.Position);
    return { geometryType: "LINE", geometry: { type: "LineString", coordinates: latlngs } };
  }
  return null;
}

export function ZoneEditorLayer({ zones, buildings, onZonesChange }: ZoneEditorLayerProps) {
  const map = useMap() as unknown as L.DrawMap;
  const featureGroupRef = useRef<L.FeatureGroup | null>(null);
  const metaByLayer = useRef(new WeakMap<L.Layer, ZoneMeta>());
  const activeHandlerRef = useRef<L.Handler | null>(null);
  const [mode, setMode] = useState<ToolMode>("idle");
  const [pending, setPending] = useState<{ layer: L.Layer; geometryType: GeometryType } | null>(null);
  const [form, setForm] = useState({ name: "", zoneType: "LAWN" as ZoneType, buildingId: "" });

  function emitZones() {
    const fg = featureGroupRef.current;
    if (!fg) return;
    const next: Zone[] = [];
    fg.eachLayer((layer) => {
      const meta = metaByLayer.current.get(layer);
      const geo = layerToGeometry(layer);
      if (!meta || !geo) return; // несохранённый черновик (ждёт формы) — не публикуем
      next.push({
        id: meta.id,
        buildingId: meta.buildingId,
        name: meta.name,
        geometryType: geo.geometryType,
        geometry: geo.geometry,
        zoneType: meta.zoneType,
        radiusMeters: meta.radiusMeters
      });
    });
    onZonesChange(next);
  }

  useEffect(() => {
    const fg = new L.FeatureGroup();
    featureGroupRef.current = fg;
    map.addLayer(fg);

    zones.forEach((zone) => {
      const layer = zoneToLayer(zone);
      metaByLayer.current.set(layer, {
        id: zone.id,
        name: zone.name,
        zoneType: zone.zoneType,
        buildingId: zone.buildingId,
        radiusMeters: zone.radiusMeters
      });
      fg.addLayer(layer);
    });

    function handleCreated(e: L.LeafletEvent) {
      const event = e as L.DrawEvents.Created;
      fg.addLayer(event.layer);
      const geo = layerToGeometry(event.layer);
      if (geo) setPending({ layer: event.layer, geometryType: geo.geometryType });
      activeHandlerRef.current = null;
      setMode("idle");
    }
    function handleEdited() {
      emitZones();
    }
    function handleDeleted() {
      emitZones();
    }

    map.on(L.Draw.Event.CREATED, handleCreated);
    map.on(L.Draw.Event.EDITED, handleEdited);
    map.on(L.Draw.Event.DELETED, handleDeleted);

    return () => {
      map.off(L.Draw.Event.CREATED, handleCreated);
      map.off(L.Draw.Event.EDITED, handleEdited);
      map.off(L.Draw.Event.DELETED, handleDeleted);
      activeHandlerRef.current?.disable();
      activeHandlerRef.current = null;
      map.removeLayer(fg);
      featureGroupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зоны загружаются один раз при входе в режим редактирования
  }, [map]);

  /** Останавливает текущий инструмент: сохраняет правки/удаления, отменяет незавершённое рисование. */
  function stopCurrentTool() {
    const handler = activeHandlerRef.current;
    if (handler instanceof L.EditToolbar.Edit) {
      handler.save();
      handler.disable();
    } else if (handler instanceof L.EditToolbar.Delete) {
      handler.save();
      handler.disable();
    } else {
      handler?.disable(); // рисование в процессе — просто отменяем
    }
    activeHandlerRef.current = null;
    setMode("idle");
  }

  function activateTool(next: ToolMode) {
    if (mode === next) {
      stopCurrentTool();
      return;
    }
    stopCurrentTool();
    const fg = featureGroupRef.current;
    if (!fg) return;

    let handler: L.Handler;
    switch (next) {
      case "draw-polygon":
        handler = new L.Draw.Polygon(map, { showArea: false, shapeOptions: { color: "#C96442" } });
        break;
      case "draw-rectangle":
        handler = new L.Draw.Rectangle(map, { shapeOptions: { color: "#C96442" } });
        break;
      case "draw-marker":
        handler = new L.Draw.Marker(map);
        break;
      case "edit":
        handler = new L.EditToolbar.Edit(map, { featureGroup: fg });
        break;
      case "delete":
        handler = new L.EditToolbar.Delete(map, { featureGroup: fg });
        break;
      default:
        return;
    }
    handler.enable();
    activeHandlerRef.current = handler;
    setMode(next);
  }

  function confirmPending() {
    if (!pending) return;
    const meta: ZoneMeta = {
      id: nextId(),
      name: form.name.trim() || "Новая зона",
      zoneType: form.zoneType,
      buildingId: form.buildingId || null,
      radiusMeters: pending.geometryType === "POINT" ? 15 : undefined
    };
    metaByLayer.current.set(pending.layer, meta);
    setPending(null);
    setForm({ name: "", zoneType: "LAWN", buildingId: "" });
    emitZones();
  }

  function cancelPending() {
    if (pending) featureGroupRef.current?.removeLayer(pending.layer);
    setPending(null);
    setForm({ name: "", zoneType: "LAWN", buildingId: "" });
  }

  return (
    <div className="absolute inset-x-0 bottom-0 z-[1100] flex flex-col gap-2 p-3">
      {pending && (
        <div className="rounded-2xl bg-surface-raised p-4 shadow-[0_-4px_24px_rgba(0,0,0,0.12)]">
          <p className="mb-3 text-sm font-semibold text-ink">Новая зона</p>
          <div className="space-y-2.5">
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Название, напр. «Газон у 9А»"
              className="w-full rounded-xl border border-surface-sunken bg-surface px-3 py-2 text-sm"
            />
            <select
              value={form.zoneType}
              onChange={(e) => setForm((f) => ({ ...f, zoneType: e.target.value as ZoneType }))}
              className="w-full rounded-xl border border-surface-sunken bg-surface px-3 py-2 text-sm"
            >
              {ZONE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={form.buildingId}
              onChange={(e) => setForm((f) => ({ ...f, buildingId: e.target.value }))}
              className="w-full rounded-xl border border-surface-sunken bg-surface px-3 py-2 text-sm"
            >
              <option value="">— двор, без привязки к зданию —</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.address}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={cancelPending}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-surface-sunken px-3 py-2.5 text-sm text-ink-muted"
            >
              <X size={15} /> Отмена
            </button>
            <button
              onClick={confirmPending}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent px-3 py-2.5 text-sm font-medium text-white"
            >
              <Check size={15} /> Сохранить
            </button>
          </div>
        </div>
      )}

      {/* Видимая панель инструментов конструктора — всегда внизу, вместо мелких иконок Leaflet в углу карты */}
      <div className="grid grid-cols-5 gap-1.5 rounded-2xl bg-surface-raised p-2 shadow-[0_-4px_24px_rgba(0,0,0,0.12)]">
        {TOOL_BUTTONS.map(({ mode: buttonMode, label, icon: Icon }) => {
          const active = mode === buttonMode;
          return (
            <button
              key={buttonMode}
              onClick={() => activateTool(buttonMode)}
              className={`flex flex-col items-center gap-1 rounded-xl py-2.5 text-[11px] font-medium transition ${
                active ? "bg-accent text-white" : "bg-surface-sunken text-ink-muted"
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          );
        })}
      </div>
      {mode !== "idle" && (
        <p className="rounded-xl bg-surface-raised/95 px-3 py-2 text-center text-xs text-ink-muted shadow-sm">
          {mode === "draw-polygon" && "Отмечайте вершины на карте, двойной клик — завершить"}
          {mode === "draw-rectangle" && "Потяните на карте, чтобы нарисовать прямоугольник"}
          {mode === "draw-marker" && "Коснитесь карты, чтобы поставить точку"}
          {mode === "edit" && "Перетаскивайте вершины/точки, затем нажмите «Править» ещё раз — сохранит"}
          {mode === "delete" && "Коснитесь зоны, чтобы отметить на удаление, затем «Удалить» ещё раз — подтвердит"}
        </p>
      )}
    </div>
  );
}
