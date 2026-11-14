/**
 * <BlockHero id="batyr" move="jump360" /> — renders a hero from BlockHeroBuilder with toon materials, plays its moves
 * and opens the mouth with the voice: while a Kazakh line plays (speakKazakh), speechLevel() drives the mouth block.
 * One shared toon gradient texture; geometries and materials are created by R3F and disposed on unmount.
 */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { BODY, HEROES, mouthScale, pose, type HeroId, type Move, type PartId, type Piece } from './BlockHeroBuilder';
import { speechLevel } from '../../../lib/kazakhVoice';

let gradient: THREE.DataTexture | null = null;
function toonGradient() {
  if (!gradient) {
    gradient = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
    gradient.minFilter = gradient.magFilter = THREE.NearestFilter; gradient.needsUpdate = true;
  }
  return gradient;
}

function Mat({ color, glow, opacity }: { color: string; glow?: boolean; opacity?: number }) {
  if (glow) return <meshBasicMaterial color={color} toneMapped={false} />;
  return <meshToonMaterial color={color} gradientMap={toonGradient()} transparent={opacity != null} opacity={opacity ?? 1} />;
}
function PieceMesh({ p }: { p: Piece }) {
  return (
    <mesh position={p.pos} rotation={p.rot ?? [0, 0, 0]} castShadow>
      {p.shape === 'box' && <boxGeometry args={p.size as [number, number, number]} />}
      {p.shape === 'cyl' && <cylinderGeometry args={[p.size[0], p.size[1], p.size[2], 16]} />}
      {p.shape === 'ball' && <sphereGeometry args={[p.size[0], 16, 12]} />}
      <Mat color={p.color} glow={p.glow} opacity={p.opacity} />
    </mesh>
  );
}

export interface BlockHeroProps { id: HeroId; move?: Move; talking?: boolean; position?: [number, number, number]; rotationY?: number; scale?: number }

export function BlockHero({ id, move = 'idle', talking = false, position = [0, 0, 0], rotationY = 0, scale = 1 }: BlockHeroProps) {
  const h = HEROES[id], c = h.palette;
  const root = useRef<THREE.Group>(null), mouth = useRef<THREE.Mesh>(null);
  const parts = useRef<Partial<Record<PartId, THREE.Group | null>>>({});
  const of = (part: PartId) => h.pieces.filter((p) => p.part === part).map((p, i) => <PieceMesh key={part + i} p={p} />);
  const t0 = useMemo(() => performance.now(), [move]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(() => {
    const t = (performance.now() - t0) / 1000, level = talking ? speechLevel() : 0, P = pose(move, t, level);
    const g = parts.current;
    if (root.current) { root.current.position.set(position[0], position[1] + P.root.y + (h.hover ? 0.35 : 0), position[2]); root.current.rotation.y = rotationY + P.root.rotY; root.current.rotation.z = P.root.rotZ ?? 0; }
    g.armL?.rotation.set(P.armL[0], P.armL[1], P.armL[2]); g.armR?.rotation.set(P.armR[0], P.armR[1], P.armR[2]);
    g.legL?.rotation.set(P.legL[0], P.legL[1], P.legL[2]); g.legR?.rotation.set(P.legR[0], P.legR[1], P.legR[2]);
    g.head?.rotation.set(P.head[0], P.head[1], P.head[2]);
    if (mouth.current) mouth.current.scale.y = mouthScale(level);
  });

  const A = BODY.arm, Lg = BODY.leg, eye = h.face.eye, fz = BODY.faceZ;
  return (
    <group ref={root} position={position} scale={scale}>
      <group position={BODY.torso.pos} ref={(r) => { parts.current.torso = r; }}>
        <mesh castShadow><boxGeometry args={BODY.torso.size} /><Mat color={c.top} /></mesh>
        {of('torso')}
      </group>
      <group position={BODY.head.pos} ref={(r) => { parts.current.head = r; }}>
        <mesh castShadow><boxGeometry args={BODY.head.size} /><Mat color={c.skin} /></mesh>
        <mesh position={[0, 0.5, -0.05]}><boxGeometry args={[1.27, 0.18, 1.0]} /><Mat color={c.hair} /></mesh>
        {h.face.style === 'visor' && <mesh position={[0, 0.08, fz]}><boxGeometry args={[1.0, 0.26, 0.02]} /><Mat color="#16181f" /></mesh>}
        {h.face.style === 'screen' && <mesh position={[0, 0, fz]}><boxGeometry args={[1.05, 0.85, 0.02]} /><Mat color="#0b1020" /></mesh>}
        {h.face.style === 'glasses' && <mesh position={[0, 0.08, fz + 0.01]}><boxGeometry args={[1.05, 0.34, 0.02]} /><meshBasicMaterial color={NEON_GLASS} transparent opacity={0.35} /></mesh>}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * BODY.eyes.x, BODY.eyes.y, fz + 0.012]} scale={h.face.style === 'sleepy' ? [1, 0.3, 1] : [1, 1, 1]}>
            <boxGeometry args={BODY.eyes.size} /><Mat color={eye} glow={h.face.style === 'visor' || h.face.style === 'screen'} />
          </mesh>
        ))}
        <mesh ref={mouth} position={[BODY.mouth.pos[0], BODY.mouth.pos[1], fz + 0.012]}>
          <boxGeometry args={BODY.mouth.size} /><Mat color={h.face.style === 'screen' ? (h.face.glow ?? eye) : '#7a2a2a'} glow={h.face.style === 'screen'} />
        </mesh>
        {of('head')}
      </group>
      {(['armL', 'armR'] as const).map((part, i) => (
        <group key={part} position={[(i ? 1 : -1) * A.pivot[0], A.pivot[1], A.pivot[2]]} ref={(r) => { parts.current[part] = r; }}>
          <mesh position={A.sleeve.pos} castShadow><boxGeometry args={A.sleeve.size} /><Mat color={c.sleeve} /></mesh>
          <mesh position={A.hand.pos}><boxGeometry args={A.hand.size} /><Mat color={c.skin} /></mesh>
          {of(part)}
        </group>
      ))}
      {!h.hover && (['legL', 'legR'] as const).map((part, i) => (
        <group key={part} position={[(i ? 1 : -1) * Lg.pivot[0], Lg.pivot[1], Lg.pivot[2]]} ref={(r) => { parts.current[part] = r; }}>
          <mesh position={Lg.pants.pos} castShadow><boxGeometry args={Lg.pants.size} /><Mat color={c.pants} /></mesh>
          <mesh position={Lg.shoe.pos}><boxGeometry args={Lg.shoe.size} /><Mat color={c.shoes} /></mesh>
          {of(part)}
        </group>
      ))}
      {of('root')}
    </group>
  );
}
const NEON_GLASS = '#22e6ff';
