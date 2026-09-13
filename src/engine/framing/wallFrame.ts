import type { Partition, PostGrid, StructureParams, Vec3, Wall, WallId } from '@/types';
import { add, scale, X_AXIS, Y_AXIS, Z_AXIS, NEG_X, NEG_Z } from '../geometry';
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
  /** Half width of the members at `postU` – bays start/end this far inside them */
  bayInset: number;
  /** Underside of the top member (purlin, side rail or top plate) at u → top of the studs */
  studTopAt: (u: number) => number;
  /** Underside of the rafters on the outer face at u → top of the cladding */
  claddingTopAt: (u: number) => number;
  /** Map local (u, v, n) → world coordinates. n defaults to the axis plane (−axisInset). */
  toWorld: (u: number, v: number, n?: number) => Vec3;
}

function makeToWorld(origin: Vec3, u: Vec3, v: Vec3, normal: Vec3, axisInset: number) {
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
  let sloped = false;

  switch (id) {
    case 'front':
      origin = { x: 0, y: 0, z: 0 };
      u = X_AXIS;
      normal = NEG_Z;
      length = L;
      postU = grid.frontXPositions;
      studTopAt = () => params.frontHeight - bh;
      claddingTopAt = () => roof.bottomAt(0);
      break;
    case 'rear':
      origin = { x: 0, y: 0, z: W };
      u = X_AXIS;
      normal = Z_AXIS;
      length = L;
      postU = grid.rearXPositions;
      studTopAt = () => params.rearHeight - bh;
      claddingTopAt = () => roof.bottomAt(W);
      break;
    case 'left':
      origin = { x: 0, y: 0, z: 0 };
      u = Z_AXIS;
      normal = NEG_X;
      length = W;
      postU = [pw / 2, ...(wall.closed ? grid.leftZPositions : []), W - pw / 2];
      studTopAt = (uu) => roof.railBottomAt(uu);
      claddingTopAt = (uu) => roof.bottomAt(uu);
      sloped = true;
      break;
    case 'right':
      origin = { x: L, y: 0, z: 0 };
      u = Z_AXIS;
      normal = X_AXIS;
      length = W;
      postU = [pw / 2, ...(wall.closed ? grid.rightZPositions : []), W - pw / 2];
      studTopAt = (uu) => roof.railBottomAt(uu);
      claddingTopAt = (uu) => roof.bottomAt(uu);
      sloped = true;
      break;
  }

  const v = Y_AXIS;
  const axisInset = pw / 2;
  return {
    id,
    kind: 'outer',
    wallId: id,
    label: id,
    origin,
    u,
    v,
    normal,
    length,
    axisInset,
    sloped,
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
