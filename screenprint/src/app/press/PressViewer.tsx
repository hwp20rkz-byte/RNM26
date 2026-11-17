"use client";

import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import { useMemo, useState } from "react";
import { LAYER_COLORS } from "@/domain/press/assembly";
import type { AssemblyLayer, PlacedBox } from "@/domain/press/assembly";

/**
 * 3D-вид сборки: параллелепипеды из pressAssembly(). Переключатели слоёв,
 * взрыв-схема и угол подъёма рамы. Координаты станка (мм): X вправо,
 * Y назад, Z вверх → в сцене Three.js: x = X, y = Z, z = Y.
 */

interface Props {
  boxes: PlacedBox[];
  pivot: { y: number; z: number };
  overall: { width: number; depth: number; height: number };
}

const LAYER_LABELS: Record<AssemblyLayer, string> = { plywood: "Фанера", profile: "Профиль", hardware: "Крепёж", frame: "Рама" };
const MM = 0.001;

function Box({ b, explode, lift, pivot }: { b: PlacedBox; explode: number; lift: number; pivot: Props["pivot"] }) {
  const [cx, cy, cz] = b.center;
  const [ex, ey, ez] = b.explode;
  const [sx, sy, sz] = b.size;
  const offset = explode * 120;
  const pos: [number, number, number] = [(cx + ex * offset) * MM, (cz + ez * offset) * MM, (cy + ey * offset) * MM];
  const mesh = (
    <mesh position={pos} castShadow receiveShadow>
      <boxGeometry args={[sx * MM, sz * MM, sy * MM]} />
      <meshStandardMaterial color={LAYER_COLORS[b.layer]} roughness={b.layer === "profile" ? 0.35 : 0.8} metalness={b.layer === "profile" || b.layer === "hardware" ? 0.6 : 0} />
    </mesh>
  );
  if (!b.rotatesWithHead) return mesh;
  // Поворот вокруг оси шарнира (параллельна X): в сцене ось x, пивот в (·, pivot.z, pivot.y)
  return (
    <group position={[0, pivot.z * MM, pivot.y * MM]} rotation={[(lift * Math.PI) / 180, 0, 0]}>
      <group position={[0, -pivot.z * MM, -pivot.y * MM]}>{mesh}</group>
    </group>
  );
}

export function PressViewer({ boxes, pivot, overall }: Props) {
  const [layers, setLayers] = useState<Record<AssemblyLayer, boolean>>({ plywood: true, profile: true, hardware: true, frame: true });
  const [explode, setExplode] = useState(0);
  const [lift, setLift] = useState(0);
  const visible = useMemo(() => boxes.filter((b) => layers[b.layer]), [boxes, layers]);
  const target: [number, number, number] = [(overall.width / 2) * MM, 0.12, (overall.depth / 2) * MM];

  return (
    <section className="flex flex-col gap-4">
      <div className="h-[480px] overflow-hidden rounded-xl border border-border bg-bg-elevated">
        <Canvas shadows camera={{ position: [-0.55, 0.42, -0.25], fov: 40, near: 0.01, far: 20 }}>
          <color attach="background" args={["#efe9dd"]} />
          <ambientLight intensity={0.7} />
          <directionalLight position={[2, 3, 1]} intensity={1.4} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0005} />
          <group position={[0, 0.018, 0]}>
            {visible.map((b) => (
              <Box key={b.id} b={b} explode={explode} lift={lift} pivot={pivot} />
            ))}
          </group>
          <Grid args={[4, 4]} cellSize={0.1} sectionSize={0.5} cellColor="#cfc6b5" sectionColor="#9aa5b1" fadeDistance={6} position={[target[0], 0, target[2]]} />
          <OrbitControls target={target} makeDefault maxPolarAngle={Math.PI / 2.05} />
        </Canvas>
      </div>
      <div className="flex flex-wrap items-center gap-6 text-sm">
        <div className="flex flex-wrap gap-3">
          {(Object.keys(LAYER_LABELS) as AssemblyLayer[]).map((l) => (
            <label key={l} className="inline-flex min-h-11 items-center gap-2">
              <input type="checkbox" checked={layers[l]} onChange={(e) => setLayers({ ...layers, [l]: e.target.checked })} />
              <span className="inline-block h-3 w-3 rounded-sm" style={{ background: LAYER_COLORS[l] }} />
              {LAYER_LABELS[l]}
            </label>
          ))}
        </div>
        <label className="inline-flex min-h-11 items-center gap-2">
          Взрыв-схема
          <input type="range" min={0} max={1} step={0.01} value={explode} onChange={(e) => setExplode(Number(e.target.value))} />
        </label>
        <label className="inline-flex min-h-11 items-center gap-2">
          Подъём рамы {lift}°
          <input type="range" min={0} max={70} step={1} value={lift} onChange={(e) => setLift(Number(e.target.value))} />
        </label>
      </div>
    </section>
  );
}
