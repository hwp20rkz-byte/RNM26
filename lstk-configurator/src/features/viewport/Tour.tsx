"use client";

import { PointerLockControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { collide, type WallLine } from "./walls";

/**
 * Virtual camera work: an orbit, a cinematic flyover, an interior walk-
 * through along a path (entrance → lobby → hall), and a free first-person
 * walk (mouse look + WASD/arrows or the on-screen pad). Paths are smooth
 * Catmull-Rom curves through key points; the motion eases in and out.
 * Points come in model millimetres; `offset` shifts them into the scene.
 */

export type TourKind = "orbit" | "flyover" | "interior";

export interface TourPoints {
  /** Model bounds, mm */
  length: number;
  width: number;
  /** Eaves / ridge height and the floor level, mm */
  eaves: number;
  ridge: number;
  floor: number;
  /** Main entrance (centre of the door on the front wall), lobby and hall centres, mm */
  entrance: { x: number } | null;
  lobby: { x: number; z: number } | null;
  hall: { x: number; z: number } | null;
}

export const TOUR_SECONDS: Record<TourKind, number> = { orbit: 22, flyover: 26, interior: 30 };

const EYE = 1600;

/** Key points of a tour, mm: camera positions and the points it looks at */
export function tourKeys(kind: TourKind, p: TourPoints): { pos: [number, number, number][]; look: [number, number, number][] } {
  const cx = p.length / 2;
  const cz = p.width / 2;
  const r = Math.max(p.length, p.width) * 1.05 + 8000;
  const midY = p.ridge * 0.45;
  if (kind === "orbit") {
    const pos: [number, number, number][] = [];
    const look: [number, number, number][] = [];
    for (let i = 0; i <= 16; i++) {
      // Start in front (−z), a full turn, rising a little half way
      const a = -Math.PI / 2 + (i / 16) * Math.PI * 2;
      pos.push([cx + r * Math.cos(a), p.ridge * 0.9 + 3000 + Math.sin((i / 16) * Math.PI) * 4000, cz + r * Math.sin(a)]);
      look.push([cx, midY, cz]);
    }
    return { pos, look };
  }
  if (kind === "flyover") {
    const ex = p.entrance?.x ?? cx;
    return {
      pos: [
        [ex - r * 0.4, 1800, -r * 1.4],
        [ex - 2000, 2200, -r * 0.55],
        [ex, p.eaves + 1500, -9000],
        [cx, p.ridge + 9000, cz - 2000],
        [cx + p.length * 0.3, p.ridge + 12000, p.width + r * 0.5],
        [p.length + r * 0.6, p.ridge + 5000, p.width + r * 0.3],
        [p.length + r * 0.75, p.ridge * 0.8 + 4000, -r * 0.6],
      ],
      look: [
        [ex, p.eaves * 0.6, 0],
        [ex, p.eaves * 0.6, 0],
        [ex, p.eaves * 0.8, cz * 0.5],
        [cx, p.floor, cz],
        [cx, p.floor, cz],
        [cx, midY, cz],
        [cx, midY, cz],
      ],
    };
  }
  // Interior: from the apron through the door, the lobby, into the hall and a look round
  const ex = p.entrance?.x ?? cx;
  const y = p.floor + EYE;
  const lobby = p.lobby ?? { x: ex, z: Math.min(3000, cz) };
  const hall = p.hall ?? { x: cx, z: cz };
  return {
    pos: [
      [ex, y, -9000],
      [ex, y, -1500],
      [ex, y, 900],
      [lobby.x, y, lobby.z],
      [(lobby.x + hall.x) / 2, y, (lobby.z + hall.z) / 2],
      [hall.x - 2500, y, hall.z - 1500],
      [hall.x + 1500, y, hall.z + 1000],
      [hall.x + 2500, y, hall.z - 2500],
    ],
    look: [
      [ex, y - 200, 0],
      [ex, y - 200, 3000],
      [lobby.x, y - 200, lobby.z + 2000],
      [hall.x, y - 300, hall.z],
      [hall.x + 3000, y - 300, hall.z],
      [hall.x + 6000, y - 400, hall.z + 2000],
      [hall.x + 6000, y - 400, hall.z - 3000],
      [hall.x - 6000, y - 300, hall.z],
    ],
  };
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** Drives the camera along a tour; calls `onDone` at the end */
export function TourRig({ kind, points, offset, onDone, seconds }: { kind: TourKind; points: TourPoints; offset: [number, number, number]; onDone: () => void; seconds?: number }) {
  const { camera } = useThree();
  const start = useRef<number | null>(null);
  const done = useRef(false);
  const curves = useMemo(() => {
    const k = tourKeys(kind, points);
    const v = (a: [number, number, number]) => new THREE.Vector3(a[0] * 0.001 + offset[0], a[1] * 0.001 + offset[1], a[2] * 0.001 + offset[2]);
    return { pos: new THREE.CatmullRomCurve3(k.pos.map(v), kind === "orbit", "centripetal"), look: new THREE.CatmullRomCurve3(k.look.map(v), kind === "orbit", "centripetal") };
  }, [kind, points, offset]);
  const fov = useRef((camera as THREE.PerspectiveCamera).fov);
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const keep = fov.current;
    cam.fov = kind === "interior" ? 62 : 40;
    cam.updateProjectionMatrix();
    return () => {
      cam.fov = keep;
      cam.updateProjectionMatrix();
    };
  }, [camera, kind]);
  useFrame((state) => {
    if (start.current === null) start.current = state.clock.elapsedTime;
    const dur = seconds ?? TOUR_SECONDS[kind];
    const raw = Math.min(1, (state.clock.elapsedTime - start.current) / dur);
    const t = kind === "orbit" ? raw : ease(raw);
    camera.position.copy(curves.pos.getPointAt(t));
    camera.lookAt(curves.look.getPointAt(t));
    if (raw >= 1 && !done.current) {
      done.current = true;
      onDone();
    }
  });
  return null;
}

/** Keys held for the walk, shared with the on-screen pad */
export const walkKeys = { forward: false, back: false, left: false, right: false, turnLeft: false, turnRight: false, run: false };

/** First-person walk at eye height: mouse look (click to capture), WASD/arrows, Shift to run */
/** `walls` — plan wall lines (mm) the walker cannot pass; doors are gaps in them */
export function WalkRig({ start, offset, walls = [] }: { start: [number, number, number]; offset: [number, number, number]; walls?: readonly WallLine[] }) {
  const { camera } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const keep = cam.fov;
    cam.fov = 65;
    cam.updateProjectionMatrix();
    cam.position.set(start[0] * 0.001 + offset[0], start[1] * 0.001 + offset[1], start[2] * 0.001 + offset[2]);
    cam.lookAt(cam.position.x, cam.position.y - 0.1, cam.position.z + 10);
    const map: Record<string, keyof typeof walkKeys> = {
      KeyW: "forward",
      ArrowUp: "forward",
      KeyS: "back",
      ArrowDown: "back",
      KeyA: "left",
      KeyD: "right",
      ArrowLeft: "turnLeft",
      ArrowRight: "turnRight",
      ShiftLeft: "run",
      ShiftRight: "run",
    };
    const down = (e: KeyboardEvent) => {
      const k = map[e.code];
      if (k) {
        walkKeys[k] = true;
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      const k = map[e.code];
      if (k) walkKeys[k] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      for (const k of Object.keys(walkKeys) as (keyof typeof walkKeys)[]) walkKeys[k] = false;
      cam.fov = keep;
      cam.updateProjectionMatrix();
    };
    // the walk starts once per entry; later model edits do not teleport the walker
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const dir = useMemo(() => new THREE.Vector3(), []);
  const side = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    const step = (walkKeys.run ? 3.2 : 1.4) * Math.min(dt, 0.1);
    if (walkKeys.turnLeft) camera.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), 1.6 * Math.min(dt, 0.1));
    if (walkKeys.turnRight) camera.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), -1.6 * Math.min(dt, 0.1));
    camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();
    side.crossVectors(dir, camera.up).normalize();
    if (walkKeys.forward) camera.position.addScaledVector(dir, step);
    if (walkKeys.back) camera.position.addScaledVector(dir, -step);
    if (walkKeys.right) camera.position.addScaledVector(side, step);
    if (walkKeys.left) camera.position.addScaledVector(side, -step);
    if (walls.length) {
      const [x, z] = collide((camera.position.x - offset[0]) / 0.001, (camera.position.z - offset[2]) / 0.001, walls);
      camera.position.x = x * 0.001 + offset[0];
      camera.position.z = z * 0.001 + offset[2];
    }
  });
  return <PointerLockControls selector="#walk-capture" />;
}
