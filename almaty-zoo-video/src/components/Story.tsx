// The storybook / feature-animation look, layered over the same scenes: a soft bloom and a warm grade (filter on the
// scene), golden-hour light rays, floating light motes, a vignette; outside the card a dusk gradient. Lines turn from
// near-black to a soft plum (CSS beats SVG presentation attributes, so the art itself is untouched).
const motes = Array.from({ length: 26 }, (_, i) => ({ x: (i * 397) % 1000, y: (i * 619) % 1286, r: 3 + (i % 5) * 1.6, s: 0.4 + (i % 7) * 0.12, ph: i * 1.7 }));

export function StoryDefs({ t }: { t: number }) {
  void t;
  return (
    <g>
      <style>{`.story [stroke="#182232"] { stroke: #3B2440; } .story text[fill="#182232"] { fill: #2B1A3A; }`}</style>
      <defs>
        <filter id="bloom" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          {/* warm grade: a little more saturation, lifted reds, golden highlights */}
          <feColorMatrix in="SourceGraphic" type="saturate" values="1.18" result="sat" />
          <feColorMatrix in="sat" type="matrix" values="1.06 0.02 0 0 0.02  0 1.02 0 0 0.01  0 0 0.94 0 0  0 0 0 1 0" result="warm" />
          {/* bloom: blur the bright parts and add them back with «screen» */}
          <feGaussianBlur in="warm" stdDeviation="7" result="blur" />
          <feColorMatrix in="blur" type="matrix" values="0.75 0 0 0 0  0 0.65 0 0 0  0 0 0.45 0 0  0 0 0 0.3 0" result="glow" />
          <feBlend in="warm" in2="glow" mode="screen" />
        </filter>
        <radialGradient id="vignette" cx="0.5" cy="0.45" r="0.75"><stop offset="0.55" stopColor="#2A1B3D" stopOpacity="0" /><stop offset="1" stopColor="#2A1B3D" stopOpacity="0.55" /></radialGradient>
        <linearGradient id="ray" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFF4C2" stopOpacity="0.55" /><stop offset="1" stopColor="#FFF4C2" stopOpacity="0" /></linearGradient>
        <radialGradient id="mote"><stop offset="0" stopColor="#FFF8D6" stopOpacity="1" /><stop offset="1" stopColor="#FFE08A" stopOpacity="0" /></radialGradient>
        <linearGradient id="storybg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3B2A5C" /><stop offset="0.55" stopColor="#7A4B7E" /><stop offset="1" stopColor="#F2A36B" /></linearGradient>
      </defs>
      <rect width={1080} height={1920} fill="url(#storybg)" />
      {Array.from({ length: 40 }, (_, i) => <circle key={i} cx={(i * 211) % 1080} cy={(i * 137) % 260} r={1.5 + (i % 3)} fill="#FFF4C2" opacity={0.35 + 0.35 * Math.sin(t * 2 + i)} />)}
    </g>
  );
}

export function StoryOverlay({ t, scene }: { t: number; scene: string }) {
  const sway = Math.sin(t * 0.4) * 0.04, rays = scene === 's6' ? 0.6 : 1;
  return (
    <g pointerEvents="none">
      {/* golden-hour rays from the upper right */}
      <g transform={`translate(900 40) rotate(${(sway * 180) / Math.PI})`} opacity={0.5 * rays}>
        {[-0.2, 0.05, 0.3, 0.55, 0.8].map((a, i) => <path key={i} d={`M0 0 L${Math.cos(Math.PI * 0.55 + a) * 1700} ${Math.sin(Math.PI * 0.55 + a) * 1700} L${Math.cos(Math.PI * 0.55 + a + 0.07) * 1700} ${Math.sin(Math.PI * 0.55 + a + 0.07) * 1700} Z`} fill="url(#ray)" />)}
      </g>
      {/* floating light motes */}
      {motes.map((m, i) => {
        const y = (m.y - t * 40 * m.s + 1400) % 1300, x = m.x + Math.sin(t * m.s + m.ph) * 30;
        return <circle key={i} cx={x} cy={y} r={m.r * 2.4} fill="url(#mote)" opacity={0.55 + 0.45 * Math.sin(t * 3 * m.s + m.ph)} />;
      })}
      <rect width={1000} height={1286} fill="#FFB86B" opacity={0.05} />
      <rect width={1000} height={1286} fill="url(#vignette)" />
    </g>
  );
}
