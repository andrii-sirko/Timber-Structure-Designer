import type { MemberCategory, PartitionAxis } from '@/types';

/** Pointer-drag snap step (mm) shared by posts, purlins, partitions, outer walls, vehicles and paved floors. */
export const DRAG_SNAP = 10;
export const snapDrag = (v: number): number => Math.round(v / DRAG_SNAP) * DRAG_SNAP;

export function canMovePost(isDragging: boolean): boolean {
  return isDragging;
}

export function canDragMember(member: Pick<{ category: MemberCategory; partitionId?: string; group: string; purlinRow?: string }, 'category' | 'partitionId' | 'group' | 'purlinRow'>): boolean {
  return member.category === 'post' || isMidPurlin(member) || (member.category === 'stud' && Boolean(member.partitionId) && member.group === 'End stud (Eckständer)');
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
