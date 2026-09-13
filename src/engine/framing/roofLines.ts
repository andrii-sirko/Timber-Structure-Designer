import type { StructureParams } from '@/types';

/**
 * Analytical description of the monopitch (Pultdach) roof plane.
 *
 * The rafters rest on the front purlin (top at H1) and the rear purlin (top at H2) with a
 * birdsmouth (Kerve). The vertical face of the birdsmouth bears against the downhill face of
 * each purlin; the rafter's bottom edge passes `t / cos α` below the purlin top at that face.
 */
export interface RoofLines {
  /** Pitch angle in radians, positive – roof slopes down towards +Z (rear). */
  alpha: number;
  pitchDeg: number;
  cos: number;
  sin: number;
  tan: number;
  /** Birdsmouth depth perpendicular to the rafter (mm) */
  birdsmouth: number;
  /** Purlin axis positions along Z */
  frontPurlinZ: number;
  rearPurlinZ: number;
  /** Height of the rafter bottom edge at a given world Z */
  bottomAt: (z: number) => number;
  /** Height of the rafter top edge at a given world Z */
  topAt: (z: number) => number;
  /** Underside of the sloped side rail (Rähm) at a given world Z – top of side-wall studs */
  railBottomAt: (z: number) => number;
  /** Top of the sloped side rail at a given world Z (= rafter underside) */
  railTopAt: (z: number) => number;
  /** Vertical thickness of a rafter measured plumb (h / cos α) */
  rafterPlumbHeight: number;
}

export function computeRoofLines(params: StructureParams): RoofLines {
  const { timber } = params;
  const pw = timber.post.width;
  const bw = timber.beam.width;
  const bh = timber.beam.height;
  const rh = timber.rafter.height;

  const frontPurlinZ = pw / 2;
  const rearPurlinZ = params.width - pw / 2;
  const run = Math.max(rearPurlinZ - frontPurlinZ, 1);
  const rise = params.frontHeight - params.rearHeight;
  const alpha = Math.atan2(rise, run);
  const cos = Math.cos(alpha);
  const sin = Math.sin(alpha);
  const tan = Math.tan(alpha);

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

  return {
    alpha,
    pitchDeg: (alpha * 180) / Math.PI,
    cos,
    sin,
    tan,
    birdsmouth,
    frontPurlinZ,
    rearPurlinZ,
    bottomAt,
    topAt,
    railBottomAt,
    railTopAt,
    rafterPlumbHeight,
  };
}
