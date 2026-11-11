// Performance budget gate (CI): the suite must stay small enough for a phone on 3G and inside the APK.
// Raw JS includes the Rapier WASM (≈1.4 MB, base64-inlined so it works offline from file://).
import { readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const BUDGET = { jsRawMB: 4.2, jsGzipMB: 1.45, cssKB: 60 };
const js = readFileSync(new URL('../dist/assets/app.js', import.meta.url));
const cssBytes = statSync(new URL('../dist/assets/app.css', import.meta.url)).size;
const raw = js.length / 1048576, gz = gzipSync(js, { level: 9 }).length / 1048576, css = cssBytes / 1024;
const rows = [['JS raw', raw.toFixed(2) + ' MB', BUDGET.jsRawMB + ' MB', raw <= BUDGET.jsRawMB], ['JS gzip', gz.toFixed(2) + ' MB', BUDGET.jsGzipMB + ' MB', gz <= BUDGET.jsGzipMB], ['CSS', css.toFixed(1) + ' KB', BUDGET.cssKB + ' KB', css <= BUDGET.cssKB]];
rows.forEach(([n, v, b, ok]) => console.log((ok ? 'PASS ' : 'FAIL ') + n.padEnd(8) + v.padStart(10) + '  budget ' + b));
if (rows.some((r) => !r[3])) process.exit(1);
