// Kazakhstan outline for the «Қазақстан картасы» topic → web/kz-map.js (window.QKZMAP / module.exports).
// Source: Natural Earth 1:50m admin-0 (public domain) via the npm package world-atlas@2.0.2 (TopoJSON), decoded with
// topojson-client@3.1.0. Neither ships in the app: only the projected, simplified path does (~6 KB).
//   npm pack world-atlas@2.0.2 topojson-client@3.1.0  (unpack both into <dir>/world-atlas-2.0.2, <dir>/topojson-client-3.1.0)
//   + ne_50m_lakes.geojson (Natural Earth, raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/) in <dir>
//   node tools/build-kzmap.mjs <dir>
// Projection: equirectangular around 48° N (x = lon·cos 48°, y = −lat), fitted into a 600 × 340 viewBox.
// The same `project(lon, lat)` places the cities, so dots and outline always agree.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..'), DIR = process.argv[2];
if (!DIR) { console.error('usage: node tools/build-kzmap.mjs <dir with world-atlas-2.0.2 and topojson-client-3.1.0>'); process.exit(1); }
const topo = JSON.parse(readFileSync(join(DIR, 'world-atlas-2.0.2/package/countries-50m.json'), 'utf8'));
const { feature } = await import(pathToFileURL(join(DIR, 'topojson-client-3.1.0/package/dist/topojson-client.js')).href).then((m) => m.default ?? m);
const kz = feature(topo, topo.objects.countries).features.find((f) => f.id === '398');   // ISO 3166 numeric: Kazakhstan
if (!kz) throw new Error('Kazakhstan (398) not found');
const K = Math.cos((48 * Math.PI) / 180), W = 600, H = 340, PAD = 12;
const rings = (kz.geometry.type === 'Polygon' ? [kz.geometry.coordinates] : kz.geometry.coordinates).map((p) => p[0]);
const all = rings.flat(), xs = all.map(([lon]) => lon * K), ys = all.map(([, lat]) => -lat);
const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
const s = Math.min((W - 2 * PAD) / (maxX - minX), (H - 2 * PAD) / (maxY - minY));
const ox = PAD + ((W - 2 * PAD) - (maxX - minX) * s) / 2, oy = PAD + ((H - 2 * PAD) - (maxY - minY) * s) / 2;
const project = (lon, lat) => [ox + (lon * K - minX) * s, oy + (-lat - minY) * s];
// simplify: drop points closer than 1.2 units to the last kept one (the map is shown ~350 px wide)
const path = rings.filter((r) => r.length > 20).map((r) => {
  const pts = []; for (const [lon, lat] of r) { const p = project(lon, lat), q = pts[pts.length - 1]; if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1.2) pts.push(p); }
  return 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z';
}).join('');
// Water (21.11): the Caspian is the hole in world-atlas land-50m; the lakes come from Natural Earth 1:50m lakes
// (public domain; ne_50m_lakes.geojson from github.com/nvkelso/natural-earth-vector, put next to the packages).
// Only the big water bodies a 4th-grader learns; each gets a centre for the ring that marks it in a task.
const WATER = [
  { id: 'Каспий теңізі', land: true }, { id: 'Арал теңізі', ne: ['North Aral Sea', 'South Aral Sea'] },
  { id: 'Балқаш көлі', ne: ['Lake Balkhash'] }, { id: 'Зайсан көлі', ne: ['Lake Zaysan'] },
  { id: 'Алакөл', ne: ['Alaköl'] }, { id: 'Теңіз көлі', ne: ['Tengiz Köli'] }
];
const land = JSON.parse(readFileSync(join(DIR, 'world-atlas-2.0.2/package/land-50m.json'), 'utf8'));
const lakes = JSON.parse(readFileSync(join(DIR, 'ne_50m_lakes.geojson'), 'utf8'));
const outer = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates).map((p) => p[0]);
const caspian = feature(land, land.objects.land).features.flatMap((f) => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates))
  .flatMap((p) => p.slice(1)).filter((r) => r.some(([lon, lat]) => lon < 48 && lat > 45) && r.some(([lon, lat]) => lon > 53 && lat < 40));
if (caspian.length !== 1) throw new Error('Caspian hole not found: ' + caspian.length);
const ringPath = (r, gap) => { const pts = []; for (const [lon, lat] of r) { const p = project(lon, lat), q = pts[pts.length - 1]; if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > gap) pts.push(p); }
  return 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z'; };
const water = WATER.map((w) => {
  const rs = w.land ? caspian : w.ne.flatMap((n) => { const f = lakes.features.find((x) => x.properties.name === n); if (!f) throw new Error('lake not found: ' + n); return outer(f.geometry); });
  const pts = rs.flat().map(([lon, lat]) => project(lon, lat)), xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const c = w.land ? project(51.5, 45.2) : [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];   // the Caspian's ring sits on its Kazakh (northern) part
  return { id: w.id, path: rs.map((r) => ringPath(r, 0.8)).join(''), c: [+c[0].toFixed(1), +c[1].toFixed(1)] };
});
const params = { K, minX, minY, s, ox, oy, W, H };
const out = `/* Kazakhstan outline — generated by tools/build-kzmap.mjs from Natural Earth 1:50m (public domain). Do not edit. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.QKZMAP = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var P = ${JSON.stringify(params)};
  function project(lon, lat) { return [P.ox + (lon * P.K - P.minX) * P.s, P.oy + (-lat - P.minY) * P.s]; }
  return { W: P.W, H: P.H, path: ${JSON.stringify(path)}, water: ${JSON.stringify(water)}, project: project };
});
`;
writeFileSync(join(ROOT, 'web/kz-map.js'), out);
console.log('web/kz-map.js', (out.length / 1024).toFixed(1) + ' KB,', rings.length, 'rings,', water.length, 'water bodies, viewBox', W, H);
