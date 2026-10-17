import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { Edges, Grid, OrbitControls } from '@react-three/drei';
import { EDGE_SIDES, FACADE_ROLES, type Assembly, type Part } from '../../types/cad.types';
import { edgeBox, grooveBox } from '../../cad-kernel/assembler/parts';
import { useProjectStore } from '../../store/useProjectStore';
import { MATERIALS } from '../../store/useAssemblies';

const MM = 0.001; // сцена в метрах, ядро в миллиметрах

type Box = Part['box'];

function BoxMesh({ box, color, opacity = 1, inflate = 0 }: { box: Box; color: string; opacity?: number; inflate?: number }) {
  const { min, size } = box;
  return (
    <mesh position={[(min.x + size.x / 2) * MM, (min.y + size.y / 2) * MM, (min.z + size.z / 2) * MM]}>
      <boxGeometry args={[(size.x + inflate) * MM, (size.y + inflate) * MM, (size.z + inflate) * MM]} />
      <meshStandardMaterial color={color} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
}

function PartMesh({
  part,
  moduleSelected,
  partSelected,
  seeThrough,
  onClick,
}: {
  part: Part;
  moduleSelected: boolean;
  partSelected: boolean;
  seeThrough: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}) {
  const { min, size } = part.box;
  const color = partSelected ? '#93c5fd' : (MATERIALS.get(part.materialId)?.color ?? '#cccccc');
  const opacity = seeThrough && !partSelected ? 0.35 : 1;
  return (
    <mesh
      position={[(min.x + size.x / 2) * MM, (min.y + size.y / 2) * MM, (min.z + size.z / 2) * MM]}
      castShadow={opacity === 1}
      receiveShadow
      onClick={onClick}
    >
      <boxGeometry args={[size.x * MM, size.y * MM, size.z * MM]} />
      <meshStandardMaterial color={color} roughness={0.7} transparent={opacity < 1} opacity={opacity} depthWrite={opacity === 1} />
      <Edges color={partSelected ? '#1d4ed8' : moduleSelected ? '#2563eb' : '#555555'} />
    </mesh>
  );
}

export function Viewport3D({ assemblies }: { assemblies: Assembly[] }) {
  const modules = useProjectStore((s) => s.project.modules);
  const selectedId = useProjectStore((s) => s.selectedId);
  const select = useProjectStore((s) => s.select);
  const showFacades = useProjectStore((s) => s.showFacades);
  const setShowFacades = useProjectStore((s) => s.setShowFacades);
  const partMode = useProjectStore((s) => s.partMode);
  const setPartMode = useProjectStore((s) => s.setPartMode);
  const showEdges = useProjectStore((s) => s.showEdges);
  const setShowEdges = useProjectStore((s) => s.setShowEdges);
  const selectedParts = useProjectStore((s) => s.selectedParts);
  const selectParts = useProjectStore((s) => s.selectParts);

  const pickPart = (moduleId: string, key: string) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const multi = e.nativeEvent.ctrlKey || e.nativeEvent.metaKey;
    if (multi && moduleId === selectedId) {
      selectParts(moduleId, selectedParts.includes(key) ? selectedParts.filter((k) => k !== key) : [...selectedParts, key]);
    } else selectParts(moduleId, [key]);
  };

  const toggle = 'flex items-center gap-1.5 rounded bg-white/90 px-2 py-1 text-sm shadow';

  return (
    <div className="relative h-full w-full">
      <div className="absolute left-3 top-3 z-10 flex gap-2">
        <label className={toggle} title="Клавиша F">
          <input type="checkbox" checked={showFacades} onChange={(e) => setShowFacades(e.target.checked)} />
          Фасады
        </label>
        <label className={toggle} title="Кромки красным, корпус полупрозрачный">
          <input type="checkbox" checked={showEdges} onChange={(e) => setShowEdges(e.target.checked)} />
          Кромки
        </label>
        <button
          className={`${toggle} ${partMode ? 'bg-blue-600! text-white' : ''}`}
          title="Выбор отдельных деталей. Клавиша A, Ctrl+клик — несколько"
          onClick={() => setPartMode(!partMode)}
        >
          Детали (A)
        </button>
      </div>
      <Canvas shadows camera={{ position: [1.6, 1.4, 2.2], fov: 45 }} onPointerMissed={() => select(null)}>
        <color attach="background" args={['#eef0f3']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 5, 4]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]} />
        <Grid args={[10, 10]} cellSize={0.1} sectionSize={1} infiniteGrid fadeDistance={12} position={[0, 0, 0]} />
        {assemblies.map((a) => {
          const m = modules.find((x) => x.id === a.moduleId);
          if (!m) return null;
          const { x, y, z, rotationY } = m.transform;
          const isSelected = a.moduleId === selectedId;
          const visible = a.parts.filter((p) => showFacades || !FACADE_ROLES.has(p.role));
          return (
            <group
              key={a.moduleId}
              position={[x * MM, y * MM, z * MM]}
              rotation={[0, (rotationY * Math.PI) / 180, 0]}
              onClick={(e) => {
                e.stopPropagation();
                if (!partMode) select(a.moduleId);
              }}
            >
              {visible.map((p) => (
                <PartMesh
                  key={p.id}
                  part={p}
                  moduleSelected={isSelected}
                  partSelected={isSelected && selectedParts.includes(p.key)}
                  seeThrough={showEdges}
                  onClick={partMode ? pickPart(a.moduleId, p.key) : undefined}
                />
              ))}
              {visible.flatMap((p) => p.grooves.map((g) => <BoxMesh key={`${p.id}:${g.id}`} box={grooveBox(p, g)} color="#f97316" inflate={0.6} />))}
              {showEdges &&
                visible.flatMap((p) =>
                  EDGE_SIDES.filter((s) => p.edges[s] > 0).map((s) => (
                    <BoxMesh key={`${p.id}:edge:${s}`} box={edgeBox(p, s, Math.max(1.5, p.edges[s]))} color="#dc2626" />
                  )),
                )}
              {showFacades && a.handles.map((h, i) => <BoxMesh key={i} box={h.box} color="#3f3f46" />)}
            </group>
          );
        })}
        <OrbitControls makeDefault target={[0.4, 0.3, 0.2]} />
      </Canvas>
    </div>
  );
}
