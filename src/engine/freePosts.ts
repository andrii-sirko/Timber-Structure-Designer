import type { FreePost, Member, PostGrid, StructureParams } from '@/types';
import { cutProfile, rectProfile, Y_AXIS, Z_AXIS } from './geometry';
import type { RoofLines } from './framing/roofLines';

/** Member id prefix of a freely placed post (`free:<FreePost.id>`). */
export const FREE_POST_ID_PREFIX = 'free:';

export const freePostMemberId = (id: string): string => `${FREE_POST_ID_PREFIX}${id}`;

/** `FreePost.id` behind a member id, or null when the member is not a free post. */
export function freePostIdOf(memberId: string): string | null {
  return memberId.startsWith(FREE_POST_ID_PREFIX) ? memberId.slice(FREE_POST_ID_PREFIX.length) : null;
}

type RoofExtentParams = Pick<StructureParams, 'length' | 'width' | 'overhangs' | 'timber'>;

/**
 * Plan extent of the roof (footprint + overhangs) a free post may stand under.
 * World frame: the right wall sits on x = 0; canonical frame: the left eave is at x < 0.
 */
export function freePostBounds(params: RoofExtentParams, frame: 'world' | 'canonical' = 'world'): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const { length: L, width: W, overhangs: o } = params;
  const [xBefore, xAfter] = frame === 'world' ? [o.right, o.left] : [o.left, o.right];
  return { minX: -xBefore, maxX: L + xAfter, minZ: -o.front, maxZ: W + o.rear };
}

/** Keep a free post axis under the roof (footprint + overhangs) so the post never stands in the open. */
export function clampFreePost(point: { x: number; z: number }, params: RoofExtentParams, frame: 'world' | 'canonical' = 'world'): { x: number; z: number } {
  const half = params.timber.post.width / 2;
  const b = freePostBounds(params, frame);
  const clamp = (v: number, min: number, max: number): number => Math.min(Math.max(v, min + half), Math.max(min + half, max - half));
  return { x: clamp(point.x, b.minX, b.maxX), z: clamp(point.z, b.minZ, b.maxZ) };
}

/**
 * What a free post at canonical (x, z) carries: the underside of the purlin when it stands
 * within the purlin's width of a row axis, otherwise the underside of the rafters.
 */
export function freePostTop(
  point: { x: number; z: number },
  params: Pick<StructureParams, 'timber'>,
  roof: RoofLines,
  grid: PostGrid,
): { centreHeight: number; sloped: boolean; underPurlin: boolean } {
  const bw = params.timber.beam.width;
  const bh = params.timber.beam.height;
  const across = grid.scheme === 'sloped-purlins' ? point.x : point.z;
  const underPurlin = grid.rows.some((row) => Math.abs(row.offset - across) <= bw / 2);
  if (grid.scheme === 'sloped-purlins') {
    // purlin underside and rafter underside both follow the slope
    return { centreHeight: underPurlin ? roof.railBottomAt(point.z) : roof.bottomAt(point.z), sloped: true, underPurlin };
  }
  if (underPurlin) return { centreHeight: roof.purlinTopAt(point.z) - bh, sloped: false, underPurlin };
  return { centreHeight: roof.bottomAt(point.z), sloped: true, underPurlin };
}

/** Free posts as members in the canonical frame. */
export function generateFreePosts(params: StructureParams, roof: RoofLines, grid: PostGrid, freePosts: FreePost[]): Member[] {
  const section = { width: params.timber.post.width, height: params.timber.post.height };
  return freePosts.map((post, i) => {
    const p = clampFreePost(post, params, 'canonical');
    const { centreHeight, sloped, underPurlin } = freePostTop(p, params, roof, grid);
    const pitch = Math.round(Math.abs(roof.pitchDeg) * 10) / 10;
    return {
      id: freePostMemberId(post.id),
      category: 'post',
      name: `Free post ${i + 1}`,
      nameDe: 'Pfosten frei',
      group: 'Post (Pfosten)',
      section,
      length: sloped ? centreHeight + (section.height / 2) * roof.tan : centreHeight,
      start: { x: p.x, y: 0, z: p.z },
      direction: Y_AXIS,
      up: Z_AXIS,
      cuts: { start: 0, end: sloped ? pitch : 0 },
      profile: sloped ? cutProfile(centreHeight, section.height, 0, -roof.pitchDeg) : rectProfile(centreHeight, section.height),
      notes: underPurlin ? (sloped ? 'Top cut to purlin slope' : 'Under purlin') : 'Top cut to rafter underside',
    };
  });
}
