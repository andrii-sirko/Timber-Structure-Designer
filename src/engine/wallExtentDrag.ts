import type { Member, Vec3, WallId } from '@/types';
import type { WallExtent } from './framing/wallFrame';
import { END_GRIP, END_STUD_GROUP } from './partitionDrag';
import { snapDrag } from './postDrag';

/**
 * Dragging the closed stretch of an outer wall: grabbing its cladding near an end, or one of its
 * end studs, pulls that end of the stretch along the wall. The footprint itself never changes.
 */
export type WallExtentDragMode = 'start' | 'end';

export interface WallExtentDrag {
  wallId: WallId;
  mode: WallExtentDragMode;
  /** Pointer − extent end at pointer-down, subtracted on every move so the end does not jump */
  grab: number;
}

/** The part of a world wall frame the drag needs */
export interface WallRun {
  origin: Vec3;
  u: Vec3;
  extent: WallExtent;
}

/** Coordinate along the wall (its u, from the wall's start corner) of a world ground point (mm) */
export const wallRunCoord = (run: Pick<WallRun, 'origin' | 'u'>, point: { x: number; z: number }): number =>
  (point.x - run.origin.x) * run.u.x + (point.z - run.origin.z) * run.u.z;

/** End of the closed stretch grabbed at `point` (world mm), or null away from both ends. */
export function wallExtentDragModeAt(run: WallRun, point: { x: number; z: number }): WallExtentDragMode | null {
  const u = wallRunCoord(run, point);
  const { start, end } = run.extent;
  const grip = Math.min(END_GRIP, (end - start) / 3);
  if (u <= start + grip) return 'start';
  if (u >= end - grip) return 'end';
  return null;
}

/** Drag mode for an outer-wall member: only end studs resize, at the end they stand on. */
export function wallExtentMemberMode(member: Pick<Member, 'wallId' | 'group' | 'start'>, run: WallRun): WallExtentDragMode | null {
  if (!member.wallId || member.group !== END_STUD_GROUP) return null;
  return wallRunCoord(run, member.start) < (run.extent.start + run.extent.end) / 2 ? 'start' : 'end';
}

export function wallExtentGrabOffset(run: WallRun, mode: WallExtentDragMode, point: { x: number; z: number }): number {
  return wallRunCoord(run, point) - run.extent[mode];
}

/** Extent patch for a pointer at `point` (world mm), snapped to the drag step; the store clamps it to the wall. */
export function wallExtentDragPatch(
  run: WallRun,
  mode: WallExtentDragMode,
  point: { x: number; z: number },
  grab: number,
): { start: number } | { end: number } {
  const value = snapDrag(wallRunCoord(run, point) - grab);
  return mode === 'start' ? { start: value } : { end: value };
}

/** CSS cursor for resizing along a wall running along `u` */
export const wallExtentCursor = (u: Vec3): string => (Math.abs(u.x) > 0.5 ? 'ew-resize' : 'ns-resize');
