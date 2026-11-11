/**
 * InstancedMesh particle engine: one draw call for every spark on screen, a fixed pool (no
 * allocations during play), additive glow that the Bloom pass turns into light.
 *  - <ParticleEmitter> provides `burst()` and `shockwave()` through context (useParticles()).
 *  - <DustMotes> are ambient floating motes, also a single InstancedMesh.
 */
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { Vec3 } from '../../../types/game.types';

export interface BurstOptions { at: Vec3; count?: number; color?: string; speed?: number; life?: number; gravity?: number; size?: number }
export interface ShockOptions { at: Vec3; color?: string; radius?: number; duration?: number }
interface ParticleApi { burst(o: BurstOptions): void; shockwave(o: ShockOptions): void }

const Ctx = createContext<ParticleApi>({ burst: () => undefined, shockwave: () => undefined });
export const useParticles = (): ParticleApi => useContext(Ctx);

const RINGS = 4;

export function ParticleEmitter({ capacity = 600, children }: { capacity?: number; children?: ReactNode }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  // structure-of-arrays pool
  const pool = useMemo(() => ({
    pos: new Float32Array(capacity * 3), vel: new Float32Array(capacity * 3), life: new Float32Array(capacity), max: new Float32Array(capacity),
    size: new Float32Array(capacity), grav: new Float32Array(capacity), next: 0
  }), [capacity]);
  const ringState = useMemo(() => Array.from({ length: RINGS }, () => ({ t: 1, dur: 1, r: 3 })), []);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), p: new THREE.Vector3(), c: new THREE.Color(), c2: new THREE.Color() }), []);

  useEffect(() => {
    const m = mesh.current; if (!m) return;
    for (let i = 0; i < capacity; i++) { tmp.m.makeScale(0, 0, 0); m.setMatrixAt(i, tmp.m); m.setColorAt(i, tmp.c.set('#ffffff')); }
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [capacity, tmp]);

  const api = useMemo<ParticleApi>(() => ({
    burst: ({ at, count = 60, color = '#F5A623', speed = 4, life = 1.1, gravity = -3, size = 0.08 }) => {
      const m = mesh.current; if (!m) return;
      tmp.c.set(color);
      for (let k = 0; k < count; k++) {
        const i = pool.next; pool.next = (pool.next + 1) % capacity;
        const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u), sp = speed * (0.4 + Math.random() * 0.8);
        pool.pos.set(at, i * 3);
        pool.vel[i * 3] = r * Math.cos(th) * sp; pool.vel[i * 3 + 1] = u * sp + speed * 0.3; pool.vel[i * 3 + 2] = r * Math.sin(th) * sp;
        pool.life[i] = pool.max[i] = life * (0.6 + Math.random() * 0.6);
        pool.size[i] = size * (0.5 + Math.random()); pool.grav[i] = gravity;
        m.setColorAt(i, tmp.c2.copy(tmp.c).offsetHSL((Math.random() - 0.5) * 0.06, 0, (Math.random() - 0.3) * 0.2));
      }
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    },
    shockwave: ({ at, color = '#00E599', radius = 4, duration = 0.8 }) => {
      const i = ringState.findIndex((r) => r.t >= 1); const k = i < 0 ? 0 : i;
      const ring = rings.current[k]; if (!ring) return;
      ring.position.set(at[0], at[1], at[2]);
      (ring.material as THREE.MeshBasicMaterial).color.set(color);
      ringState[k] = { t: 0, dur: duration, r: radius };
    }
  }), [capacity, pool, ringState, tmp]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05), m = mesh.current; if (!m) return;
    let dirty = false;
    for (let i = 0; i < capacity; i++) {
      if (pool.life[i] <= 0) continue;
      dirty = true;
      pool.life[i] -= dt;
      const j = i * 3;
      pool.vel[j + 1] += pool.grav[i] * dt;
      pool.vel[j] *= 0.985; pool.vel[j + 2] *= 0.985;
      pool.pos[j] += pool.vel[j] * dt; pool.pos[j + 1] += pool.vel[j + 1] * dt; pool.pos[j + 2] += pool.vel[j + 2] * dt;
      const k = Math.max(0, pool.life[i] / pool.max[i]), s = pool.size[i] * (k < 0.3 ? k / 0.3 : 1);
      tmp.p.set(pool.pos[j], pool.pos[j + 1], pool.pos[j + 2]); tmp.s.setScalar(s);
      tmp.q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, pool.life[i] * 6);
      m.setMatrixAt(i, tmp.m.compose(tmp.p, tmp.q, tmp.s));
    }
    if (dirty) m.instanceMatrix.needsUpdate = true;
    ringState.forEach((r, k) => {
      const ring = rings.current[k]; if (!ring) return;
      if (r.t >= 1) { ring.visible = false; return; }
      r.t = Math.min(1, r.t + dt / r.dur);
      const e = 1 - Math.pow(1 - r.t, 3);
      ring.visible = true; ring.scale.setScalar(0.2 + e * r.r);
      (ring.material as THREE.MeshBasicMaterial).opacity = (1 - r.t) * 0.9;
    });
  });

  return (
    <Ctx.Provider value={api}>
      <instancedMesh ref={mesh} args={[undefined, undefined, capacity]} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial toneMapped={false} transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} />
      </instancedMesh>
      {Array.from({ length: RINGS }, (_, k) => (
        <mesh key={k} ref={(el) => { rings.current[k] = el; }} rotation-x={-Math.PI / 2} visible={false}>
          <ringGeometry args={[0.92, 1, 64]} />
          <meshBasicMaterial toneMapped={false} transparent blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {children}
    </Ctx.Provider>
  );
}

/** Ambient dust motes drifting in a volume — one InstancedMesh, no per-frame allocation. */
export function DustMotes({ count = 160, area = [18, 8, 18] as Vec3, color = '#F5A623' }: { count?: number; area?: Vec3; color?: string }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo(() => Float32Array.from({ length: count * 4 }, () => Math.random()), [count]);
  const m4 = useMemo(() => new THREE.Matrix4(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime, m = mesh.current; if (!m) return;
    for (let i = 0; i < count; i++) {
      const a = seeds[i * 4], b = seeds[i * 4 + 1], c = seeds[i * 4 + 2], d = seeds[i * 4 + 3];
      const x = (a - 0.5) * area[0] + Math.sin(t * 0.2 + d * 9) * 0.6;
      const y = ((b + t * 0.015 * (0.5 + d)) % 1) * area[1];
      const z = (c - 0.5) * area[2] + Math.cos(t * 0.17 + a * 9) * 0.6;
      const s = 0.025 + d * 0.035;
      m4.makeScale(s, s, s).setPosition(x, y, z);
      m.setMatrixAt(i, m4);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} />
    </instancedMesh>
  );
}
