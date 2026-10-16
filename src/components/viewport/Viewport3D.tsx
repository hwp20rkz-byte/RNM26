import { Canvas } from '@react-three/fiber';
import { Edges, Grid, OrbitControls } from '@react-three/drei';
import { FACADE_ROLES, type Assembly, type HandleVisual, type Part } from '../../types/cad.types';
import { useProjectStore } from '../../store/useProjectStore';
import { MATERIALS } from '../../store/useAssemblies';

const MM = 0.001; // сцена в метрах, ядро в миллиметрах

function PartMesh({ part, selected }: { part: Part; selected: boolean }) {
  const { min, size } = part.box;
  const color = MATERIALS.get(part.materialId)?.color ?? '#cccccc';
  return (
    <mesh
      position={[(min.x + size.x / 2) * MM, (min.y + size.y / 2) * MM, (min.z + size.z / 2) * MM]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[size.x * MM, size.y * MM, size.z * MM]} />
      <meshStandardMaterial color={color} roughness={0.7} />
      <Edges color={selected ? '#2563eb' : '#555555'} />
    </mesh>
  );
}

function HandleMesh({ h }: { h: HandleVisual }) {
  const { min, size } = h.box;
  return (
    <mesh position={[(min.x + size.x / 2) * MM, (min.y + size.y / 2) * MM, (min.z + size.z / 2) * MM]} castShadow>
      <boxGeometry args={[size.x * MM, size.y * MM, size.z * MM]} />
      <meshStandardMaterial color="#3f3f46" metalness={0.6} roughness={0.35} />
    </mesh>
  );
}

export function Viewport3D({ assemblies }: { assemblies: Assembly[] }) {
  const modules = useProjectStore((s) => s.project.modules);
  const selectedId = useProjectStore((s) => s.selectedId);
  const select = useProjectStore((s) => s.select);
  const showFacades = useProjectStore((s) => s.showFacades);
  const setShowFacades = useProjectStore((s) => s.setShowFacades);

  return (
    <div className="relative h-full w-full">
      <label className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded bg-white/90 px-2 py-1 text-sm shadow">
        <input type="checkbox" checked={showFacades} onChange={(e) => setShowFacades(e.target.checked)} />
        Фасады
      </label>
      <Canvas shadows camera={{ position: [1.6, 1.4, 2.2], fov: 45 }} onPointerMissed={() => select(null)}>
        <color attach="background" args={['#eef0f3']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 5, 4]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]} />
        <Grid args={[10, 10]} cellSize={0.1} sectionSize={1} infiniteGrid fadeDistance={12} position={[0, 0, 0]} />
        {assemblies.map((a) => {
          const m = modules.find((x) => x.id === a.moduleId);
          if (!m) return null;
          const { x, y, z, rotationY } = m.transform;
          return (
            <group
              key={a.moduleId}
              position={[x * MM, y * MM, z * MM]}
              rotation={[0, (rotationY * Math.PI) / 180, 0]}
              onClick={(e) => {
                e.stopPropagation();
                select(a.moduleId);
              }}
            >
              {a.parts
                .filter((p) => showFacades || !FACADE_ROLES.has(p.role))
                .map((p) => (
                  <PartMesh key={p.id} part={p} selected={a.moduleId === selectedId} />
                ))}
              {showFacades && a.handles.map((h, i) => <HandleMesh key={i} h={h} />)}
            </group>
          );
        })}
        <OrbitControls makeDefault target={[0.4, 0.3, 0.2]} />
      </Canvas>
    </div>
  );
}
