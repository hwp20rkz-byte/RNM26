// UI layer, styled after the reference: a fixed header plate, a white scene card with a soft shadow, pop-up vocabulary
// cards with an icon and a drawn pointer line, a summary plate, the glossy CTA button and the subtitles.
import type { ReactNode } from 'react';
import { CARD, C, FONT, INK, LINE } from '../theme';
import { AnimalIcon } from './Animals';

/** Greedy word wrap by an estimated text width (Inter, bold): good enough to never overflow the frame. */
export function wrap(text: string, maxWidth: number, size: number, k = 0.57): string[] {
  const words = text.split(' '), lines: string[] = []; let cur = '';
  for (const w of words) { const next = cur ? cur + ' ' + w : w; if (next.length * size * k > maxWidth && cur) { lines.push(cur); cur = w; } else cur = next; }
  if (cur) lines.push(cur); return lines;
}

export function Background() {
  return (
    <g>
      <defs>
        <linearGradient id="bgg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.bg} /><stop offset="1" stopColor={C.bg2} /></linearGradient>
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="18" stdDeviation="22" floodColor="#1E3A5F" floodOpacity="0.18" /></filter>
        <filter id="lift" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#1E3A5F" floodOpacity="0.22" /></filter>
        <linearGradient id="hdr" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={C.azure} /><stop offset="1" stopColor={C.turq} /></linearGradient>
        <linearGradient id="cta" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FF8A80" /><stop offset="0.55" stopColor={C.coral} /><stop offset="1" stopColor={C.coralD} /></linearGradient>
      </defs>
      <rect width={1080} height={1920} fill="url(#bgg)" />
      <circle cx={120} cy={1780} r={220} fill={C.amber} opacity={0.12} /><circle cx={980} cy={180} r={260} fill={C.sky} opacity={0.1} />
    </g>
  );
}
export function Header({ kz, pl, k }: { kz: string; pl: string; k: number }) {
  const lines = pl ? [kz + ' /', pl] : [kz];
  return (
    <g transform={`translate(540 ${116 - (1 - k) * 160})`} opacity={k}>
      <rect x={-470} y={-82} width={940} height={164} rx={34} fill="url(#hdr)" filter="url(#lift)" />
      <rect x={-470} y={-82} width={940} height={164} rx={34} fill="none" {...LINE} />
      <rect x={-450} y={-70} width={900} height={50} rx={24} fill={C.white} opacity={0.16} />
      {lines.map((l, i) => <text key={i} x={0} y={(lines.length > 1 ? -14 : 16) + i * 58} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={44} fill={C.white}>{l}</text>)}
    </g>
  );
}
/** The white scene card with a soft shadow; its contents are clipped to the rounded rectangle. */
export function SceneCard({ children }: { children: ReactNode }) {
  return (
    <g>
      <defs><clipPath id="cardclip"><rect x={CARD.x} y={CARD.y} width={CARD.w} height={CARD.h} rx={CARD.r} /></clipPath></defs>
      <rect x={CARD.x} y={CARD.y} width={CARD.w} height={CARD.h} rx={CARD.r} fill={C.card} filter="url(#soft)" />
      <g clipPath="url(#cardclip)"><g transform={`translate(${CARD.x} ${CARD.y})`}>{children}</g></g>
      <rect x={CARD.x} y={CARD.y} width={CARD.w} height={CARD.h} rx={CARD.r} fill="none" stroke="#D5E3F3" strokeWidth={4} />
    </g>
  );
}
type Kind = 'leopard' | 'lion' | 'giraffe' | 'elephant' | 'beaver';
/** Vocabulary card at (x, y) (card-local); the pointer draws from the card to `to` (card-local) as k2 goes 0→1. */
export function VocabCard({ x, y, kind, kz, pl, k, k2, to, big = false }: { x: number; y: number; kind: Kind; kz: string; pl: string; k: number; k2: number; to: [number, number]; big?: boolean }) {
  if (k <= 0.001) return null;
  // the pointer leaves the card from its nearest edge: below/above the card if the target is lower/higher, else a side
  const s = big ? 1.22 : 1, w = (big ? 560 : 430), h = 132, W2 = w * s, H2 = h * s;
  const below = to[1] > y + H2, above = to[1] < y;
  const sx = below || above ? Math.min(x + W2 - 50, Math.max(x + 50, to[0])) : (to[0] > x + W2 / 2 ? x + W2 : x);
  const sy = below ? y + H2 : above ? y : y + H2 / 2;
  const len = Math.hypot(to[0] - sx, to[1] - sy), mid: [number, number] = [(sx + to[0]) / 2, Math.min(sy, to[1]) - 40];
  return (
    <g>
      <path d={`M${sx} ${sy} Q${mid[0]} ${mid[1]} ${to[0]} ${to[1]}`} fill="none" stroke={INK} strokeWidth={3.5} strokeLinecap="round" strokeDasharray={len * 1.3} strokeDashoffset={len * 1.3 * (1 - k2)} />
      {k2 > 0.95 && <circle cx={to[0]} cy={to[1]} r={10} fill={C.amber} {...LINE} />}
      <g transform={`translate(${x} ${y}) scale(${s * (0.6 + 0.4 * k)})`} opacity={Math.min(1, k * 1.4)}>
        <rect width={w} height={h} rx={30} fill={C.white} filter="url(#lift)" />
        <rect width={w} height={h} rx={30} fill="none" {...LINE} />
        <g transform="translate(66 66)"><AnimalIcon kind={kind} /></g>
        <text x={124} y={pl ? 58 : 80} fontFamily={FONT} fontWeight={800} fontSize={pl ? (big ? 34 : 38) : (big ? 42 : 46)} fill={INK}>{kz}</text>
        <text x={124} y={102} fontFamily={FONT} fontWeight={700} fontSize={big ? 30 : 32} fill={C.coralD}>{pl}</text>
      </g>
    </g>
  );
}
export function Plate({ kz, pl, k }: { kz: string; pl: string; k: number }) {
  if (k <= 0.001) return null;
  return (
    <g transform={`translate(500 ${1196 + (1 - k) * 260})`} opacity={Math.min(1, k * 1.5)}>
      <rect x={-430} y={-74} width={860} height={148} rx={40} fill={C.amber} filter="url(#lift)" />
      <rect x={-430} y={-74} width={860} height={148} rx={40} fill="none" {...LINE} />
      <rect x={-410} y={-62} width={820} height={40} rx={20} fill={C.white} opacity={0.3} />
      <text x={0} y={pl ? -6 : 16} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={pl ? 44 : 52} fill={INK}>{kz}</text>
      <text x={0} y={46} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={36} fill={C.coralD}>{pl}</text>
    </g>
  );
}
export function CTA({ kz, pl, k, pulse }: { kz: string; pl: string; k: number; pulse: number }) {
  if (k <= 0.001) return null;
  const s = (0.6 + 0.4 * k) * (1 + pulse * 0.05);
  return (
    <g transform={`translate(500 1150) scale(${s})`} opacity={Math.min(1, k * 1.5)}>
      <rect x={-390} y={-70} width={780} height={140} rx={70} fill="url(#cta)" filter="url(#lift)" />
      <rect x={-390} y={-70} width={780} height={140} rx={70} fill="none" {...LINE} />
      <rect x={-360} y={-58} width={720} height={48} rx={24} fill={C.white} opacity={0.35} />
      <g transform="translate(-300 0)"><circle r={38} fill={C.white} {...LINE} /><path d="M-10 -18 L20 0 L-10 18 Z" fill={C.coralD} {...LINE} strokeWidth={2.5} /></g>
      <text x={50} y={15} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={pl ? Math.min(46, 1180 / (kz.length + pl.length + 3)) : 60} fill={C.white} stroke={C.coralD} strokeWidth={1.5} paintOrder="stroke">{pl ? kz + ' / ' + pl : kz}</text>
    </g>
  );
}
/** Subtitles under the card: speaker chip + lines; the line being spoken is full colour, the other one dimmed. */
export function Subtitles({ items, k, big = false }: { items: { speaker: string; text: string; active: boolean; lang: string }[]; k: number; big?: boolean }) {
  if (!items.length || k <= 0.001) return null;
  if (big) {   // storybook look: one language, large centred white type with a dark outline on a soft dark panel
    const it = items[0], size = 64, lh = 78, lines = wrap(it.text, 940, size, 0.6), h = lines.length * lh + 92, y0 = 1512 + Math.max(0, (392 - h) / 2);
    return (
      <g opacity={k}>
        <rect x={36} y={y0} width={1008} height={h} rx={40} fill="#2A1B3D" opacity={0.82} />
        <rect x={470} y={y0 - 22} width={140} height={44} rx={22} fill={C.amber} {...LINE} />
        <text x={540} y={y0 + 8} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={26} fill={INK}>{it.speaker}</text>
        {lines.map((l, j) => <text key={j} x={540} y={y0 + 46 + (j + 1) * lh - 14} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={size} fill="#FFF8E7" stroke="#1B1028" strokeWidth={6} strokeLinejoin="round" paintOrder="stroke">{l}</text>)}
      </g>
    );
  }
  const size = items.length > 1 ? 38 : 44, lh = size * 1.22;
  const blocks = items.map((it) => ({ ...it, lines: wrap(it.text, 860, size) }));
  const totalH = blocks.reduce((a, b) => a + b.lines.length * lh + 64, 0);
  let y = 1520 + Math.max(0, (380 - totalH) / 2);
  return (
    <g opacity={k}>
      {blocks.map((b, i) => {
        const y0 = y; y += b.lines.length * lh + 64;
        return (
          <g key={i} opacity={b.active ? 1 : 0.45}>
            <rect x={72} y={y0} width={b.speaker.length * 22 + 110} height={46} rx={23} fill={b.lang === 'kz' ? C.azure : C.coral} />
            <text x={96} y={y0 + 32} fontFamily={FONT} fontWeight={800} fontSize={26} fill={C.white}>{(b.lang === 'kz' ? 'KZ' : 'PL') + ' · ' + b.speaker}</text>
            {b.lines.map((l, j) => <text key={j} x={72} y={y0 + 46 + (j + 1) * lh - 8} fontFamily={FONT} fontWeight={b.active ? 800 : 700} fontSize={size} fill={INK}>{l}</text>)}
          </g>
        );
      })}
    </g>
  );
}
