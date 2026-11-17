// One composition, three versions: bilingual (KZ line, then PL line), KZ only, PL only.
// Pure SVG in a 1080×1920 viewBox: Remotion's `scale` renders it at 4K (and scripts/export-32k.mjs at 32K) without blur.
import { AbsoluteFill, Html5Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import sb from '../storyboard/storyboard.json';
import timing from './timing.json';
import { mouth } from './anim';
import { SCENES } from './Scenes';
import { Background, Header, SceneCard, Subtitles } from './components/UI';
import { pop } from './anim';

export type Mode = 'bilingual' | 'kz' | 'pl';
type Line = { lang: string; file: string; at: number; dur: number; text: string; speaker: string };
type Sc = { id: string; from: number; dur: number; lines: Line[] };
const SFX: Record<string, { file: string; at: number; vol: number; dur?: number }[]> = {
  s1: [{ file: 'birds', at: 0.2, vol: 0.35 }],
  s2: [{ file: 'roar', at: 1.2, vol: 0.35 }, { file: 'pop', at: 0.6, vol: 0.5 }, { file: 'pop', at: 1.4, vol: 0.5 }],
  s3: [{ file: 'pop', at: 0.7, vol: 0.5 }, { file: 'toot', at: 1.3, vol: 0.32 }, { file: 'pop', at: 1.6, vol: 0.5 }],
  s4: [{ file: 'water', at: 0, vol: 0.3 }, { file: 'pop', at: 0.8, vol: 0.55 }],
  s5: [{ file: 'water', at: 0, vol: 0.25 }, { file: 'splash', at: 1.4, vol: 0.6 }, { file: 'splash', at: 2.9, vol: 0.6 }, { file: 'pop', at: 1.0, vol: 0.5 }],
  s6: [{ file: 'chime', at: 0.15, vol: 0.45 }]
};
const NAMES: Record<string, Record<string, string>> = { kz: { aisha: 'Айша', arman: 'Арман' }, pl: { aisha: 'Ajsza', arman: 'Arman' } };

/** The picture of one frame: a pure function of (mode, frame), so scripts/export-32k.mjs can render it to a .svg file. */
export function FrameSVG({ mode, frame, fps }: { mode: Mode; frame: number; fps: number }) {
  const tl = (timing as unknown as Record<Mode, { total: number; scenes: Sc[] }>)[mode];
  const t = frame / fps, i = Math.max(0, tl.scenes.findIndex((s) => t >= s.from && t < s.from + s.dur));
  const sc = tl.scenes[i] ?? tl.scenes[tl.scenes.length - 1], meta = sb.scenes[i], Scene = SCENES[i];
  const local = frame - Math.round(sc.from * fps);
  // who is talking now (lip-sync), and the subtitle lines
  const m = { aisha: 0, arman: 0 };
  for (const l of sc.lines) (m as Record<string, number>)[l.speaker] = Math.max((m as Record<string, number>)[l.speaker], mouth(local, fps, l.file, l.at));
  const subs = sc.id === 's6' ? [] : sc.lines.map((l) => ({ lang: l.lang, speaker: NAMES[l.lang][l.speaker], text: l.text, active: mode !== 'bilingual' || (local / fps >= l.at - 0.1 && local / fps < l.at + l.dur + (sc.lines.length > 1 && l.lang === 'kz' ? 0.3 : 9)) }));
  // scene transitions: a quick dip-to-white with a small scale settle
  const fadeIn = interpolate(local, [0, 0.28 * fps], [0, 1], { extrapolateRight: 'clamp' }), fadeOut = interpolate(local, [sc.dur * fps - 0.22 * fps, sc.dur * fps], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const last = i === tl.scenes.length - 1, vis = Math.min(fadeIn, last ? 1 : fadeOut);
  const pick = (o: { kz: string; pl: string }) => (mode === 'pl' ? { kz: o.pl, pl: o.kz } : o);   // the version's language goes first
  const ui = meta.ui as { type: string; text?: { kz: string; pl: string } }[];
  const titleUI = ui.find((u) => u.type === 'title')?.text, ctaUI = ui.find((u) => u.type === 'cta')?.text, plateUI = ui.find((u) => u.type === 'plate')?.text;
  const head = pick(sb.title);
  return (
      <svg viewBox="0 0 1080 1920" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" shapeRendering="geometricPrecision" textRendering="geometricPrecision">
        <Background />
        <SceneCard>
          <g opacity={vis} transform={`translate(500 643) scale(${0.985 + 0.015 * fadeIn}) translate(-500 -643)`}>
            <Scene f={local} fps={fps} dur={sc.dur} mouth={m} title={titleUI && pick(titleUI)} cta={ctaUI && pick(ctaUI)} plate={plateUI && pick(plateUI)} />
          </g>
          <rect width={1000} height={1286} fill="#FFFFFF" opacity={1 - vis} />
        </SceneCard>
        <Header kz={head.kz} pl={head.pl} k={pop(frame, fps, 0.05, 13)} />
        <Subtitles items={subs} k={interpolate(local, [0.15 * fps, 0.4 * fps], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
      </svg>
  );
}

export function ZooVideo({ mode }: { mode: Mode }) {
  const frame = useCurrentFrame(), { fps, durationInFrames } = useVideoConfig();
  const tl = (timing as unknown as Record<Mode, { total: number; scenes: Sc[] }>)[mode];
  const speech = tl.scenes.flatMap((s) => s.lines.map((l) => [s.from + l.at, s.from + l.at + l.dur]));
  return (
    <AbsoluteFill>
      <FrameSVG mode={mode} frame={frame} fps={fps} />
      {tl.scenes.map((s) => (
        <Sequence key={s.id} from={Math.round(s.from * fps)} durationInFrames={Math.round(s.dur * fps)} layout="none">
          {s.lines.map((l) => <Sequence key={l.file} from={Math.round(l.at * fps)} layout="none"><Html5Audio src={staticFile(l.file)} volume={1} /></Sequence>)}
          {(SFX[s.id] ?? []).map((x, k) => <Sequence key={k} from={Math.round(x.at * fps)} layout="none"><Html5Audio src={staticFile(`audio/fx/${x.file}.wav`)} volume={x.vol} /></Sequence>)}
        </Sequence>
      ))}
      {/* music bed, ducked under the voices, faded out at the end */}
      <Html5Audio src={staticFile('audio/fx/music.wav')} volume={(f) => {
        const tt = f / fps, talking = speech.some(([a, b]) => tt > a - 0.15 && tt < b + 0.15);
        return (talking ? 0.1 : 0.24) * interpolate(f, [durationInFrames - fps * 1.2, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      }} />
    </AbsoluteFill>
  );
}
