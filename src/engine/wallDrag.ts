import { MIN_PLAN_DIM } from './framing';
import { DRAG_SNAP } from './postDrag';
import type { StructureParams, WallId } from '@/types';

/** Plan dimension an outer wall controls when dragged: front/rear move along Z (width), left/right along X (length). */
export type PlanDimension = 'length' | 'width';

export const wallDragDimension = (wall: WallId): PlanDimension => (wall === 'front' || wall === 'rear' ? 'width' : 'length');

/** Drag snap step (mm) */
export const WALL_DRAG_STEP = DRAG_SNAP;

/**
 * New footprint dimension for dragging outer wall `wall` so that it follows the ground point
 * `point` (world mm). The footprint stays anchored at the origin: dragging the left / rear wall
 * moves that wall, dragging the right / front wall (which sits on the axis) grows the footprint
 * by the distance the pointer moved outwards, so "drag outwards = bigger" holds on every wall.
 */
export function wallDragDimensionValue(wall: WallId, point: { x: number; z: number }, params: Pick<StructureParams, 'length' | 'width'>): number {
  const current = wallDragDimension(wall) === 'length' ? params.length : params.width;
  let raw: number;
  switch (wall) {
    case 'left':
      raw = point.x;
      break;
    case 'rear':
      raw = point.z;
      break;
    case 'right':
      raw = current - point.x;
      break;
    case 'front':
      raw = current - point.z;
      break;
  }
  return Math.max(MIN_PLAN_DIM, Math.round(raw / WALL_DRAG_STEP) * WALL_DRAG_STEP);
}

/**
 * Pointer offset captured on drag start so the wall does not jump to the pointer: the handle
 * bar sits a little outside the wall face, so we track the delta between the pointer and the
 * wall face at pointer-down and subtract it on every move.
 */
export function wallDragGrabOffset(wall: WallId, point: { x: number; z: number }, params: Pick<StructureParams, 'length' | 'width'>): number {
  switch (wall) {
    case 'left':
      return point.x - params.length;
    case 'rear':
      return point.z - params.width;
    case 'right':
      return point.x;
    case 'front':
      return point.z;
  }
}

export function applyGrabOffset(wall: WallId, point: { x: number; z: number }, offset: number): { x: number; z: number } {
  switch (wall) {
    case 'right':
    case 'left':
      return { x: point.x - offset, z: point.z };
    case 'rear':
    case 'front':
      return { x: point.x, z: point.z - offset };
  }
}

export interface WallHandle {
  wall: WallId;
  /** Centre of the grip bar (world mm) */
  centre: { x: number; z: number };
  /** Bar length along the wall (mm) */
  length: number;
  /** true → the bar runs along X (front / rear walls) */
  alongX: boolean;
}

/** Ground grip bars just outside each outer wall face. */
export function wallHandles(params: Pick<StructureParams, 'length' | 'width'>, gap = 250): WallHandle[] {
  const { length: L, width: W } = params;
  return [
    { wall: 'front', centre: { x: L / 2, z: -gap }, length: L, alongX: true },
    { wall: 'rear', centre: { x: L / 2, z: W + gap }, length: L, alongX: true },
    { wall: 'right', centre: { x: -gap, z: W / 2 }, length: W, alongX: false },
    { wall: 'left', centre: { x: L + gap, z: W / 2 }, length: W, alongX: false },
  ];
}

export interface WallRuler {
  a: { x: number; z: number };
  b: { x: number; z: number };
  label: string;
}

/** Ruler shown while an outer wall is dragged: the footprint dimension it controls, across the middle of the footprint. */
export function wallDragRuler(wall: WallId, params: Pick<StructureParams, 'length' | 'width'>): WallRuler {
  const { length: L, width: W } = params;
  if (wallDragDimension(wall) === 'length') {
    return { a: { x: 0, z: W / 2 }, b: { x: L, z: W / 2 }, label: `L ${Math.round(L)} mm` };
  }
  return { a: { x: L / 2, z: 0 }, b: { x: L / 2, z: W }, label: `W ${Math.round(W)} mm` };
}
