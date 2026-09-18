import type { MemberCategory, PartitionAxis } from '@/types';
import { END_STUD_GROUP } from './partitionDrag';

/** Pointer-drag snap step (mm) shared by posts, purlins, partitions, outer walls, vehicles and paved floors. */
export const DRAG_SNAP = 10;
export const snapDrag = (v: number): number => Math.round(v / DRAG_SNAP) * DRAG_SNAP;

export function canMovePost(isDragging: boolean): boolean {
  return isDragging;
}

export function canDragMember(member: { category: MemberCategory; partitionId?: string; wallId?: string; group: string; purlinRow?: string }): boolean {
  // Every piece of a partition is draggable: the body moves the wall, the end studs resize it (see partitionDrag).
  // End studs of a shortened outer wall pull its closed stretch (see wallExtentDrag).
  return member.category === 'post' || isMidPurlin(member) || Boolean(member.partitionId) || (Boolean(member.wallId) && member.group === END_STUD_GROUP);
}

/** Intermediate purlins can be dragged across the slope; eave purlins sit on the walls. */
export function isMidPurlin(member: { purlinRow?: string }): boolean {
  return member.purlinRow?.startsWith('mid') ?? false;
}

/** 0-based intermediate row index of a purlin member (`mid2` → 2), or null for eave purlins. */
export function midPurlinIndex(member: { purlinRow?: string }): number | null {
  const m = member.purlinRow?.match(/^mid(\d+)$/);
  return m ? Number(m[1]) : null;
}

export function partitionDragAxis(axis: PartitionAxis, point: { x: number; z: number }): number {
  return axis === 'x' ? point.z : point.x;
}

export function partitionEdgeDistances(
  partition: Pick<{ axis: PartitionAxis; offset: number }, 'axis' | 'offset'>,
  bounds: { length: number; width: number },
  wallThickness: number,
): { first: number; second: number } {
  const span = partition.axis === 'x' ? bounds.width : bounds.length;
  return {
    first: partition.offset - wallThickness / 2,
    second: span - partition.offset - wallThickness / 2,
  };
}

/** Plan footprint of a post: world x/z extent (mm). */
export interface PlanExtent {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Clear distances from a post's faces to the footprint edges (x = 0 / length, z = 0 / width). */
export function postEdgeDistances(
  extent: PlanExtent,
  bounds: { length: number; width: number },
): { left: number; right: number; front: number; rear: number } {
  return {
    left: extent.minX,
    right: bounds.length - extent.maxX,
    front: extent.minZ,
    rear: bounds.width - extent.maxZ,
  };
}

export type PostSide = 'left' | 'right' | 'front' | 'rear';

/** What a post's clear distance runs to: another post, a wall's end stud, or the footprint edge. */
export type PostDistanceTarget = 'post' | 'stud' | 'edge';

/** Clear distance on one side of a post: to the nearest upright on the same axis, or to the footprint edge when none. */
export interface PostSideDistance {
  distance: number;
  to: PostDistanceTarget;
}

/** Plan footprint of an upright (post or end stud) a post's distances can run to. */
export interface PostObstacle extends PlanExtent {
  kind: Exclude<PostDistanceTarget, 'edge'>;
}

/**
 * Clear distances from a post's faces to the nearest other upright standing on the same axis
 * (its footprint overlaps across the measuring direction); sides with no such upright fall back
 * to the footprint edge.
 */
export function postNeighbourDistances(
  extent: PlanExtent,
  others: PostObstacle[],
  bounds: { length: number; width: number },
): Record<PostSide, PostSideDistance> {
  const edges = postEdgeDistances(extent, bounds);
  const onRowX = others.filter((o) => o.minZ < extent.maxZ && o.maxZ > extent.minZ);
  const onRowZ = others.filter((o) => o.minX < extent.maxX && o.maxX > extent.minX);
  const nearest = (row: PostObstacle[], gap: (o: PostObstacle) => number, edge: number): PostSideDistance => {
    let best: PostSideDistance = { distance: edge, to: 'edge' };
    for (const o of row) {
      const g = gap(o);
      if (g >= 0 && (best.to === 'edge' || g < best.distance)) best = { distance: g, to: o.kind };
    }
    return best;
  };
  return {
    left: nearest(onRowX, (o) => extent.minX - o.maxX, edges.left),
    right: nearest(onRowX, (o) => o.minX - extent.maxX, edges.right),
    front: nearest(onRowZ, (o) => extent.minZ - o.maxZ, edges.front),
    rear: nearest(onRowZ, (o) => o.minZ - extent.maxZ, edges.rear),
  };
}
