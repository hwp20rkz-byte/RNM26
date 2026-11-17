/**
 * StudioCanvas — the one R3F canvas every game renders into.
 *  - Quality tiers (low / medium / high): «auto» starts from a device heuristic and is then steered by
 *    drei's PerformanceMonitor from the real frame rate; the player can pin a tier in the HUD.
 *  - Post-processing (Bloom with mip-map blur, subtle chromatic aberration, vignette, AgX tone mapping)
 *    on medium/high; low renders straight with ACES tone mapping and no extra passes.
 *  - Pixel ratio clamped to min(devicePixelRatio, 2) (1.5 on medium), shadows only where affordable.
 *  - Responsive FOV: the scene's design width always fits, from a 19.5:9 phone in portrait to 21:9.
 *  - Spring-physics camera rig with trauma-based screen shake (off with prefers-reduced-motion).
 *  - The Web Audio listener follows the camera for positional sound.
 */
import { Component, createContext, Suspense, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { Bloom, ChromaticAberration, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import type { Quality, Vec3 } from '../../../types/game.types';
import { useGameStore } from '../../../store/useGameStore';
import { prefersReducedMotion, useFxStore } from '../../../store/useFxStore';
import { soundEngine } from '../../../utils/soundEngine';

const QualityCtx = createContext<Quality>('medium');
/** Current graphics tier for components inside the canvas. */
export const useQuality = (): Quality => useContext(QualityCtx);

/** First guess before any frame was measured: cores and memory are a decent proxy on Android. */
export function guessQuality(): Quality {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency || 4, mem = nav.deviceMemory || 4;
  const mobile = /Android|iPhone|iPad|Mobile/i.test(nav.userAgent);
  if (cores <= 4 || mem <= 2) return 'low';
  return mobile ? 'medium' : 'high';
}

export function hasWebGL(): boolean {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** Fits a scene of `designAspect` (width/height) into any viewport by widening the vertical FOV. */
function ResponsiveCamera({ baseFov, designAspect, uiShift }: { baseFov: number; designAspect: number; uiShift: { portrait: number; landscape: number } }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera, aspect = size.width / Math.max(1, size.height);
    const half = THREE.MathUtils.degToRad(baseFov / 2);
    const fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(half) * Math.max(1, designAspect / aspect)));
    cam.fov = Math.min(78, fov); cam.aspect = aspect;
    // lift the scene above the bottom UI panel: shift the projection window, not the camera
    const shift = aspect > 1 ? uiShift.landscape : uiShift.portrait;
    if (shift) cam.setViewOffset(size.width, size.height, 0, Math.round(size.height * shift), size.width, size.height); else cam.clearViewOffset();
    cam.updateProjectionMatrix();
  }, [camera, size, baseFov, designAspect, uiShift.portrait, uiShift.landscape]);
  return null;
}

/** Critically damped spring towards the focus target + trauma shake (Perlin-ish sum of sines). */
function CameraRig() {
  const vel = useRef(new THREE.Vector3()), look = useRef(new THREE.Vector3(0, 2, 0)), lookVel = useRef(new THREE.Vector3());
  const tmp = useMemo(() => ({ target: new THREE.Vector3(), lookT: new THREE.Vector3(), f: new THREE.Vector3() }), []);
  const reduced = useMemo(prefersReducedMotion, []);
  const lastListener = useRef(0);
  useFrame(({ camera, clock }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05), fx = useFxStore.getState();
    const k = 26, c = 2 * Math.sqrt(k);
    tmp.target.set(...fx.camTarget); tmp.lookT.set(...fx.lookTarget);
    // spring: a = -k(x - target) - c v
    vel.current.addScaledVector(tmp.f.subVectors(camera.position, tmp.target), -k * dt).multiplyScalar(Math.max(0, 1 - c * dt));
    camera.position.addScaledVector(vel.current, dt);
    lookVel.current.addScaledVector(tmp.f.subVectors(look.current, tmp.lookT), -k * dt).multiplyScalar(Math.max(0, 1 - c * dt));
    look.current.addScaledVector(lookVel.current, dt);
    camera.lookAt(look.current);
    if (!reduced && fx.trauma > 0) {
      const t = clock.elapsedTime, s = fx.trauma * fx.trauma;
      camera.rotation.z += Math.sin(t * 47.3) * 0.04 * s;
      camera.position.x += (Math.sin(t * 71.1) + Math.sin(t * 23.7)) * 0.08 * s;
      camera.position.y += (Math.sin(t * 59.9) + Math.sin(t * 31.3)) * 0.08 * s;
    }
    fx.decay(dt);
    if (clock.elapsedTime - lastListener.current > 0.1) {
      lastListener.current = clock.elapsedTime;
      camera.getWorldDirection(tmp.f);
      soundEngine.setListener([camera.position.x, camera.position.y, camera.position.z], [tmp.f.x, tmp.f.y, tmp.f.z]);
    }
  });
  return null;
}

class CanvasBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } { return { failed: true }; }
  render(): ReactNode { return this.state.failed ? this.props.fallback : this.props.children; }
}

export interface StudioCanvasProps {
  children: ReactNode;
  /** Shown instead of the canvas when WebGL is missing or crashes (the DOM controls keep the game playable). */
  fallback?: ReactNode;
  camera?: { position: Vec3; look: Vec3 };
  baseFov?: number;
  designAspect?: number;
  /** Background colour behind the sky dome (also visible while loading). */
  background?: string;
  /** Fraction of the viewport height to lift the scene above a bottom UI panel. */
  uiShift?: { portrait: number; landscape: number };
}

export function StudioCanvas({ children, fallback = null, camera = { position: [0, 3.2, 11], look: [0, 2.2, 0] }, baseFov = 42, designAspect = 1.1, background = '#0B0F19', uiShift = { portrait: 0, landscape: 0 } }: StudioCanvasProps) {
  const pinned = useGameStore((s) => s.quality);
  const [auto, setAuto] = useState<Quality>(guessQuality);
  const quality: Quality = pinned === 'auto' ? auto : pinned;
  const post = quality !== 'low';
  const [webgl] = useState(hasWebGL);

  const camKey = camera.position.join() + '|' + camera.look.join();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by value, not by array identity
  useEffect(() => { useFxStore.getState().focus(camera.position, camera.look); }, [camKey]);

  if (!webgl) return <>{fallback}</>;
  const dprMax = Math.min(window.devicePixelRatio || 1, quality === 'high' ? 2 : quality === 'medium' ? 1.5 : 1);

  return (
    <CanvasBoundary fallback={fallback}>
      <QualityCtx.Provider value={quality}>
        <Canvas
          className="!absolute inset-0"
          shadows={quality === 'high' ? 'soft' : quality === 'medium'}
          dpr={[1, dprMax]}
          camera={{ position: camera.position, fov: baseFov, near: 0.1, far: 400 }}
          gl={{ antialias: !post, powerPreference: 'high-performance', stencil: false, alpha: false }}
          onCreated={({ gl }) => {
            gl.setClearColor(background);
            gl.toneMapping = post ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.05;
            gl.outputColorSpace = THREE.SRGBColorSpace;
          }}
        >
          <PerformanceMonitor
            bounds={() => [42, 58]}
            flipflops={3}
            onDecline={() => setAuto((q) => (q === 'high' ? 'medium' : 'low'))}
            onIncline={() => setAuto((q) => (q === 'low' ? 'medium' : 'high'))}
            onFallback={() => setAuto('low')}
          />
          <ResponsiveCamera baseFov={baseFov} designAspect={designAspect} uiShift={uiShift} />
          <CameraRig />
          <Suspense fallback={null}>{children}</Suspense>
          {post && (
            <EffectComposer multisampling={quality === 'high' ? 4 : 0} enableNormalPass={false}>
              <Bloom mipmapBlur intensity={quality === 'high' ? 1.25 : 0.9} luminanceThreshold={0.82} luminanceSmoothing={0.25} radius={0.72} />
              <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(quality === 'high' ? 0.0007 : 0, quality === 'high' ? 0.0005 : 0)} radialModulation modulationOffset={0.35} />
              <Vignette eskil={false} offset={0.28} darkness={0.72} />
              <ToneMapping mode={ToneMappingMode.AGX} />
            </EffectComposer>
          )}
        </Canvas>
      </QualityCtx.Provider>
    </CanvasBoundary>
  );
}
