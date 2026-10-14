import type { PostBaseType } from '@/types';
import type { MaterialProps } from './materials';

/**
 * H post base (Alberts H-Pfostenträger, ETA-10/0210): two flat bars 80 × 8 mm, 800 mm long,
 * 141 mm apart. The upper 400 mm take the post (Pfosteneinstand), the lower 400 mm are cast
 * into the footing. Two M12 bolts pass through post and both flanges.
 */
export const H_ANCHOR = {
  clearWidth: 141,
  length: 800,
  /** Height of the post inside the flanges (mm) */
  postEmbed: 400,
  /** Flange length cast into the footing (mm) */
  concreteEmbed: 400,
  flangeWidth: 80,
  flangeThickness: 8,
  bolts: 2,
  boltDiameter: 12,
  /** Assumed vertical distance between the two bolts (mm) – lever of the bolt couple */
  boltLever: 200,
} as const;

/** Concrete cover kept below the cast-in flanges (mm) */
const FOOTING_COVER = 50;
/** Minimum footing depth that takes the cast-in part of the H post base (mm) */
export const H_ANCHOR_MIN_FOOTING = H_ANCHOR.concreteEmbed + FOOTING_COVER;

const STEEL_FY = 235; // S235, N/mm²
const GAMMA_M0 = 1.0;
const BOLT_FUK = 400; // property class 4.6, N/mm²
const GAMMA_M_CONNECTION = 1.3;

export interface PostBaseCapacity {
  type: PostBaseType;
  /** Design base moment (kNm) when wind bends the flanges in their own plane (strong axis) */
  momentStrong: number;
  /** Design base moment (kNm) when wind pushes the flanges sideways (weak axis) */
  momentWeak: number;
  /** Design tension (kN) the base connection can hand down to the footing, 0 = not verified */
  tension: number;
  /** Governing mechanism of the strong-axis moment */
  strongGoverning: 'bolts' | 'flanges';
}

/**
 * Load-carrying capacity of one M12 bolt in double shear through the post between two thin
 * steel flanges (EN 1995-1-1 eq. 8.12, rope effect ignored), per bolt, characteristic (N).
 */
function boltCapacity(mat: MaterialProps, postThickness: number, perpendicular: boolean): number {
  const d = H_ANCHOR.boltDiameter;
  const fh0 = 0.082 * (1 - 0.01 * d) * mat.rhok;
  const fh = perpendicular ? fh0 / (1.35 + 0.015 * d) : fh0;
  const My = 0.3 * BOLT_FUK * d ** 2.6;
  const perPlane = Math.min(0.5 * fh * postThickness * d, 1.15 * Math.sqrt(2 * My * fh * d));
  return 2 * perPlane;
}

/** Design resistances of the post base under a post `postThickness` mm thick between the flanges. */
export function postBaseCapacity(type: PostBaseType, mat: MaterialProps, postThickness: number, kmodShort: number): PostBaseCapacity {
  if (type !== 'h-anchor') return { type, momentStrong: 0, momentWeak: 0, tension: 0, strongGoverning: 'bolts' };
  const { flangeWidth: b, flangeThickness: t, bolts, boltLever } = H_ANCHOR;
  // Plastic section moduli of the two flanges at the top of the footing (mm³)
  const flangesStrong = (2 * STEEL_FY * ((t * b * b) / 4)) / GAMMA_M0 / 1e6;
  const flangesWeak = (2 * STEEL_FY * ((b * t * t) / 4)) / GAMMA_M0 / 1e6;
  const factor = kmodShort / GAMMA_M_CONNECTION;
  // In-plane moment reaches the flanges as a horizontal couple of the two bolts (load across the grain)
  const boltCouple = (boltCapacity(mat, postThickness, true) * factor * (boltLever / 1000)) / 1000;
  const tension = (bolts * boltCapacity(mat, postThickness, false) * factor) / 1000;
  return {
    type,
    momentStrong: Math.min(flangesStrong, boltCouple),
    momentWeak: flangesWeak,
    tension,
    strongGoverning: boltCouple < flangesStrong ? 'bolts' : 'flanges',
  };
}
