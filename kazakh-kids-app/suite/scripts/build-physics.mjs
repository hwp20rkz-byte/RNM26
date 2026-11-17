// The Rapier physics engine as its own classic script (assets/physics.js), loaded on demand by src/lib/rapierLazy.ts.
import { build } from 'esbuild';
await build({ entryPoints: [new URL('../src/physics-entry.ts', import.meta.url).pathname], bundle: true, format: 'iife', minify: true, target: 'es2019',
  outfile: new URL('../dist/assets/physics.js', import.meta.url).pathname, legalComments: 'none', logLevel: 'warning' });
console.log('physics.js built');
