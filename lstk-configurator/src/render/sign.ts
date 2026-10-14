import * as THREE from "three";
import type { Building } from "@/domain/buildings/generate";
import type { Room } from "@/domain/layout/rooms";
import type { SignFont, SignLayout, SignSettings } from "@/domain/signage/sign";
import { box, mat } from "./kit";
import { MM } from "./profileGeometry";

/**
 * The sign in 3D: the face is a canvas texture (main line + subline) on a
 * plane in front of the wall; volumetric letters get a transparent face
 * with a darker copy behind it for depth, a lightbox and a panel get their
 * body. Lit signs glow through the emissive map. Without a DOM (tests) the
 * face is a plain coloured plane.
 */

const FAMILY: Record<SignFont, string> = {
  sans: "800 {px}px Inter, 'Helvetica Neue', Arial, sans-serif",
  condensed: "800 {px}px 'Roboto Condensed', 'Arial Narrow', 'Helvetica Neue', Arial, sans-serif",
  serif: "700 {px}px Georgia, 'Times New Roman', serif",
};

function faceTexture(s: SignSettings, w: number, h: number, withBg: boolean, color: string): THREE.Texture | null {
  if (typeof document === "undefined") return null;
  const W = 1024;
  const H = Math.max(64, Math.round((W * h) / w));
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  if (!g) return null;
  if (withBg) {
    g.fillStyle = s.background;
    g.fillRect(0, 0, W, H);
  }
  const hasSub = !!s.sub.trim();
  const main = H * (hasSub ? 0.58 : 0.8);
  g.fillStyle = color;
  g.textAlign = "center";
  g.textBaseline = "middle";
  let px = main;
  const font = (p: number) => FAMILY[s.font].replace("{px}", String(Math.round(p)));
  g.font = font(px);
  // Fit the line into the face
  const fit = W * (withBg ? 0.86 : 0.98);
  const mw = g.measureText(s.text).width;
  if (mw > fit) px *= fit / mw;
  g.font = font(px);
  g.fillText(s.text, W / 2, hasSub ? H * 0.38 : H / 2);
  if (hasSub) {
    let sp = H * 0.2;
    g.font = font(sp).replace("800", "600").replace("700", "400");
    const sw = g.measureText(s.sub).width;
    if (sw > fit) sp *= fit / sw;
    g.font = font(sp).replace("800", "600").replace("700", "400");
    g.fillText(s.sub, W / 2, H * 0.8);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function facePlane(s: SignSettings, w: number, h: number, withBg: boolean, color: string, glow: boolean): THREE.Mesh {
  const tex = faceTexture(s, w, h, withBg, color);
  const m = new THREE.MeshStandardMaterial({
    color: tex ? 0xffffff : new THREE.Color(withBg ? s.background : color),
    map: tex,
    transparent: !withBg,
    alphaTest: withBg ? 0 : 0.4,
    roughness: 0.45,
    metalness: 0.1,
    emissive: glow ? new THREE.Color(0xffffff) : new THREE.Color(0x000000),
    emissiveMap: glow ? tex : null,
    emissiveIntensity: glow ? 0.9 : 0,
  });
  m.userData.ownsMaterial = true;
  if (tex) m.userData.ownsTexture = true;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w * MM, h * MM), m);
  mesh.userData.ownsGeometry = true;
  return mesh;
}

/** The sign face(s) with their body, centred at (x, y-bottom), facing −z, the face `depth` in front of the plane z0 */
function signBody(s: SignSettings, l: SignLayout, z0: number): THREE.Group {
  const g = new THREE.Group();
  const { width: w, height: h, depth } = l;
  if (s.style === "letters") {
    // Darker copy behind the face for the letter returns
    const back = facePlane(s, w, h, false, "#1b1f24", false);
    back.position.set(0, (h / 2) * MM, (-depth * 0.35) * MM);
    const front = facePlane(s, w, h, false, s.color, s.lit);
    front.position.set(0, (h / 2) * MM, (-depth) * MM);
    back.rotation.y = front.rotation.y = Math.PI;
    g.add(back, front);
  } else {
    const body = box(g, -w / 2, 0, -depth, w, h, depth, mat(s.background, 0.5, 0.2));
    body.castShadow = true;
    const face = facePlane(s, w - 20, h - 20, true, s.color, s.lit && s.style === "lightbox");
    face.position.set(0, (h / 2) * MM, (-depth - 2) * MM);
    face.rotation.y = Math.PI;
    g.add(face);
  }
  g.position.z = z0 * MM;
  return g;
}

export function createSign(b: Building, s: SignSettings, l: SignLayout, rooms: Room[]): THREE.Group {
  const g = new THREE.Group();
  g.name = "sign";
  if (l.pylon) {
    const p = l.pylon;
    const pw = l.width + 300;
    box(g, p.x - pw / 2, 0, p.z - 200, pw, p.height, 400, mat(s.background, 0.55, 0.25));
    box(g, p.x - pw / 2 - 50, 0, p.z - 250, pw + 100, 300, 500, mat("hsl(210 5% 45%)", 0.7, 0.3));
    const face = signBody(s, l, p.z - 200);
    face.position.x = p.x * MM;
    face.position.y = l.y * MM;
    g.add(face);
  } else {
    // Front facade: the cladding stands ≈ 60 mm proud of the frame (z = 0 is the frame's outer face)
    const face = signBody(s, l, -70);
    face.position.x = l.x * MM;
    face.position.y = (b.levels[0]!.base + l.y) * MM;
    g.add(face);
  }

  // Brand wall inside the hall: three stripes and the name on the back wall above the padding
  const hall = s.interior ? rooms.filter((r) => r.purpose === "gym").sort((a, c) => c.area - a.area)[0] : undefined;
  if (hall) {
    const H = b.input.levels[0]!.height;
    const base = b.levels[0]!.base;
    const w = Math.min(hall.x1 - hall.x0 - 1000, 14000);
    const cx = (hall.x0 + hall.x1) / 2;
    const zWall = hall.z1 - 15;
    const stripes = [s.background, s.color === "#ffffff" ? "hsl(48 85% 55%)" : s.color, "hsl(352 62% 42%)"];
    stripes.forEach((c, i) => {
      const strip = box(g, cx - w / 2, base + 1900 + i * 140, zWall - 6, w, 110, 6, mat(c, 0.6));
      strip.castShadow = false;
    });
    const name = facePlane({ ...s, sub: s.sub }, Math.min(w, 9000), Math.min(1300, H - 2500), false, s.background, false);
    name.position.set(cx * MM, (base + 2350 + Math.min(1300, H - 2500) / 2) * MM, (zWall - 10) * MM);
    name.rotation.y = Math.PI;
    g.add(name);
  }
  g.userData.level = 0;
  return g;
}
