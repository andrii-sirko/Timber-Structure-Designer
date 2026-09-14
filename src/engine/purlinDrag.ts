import type { PostGrid, PostRow, StructureParams } from '@/types';
import { computeRoofLines } from './framing/roofLines';
import { canonicalizeParams, canonicalToWorldMap, mapPoint } from './orientation';
import { sanitizeParams } from './framing';

export interface RulerSegment {
  /** World-space end points (mm) */
  a: { x: number; y: number; z: number };
  b: { x: number; y: number; z: number };
  label: string;
}

/**
 * Ruler shown while intermediate purlin row `index` is dragged across the slope: axis-to-axis
 * distance to the neighbouring purlin rows, at purlin height across the middle of the row.
 * Rows live in the canonical frame; the points are rotated into world space.
 */
export function midPurlinRuler(index: number, grid: PostGrid, params: StructureParams): RulerSegment[] {
  const p = sanitizeParams(params);
  const roof = computeRoofLines(canonicalizeParams(p));
  const m = canonicalToWorldMap(p.roofDirection, p.length, p.width);
  const rows = grid.rows;
  const i = rows.findIndex((r) => r.index === index);
  if (i <= 0 || i >= rows.length - 1) return [];
  const prev = rows[i - 1];
  const row = rows[i];
  const next = rows[i + 1];
  const along = row.positions.length ? (row.positions[0] + row.positions[row.positions.length - 1]) / 2 : 0;
  const y = (row.axis === 'x' ? roof.purlinTopAt(row.offset) : roof.purlinTopAt(along)) + 60;
  const at = (across: number) => {
    const q = mapPoint(m, row.axis === 'x' ? { x: along, z: across } : { x: across, z: along });
    return { x: q.x, y, z: q.z };
  };
  const name = (r: PostRow): string => r.wallId ?? r.name.replace('Purlin ', '');
  return [
    { a: at(prev.offset), b: at(row.offset), label: `${name(prev)} ${Math.round(row.offset - prev.offset)} mm` },
    { a: at(row.offset), b: at(next.offset), label: `${name(next)} ${Math.round(next.offset - row.offset)} mm` },
  ];
}
