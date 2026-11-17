/**
 * Crisp 3D text without font files at runtime: the text is drawn with the page's own Nunito webfont
 * onto a canvas and mapped on a plane. Unlike SDF text (troika), this needs no network fetch and
 * renders every Kazakh letter (Ә І Ң Ғ Ү Ұ Қ Ө Һ) the page font has.
 */
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';

export interface CanvasLabelProps {
  text: string;
  /** World height of the text line. */
  height?: number;
  color?: string;
  glow?: string;
  weight?: number;
  background?: string | null;
  opacity?: number;
}

let fontsReady: Promise<unknown> | null = null;
const whenFonts = () => (fontsReady ??= (document.fonts ? Promise.all([document.fonts.load('900 64px Nunito'), document.fonts.ready]) : Promise.resolve()));

export function CanvasLabel({ text, height = 0.4, color = '#ffffff', glow = '#00AFCA', weight = 900, background = null, opacity = 1 }: CanvasLabelProps) {
  const [ready, setReady] = useState(false);
  useEffect(() => { let alive = true; void whenFonts().then(() => alive && setReady(true)); return () => { alive = false; }; }, []);

  const { texture, aspect } = useMemo(() => {
    const px = 128, pad = 28, c = document.createElement('canvas'), g = c.getContext('2d')!;
    const font = `${weight} ${px}px Nunito, system-ui, sans-serif`;
    g.font = font;
    const w = Math.ceil(g.measureText(text).width) + pad * 2, h = px + pad * 2;
    c.width = w; c.height = h;
    g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (background) { g.fillStyle = background; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 36); g.fill(); }
    g.shadowColor = glow; g.shadowBlur = 24; g.fillStyle = color;
    g.fillText(text, w / 2, h / 2 + 6);
    g.shadowBlur = 0; g.fillText(text, w / 2, h / 2 + 6);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return { texture: t, aspect: w / h };
    // `ready` re-draws once the webfont has loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, color, glow, weight, background, ready]);

  useEffect(() => () => texture.dispose(), [texture]);

  const lineH = height * (128 + 56) / 128;
  return (
    <mesh renderOrder={10}>
      <planeGeometry args={[lineH * aspect, lineH]} />
      <meshBasicMaterial map={texture} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
