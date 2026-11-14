// Built separately into dist/assets/physics.js (scripts/build-physics.mjs): the real Rapier for src/lib/rapierLazy.ts.
import * as RAPIER from '@dimforge/rapier3d-compat';
(window as unknown as { RAPIER: typeof RAPIER }).RAPIER = RAPIER;
