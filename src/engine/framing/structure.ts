import type { FramingWarning, Member, PostGrid, PostOverride, StructureParams, Wall, WallId } from '@/types';
import { cutProfile, nextId, rectProfile, toDeg, X_AXIS, Y_AXIS, Z_AXIS } from '../geometry';
import type { RoofLines } from './roofLines';
import { resolvePostPositions } from '../postOverrides';

const SQRT2 = Math.SQRT2;

/** Post axis grid along the purlin rows (X) and, for closed side walls, along Z. */
export function computePostGrid(params: StructureParams, overrides: Record<string, PostOverride> = {}): PostGrid {
  const pw = params.timber.post.width;
  const spanX = Math.max(params.length - pw, 1);
  const manual = params.postsPerRow !== null && Number.isFinite(params.postsPerRow) ? Math.min(Math.max(Math.round(params.postsPerRow), 2), 40) : null;
  const baysX = manual !== null ? manual - 1 : Math.max(1, Math.ceil(spanX / Math.max(params.maxPostSpacing, 500)));
  const postSpacing = spanX / baysX;
  const xPositions: number[] = [];
  for (let i = 0; i <= baysX; i++) xPositions.push(pw / 2 + i * postSpacing);

  const spanZ = Math.max(params.width - pw, 1);
  const baysZ = Math.max(1, Math.ceil(spanZ / Math.max(params.maxPostSpacing, 500)));
  const zPositions: number[] = [];
  if (baysZ > 1) {
    const s = spanZ / baysZ;
    for (let j = 1; j < baysZ; j++) zPositions.push(pw / 2 + j * s);
  }
  const xBounds = { min: pw / 2, max: params.length - pw / 2 };
  const zBounds = { min: pw / 2, max: params.width - pw / 2 };
  const front = resolvePostPositions(xPositions, overrides, xBounds, 'front');
  const rear = resolvePostPositions(xPositions, overrides, xBounds, 'rear');
  const left = resolvePostPositions(zPositions, overrides, zBounds, 'left');
  const right = resolvePostPositions(zPositions, overrides, zBounds, 'right');
  const frontXPositions = front.map((p) => p.position);
  const rearXPositions = rear.map((p) => p.position);
  const leftZPositions = left.map((p) => p.position);
  const rightZPositions = right.map((p) => p.position);
  return {
    xPositions: frontXPositions,
    frontXPositions,
    frontXKeys: front.map((p) => p.key),
    rearXPositions,
    rearXKeys: rear.map((p) => p.key),
    zPositions: leftZPositions,
    leftZPositions,
    leftZKeys: left.map((p) => p.key),
    rightZPositions,
    rightZKeys: right.map((p) => p.key),
    postSpacing,
  };
}

/** Front & rear post rows plus intermediate side posts under sloped rails (closed side walls only). */
export function generatePosts(
  params: StructureParams,
  walls: Record<WallId, Wall>,
  roof: RoofLines,
  grid: PostGrid,
): Member[] {
  const { timber } = params;
  const pw = timber.post.width;
  const bh = timber.beam.height;
  const members: Member[] = [];
  const section = { width: timber.post.width, height: timber.post.height };

  const rows: { wallId: WallId; z: number; top: number; label: string; labelDe: string }[] = [
    { wallId: 'front', z: roof.frontPurlinZ, top: params.frontHeight - bh, label: 'Post front', labelDe: 'Pfosten vorne' },
    { wallId: 'rear', z: roof.rearPurlinZ, top: params.rearHeight - bh, label: 'Post rear', labelDe: 'Pfosten hinten' },
  ];

  for (const row of rows) {
    const positions = row.wallId === 'front' ? grid.frontXPositions : grid.rearXPositions;
    positions.forEach((x, i) => {
      members.push({
        id: (row.wallId === 'front' ? grid.frontXKeys : grid.rearXKeys)[i],
        category: 'post',
        name: `${row.label} ${i + 1}`,
        nameDe: row.labelDe,
        group: 'Post (Pfosten)',
        section,
        length: row.top,
        start: { x, y: 0, z: row.z },
        direction: Y_AXIS,
        up: Z_AXIS,
        cuts: { start: 0, end: 0 },
        profile: rectProfile(row.top, section.height),
        wallId: row.wallId,
      });
    });
  }

  // Intermediate side posts (support the sloped side rail)
  const sides: { wallId: WallId; x: number; labelDe: string }[] = [
    { wallId: 'left', x: pw / 2, labelDe: 'Pfosten links' },
    { wallId: 'right', x: params.length - pw / 2, labelDe: 'Pfosten rechts' },
  ];
  for (const side of sides) {
    if (!walls[side.wallId].closed) continue;
    const positions = side.wallId === 'left' ? grid.leftZPositions : grid.rightZPositions;
    positions.forEach((z, i) => {
      const centreHeight = roof.railBottomAt(z);
      // top cut follows the rail slope: +v (= +Z) side is lower
      const profile = cutProfile(centreHeight, section.height, 0, -roof.pitchDeg);
      members.push({
        id: (side.wallId === 'left' ? grid.leftZKeys : grid.rightZKeys)[i],
        category: 'post',
        name: `Post ${side.wallId} ${i + 1}`,
        nameDe: side.labelDe,
        group: 'Post (Pfosten)',
        section,
        length: centreHeight + (section.height / 2) * roof.tan,
        start: { x: side.x, y: 0, z },
        direction: Y_AXIS,
        up: Z_AXIS,
        cuts: { start: 0, end: roundDeg(roof.pitchDeg) },
        profile,
        wallId: side.wallId,
        notes: 'Top cut to rail slope',
      });
    });
  }
  return members;
}

/** Purlins (Pfetten) along X on both post rows, spliced over posts when longer than stock. */
export function generatePurlins(
  params: StructureParams,
  roof: RoofLines,
  grid: PostGrid,
  warnings: FramingWarning[],
): Member[] {
  const { timber, overhangs } = params;
  const section = { width: timber.beam.width, height: timber.beam.height };
  const xStart = -overhangs.left;
  const xEnd = params.length + overhangs.right;
  const members: Member[] = [];

  const rows: { wallId: WallId; z: number; top: number; name: string; nameDe: string }[] = [
    { wallId: 'front', z: roof.frontPurlinZ, top: params.frontHeight, name: 'Purlin front', nameDe: 'Pfette vorne' },
    { wallId: 'rear', z: roof.rearPurlinZ, top: params.rearHeight, name: 'Purlin rear', nameDe: 'Pfette hinten' },
  ];

  for (const row of rows) {
    const positions = row.wallId === 'front' ? grid.frontXPositions : grid.rearXPositions;
    const pieces = splitAtPosts(xStart, xEnd, positions, params.maxStockLength);
    if (pieces.length > 1 && pieces.some((p) => !p.overPost)) {
      warnings.push({
        level: 'warning',
        message: `${row.name}: post spacing exceeds stock length ${params.maxStockLength} mm – splice cannot be placed over a post.`,
      });
    }
    pieces.forEach((piece, i) => {
      const length = piece.end - piece.start;
      members.push({
        id: nextId('purlin'),
        category: 'beam',
        name: pieces.length > 1 ? `${row.name} (part ${i + 1})` : row.name,
        nameDe: row.nameDe,
        group: 'Purlin (Pfette)',
        section,
        length,
        start: { x: piece.start, y: row.top - section.height / 2, z: row.z },
        direction: X_AXIS,
        up: Y_AXIS,
        cuts: { start: 0, end: 0 },
        profile: rectProfile(length, section.height),
        wallId: row.wallId,
        notes: pieces.length > 1 ? 'Spliced over post (Hakenblatt / Stoß)' : undefined,
      });
    });
  }
  return members;
}

interface SplitPiece {
  start: number;
  end: number;
  overPost: boolean;
}

/** Greedy split of [start,end] into pieces ≤ maxLength, preferring cut positions over posts. */
export function splitAtPosts(start: number, end: number, posts: number[], maxLength: number): SplitPiece[] {
  const pieces: SplitPiece[] = [];
  let cursor = start;
  let guard = 0;
  while (end - cursor > maxLength && guard++ < 50) {
    const candidates = posts.filter((p) => p > cursor + 300 && p - cursor <= maxLength);
    if (candidates.length > 0) {
      const cut = candidates[candidates.length - 1];
      pieces.push({ start: cursor, end: cut, overPost: true });
      cursor = cut;
    } else {
      pieces.push({ start: cursor, end: cursor + maxLength, overPost: false });
      cursor += maxLength;
    }
  }
  pieces.push({ start: cursor, end, overPost: true });
  return pieces;
}

/** 45° knee braces (Kopfbänder) between posts and purlins along both purlin rows. */
export function generateBraces(params: StructureParams, roof: RoofLines, grid: PostGrid): Member[] {
  if (!params.braces) return [];
  const { timber } = params;
  const pw = timber.post.width;
  const bh = timber.beam.height;
  const section = { width: timber.brace.width, height: timber.brace.height };
  const leg = Math.max(300, params.braceLeg);
  const axisLength = leg * SQRT2;
  const members: Member[] = [];

  const rows: { wallId: WallId; z: number; top: number; nameDe: string }[] = [
    { wallId: 'front', z: roof.frontPurlinZ, top: params.frontHeight - bh, nameDe: 'Kopfband vorne' },
    { wallId: 'rear', z: roof.rearPurlinZ, top: params.rearHeight - bh, nameDe: 'Kopfband hinten' },
  ];

  for (const row of rows) {
    if (row.top < leg + 400) continue; // post too short for a brace
    const positions = row.wallId === 'front' ? grid.frontXPositions : grid.rearXPositions;
    positions.forEach((x, i) => {
      const dirs: number[] = [];
      if (i > 0) dirs.push(-1);
      if (i < positions.length - 1) dirs.push(1);
      for (const s of dirs) {
        const start = { x: x + s * (pw / 2), y: row.top - leg, z: row.z };
        const direction = { x: s / SQRT2, y: 1 / SQRT2, z: 0 };
        const up = { x: s / SQRT2, y: -1 / SQRT2, z: 0 };
        members.push({
          id: nextId('brace'),
          category: 'brace',
          name: `Knee brace ${row.wallId} ${i + 1}${s > 0 ? 'R' : 'L'}`,
          nameDe: row.nameDe,
          group: 'Knee brace (Kopfband)',
          section,
          length: Math.round(axisLength + section.height),
          start,
          direction,
          up,
          cuts: { start: 45, end: 45 },
          profile: cutProfile(axisLength, section.height, 45, 45),
          wallId: row.wallId,
        });
      }
    });
  }
  return members;
}

function roundDeg(deg: number): number {
  return Math.round(Math.abs(deg) * 10) / 10;
}

export { toDeg };
