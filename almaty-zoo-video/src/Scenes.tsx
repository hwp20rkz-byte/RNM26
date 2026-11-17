// The six scenes of storyboard.json, in the card's local space (1000 × 1286). Every scene gets its own time `t`
// (seconds from the scene start), the duration, and who is talking (mouth openings from the lip-sync envelopes).
import { blink, pop, ramp, wave } from './anim';
import { Beaver, Cub, Elephant, Giraffe, Lion, SnowLeopard } from './components/Animals';
import { Kid } from './components/Kids';
import { Arch, Books, Cloud, Cup, Dam, Fence, FlagKZ, FlagPL, Globe, Grass, Mountains, Pond, Rocks, Sky, Splash, Tree } from './components/Scenery';
import { CTA, Plate, VocabCard } from './components/UI';
import { C, FONT, INK, LINE } from './theme';

export interface SceneProps { f: number; fps: number; dur: number; mouth: { aisha: number; arman: number }; title?: { kz: string; pl: string }; cta?: { kz: string; pl: string }; plate?: { kz: string; pl: string } }
const T = (p: SceneProps) => p.f / p.fps;
/** Camera: zoom `z` about (cx, cy) plus a pan. Returns the SVG transform and a point mapper for the UI pointers. */
function camera(z: number, cx: number, cy: number, dx = 0, dy = 0) {
  return { tr: `translate(${cx + dx} ${cy + dy}) scale(${z}) translate(${-cx} ${-cy})`, at: (x: number, y: number): [number, number] => [cx + dx + (x - cx) * z, cy + dy + (y - cy) * z] };
}

export function Scene1(p: SceneProps) {
  const t = T(p), cam = camera(1 + 0.06 * ramp(p.f, p.fps, 0, p.dur), 500, 700, 0, -18 * ramp(p.f, p.fps, 0, p.dur));
  return (
    <g>
      <g transform={cam.tr}>
        <Sky t={t} />
        <Mountains y={560} />
        {[[90, 830], [910, 840], [780, 800]].map(([x, y], i) => <Tree key={i} x={x} y={y} s={1.05} t={t} dark={i === 1} />)}
        <Grass y={800} />
        <path d="M380 770 L620 770 L860 1300 L140 1300 Z" fill={C.sand} {...LINE} />
        <Arch t={t} sign="Алматы хайуанаттар бағы" />
        {[[70, 1040], [930, 1060]].map(([x, y], i) => <g key={i} transform={`translate(${x} ${y})`}><circle r={40} fill={C.coral} {...LINE} /><circle r={16} fill={C.amber} {...LINE} /></g>)}
        <Kid who="aisha" x={320} y={1250} s={0.95} t={t} mouth={p.mouth.aisha} eyes={blink(p.f, p.fps, 1)} pose="wave" />
        <Kid who="arman" x={690} y={1262} s={0.98} t={t + 0.4} mouth={p.mouth.arman} eyes={blink(p.f, p.fps, 4)} pose={t > 0.8 ? 'wave' : 'idle'} flip />
      </g>
    </g>
  );
}

export function Scene2(p: SceneProps) {
  const t = T(p), z = 1 + 0.12 * ramp(p.f, p.fps, 0, p.dur), cam = camera(z, 480, 760);
  return (
    <g>
      <g transform={cam.tr}>
        <Sky t={t + 5} />
        <Mountains y={520} s={0.85} />
        <path d="M-20 760 Q500 700 1020 780 L1020 1300 L-20 1300 Z" fill={C.sand} {...LINE} />
        <path d="M520 800 Q760 760 1020 800 L1020 1300 L480 1300 Z" fill="#FCD34D" opacity={0.6} />
        <Tree x={900} y={880} s={0.9} t={t} />
        <Rocks x={300} y={820} s={1.05} />
        <SnowLeopard x={300} y={560} s={0.82} t={t} eyes={blink(p.f, p.fps, 2)} />
        <Lion x={650} y={1060} s={0.85} t={t} eyes={blink(p.f, p.fps, 5)} />
        <Fence y={1180} from={-20} to={1020} />
        <Kid who="arman" x={150} y={1290} s={0.78} t={t} mouth={p.mouth.arman} eyes={blink(p.f, p.fps, 4)} pose="point" />
      </g>
      <VocabCard x={480} y={250} kind="leopard" kz="Қар барысы" pl="Pantera śnieżna" k={pop(p.f, p.fps, 0.6)} k2={ramp(p.f, p.fps, 0.75, 1.3)} to={cam.at(200, 430)} />
      <VocabCard x={60} y={600} kind="lion" kz="Арыстан" pl="Lew" k={pop(p.f, p.fps, 1.4)} k2={ramp(p.f, p.fps, 1.55, 2.1)} to={cam.at(745, 900)} />
    </g>
  );
}

export function Scene3(p: SceneProps) {
  const t = T(p), cam = camera(1.05, 500, 700, 0, -120 * (1 - ramp(p.f, p.fps, 0, 1.8)));
  return (
    <g>
      <g transform={cam.tr}>
        <Sky t={t + 10} />
        <Mountains y={600} s={0.7} />
        <Grass y={880} color={C.lime} />
        <Tree x={170} y={820} s={1.35} t={t} dark />
        <Tree x={930} y={900} s={0.8} t={t} />
        <Giraffe x={330} y={1150} s={0.8} t={t} eyes={blink(p.f, p.fps, 3)} />
        <Elephant x={770} y={1130} s={0.74} t={t} eyes={blink(p.f, p.fps, 6)} lift={ramp(p.f, p.fps, 1.0, 2.0)} />
        <Kid who="aisha" x={430} y={1290} s={0.7} t={t} mouth={p.mouth.aisha} eyes={blink(p.f, p.fps, 1)} pose="look" />
      </g>
      <VocabCard x={500} y={240} kind="giraffe" kz="Керік" pl="Żyrafa" k={pop(p.f, p.fps, 0.7)} k2={ramp(p.f, p.fps, 0.85, 1.4)} to={cam.at(300, 585)} />
      <VocabCard x={520} y={560} kind="elephant" kz="Піл" pl="Słoń" k={pop(p.f, p.fps, 1.6)} k2={ramp(p.f, p.fps, 1.75, 2.3)} to={cam.at(660, 940)} />
    </g>
  );
}

export function Scene4(p: SceneProps) {
  const t = T(p), k = ramp(p.f, p.fps, 0, p.dur), cam = camera(1 + 0.08 * k, 500, 900, 60 * (1 - k), 0);
  return (
    <g>
      <g transform={cam.tr}>
        <Sky t={t + 15} />
        <Mountains y={470} s={0.7} />
        {[[80, 700], [260, 680], [760, 690], [940, 700]].map(([x, y], i) => <Tree key={i} x={x} y={y} s={0.8} t={t} dark={i % 2 === 0} />)}
        <Grass y={680} />
        <Pond t={t} y={770} />
        <Dam x={640} y={880} />
        <rect x={300} y={980} width={380} height={56} rx={28} fill={C.wood} {...LINE} /><circle cx={652} cy={1008} r={22} fill="#F1C48A" {...LINE} />
        <Beaver x={490} y={990} s={0.82} t={t} eyes={blink(p.f, p.fps, 7)} />
        <Kid who="arman" x={140} y={1290} s={0.72} t={t} mouth={p.mouth.arman} eyes={blink(p.f, p.fps, 4)} pose="point" />
      </g>
      <VocabCard x={150} y={250} kind="beaver" kz="Құндыз — «Bober»" pl="Bóbr — «Bober»" big k={pop(p.f, p.fps, 0.8)} k2={ramp(p.f, p.fps, 1.0, 1.6)} to={cam.at(480, 690)} />
    </g>
  );
}

export function Scene5(p: SceneProps) {
  const t = T(p), slapAt = [1.4, 2.9], slapK = slapAt.map((a) => (t - a) / 0.9).find((v) => v > 0 && v < 1) ?? 0;
  const tail = slapAt.some((a) => t > a - 0.25 && t < a + 0.05) ? 1 : 0;
  const shake = slapK > 0 && slapK < 0.2 ? Math.sin(t * 90) * 6 * (1 - slapK * 5) : 0;
  const cam = camera(1.05 + 0.1 * ramp(p.f, p.fps, 0, p.dur), 500, 800, shake, 0);
  return (
    <g>
      <g transform={cam.tr}>
        <Sky t={t + 20} />
        {[[120, 620], [880, 630]].map(([x, y], i) => <Tree key={i} x={x} y={y} s={0.9} t={t} dark={!!i} />)}
        <Grass y={600} />
        <Pond t={t} y={640} />
        <Beaver x={480} y={960} s={1.25} t={t} eyes={blink(p.f, p.fps, 7)} waveAmt={ramp(p.f, p.fps, 0.2, 0.6)} slap={tail} />
        <Splash x={690} y={930} k={slapK} />
        <Kid who="aisha" x={120} y={1300} s={0.6} t={t} mouth={p.mouth.aisha} eyes={blink(p.f, p.fps, 1)} pose="laugh" />
        <Kid who="arman" x={880} y={1300} s={0.6} t={t + 0.3} mouth={p.mouth.arman} eyes={blink(p.f, p.fps, 4)} pose="laugh" flip />
      </g>
      {p.plate && <Plate kz={p.plate.kz} pl={p.plate.pl} k={pop(p.f, p.fps, 1.0, 13)} />}
    </g>
  );
}

export function Scene6(p: SceneProps) {
  const t = T(p), bob = (ph: number) => wave(p.f, p.fps, 0.5, ph) * 12;
  const title = p.title!, tk = pop(p.f, p.fps, 0.2);
  return (
    <g>
      <defs><linearGradient id="outro" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7DD3FC" /><stop offset="1" stopColor="#FEF3C7" /></linearGradient></defs>
      <rect width={1000} height={1286} fill="url(#outro)" />
      {Array.from({ length: 18 }, (_, i) => { const a = (i / 18) * Math.PI * 2 + t * 0.15; return <path key={i} d={`M500 760 L${500 + Math.cos(a) * 900} ${760 + Math.sin(a) * 900} L${500 + Math.cos(a + 0.12) * 900} ${760 + Math.sin(a + 0.12) * 900} Z`} fill={C.white} opacity={0.18} />; })}
      <Mountains y={1000} s={0.75} />
      <path d="M-20 1120 Q500 1060 1020 1120 L1020 1300 L-20 1300 Z" fill={C.grass} {...LINE} />
      <g transform={`translate(0 ${bob(0)})`}><Cloud x={190} y={470} s={1.15} /><g transform="translate(118 410)"><FlagKZ w={150} /></g></g>
      <g transform={`translate(0 ${bob(1.6)})`}><Cloud x={810} y={460} s={1.15} /><g transform="translate(740 404)"><FlagPL w={140} /></g></g>
      <Globe x={500} y={860} r={210} t={t} />
      <Cub x={500} y={662} s={0.95} t={t} eyes={blink(p.f, p.fps, 9)} />
      <Books x={150} y={1130} /><Cup x={850} y={1120} />
      <g transform={`translate(500 ${150 - (1 - tk) * 120})`} opacity={Math.min(1, tk * 1.4)}>
        <rect x={-460} y={-96} width={920} height={196} rx={44} fill={C.white} filter="url(#lift)" />
        <rect x={-460} y={-96} width={920} height={196} rx={44} fill="none" {...LINE} />
        <text x={0} y={-14} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={52} fill={C.blue}>{title.kz}</text>
        <text x={0} y={56} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={46} fill={C.coralD}>{title.pl}</text>
      </g>
      {p.cta && <CTA kz={p.cta.kz} pl={p.cta.pl} k={pop(p.f, p.fps, 0.8)} pulse={Math.max(0, wave(p.f, p.fps, 1.2))} />}
      <text x={500} y={1262} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={24} fill={INK} opacity={0.55}>Алматы · Ałmaty</text>
    </g>
  );
}

export const SCENES = [Scene1, Scene2, Scene3, Scene4, Scene5, Scene6];
