/**
 * «Neo-Steppe Solarpunk» diorama: an obsidian-to-violet dusk sky with a turquoise horizon and a solar
 * gold sun, procedural stars, a low-poly steppe of rolling hills with glowing jade survey lines, and a
 * floating rock island for the game's centrepiece. Everything is procedural — no textures, no HDR files
 * (drei's Environment presets download HDRs from a CDN, which an offline APK cannot do).
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { Environment, Lightformer, Stars } from '@react-three/drei';
import type { Quality } from '../../../types/game.types';

const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const skyFragment = /* glsl */ `
  uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHorizon; uniform vec3 uSun; uniform vec3 uSunDir;
  varying vec3 vDir;
  void main() {
    float h = clamp(vDir.y, -1.0, 1.0);
    vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.28, h));
    col = mix(col, uTop, smoothstep(0.25, 0.85, h));
    col = mix(col, uHorizon * 0.35, smoothstep(0.0, -0.25, h));
    float sun = max(dot(normalize(vDir), normalize(uSunDir)), 0.0);
    col += uSun * (pow(sun, 420.0) * 6.0 + pow(sun, 18.0) * 0.55);
    gl_FragColor = vec4(col, 1.0);
  }
`;

/** Rolling low-poly hills; flat shading gives the faceted «steppe» look. */
function useSteppe(segments: number): THREE.BufferGeometry {
  return useMemo(() => {
    const g = new THREE.RingGeometry(9, 70, segments, 10).toNonIndexed();
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), r = Math.hypot(x, y);
      const n = Math.sin(x * 0.18) * Math.cos(y * 0.15) * 1.6 + Math.sin(x * 0.05 + y * 0.07) * 3.2;
      p.setZ(i, Math.max(0, n * Math.min(1, (r - 9) / 14)));
    }
    g.computeVertexNormals();
    return g;
  }, [segments]);
}

export function SkyDiorama({ quality, sunDir = [-0.6, 0.18, -1] }: { quality: Quality; sunDir?: [number, number, number] }) {
  const uniforms = useMemo(() => ({
    uTop: { value: new THREE.Color('#0B0F19') }, uMid: { value: new THREE.Color('#2A1450') }, uHorizon: { value: new THREE.Color('#00AFCA') },
    uSun: { value: new THREE.Color('#F5A623') }, uSunDir: { value: new THREE.Vector3(...sunDir).normalize() }
  }), [sunDir]);
  const steppe = useSteppe(quality === 'low' ? 36 : 72);
  const sun = new THREE.Vector3(...sunDir).normalize().multiplyScalar(40);

  return (
    <>
      <mesh scale={150} renderOrder={-1}>
        <sphereGeometry args={[1, 32, 16]} />
        <shaderMaterial vertexShader={skyVertex} fragmentShader={skyFragment} uniforms={uniforms} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <Stars radius={90} depth={30} count={quality === 'low' ? 800 : 2500} factor={3} saturation={0.4} fade speed={0.4} />
      <fog attach="fog" args={['#120B2A', 18, 85]} />

      <hemisphereLight args={['#7DE8FF', '#2A1450', 0.55]} />
      <directionalLight position={[sun.x, sun.y + 8, sun.z]} intensity={1.6} color="#FFD08A"
        castShadow={quality !== 'low'} shadow-mapSize={quality === 'high' ? [2048, 2048] : [1024, 1024]}
        shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-bias={-0.0004} />
      <pointLight position={[0, 6, 4]} intensity={18} distance={20} color="#00AFCA" />

      {/* steppe with jade survey lines */}
      <mesh geometry={steppe} rotation-x={-Math.PI / 2} position-y={-3.2} receiveShadow>
        <meshStandardMaterial color="#1A2238" roughness={0.9} metalness={0.05} flatShading />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={-3.15}>
        <ringGeometry args={[9, 70, 72, 10]} />
        <meshBasicMaterial color="#00E599" wireframe transparent opacity={0.07} toneMapped={false} />
      </mesh>

      {/* floating island under the centrepiece */}
      <group position={[0, -1.25, 0]}>
        <mesh receiveShadow castShadow>
          <cylinderGeometry args={[4.2, 4.6, 0.6, 9]} />
          <meshStandardMaterial color="#232B45" roughness={0.75} flatShading />
        </mesh>
        <mesh position-y={-1.6} rotation-x={Math.PI}>
          <coneGeometry args={[4.4, 3.2, 9]} />
          <meshStandardMaterial color="#141A2E" roughness={1} flatShading />
        </mesh>
        <mesh position-y={0.31} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[3.7, 3.85, 64]} />
          <meshBasicMaterial color="#F5A623" toneMapped={false} />
        </mesh>
      </group>

      {/* procedural studio reflections for glass — computed once, no files */}
      {quality !== 'low' && (
        <Environment resolution={128} frames={1}>
          <Lightformer form="ring" intensity={4} color="#00AFCA" scale={8} position={[0, 6, -8]} />
          <Lightformer form="rect" intensity={3} color="#F5A623" scale={[12, 2, 1]} position={[-8, 2, 4]} rotation-y={Math.PI / 2} />
          <Lightformer form="rect" intensity={2} color="#7928CA" scale={[12, 2, 1]} position={[8, 3, 2]} rotation-y={-Math.PI / 2} />
          <Lightformer form="circle" intensity={2} color="#00E599" scale={4} position={[0, -4, 6]} />
        </Environment>
      )}
    </>
  );
}
