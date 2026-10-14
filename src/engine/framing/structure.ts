import type { BraceDirection, FramingWarning, Member, PostGrid, PostOverride, PostRow, StructureParams, Wall, WallId, WallPosts } from '@/types';
import { cutProfile, nextId, rectProfile, toDeg, X_AXIS, Y_AXIS, Z_AXIS } from '../geometry';
import { computeRoofLines, type RoofLines } from './roofLines';
import { resolvePostPositions } from '../postOverrides';
import { postBottomLevel } from '../build';
import { computeWallFrame, hasWallPosts, wallExtent, wallParts } from './wallFrame';
import { groundAt, groundPlaneOf } from '../groundSlope';

const SQRT2 = Math.SQRT2;

/** Override key prefix of the post row under intermediate purlin `index`. */
export const midRowPrefix = (index: number): string => `mid${index}`;

/** Equal subdivision of a purlin row `span` long (post axis to post axis) into bays ≤ max spacing (or a manual post count). */
function rowPositions(params: StructureParams, span: number): { positions: number[]; spacing: number } {
  const pw = params.timber.post.width;
  const manual = params.postsPerRow !== null && Number.isFinite(params.postsPerRow) ? Math.min(Math.max(Math.round(params.postsPerRow), 2), 40) : null;
  const clearSpan = Math.max(span - pw, 1);
  const bays = manual !== null ? manual - 1 : Math.max(1, Math.ceil(clearSpan / Math.max(params.maxPostSpacing, 500)));
  const spacing = clearSpan / bays;
  const positions: number[] = [];
  for (let i = 0; i <= bays; i++) positions.push(pw / 2 + i * spacing);
  return { positions, spacing };
}

/**
 * Intermediate posts of a closed wall that carries no purlin: the purlin rows already provide a
 * post wherever they meet the wall (`anchors`), the remaining gaps are subdivided to the max
 * post spacing. Returned WITHOUT the anchor positions of the eave rows (first / last anchor).
 */
function wallPostPositions(params: StructureParams, anchors: number[]): number[] {
  const maxSpacing = Math.max(params.maxPostSpacing, 500);
  const positions: number[] = [];
  for (let k = 0; k < anchors.length - 1; k++) {
    const a = anchors[k];
    const b = anchors[k + 1];
    const bays = Math.max(1, Math.ceil((b - a) / maxSpacing));
    const s = (b - a) / bays;
    for (let j = 1; j < bays; j++) positions.push(a + j * s);
    if (k < anchors.length - 2) positions.push(b);
  }
  return positions;
}

/**
 * Post axis grid in the canonical frame.
 *  - classic: purlin rows along X (front, intermediate, rear); closed side walls get posts along Z.
 *  - sloped-purlins: purlin rows along Z (left, intermediate, right); closed front / rear walls get posts along X.
 * Every row is subdivided to the max post spacing (or the manual post count); post overrides
 * move or remove individual posts.
 */
export function computePostGrid(params: StructureParams, overrides: Record<string, PostOverride> = {}, roof: RoofLines = computeRoofLines(params)): PostGrid {
  const pw = params.timber.post.width;
  const { length: L, width: W } = params;
  const scheme = params.roofScheme;

  const rowAxis: 'x' | 'z' = scheme === 'sloped-purlins' ? 'z' : 'x';
  const rowSpan = rowAxis === 'x' ? L : W;
  const { positions: defaults, spacing: postSpacing } = rowPositions(params, rowSpan);
  const rowBounds = { min: pw / 2, max: rowSpan - pw / 2 };
  const midOffsets = rowAxis === 'x' ? roof.midPurlinZ : roof.midPurlinX;

  const makeRow = (key: string, offset: number, name: string, nameDe: string, extra: Partial<PostRow>): PostRow => {
    const resolved = resolvePostPositions(defaults, overrides, rowBounds, key);
    return { key, axis: rowAxis, offset, positions: resolved.map((p) => p.position), keys: resolved.map((p) => p.key), name, nameDe, ...extra };
  };
  const mids = midOffsets.map((offset, index) =>
    makeRow(midRowPrefix(index), offset, midOffsets.length > 1 ? `Purlin mid ${index + 1}` : 'Purlin mid', 'Mittelpfette', { index }),
  );
  const rows: PostRow[] =
    rowAxis === 'x'
      ? [
          makeRow('front', roof.frontPurlinZ, 'Purlin front', 'Pfette vorne', { wallId: 'front' }),
          ...mids,
          makeRow('rear', roof.rearPurlinZ, 'Purlin rear', 'Pfette hinten', { wallId: 'rear' }),
        ]
      : [
          makeRow('left', pw / 2, 'Purlin left', 'Pfette links', { wallId: 'left' }),
          ...mids,
          makeRow('right', L - pw / 2, 'Purlin right', 'Pfette rechts', { wallId: 'right' }),
        ];

  // Walls without a purlin: anchors are the row lines crossing the wall
  const wallSpan = rowAxis === 'x' ? W : L;
  const anchors = [pw / 2, ...midOffsets, wallSpan - pw / 2];
  const wallDefaults = wallPostPositions(params, anchors);
  const wallBounds = { min: pw / 2, max: wallSpan - pw / 2 };
  const plainWalls: WallId[] = rowAxis === 'x' ? ['left', 'right'] : ['front', 'rear'];
  const wallPosts: Partial<Record<WallId, WallPosts>> = {};
  for (const id of plainWalls) {
    const resolved = resolvePostPositions(wallDefaults, overrides, wallBounds, id);
    wallPosts[id] = { positions: resolved.map((p) => p.position), keys: resolved.map((p) => p.key) };
  }

  return { scheme, rows, wallPosts, postSpacing };
}

/** Post positions of the first row – the nominal grid the UI reports. */
export const gridPostCount = (grid: PostGrid): number => grid.rows[0]?.positions.length ?? 0;

/** Ground point of post `i` of a row. */
export const rowPoint = (row: PostRow, pos: number): { x: number; z: number } => (row.axis === 'x' ? { x: pos, z: row.offset } : { x: row.offset, z: pos });

/** Purlin top at the post of a row (classic rows are level, sloped rows follow the roof). */
export function rowPurlinTop(row: PostRow, roof: RoofLines, pos: number): number {
  return row.axis === 'x' ? roof.purlinTopAt(row.offset) : roof.purlinTopAt(pos);
}

/**
 * Underside of the purlin above a post of a row = post top. Sloped purlins are `bh / cos` thick
 * measured plumb.
 */
export function rowPostTop(row: PostRow, roof: RoofLines, params: StructureParams, pos: number): number {
  const bh = params.timber.beam.height;
  return row.axis === 'x' ? rowPurlinTop(row, roof, pos) - bh : roof.railBottomAt(pos);
}

/** Posts of every purlin row plus the intermediate posts of closed walls that carry no purlin. */
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
  const sloped = grid.scheme === 'sloped-purlins';
  // posts stand on the (possibly falling) ground, on their bases: the foot is the ground there
  // plus the post bottom level (base gap above the concrete / curb top); the top stays
  const ground = groundPlaneOf(params, true);
  const base = postBottomLevel(params);

  for (const row of grid.rows) {
    const label = row.name.replace('Purlin', 'Post');
    const labelDe = row.nameDe === 'Mittelpfette' ? 'Pfosten mitte' : row.nameDe.replace('Pfette', 'Pfosten');
    row.positions.forEach((pos, i) => {
      const p = rowPoint(row, pos);
      const foot = groundAt(ground, p.x, p.z) + base;
      const top = rowPostTop(row, roof, params, pos) - foot;
      // sloped purlin: top cut follows the slope, +Z side is lower
      const profile = sloped ? cutProfile(top, section.height, 0, -roof.pitchDeg) : rectProfile(top, section.height);
      members.push({
        id: row.keys[i],
        category: 'post',
        name: `${label} ${i + 1}`,
        nameDe: labelDe,
        group: 'Post (Pfosten)',
        section,
        length: sloped ? top + (section.height / 2) * roof.tan : top,
        start: { x: p.x, y: foot, z: p.z },
        direction: Y_AXIS,
        up: Z_AXIS,
        cuts: { start: 0, end: sloped ? roundDeg(roof.pitchDeg) : 0 },
        profile,
        wallId: row.wallId,
        notes: sloped ? 'Top cut to purlin slope' : undefined,
      });
    });
  }

  // Intermediate posts of closed walls without a purlin (classic: under the sloped side rail,
  // sloped-purlins: under the level front / rear rail)
  const midOffsets = sloped ? roof.midPurlinX : roof.midPurlinZ;
  for (const [id, posts] of Object.entries(grid.wallPosts) as [WallId, WallPosts][]) {
    if (!hasWallPosts(walls[id])) continue;
    const exts = wallParts(walls[id], id === 'front' || id === 'rear' ? params.length : params.width).map((w) => wallExtent(w, id === 'front' || id === 'rear' ? params.length : params.width));
    const labelDe = `Pfosten ${id === 'left' ? 'links' : id === 'right' ? 'rechts' : id === 'front' ? 'vorne' : 'hinten'}`;
    const fixed = id === 'left' || id === 'front' ? pw / 2 : (id === 'right' ? params.length : params.width) - pw / 2;
    posts.positions.forEach((pos, i) => {
      // a purlin row already places a post where it meets the wall
      if (midOffsets.some((m) => Math.abs(m - pos) < 1)) return;
      // no rail above posts beyond a shortened wall (or its screen part)
      if (!exts.some((ext) => pos >= ext.start - pw / 2 && pos <= ext.end + pw / 2)) return;
      const alongZ = id === 'left' || id === 'right';
      const plan = alongZ ? { x: fixed, z: pos } : { x: pos, z: fixed };
      const foot = groundAt(ground, plan.x, plan.z) + base;
      const start = { ...plan, y: foot };
      if (alongZ) {
        // classic: under the sloped side rail
        const centreHeight = roof.railBottomAt(pos) - foot;
        members.push({
          id: posts.keys[i],
          category: 'post',
          name: `Post ${id} ${i + 1}`,
          nameDe: labelDe,
          group: 'Post (Pfosten)',
          section,
          length: centreHeight + (section.height / 2) * roof.tan,
          start,
          direction: Y_AXIS,
          up: Z_AXIS,
          cuts: { start: 0, end: roundDeg(roof.pitchDeg) },
          profile: cutProfile(centreHeight, section.height, 0, -roof.pitchDeg),
          wallId: id,
          notes: 'Top cut to rail slope',
        });
      } else {
        // sloped-purlins: under the level rail of the front / rear wall
        const top = roof.purlinTopAt(fixed) - bh - foot;
        members.push({
          id: posts.keys[i],
          category: 'post',
          name: `Post ${id} ${i + 1}`,
          nameDe: labelDe,
          group: 'Post (Pfosten)',
          section,
          length: top,
          start,
          direction: Y_AXIS,
          up: Z_AXIS,
          cuts: { start: 0, end: 0 },
          profile: rectProfile(top, section.height),
          wallId: id,
        });
      }
    });
  }
  return members;
}

/**
 * Purlins (Pfetten) on every post row, spliced over posts when longer than stock.
 * classic: level along X. sloped-purlins: down the slope along Z, plumb-cut tails.
 */
export function generatePurlins(
  params: StructureParams,
  roof: RoofLines,
  grid: PostGrid,
  warnings: FramingWarning[],
): Member[] {
  const { timber, overhangs } = params;
  const section = { width: timber.beam.width, height: timber.beam.height };
  const bh = section.height;
  const members: Member[] = [];
  const sloped = grid.scheme === 'sloped-purlins';
  const start = sloped ? -overhangs.front : -overhangs.left;
  const end = sloped ? params.width + overhangs.rear : params.length + overhangs.right;
  // stock length is measured along the member, splits are planned in plan
  const stockPlan = sloped ? params.maxStockLength * roof.cos : params.maxStockLength;

  for (const row of grid.rows) {
    const pieces = splitAtPosts(start, end, row.positions, stockPlan);
    if (pieces.length > 1 && pieces.some((p) => !p.overPost)) {
      warnings.push({
        level: 'warning',
        message: `${row.name}: post spacing exceeds stock length ${params.maxStockLength} mm – splice cannot be placed over a post.`,
      });
    }
    pieces.forEach((piece, i) => {
      const plan = piece.end - piece.start;
      const name = pieces.length > 1 ? `${row.name} (part ${i + 1})` : row.name;
      const notes = pieces.length > 1 ? 'Spliced over post (Hakenblatt / Stoß)' : undefined;
      if (!sloped) {
        members.push({
          id: nextId('purlin'),
          category: 'beam',
          name,
          nameDe: row.nameDe,
          group: 'Purlin (Pfette)',
          section,
          length: plan,
          start: { x: piece.start, y: roof.purlinTopAt(row.offset) - bh / 2, z: row.offset },
          direction: X_AXIS,
          up: Y_AXIS,
          cuts: { start: 0, end: 0 },
          profile: rectProfile(plan, bh),
          wallId: row.wallId,
          purlinRow: row.key,
          notes,
        });
      } else {
        const axisLength = plan / roof.cos;
        const pitch = round1(roof.pitchDeg);
        members.push({
          id: nextId('purlin'),
          category: 'beam',
          name,
          nameDe: row.nameDe,
          group: 'Purlin (Pfette)',
          section,
          length: Math.round(axisLength),
          start: { x: row.offset, y: roof.purlinTopAt(piece.start) - bh / 2 / roof.cos, z: piece.start },
          direction: { x: 0, y: -roof.sin, z: roof.cos },
          up: { x: 0, y: roof.cos, z: roof.sin },
          cuts: { start: pitch, end: pitch },
          profile: cutProfile(axisLength, bh, pitch, -pitch),
          wallId: row.wallId,
          purlinRow: row.key,
          notes: `Sloped ${roof.pitchDeg.toFixed(1)}°, plumb-cut tails${notes ? ' – ' + notes : ''}`,
        });
      }
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

/**
 * Sides (-1 = towards the row start, +1 = towards the row end) on which post `i` of `n`
 * gets a knee brace. A brace is never placed beyond the end of the purlin row.
 */
export function braceSides(direction: BraceDirection, i: number, n: number): number[] {
  const canLeft = i > 0;
  const canRight = i < n - 1;
  const wanted: number[] =
    direction === 'both' ? [-1, 1] : direction === 'left' ? [-1] : direction === 'right' ? [1] : [i % 2 === 0 ? 1 : -1];
  return wanted.filter((s) => (s < 0 ? canLeft : canRight));
}

/** One knee brace of the layout: post `postIndex` of row `rowKey`, leaning towards `side`. */
export interface BracePlacement {
  rowKey: string;
  postIndex: number;
  /** Post axis position along the row */
  pos: number;
  /** -1 = towards the start of the brace's axis, +1 = towards its end */
  side: number;
  /** Underside of the purlin / rail where the brace top lands */
  top: number;
  /** Axis the brace leans along (the plane it stiffens) */
  axis: 'x' | 'z';
  /** Set for a brace across the rows: the outer wall whose rail (Rähm) carries its top */
  wall?: WallId;
  /** Ground point of the post axis */
  x: number;
  z: number;
}

/** Rail (Rähm) stretches of a wall without a purlin, as [start, end] along the wall (empty when it has no rail). */
export function wallRailSpans(id: WallId, params: StructureParams, wall: Wall, roof: RoofLines, grid: PostGrid): [number, number][] {
  if (!(hasWallPosts(wall) || wall.rail)) return [];
  const frame = computeWallFrame(id, params, wall, roof, grid);
  if (frame.hasPurlin) return [];
  const bw = params.timber.beam.width;
  const rowU = frame.sloped ? roof.purlins.map((p) => p.z) : [frame.postU[0], ...roof.midPurlinX, frame.postU[frame.postU.length - 1]];
  const spans: [number, number][] = [];
  // an explicit rail runs the full wall length, even past a shortened closed stretch; a screen
  // part beside the closed stretch has a rail of its own
  const exts = wall.rail ? [{ start: -Infinity, end: Infinity }] : wallParts(wall, frame.length).map((w) => wallExtent(w, frame.length));
  for (const ext of exts) {
    for (let k = 0; k < rowU.length - 1; k++) {
      const a = Math.max(rowU[k] + bw / 2, ext.start);
      const b = Math.min(rowU[k + 1] - bw / 2, ext.end);
      if (b - a > 100) spans.push([a, b]);
    }
  }
  return spans;
}

/**
 * Where knee braces actually end up: every wanted brace whose post is tall enough
 * (post top ≥ leg + 400 mm). Shared by the member generator and the statics engine so
 * both see the same braces.
 *  - along the rows: from every row post up to its purlin (classic: across the slope)
 *  - across the rows: from the end post of a row up to the rail of the outer wall it stands in,
 *    when that wall has a rail (closed wall, slat screen or a rail on an open side)
 */
export function braceLayout(params: StructureParams, roof: RoofLines, grid: PostGrid, walls?: Record<WallId, Wall>): BracePlacement[] {
  if (!params.braces) return [];
  const pw = params.timber.post.width;
  const leg = Math.max(300, params.braceLeg);
  const sloped = grid.scheme === 'sloped-purlins';
  const out: BracePlacement[] = [];
  for (const row of grid.rows) {
    const positions = row.positions;
    positions.forEach((pos, i) => {
      const p = rowPoint(row, pos);
      for (const side of braceSides(params.braceDirection, i, positions.length)) {
        const topPos = pos + side * (pw / 2 + leg);
        const top = sloped ? roof.railBottomAt(topPos) : rowPostTop(row, roof, params, pos);
        if (top < leg + 400) continue; // post too short for a brace
        out.push({ rowKey: row.key, postIndex: i, pos, side, top, axis: row.axis, x: p.x, z: p.z });
      }
    });
  }
  if (!walls) return out;

  // Across the rows: the walls without a purlin run perpendicular to the rows
  const crossWalls: WallId[] = sloped ? ['front', 'rear'] : ['left', 'right'];
  const crossAxis: 'x' | 'z' = sloped ? 'x' : 'z';
  const rowCoord = (row: PostRow) => row.offset; // the row's position along the wall
  for (const id of crossWalls) {
    const spans = wallRailSpans(id, params, walls[id], roof, grid);
    if (spans.length === 0) continue;
    const frame = computeWallFrame(id, params, walls[id], roof, grid);
    const wallLine = id === 'left' || id === 'front' ? pw / 2 : (id === 'right' ? params.length : params.width) - pw / 2;
    for (const row of grid.rows) {
      // the row's post standing in this wall
      const i = row.positions.findIndex((pos) => Math.abs(pos - wallLine) < pw);
      if (i < 0) continue;
      const u = rowCoord(row);
      for (const side of [-1, 1]) {
        const uTop = u + side * (pw / 2 + leg);
        if (!spans.some(([a, b]) => uTop >= a && uTop <= b)) continue;
        const top = frame.studTopAt(uTop);
        if (top < leg + 400) continue;
        const p = rowPoint(row, row.positions[i]);
        out.push({ rowKey: row.key, postIndex: i, pos: u, side, top, axis: crossAxis, wall: id, x: p.x, z: p.z });
      }
    }
  }
  return out;
}

/**
 * 45° knee braces (Kopfbänder) between posts and purlins in the plane of every purlin row.
 * Under a sloped purlin the brace top lands on the purlin underside at the brace's own Z, so
 * the upper cut deviates from 45° by the roof pitch (noted on the member).
 */
export function generateBraces(params: StructureParams, roof: RoofLines, grid: PostGrid, walls?: Record<WallId, Wall>): Member[] {
  const layout = braceLayout(params, roof, grid, walls);
  if (layout.length === 0) return [];
  const { timber } = params;
  const pw = timber.post.width;
  const section = { width: timber.brace.width, height: timber.brace.height };
  const leg = Math.max(300, params.braceLeg);
  const axisLength = leg * SQRT2;
  const members: Member[] = [];
  const sloped = grid.scheme === 'sloped-purlins';
  const rows = new Map(grid.rows.map((r) => [r.key, r]));

  for (const brace of layout) {
    const row = rows.get(brace.rowKey);
    if (!row) continue;
    const { side: s, top, postIndex: i, axis } = brace;
    const cross = brace.wall;
    const rowWord = row.wallId ?? row.name.replace('Purlin ', '');
    const nameDe = cross ? `Kopfband ${SIDE_DE[cross]}` : row.wallId ? `Kopfband ${SIDE_DE[row.wallId]}` : 'Kopfband mitte';
    // brace foot on the post face it leans away from
    const start = { x: brace.x + (axis === 'x' ? s * (pw / 2) : 0), y: top - leg, z: brace.z + (axis === 'z' ? s * (pw / 2) : 0) };
    const direction = axis === 'x' ? { x: s / SQRT2, y: 1 / SQRT2, z: 0 } : { x: 0, y: 1 / SQRT2, z: s / SQRT2 };
    const up = axis === 'x' ? { x: s / SQRT2, y: -1 / SQRT2, z: 0 } : { x: 0, y: -1 / SQRT2, z: s / SQRT2 };
    // The member above slopes along Z (sloped purlin, or the side rail of a classic roof)
    const slopedAbove = axis === 'z' && (sloped || Boolean(cross));
    const endCut = slopedAbove ? round1(45 - s * roof.pitchDeg) : 45;
    members.push({
      id: nextId('brace'),
      category: 'brace',
      name: cross ? `Knee brace ${cross} rail ${rowWord} ${s > 0 ? 'R' : 'L'}` : `Knee brace ${rowWord} ${i + 1}${s > 0 ? 'R' : 'L'}`,
      nameDe,
      group: 'Knee brace (Kopfband)',
      section,
      length: Math.round(axisLength + section.height),
      start,
      direction,
      up,
      cuts: { start: 45, end: endCut },
      profile: cutProfile(axisLength, section.height, 45, endCut),
      wallId: cross ?? row.wallId,
      notes: slopedAbove ? `Upper cut ${endCut}° against the sloped ${cross ? 'rail' : 'purlin'}` : undefined,
    });
  }
  return members;
}

const SIDE_DE: Record<WallId, string> = { front: 'vorne', rear: 'hinten', left: 'links', right: 'rechts' };

function roundDeg(deg: number): number {
  return Math.round(Math.abs(deg) * 10) / 10;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export { toDeg };
