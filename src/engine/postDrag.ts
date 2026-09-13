import type { MemberCategory, PartitionAxis } from '@/types';

export function canMovePost(isDragging: boolean): boolean {
  return isDragging;
}

export function canDragMember(member: Pick<{ category: MemberCategory; partitionId?: string; group: string }, 'category' | 'partitionId' | 'group'>): boolean {
  return member.category === 'post' || (member.category === 'stud' && Boolean(member.partitionId) && member.group === 'End stud (Eckständer)');
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
