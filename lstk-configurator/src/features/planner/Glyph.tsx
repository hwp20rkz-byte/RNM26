import type { BuildingInput } from "@/domain/buildings/types";

/**
 * End elevation of a building as a small SVG — the catalogue's pictogram,
 * drawn from the product's actual parameters, so it changes with them.
 */
export function Glyph({ input, className }: { input: BuildingInput; className?: string }) {
  const W = input.width;
  const a = (input.roof.pitchDeg * Math.PI) / 180;
  const plinth = input.foundation.type === "none" ? 0 : input.foundation.plinth;
  const floors = input.levels.map((l) => l.height + 300);
  const wallTop = plinth + floors.reduce((s, h) => s + h, 0);
  const ov = Math.min(input.roof.overhang, 600) * Math.cos(a);
  const rise = input.roof.type === "mono" ? input.roof.heelHeight + W * Math.tan(a) : (W / 2) * Math.tan(a);
  const total = wallTop + rise + 200;
  const pad = 400;
  const vbW = W + 2 * ov + 2 * pad;
  const vbH = total + pad;
  const X = (x: number) => x + ov + pad;
  const Y = (y: number) => vbH - pad / 2 - y;
  const roof =
    input.roof.type === "gable"
      ? [
          [-ov, wallTop - ov * Math.tan(a)],
          [W / 2, wallTop + rise],
          [W + ov, wallTop - ov * Math.tan(a)],
        ]
      : [
          [-ov, wallTop + input.roof.heelHeight - ov * Math.tan(a)],
          [W + ov, wallTop + input.roof.heelHeight + (W + ov) * Math.tan(a)],
        ];
  let y = plinth;
  const side = input.levels[0]!.sides.left.type;
  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className={className} aria-hidden="true">
      <line x1={0} x2={vbW} y1={Y(0)} y2={Y(0)} stroke="currentColor" strokeWidth={60} opacity={0.35} />
      {plinth > 0 && <rect x={X(0)} y={Y(plinth)} width={W} height={plinth} fill="currentColor" opacity={0.45} />}
      {input.levels.map((l, i) => {
        const base = y;
        y += floors[i]!;
        const t = i === 0 ? side : "wall";
        if (t === "wall") return <rect key={i} x={X(0)} y={Y(base + floors[i]!)} width={W} height={floors[i]!} fill="currentColor" opacity={0.18} stroke="currentColor" strokeWidth={70} />;
        return (
          <g key={i}>
            <rect x={X(0)} y={Y(base + floors[i]!)} width={120} height={floors[i]!} fill="currentColor" />
            <rect x={X(W - 120)} y={Y(base + floors[i]!)} width={120} height={floors[i]!} fill="currentColor" />
            {t === "half" && <rect x={X(0)} y={Y(base + input.parapet)} width={W} height={input.parapet} fill="currentColor" opacity={0.3} />}
          </g>
        );
      })}
      {/* Gable infill, then the roof as a band 250 mm thick */}
      {input.roof.type === "gable" && side === "wall" && <polygon points={`${X(0)},${Y(wallTop)} ${X(W / 2)},${Y(wallTop + rise)} ${X(W)},${Y(wallTop)}`} fill="currentColor" opacity={0.12} />}
      <polygon points={[...roof, ...[...roof].reverse().map(([px, py]) => [px!, py! - 250])].map(([px, py]) => `${X(px!)},${Y(py!)}`).join(" ")} fill="hsl(var(--accent))" />
    </svg>
  );
}
