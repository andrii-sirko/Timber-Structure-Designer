import type { PostBaseType } from '@/types';
import type { MaterialProps } from './materials';

/**
 * H post base (H-Pfostenanker), cast into the point foundation: two flat bars, clear width =
 * post width + 1 mm (121 mm for 120 posts, 141 mm for 140 posts), 2 × M12 bolts through post and
 * both flanges. Treated as PINNED: the bolts and flanges are not counted for a base moment.
 * The reinforced version only differs in the flat steel (heavier for tall / heavily loaded posts).
 */
export const H_ANCHOR = {
  /** Flat steel of the standard / reinforced anchor (mm) */
  flat: { 'h-anchor': '800/80/8', 'h-anchor-reinforced': '800/100/10' },
  /** Post embedment between the flanges (mm) */
  postEmbed: 400,
  /** Flange length cast into the footing (mm) */
  concreteEmbed: 400,
  bolts: 2,
  boltDiameter: 12,
} as const;

/** Concrete cover kept below the cast-in flanges (mm) */
const FOOTING_COVER = 50;
/** Minimum footing depth that takes the cast-in part of the H post base (mm) */
export const H_ANCHOR_MIN_FOOTING = H_ANCHOR.concreteEmbed + FOOTING_COVER;

const BOLT_FUK = 400; // property class 4.6, N/mm²
const GAMMA_M_CONNECTION = 1.3;

export const isHAnchor = (type: PostBaseType): boolean => type === 'h-anchor' || type === 'h-anchor-reinforced';

/** Clear width between the flanges for a post (mm). */
export const hAnchorWidth = (postWidth: number): number => postWidth + 1;

/** Bolt length for the post: through the post plus both flanges, nut and washers (M12 × 160 / 180). */
export const postBoltLength = (postWidth: number): number => (postWidth >= 140 ? 180 : 160);

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

/** Design tension (kN) the 2 × M12 bolts hand from the post into the H anchor; 0 for other bases (ETA value). */
export function postBaseTensionRd(type: PostBaseType, mat: MaterialProps, postThickness: number, kmodShort: number): number {
  if (!isHAnchor(type)) return 0;
  return (H_ANCHOR.bolts * boltCapacity(mat, postThickness, false) * kmodShort) / GAMMA_M_CONNECTION / 1000;
}
