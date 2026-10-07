"use client";

import { Bounds, GizmoHelper, GizmoViewport, Grid, Html, Line, OrbitControls, Sky, useBounds } from "@react-three/drei";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { applyCut, applyExplode, highlightMember, memberIdFromHit } from "@/render/assemblies";
import { disposeOwned } from "@/render/meshes";
import type { CameraPreset, LightingPreset } from "@/store/configurator";

/**
 * Lighting presets use analytic lights only — no HDR environment maps, which
 * would be fetched from a CDN at runtime (blocked offline / on strict networks).
 * Overlay text uses drei <Html> (DOM), not <Text> — troika would fetch fonts.
 */
function Lights({ preset, reach }: { preset: LightingPreset; reach: number }) {
  const r = Math.max(12, reach);
  const sun = {
    castShadow: true,
    "shadow-mapSize": [2048, 2048] as [number, number],
    "shadow-bias": -0.0004,
    "shadow-normalBias": 0.02,
    "shadow-camera-left": -r,
    "shadow-camera-right": r,
    "shadow-camera-top": r,
    "shadow-camera-bottom": -r,
    "shadow-camera-far": 160,
  };
  switch (preset) {
    case "studio":
      return (
        <>
          <ambientLight intensity={0.35} />
          <directionalLight position={[6, 10, 8]} intensity={2.2} {...sun} />
          <directionalLight position={[-8, 4, -6]} intensity={0.8} />
          <directionalLight position={[0, 6, -10]} intensity={0.6} />
        </>
      );
    case "sunny":
      return (
        <>
          <Sky sunPosition={[40, 30, 20]} turbidity={6} rayleigh={1.2} />
          <hemisphereLight args={["#cfe3ff", "#8a7f6a", 0.7]} />
          <directionalLight position={[40, 30, 20]} intensity={3} {...sun} />
        </>
      );
    case "overcast":
      return (
        <>
          <hemisphereLight args={["#e6e9ee", "#9a9a95", 1.4]} />
          <directionalLight position={[2, 10, 4]} intensity={0.5} {...sun} />
        </>
      );
    case "dusk":
      return (
        <>
          <Sky sunPosition={[-40, 3, 25]} turbidity={10} rayleigh={3} mieCoefficient={0.01} />
          <hemisphereLight args={["#ffb37a", "#2a2f45", 0.5]} />
          <directionalLight position={[-40, 6, 25]} intensity={2.2} color="#ffb070" {...sun} />
          <pointLight position={[0, 2, 0]} intensity={6} distance={14} color="#ffcf8a" />
        </>
      );
  }
}

export interface Dim {
  from: [number, number, number];
  to: [number, number, number];
  label: string;
}

export interface Label {
  at: [number, number, number];
  title: string;
  sub?: string;
  color?: string;
}

export interface ViewportProps {
  object: THREE.Object3D | null;
  offset: [number, number, number];
  size: [number, number, number];
  lighting: LightingPreset;
  grid: boolean;
  explode: number;
  cut: number;
  selection: string | null;
  camera: { preset: CameraPreset; n: number };
  dims: Dim[];
  labels: Label[];
  ground: boolean;
  onPick: (memberId: string | null) => void;
}

/** Camera presets: fly to a view of the current model */
function CameraRig({ camera, size }: { camera: ViewportProps["camera"]; size: [number, number, number] }) {
  const api = useBounds();
  useEffect(() => {
    if (camera.n === 0) return;
    const [sx, sy, sz] = size;
    const r = Math.max(sx, sy, sz) * 1.6 + 2;
    const target = new THREE.Vector3(0, sy / 2, 0);
    const pos = {
      iso: [r * 0.75, r * 0.55, r * 0.9],
      front: [0, sy * 0.45, r * 1.05],
      side: [r * 1.05, sy * 0.45, 0],
      top: [0.001, r * 1.2, 0.001],
    }[camera.preset] as [number, number, number];
    api.to({ position: pos, target: [target.x, target.y, target.z] });
    // the effect is driven by the request counter, not by size changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera.n]);
  return null;
}

function Dimension({ d }: { d: Dim }) {
  const mid: [number, number, number] = [(d.from[0] + d.to[0]) / 2, (d.from[1] + d.to[1]) / 2, (d.from[2] + d.to[2]) / 2];
  return (
    <group>
      <Line points={[d.from, d.to]} color="#e8590c" lineWidth={1.5} />
      <Html position={mid} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <span className="whitespace-nowrap rounded bg-accent px-1.5 py-0.5 text-xs font-semibold text-surface shadow">{d.label}</span>
      </Html>
    </group>
  );
}

export default function Viewport({ object, offset, size, lighting, grid, explode, cut, selection, camera, dims, labels, ground, onPick }: ViewportProps) {
  // Free per-build geometry when the scene is replaced
  useEffect(
    () => () => {
      if (object) disposeOwned(object);
    },
    [object],
  );
  useEffect(() => {
    if (object) applyExplode(object, explode);
  }, [object, explode]);
  useEffect(() => {
    if (object) applyCut(object, cut);
  }, [object, cut]);
  useEffect(() => {
    if (object) highlightMember(object, selection);
  }, [object, selection]);

  const pick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    // A click on cladding selects nothing; on steel — the member under the cursor
    onPick(memberIdFromHit(e.object, e.instanceId));
  };
  const reach = Math.max(size[0], size[2]) * 0.9 + 4;

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [8, 6, 10], fov: 40, near: 0.01, far: 800 }}
      gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping }}
      aria-label="3D"
      onPointerMissed={() => onPick(null)}
    >
      <Lights preset={lighting} reach={reach} />
      {/* key: re-frame the camera whenever a new model is built, not on every edit of the view */}
      {object && (
        <Bounds key={object.uuid} fit clip margin={1.2}>
          <primitive object={object} onClick={pick} />
          <CameraRig camera={camera} size={size} />
        </Bounds>
      )}
      <group position={offset}>
        {dims.map((d, i) => (
          <Dimension key={i} d={d} />
        ))}
        {labels.map((l, i) => (
          <Html key={i} position={l.at} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
            <div className="whitespace-nowrap rounded-md border border-line bg-surface/90 px-2 py-1 text-center text-xs shadow">
              <div className="font-semibold" style={{ color: l.color }}>
                {l.title}
              </div>
              {l.sub && <div className="tabular-nums text-ink-mute">{l.sub}</div>}
            </div>
          </Html>
        ))}
      </group>
      {ground && (
        <mesh rotation-x={-Math.PI / 2} position={[0, -0.004, 0]} receiveShadow>
          <circleGeometry args={[reach * 1.6, 64]} />
          <meshStandardMaterial color={lighting === "dusk" ? "#4d5a3a" : "#8fae6a"} roughness={1} />
        </mesh>
      )}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.001, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <shadowMaterial opacity={0.2} />
      </mesh>
      {grid && (
        <Grid
          infiniteGrid
          cellSize={0.1}
          sectionSize={1}
          cellThickness={0.5}
          sectionThickness={1}
          cellColor="#9aa4b2"
          sectionColor="#5b6b80"
          fadeDistance={80}
          position={[0, 0.001, 0]}
        />
      )}
      <OrbitControls makeDefault enableDamping dampingFactor={0.12} maxPolarAngle={Math.PI * 0.495} />
      <GizmoHelper alignment="bottom-right" margin={[64, 64]}>
        <GizmoViewport labelColor="white" axisHeadScale={0.9} />
      </GizmoHelper>
    </Canvas>
  );
}
