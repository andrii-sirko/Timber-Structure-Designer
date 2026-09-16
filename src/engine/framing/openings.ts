import type { FramingWarning, Opening, OpeningHost, OpeningType, StructureParams } from '@/types';
import { clamp, roundTo } from '../geometry';
import { wallBays, type WallBay, type WallFrame } from './wallFrame';

export const OPENING_DEFAULTS: Record<
  OpeningType,
  { width: number; height: number; y: number; label: string; labelDe: string }
> = {
  door: { width: 900, height: 2000, y: 0, label: 'Door', labelDe: 'Tür' },
  window: { width: 1000, height: 800, y: 1000, label: 'Window', labelDe: 'Fenster' },
  passage: { width: 2400, height: 2100, y: 0, label: 'Open passage', labelDe: 'Durchgang' },
};

export const MIN_OPENING_SIZE = 300;
export const OPENING_SNAP = 10;

/** Simplified header (Sturz) depth by clear opening width. */
export function headerHeight(openingWidth: number): number {
  if (openingWidth <= 1000) return 120;
  if (openingWidth <= 1800) return 160;
  if (openingWidth <= 2500) return 200;
  return 240;
}

export function bayForOpening(frame: WallFrame, opening: Opening): WallBay {
  const bays = wallBays(frame);
  if (bays.length === 0) return { index: 0, start: frame.extent.start, end: frame.extent.end };
  const centre = opening.x + opening.width / 2;
  const hit = bays.find((b) => centre >= b.start && centre <= b.end);
  if (hit) return hit;
  // nearest bay by distance to its centre
  let best = bays[0];
  let bestD = Infinity;
  for (const b of bays) {
    const d = Math.abs((b.start + b.end) / 2 - centre);
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return best;
}

export interface OpeningLimits {
  bay: WallBay;
  /** Minimum x of the rough opening (leaves room for king + jack studs) */
  minX: number;
  /** Maximum right edge (x + width) */
  maxRight: number;
  minY: number;
  /** Highest allowed top edge (y + height) leaving room for the header */
  maxTop: (width: number, right: number) => number;
}

export function openingLimits(frame: WallFrame, opening: Opening, params: StructureParams): OpeningLimits {
  const sw = params.timber.stud.width;
  const bay = bayForOpening(frame, opening);
  const margin = 2 * sw;
  return {
    bay,
    minX: bay.start + margin,
    maxRight: bay.end - margin,
    minY: opening.type === 'window' ? sw + 100 : 0,
    maxTop: (width, right) => frame.studTopAt(right) - headerHeight(width) - 20,
  };
}

/**
 * Return a copy of the opening clamped into a valid position on the wall.
 * Windows keep their height where possible: the sill is pushed down before the height is reduced.
 */
export function clampOpening(frame: WallFrame, opening: Opening, params: StructureParams): Opening {
  const lim = openingLimits(frame, opening, params);
  const bayWidth = Math.max(lim.maxRight - lim.minX, MIN_OPENING_SIZE);
  const width = roundTo(clamp(opening.width, MIN_OPENING_SIZE, bayWidth), OPENING_SNAP);
  const x = roundTo(clamp(opening.x, lim.minX, Math.max(lim.minX, lim.maxRight - width)), OPENING_SNAP);
  const top = lim.maxTop(width, x + width);
  const isWindow = opening.type === 'window';
  const minY = isWindow ? lim.minY : 0;
  const available = Math.max(top - minY, MIN_OPENING_SIZE);
  const height = roundTo(clamp(opening.height, MIN_OPENING_SIZE, available), OPENING_SNAP);
  const y = isWindow ? roundTo(clamp(opening.y, minY, Math.max(minY, top - height)), OPENING_SNAP) : 0;
  return { ...opening, x, y, width, height };
}

export function validateOpenings(frame: WallFrame, wall: OpeningHost, params: StructureParams): FramingWarning[] {
  const warnings: FramingWarning[] = [];
  const ref = { wallId: frame.wallId, partitionId: frame.partitionId };
  if (!wall.closed) {
    if (wall.openings.length > 0) {
      warnings.push({
        level: 'info',
        message: `Wall "${frame.label}" is open – its ${wall.openings.length} opening(s) are ignored.`,
        ...ref,
      });
    }
    return warnings;
  }
  const sorted = [...wall.openings].sort((a, b) => a.x - b.x);
  for (let i = 0; i < sorted.length; i++) {
    const o = sorted[i];
    const lim = openingLimits(frame, o, params);
    if (o.x < lim.minX - 0.5 || o.x + o.width > lim.maxRight + 0.5) {
      warnings.push({
        level: 'error',
        message: `${o.label ?? o.type} on ${frame.label} wall collides with a post – move it inside the bay (${Math.round(lim.minX)}–${Math.round(lim.maxRight)} mm).`,
        ...ref,
        openingId: o.id,
      });
    }
    if (o.y + o.height > lim.maxTop(o.width, o.x + o.width) + 0.5) {
      warnings.push({
        level: 'error',
        message: `${o.label ?? o.type} on ${frame.label} wall is too high – no room for the header (Sturz).`,
        ...ref,
        openingId: o.id,
      });
    }
    const next = sorted[i + 1];
    if (next && next.x < o.x + o.width + 4 * params.timber.stud.width) {
      warnings.push({
        level: 'warning',
        message: `Openings "${o.label ?? o.type}" and "${next.label ?? next.type}" on ${frame.label} wall are too close – framing studs overlap.`,
        ...ref,
        openingId: next.id,
      });
    }
  }
  return warnings;
}
