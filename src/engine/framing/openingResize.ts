import type { Opening } from '@/types';
import { roundTo } from '../geometry';
import { MIN_OPENING_SIZE, OPENING_SNAP } from './openings';

export type OpeningEdge = 'left' | 'right' | 'top' | 'bottom';

export const OPENING_EDGES: readonly OpeningEdge[] = ['left', 'right', 'top', 'bottom'];

/** Which edges of an opening can be dragged: doors and passages sit on the plate, so their bottom is fixed. */
export function resizableEdges(opening: Opening): OpeningEdge[] {
  return opening.type === 'window' ? [...OPENING_EDGES] : ['left', 'right', 'top'];
}

/**
 * New rough-opening rectangle after dragging `edge` to the wall-local pointer position (u, v).
 * The opposite edge stays where it is; the result is snapped to the framing grid and never
 * smaller than MIN_OPENING_SIZE. Final clamping against posts / header happens in clampOpening.
 */
export function resizeOpening(opening: Opening, edge: OpeningEdge, u: number, v: number, snap = OPENING_SNAP): Pick<Opening, 'x' | 'y' | 'width' | 'height'> {
  const left = opening.x;
  const right = opening.x + opening.width;
  const bottom = opening.y;
  const top = opening.y + opening.height;
  const su = roundTo(u, snap);
  const sv = roundTo(v, snap);
  switch (edge) {
    case 'left': {
      const x = Math.min(su, right - MIN_OPENING_SIZE);
      return { x, y: bottom, width: right - x, height: top - bottom };
    }
    case 'right': {
      const r = Math.max(su, left + MIN_OPENING_SIZE);
      return { x: left, y: bottom, width: r - left, height: top - bottom };
    }
    case 'top': {
      const t = Math.max(sv, bottom + MIN_OPENING_SIZE);
      return { x: left, y: bottom, width: right - left, height: t - bottom };
    }
    case 'bottom': {
      const b = Math.max(0, Math.min(sv, top - MIN_OPENING_SIZE));
      return { x: left, y: b, width: right - left, height: top - b };
    }
  }
}

/** Wall-local centre of the grip bar for an edge (u along the wall, v up). */
export function edgeHandleCentre(opening: Opening, edge: OpeningEdge): { u: number; v: number } {
  const cu = opening.x + opening.width / 2;
  const cv = opening.y + opening.height / 2;
  switch (edge) {
    case 'left':
      return { u: opening.x, v: cv };
    case 'right':
      return { u: opening.x + opening.width, v: cv };
    case 'top':
      return { u: cu, v: opening.y + opening.height };
    case 'bottom':
      return { u: cu, v: opening.y };
  }
}

/** Whether the opening's rough size changed compared to `before` (used to drop a catalogue preset). */
export function sizeChanged(before: Pick<Opening, 'width' | 'height'>, after: Pick<Opening, 'width' | 'height'>): boolean {
  return before.width !== after.width || before.height !== after.height;
}
