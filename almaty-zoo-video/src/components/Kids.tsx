// Айша (Ajsza) and Арман (Arman): line-art kids. Origin at the feet, ~480 units tall at scale 1.
// Poses: idle, wave (greeting), point (to an animal), laugh (bounce, arms up), look (head tilted up).
import { C, INK, LINE } from '../theme';

export type Pose = 'idle' | 'wave' | 'point' | 'laugh' | 'look';
export interface KidProps { who: 'aisha' | 'arman'; x: number; y: number; s?: number; flip?: boolean; t: number; mouth: number; eyes: number; pose: Pose }

function Arm({ angle, sleeve, len = 118 }: { angle: number; sleeve: string; len?: number }) {
  return (
    <g transform={`rotate(${angle})`}>
      <rect x={-15} y={-8} width={30} height={len * 0.62} rx={15} fill={sleeve} {...LINE} />
      <rect x={-12} y={len * 0.5} width={24} height={len * 0.45} rx={12} fill={C.skin} {...LINE} />
      <circle cx={0} cy={len + 6} r={17} fill={C.skin} {...LINE} />
    </g>
  );
}

export function Kid({ who, x, y, s = 1, flip = false, t, mouth, eyes, pose }: KidProps) {
  const a = who === 'aisha', shirt = a ? C.coral : C.lime, shirtD = a ? C.coralD : '#65A30D';
  const bounce = pose === 'laugh' ? Math.abs(Math.sin(t * Math.PI * 3.2)) * 16 : Math.sin(t * Math.PI * 1.1) * 3;
  const sway = Math.sin(t * Math.PI * 0.9) * 2;
  // arm angles (0 = hanging down; negative = forward/up on the right side)
  let rA = 12, lA = -12;
  if (pose === 'wave') rA = -150 + Math.sin(t * Math.PI * 4) * 22;
  if (pose === 'point') rA = -118 + Math.sin(t * Math.PI * 1.6) * 4;
  if (pose === 'laugh') { rA = -150 + Math.sin(t * Math.PI * 6.4) * 10; lA = 150 - Math.sin(t * Math.PI * 6.4) * 10; }
  const headTilt = pose === 'look' ? -10 : pose === 'laugh' ? Math.sin(t * Math.PI * 3.2) * 4 : sway;
  const open = Math.max(0, Math.min(1, mouth));
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <ellipse cx={0} cy={4} rx={86} ry={16} fill={INK} opacity={0.12} />
      <g transform={`translate(0 ${-bounce})`}>
        {/* legs and shoes */}
        {[-24, 24].map((lx) => <rect key={lx} x={lx - 13} y={-170} width={26} height={150} rx={12} fill={C.skin} {...LINE} />)}
        {a && [-24, 24].map((lx) => <rect key={'so' + lx} x={lx - 13} y={-62} width={26} height={36} rx={8} fill={C.white} {...LINE} />)}
        {[-28, 28].map((lx) => (
          <g key={'sh' + lx}>
            <path d={`M${lx - 30} -6 Q${lx - 30} -34 ${lx} -34 Q${lx + 32} -34 ${lx + 34} -6 Z`} fill={C.white} {...LINE} />
            <path d={`M${lx - 24} -14 L${lx + 26} -14`} stroke={a ? C.turq : C.coral} strokeWidth={6} strokeLinecap="round" />
          </g>
        ))}
        {/* skirt / shorts */}
        {a
          ? <path d="M-58 -150 L-74 -112 Q0 -96 74 -112 L58 -150 Q0 -160 -58 -150 Z" fill={C.turq} {...LINE} transform="translate(0 -60)" />
          : <path d="M-56 -212 L-60 -138 L-6 -134 L0 -170 L6 -134 L60 -138 L56 -212 Z" fill={C.blue} {...LINE} />}
        {!a && <rect x={-70} y={-330} width={140} height={126} rx={26} fill={C.amber} {...LINE} />}{/* backpack behind */}
        {/* arms behind the torso on the left, in front on the right */}
        <g transform="translate(-58 -318)"><Arm angle={lA} sleeve={shirt} /></g>
        <path d="M-60 -326 Q-66 -250 -58 -196 L58 -196 Q66 -250 60 -326 Q0 -350 -60 -326 Z" fill={shirt} {...LINE} />
        <path d="M-58 -206 Q0 -196 58 -206 L58 -196 L-58 -196 Z" fill={shirtD} opacity={0.6} />
        {a
          ? <path d="M-26 -300 Q0 -278 26 -300" fill="none" {...LINE} />   /* hoodie pocket line */
          : (<g transform="translate(0 -268)"><circle r={24} fill={C.white} {...LINE} />{[[-8, -6], [8, -6], [0, 8], [-12, 8], [12, 6]].map(([cx, cy], k) => <circle key={k} cx={cx} cy={cy} r={3.2} fill={INK} />)}</g>)}
        <g transform="translate(58 -318)"><Arm angle={rA} sleeve={shirt} /></g>
        {/* head */}
        <g transform={`translate(0 -360) rotate(${headTilt})`}>
          <rect x={-14} y={-24} width={28} height={30} fill={C.skin} {...LINE} />
          {a && [-1, 1].map((d) => (
            <g key={'br' + d}>
              <path d={`M${d * 70} -70 Q${d * 98} 0 ${d * 84} 70`} fill="none" stroke={C.hairA} strokeWidth={30} strokeLinecap="round" />
              <path d={`M${d * 70} -70 Q${d * 98} 0 ${d * 84} 70`} fill="none" stroke={INK} strokeWidth={3.5} strokeLinecap="round" strokeDasharray="0.1 22" />
              <rect x={d * 84 - 14} y={44} width={28} height={14} rx={6} fill={C.amber} {...LINE} />
            </g>
          ))}
          <circle cx={-78} cy={-80} r={16} fill={C.skin} {...LINE} /><circle cx={78} cy={-80} r={16} fill={C.skin} {...LINE} />
          <circle cx={0} cy={-84} r={80} fill={C.skin} {...LINE} />
          <ellipse cx={-30} cy={-56} rx={44} ry={20} fill={C.white} opacity={0.18} />
          {/* hair */}
          {a
            ? <path d="M-82 -86 Q-84 -170 0 -170 Q84 -170 82 -86 Q60 -128 18 -118 Q-10 -140 -44 -112 Q-66 -106 -82 -86 Z" fill={C.hairA} {...LINE} />
            : (<g>
                <path d="M-80 -92 Q-80 -166 0 -168 Q80 -166 80 -92 Q50 -120 0 -116 Q-50 -120 -80 -92 Z" fill={C.hairB} {...LINE} />
                <path d="M-74 -118 Q-70 -176 0 -178 Q70 -176 74 -118 Q0 -138 -74 -118 Z" fill={C.amber} {...LINE} />
                <path d="M30 -150 Q86 -150 118 -128 Q90 -112 52 -124" fill={C.amberD} {...LINE} />
                <circle cx={0} cy={-176} r={8} fill={C.coral} {...LINE} />
              </g>)}
          {/* face */}
          {[-28, 28].map((ex) => (
            <g key={'e' + ex} transform={`translate(${ex} -84) scale(1 ${eyes})`}>
              <ellipse rx={10} ry={13} fill={INK} /><circle cx={3} cy={-5} r={3.6} fill={C.white} />
            </g>
          ))}
          <path d="M-42 -112 Q-28 -120 -14 -112" fill="none" {...LINE} /><path d="M14 -112 Q28 -120 42 -112" fill="none" {...LINE} />
          <circle cx={-46} cy={-58} r={11} fill={C.cheek} opacity={0.65} /><circle cx={46} cy={-58} r={11} fill={C.cheek} opacity={0.65} />
          {open > 0.02
            ? (<g><ellipse cx={0} cy={-44} rx={15 + open * 3} ry={4 + open * 15} fill="#8B2635" {...LINE} /><ellipse cx={0} cy={-38 + open * 6} rx={8} ry={3 + open * 4} fill="#FF8A9A" /></g>)
            : <path d={pose === 'laugh' ? 'M-20 -50 Q0 -24 20 -50 Z' : 'M-16 -48 Q0 -34 16 -48'} fill={pose === 'laugh' ? '#8B2635' : 'none'} {...LINE} />}
        </g>
      </g>
    </g>
  );
}
