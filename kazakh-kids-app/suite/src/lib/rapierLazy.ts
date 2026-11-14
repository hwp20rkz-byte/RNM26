/**
 * Lazy Rapier. `@dimforge/rapier3d-compat` inlines its WASM as base64 — 2.0 MB of the 3.64 MB hall bundle — yet
 * only «Септік тотемі» uses physics. vite.config aliases the package to this module: the main bundle keeps only
 * these bindings, and init() adds the real engine from assets/physics.js (built by scripts/build-physics.mjs) the
 * first time <Physics> mounts. A classic <script> works in Android WebView on file://, where ES modules do not.
 * The names below are exactly what @react-three/rapier 2.x imports statically or reads from the init() result.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export let World: any, JointData: any, Vector3: any, Quaternion: any, ActiveEvents: any, ColliderDesc: any,
  EventQueue: any, RigidBodyDesc: any, CoefficientCombineRule: any, Collider: any, RigidBody: any;

let loading: Promise<void> | null = null;
function loadScript(): Promise<any> {
  const w = window as unknown as { RAPIER?: any };
  if (w.RAPIER) return Promise.resolve(w.RAPIER);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = new URL('assets/physics.js', document.baseURI).href;
    s.onload = () => (w.RAPIER ? resolve(w.RAPIER) : reject(new Error('physics.js loaded without RAPIER')));
    s.onerror = () => reject(new Error('physics.js failed to load'));
    document.head.appendChild(s);
  });
}
export function init(): Promise<void> {
  loading ??= loadScript().then(async (R) => {
    await R.init();
    ({ World, JointData, Vector3, Quaternion, ActiveEvents, ColliderDesc, EventQueue, RigidBodyDesc, CoefficientCombineRule, Collider, RigidBody } = R);
  });
  return loading;
}
/** For the test of the alias: the real engine is not in the main bundle until init(). */
export const isLoaded = (): boolean => !!World;
