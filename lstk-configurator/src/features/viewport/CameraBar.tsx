"use client";

import type { Analysis } from "@/domain/planner/analyze";
import { sideOpenings } from "@/domain/buildings/generate";
import { useT } from "@/i18n";
import { useState } from "react";
import { canRecord, saveBlob, startRecording, type Recording } from "./recorder";
import { walkKeys, type TourKind, type TourPoints } from "./Tour";

/** Key points of the camera work for this building, mm */
export function tourPoints(a: Analysis): TourPoints {
  const b = a.building;
  const { length, width } = b.input;
  const l0 = b.input.levels[0]!;
  const floor = b.levels[0]!.base;
  const doors = sideOpenings(l0.sides.front, length, l0.height, b.input, b.profile).filter((o) => o.kind === "door");
  const main = [...doors].sort((x, y) => y.width * y.height - x.width * x.height)[0];
  const rooms = a.thermal.envelope.rooms[0] ?? [];
  const centre = (r: { x0: number; x1: number; z0: number; z1: number }) => ({ x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2 });
  const lobby = rooms.find((r) => r.purpose === "lobby" || r.purpose === "hall");
  const hall = [...rooms].sort((x, y) => (y.purpose === "gym" ? 1e6 : y.area) - (x.purpose === "gym" ? 1e6 : x.area))[0];
  const eaves = b.levels[b.levels.length - 1]!.base + b.input.levels[b.input.levels.length - 1]!.height;
  return { length, width, eaves, ridge: Math.max(eaves, b.ridgeHeight), floor, entrance: main ? { x: main.x + main.width / 2 } : null, lobby: lobby ? centre(lobby) : null, hall: hall ? centre(hall) : null };
}

function Pad() {
  const hold = (k: keyof typeof walkKeys) => ({
    onPointerDown: (e: React.PointerEvent) => {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      walkKeys[k] = true;
    },
    onPointerUp: () => (walkKeys[k] = false),
    onPointerCancel: () => (walkKeys[k] = false),
    onPointerLeave: () => (walkKeys[k] = false),
  });
  const b = "grid size-12 select-none place-items-center rounded-xl border border-line bg-surface/90 text-lg shadow touch-none";
  return (
    <div className="pointer-events-auto grid grid-cols-3 gap-1" aria-label="walk pad">
      <span />
      <button type="button" className={b} {...hold("forward")} aria-label="↑">↑</button>
      <span />
      <button type="button" className={b} {...hold("turnLeft")} aria-label="↺">↺</button>
      <button type="button" className={b} {...hold("back")} aria-label="↓">↓</button>
      <button type="button" className={b} {...hold("turnRight")} aria-label="↻">↻</button>
    </div>
  );
}

export interface CameraState {
  tour: TourKind | null;
  walk: boolean;
}

/**
 * Camera work and video: three tours (each can be recorded straight to a
 * WebM file), a free first-person walk, and manual recording of whatever
 * the camera does.
 */
export function CameraBar({ a, cam, setCam, productId }: { a: Analysis; cam: CameraState; setCam: (c: CameraState) => void; productId: string }) {
  const t = useT();
  const [rec, setRec] = useState<{ r: Recording; name: string } | null>(null);
  const [withVideo, setWithVideo] = useState(false);
  const recordable = canRecord();
  const begin = (name: string) => {
    const c = document.querySelector("main canvas") as HTMLCanvasElement | null;
    if (!c || !recordable) return;
    setRec({ r: startRecording(c), name });
  };
  const end = async () => {
    if (!rec) return;
    const { r, name } = rec;
    setRec(null);
    const blob = await r.stop();
    saveBlob(blob, `${name}.${r.mime.includes("mp4") ? "mp4" : "webm"}`);
  };
  const play = (kind: TourKind) => {
    setCam({ tour: kind, walk: false });
    if (withVideo && !rec) begin(`lstk-${productId}-${kind}`);
  };
  const btn = (on: boolean) => `min-h-11 rounded-lg px-3 text-sm ${on ? "bg-primary text-surface" : "text-ink-mute hover:bg-sunken hover:text-ink"}`;
  return (
    <>
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-line bg-surface/90 p-1 shadow backdrop-blur">
        {(["orbit", "flyover", "interior"] as const).map((k) => (
          <button key={k} type="button" aria-pressed={cam.tour === k} onClick={() => (cam.tour === k ? setCam({ tour: null, walk: false }) : play(k))} className={btn(cam.tour === k)}>
            {t.dyn(`tour.${k}`)}
          </button>
        ))}
        <button type="button" aria-pressed={cam.walk} onClick={() => setCam({ tour: null, walk: !cam.walk })} className={btn(cam.walk)}>
          {t("tour.walk")}
        </button>
        {recordable && (
          <>
            <label className="flex min-h-11 cursor-pointer items-center gap-1.5 px-2 text-sm text-ink-mute">
              <input type="checkbox" checked={withVideo} onChange={(e) => setWithVideo(e.target.checked)} className="size-4 accent-[hsl(var(--primary))]" />
              {t("tour.withVideo")}
            </label>
            <button type="button" aria-pressed={!!rec} onClick={() => (rec ? end() : begin(`lstk-${productId}-${Date.now()}`))} className={`min-h-11 rounded-lg px-3 text-sm font-semibold ${rec ? "bg-danger text-surface" : "text-danger hover:bg-danger-soft"}`}>
              {rec ? `■ ${t("tour.stop")}` : `● ${t("tour.rec")}`}
            </button>
          </>
        )}
      </div>
      {cam.walk && (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 flex items-end justify-between gap-4">
          <p className="pointer-events-auto max-w-sm rounded-lg bg-surface/90 p-2 text-xs text-ink-mute shadow">
            {t("tour.walkHint")}{" "}
            <button id="walk-capture" type="button" className="min-h-11 rounded-lg bg-primary px-3 text-sm font-semibold text-surface">
              {t("tour.look")}
            </button>
          </p>
          <Pad />
        </div>
      )}
      {/* The tour calls back when it ends; the recording ends with it */}
      <TourEnd active={!!cam.tour} onEnd={() => void end()} />
    </>
  );
}

function TourEnd({ active, onEnd }: { active: boolean; onEnd: () => void }) {
  const [was, setWas] = useState(active);
  if (was !== active) {
    setWas(active);
    if (!active) queueMicrotask(onEnd);
  }
  return null;
}
