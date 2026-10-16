import type { NormValues } from '../config/norms';

// Самая длинная направляющая из ряда, которая помещается во внутреннюю глубину корпуса
// (от задней стенки до переднего края) с технологическим запасом. null — не помещается ни одна.
export function selectRunnerLength(innerDepth: number, n: NormValues): number | null {
  const fits = n.runnerLengths.filter((l) => l <= innerDepth - n.runnerDepthClearance);
  return fits.length ? Math.max(...fits) : null;
}
