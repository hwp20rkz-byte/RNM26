// Zoo animals in line art with cel shading. Each takes a time `t` (seconds) for idle motion and `eyes` (blink scaleY).
// Origins: at the feet / sitting point, facing left unless flipped.
import { useContext } from 'react';
import { LookContext } from '../look';
import { C, INK, LINE } from '../theme';

function Eye({ x, y, r = 9, eyes, iris = INK }: { x: number; y: number; r?: number; eyes: number; iris?: string }) {
  if (useContext(LookContext) === 'story') {
    const R = r * 1.5;
    return (
      <g transform={`translate(${x} ${y}) scale(1 ${eyes})`}>
        <ellipse rx={R} ry={R * 1.15} fill={C.white} {...LINE} /><circle cy={R * 0.12} r={R * 0.72} fill={iris === INK ? '#5A3A22' : iris} />
        <circle cy={R * 0.12} r={R * 0.38} fill={INK} /><circle cx={R * 0.28} cy={-R * 0.25} r={R * 0.26} fill={C.white} /><circle cx={-R * 0.25} cy={R * 0.38} r={R * 0.12} fill={C.white} />
      </g>
    );
  }
  return <g transform={`translate(${x} ${y}) scale(1 ${eyes})`}><ellipse rx={r} ry={r * 1.15} fill={iris} /><circle cx={r * 0.3} cy={-r * 0.4} r={r * 0.35} fill={C.white} /></g>;
}
const Shadow = ({ rx, y = 0 }: { rx: number; y?: number }) => <ellipse cx={0} cy={y + 4} rx={rx} ry={rx * 0.16} fill={INK} opacity={0.13} />;

/** Снежный барс — pale fur with rosettes, a long thick swaying tail (the symbol of Almaty). */
export function SnowLeopard({ x, y, s = 1, t, eyes }: { x: number; y: number; s?: number; t: number; eyes: number }) {
  const tail = Math.sin(t * Math.PI * 1.2) * 14, fur = '#EEF2F7', spot = '#5B6475';
  const ros = [[-40, -110], [-4, -126], [30, -104], [62, -122], [-70, -92], [6, -88], [44, -82], [80, -96]];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Shadow rx={150} />
      <path d={`M110 -80 Q190 -60 ${200 + tail} -150 Q${206 + tail} -190 ${176 + tail} -186`} fill="none" stroke={INK} strokeWidth={40} strokeLinecap="round" />
      <path d={`M110 -80 Q190 -60 ${200 + tail} -150 Q${206 + tail} -190 ${176 + tail} -186`} fill="none" stroke={fur} strokeWidth={33} strokeLinecap="round" />
      {[0.35, 0.6, 0.85].map((k, i) => <circle key={i} cx={110 + (200 + tail - 110) * k + (k > 0.7 ? -8 : 10)} cy={-80 - 100 * k * k} r={7} fill="none" stroke={spot} strokeWidth={4} />)}
      {[-80, -30, 40, 86].map((lx) => <rect key={lx} x={lx - 16} y={-90} width={32} height={90} rx={15} fill={fur} {...LINE} />)}
      <ellipse cx={0} cy={-110} rx={130} ry={58} fill={fur} {...LINE} />
      <path d="M-120 -96 Q0 -46 122 -96 Q110 -58 0 -54 Q-110 -58 -120 -96 Z" fill="#CBD3DE" opacity={0.7} />
      {ros.map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r={9} fill="none" stroke={spot} strokeWidth={4.5} strokeDasharray="10 5" />)}
      <g transform={`translate(-128 -150) rotate(${Math.sin(t * Math.PI * 0.6) * 4})`}>
        <path d="M-40 -46 L-30 -82 L-8 -56 Z" fill={fur} {...LINE} /><path d="M24 -56 L42 -84 L46 -46 Z" fill={fur} {...LINE} />
        <circle r={58} fill={fur} {...LINE} />
        <ellipse cx={0} cy={22} rx={30} ry={22} fill={C.white} {...LINE} />
        <Eye x={-22} y={-8} r={8} eyes={eyes} iris="#3F8F6B" /><Eye x={22} y={-8} r={8} eyes={eyes} iris="#3F8F6B" />
        <path d="M-9 12 L9 12 L0 22 Z" fill="#F49AA8" {...LINE} />
        <path d="M0 22 Q-8 32 -16 28 M0 22 Q8 32 16 28" fill="none" {...LINE} />
        {[[-30, -34], [30, -36], [0, -44]].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r={5} fill={spot} />)}
      </g>
    </g>
  );
}

/** Арыстан — a lion with a layered mane that «breathes». */
export function Lion({ x, y, s = 1, t, eyes }: { x: number; y: number; s?: number; t: number; eyes: number }) {
  const b = 1 + Math.sin(t * Math.PI * 0.8) * 0.025, tail = Math.sin(t * Math.PI * 1.4) * 10;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Shadow rx={150} />
      <path d={`M-110 -90 Q-190 -70 ${-200 + tail} -150`} fill="none" stroke={INK} strokeWidth={16} strokeLinecap="round" />
      <path d={`M-110 -90 Q-190 -70 ${-200 + tail} -150`} fill="none" stroke={C.amber} strokeWidth={10} strokeLinecap="round" />
      <circle cx={-200 + tail} cy={-156} r={18} fill={C.amberD} {...LINE} />
      {[-80, -34, 40, 84].map((lx) => <rect key={lx} x={lx - 18} y={-96} width={36} height={96} rx={16} fill={C.amber} {...LINE} />)}
      <ellipse cx={0} cy={-116} rx={130} ry={62} fill={C.amber} {...LINE} />
      <path d="M-122 -100 Q0 -50 124 -100 Q112 -60 0 -56 Q-112 -60 -122 -100 Z" fill={C.amberD} opacity={0.35} />
      <g transform={`translate(118 -170) scale(${b})`}>
        {Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2; return <circle key={i} cx={Math.cos(a) * 66} cy={Math.sin(a) * 66} r={34} fill={i % 2 ? '#E8833A' : '#F0973F'} {...LINE} />; })}
        <circle r={70} fill="#E8833A" />
        <circle cx={-44} cy={-50} r={14} fill={C.amber} {...LINE} /><circle cx={44} cy={-50} r={14} fill={C.amber} {...LINE} />
        <circle r={56} fill={C.amber} {...LINE} />
        <ellipse cx={0} cy={22} rx={30} ry={22} fill="#FDE7B0" {...LINE} />
        <Eye x={-21} y={-10} r={8} eyes={eyes} /><Eye x={21} y={-10} r={8} eyes={eyes} />
        <path d="M-10 12 L10 12 L0 24 Z" fill="#7A3E1D" {...LINE} />
        <path d="M0 24 Q-9 34 -18 30 M0 24 Q9 34 18 30" fill="none" {...LINE} />
      </g>
    </g>
  );
}

/** Керік — a giraffe reaching a tree crown; the neck sways and the jaw chews. */
export function Giraffe({ x, y, s = 1, t, eyes, reach = 1 }: { x: number; y: number; s?: number; t: number; eyes: number; reach?: number }) {
  const sway = Math.sin(t * Math.PI * 0.7) * 3 - 6 * reach, chew = Math.abs(Math.sin(t * Math.PI * 4)) * 4, body = '#FAD67A', spot = '#E08A3C';
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Shadow rx={130} />
      {[-70, -34, 42, 78].map((lx) => <rect key={lx} x={lx - 13} y={-250} width={26} height={250} rx={12} fill={body} {...LINE} />)}
      <ellipse cx={0} cy={-280} rx={120} ry={66} fill={body} {...LINE} />
      {[[-60, -290], [-12, -300], [36, -276], [72, -296], [-30, -258]].map(([cx, cy], i) => <path key={i} d={`M${cx - 18} ${cy} q8 -18 24 -10 q16 10 6 24 q-14 12 -26 2 q-12 -6 -4 -16 Z`} fill={spot} />)}
      <path d="M118 -296 Q150 -262 136 -230" fill="none" stroke={INK} strokeWidth={8} strokeLinecap="round" />
      <g transform={`translate(-72 -320) rotate(${sway})`}>
        <path d="M-26 0 L-34 -380 L34 -380 L30 0 Z" fill={body} {...LINE} />
        {[-60, -140, -220, -300].map((cy, i) => <path key={i} d={`M${i % 2 ? -14 : -4} ${cy} q10 -16 22 -8 q8 12 -4 20 q-14 6 -18 -12 Z`} fill={spot} />)}
        <path d="M-30 -60 L-46 -340" stroke="#C2410C" strokeWidth={12} strokeLinecap="round" />
        <g transform="translate(0 -400) scale(1.45)">
          <rect x={-22} y={-56} width={10} height={32} rx={5} fill={body} {...LINE} /><circle cx={-17} cy={-58} r={9} fill="#7A3E1D" {...LINE} />
          <rect x={10} y={-56} width={10} height={32} rx={5} fill={body} {...LINE} /><circle cx={15} cy={-58} r={9} fill="#7A3E1D" {...LINE} />
          <ellipse cx={-40} cy={-20} rx={22} ry={10} fill={body} {...LINE} transform="rotate(-20 -40 -20)" />
          <path d={`M-30 -30 Q-10 -46 30 -30 Q70 -20 72 ${6 + chew} Q50 ${30 + chew} 10 22 Q-34 18 -30 -30 Z`} fill={body} {...LINE} />
          <Eye x={2} y={-14} r={7} eyes={eyes} />
          <circle cx={58} cy={4} r={3} fill={INK} />
        </g>
      </g>
    </g>
  );
}

/** Піл — an elephant: the trunk lifts and waves, ears flap. */
export function Elephant({ x, y, s = 1, t, eyes, lift = 1 }: { x: number; y: number; s?: number; t: number; eyes: number; lift?: number }) {
  const ear = 1 + Math.sin(t * Math.PI * 1.3) * 0.07, w = Math.sin(t * Math.PI * 2) * 18 * lift, up = 120 * lift, g = '#9DB7D2', gD = '#7895B6';
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Shadow rx={170} />
      <path d="M150 -150 Q190 -120 186 -84" fill="none" stroke={INK} strokeWidth={9} strokeLinecap="round" />
      {[-96, -40, 50, 104].map((lx) => <rect key={lx} x={lx - 26} y={-120} width={52} height={120} rx={20} fill={g} {...LINE} />)}
      <ellipse cx={0} cy={-170} rx={160} ry={100} fill={g} {...LINE} />
      <path d="M-150 -140 Q0 -60 156 -140 Q140 -84 0 -76 Q-140 -84 -150 -140 Z" fill={gD} opacity={0.45} />
      <g transform="translate(-150 -220)">
        <path d={`M-20 30 Q-70 ${70 - up * 0.3} ${-90 + w * 0.3} ${80 - up} Q${-112 + w} ${60 - up} ${-102 + w} ${40 - up}`} fill="none" stroke={INK} strokeWidth={36} strokeLinecap="round" />
        <path d={`M-20 30 Q-70 ${70 - up * 0.3} ${-90 + w * 0.3} ${80 - up} Q${-112 + w} ${60 - up} ${-102 + w} ${40 - up}`} fill="none" stroke={g} strokeWidth={29} strokeLinecap="round" />
        <g transform={`translate(40 -6) scale(${ear} 1)`}><path d="M0 -70 Q90 -90 96 0 Q90 80 0 64 Q-20 0 0 -70 Z" fill="#B9CDE2" {...LINE} /><path d="M14 -40 Q60 -50 64 0 Q60 40 14 34" fill="#F4B6C2" opacity={0.6} /></g>
        <circle r={80} fill={g} {...LINE} />
        <Eye x={-26} y={-14} r={8} eyes={eyes} />
        <path d="M-40 34 Q-60 50 -78 44" fill="none" stroke={C.white} strokeWidth={14} strokeLinecap="round" />
        <path d="M-40 34 Q-60 50 -78 44" fill="none" {...LINE} />
      </g>
    </g>
  );
}

/** Құндыз «Bober» — chubby beaver: big eyes, two big front teeth, a flat tail; optional paw wave and tail slap. */
export function Beaver({ x, y, s = 1, t, eyes, waveAmt = 0, slap = 0 }: { x: number; y: number; s?: number; t: number; eyes: number; waveAmt?: number; slap?: number }) {
  const fur = '#A9683B', furD = '#7E4A27', belly = '#E2AC74', breathe = 1 + Math.sin(t * Math.PI * 1.2) * 0.02, nose = Math.sin(t * Math.PI * 5) * 1.5;
  const tailA = -12 + slap * 40, paw = -40 - waveAmt * (60 + Math.sin(t * Math.PI * 5) * 25);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g transform={`translate(60 -30) rotate(${tailA})`}>
        <ellipse cx={90} cy={0} rx={92} ry={34} fill="#5E4033" {...LINE} />
        {[40, 75, 110, 145].map((cx) => <path key={cx} d={`M${cx} -26 L${cx - 12} 26`} stroke="#3E2A20" strokeWidth={3} />)}
        {[50, 95, 135].map((cx) => <path key={'h' + cx} d={`M${cx - 30} ${-4} L${cx + 30} 4`} stroke="#3E2A20" strokeWidth={3} />)}
      </g>
      <g transform={`scale(${breathe})`}>
        <ellipse cx={0} cy={-120} rx={112} ry={128} fill={fur} {...LINE} />
        <ellipse cx={-10} cy={-90} rx={70} ry={86} fill={belly} {...LINE} />
        <ellipse cx={-50} cy={-6} rx={46} ry={20} fill={furD} {...LINE} /><ellipse cx={50} cy={-6} rx={46} ry={20} fill={furD} {...LINE} />
        <g transform="translate(-74 -150)"><g transform={`rotate(${paw})`}><rect x={-16} y={-6} width={32} height={78} rx={16} fill={fur} {...LINE} /><circle cy={78} r={18} fill={furD} {...LINE} /></g></g>
        <g transform="translate(70 -150) rotate(30)"><rect x={-16} y={-6} width={32} height={70} rx={16} fill={fur} {...LINE} /><circle cy={70} r={18} fill={furD} {...LINE} /></g>
      </g>
      <g transform="translate(-8 -262)">
        <circle cx={-66} cy={-62} r={22} fill={fur} {...LINE} /><circle cx={-66} cy={-62} r={10} fill={furD} />
        <circle cx={62} cy={-64} r={22} fill={fur} {...LINE} /><circle cx={62} cy={-64} r={10} fill={furD} />
        <ellipse cx={0} cy={0} rx={96} ry={84} fill={fur} {...LINE} />
        <ellipse cx={-30} cy={-40} rx={34} ry={14} fill={C.white} opacity={0.22} />
        <g transform={`translate(-34 -18) scale(1 ${eyes})`}><circle r={24} fill={C.white} {...LINE} /><circle cx={4} cy={2} r={13} fill={INK} /><circle cx={9} cy={-4} r={5} fill={C.white} /></g>
        <g transform={`translate(34 -18) scale(1 ${eyes})`}><circle r={24} fill={C.white} {...LINE} /><circle cx={-4} cy={2} r={13} fill={INK} /><circle cx={1} cy={-4} r={5} fill={C.white} /></g>
        <ellipse cx={0} cy={36} rx={48} ry={32} fill={belly} {...LINE} />
        <ellipse cx={0} cy={20 + nose * 0.3} rx={16} ry={11} fill="#3A2318" {...LINE} />
        <path d="M-20 44 Q0 54 20 44" fill="none" {...LINE} />
        <rect x={-15} y={48} width={14} height={30} rx={3} fill={C.white} {...LINE} /><rect x={1} y={48} width={14} height={30} rx={3} fill={C.white} {...LINE} />
        <path d="M-12 54 L-6 54" stroke={C.white} strokeWidth={0} />
        {[-1, 1].map((d) => <path key={d} d={`M${d * 30} 30 L${d * 72} 22 M${d * 30} 38 L${d * 74} 40`} stroke={INK} strokeWidth={2.4} strokeLinecap="round" />)}
      </g>
    </g>
  );
}

/** The outro mascot: a snow-leopard cub with a little scarf, waving. */
export function Cub({ x, y, s = 1, t, eyes }: { x: number; y: number; s?: number; t: number; eyes: number }) {
  const fur = '#EEF2F7', spot = '#5B6475', wv = -140 + Math.sin(t * Math.PI * 4) * 22;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d={`M60 -40 Q130 -30 ${120 + Math.sin(t * 3) * 8} -110`} fill="none" stroke={INK} strokeWidth={30} strokeLinecap="round" />
      <path d={`M60 -40 Q130 -30 ${120 + Math.sin(t * 3) * 8} -110`} fill="none" stroke={fur} strokeWidth={23} strokeLinecap="round" />
      <ellipse cx={-34} cy={-10} rx={30} ry={16} fill={fur} {...LINE} /><ellipse cx={34} cy={-10} rx={30} ry={16} fill={fur} {...LINE} />
      <ellipse cx={0} cy={-80} rx={70} ry={76} fill={fur} {...LINE} />
      {[[-30, -90], [24, -60], [10, -110], [-20, -50]].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r={8} fill="none" stroke={spot} strokeWidth={4} strokeDasharray="8 4" />)}
      <g transform="translate(52 -120)"><g transform={`rotate(${wv})`}><rect x={-14} y={-4} width={28} height={64} rx={14} fill={fur} {...LINE} /><circle cy={62} r={16} fill={fur} {...LINE} /></g></g>
      <path d="M-58 -140 Q0 -112 58 -140 L54 -118 Q0 -92 -54 -118 Z" fill={C.coral} {...LINE} />
      <path d="M30 -122 L56 -70 L28 -78 Z" fill={C.coral} {...LINE} />
      <g transform="translate(0 -210)">
        <path d="M-58 -36 L-50 -78 L-22 -52 Z" fill={fur} {...LINE} /><path d="M22 -52 L50 -78 L58 -36 Z" fill={fur} {...LINE} />
        <circle r={66} fill={fur} {...LINE} />
        <ellipse cx={0} cy={26} rx={32} ry={22} fill={C.white} {...LINE} />
        <Eye x={-24} y={-8} r={10} eyes={eyes} iris="#2F7D5B" /><Eye x={24} y={-8} r={10} eyes={eyes} iris="#2F7D5B" />
        <path d="M-9 14 L9 14 L0 24 Z" fill="#F49AA8" {...LINE} />
        <path d="M0 24 Q-10 36 -18 30 M0 24 Q10 36 18 30" fill="none" {...LINE} />
        <circle cx={-44} cy={18} r={9} fill={C.cheek} opacity={0.6} /><circle cx={44} cy={18} r={9} fill={C.cheek} opacity={0.6} />
        {[[-30, -40], [30, -42], [0, -52]].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r={6} fill={spot} />)}
      </g>
    </g>
  );
}

/** Small round icons for the vocabulary cards (one per animal), 80×80 around the origin. */
export function AnimalIcon({ kind }: { kind: 'leopard' | 'lion' | 'giraffe' | 'elephant' | 'beaver' }) {
  const bg = { leopard: '#E0F2FE', lion: '#FEF3C7', giraffe: '#FEF9C3', elephant: '#E0E7FF', beaver: '#FFEDD5' }[kind];
  return (
    <g>
      <circle r={42} fill={bg} {...LINE} />
      {kind === 'leopard' && <g><path d="M-26 -14 L-22 -34 L-8 -24 Z M8 -24 L22 -34 L26 -14 Z" fill="#EEF2F7" {...LINE} /><circle cy={2} r={28} fill="#EEF2F7" {...LINE} /><circle cx={-10} cy={-2} r={4} fill="#3F8F6B" /><circle cx={10} cy={-2} r={4} fill="#3F8F6B" /><path d="M-5 8 L5 8 L0 13 Z" fill="#F49AA8" /><circle cx={-14} cy={-16} r={3} fill="#5B6475" /><circle cx={14} cy={-17} r={3} fill="#5B6475" /></g>}
      {kind === 'lion' && <g>{Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2; return <circle key={i} cx={Math.cos(a) * 24} cy={Math.sin(a) * 24 + 2} r={12} fill="#E8833A" />; })}<circle cy={2} r={22} fill={C.amber} {...LINE} /><circle cx={-8} cy={-2} r={3.5} fill={INK} /><circle cx={8} cy={-2} r={3.5} fill={INK} /><path d="M-5 8 L5 8 L0 13 Z" fill="#7A3E1D" /></g>}
      {kind === 'giraffe' && <g><rect x={-12} y={-6} width={16} height={40} fill="#FAD67A" {...LINE} /><path d="M-24 -14 Q-6 -30 22 -14 Q30 2 10 6 Q-20 6 -24 -14 Z" fill="#FAD67A" {...LINE} /><circle cx={-10} cy={-26} r={4} fill="#7A3E1D" /><circle cx={2} cy={-28} r={4} fill="#7A3E1D" /><circle cx={0} cy={-12} r={3} fill={INK} /><circle cx={-4} cy={18} r={4} fill="#E08A3C" /></g>}
      {kind === 'elephant' && <g><path d="M-6 -6 Q-30 -30 -32 4 Q-30 26 -6 14" fill="#B9CDE2" {...LINE} /><circle cx={6} cy={-2} r={22} fill="#9DB7D2" {...LINE} /><path d="M-6 10 Q-10 30 4 34" fill="none" stroke="#9DB7D2" strokeWidth={10} strokeLinecap="round" /><circle cx={12} cy={-6} r={3.5} fill={INK} /></g>}
      {kind === 'beaver' && <g><circle cx={-16} cy={-18} r={7} fill="#A9683B" {...LINE} /><circle cx={16} cy={-18} r={7} fill="#A9683B" {...LINE} /><circle cy={0} r={24} fill="#A9683B" {...LINE} /><circle cx={-9} cy={-5} r={6} fill={C.white} /><circle cx={9} cy={-5} r={6} fill={C.white} /><circle cx={-8} cy={-5} r={3} fill={INK} /><circle cx={8} cy={-5} r={3} fill={INK} /><ellipse cy={8} rx={6} ry={4} fill="#3A2318" /><rect x={-5} y={13} width={4.5} height={9} fill={C.white} stroke={INK} strokeWidth={1.5} /><rect x={0.5} y={13} width={4.5} height={9} fill={C.white} stroke={INK} strokeWidth={1.5} /></g>}
    </g>
  );
}
