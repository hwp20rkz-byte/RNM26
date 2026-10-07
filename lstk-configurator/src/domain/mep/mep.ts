import type { Building } from "../buildings/generate";
import type { RoomPurpose } from "../buildings/types";
import type { Room } from "../layout/rooms";

/**
 * Electrical, plumbing and ventilation take-off from the room layout.
 * Rules follow common residential practice (ПУЭ РК, СП РК 4.04-106 and
 * 4.01-101 families): a preliminary estimate to size the panel, the cable and
 * pipe runs and the fans — the working design is an engineer's job.
 *
 * LSTK specifics: cables run through the studs' service holes, every passage
 * needs a plastic grommet (sharp steel edges); no sockets in steam rooms;
 * wet rooms on an RCD 30 mA; the frame itself is earthed.
 */

export type WaterFixture = "sink" | "wc" | "basin" | "shower" | "drain" | "drinker" | "heater";

interface RoomRule {
  /** Sockets per metre of clear perimeter; `min` per room */
  socketsPerM: number;
  socketsMin: number;
  /** Lighting points per m² */
  lightsPerM2: number;
  fixtures: WaterFixture[];
  /** Exhaust, m³/h: a fixed rate plus a rate per m² */
  ventFixed: number;
  ventPerM2: number;
  /** Dedicated circuits: kW */
  dedicated: number[];
  wet: boolean;
}

const R = (socketsPerM: number, socketsMin: number, lightsPerM2: number, fixtures: WaterFixture[], ventFixed: number, ventPerM2: number, dedicated: number[] = [], wet = false): RoomRule => ({
  socketsPerM,
  socketsMin,
  lightsPerM2,
  fixtures,
  ventFixed,
  ventPerM2,
  dedicated,
  wet,
});

export const ROOM_RULES: Record<RoomPurpose, RoomRule> = {
  living: R(1 / 4, 3, 1 / 10, [], 0, 3),
  bedroom: R(1 / 4, 3, 1 / 12, [], 0, 3),
  kitchen: R(1 / 2, 5, 1 / 6, ["sink"], 60, 0, [7, 2.5], false),
  bathroom: R(0, 1, 1 / 4, ["wc", "basin", "shower"], 50, 0, [], true),
  steam: R(0, 0, 1 / 6, [], 0, 10, [], true),
  washing: R(0, 0, 1 / 4, ["shower", "drain"], 50, 0, [], true),
  rest: R(1 / 4, 2, 1 / 10, [], 0, 3),
  hall: R(1 / 6, 1, 1 / 8, [], 0, 0),
  storage: R(0, 1, 1 / 10, [], 0, 1),
  technical: R(1 / 3, 2, 1 / 8, ["heater", "drain"], 30, 0, [2], true),
  garage: R(1 / 4, 3, 1 / 8, [], 0, 10),
  workshop: R(1 / 2, 4, 1 / 6, ["basin"], 0, 6, [5.5]),
  poultry: R(0, 1, 1 / 8, ["drinker"], 0, 0, [], true),
  open: R(0, 1, 1 / 8, [], 0, 0),
};

/** Fixture needs: hot, cold, drain */
const FIX: Record<WaterFixture, { hot: boolean; cold: boolean; drain: 0 | 50 | 110 }> = {
  sink: { hot: true, cold: true, drain: 50 },
  wc: { hot: false, cold: true, drain: 110 },
  basin: { hot: true, cold: true, drain: 50 },
  shower: { hot: true, cold: true, drain: 50 },
  drain: { hot: false, cold: false, drain: 50 },
  drinker: { hot: false, cold: true, drain: 0 },
  heater: { hot: true, cold: true, drain: 0 },
};

export interface MepPrices {
  socketPoint: number;
  lightPoint: number;
  cable15: number;
  cable25: number;
  cable6: number;
  panel: number;
  breaker: number;
  rcd: number;
  grommet: number;
  waterPoint: number;
  pipePerM: number;
  sewer50PerM: number;
  sewer110PerM: number;
  fan: number;
  ductPerM: number;
  heaterPerKw: number;
}

export const DEFAULT_MEP_PRICES: MepPrices = {
  socketPoint: 6500,
  lightPoint: 5500,
  cable15: 380,
  cable25: 560,
  cable6: 1400,
  panel: 65000,
  breaker: 3800,
  rcd: 18000,
  grommet: 60,
  waterPoint: 28000,
  pipePerM: 1100,
  sewer50PerM: 1500,
  sewer110PerM: 2600,
  fan: 28000,
  ductPerM: 3200,
  heaterPerKw: 22000,
};

export interface RoomMep {
  level: number;
  room: Room;
  sockets: number;
  lights: number;
  fixtures: WaterFixture[];
  ventM3h: number;
}

export interface Mep {
  rooms: RoomMep[];
  sockets: number;
  lights: number;
  circuits: number;
  rcds: number;
  cable15M: number;
  cable25M: number;
  cable6M: number;
  grommets: number;
  /** Installed load, kW (heating included) */
  installedKw: number;
  /** Simultaneous demand, kW — what to ask the grid for */
  demandKw: number;
  waterPoints: number;
  pipeM: number;
  sewer50M: number;
  sewer110M: number;
  ventM3h: number;
  fans: number;
  ductM: number;
  heatingKw: number;
  cost: { electrical: number; plumbing: number; ventilation: number; heating: number; total: number };
}

const manhattan = (a: { x: number; z: number }, b: { x: number; z: number }) => (Math.abs(a.x - b.x) + Math.abs(a.z - b.z)) / 1000;
const centre = (r: Room) => ({ x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2 });

/**
 * @param heatingKw electric heating to install (from the thermal design), 0 if none
 * @param birds birds housed — sizes the poultry ventilation
 */
export function mep(b: Building, rooms: Room[][], heatingKw: number, prices: MepPrices = DEFAULT_MEP_PRICES, birds = 0): Mep {
  const all: RoomMep[] = [];
  rooms.forEach((level, li) =>
    level.forEach((room) => {
      const rule = ROOM_RULES[room.purpose];
      const sockets = Math.max(rule.socketsMin, Math.ceil(room.perimeter * rule.socketsPerM));
      const lights = Math.max(1, Math.round(room.area * rule.lightsPerM2));
      let vent = rule.ventFixed + rule.ventPerM2 * room.area;
      if (room.purpose === "poultry") vent = Math.max(vent, 6 * birds); // summer rate
      all.push({ level: li, room, sockets, lights, fixtures: rule.fixtures, ventM3h: vent });
    }),
  );
  // Panel in the technical room or hall if there is one, else the first room
  const hub = all.find((r) => r.room.purpose === "technical") ?? all.find((r) => r.room.purpose === "hall") ?? all[0]!;
  const riser = all.find((r) => r.fixtures.length) ?? hub;
  const levelRise = (li: number) => (b.levels[li]?.base ?? 0) / 1000 - (b.levels[hub.level]?.base ?? 0) / 1000;

  let cable15 = 0;
  let cable25 = 0;
  let cable6 = 0;
  let pipe = 0;
  let sewer50 = 0;
  let sewer110 = 0;
  let duct = 0;
  let fans = 0;
  let waterPoints = 0;
  let dedicatedKw = 0;
  let dedicatedCircuits = 0;
  let wetRooms = 0;
  for (const r of all) {
    const run = manhattan(centre(hub.room), centre(r.room)) + Math.abs(levelRise(r.level)) + 3;
    cable15 += run + r.lights * 2.5;
    cable25 += r.sockets ? run + r.sockets * 3 : 0;
    for (const kw of ROOM_RULES[r.room.purpose].dedicated) {
      dedicatedKw += kw;
      dedicatedCircuits += 1;
      if (kw >= 5) cable6 += run + 3;
      else cable25 += run + 3;
    }
    if (ROOM_RULES[r.room.purpose].wet) wetRooms += 1;
    const toRiser = manhattan(centre(riser.room), centre(r.room)) + Math.abs((b.levels[r.level]?.base ?? 0) - (b.levels[riser.level]?.base ?? 0)) / 1000;
    for (const f of r.fixtures) {
      const spec = FIX[f];
      waterPoints += 1;
      pipe += ((spec.hot ? 1 : 0) + (spec.cold ? 1 : 0)) * (toRiser + 1.5);
      if (spec.drain === 50) sewer50 += toRiser + 1;
      if (spec.drain === 110) sewer110 += toRiser + 1;
    }
    if (r.ventM3h > 0 && (ROOM_RULES[r.room.purpose].ventFixed > 0 || r.room.purpose === "poultry" || r.room.purpose === "steam")) {
      fans += r.room.purpose === "poultry" ? Math.max(1, Math.ceil(r.ventM3h / 1200)) : 1;
      duct += 2 + (b.input.levels.length - r.level) * 3;
    }
  }
  const hasHot = all.some((r) => r.fixtures.some((f) => FIX[f].hot));
  if (hasHot && !all.some((r) => r.fixtures.includes("heater"))) {
    dedicatedKw += 2;
    dedicatedCircuits += 1;
    cable25 += 8;
  }
  const sockets = all.reduce((s, r) => s + r.sockets, 0);
  const lights = all.reduce((s, r) => s + r.lights, 0);
  const heatingCircuits = Math.ceil(heatingKw / 3);
  cable25 += heatingCircuits * 12;
  const circuits = Math.ceil(lights / 10) + Math.ceil(sockets / 8) + dedicatedCircuits + heatingCircuits;
  const rcds = Math.max(1, wetRooms > 0 ? 2 : 1);
  // Horizontal runs cross a stud every 600 mm, about 60 % of a run is horizontal → ≈ 1 grommet per metre
  const grommets = Math.ceil(cable15 + cable25 + cable6);
  const installedKw = sockets * 0.2 + lights * 0.05 + dedicatedKw + heatingKw;
  const demandKw = Math.min(installedKw, 0.6 * (sockets * 0.2 + lights * 0.05) + 0.7 * dedicatedKw + heatingKw);
  const ventM3h = all.reduce((s, r) => s + r.ventM3h, 0);
  const p = prices;
  const electrical =
    sockets * p.socketPoint +
    lights * p.lightPoint +
    cable15 * p.cable15 +
    cable25 * p.cable25 +
    cable6 * p.cable6 +
    (all.length ? p.panel : 0) +
    circuits * p.breaker +
    rcds * p.rcd +
    grommets * p.grommet;
  const plumbing = waterPoints * p.waterPoint + pipe * p.pipePerM + sewer50 * p.sewer50PerM + sewer110 * p.sewer110PerM;
  const ventilation = fans * p.fan + duct * p.ductPerM;
  const heating = heatingKw * p.heaterPerKw;
  return {
    rooms: all,
    sockets,
    lights,
    circuits,
    rcds,
    cable15M: cable15,
    cable25M: cable25,
    cable6M: cable6,
    grommets,
    installedKw,
    demandKw,
    waterPoints,
    pipeM: pipe,
    sewer50M: sewer50,
    sewer110M: sewer110,
    ventM3h,
    fans,
    ductM: duct,
    heatingKw,
    cost: { electrical, plumbing, ventilation, heating, total: electrical + plumbing + ventilation + heating },
  };
}
