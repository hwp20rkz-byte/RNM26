/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * One config for three targets:
 *  - `vite`        dev server with HMR;
 *  - `vite build`  static site (relative paths) that also runs from file:///android_asset/suite/ in the APK:
 *                  a single IIFE bundle, because Android WebView refuses ES-module scripts on file://;
 *  - `vitest`      pure-logic tests (grammar engine, game reducers, stores).
 */
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  // Rapier (2 MB with its inlined WASM) is loaded only by the physics game: see src/lib/rapierLazy.ts
  resolve: { alias: { '@dimforge/rapier3d-compat': decodeURIComponent(new URL('./src/lib/rapierLazy.ts', import.meta.url).pathname) } },
  server: { fs: { allow: ['..'] } },
  build: {
    outDir: 'dist',
    target: 'es2019',
    sourcemap: false,
    chunkSizeWarningLimit: 4000,
    assetsInlineLimit: 0,
    cssCodeSplit: false,
    rollupOptions: {
      output: { format: 'iife', inlineDynamicImports: true, entryFileNames: 'assets/app.js', assetFileNames: (a) => (a.names?.[0]?.endsWith('.css') ? 'assets/app.css' : 'assets/[name][extname]') }
    }
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] }
});
