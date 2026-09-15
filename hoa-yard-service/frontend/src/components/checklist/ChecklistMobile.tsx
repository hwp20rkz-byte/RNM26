import { useCallback, useRef, useState } from "react";
import { Camera, Check, Loader2, MapPin, MapPinOff, Play } from "lucide-react";
import type { ChecklistItem, MediaPhase, Task, WorkTemplate, Zone } from "@/types/domain";
import { getCurrentPosition, getZoneCenter, isWithinZone } from "@/services/geolocation";
import { stampPhoto } from "@/services/mediaCapture";
import { GamificationBar } from "./GamificationBar";

interface ChecklistMobileProps {
  task: Task;
  zone: Zone;
  workTemplate: WorkTemplate;
  items: ChecklistItem[];
  /** очки, уже накопленные исполнителем за смену — переданы извне, компонент их не хранит сам */
  shiftPoints: number;
  onSubmit: (payload: {
    taskId: string;
    checkedItemIds: string[];
    geoValidated: boolean;
    media: Array<{ phase: MediaPhase; itemId: string | null; blob: Blob }>;
  }) => Promise<void>;
}

type LocalStage = "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTING" | "DONE";

export function ChecklistMobile({
  task,
  zone,
  workTemplate,
  items,
  shiftPoints,
  onSubmit
}: ChecklistMobileProps) {
  const [stage, setStage] = useState<LocalStage>(
    task.status === "DONE" ? "DONE" : task.status === "IN_PROGRESS" ? "IN_PROGRESS" : "NOT_STARTED"
  );
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [geoValidated, setGeoValidated] = useState(task.geoValidated);
  const [geoChecking, setGeoChecking] = useState(false);
  const mediaQueue = useRef<Array<{ phase: MediaPhase; itemId: string | null; blob: Blob }>>([]);
  const [beforePreview, setBeforePreview] = useState<string | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  const zoneCenter = getZoneCenter(zone);
  const radius = zone.radiusMeters ?? 25;

  const validateGeo = useCallback(async () => {
    setGeoChecking(true);
    try {
      const position = await getCurrentPosition();
      const ok = isWithinZone(position, zoneCenter, radius);
      setGeoValidated(ok);
      return ok;
    } catch {
      setGeoValidated(false);
      return false;
    } finally {
      setGeoChecking(false);
    }
  }, [zoneCenter, radius]);

  async function handleStart() {
    await validateGeo();
    setStage("IN_PROGRESS");
  }

  async function handlePhoto(phase: MediaPhase, file: File | undefined, itemId: string | null = null) {
    if (!file) return;
    const stamped = await stampPhoto(file, `${zone.name} · ${phase === "BEFORE" ? "До" : "После"}`);
    mediaQueue.current.push({ phase, itemId, blob: stamped });
    const url = URL.createObjectURL(stamped);
    if (phase === "BEFORE") setBeforePreview(url);
    else setAfterPreview(url);
  }

  function toggleItem(itemId: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  async function handleComplete() {
    setStage("SUBMITTING");
    await onSubmit({
      taskId: task.id,
      checkedItemIds: Array.from(checkedIds),
      geoValidated,
      media: mediaQueue.current
    });
    setStage("DONE");
  }

  const allChecked = items.length > 0 && checkedIds.size === items.length;
  const canComplete = allChecked && Boolean(afterPreview) && stage === "IN_PROGRESS";

  return (
    <div className="mx-auto flex h-full max-w-md flex-col bg-surface px-4 pb-[env(safe-area-inset-bottom)] pt-4">
      <header className="mb-4">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
          {new Date(task.scheduledDate).toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h1 className="text-lg font-semibold text-ink">{workTemplate.name}</h1>
        <p className="text-sm text-ink-muted">{zone.name}</p>
      </header>

      <GamificationBar
        completedCount={checkedIds.size}
        totalCount={items.length}
        points={shiftPoints}
        badges={allChecked && geoValidated ? ["QUALITY_BADGE"] : []}
      />

      {/* Геостатус */}
      <div
        className={`mt-4 flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${
          geoValidated ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
        }`}
      >
        {geoChecking ? (
          <Loader2 size={14} className="animate-spin" />
        ) : geoValidated ? (
          <MapPin size={14} />
        ) : (
          <MapPinOff size={14} />
        )}
        {geoChecking
          ? "Проверяем местоположение…"
          : geoValidated
            ? "Местоположение подтверждено"
            : "Вне зоны — отметка уйдёт на проверку председателю"}
      </div>

      {stage === "NOT_STARTED" && (
        <button
          onClick={handleStart}
          className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-accent py-4 text-base font-semibold text-white active:scale-[0.98]"
        >
          <Play size={18} fill="white" /> Начать выполнение
        </button>
      )}

      {stage !== "NOT_STARTED" && (
        <>
          {/* Фото ДО */}
          <PhotoSlot
            label="Фото «До»"
            preview={beforePreview}
            onPick={() => beforeInputRef.current?.click()}
          />
          <input
            ref={beforeInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handlePhoto("BEFORE", e.target.files?.[0])}
          />

          <ul className="mt-4 flex-1 space-y-2 overflow-y-auto">
            {items.map((item) => {
              const checked = checkedIds.has(item.id);
              return (
                <li key={item.id}>
                  <button
                    onClick={() => toggleItem(item.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm transition ${
                      checked
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-transparent bg-surface-raised text-ink"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                        checked ? "border-emerald-600 bg-emerald-600" : "border-ink-faint"
                      }`}
                    >
                      {checked && <Check size={14} className="text-white" />}
                    </span>
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Фото ПОСЛЕ */}
          <PhotoSlot
            label="Фото «После» (обязательно для завершения)"
            preview={afterPreview}
            onPick={() => afterInputRef.current?.click()}
          />
          <input
            ref={afterInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handlePhoto("AFTER", e.target.files?.[0])}
          />

          <button
            onClick={handleComplete}
            disabled={!canComplete}
            className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-accent py-4 text-base font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-faint active:scale-[0.98]"
          >
            {stage === "SUBMITTING" ? (
              <Loader2 size={18} className="animate-spin" />
            ) : stage === "DONE" ? (
              "Задача закрыта"
            ) : (
              "Завершить задачу"
            )}
          </button>
        </>
      )}
    </div>
  );
}

function PhotoSlot({
  label,
  preview,
  onPick
}: {
  label: string;
  preview: string | null;
  onPick: () => void;
}) {
  return (
    <button
      onClick={onPick}
      className="mt-3 flex w-full items-center gap-3 rounded-xl bg-surface-raised p-3 text-left"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-sunken">
        {preview ? (
          <img src={preview} alt={label} className="h-full w-full object-cover" />
        ) : (
          <Camera size={20} className="text-ink-faint" />
        )}
      </span>
      <span className="text-sm text-ink-muted">{label}</span>
    </button>
  );
}
