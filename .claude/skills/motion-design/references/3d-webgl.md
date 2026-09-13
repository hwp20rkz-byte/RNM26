# 3D & WebGL

A 3D hero is a premium differentiator — but it's one memory-layer move, not a default. Apply the motion test and the flourish budget before reaching for it.

## Toolchain
| Tool | Role |
|---|---|
| Three.js | core engine, vanilla |
| React Three Fiber | Three as React components — default in React projects |
| Drei | 100+ R3F helpers (OrbitControls, Float, Stars, Text3D, ScrollControls) |
| Spline | GUI 3D editor, one-click React export — fast but heavier files; ONE hero scene max |
| Blender | author/optimize own .glb assets |

## Baseline R3F scene pattern
Canvas + camera position, ambient + directional light, mesh with standardMaterial (metalness ~0.4, roughness ~0.2), useFrame delta rotation, OrbitControls with zoom disabled. From here: swap geometry, add fog, dim point light.

## Real model loading
```jsx
const { scene } = useGLTF('/models/x.glb');
<Float speed={2} rotationIntensity={0.4} floatIntensity={1.2}>
  <primitive object={scene} scale={1.2} />
</Float>
// + useGLTF.preload('/models/x.glb')
```
Free .glb sources: Sketchfab, Poly Pizza, Quaternius, Kenney.nl.

## Camera-on-scroll (the move that sells)
Drei `ScrollControls pages={3} damping={0.2}` + a CameraRig using `useScroll()`: map `data.offset` to camera position, `lookAt(0,0,0)` each frame.

## Hard performance rules for 3D
- Compress GLB with gltf-transform / gltfpack; target <1MB, 10MB is unacceptable
- Shadows off unless they visibly matter — they're expensive
- `<Suspense>` with a height-reserving fallback (CLS)
- Lazy-load below-fold scenes; dynamic import `ssr:false` in Next
- Static poster fallback: reduced-motion users + `navigator.hardwareConcurrency < 4`
- The real test device is a mid-range Android: stutters there = broken
- Gate: Lighthouse mobile ≥85 with the scene live (or fallback shown)
