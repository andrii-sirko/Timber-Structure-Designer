import type {
  FramingResult,
  Member,
  Opening,
  Panel,
  Partition,
  ProjectState,
  RoofDirection,
  StructureParams,
  Vec3,
  Vehicle,
  Wall,
  WallId,
} from '@/types';
import { WALL_IDS } from '@/types';
import { toDeg, toRad } from './geometry';

/**
 * Roof orientation.
 *
 * The framing engine only knows one layout: the roof slopes down from the front purlin (H1)
 * to the rear purlin (H2) along +Z – the CANONICAL frame. `roofDirection` picks the world
 * wall that carries the low eave. This module rotates a world project into the canonical
 * frame (`canonicalizeProject`) and rotates the generated geometry back (`framingToWorld`).
 *
 * All four cases are proper rotations about Y around the footprint, so handedness, member
 * profiles and wall start-corner conventions survive; only the wall *ids* and, for the side
 * cases, the length/width roles are exchanged.
 *
 *   direction  world → canonical (x', z')      L' W'
 *   rear       identity                         L  W
 *   front      (L − x, W − z)   180°            L  W
 *   left       (z, L − x)        90°            W  L
 *   right      (W − z, x)       −90°            W  L
 */

/** Affine map on the ground plane: x' = a·x + b·z + tx, z' = c·x + d·z + tz. */
export interface GroundMap {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  tz: number;
}

const IDENTITY: GroundMap = { a: 1, b: 0, c: 0, d: 1, tx: 0, tz: 0 };

export const isSideDirection = (dir: RoofDirection): boolean => dir === 'left' || dir === 'right';

/** Canonical (engine) length and width for the given world dimensions. */
export function canonicalDims(params: Pick<StructureParams, 'length' | 'width' | 'roofDirection'>): { length: number; width: number } {
  return isSideDirection(params.roofDirection) ? { length: params.width, width: params.length } : { length: params.length, width: params.width };
}

/** World → canonical ground map for a footprint of world size L × W. */
export function worldToCanonicalMap(dir: RoofDirection, L: number, W: number): GroundMap {
  switch (dir) {
    case 'rear':
      return IDENTITY;
    case 'front':
      return { a: -1, b: 0, c: 0, d: -1, tx: L, tz: W };
    case 'left':
      return { a: 0, b: 1, c: -1, d: 0, tx: 0, tz: L };
    case 'right':
      return { a: 0, b: -1, c: 1, d: 0, tx: W, tz: 0 };
  }
}

/** Canonical → world ground map (inverse of `worldToCanonicalMap`) for a footprint of world size L × W. */
export function canonicalToWorldMap(dir: RoofDirection, L: number, W: number): GroundMap {
  switch (dir) {
    case 'rear':
      return IDENTITY;
    case 'front':
      return { a: -1, b: 0, c: 0, d: -1, tx: L, tz: W };
    case 'left':
      return { a: 0, b: -1, c: 1, d: 0, tx: L, tz: 0 };
    case 'right':
      return { a: 0, b: 1, c: -1, d: 0, tx: 0, tz: W };
  }
}

/** Avoids -0 from multiplying by a negative matrix entry (keeps deep-equality and labels clean). */
const nz = (v: number): number => (v === 0 ? 0 : v);

export const mapPoint = (m: GroundMap, p: { x: number; z: number }): { x: number; z: number } => ({
  x: nz(m.a * p.x + m.b * p.z + m.tx),
  z: nz(m.c * p.x + m.d * p.z + m.tz),
});
export const mapPos = (m: GroundMap, p: Vec3): Vec3 => ({ ...mapPoint(m, p), y: p.y });
export const mapVec = (m: GroundMap, v: Vec3): Vec3 => ({ x: nz(m.a * v.x + m.b * v.z), y: nz(v.y), z: nz(m.c * v.x + m.d * v.z) });

// ── Wall id mapping ─────────────────────────────────────────────────────────

const WALL_TO_CANONICAL: Record<RoofDirection, Record<WallId, WallId>> = {
  rear: { front: 'front', rear: 'rear', left: 'left', right: 'right' },
  front: { front: 'rear', rear: 'front', left: 'right', right: 'left' },
  left: { front: 'left', rear: 'right', left: 'rear', right: 'front' },
  right: { front: 'right', rear: 'left', left: 'front', right: 'rear' },
};

function invert(map: Record<WallId, WallId>): Record<WallId, WallId> {
  const out = {} as Record<WallId, WallId>;
  for (const id of WALL_IDS) out[map[id]] = id;
  return out;
}

const WALL_TO_WORLD: Record<RoofDirection, Record<WallId, WallId>> = {
  rear: invert(WALL_TO_CANONICAL.rear),
  front: invert(WALL_TO_CANONICAL.front),
  left: invert(WALL_TO_CANONICAL.left),
  right: invert(WALL_TO_CANONICAL.right),
};

/** Canonical wall id of a world wall. The world `roofDirection` wall is always the canonical rear. */
export const canonicalWall = (dir: RoofDirection, wall: WallId): WallId => WALL_TO_CANONICAL[dir][wall];
/** World wall id of a canonical wall. */
export const worldWall = (dir: RoofDirection, wall: WallId): WallId => WALL_TO_WORLD[dir][wall];

/** Along-wall unit vector of a wall (its local +u) – the same convention in both frames. */
const wallU = (wall: WallId): Vec3 => (wall === 'front' || wall === 'rear' ? { x: 1, y: 0, z: 0 } : { x: 0, y: 0, z: 1 });

/**
 * true when the world wall's start corner lands on the canonical wall's END corner, i.e. the
 * along-wall coordinate (opening x, post u) must be mirrored: u' = length − u.
 */
export function wallFlipped(dir: RoofDirection, wall: WallId): boolean {
  const m = worldToCanonicalMap(dir, 0, 0);
  const u = mapVec(m, wallU(wall));
  const uc = wallU(canonicalWall(dir, wall));
  return u.x * uc.x + u.z * uc.z < 0;
}

const flipOpenings = (openings: Opening[], length: number): Opening[] => openings.map((o) => ({ ...o, x: length - o.x - o.width }));

// ── Project → canonical ─────────────────────────────────────────────────────

/** Vehicle heading after applying `m` (0° = length axis along +X, see `vehicleCorners`). */
function mapHeading(m: GroundMap, rotationDeg: number): number {
  const th = toRad(rotationDeg);
  const d = mapVec(m, { x: Math.cos(th), y: 0, z: -Math.sin(th) });
  const deg = Math.round(toDeg(Math.atan2(-d.z, d.x)));
  return ((deg % 360) + 360) % 360;
}

/** A partition expressed in the frame reached through `m` (start < end kept, openings mirrored when the run reverses). */
export function mapPartition(m: GroundMap, p: Partition): Partition {
  const along = p.axis === 'x' ? { x: 1, y: 0, z: 0 } : { x: 0, y: 0, z: 1 };
  const p1 = mapPoint(m, p.axis === 'x' ? { x: p.start, z: p.offset } : { x: p.offset, z: p.start });
  const p2 = mapPoint(m, p.axis === 'x' ? { x: p.end, z: p.offset } : { x: p.offset, z: p.end });
  const u = mapVec(m, along);
  const axis = Math.abs(u.x) > 0.5 ? 'x' : 'z';
  const flipped = (axis === 'x' ? u.x : u.z) < 0;
  const offset = axis === 'x' ? p1.z : p1.x;
  const s = axis === 'x' ? p1.x : p1.z;
  const e = axis === 'x' ? p2.x : p2.z;
  return {
    ...p,
    axis,
    offset,
    start: Math.min(s, e),
    end: Math.max(s, e),
    openings: flipped ? flipOpenings(p.openings, p.end - p.start) : p.openings,
  };
}

/** true when a partition's along-wall coordinate is mirrored between world and canonical frame. */
export function partitionFlipped(dir: RoofDirection, p: Pick<Partition, 'axis'>): boolean {
  const m = worldToCanonicalMap(dir, 0, 0);
  const u = mapVec(m, p.axis === 'x' ? { x: 1, y: 0, z: 0 } : { x: 0, y: 0, z: 1 });
  return u.x + u.z < 0;
}

export function canonicalizeParams(params: StructureParams): StructureParams {
  const dir = params.roofDirection;
  if (dir === 'rear') return params;
  const dims = canonicalDims(params);
  const overhangs = { ...params.overhangs };
  for (const id of WALL_IDS) overhangs[canonicalWall(dir, id)] = params.overhangs[id];
  return { ...params, length: dims.length, width: dims.width, overhangs };
}

/**
 * The project as the framing engine sees it: rotated so the roof slopes down towards +Z.
 * `params.roofDirection` is kept for reference; the engine never reads it.
 * Post overrides are already keyed by canonical rows and pass through unchanged.
 */
export function canonicalizeProject(project: ProjectState): ProjectState {
  const dir = project.params.roofDirection;
  if (dir === 'rear') return project;
  const { length: L, width: W } = project.params;
  const m = worldToCanonicalMap(dir, L, W);

  const walls = {} as Record<WallId, Wall>;
  for (const id of WALL_IDS) {
    const c = canonicalWall(dir, id);
    const wall = project.walls[id];
    const wallLength = id === 'front' || id === 'rear' ? L : W;
    walls[c] = { ...wall, id: c, openings: wallFlipped(dir, id) ? flipOpenings(wall.openings, wallLength) : wall.openings };
  }

  const vehicles: Vehicle[] = project.vehicles.map((v) => ({ ...v, ...mapPoint(m, v), rotationDeg: mapHeading(m, v.rotationDeg) }));

  return {
    ...project,
    params: canonicalizeParams(project.params),
    walls,
    partitions: project.partitions.map((p) => mapPartition(m, p)),
    vehicles,
    pavedAreas: project.pavedAreas.map((a) => ({ ...a, points: a.points.map((p) => mapPoint(m, p)) })),
    freePosts: project.freePosts.map((p) => ({ ...p, ...mapPoint(m, p) })),
  };
}

// ── Canonical → world ───────────────────────────────────────────────────────

function memberToWorld(m: GroundMap, dir: RoofDirection, member: Member): Member {
  return {
    ...member,
    start: mapPos(m, member.start),
    direction: mapVec(m, member.direction),
    up: mapVec(m, member.up),
    ...(member.wallId ? { wallId: worldWall(dir, member.wallId) } : {}),
  };
}

function panelToWorld(m: GroundMap, dir: RoofDirection, panel: Panel): Panel {
  return {
    ...panel,
    anchor: mapPos(m, panel.anchor),
    direction: mapVec(m, panel.direction),
    up: mapVec(m, panel.up),
    normal: mapVec(m, panel.normal),
    ...(panel.wallId ? { wallId: worldWall(dir, panel.wallId) } : {}),
  };
}

/**
 * Rotates canonical framing geometry into world space. `params` are the WORLD params.
 * `grid` stays canonical (see `PostGrid`); `roof` is orientation-free.
 */
export function framingToWorld(framing: FramingResult, params: StructureParams): FramingResult {
  const dir = params.roofDirection;
  if (dir === 'rear') return framing;
  const m = canonicalToWorldMap(dir, params.length, params.width);
  return {
    ...framing,
    members: framing.members.map((x) => memberToWorld(m, dir, x)),
    panels: framing.panels.map((x) => panelToWorld(m, dir, x)),
    warnings: framing.warnings.map((w) => (w.wallId ? { ...w, wallId: worldWall(dir, w.wallId) } : w)),
  };
}

/** World ground point → canonical ground point (for pointer interaction with canonical rows). */
export function worldPointToCanonical(params: StructureParams, p: { x: number; z: number }): { x: number; z: number } {
  return mapPoint(worldToCanonicalMap(params.roofDirection, params.length, params.width), p);
}

/** Canonical ground point → world ground point. */
export function canonicalPointToWorld(params: StructureParams, p: { x: number; z: number }): { x: number; z: number } {
  return mapPoint(canonicalToWorldMap(params.roofDirection, params.length, params.width), p);
}

// ── Labels ──────────────────────────────────────────────────────────────────

const SIDE_WORDS: Record<WallId, { en: string; de: string }> = {
  front: { en: 'front', de: 'vorne' },
  rear: { en: 'rear', de: 'hinten' },
  left: { en: 'left', de: 'links' },
  right: { en: 'right', de: 'rechts' },
};

const SIDE_WORD_RE = /\b(front|rear|left|right|vorne|hinten|links|rechts)\b/gi;

/**
 * Rewrites canonical side words ("Post front", "Pfette hinten") in a display string so they
 * name the WORLD wall the piece actually sits on. Case of the first letter is preserved.
 */
export function relabelSides(text: string, dir: RoofDirection): string {
  if (dir === 'rear') return text;
  return text.replace(SIDE_WORD_RE, (word) => {
    const lower = word.toLowerCase();
    const canonical = WALL_IDS.find((id) => SIDE_WORDS[id].en === lower || SIDE_WORDS[id].de === lower);
    if (!canonical) return word;
    const target = SIDE_WORDS[worldWall(dir, canonical)];
    const replacement = SIDE_WORDS[canonical].en === lower ? target.en : target.de;
    return word[0] === word[0].toUpperCase() ? replacement[0].toUpperCase() + replacement.slice(1) : replacement;
  });
}

const relabelOpt = (text: string | undefined, dir: RoofDirection): string | undefined => (text === undefined ? undefined : relabelSides(text, dir));

export function relabelFraming(framing: FramingResult, dir: RoofDirection): FramingResult {
  if (dir === 'rear') return framing;
  return {
    ...framing,
    members: framing.members.map((x) => ({ ...x, name: relabelSides(x.name, dir), nameDe: relabelSides(x.nameDe, dir), notes: relabelOpt(x.notes, dir) })),
    warnings: framing.warnings.map((w) => ({ ...w, message: relabelSides(w.message, dir) })),
  };
}
