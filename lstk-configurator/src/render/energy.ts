import * as THREE from "three";
import type { Building } from "@/domain/buildings/generate";
import type { AutonomyResult } from "@/domain/energy/autonomy";
import type { Room } from "@/domain/layout/rooms";
import { box, cyl, mat } from "./kit";
import { MM } from "./profileGeometry";

/**
 * The energy plant in the scene: PV modules on the roof slope, light-tube
 * domes between the trusses, the heat-pump outdoor unit or the probe field,
 * the genset enclosure, the well caisson and the sewage plant hatches (kept
 * apart), a small wind turbine, EV chargers in front, battery cabinets in
 * the technical room. Sizes in mm; positions follow the plan.
 */

const PANEL = { w: 1134, h: 2278, t: 35, gap: 20 };

function roofY(b: Building, z: number): number {
  const { input } = b;
  const a = (input.roof.pitchDeg * Math.PI) / 180;
  const W = input.width;
  return input.roof.type === "mono" ? b.roofBase + input.roof.heelHeight + Math.tan(a) * z : b.roofBase + Math.tan(a) * Math.min(z, W - z);
}

function pvArray(g: THREE.Group, b: Building, pv: NonNullable<AutonomyResult["pv"]>) {
  if (!pv.count) return;
  const { input } = b;
  const a = (input.roof.pitchDeg * Math.PI) / 180;
  const L = input.length;
  const W = input.width;
  const o = input.roof.overhang;
  const front = pv.slope === "front";
  const cell = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.62, 0.45, 0.12), roughness: 0.18, metalness: 0.6 });
  cell.userData.ownsMaterial = true;
  const geo = new THREE.BoxGeometry(PANEL.w * MM, PANEL.t * MM, PANEL.h * MM);
  const frameGeo = new THREE.BoxGeometry((PANEL.w + 10) * MM, (PANEL.t - 6) * MM, (PANEL.h + 10) * MM);
  const mesh = new THREE.InstancedMesh(geo, cell, pv.count);
  const frame = new THREE.InstancedMesh(frameGeo, mat("hsl(210 6% 72%)", 0.3, 0.9), pv.count);
  mesh.userData.ownsGeometry = frame.userData.ownsGeometry = true;
  mesh.castShadow = frame.castShadow = true;
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), front ? -a : Math.PI + a);
  const cols = pv.cols;
  const x0 = L / 2 - (cols * (PANEL.w + PANEL.gap)) / 2 + PANEL.w / 2;
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < pv.count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    // Distance up the slope from the eaves edge to the panel centre
    const u = 400 + row * (PANEL.h + PANEL.gap) + PANEL.h / 2;
    const z = front ? -o + u * Math.cos(a) : W + o - u * Math.cos(a);
    const y = roofY(b, z) + 190;
    m4.compose(new THREE.Vector3((x0 + col * (PANEL.w + PANEL.gap)) * MM, y * MM, z * MM), q, new THREE.Vector3(1, 1, 1));
    mesh.setMatrixAt(i, m4);
    m4.compose(new THREE.Vector3((x0 + col * (PANEL.w + PANEL.gap)) * MM, (y - 4) * MM, z * MM), q, new THREE.Vector3(1, 1, 1));
    frame.setMatrixAt(i, m4);
  }
  mesh.name = "pv";
  g.add(frame, mesh);
}

function lightTubes(g: THREE.Group, b: Building, sky: NonNullable<AutonomyResult["skylights"]>, rooms: Room[]) {
  const trusses = b.trussPositions;
  const mids = trusses.slice(1).map((x, i) => (x + trusses[i]!) / 2);
  const dome = mat("hsl(200 30% 92%)", 0.05, 0.1);
  const collar = mat("hsl(210 6% 70%)", 0.35, 0.8);
  const diff = mat("hsl(45 30% 97%)", 0.4);
  for (const { key, count, z0, z1 } of sky.rooms) {
    const r = rooms.find((x) => x.key === key);
    if (!r) continue;
    const w = r.x1 - r.x0;
    const h = z1 - z0;
    const nx = Math.max(1, Math.round(Math.sqrt((count * w) / Math.max(1, h))));
    const nz = Math.max(1, Math.ceil(count / nx));
    let k = 0;
    for (let i = 0; i < nx && k < count; i++)
      for (let j = 0; j < nz && k < count; j++, k++) {
        const xr = r.x0 + ((i + 0.5) * w) / nx;
        // Between two trusses: the Ø530 shaft passes in the 559 mm clear gap
        const x = mids.length ? mids.reduce((p, m) => (Math.abs(m - xr) < Math.abs(p - xr) ? m : p)) : xr;
        const z = z0 + ((j + 0.5) * h) / nz;
        const y = roofY(b, z);
        const rad = sky.diameter / 2;
        cyl(g, x, y + 180, z, rad + 65, 120, collar);
        const d = new THREE.Mesh(new THREE.SphereGeometry((rad + 25) * MM, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), dome);
        d.position.set(x * MM, (y + 240) * MM, z * MM);
        d.userData.ownsGeometry = true;
        g.add(d);
        // Ceiling diffuser in the room
        cyl(g, x, b.levels[b.levels.length - 1]!.base + b.input.levels[b.input.levels.length - 1]!.height - 30, z, rad + 35, 20, diff);
      }
  }
}

function turbine(g: THREE.Group, x: number, z: number) {
  const steel = mat("hsl(210 6% 82%)", 0.35, 0.7);
  const t = new THREE.Group();
  cyl(t, 0, 9000, 0, 110, 18000, steel);
  box(t, -250, 18000, -500, 500, 420, 1100, steel);
  const hub = cyl(t, 0, 18210, -560, 160, 200, steel, "z");
  hub.castShadow = true;
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.7, 0.04), mat("hsl(0 0% 96%)", 0.4));
    blade.geometry.translate(0, 1.35, 0);
    blade.userData.ownsGeometry = true;
    blade.position.set(0, 18.21, -0.68);
    blade.rotation.z = (i * 2 * Math.PI) / 3 + 0.3;
    blade.castShadow = true;
    t.add(blade);
  }
  t.position.set(x * MM, 0, z * MM);
  g.add(t);
}

function charger(g: THREE.Group, x: number, z: number, dc: boolean) {
  const body = mat(dc ? "hsl(150 30% 30%)" : "hsl(0 0% 94%)", 0.4, 0.2);
  if (dc) box(g, x - 400, 0, z - 300, 800, 1900, 600, body);
  else box(g, x - 150, 0, z - 120, 300, 1400, 240, body);
  box(g, x - 120, dc ? 1300 : 1000, z - (dc ? 305 : 125), 240, 160, 5, mat("hsl(200 70% 45%)", 0.2, 0.3));
  // Parking bay marking
  box(g, x - 1250, 2, z - 5600, 2500, 4, 5000, mat(dc ? "hsl(150 50% 40%)" : "hsl(205 60% 45%)", 0.9));
}

export function createPlant(b: Building, x: AutonomyResult, rooms: Room[][]): THREE.Group {
  const g = new THREE.Group();
  g.name = "plant";
  const { length: L, width: W } = b.input;
  // Roof-mounted parts hide with the roof in the plan cut
  const roof = new THREE.Group();
  roof.userData.level = Number.MAX_SAFE_INTEGER;
  g.add(roof);
  if (x.pv) pvArray(roof, b, x.pv);
  if (x.skylights) lightTubes(roof, b, x.skylights, rooms[rooms.length - 1] ?? []);
  const grey = mat("hsl(210 5% 62%)", 0.5, 0.4);
  if (x.heatPump?.kind === "air") {
    // Outdoor units on a frame 400 mm off the ground, 1 m off the back wall
    const n = Math.ceil(x.heatPump.kw / 16);
    for (let i = 0; i < n; i++) {
      box(g, L - 2500 - i * 1500, 400, W + 900, 1300, 1400, 500, mat("hsl(0 0% 93%)", 0.45, 0.2));
      cyl(g, L - 1850 - i * 1500, 1100, W + 1410, 280, 20, mat("hsl(210 6% 30%)", 0.6), "z");
      box(g, L - 2500 - i * 1500, 0, W + 900, 1300, 400, 60, grey);
    }
  }
  if (x.heatPump?.kind === "ground") {
    // Probe heads in a 6 m grid behind the building, the collector chamber in front of them
    for (let i = 0; i < x.heatPump.probes; i++) cyl(g, 3000 + (i % 4) * 6000, 30, W + 6000 + Math.floor(i / 4) * 6000, 250, 60, grey);
    box(g, 600, 0, W + 2500, 1200, 300, 1200, mat("hsl(150 15% 35%)", 0.7));
  }
  if (x.genset) box(g, L + 2500, 0, W * 0.55, 3200, 1900, 1500, mat("hsl(150 18% 32%)", 0.55, 0.3));
  if (x.water) {
    // Well caisson behind the left end; the sewage plant is put at the other corner
    cyl(g, -6000, 150, W + 8000, 600, 300, mat("hsl(205 30% 40%)", 0.5));
    cyl(g, -6000, 400, W + 8000, 250, 200, grey);
  }
  if (x.septic) for (let i = 0; i < 2; i++) cyl(g, L + 6000 + i * 1600, 60, -8000, 400, 120, mat("hsl(110 15% 35%)", 0.7));
  if (x.wind) for (let i = 0; i < x.wind.turbines; i++) turbine(g, -14000 - i * 12000, W + 14000);
  if (x.ev) {
    const n = x.ev.ac + x.ev.dc;
    for (let i = 0; i < n; i++) charger(g, L - 2000 - i * 2800, -7000, i >= x.ev.ac);
  }
  // Battery and inverter cabinets in the technical room
  if (x.battery) {
    const tech = rooms.flat().find((r) => r.purpose === "technical") ?? rooms.flat()[0];
    if (tech) {
      const n = Math.max(1, Math.min(Math.ceil(x.battery.kwh / 30), Math.floor((tech.x1 - tech.x0 - 300) / 650)));
      for (let i = 0; i < n; i++) box(g, tech.x0 + 150 + i * 650, b.levels[0]!.base, tech.z1 - 750, 600, 1900, 600, mat("hsl(210 10% 88%)", 0.4, 0.2));
    }
  }
  g.userData.level = 0;
  return g;
}
