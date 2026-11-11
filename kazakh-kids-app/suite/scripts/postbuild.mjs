// Makes dist/ runnable from file:// (the APK serves it from file:///android_asset/suite/):
// Android WebView refuses <script type="module"> on file:// origins, so the IIFE bundle is loaded
// as a classic deferred script. Also writes a build manifest for the size budget and the APK.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
let html = readFileSync(join(dist, 'index.html'), 'utf8');
html = html.replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/, '<script defer src="$1"></script>')
  .replace(/<link rel="stylesheet" crossorigin href=/g, '<link rel="stylesheet" href=');
if (/type="module"/.test(html)) { console.error('postbuild: module script left in index.html'); process.exit(1); }
writeFileSync(join(dist, 'index.html'), html);

const files = readdirSync(join(dist, 'assets')).map((f) => ({ file: 'assets/' + f, bytes: statSync(join(dist, 'assets', f)).size }));
writeFileSync(join(dist, 'build-manifest.json'), JSON.stringify({ builtAt: new Date().toISOString(), files }, null, 1));
console.log('postbuild: classic script, ' + files.length + ' assets, ' + (files.reduce((a, f) => a + f.bytes, 0) / 1048576).toFixed(2) + ' MB');
