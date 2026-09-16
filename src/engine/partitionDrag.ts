import type { Member, Partition } from '@/types';
import { MIN_PARTITION_LENGTH } from './framing/partitions';
import { snapDrag } from './postDrag';

/**
 * What dragging a piece of a partition does: the body (studs, plates, cladding) moves the whole
 * wall across its perpendicular axis, the two end studs pull the wall's start / end along the
 * running axis (resize).
 */
export type PartitionDragMode = 'move' | 'start' | 'end';

export interface PartitionDrag {
  id: string;
  mode: PartitionDragMode;
  /** Pointer − wall coordinate at pointer-down, subtracted on every move so the wall does not jump */
  grab: number;
}

export const END_STUD_GROUP = 'End stud (Eckständer)';

/** Coordinate along the wall's running axis */
export const partitionRunCoord = (axis: Partition['axis'], point: { x: number; z: number }): number => (axis === 'x' ? point.x : point.z);
/** Coordinate across the wall (the axis `offset` lives on) */
export const partitionAcrossCoord = (axis: Partition['axis'], point: { x: number; z: number }): number => (axis === 'x' ? point.z : point.x);

/** Grabbing any piece of the wall this close (mm) to one of its ends resizes instead of moving. */
export const END_GRIP = 300;

/** Drag mode for a grab at `point` (world mm) on the wall: near an end → resize that end, else move. */
export function partitionDragModeAt(partition: Pick<Partition, 'axis' | 'start' | 'end'>, point: { x: number; z: number }): PartitionDragMode {
  const u = partitionRunCoord(partition.axis, point);
  const grip = Math.min(END_GRIP, (partition.end - partition.start) / 3);
  if (u <= partition.start + grip) return 'start';
  if (u >= partition.end - grip) return 'end';
  return 'move';
}

/**
 * Drag mode for a framing member of `partition`, or null if the member is not part of it.
 * End studs always resize their end; other members resize when grabbed near an end (`point`,
 * world mm, is where the pointer hit the member) and move the wall otherwise.
 */
export function partitionDragMode(
  member: Pick<Member, 'partitionId' | 'group' | 'start'>,
  partition: Pick<Partition, 'id' | 'axis' | 'start' | 'end'>,
  point?: { x: number; z: number },
): PartitionDragMode | null {
  if (member.partitionId !== partition.id) return null;
  if (member.group === END_STUD_GROUP) {
    const mid = (partition.start + partition.end) / 2;
    return partitionRunCoord(partition.axis, member.start) < mid ? 'start' : 'end';
  }
  return point ? partitionDragModeAt(partition, point) : 'move';
}

/** Value the drag tracks (wall offset, start or end) for the given mode. */
function dragTarget(partition: Pick<Partition, 'offset' | 'start' | 'end'>, mode: PartitionDragMode): number {
  return mode === 'move' ? partition.offset : mode === 'start' ? partition.start : partition.end;
}

/** Pointer coordinate the drag tracks: across the wall when moving, along it when resizing. */
function dragCoord(partition: Pick<Partition, 'axis'>, mode: PartitionDragMode, point: { x: number; z: number }): number {
  return mode === 'move' ? partitionAcrossCoord(partition.axis, point) : partitionRunCoord(partition.axis, point);
}

export function partitionGrabOffset(partition: Pick<Partition, 'axis' | 'offset' | 'start' | 'end'>, mode: PartitionDragMode, point: { x: number; z: number }): number {
  return dragCoord(partition, mode, point) - dragTarget(partition, mode);
}

/**
 * Partition patch for a pointer at ground point `point` (world mm), snapped to the drag step.
 * Resizing keeps at least MIN_PARTITION_LENGTH between start and end; the store's clamp keeps
 * the result inside the post frame.
 */
export function partitionDragPatch(
  partition: Pick<Partition, 'axis' | 'offset' | 'start' | 'end'>,
  mode: PartitionDragMode,
  point: { x: number; z: number },
  grab: number,
): Partial<Pick<Partition, 'offset' | 'start' | 'end'>> {
  const value = snapDrag(dragCoord(partition, mode, point) - grab);
  switch (mode) {
    case 'move':
      return { offset: value };
    case 'start':
      return { start: Math.min(value, partition.end - MIN_PARTITION_LENGTH) };
    case 'end':
      return { end: Math.max(value, partition.start + MIN_PARTITION_LENGTH) };
  }
}

/** CSS cursor that tells the user what dragging this member will do. */
export function partitionDragCursor(mode: PartitionDragMode, axis: Partition['axis']): string {
  if (mode === 'move') return axis === 'x' ? 'ns-resize' : 'ew-resize';
  return axis === 'x' ? 'ew-resize' : 'ns-resize';
}
