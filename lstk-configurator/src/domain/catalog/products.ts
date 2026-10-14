import type { BuildingInput, HeatingMode, Level, Partition, RoomPurpose, SideConfig, SideType, WallSide } from "../buildings/types";
import type { Opening } from "../walls/types";
import { cellAt, interior } from "../layout/rooms";

/**
 * The product library: typical buildings as editable starting points. Sizes
 * follow common market practice in Kazakhstan; every parameter stays editable,
 * and "custom" starts from a neutral shell.
 */

export type Category = "leisure" | "living" | "bath" | "auto" | "farm" | "sport" | "custom";

export type PropKind = "table" | "benches" | "grill" | "bbq" | "stove" | "car" | "nests" | "perches" | "run" | "workbench" | "stair" | "kitchen" | "sport";

export interface Product {
  id: string;
  category: Category;
  /** Name/description keys live in the i18n dictionary under `product.<id>` */
  props: PropKind[];
  /** Sized by a capacity: birds for coops, cars for carports/garages */
  capacity?: { kind: "birds" | "cars" | "people"; default: number };
  input: () => BuildingInput;
}

const P = "C89x41x11x0.95";
let n = 0;
const id = (p: string) => `${p}${++n}`;

const win = (x: number, width = 1200, height = 1400, sill = 900): Opening => ({ id: id("w"), kind: "window", x, width, height, sill });
const door = (x: number, width = 900, height = 2100): Opening => ({ id: id("d"), kind: "door", x, width, height, sill: 0 });
const gate = (x: number, width: number, height: number): Opening => ({ id: id("g"), kind: "gate", x, width, height, sill: 0 });

const side = (type: SideType = "wall", openings: Opening[] = []): SideConfig => ({ type, openings });

function level(height: number, sides: Partial<Record<WallSide, SideConfig>> = {}, partitions: Partition[] = [], rooms: Record<string, RoomPurpose> = {}): Level {
  return { height, sides: { front: side(), back: side(), left: side(), right: side(), ...sides }, partitions, rooms };
}

const cross = (at: number, doors: Opening[] = []): Partition => ({ id: id("p"), axis: "x", at, doors });
const along = (at: number, doors: Opening[] = []): Partition => ({ id: id("p"), axis: "z", at, doors });

function building(o: Partial<BuildingInput> & Pick<BuildingInput, "productId" | "length" | "width" | "levels">, heating: HeatingMode): BuildingInput {
  return {
    roof: { type: "gable", pitchDeg: 25, overhang: 450, pattern: "howe", panels: 6, heelHeight: 200 },
    trussSpacing: 600,
    studSpacing: 600,
    postSpacing: 2400,
    parapet: 900,
    foundation: { type: "screw-piles", plinth: 400 },
    heating,
    profileId: P,
    ...o,
  };
}

/** A partition with an extent (see Partition.span) */
const crossSpan = (at: number, from: number, to: number, doors: Opening[] = []): Partition => ({ id: id("p"), axis: "x", at, doors, span: { from, to } });
const alongSpan = (at: number, from: number, to: number, doors: Opening[] = []): Partition => ({ id: id("p"), axis: "z", at, doors, span: { from, to } });

/** Room purposes by plan points (x, z, model mm) — keys follow the partition grid */
function roomsAt(length: number, width: number, partitions: Partition[], points: [number, number, RoomPurpose][]): Record<string, RoomPurpose> {
  const lv = { partitions } as Level;
  const inner = interior({ length, width }, 89);
  return Object.fromEntries(points.map(([x, z, p]) => [cellAt(lv, inner, x, z), p]));
}

/** Doors on the end walls, from a plan coordinate z: the left wall runs from z = W − d down, the right one from z = d up */
const D = 89;
const leftAt = (W: number, zc: number, w: number) => W - D - zc - w / 2;
const rightAt = (zc: number, w: number) => zc - D - w / 2;
/** Back wall runs from x = L down */
const backAt = (L: number, xc: number, w: number) => L - xc - w / 2;

/**
 * BJJ / grappling centre: 20 × 15 m mat hall (clear), 4.2 m to the trusses,
 * service block at the left end — lobby on the entrance side, men's and
 * women's changing rooms (40 lockers each) opening into the hall, a WC with
 * shower off each changing room, coaches' office, boiler room with its own
 * outside door, two stores. Two exits from the hall to the outside.
 */
function bjj(): BuildingInput {
  const L = 29650;
  const W = 15200;
  const z1 = W - D;
  const hall = 9500;
  const partitions = [
    cross(hall, [door(1100, 1000, 2100), door(4900, 1000, 2100), door(13400, 1000, 2100)]),
    alongSpan(3500, D, hall, [door(1700, 900, 2100), door(6400, 900, 2100)]),
    crossSpan(4700, 3500, z1, [door(7700, 800, 2100), door(10400, 800, 2100), door(13400, 900, 2100)]),
    alongSpan(6500, D, 4700),
    crossSpan(2400, 6500, 12000),
    alongSpan(9300, D, hall),
    alongSpan(12000, D, 4700),
  ];
  const rooms = roomsAt(L, W, partitions, [
    [4000, 1500, "lobby"],
    [2000, 5000, "office"],
    [1200, 8000, "technical"],
    [3500, 8000, "bathroom"],
    [1200, 10500, "storage"],
    [3500, 10500, "bathroom"],
    [2000, 13500, "storage"],
    [7000, 6000, "changing"],
    [7000, 12000, "changing"],
    [20000, 7500, "gym"],
  ]);
  // Hall: clerestory windows above the wall padding on both long walls
  const hallWins = [11500, 15500, 19500, 23500, 27500];
  return building(
    {
      productId: "bjj",
      length: L,
      width: W,
      levels: [
        level(
          4200,
          {
            front: side("wall", [win(800, 2000, 2000, 600), door(3400, 1500, 2400), win(5600, 2000, 2000, 600), ...hallWins.map((x) => win(x - 1200, 2400, 1500, 2100))]),
            back: side("wall", [door(backAt(L, 25500, 1200), 1200, 2100), ...hallWins.filter((x) => x !== 23500 && x !== 27500).map((x) => win(backAt(L, x, 2400), 2400, 1500, 2100))].sort((a, b) => a.x - b.x)),
            left: side("wall", [win(leftAt(W, 5000, 1200), 1200, 1400, 900), door(leftAt(W, 7900, 900), 900, 2100), door(leftAt(W, 10650, 900), 900, 2100)].sort((a, b) => a.x - b.x)),
            right: side("wall", [door(rightAt(7600, 1200), 1200, 2100), win(rightAt(3200, 2400), 2400, 1500, 2100), win(rightAt(12000, 2400), 2400, 1500, 2100)].sort((a, b) => a.x - b.x)),
          },
          partitions,
          rooms,
        ),
      ],
      roof: { type: "gable", pitchDeg: 20, overhang: 500, pattern: "howe", panels: 12, heelHeight: 200 },
      foundation: { type: "slab", plinth: 300 },
      profileId: "C89x41x11x1.2",
      // 4.2 m walls under a 15 m roof: studs at 400 (at 600 the stud check is 1.32)
      studSpacing: 400,
      trussSpacing: 600,
    },
    "permanent",
  );
}

interface Club {
  id: string;
  length: number;
  width: number;
  height: number;
  /** Service block depth along x, mm */
  service: number;
  /** Lobby / men's changing / women's changing split lines across the block (z) */
  lobby: number;
  men: number;
  panels: number;
  studSpacing: number;
  profileId?: string;
}

/**
 * A compact club: a service block at the left end — lobby with the entrance,
 * office/boiler room behind the left wall, men's and women's changing rooms
 * one after the other, each with a WC + shower cubicle and its own door into
 * the hall — and the hall over the rest of the length. A fire exit on the
 * right end and on the back wall.
 */
function club(c: Club): BuildingInput {
  const { length: L, width: W, service: S, lobby: zL, men: zM } = c;
  const z1 = W - D;
  const wc = 2000;
  const mid = (a: number, b: number) => (a + b) / 2;
  // Doors along an "x" partition are placed from the inner face of the front wall
  const dz = (zc: number, w: number) => zc - D - w / 2;
  const partitions = [
    cross(S, [door(dz(mid(D, zL) + 400, 1000), 1000, 2100), door(dz(mid(zL, zM) + 500, 1000), 1000, 2100), door(dz(mid(zM, z1) + 500, 1000), 1000, 2100)]),
    alongSpan(zL, D, S, [door(wc + 600, 900, 2100)]),
    alongSpan(zM, D, S),
    crossSpan(wc, D, zL, [door(zL - D - 1200, 800, 2100)]),
    crossSpan(wc, zL, zM, [door(zM - D - 1100, 800, 2100)]),
    crossSpan(wc, zM, z1, [door(z1 - D - 1100, 800, 2100)]),
  ];
  const rooms = roomsAt(L, W, partitions, [
    [wc / 2, mid(D, zL), "office"],
    [mid(wc, S), mid(D, zL), "lobby"],
    [wc / 2, mid(zL, zM), "bathroom"],
    [mid(wc, S), mid(zL, zM), "changing"],
    [wc / 2, mid(zM, z1), "bathroom"],
    [mid(wc, S), mid(zM, z1), "changing"],
    [mid(S, L), W / 2, "gym"],
  ]);
  // Hall windows high on both long walls, every 4 m
  const hallWins: number[] = [];
  for (let x = S + 2500; x + 1200 < L - 1500; x += 4000) hallWins.push(x);
  const high = Math.min(2100, c.height - 1900);
  const entrance = Math.max(wc + 400, mid(wc, S) - 750);
  return building(
    {
      productId: c.id,
      length: L,
      width: W,
      levels: [
        level(
          c.height,
          {
            front: side("wall", [door(entrance, 1500, 2400), ...hallWins.map((x) => win(x - 1200, 2400, 1500, high))]),
            back: side("wall", [door(backAt(L, L - 2500, 1200), 1200, 2100), ...hallWins.filter((x) => x < L - 5000).map((x) => win(backAt(L, x, 2400), 2400, 1500, high))].sort((a, b) => a.x - b.x)),
            left: side("wall", [door(leftAt(W, mid(D, zL), 900), 900, 2100)]),
            right: side("wall", [door(rightAt(W / 2, 1200), 1200, 2100)]),
          },
          partitions,
          rooms,
        ),
      ],
      roof: { type: "gable", pitchDeg: 20, overhang: 500, pattern: "howe", panels: c.panels, heelHeight: 200 },
      foundation: { type: "slab", plinth: 300 },
      profileId: c.profileId ?? "C89x41x11x1.2",
      studSpacing: c.studSpacing,
      trussSpacing: 600,
    },
    "permanent",
  );
}

/** Fitness club: 18 × 12 m gym (free weights, machines, cardio line) */
const fitness = () => club({ id: "fitness", length: 24000, width: 12000, height: 3600, service: 6000, lobby: 4000, men: 8000, panels: 8, studSpacing: 600 });
/** Yoga / stretching studio: 11 × 9 m hall, 3.3 m */
const yoga = () => club({ id: "yoga", length: 16000, width: 9000, height: 3300, service: 5000, lobby: 3000, men: 6000, panels: 6, studSpacing: 600 });
/** Table tennis: 20 × 12 m hall, four training courts 10 × 6 m (ITTF training), 4 m clear */
const tabletennis = () => club({ id: "tabletennis", length: 26150, width: 12200, height: 4000, service: 6000, lobby: 4000, men: 8000, panels: 8, studSpacing: 400 });
/**
 * Functional training box: 18 × 12 m hall, 4.2 m for rope climbs, wall balls
 * (3 m target) and a rig. Squash (5.64 m clear) is not offered: a 5.8 m wall
 * of C89 studs fails the stud check even at 300 mm centres.
 */
const crossfit = () => club({ id: "crossfit", length: 24000, width: 12000, height: 4200, service: 6000, lobby: 4000, men: 8000, panels: 8, studSpacing: 400 });

const SPORT: Product[] = [
  { id: "bjj", category: "sport", props: ["sport"], capacity: { kind: "people", default: 40 }, input: bjj },
  { id: "fitness", category: "sport", props: ["sport"], capacity: { kind: "people", default: 40 }, input: fitness },
  { id: "yoga", category: "sport", props: ["sport"], capacity: { kind: "people", default: 15 }, input: yoga },
  { id: "tabletennis", category: "sport", props: ["sport"], capacity: { kind: "people", default: 16 }, input: tabletennis },
  { id: "crossfit", category: "sport", props: ["sport"], capacity: { kind: "people", default: 20 }, input: crossfit },
];

export const PRODUCTS: Product[] = [
  // ── Leisure ──────────────────────────────────────────────
  {
    id: "gazebo",
    category: "leisure",
    props: ["table", "benches"],
    capacity: { kind: "people", default: 8 },
    input: () =>
      building(
        {
          productId: "gazebo",
          length: 4000,
          width: 3000,
          levels: [level(2300, { front: side("half", [door(1500, 1000)]), back: side("half"), left: side("half"), right: side("half") })],
          roof: { type: "gable", pitchDeg: 30, overhang: 400, pattern: "howe", panels: 4, heelHeight: 200 },
          postSpacing: 2000,
          foundation: { type: "screw-piles", plinth: 300 },
        },
        "none",
      ),
  },
  {
    id: "bbq",
    category: "leisure",
    props: ["bbq", "table", "benches"],
    capacity: { kind: "people", default: 10 },
    input: () =>
      building(
        {
          productId: "bbq",
          length: 6000,
          width: 3500,
          levels: [level(2400, { front: side("open"), back: side("wall", [win(3800, 1600, 700, 1300)]), left: side("wall"), right: side("half") })],
          roof: { type: "mono", pitchDeg: 8, overhang: 400, pattern: "pratt", panels: 4, heelHeight: 200 },
          postSpacing: 3000,
          foundation: { type: "slab", plinth: 150 },
        },
        "none",
      ),
  },
  {
    id: "mangal",
    category: "leisure",
    props: ["grill"],
    input: () =>
      building(
        {
          productId: "mangal",
          length: 3000,
          width: 2400,
          levels: [level(2300, { front: side("open"), back: side("wall"), left: side("half"), right: side("open") })],
          roof: { type: "mono", pitchDeg: 10, overhang: 300, pattern: "pratt", panels: 2, heelHeight: 200 },
          postSpacing: 3000,
          foundation: { type: "slab", plinth: 100 },
        },
        "none",
      ),
  },
  // ── Living ───────────────────────────────────────────────
  {
    id: "dacha",
    category: "living",
    props: ["kitchen"],
    input: () =>
      building(
        {
          productId: "dacha",
          length: 6000,
          width: 4000,
          levels: [
            level(2500, { front: side("wall", [door(800, 900, 2000), win(3200, 1200, 1300, 850)]), back: side("wall", [win(2300, 1200, 1300, 850)]), left: side("wall", [win(1300, 900, 1100, 1000)]) }, [cross(2600, [door(2200, 800, 2000)])], {
              "0-0": "kitchen",
              "1-0": "bedroom",
            }),
          ],
          roof: { type: "gable", pitchDeg: 30, overhang: 400, pattern: "howe", panels: 4, heelHeight: 200 },
        },
        "seasonal",
      ),
  },
  {
    id: "house",
    category: "living",
    props: ["kitchen"],
    input: () =>
      building(
        {
          productId: "house",
          length: 10000,
          width: 8000,
          levels: [
            level(
              2700,
              {
                front: side("wall", [win(900, 1500), door(3400, 1000, 2100), win(5600, 1500), win(7900, 1500)]),
                back: side("wall", [win(1200, 1200), win(4800, 900, 900, 1300), win(7600, 1500)]),
                left: side("wall", [win(2900, 1800)]),
                right: side("wall", [win(1500, 1200), win(4900, 1200)]),
              },
              [cross(3600, [door(5600, 800)]), cross(6800, [door(5600, 800)]), along(4400, [door(1200, 800), door(4600, 800), door(7400, 800)])],
              { "0-0": "living", "0-1": "bedroom", "1-0": "hall", "1-1": "bathroom", "2-0": "kitchen", "2-1": "bedroom" },
            ),
          ],
          roof: { type: "gable", pitchDeg: 25, overhang: 450, pattern: "howe", panels: 8, heelHeight: 200 },
          foundation: { type: "strip", plinth: 500 },
        },
        "permanent",
      ),
  },
  {
    id: "house2",
    category: "living",
    props: ["kitchen", "stair"],
    input: () =>
      building(
        {
          productId: "house2",
          length: 9000,
          width: 7000,
          levels: [
            level(
              2700,
              { front: side("wall", [win(900, 1500), door(3800, 1000), win(6400, 1500)]), back: side("wall", [win(1500, 1200), win(6000, 1200)]), left: side("wall", [win(2400, 1500)]), right: side("wall", [win(2400, 1200)]) },
              [cross(4500, [door(1200, 900)])],
              { "0-0": "living", "1-0": "kitchen" },
            ),
            level(
              2600,
              { front: side("wall", [win(1200, 1200), win(6200, 1200)]), back: side("wall", [win(1200, 1200), win(5600, 900, 900, 1300)]), left: side("wall", [win(2400, 1200)]), right: side("wall", [win(2400, 1200)]) },
              [cross(4500, [door(1200, 800)]), along(3500, [door(600, 800), door(5200, 800)])],
              { "0-0": "bedroom", "0-1": "bedroom", "1-0": "bathroom", "1-1": "bedroom" },
            ),
          ],
          roof: { type: "gable", pitchDeg: 30, overhang: 500, pattern: "howe", panels: 6, heelHeight: 200 },
          foundation: { type: "strip", plinth: 500 },
        },
        "permanent",
      ),
  },
  {
    id: "barnhouse",
    category: "living",
    props: ["kitchen"],
    input: () =>
      building(
        {
          productId: "barnhouse",
          length: 9000,
          width: 6000,
          levels: [
            level(2700, { front: side("wall", [win(800, 2400, 2100, 300), door(4200, 1000), win(6000, 2400, 2100, 300)]), back: side("wall", [win(1500, 1200), win(6300, 1200)]), left: side("wall", [win(2000, 1800, 2100, 300)]) }, [cross(5600, [door(1200, 800)])], {
              "0-0": "living",
              "1-0": "bedroom",
            }),
          ],
          roof: { type: "gable", pitchDeg: 45, overhang: 100, pattern: "howe", panels: 6, heelHeight: 200 },
          foundation: { type: "slab", plinth: 300 },
        },
        "permanent",
      ),
  },
  {
    id: "aframe",
    category: "living",
    props: [],
    input: () =>
      building(
        {
          productId: "aframe",
          length: 8000,
          width: 6000,
          levels: [level(1200, { front: side("wall"), back: side("wall"), left: side("wall"), right: side("wall") })],
          roof: { type: "gable", pitchDeg: 60, overhang: 300, pattern: "fink", panels: 4, heelHeight: 200 },
          foundation: { type: "screw-piles", plinth: 500 },
        },
        "seasonal",
      ),
  },
  // ── Bath ─────────────────────────────────────────────────
  {
    id: "bath",
    category: "bath",
    props: ["stove", "benches"],
    input: () =>
      building(
        {
          productId: "bath",
          length: 6000,
          width: 4000,
          levels: [
            level(2300, { front: side("wall", [door(700, 800, 1900), win(3700, 800, 600, 1300)]), left: side("wall", [win(1300, 900, 900, 1000)]) }, [cross(2600, [door(2400, 700, 1900)]), cross(4300, [door(2400, 700, 1800)])], {
              "0-0": "rest",
              "1-0": "washing",
              "2-0": "steam",
            }),
          ],
          roof: { type: "gable", pitchDeg: 25, overhang: 400, pattern: "howe", panels: 4, heelHeight: 200 },
          foundation: { type: "screw-piles", plinth: 400 },
        },
        "bath",
      ),
  },
  // ── Auto ─────────────────────────────────────────────────
  {
    id: "carport1",
    category: "auto",
    props: ["car"],
    capacity: { kind: "cars", default: 1 },
    input: () =>
      building(
        {
          productId: "carport1",
          length: 6000,
          width: 3600,
          levels: [level(2400, { front: side("open"), back: side("open"), left: side("open"), right: side("open") })],
          roof: { type: "mono", pitchDeg: 6, overhang: 300, pattern: "pratt", panels: 4, heelHeight: 200 },
          postSpacing: 3000,
          foundation: { type: "none", plinth: 0 },
        },
        "none",
      ),
  },
  {
    id: "carport2",
    category: "auto",
    props: ["car"],
    capacity: { kind: "cars", default: 2 },
    input: () =>
      building(
        {
          productId: "carport2",
          length: 6000,
          width: 6000,
          levels: [level(2500, { front: side("open"), back: side("open"), left: side("open"), right: side("open") })],
          roof: { type: "gable", pitchDeg: 15, overhang: 300, pattern: "howe", panels: 6, heelHeight: 200 },
          postSpacing: 3000,
          foundation: { type: "none", plinth: 0 },
        },
        "none",
      ),
  },
  {
    id: "garage",
    category: "auto",
    props: ["car", "workbench"],
    capacity: { kind: "cars", default: 1 },
    input: () =>
      building(
        {
          productId: "garage",
          length: 6500,
          width: 4000,
          levels: [level(2700, { left: side("wall", [gate(600, 2600, 2200)]), front: side("wall", [door(4800, 900, 2100)]) })],
          roof: { type: "gable", pitchDeg: 20, overhang: 300, pattern: "howe", panels: 4, heelHeight: 200 },
          foundation: { type: "slab", plinth: 150 },
        },
        "none",
      ),
  },
  {
    id: "garage2",
    category: "auto",
    props: ["car", "workbench"],
    capacity: { kind: "cars", default: 2 },
    input: () =>
      building(
        {
          productId: "garage2",
          length: 7000,
          width: 7000,
          levels: [level(3000, { front: side("wall", [gate(700, 2600, 2300), gate(3800, 2600, 2300)]), right: side("wall", [door(2800, 900, 2100)]), back: side("wall", [win(3000, 1200, 600, 1500)]) })],
          roof: { type: "gable", pitchDeg: 20, overhang: 300, pattern: "howe", panels: 6, heelHeight: 200 },
          foundation: { type: "slab", plinth: 150 },
        },
        "none",
      ),
  },
  // ── Farm ─────────────────────────────────────────────────
  {
    id: "shed",
    category: "farm",
    props: ["workbench"],
    input: () =>
      building(
        {
          productId: "shed",
          length: 4000,
          width: 3000,
          levels: [level(2300, { front: side("wall", [door(1500, 1000, 2000)]), right: side("wall", [win(900, 900, 600, 1300)]) })],
          roof: { type: "mono", pitchDeg: 10, overhang: 300, pattern: "pratt", panels: 4, heelHeight: 200 },
          foundation: { type: "screw-piles", plinth: 300 },
        },
        "none",
      ),
  },
  {
    id: "coop",
    category: "farm",
    props: ["nests", "perches", "run"],
    capacity: { kind: "birds", default: 20 },
    input: () =>
      building(
        {
          productId: "coop",
          length: 3000,
          width: 2400,
          levels: [level(2100, { front: side("wall", [door(400, 700, 1800), win(1700, 600, 400, 1300)]), back: side("wall", [win(1200, 600, 400, 1300)]) }, [], { "0-0": "poultry" })],
          roof: { type: "mono", pitchDeg: 12, overhang: 300, pattern: "pratt", panels: 2, heelHeight: 200 },
          foundation: { type: "screw-piles", plinth: 300 },
        },
        "seasonal",
      ),
  },
  {
    id: "poultry",
    category: "farm",
    props: ["nests", "perches", "run"],
    capacity: { kind: "birds", default: 200 },
    input: () =>
      building(
        {
          productId: "poultry",
          length: 12000,
          width: 6000,
          levels: [
            level(2500, { front: side("wall", [door(600, 1000, 2100), win(3000, 1200, 600, 1500), win(6000, 1200, 600, 1500), win(9000, 1200, 600, 1500)]), back: side("wall", [win(3000, 1200, 600, 1500), win(6000, 1200, 600, 1500), win(9000, 1200, 600, 1500)]) }, [cross(2500, [door(2000, 900)])], {
              "0-0": "technical",
              "1-0": "poultry",
            }),
          ],
          roof: { type: "gable", pitchDeg: 20, overhang: 400, pattern: "howe", panels: 6, heelHeight: 200 },
          foundation: { type: "strip", plinth: 300 },
        },
        "seasonal",
      ),
  },
  {
    id: "workshop",
    category: "farm",
    props: ["workbench"],
    input: () =>
      building(
        {
          productId: "workshop",
          length: 9000,
          width: 6000,
          levels: [level(3000, { front: side("wall", [gate(1000, 3000, 2500), door(6500, 900, 2100)]), back: side("wall", [win(2000, 1500, 900, 1200), win(6000, 1500, 900, 1200)]) })],
          roof: { type: "gable", pitchDeg: 20, overhang: 400, pattern: "howe", panels: 6, heelHeight: 200 },
          foundation: { type: "slab", plinth: 150 },
        },
        "seasonal",
      ),
  },
  // ── Sport ────────────────────────────────────────────────
  ...SPORT,
  // ── Custom ───────────────────────────────────────────────
  {
    id: "custom",
    category: "custom",
    props: [],
    input: () =>
      building(
        { productId: "custom", length: 6000, width: 4000, levels: [level(2500, { front: side("wall", [door(2500, 900)]) })] },
        "seasonal",
      ),
  },
];

export const CATEGORIES: Category[] = ["leisure", "living", "bath", "auto", "farm", "sport", "custom"];

export function findProduct(id: string): Product {
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p) throw new Error(`Нет изделия ${id}`);
  return p;
}

export function productInput(id: string): BuildingInput {
  return structuredClone(findProduct(id).input());
}
