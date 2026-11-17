// Backgrounds and props in the scene card's local space (1000 × 1286).
import { C, INK, LINE } from '../theme';

export const W = 1000, H = 1286;

export function Sky({ t, top = C.sky, bottom = C.sky2 }: { t: number; top?: string; bottom?: string }) {
  return (
    <g>
      <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={top} /><stop offset="1" stopColor={bottom} /></linearGradient></defs>
      <rect width={W} height={H} fill="url(#sky)" />
      <g transform={`translate(${820} ${130})`}><circle r={70} fill="#FDE047" {...LINE} />{Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2 + t * 0.2; return <path key={i} d={`M${Math.cos(a) * 88} ${Math.sin(a) * 88} L${Math.cos(a) * 112} ${Math.sin(a) * 112}`} stroke={C.amber} strokeWidth={8} strokeLinecap="round" />; })}</g>
      <Cloud x={((t * 22) % 1300) - 200} y={150} s={1} /><Cloud x={((t * 15 + 600) % 1300) - 200} y={270} s={0.7} /><Cloud x={((t * 18 + 1000) % 1300) - 200} y={90} s={0.55} />
    </g>
  );
}
export function Cloud({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-90 30 Q-110 -10 -66 -20 Q-56 -66 -6 -56 Q24 -88 64 -56 Q110 -60 108 -14 Q132 12 96 30 Z" fill={C.cloud} {...LINE} />
      <path d="M-70 18 Q0 30 80 16" fill="none" stroke="#DCEBFA" strokeWidth={8} strokeLinecap="round" />
    </g>
  );
}
/** Іле Алатауы — layered peaks with snow caps. */
export function Mountains({ y = 600, s = 1 }: { y?: number; s?: number }) {
  return (
    <g transform={`translate(0 ${y}) scale(1 ${s})`}>
      <path d="M-20 120 L120 -120 L230 10 L360 -210 L500 -20 L620 -160 L760 0 L880 -140 L1030 60 L1030 220 L-20 220 Z" fill={C.mountain} {...LINE} />
      <path d="M320 -140 L360 -210 L400 -150 L380 -130 L360 -150 L340 -128 Z M590 -112 L620 -160 L652 -114 L634 -100 L620 -116 L604 -98 Z M100 -86 L120 -120 L142 -88 L130 -80 L120 -92 L110 -78 Z M856 -104 L880 -140 L906 -104 L892 -96 L880 -110 L868 -94 Z" fill={C.snow} {...LINE} />
      <path d="M-20 160 L180 20 L300 120 L470 -10 L640 130 L820 30 L1030 150 L1030 240 L-20 240 Z" fill={C.mountainD} {...LINE} />
    </g>
  );
}
export function Tree({ x, y, s = 1, t = 0, dark = false }: { x: number; y: number; s?: number; t?: number; dark?: boolean }) {
  const sw = Math.sin(t * Math.PI * 0.8 + x) * 2;
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) rotate(${sw})`}>
      <rect x={-14} y={-120} width={28} height={120} rx={8} fill={C.wood} {...LINE} />
      <circle cx={0} cy={-170} r={78} fill={dark ? C.emerald : C.lime} {...LINE} />
      <circle cx={-56} cy={-130} r={52} fill={dark ? C.emerald : C.lime} {...LINE} />
      <circle cx={56} cy={-134} r={54} fill={dark ? C.emerald : C.lime} {...LINE} />
      <ellipse cx={-20} cy={-200} rx={34} ry={18} fill={C.white} opacity={0.28} />
    </g>
  );
}
export function Grass({ y, color = C.grass }: { y: number; color?: string }) {
  return (
    <g>
      <path d={`M-20 ${y} Q250 ${y - 40} 500 ${y - 10} Q760 ${y + 20} 1020 ${y - 30} L1020 ${H + 20} L-20 ${H + 20} Z`} fill={color} {...LINE} />
      {Array.from({ length: 16 }, (_, i) => <path key={i} d={`M${30 + i * 62} ${y + 40 + (i % 3) * 30} l6 -18 l6 18`} fill="none" stroke={C.emeraldD} strokeWidth={3} strokeLinecap="round" />)}
    </g>
  );
}
/** The zoo entrance arch with flags and a sign; `flutter` in seconds. */
export function Arch({ t, sign }: { t: number; sign: string }) {
  const f = Math.sin(t * Math.PI * 2.2) * 8;
  return (
    <g transform="translate(500 760)">
      {[-300, 300].map((x) => (
        <g key={x}>
          <rect x={x - 46} y={-430} width={92} height={430} rx={14} fill={C.turq} {...LINE} />
          <rect x={x - 46} y={-430} width={22} height={430} fill={C.turqL} opacity={0.5} />
          <path d={`M${x} -430 L${x} -520`} {...LINE} />
          <path d={`M${x} -520 Q${x + 40} ${-510 + f} ${x + 70} ${-500 - f} L${x + 66} ${-470 - f} Q${x + 36} ${-478 + f} ${x} -488 Z`} fill={x < 0 ? C.coral : C.amber} {...LINE} />
        </g>
      ))}
      <path d="M-350 -380 Q0 -560 350 -380 L350 -330 Q0 -500 -350 -330 Z" fill={C.amber} {...LINE} />
      <rect x={-290} y={-470} width={580} height={88} rx={30} fill={C.white} {...LINE} />
      <text x={0} y={-414} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={36} fill={INK}>{sign}</text>
      {[-200, -100, 0, 100, 200].map((x) => <circle key={x} cx={x} cy={-350} r={10} fill={[C.coral, C.lime, C.sky, C.amber, C.turq][(x / 100 + 2) | 0]} {...LINE} />)}
    </g>
  );
}
export function Rocks({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-260 0 L-220 -170 L-120 -260 L20 -230 L120 -300 L240 -180 L280 0 Z" fill={C.rock} {...LINE} />
      <path d="M-120 -260 L-60 -120 L20 -230 M120 -300 L90 -140 L240 -180" fill="none" {...LINE} />
      <path d="M-220 -170 L-60 -120 L90 -140 L280 0" fill="none" stroke={C.rockD} strokeWidth={10} opacity={0.5} />
      <path d="M-120 -260 L-80 -250 L-100 -220 Z M120 -300 L160 -270 L130 -250 Z" fill={C.snow} {...LINE} />
    </g>
  );
}
export function Fence({ y, from = 0, to = W }: { y: number; from?: number; to?: number }) {
  const posts = []; for (let x = from + 20; x < to; x += 70) posts.push(x);
  return (
    <g>
      <path d={`M${from} ${y - 50} L${to} ${y - 50} M${from} ${y - 20} L${to} ${y - 20}`} stroke={C.woodD} strokeWidth={10} strokeLinecap="round" />
      <path d={`M${from} ${y - 50} L${to} ${y - 50} M${from} ${y - 20} L${to} ${y - 20}`} fill="none" {...LINE} strokeWidth={2} />
      {posts.map((x) => <rect key={x} x={x - 9} y={y - 80} width={18} height={80} rx={6} fill={C.wood} {...LINE} />)}
    </g>
  );
}
export function Pond({ t, y = 760 }: { t: number; y?: number }) {
  return (
    <g>
      <path d={`M-30 ${y} Q500 ${y - 70} 1030 ${y} L1030 ${H + 30} L-30 ${H + 30} Z`} fill={C.water} {...LINE} />
      <path d={`M-30 ${y + 60} Q500 ${y} 1030 ${y + 60} L1030 ${H + 30} L-30 ${H + 30} Z`} fill={C.waterD} opacity={0.35} />
      {Array.from({ length: 7 }, (_, i) => {
        const p = ((t * 0.5 + i / 7) % 1), rx = 30 + p * 90;
        return <ellipse key={i} cx={120 + (i * 137) % 760} cy={y + 120 + ((i * 89) % 380)} rx={rx} ry={rx * 0.22} fill="none" stroke={C.waterL} strokeWidth={4} opacity={1 - p} />;
      })}
      {[[160, y + 200], [820, y + 340]].map(([x, yy], i) => <g key={i} transform={`translate(${x} ${yy})`}><ellipse rx={56} ry={18} fill={C.emerald} {...LINE} /><path d="M0 0 L40 -10" {...LINE} /></g>)}
    </g>
  );
}
/** Beaver dam: stacked logs with cut ends. */
export function Dam({ x, y }: { x: number; y: number }) {
  const logs = [[0, 0, 260], [30, -40, 220], [60, -80, 170], [-10, 40, 280]];
  return (
    <g transform={`translate(${x} ${y})`}>
      {logs.map(([lx, ly, w], i) => (
        <g key={i}><rect x={lx} y={ly} width={w} height={42} rx={21} fill={i % 2 ? C.wood : '#C98A4B'} {...LINE} /><circle cx={lx + w - 21} cy={ly + 21} r={17} fill="#F1C48A" {...LINE} /><circle cx={lx + w - 21} cy={ly + 21} r={7} fill="none" stroke={C.woodD} strokeWidth={3} /></g>
      ))}
      {[[40, -100], [120, -110], [200, -96]].map(([sx, sy], i) => <path key={i} d={`M${sx} ${sy} l-14 -40 M${sx} ${sy} l10 -44 M${sx} ${sy} l26 -30`} stroke={C.woodD} strokeWidth={5} strokeLinecap="round" />)}
    </g>
  );
}
export function Splash({ x, y, k }: { x: number; y: number; k: number }) {
  if (k <= 0 || k >= 1) return null;
  const drops = Array.from({ length: 11 }, (_, i) => { const a = Math.PI * (0.1 + 0.8 * (i / 10)), r = 40 + k * 190; return [Math.cos(a) * r, -Math.sin(a) * r * 1.1 + k * k * 120]; });
  return (
    <g transform={`translate(${x} ${y})`} opacity={1 - k * 0.7}>
      {drops.map(([dx, dy], i) => <path key={i} d={`M${dx} ${dy} q-9 14 0 22 q9 -8 0 -22 Z`} fill={C.waterL} {...LINE} strokeWidth={2.5} />)}
      <ellipse cx={0} cy={10} rx={60 + k * 140} ry={14 + k * 26} fill="none" stroke={C.white} strokeWidth={5} />
    </g>
  );
}
/** A stylised globe; the meridians slide as it rotates. */
export function Globe({ x, y, r, t }: { x: number; y: number; r: number; t: number }) {
  const ph = (t * 0.25) % 1;
  return (
    <g transform={`translate(${x} ${y})`}>
      <defs><clipPath id="globe"><circle r={r} /></clipPath></defs>
      <circle r={r} fill={C.sky} {...LINE} />
      <g clipPath="url(#globe)">
        {[-1.2, -0.4, 0.4, 1.2].map((k, i) => { const cx = ((k + ph * 1.6 + 2) % 3.2 - 1.6) * r; return <path key={i} d={`M${cx - r * 0.5} ${-r * 0.2} q${r * 0.3} -${r * 0.4} ${r * 0.62} -${r * 0.1} q${r * 0.1} ${r * 0.3} -${r * 0.16} ${r * 0.5} q-${r * 0.36} ${r * 0.1} -${r * 0.46} -${r * 0.4} Z`} fill={C.lime} {...LINE} />; })}
        {[0, 1, 2, 3].map((i) => { const k = ((i / 4 + ph) % 1) * 2 - 1; return <ellipse key={'m' + i} rx={Math.abs(k) * r} ry={r} fill="none" stroke={C.white} strokeWidth={3} opacity={0.6} />; })}
        {[-0.5, 0, 0.5].map((k) => <path key={'p' + k} d={`M${-r} ${k * r} Q0 ${k * r + 14} ${r} ${k * r}`} fill="none" stroke={C.white} strokeWidth={3} opacity={0.6} />)}
      </g>
      <circle r={r} fill="none" {...LINE} />
      <ellipse cx={-r * 0.4} cy={-r * 0.45} rx={r * 0.25} ry={r * 0.12} fill={C.white} opacity={0.5} />
    </g>
  );
}
/** Flags drawn as vectors (emoji do not survive the 32K SVG renderer). */
export function FlagKZ({ w = 150 }: { w?: number }) {
  const h = w / 2;
  return (
    <g>
      <rect width={w} height={h} rx={8} fill="#00AFCA" {...LINE} />
      <g transform={`translate(${w * 0.56} ${h * 0.42})`}>
        {Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return <path key={i} d={`M${Math.cos(a) * h * 0.2} ${Math.sin(a) * h * 0.2} L${Math.cos(a) * h * 0.3} ${Math.sin(a) * h * 0.3}`} stroke="#FEC50C" strokeWidth={3} strokeLinecap="round" />; })}
        <circle r={h * 0.17} fill="#FEC50C" />
        <path d={`M${-h * 0.42} ${h * 0.34} Q0 ${h * 0.16} ${h * 0.42} ${h * 0.34} Q0 ${h * 0.26} ${-h * 0.42} ${h * 0.34} Z`} fill="#FEC50C" />
      </g>
      <path d={`M${w * 0.07} ${h * 0.12} L${w * 0.07} ${h * 0.88}`} stroke="#FEC50C" strokeWidth={w * 0.05} strokeDasharray={`${w * 0.04} ${w * 0.03}`} />
    </g>
  );
}
export function FlagPL({ w = 150 }: { w?: number }) {
  const h = w / 1.6;
  return (<g><rect width={w} height={h} rx={8} fill={C.white} {...LINE} /><path d={`M0 ${h / 2} L${w} ${h / 2} L${w} ${h - 8} Q${w} ${h} ${w - 8} ${h} L8 ${h} Q0 ${h} 0 ${h - 8} Z`} fill="#DC143C" /><rect width={w} height={h} rx={8} fill="none" {...LINE} /></g>);
}
export function Books({ x, y }: { x: number; y: number }) {
  const b = [[C.coral, 150, 0], [C.turq, 170, -10], [C.amber, 140, 6]];
  return (
    <g transform={`translate(${x} ${y})`}>
      {b.map(([c, w, dx], i) => <g key={i} transform={`translate(${dx as number} ${-i * 34})`}><rect x={-(w as number) / 2} y={-34} width={w as number} height={34} rx={6} fill={c as string} {...LINE} /><path d={`M${-(w as number) / 2 + 12} -24 L${(w as number) / 2 - 12} -24`} stroke={C.white} strokeWidth={4} opacity={0.7} /></g>)}
    </g>
  );
}
export function Cup({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-40} y={-24} width={80} height={24} rx={6} fill={C.amberD} {...LINE} />
      <rect x={-12} y={-60} width={24} height={36} fill={C.amber} {...LINE} />
      <path d="M-56 -150 L56 -150 Q56 -70 0 -62 Q-56 -70 -56 -150 Z" fill={C.amber} {...LINE} />
      <path d="M-56 -136 Q-90 -136 -84 -110 Q-78 -88 -50 -96 M56 -136 Q90 -136 84 -110 Q78 -88 50 -96" fill="none" {...LINE} strokeWidth={6} />
      <path d="M-30 -136 Q-28 -96 -6 -82" fill="none" stroke={C.white} strokeWidth={8} strokeLinecap="round" opacity={0.6} />
      <path d="M0 -128 l7 14 l15 2 l-11 10 l3 15 l-14 -8 l-14 8 l3 -15 l-11 -10 l15 -2 Z" fill={C.white} {...LINE} strokeWidth={2.5} />
    </g>
  );
}
