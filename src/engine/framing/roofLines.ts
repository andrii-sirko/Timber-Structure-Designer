import type { RoofScheme, StructureParams } from '@/types';

/**
 * Analytical description of the monopitch (Pultdach) roof plane in the canonical frame
 * (slope down towards +Z).
 *
 * 'classic': the rafters rest on the front purlin (top at H1) and the rear purlin (top at H2)
 * with a birdsmouth (Kerve). The vertical face of the birdsmouth bears against the downhill
 * face of each purlin; the rafter's bottom edge passes `t / cos α` below the purlin top there.
 *
 * 'sloped-purlins': every purlin runs down the slope along Z; its top follows `purlinTopAt`
 * (H1 at the front post axis, H2 at the rear post axis). Level rafters lie across on top of
 * the purlins, so the rafter underside plane IS the purlin top plane and there is no birdsmouth.
 */
export interface RoofLines {
  scheme: RoofScheme;
  /** Pitch angle in radians, positive – roof slopes down towards +Z (rear). */
  alpha: number;
  pitchDeg: number;
  cos: number;
  sin: number;
  tan: number;
  /** Birdsmouth depth perpendicular to the rafter (mm); 0 for sloped purlins */
  birdsmouth: number;
  /** Front / rear post axis positions along Z (classic: the eave purlin axes) */
  frontPurlinZ: number;
  rearPurlinZ: number;
  /** classic: intermediate purlin axes along Z (front → rear); empty for sloped purlins */
  midPurlinZ: number[];
  /** sloped-purlins: intermediate purlin rows along X (left → right); empty for classic */
  midPurlinX: number[];
  /** classic: every purlin row front → rear (axis Z and purlin top); empty for sloped purlins */
  purlins: { z: number; top: number }[];
  /** Top of the purlin plane at world Z (classic: purlin top of a row at that Z; sloped: top of every purlin) */
  purlinTopAt: (z: number) => number;
  /** Height of the rafter bottom edge at a given world Z */
  bottomAt: (z: number) => number;
  /** Height of the rafter top edge at a given world Z */
  topAt: (z: number) => number;
  /** Underside of the sloped member on a side wall (classic: side rail, sloped: purlin) at world Z – top of side-wall studs */
  railBottomAt: (z: number) => number;
  /** Top of that sloped member at world Z (= rafter underside) */
  railTopAt: (z: number) => number;
  /** Vertical thickness of a rafter measured plumb (classic: h / cos α, level rafters: h) */
  rafterPlumbHeight: number;
}

export function computeRoofLines(params: StructureParams): RoofLines {
  const { timber } = params;
  const pw = timber.post.width;
  const bw = timber.beam.width;
  const bh = timber.beam.height;
  const rh = timber.rafter.height;
  const scheme = params.roofScheme;

  const frontPurlinZ = pw / 2;
  const rearPurlinZ = params.width - pw / 2;
  const run = Math.max(rearPurlinZ - frontPurlinZ, 1);
  const rise = params.frontHeight - params.rearHeight;
  const alpha = Math.atan2(rise, run);
  const cos = Math.cos(alpha);
  const sin = Math.sin(alpha);
  const tan = Math.tan(alpha);
  const purlinTopAt = (z: number): number => params.frontHeight - tan * (z - frontPurlinZ);

  if (scheme === 'sloped-purlins') {
    const bottomAt = purlinTopAt;
    const topAt = (z: number): number => bottomAt(z) + rh;
    const railBottomAt = (z: number): number => purlinTopAt(z) - bh / cos;
    const xBounds = midPurlinBounds(params);
    const midPurlinX = applyMidPurlinOverrides(
      computeMidRows(params.length + params.overhangs.left + params.overhangs.right, params.maxRafterLength, MAX_MID_PURLINS, { ...xBounds, origin: -params.overhangs.left }),
      params.midPurlinPositions,
      xBounds,
    );
    return {
      scheme,
      alpha,
      pitchDeg: (alpha * 180) / Math.PI,
      cos,
      sin,
      tan,
      birdsmouth: 0,
      frontPurlinZ,
      rearPurlinZ,
      midPurlinZ: [],
      midPurlinX,
      purlins: [],
      purlinTopAt,
      bottomAt,
      topAt,
      railBottomAt,
      railTopAt: purlinTopAt,
      rafterPlumbHeight: rh,
    };
  }

  // Kerventiefe: quarter of the rafter depth, never below 20 mm, capped at h/3
  const birdsmouth = Math.min(Math.max(Math.round(rh / 4), 20), Math.floor(rh / 3));
  const plumbDrop = birdsmouth / cos;

  // Bottom edge passes plumbDrop below the front purlin top at its downhill face
  const zRef = frontPurlinZ + bw / 2;
  const yRef = params.frontHeight - plumbDrop;
  const bottomAt = (z: number): number => yRef - tan * (z - zRef);
  const rafterPlumbHeight = rh / cos;
  const topAt = (z: number): number => bottomAt(z) + rafterPlumbHeight;
  const railTopAt = bottomAt;
  const railBottomAt = (z: number): number => bottomAt(z) - bh / cos;

  const midPurlinZ = computeMidPurlinZ(params, cos);
  const purlins = [frontPurlinZ, ...midPurlinZ, rearPurlinZ].map((z) => ({ z, top: purlinTopAt(z) }));

  return {
    scheme,
    alpha,
    pitchDeg: (alpha * 180) / Math.PI,
    cos,
    sin,
    tan,
    birdsmouth,
    frontPurlinZ,
    rearPurlinZ,
    midPurlinZ,
    midPurlinX: [],
    purlins,
    purlinTopAt,
    bottomAt,
    topAt,
    railBottomAt,
    railTopAt,
    rafterPlumbHeight,
  };
}

/** Hard cap on intermediate purlin rows – beyond this the input is unreasonable, not the roof. */
export const MAX_MID_PURLINS = 4;

/**
 * Axis positions of the intermediate purlins (classic). The full sloped rafter (tail to tail)
 * is divided into equal pieces no longer than `maxRafterLength`; each split lands on a purlin
 * axis. Splits are kept clear of the eave purlins, so with large overhangs a piece can still
 * exceed the limit (the framing generator warns about that).
 */
export function computeMidPurlinZ(params: StructureParams, cos: number): number[] {
  const z0 = -params.overhangs.front;
  const z1 = params.width + params.overhangs.rear;
  const bounds = midPurlinBounds(params);
  return applyMidPurlinOverrides(
    computeMidRows((z1 - z0) / cos, params.maxRafterLength, MAX_MID_PURLINS, { ...bounds, origin: z0, cos }),
    params.midPurlinPositions,
    bounds,
  );
}

/**
 * Range an intermediate purlin axis may occupy along its perpendicular axis (canonical frame):
 * at least one purlin width plus 100 mm clear of the eave rows and of its neighbours.
 */
export function midPurlinBounds(params: StructureParams): { lo: number; hi: number; minGap: number } {
  const pw = params.timber.post.width;
  const minGap = params.timber.beam.width + 100;
  const span = params.roofScheme === 'sloped-purlins' ? params.length : params.width;
  return { lo: pw / 2 + minGap, hi: span - pw / 2 - minGap, minGap };
}

/**
 * Replace automatic split positions by the user's manual ones (index-matched). Each override is
 * clamped inside the bounds and kept `minGap` clear of the neighbouring rows so the row order
 * (and with it the `mid<i>` post override keys) never changes.
 */
export function applyMidPurlinOverrides(defaults: number[], overrides: (number | null)[] | undefined, bounds: { lo: number; hi: number; minGap: number }): number[] {
  if (!overrides?.length) return defaults;
  const out = defaults.slice();
  for (let i = 0; i < out.length; i++) {
    const o = overrides[i];
    if (o === null || o === undefined || !Number.isFinite(o)) continue;
    const min = i > 0 ? out[i - 1] + bounds.minGap : bounds.lo;
    const max = i < out.length - 1 ? out[i + 1] - bounds.minGap : bounds.hi;
    out[i] = Math.round(Math.min(Math.max(o, min), Math.max(min, max)));
  }
  return out;
}

/**
 * Equal subdivision of a rafter of `total` length into pieces ≤ `limit`, returning the split
 * positions along the axis measured from `origin` (in plan), clamped to [lo, hi].
 */
function computeMidRows(total: number, maxLength: number, cap: number, opts: { lo: number; hi: number; origin: number; minGap: number; cos?: number }): number[] {
  const limit = Math.max(maxLength, 1000);
  const n = Math.min(Math.max(Math.ceil(total / limit) - 1, 0), cap);
  if (n === 0 || opts.hi <= opts.lo) return [];
  const plan = total * (opts.cos ?? 1);
  const result: number[] = [];
  for (let k = 1; k <= n; k++) {
    const p = Math.round(Math.min(Math.max(opts.origin + (k * plan) / (n + 1), opts.lo), opts.hi));
    if (result.length === 0 || p - result[result.length - 1] >= opts.minGap) result.push(p);
  }
  return result;
}
