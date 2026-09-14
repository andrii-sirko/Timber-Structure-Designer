import type { Partition, PostGrid, StructureParams, Vec3, Wall, WallId } from '@/types';
import { add, scale, X_AXIS, Y_AXIS, Z_AXIS, NEG_X, NEG_Z } from '../geometry';
import { mapPos, mapVec, type GroundMap } from '../orientation';
import type { RoofLines } from './roofLines';

/** Clearance between the top of a partition wall and the rafter underside (mm). */
export const PARTITION_TOP_GAP = 10;

/**
 * Local 2D coordinate frame of a wall (outer wall or interior partition).
 *   u → along the wall, starting at the wall's start corner (front-left corner for
 *       front/rear walls, front corner for side walls)
 *   v → up
 *   n → outward normal (cladding sits at n ∈ [0, thickness])
 * The structural axis plane (post / stud centres) lies `axisInset` behind the outer face.
 */
export interface WallFrame {
  /** WallId for outer walls, partition id for partitions */
  id: string;
  kind: 'outer' | 'partition';
  wallId?: WallId;
  partitionId?: string;
  /** Short human-readable name used in member names and warnings */
  label: string;
  origin: Vec3;
  u: Vec3;
  v: Vec3;
  normal: Vec3;
  length: number;
  axisInset: number;
  sloped: boolean;
  /** Post axis positions along u (corner posts + intermediate posts; end studs for partitions) */
  postU: number[];
  /** true when a purlin runs along the top of the wall (its posts are a purlin row) */
  hasPurlin: boolean;
  /** Half width of the members at `postU` – bays start/end this far inside them */
  bayInset: number;
  /** Underside of the top member (purlin, side rail or top plate) at u → top of the studs */
  studTopAt: (u: number) => number;
  /** Underside of the rafters on the outer face at u → top of the cladding */
  claddingTopAt: (u: number) => number;
  /** Map local (u, v, n) → world coordinates. n defaults to the axis plane (−axisInset). */
  toWorld: (u: number, v: number, n?: number) => Vec3;
}

export function makeToWorld(origin: Vec3, u: Vec3, v: Vec3, normal: Vec3, axisInset: number) {
  return (uu: number, vv: number, n = -axisInset): Vec3 => add(add(add(origin, scale(u, uu)), scale(v, vv)), scale(normal, n));
}

export function computeWallFrame(
  id: WallId,
  params: StructureParams,
  wall: Wall,
  roof: RoofLines,
  grid: PostGrid,
): WallFrame {
  const { length: L, width: W, timber } = params;
  const pw = timber.post.width;
  const bh = timber.beam.height;

  let origin: Vec3;
  let u: Vec3;
  let normal: Vec3;
  let length: number;
  let postU: number[];
  let studTopAt: (u: number) => number;
  let claddingTopAt: (u: number) => number;
  let isSloped = false;

  const sloped = params.roofScheme === 'sloped-purlins';
  const rowPositions = (rowKey: string): number[] => grid.rows.find((r) => r.key === rowKey)?.positions ?? [];
  const wallPosts = (wallId: WallId, mids: number[], span: number): number[] => [pw / 2, ...(wall.closed ? (grid.wallPosts[wallId]?.positions ?? []) : mids), span - pw / 2];

  switch (id) {
    case 'front':
      origin = { x: 0, y: 0, z: 0 };
      u = X_AXIS;
      normal = NEG_Z;
      length = L;
      // classic: the front purlin row; sloped-purlins: a level rail between the purlin rows
      postU = sloped ? wallPosts('front', roof.midPurlinX, L) : rowPositions('front');
      studTopAt = () => params.frontHeight - bh;
      claddingTopAt = () => roof.bottomAt(0);
      isSloped = false;
      break;
    case 'rear':
      origin = { x: 0, y: 0, z: W };
      u = X_AXIS;
      normal = Z_AXIS;
      length = L;
      postU = sloped ? wallPosts('rear', roof.midPurlinX, L) : rowPositions('rear');
      studTopAt = () => params.rearHeight - bh;
      claddingTopAt = () => roof.bottomAt(W);
      isSloped = false;
      break;
    case 'left':
      origin = { x: 0, y: 0, z: 0 };
      u = Z_AXIS;
      normal = NEG_X;
      length = W;
      // classic: side posts under the sloped rail; sloped-purlins: the left purlin row
      postU = sloped ? rowPositions('left') : wallPosts('left', roof.midPurlinZ, W);
      studTopAt = (uu) => roof.railBottomAt(uu);
      claddingTopAt = (uu) => roof.bottomAt(uu);
      isSloped = true;
      break;
    case 'right':
      origin = { x: L, y: 0, z: 0 };
      u = Z_AXIS;
      normal = X_AXIS;
      length = W;
      postU = sloped ? rowPositions('right') : wallPosts('right', roof.midPurlinZ, W);
      studTopAt = (uu) => roof.railBottomAt(uu);
      claddingTopAt = (uu) => roof.bottomAt(uu);
      isSloped = true;
      break;
  }

  const v = Y_AXIS;
  const axisInset = pw / 2;
  return {
    id,
    kind: 'outer',
    wallId: id,
    label: id,
    hasPurlin: sloped ? id === 'left' || id === 'right' : id === 'front' || id === 'rear',
    origin,
    u,
    v,
    normal,
    length,
    axisInset,
    sloped: isSloped,
    postU,
    bayInset: pw / 2,
    studTopAt,
    claddingTopAt,
    toWorld: makeToWorld(origin, u, v, normal, axisInset),
  };
}

/**
 * Frame of an interior partition. The wall is a stud wall (stud depth = wall thickness) with
 * end studs at both ends, a bottom plate and a top plate that follows the rafter underside:
 * level for walls along X, sloped like the side walls for walls along Z.
 * The cladding face (n = 0) is the +normal side of the studs.
 */
export function computePartitionFrame(partition: Partition, params: StructureParams, roof: RoofLines): WallFrame {
  const { timber } = params;
  const sw = timber.stud.width;
  const sd = timber.stud.height;
  const length = Math.max(partition.end - partition.start, 1);
  const axisInset = sd / 2;
  const v = Y_AXIS;

  let origin: Vec3;
  let u: Vec3;
  let normal: Vec3;
  let studTopAt: (u: number) => number;
  let claddingTopAt: (u: number) => number;
  let sloped: boolean;

  if (partition.axis === 'x') {
    u = X_AXIS;
    normal = Z_AXIS;
    origin = { x: partition.start, y: 0, z: partition.offset + axisInset };
    const top = roof.bottomAt(partition.offset) - PARTITION_TOP_GAP;
    claddingTopAt = () => top;
    studTopAt = () => top - sw;
    sloped = false;
  } else {
    u = Z_AXIS;
    normal = X_AXIS;
    origin = { x: partition.offset + axisInset, y: 0, z: partition.start };
    claddingTopAt = (uu) => roof.bottomAt(partition.start + uu) - PARTITION_TOP_GAP;
    studTopAt = (uu) => claddingTopAt(uu) - sw / roof.cos;
    sloped = true;
  }

  return {
    id: partition.id,
    kind: 'partition',
    partitionId: partition.id,
    label: partition.label || 'partition',
    hasPurlin: false,
    origin,
    u,
    v,
    normal,
    length,
    axisInset,
    sloped,
    postU: [sw / 2, length - sw / 2],
    bayInset: sw / 2,
    studTopAt,
    claddingTopAt,
    toWorld: makeToWorld(origin, u, v, normal, axisInset),
  };
}

/**
 * A canonical wall frame re-expressed in world space through the ground map `m`.
 * When `flipped`, the world wall runs the other way along the same face, so the u origin moves
 * to the far corner and every u-dependent quantity is mirrored (u' = length − u).
 */
export function wallFrameToWorld(frame: WallFrame, m: GroundMap, flipped: boolean, ids: { id: string; wallId?: WallId; partitionId?: string; label: string }): WallFrame {
  const { length } = frame;
  const originC = flipped ? add(frame.origin, scale(frame.u, length)) : frame.origin;
  const uC = flipped ? scale(frame.u, -1) : frame.u;
  const origin = mapPos(m, originC);
  const u = mapVec(m, uC);
  const normal = mapVec(m, frame.normal);
  const mirror = (f: (u: number) => number) => (flipped ? (uu: number) => f(length - uu) : f);
  return {
    ...frame,
    ...ids,
    origin,
    u,
    normal,
    postU: flipped ? frame.postU.map((uu) => length - uu).reverse() : frame.postU,
    studTopAt: mirror(frame.studTopAt),
    claddingTopAt: mirror(frame.claddingTopAt),
    toWorld: makeToWorld(origin, u, frame.v, normal, frame.axisInset),
  };
}

/** Clear bays between posts (or end studs) along a wall, in local u coordinates. */
export interface WallBay {
  index: number;
  start: number; // inner face of the post at the start
  end: number; // inner face of the post at the end
}

export function wallBays(frame: WallFrame): WallBay[] {
  const bays: WallBay[] = [];
  for (let i = 0; i < frame.postU.length - 1; i++) {
    bays.push({ index: i, start: frame.postU[i] + frame.bayInset, end: frame.postU[i + 1] - frame.bayInset });
  }
  return bays;
}
