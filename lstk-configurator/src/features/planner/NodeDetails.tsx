import type { ReactElement } from "react";
import type { NodeType } from "@/domain/buildings/generate";

/**
 * Typical connection details (узлы) drawn to scale in millimetres for the
 * C89×41×11 frame. Plan sections show C profiles as they sit in the wall:
 * the web across the wall thickness, flanges along the faces.
 */

const T = 2; // drawn thickness, exaggerated for legibility
const STEEL = "hsl(var(--ink))";
const OSB = "hsl(35 55% 60%)";
const GKL = "hsl(0 0% 70%)";
const WOOL = "hsl(45 70% 62%)";
const ACC = "hsl(var(--accent))";

/** C section in plan: web along y (wall thickness), flanges along x towards `dir`, lips turned in */
function C({ x, y, dir = 1, w = 89, f = 41, l = 11 }: { x: number; y: number; dir?: 1 | -1; w?: number; f?: number; l?: number }) {
  const fx = x + dir * f;
  return <path d={`M ${fx} ${y + l} L ${fx} ${y} L ${x} ${y} L ${x} ${y + w} L ${fx} ${y + w} L ${fx} ${y + w - l}`} fill="none" stroke={STEEL} strokeWidth={T} />;
}

/** The same C rotated: web along x (horizontal in plan), flanges along y towards `dir` */
function CH({ x, y, dir = 1, w = 89, f = 41, l = 11 }: { x: number; y: number; dir?: 1 | -1; w?: number; f?: number; l?: number }) {
  return (
    <path
      d={`M ${x} ${y + dir * f} L ${x + l} ${y + dir * f} M ${x} ${y + dir * f} L ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + dir * f} M ${x + w} ${y + dir * f} L ${x + w - l} ${y + dir * f}`}
      fill="none"
      stroke={STEEL}
      strokeWidth={T}
    />
  );
}

/**
 * Opening in elevation (schematic, not to scale along the opening): king
 * studs full height, jack studs under the lintel, cripples or a header truss
 * between the lintel and the top plate. Strips are one flange (41) wide.
 */
function OpeningElevation({ kings, jacks, truss, text }: { kings: 1 | 2; jacks: 1 | 2; truss: boolean; text: string }) {
  const W = 300; // clear opening as drawn
  const H = 280;
  const top = 90; // underside of the lintel
  const f = 20;
  const strip = (x: number, y: number, w: number, h: number, color: string, key: string) => <rect key={key} x={x} y={y} width={w} height={h} fill="none" stroke={color} strokeWidth={T} />;
  const posts = (side: -1 | 1) => {
    const out: ReactElement[] = [];
    const edge = side < 0 ? 0 : W;
    let d = 0;
    const put = (full: boolean, key: string) => {
      const x = side < 0 ? edge - d - f : edge + d;
      out.push(strip(x, full ? 0 : top + f, f, full ? H : H - top - f, full ? STEEL : ACC, key));
      d += f + 2;
    };
    for (let j = 0; j < jacks; j++) put(false, `j${side}${j}`);
    for (let k = 0; k < kings; k++) put(true, `k${side}${k}`);
    return { out, reach: d - 2 };
  };
  const l = posts(-1);
  const r = posts(1);
  const jw = jacks * (f + 2) - 2;
  const webs: ReactElement[] = [];
  if (truss) {
    const xs = [-jw / 2, W / 4, W / 2, (3 * W) / 4, W + jw / 2];
    xs.forEach((x, i) => webs.push(strip(x - f / 2, f, f, top - f, STEEL, `v${i}`)));
    for (let i = 0; i < 4; i++) {
      const [x1, y1, x2, y2] = i < 2 ? [xs[i]!, f, xs[i + 1]!, top] : [xs[i]!, top, xs[i + 1]!, f];
      webs.push(<line key={`d${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={ACC} strokeWidth={6} strokeLinecap="round" />);
    }
  } else {
    webs.push(strip(W / 2 - f / 2, f, f, top - f, STEEL, "c"));
  }
  return (
    <>
      {strip(-l.reach, 0, W + l.reach + r.reach, f, STEEL, "plate")}
      {strip(-jw, top, W + 2 * jw, f, STEEL, "lintel")}
      {webs}
      {l.out}
      {r.out}
      {strip(-l.reach, H, W + l.reach + r.reach, f, STEEL, "bottom")}
      <Dim x1={0} y1={H - 30} x2={W} y2={H - 30} text={text} />
    </>
  );
}

function Layer({ x, y, w, h, fill }: { x: number; y: number; w: number; h: number; fill: string }) {
  return <rect x={x} y={y} width={w} height={h} fill={fill} opacity={0.7} />;
}

function Dim({ x1, y1, x2, y2, text }: { x1: number; y1: number; x2: number; y2: number; text: string }) {
  return (
    <g stroke={ACC} fill={ACC} fontSize={14}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={1} />
      <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 4} textAnchor="middle" stroke="none">
        {text}
      </text>
    </g>
  );
}

const views: Record<NodeType, { vb: string; body: ReactElement }> = {
  corner: {
    vb: "-40 -40 300 300",
    body: (
      <>
        {/* long wall along x: OSB outside (y<0), GKL inside */}
        <Layer x={-30} y={-12} w={280} h={9} fill={OSB} />
        <Layer x={89} y={89} w={160} h={12} fill={GKL} />
        {/* end wall along y */}
        <Layer x={-12} y={-12} w={9} h={270} fill={OSB} />
        <Layer x={89} y={89} w={12} h={170} fill={GKL} />
        <Layer x={0} y={0} w={89} h={89} fill={WOOL} />
        <C x={0} y={0} dir={1} />
        <C x={89} y={0} dir={-1} />
        <CH x={0} y={89} dir={1} />
        <circle cx={60} cy={44} r={5} fill={ACC} />
        <Dim x1={0} y1={-26} x2={89} y2={-26} text="89" />
      </>
    ),
  },
  tee: {
    vb: "-40 -40 320 280",
    body: (
      <>
        <Layer x={-30} y={-12} w={300} h={9} fill={OSB} />
        <Layer x={-30} y={89} w={300} h={12} fill={GKL} />
        <C x={76} y={0} dir={-1} />
        <C x={165} y={0} dir={1} />
        <CH x={76} y={89} dir={1} />
        <Layer x={64} y={101} w={12} h={120} fill={GKL} />
        <Layer x={165} y={101} w={12} h={120} fill={GKL} />
        <Dim x1={76} y1={-26} x2={165} y2={-26} text="89" />
      </>
    ),
  },
  cross: { vb: "0 0 10 10", body: <></> },
  "opening-single": { vb: "-140 -40 580 340", body: <OpeningElevation kings={1} jacks={1} truss={false} text="≤ 600" /> },
  "opening-double": { vb: "-140 -40 580 340", body: <OpeningElevation kings={2} jacks={1} truss text="600–2400" /> },
  "opening-truss": { vb: "-180 -40 660 340", body: <OpeningElevation kings={2} jacks={2} truss text="> 2400" /> },

  "base-anchor": {
    vb: "-80 -160 320 260",
    body: (
      <>
        <rect x={-60} y={0} width={240} height={80} fill="hsl(0 0% 75%)" opacity={0.6} />
        <rect x={-5} y={-4} width={99} height={4} fill="hsl(var(--ink))" opacity={0.6} />
        <path d={`M 0 -41 L 0 -4 L 89 -4 L 89 -41`} fill="none" stroke={STEEL} strokeWidth={T * 1.5} />
        <line x1={44} y1={-60} x2={44} y2={70} stroke={ACC} strokeWidth={8} />
        <rect x={30} y={-12} width={28} height={6} fill={ACC} />
        <Dim x1={44} y1={-120} x2={44} y2={-60} text="M12" />
      </>
    ),
  },
  "hold-down": {
    vb: "-80 -320 280 400",
    body: (
      <>
        <rect x={-60} y={0} width={200} height={60} fill="hsl(0 0% 75%)" opacity={0.6} />
        <rect x={0} y={-300} width={41} height={300} fill="none" stroke={STEEL} strokeWidth={T} />
        <rect x={41} y={-260} width={30} height={250} fill={ACC} opacity={0.8} />
        <line x1={56} y1={-10} x2={56} y2={50} stroke={ACC} strokeWidth={10} />
      </>
    ),
  },
  "truss-heel": {
    vb: "-80 -240 480 320",
    body: (
      <>
        <rect x={-20} y={0} width={130} height={41} fill="none" stroke={STEEL} strokeWidth={T} />
        <line x1={-60} y1={-20} x2={360} y2={-220} stroke={STEEL} strokeWidth={8} />
        <line x1={0} y1={-10} x2={360} y2={-10} stroke={STEEL} strokeWidth={8} />
        <line x1={100} y1={-10} x2={100} y2={-70} stroke={STEEL} strokeWidth={6} />
        <rect x={60} y={-50} width={40} height={90} fill={ACC} opacity={0.8} />
      </>
    ),
  },
  "truss-ridge": {
    vb: "-220 -200 440 260",
    body: (
      <>
        <line x1={-200} y1={0} x2={0} y2={-150} stroke={STEEL} strokeWidth={8} />
        <line x1={200} y1={0} x2={0} y2={-150} stroke={STEEL} strokeWidth={8} />
        <line x1={0} y1={-150} x2={0} y2={40} stroke={STEEL} strokeWidth={6} />
        <circle cx={-12} cy={-130} r={6} fill={ACC} />
        <circle cx={12} cy={-130} r={6} fill={ACC} />
      </>
    ),
  },
  "floor-bearing": {
    vb: "-80 -360 420 440",
    body: (
      <>
        <rect x={0} y={0} width={89} height={300} fill="none" stroke={STEEL} strokeWidth={T} />
        <line x1={0} y1={-20} x2={330} y2={-20} stroke={STEEL} strokeWidth={8} />
        <line x1={0} y1={-300} x2={330} y2={-300} stroke={STEEL} strokeWidth={8} />
        <line x1={40} y1={-20} x2={40} y2={-300} stroke={STEEL} strokeWidth={6} />
        <line x1={40} y1={-20} x2={200} y2={-300} stroke={STEEL} strokeWidth={5} />
        <rect x={89} y={-60} width={30} height={60} fill={ACC} opacity={0.8} />
        <Layer x={0} y={-330} w={330} h={22} fill={OSB} />
      </>
    ),
  },
  "strap-brace": {
    vb: "-40 -40 680 360",
    body: (
      <>
        <rect x={0} y={0} width={600} height={280} fill="none" stroke={STEEL} strokeWidth={T} />
        {[0, 300, 600].map((x) => (
          <line key={x} x1={x} y1={0} x2={x} y2={280} stroke={STEEL} strokeWidth={T} />
        ))}
        <line x1={0} y1={280} x2={600} y2={0} stroke={ACC} strokeWidth={6} />
        <line x1={0} y1={0} x2={600} y2={280} stroke={ACC} strokeWidth={6} />
      </>
    ),
  },
};

export function NodeDetail({ type, className }: { type: NodeType; className?: string }) {
  const v = views[type];
  return (
    <svg viewBox={v.vb} className={className} role="img" aria-hidden="true">
      {v.body}
    </svg>
  );
}
