"use client";

import { Bounds, GizmoHelper, GizmoViewport, Grid, Html, Line, OrbitControls, Sky, useBounds } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { applyCut, applyExplode, highlightMember, memberIdFromHit } from "@/render/assemblies";
import { disposeOwned } from "@/render/meshes";
import { siteIdFromHit } from "@/render/site";
import { TourRig, WalkRig, type TourKind, type TourPoints } from "./Tour";
import type { CameraPreset, LightingPreset } from "@/store/configurator";

/**
 * Lighting presets are analytic lights plus a procedural studio environment
 * (three's RoomEnvironment, prefiltered once) for reflections on steel,
 * chrome and ceramics — no HDR files fetched from a CDN at runtime.
 * Overlay text uses drei <Html> (DOM), not <Text> — troika would fetch fonts.
 */
function Environment({ intensity }: { intensity: number }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const tex = pmrem.fromScene(room, 0.04).texture;
    scene.environment = tex;
    return () => {
      scene.environment = null;
      tex.dispose();
      room.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  useEffect(() => {
    scene.environmentIntensity = intensity;
    // The environment adds light on top of the sun and the sky: pull the exposure back
    gl.toneMappingExposure = intensity > 0.4 ? 0.82 : 0.92;
  }, [gl, scene, intensity]);
  return null;
}

/**
 * Photo mode: the frame goes through a composer — multisampled render,
 * ground-truth ambient occlusion (contact shadows in every node, under the
 * profiles and the fittings), then tone mapping. Taking over the render loop
 * (useFrame priority 1) stops R3F's own render.
 */
function PhotoComposer({ shot }: { shot: number }) {
  const { gl, scene, camera, size } = useThree();
  const composer = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(size.width, size.height, { samples: 4, type: THREE.HalfFloatType });
    const c = new EffectComposer(gl, target);
    c.addPass(new RenderPass(scene, camera));
    const ao = new GTAOPass(scene, camera, size.width, size.height);
    ao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1, thickness: 1, scale: 1.2, samples: 16 });
    ao.blendIntensity = 1;
    c.addPass(ao);
    c.addPass(new OutputPass());
    return c;
    // the composer is rebuilt on a new camera/scene; size changes go through setSize
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera]);
  useEffect(() => {
    composer.setPixelRatio(gl.getPixelRatio());
    composer.setSize(size.width, size.height);
  }, [composer, gl, size]);
  useEffect(() => () => composer.dispose(), [composer]);
  // Render to PNG at twice the screen resolution
  useEffect(() => {
    if (shot === 0) return;
    const ratio = gl.getPixelRatio();
    composer.setPixelRatio(Math.min(4, ratio * 2));
    gl.setPixelRatio(Math.min(4, ratio * 2));
    composer.setSize(size.width, size.height);
    composer.render();
    gl.domElement.toBlob((blob) => {
      if (blob) {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `render-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      }
      gl.setPixelRatio(ratio);
      composer.setPixelRatio(ratio);
      composer.setSize(size.width, size.height);
    }, "image/png");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shot]);
  useFrame((_, delta) => composer.render(delta), 1);
  return null;
}
function Lights({ preset, reach, photo }: { preset: LightingPreset; reach: number; photo: boolean }) {
  const r = Math.max(12, reach);
  const map = photo ? 4096 : 2048;
  const sun = {
    castShadow: true,
    "shadow-mapSize": [map, map] as [number, number],
    "shadow-radius": photo ? 4 : 1,
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
  /** Slow turntable for the presentation mode */
  autoRotate?: boolean;
  /** Photo mode: environment reflections at full strength, ambient occlusion, PNG renders */
  photo?: boolean;
  /** Increment to save a PNG render (photo mode) */
  shot?: number;
  onPick: (memberId: string | null) => void;
  /** Landscape editor: when set, every click goes here with the plan point (mm) and the site item hit */
  onTool?: (hit: { x: number; z: number; siteId: string | null }) => void;
  /** Camera tour in progress (orbit, flyover, interior) and the key points it follows */
  tour?: { kind: TourKind; points: TourPoints; onDone: () => void } | null;
  /** First-person walk from this point (model mm) */
  walk?: [number, number, number] | null;
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
      iso: [r * 0.75, r * 0.55, -r * 0.9],
      // The front wall is at z = 0 of the model, the street on −z
      front: [0, sy * 0.45, -r * 1.05],
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

export default function Viewport({ object, offset, size, lighting, grid, explode, cut, selection, camera, dims, labels, ground, autoRotate = false, photo = false, shot = 0, onPick, onTool, tour = null, walk = null }: ViewportProps) {
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
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

  // Plan point under the cursor, mm in the model's frame
  const toPlan = (p: THREE.Vector3) => ({ x: (p.x - offset[0]) / 0.001, z: (p.z - offset[2]) / 0.001 });
  const tool = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onTool!({ ...toPlan(e.point), siteId: siteIdFromHit(e.object) });
  };
  const pick = (e: ThreeEvent<MouseEvent>) => {
    if (onTool) return tool(e);
    e.stopPropagation();
    // A click on cladding selects nothing; on steel — the member under the cursor
    onPick(memberIdFromHit(e.object, e.instanceId));
  };
  const reach = Math.max(size[0], size[2]) * 0.9 + 4;

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [8, 6, -10], fov: 40, near: 0.01, far: 800 }}
      gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping }}
      aria-label="3D"
      onPointerMissed={() => onPick(null)}
    >
      <Lights preset={lighting} reach={reach} photo={photo} />
      <Environment intensity={photo ? 0.5 : 0.3} />
      {photo && <PhotoComposer shot={shot} />}
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
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.001, 0]} receiveShadow onClick={onTool ? tool : undefined}>
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
      {tour && <TourRig key={tour.kind} kind={tour.kind} points={tour.points} offset={offset} onDone={tour.onDone} />}
      {walk && !tour && <WalkRig start={walk} offset={offset} />}
      {!walk && <OrbitControls makeDefault enabled={!tour} enableDamping dampingFactor={0.12} maxPolarAngle={Math.PI * 0.495} autoRotate={autoRotate && !reduce && !tour} autoRotateSpeed={0.5} />}
      {!photo && (
        <GizmoHelper alignment="bottom-right" margin={[64, 64]}>
          <GizmoViewport labelColor="white" axisHeadScale={0.9} />
        </GizmoHelper>
      )}
    </Canvas>
  );
}
