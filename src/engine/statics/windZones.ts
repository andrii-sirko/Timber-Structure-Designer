/**
 * Local net pressure coefficients c_p,net of a monopitch canopy (EN 1991-1-4 Table 7.6, blockage
 * φ = 0) for the zones A (interior), B and C (edge strips one tenth of the plan dimension wide).
 * They cover all wind directions and apply to local elements and their fixings (rafter bearings,
 * roofing), whereas the overall c_f (canopyForceCoefficients) applies to the structure as a whole.
 * Rows: pitch °, then [down, up] per zone.
 */
const TABLE: [number, [number, number], [number, number], [number, number]][] = [
  [0, [0.5, -0.6], [1.8, -1.3], [1.1, -1.4]],
  [5, [0.8, -1.1], [2.1, -1.7], [1.3, -1.8]],
  [10, [1.2, -1.5], [2.4, -2.0], [1.6, -2.1]],
  [15, [1.4, -1.8], [2.7, -2.4], [1.8, -2.5]],
  [20, [1.7, -2.2], [2.9, -2.8], [2.1, -2.9]],
  [25, [2.0, -2.6], [3.1, -3.2], [2.3, -3.2]],
  [30, [2.2, -3.0], [3.2, -3.8], [2.4, -3.6]],
];

export interface CanopyZones {
  /** Interior zone A */
  interior: { down: number; up: number };
  /** Worst of the edge zones B and C (strips along every roof edge) */
  edge: { down: number; up: number };
}

export function canopyLocalCoefficients(pitchDeg: number): CanopyZones {
  const a = Math.min(Math.max(Math.abs(pitchDeg), 0), 30);
  let i = 1;
  while (i < TABLE.length - 1 && a > TABLE[i][0]) i++;
  const [a0, ...z0] = TABLE[i - 1];
  const [a1, ...z1] = TABLE[i];
  const t = (a - a0) / (a1 - a0);
  const lerp = (zone: number, k: 0 | 1) => z0[zone][k] + t * (z1[zone][k] - z0[zone][k]);
  return {
    interior: { down: lerp(0, 0), up: lerp(0, 1) },
    edge: { down: Math.max(lerp(1, 0), lerp(2, 0)), up: Math.min(lerp(1, 1), lerp(2, 1)) },
  };
}

/** Width (mm) of the edge strips: one tenth of the plan dimension across the edge. */
export function edgeStripWidth(lengthAcross: number): number {
  return lengthAcross / 10;
}
