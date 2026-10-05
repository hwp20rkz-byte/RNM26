"use client";

import { Bounds, GizmoHelper, GizmoViewport, Grid, OrbitControls, Sky } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect } from "react";
import type * as THREE from "three";
import { disposeOwned } from "@/render/meshes";
import type { LightingPreset } from "@/store/configurator";

/**
 * Lighting presets use analytic lights only — no HDR environment maps, which
 * would be fetched from a CDN at runtime (blocked offline / on strict networks).
 */
// Shadow bias: 1 mm steel sheet self-shadows ("acne" stripes) without it
function Lights({ preset }: { preset: LightingPreset }) {
  switch (preset) {
    case "studio":
      return (
        <>
          <ambientLight intensity={0.35} />
          <directionalLight position={[6, 10, 8]} intensity={2.2} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02} />
          <directionalLight position={[-8, 4, -6]} intensity={0.8} />
          <directionalLight position={[0, 6, -10]} intensity={0.6} />
        </>
      );
    case "sunny":
      return (
        <>
          <Sky sunPosition={[40, 30, 20]} turbidity={6} rayleigh={1.2} />
          <hemisphereLight args={["#cfe3ff", "#8a7f6a", 0.6]} />
          <directionalLight position={[40, 30, 20]} intensity={3} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02} />
        </>
      );
    case "overcast":
      return (
        <>
          <hemisphereLight args={["#e6e9ee", "#9a9a95", 1.4]} />
          <directionalLight position={[2, 10, 4]} intensity={0.5} castShadow shadow-bias={-0.0004} shadow-normalBias={0.02} />
        </>
      );
  }
}

export interface ViewportProps {
  object: THREE.Object3D | null;
  lighting: LightingPreset;
  grid: boolean;
}

export default function Viewport({ object, lighting, grid }: ViewportProps) {
  // Free per-build geometry when the scene is replaced
  useEffect(
    () => () => {
      if (object) disposeOwned(object);
    },
    [object],
  );

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [8, 6, 10], fov: 40, near: 0.01, far: 500 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      aria-label="3D-модель"
    >
      <Lights preset={lighting} />
      {/* key: re-frame the camera whenever a new model is built, not only on resize */}
      {object && (
        <Bounds key={object.uuid} fit clip observe margin={1.1}>
          <primitive object={object} />
        </Bounds>
      )}
      {grid && (
        <Grid
          infiniteGrid
          cellSize={0.1}
          sectionSize={1}
          cellThickness={0.5}
          sectionThickness={1}
          cellColor="#9aa4b2"
          sectionColor="#5b6b80"
          fadeDistance={60}
          position={[0, -0.0005, 0]}
        />
      )}
      <OrbitControls makeDefault enableDamping dampingFactor={0.12} maxPolarAngle={Math.PI * 0.495} />
      <GizmoHelper alignment="bottom-right" margin={[64, 64]}>
        <GizmoViewport labelColor="white" axisHeadScale={0.9} />
      </GizmoHelper>
    </Canvas>
  );
}
