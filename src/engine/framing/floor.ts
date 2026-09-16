import type { FloorDecking, FloorGeometry, FloorSettings, FramingWarning, Member, MemberCategory, Panel, ProfilePoint, ProjectState, StructureParams, TimberSection } from '@/types';
import { WALL_IDS } from '@/types';
import { nextId, rectProfile, X_AXIS, Y_AXIS, Z_AXIS } from '../geometry';
import { clampPartition } from './partitions';

export interface DeckingSpec {
  label: string;
  labelDe: string;
  /** Board / sheet thickness (mm) */
  thickness: number;
  /** Mean density (kg/m³) */
  density: number;
  /** Recommended maximum joist centre spacing (mm) */
  maxSpan: number;
  /** Covering width of one board (mm); 0 for sheet material */
  boardWidth: number;
}

export const DECKING: Record<FloorDecking, DeckingSpec> = {
  'spruce-boards': { label: 'Spruce T&G floorboards 28 mm', labelDe: 'Fichte Fußbodendielen 28 mm', thickness: 28, density: 450, maxSpan: 650, boardWidth: 140 },
  osb: { label: 'OSB/3 T&G flooring panels 22 mm', labelDe: 'OSB/3-Verlegeplatte 22 mm', thickness: 22, density: 620, maxSpan: 625, boardWidth: 0 },
  'larch-decking': { label: 'Larch deck boards 27×145 mm', labelDe: 'Lärche Terrassendielen 27×145 mm', thickness: 27, density: 600, maxSpan: 500, boardWidth: 145 },
};

export const FLOOR_DEFAULTS: FloorSettings = {
  enabled: false,
  support: 'bearers',
  joist: { width: 60, height: 120 },
  bearer: { width: 100, height: 100 },
  maxJoistSpacing: 600,
  maxBearerSpacing: 1500,
  maxSupportSpacing: 1200,
  decking: 'spruce-boards',
  liveLoad: 2,
};

/** Imposed floor load presets (EN 1991-1-1 categories, simplified). */
export const FLOOR_LOAD_PRESETS: { label: string; value: number }[] = [
  { label: 'Light use – garden house (2.0 kN/m²)', value: 2 },
  { label: 'Workshop / hobby room (3.0 kN/m²)', value: 3 },
  { label: 'Storage, ride-on mower (5.0 kN/m²)', value: 5 },
];

/** Gap left between floor timber and a post or partition plate (mm). */
const OBSTACLE_GAP = 10;
/** Pieces shorter than this are not worth fitting (mm). */
const MIN_PIECE = 150;
/** Inset of the first / last pad from a sleeper or bearer end (mm). */
const SUPPORT_END_INSET = 100;

interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface FloorLayout {
  settings: FloorSettings;
  deck: DeckingSpec;
  /** Deck extent inside the post frame (canonical mm) */
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  /** Joists run along this axis (the shorter plan side); bearers run along the other */
  joistAxis: 'x' | 'z';
  /** Joist axis positions across `joistAxis` */
  joistOffsets: number[];
  /** Bearer axis positions along `joistAxis` ('bearers' support only) */
  bearerOffsets: number[];
  joistSpacing: number;
  bearerSpacing: number;
  supportSpacing: number;
  /** Joist span between supports */
  joistSpan: number;
  bearerSpan: number;
  /** Underside of the joists / sleepers above the base */
  joistBottom: number;
  deckBottom: number;
  deckTop: number;
}

const positive = (v: number, min: number, fallback: number): number => (Number.isFinite(v) ? Math.max(v, min) : fallback);
const section = (s: TimberSection | undefined, fallback: TimberSection): TimberSection => ({
  width: positive(Number(s?.width), 20, fallback.width),
  height: positive(Number(s?.height), 20, fallback.height),
});

export function sanitizeFloor(input: Partial<FloorSettings> | undefined): FloorSettings {
  const f = { ...FLOOR_DEFAULTS, ...(input ?? {}) };
  return {
    enabled: Boolean(f.enabled),
    support: f.support === 'slab' ? 'slab' : 'bearers',
    joist: section(f.joist, FLOOR_DEFAULTS.joist),
    bearer: section(f.bearer, FLOOR_DEFAULTS.bearer),
    maxJoistSpacing: positive(Number(f.maxJoistSpacing), 200, FLOOR_DEFAULTS.maxJoistSpacing),
    maxBearerSpacing: positive(Number(f.maxBearerSpacing), 400, FLOOR_DEFAULTS.maxBearerSpacing),
    maxSupportSpacing: positive(Number(f.maxSupportSpacing), 300, FLOOR_DEFAULTS.maxSupportSpacing),
    decking: f.decking in DECKING ? f.decking : FLOOR_DEFAULTS.decking,
    liveLoad: positive(Number(f.liveLoad), 0, FLOOR_DEFAULTS.liveLoad),
  };
}

/** Evenly spaced positions from a to b with a spacing of at most `max` (both ends included). */
function evenPositions(a: number, b: number, max: number): number[] {
  if (b - a < 1) return [(a + b) / 2];
  const n = Math.max(2, Math.ceil((b - a) / max) + 1);
  return Array.from({ length: n }, (_, i) => Math.round(a + ((b - a) * i) / (n - 1)));
}

const spacingOf = (positions: number[]): number => (positions.length > 1 ? positions[1] - positions[0] : 0);

/** Floor extent, joist / bearer positions and levels in the CANONICAL frame; null when the floor is off or does not fit. */
export function floorLayout(params: StructureParams): FloorLayout | null {
  const settings = sanitizeFloor(params.floor);
  if (!settings.enabled) return null;
  const pw = params.timber.post.width;
  const inset = Math.max(pw, pw / 2 + params.timber.stud.height / 2);
  const x0 = inset;
  const x1 = params.length - inset;
  const z0 = inset;
  const z1 = params.width - inset;
  if (x1 - x0 < 300 || z1 - z0 < 300) return null;

  const { joist, bearer } = settings;
  const bearers = settings.support === 'bearers';
  // Joists span the shorter side and are spaced along the longer one
  const joistAxis: 'x' | 'z' = x1 - x0 >= z1 - z0 ? 'z' : 'x';
  const [spacedFrom, spacedTo] = joistAxis === 'z' ? [x0, x1] : [z0, z1];
  const [runFrom, runTo] = joistAxis === 'z' ? [z0, z1] : [x0, x1];
  const joistOffsets = evenPositions(spacedFrom + joist.width / 2, spacedTo - joist.width / 2, settings.maxJoistSpacing);
  const bearerOffsets = bearers ? evenPositions(runFrom + bearer.width / 2, runTo - bearer.width / 2, settings.maxBearerSpacing) : [];
  const supportLine = bearers ? [spacedFrom, spacedTo] : [runFrom, runTo];
  const supports = evenPositions(supportLine[0] + SUPPORT_END_INSET, supportLine[1] - SUPPORT_END_INSET, settings.maxSupportSpacing);

  const deck = DECKING[settings.decking];
  const joistBottom = bearers ? bearer.height : 0;
  const deckBottom = joistBottom + joist.height;
  const joistSpacing = spacingOf(joistOffsets);
  const bearerSpacing = spacingOf(bearerOffsets);
  const supportSpacing = spacingOf(supports) || supportLine[1] - supportLine[0];
  return {
    settings,
    deck,
    x0,
    x1,
    z0,
    z1,
    joistAxis,
    joistOffsets,
    bearerOffsets,
    joistSpacing,
    bearerSpacing,
    supportSpacing,
    joistSpan: bearers ? bearerSpacing || runTo - runFrom : supportSpacing,
    bearerSpan: supportSpacing,
    joistBottom,
    deckBottom,
    deckTop: deckBottom + deck.thickness,
  };
}

/** Footprints of posts and partition plates standing inside the floor area. */
function floorObstacles(project: ProjectState, params: StructureParams, members: Member[], layout: FloorLayout): Rect[] {
  const inside = (r: Rect) => r.maxX > layout.x0 && r.minX < layout.x1 && r.maxZ > layout.z0 && r.minZ < layout.z1;
  const out: Rect[] = [];
  for (const m of members) {
    if (m.category !== 'post') continue;
    // posts stand along Y with their section width along X and height along Z
    const r = { minX: m.start.x - m.section.width / 2, maxX: m.start.x + m.section.width / 2, minZ: m.start.z - m.section.height / 2, maxZ: m.start.z + m.section.height / 2 };
    if (inside(r)) out.push(r);
  }
  const sd = params.timber.stud.height;
  for (const raw of project.partitions) {
    const p = clampPartition(raw, params);
    const r =
      p.axis === 'x'
        ? { minX: p.start, maxX: p.end, minZ: p.offset - sd / 2, maxZ: p.offset + sd / 2 }
        : { minX: p.offset - sd / 2, maxX: p.offset + sd / 2, minZ: p.start, maxZ: p.end };
    if (inside(r)) out.push(r);
  }
  return out;
}

/** Free intervals of a run along `axis` from `from` to `to`, centred at `cross` with half width `half`, after cutting out obstacles. */
function freePieces(axis: 'x' | 'z', from: number, to: number, cross: number, half: number, obstacles: Rect[]): [number, number][] {
  const blocked = obstacles
    .filter((o) => (axis === 'x' ? o.minZ < cross + half && o.maxZ > cross - half : o.minX < cross + half && o.maxX > cross - half))
    .map((o) => (axis === 'x' ? [o.minX - OBSTACLE_GAP, o.maxX + OBSTACLE_GAP] : [o.minZ - OBSTACLE_GAP, o.maxZ + OBSTACLE_GAP]))
    .sort((a, b) => a[0] - b[0]);
  const pieces: [number, number][] = [];
  let cursor = from;
  for (const [a, b] of blocked) {
    if (a > cursor) pieces.push([cursor, Math.min(a, to)]);
    cursor = Math.max(cursor, b);
    if (cursor >= to) break;
  }
  if (cursor < to) pieces.push([cursor, to]);
  return pieces.filter(([a, b]) => b - a >= MIN_PIECE);
}

/** Splits a run longer than the stock length into equal pieces. */
function stockPieces([a, b]: [number, number], maxStock: number): [number, number][] {
  const n = Math.max(1, Math.ceil((b - a) / Math.max(maxStock, 1000)));
  return Array.from({ length: n }, (_, i) => [a + ((b - a) * i) / n, a + ((b - a) * (i + 1)) / n] as [number, number]);
}

/** Merges overlapping rectangles into their bounding boxes (deck cut-outs must not overlap). */
function mergeRects(rects: Rect[]): Rect[] {
  const out = rects.map((r) => ({ ...r }));
  let merged = true;
  while (merged) {
    merged = false;
    for (let i = 0; i < out.length && !merged; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const a = out[i];
        const b = out[j];
        if (a.minX <= b.maxX && a.maxX >= b.minX && a.minZ <= b.maxZ && a.maxZ >= b.minZ) {
          out[i] = { minX: Math.min(a.minX, b.minX), maxX: Math.max(a.maxX, b.maxX), minZ: Math.min(a.minZ, b.minZ), maxZ: Math.max(a.maxZ, b.maxZ) };
          out.splice(j, 1);
          merged = true;
          break;
        }
      }
    }
  }
  return out;
}

export interface FloorBuild {
  members: Member[];
  panel?: Panel;
  geometry?: FloorGeometry;
  warnings: FramingWarning[];
}

/**
 * Timber floor inside the post frame (canonical frame): sleepers on pads (slab) or joists on
 * bearers on point foundations, cut around interior posts and partition plates, with the
 * deck as one panel. `members` are the already generated members (posts are obstacles).
 */
export function generateFloor(project: ProjectState, params: StructureParams, members: Member[]): FloorBuild {
  const layout = floorLayout(params);
  if (!layout) return { members: [], warnings: [] };
  const { settings, deck, x0, x1, z0, z1, joistAxis } = layout;
  const bearers = settings.support === 'bearers';
  const bearerAxis: 'x' | 'z' = joistAxis === 'x' ? 'z' : 'x';
  const obstacles = floorObstacles(project, params, members, layout);
  const out: Member[] = [];
  const warnings: FramingWarning[] = [];
  const maxStock = params.maxStockLength;

  const bar = (category: MemberCategory, axis: 'x' | 'z', from: number, to: number, cross: number, yCentre: number, sec: TimberSection, name: string, nameDe: string, group: string, notes?: string): void => {
    const length = Math.round(to - from);
    out.push({
      id: nextId(category),
      category,
      name,
      nameDe,
      group,
      section: sec,
      length,
      start: axis === 'x' ? { x: from, y: yCentre, z: cross } : { x: cross, y: yCentre, z: from },
      direction: axis === 'x' ? X_AXIS : Z_AXIS,
      up: Y_AXIS,
      cuts: { start: 0, end: 0 },
      profile: rectProfile(length, sec.height),
      notes,
    });
  };

  const supportsFor = (len: number): number => Math.max(2, Math.ceil(Math.max(len - 2 * SUPPORT_END_INSET, 0) / settings.maxSupportSpacing) + 1);
  let supportCount = 0;
  let bedLength = 0;
  let crossings = 0;

  const [runFrom, runTo] = joistAxis === 'x' ? [x0, x1] : [z0, z1];
  const [bearerFrom, bearerTo] = bearerAxis === 'x' ? [x0, x1] : [z0, z1];

  if (bearers) {
    let n = 0;
    for (const offset of layout.bearerOffsets) {
      for (const piece of freePieces(bearerAxis, bearerFrom, bearerTo, offset, settings.bearer.width / 2, obstacles)) {
        for (const [a, b] of stockPieces(piece, maxStock)) {
          n += 1;
          bar('bearer', bearerAxis, a, b, offset, settings.bearer.height / 2, settings.bearer, `Floor bearer ${n}`, 'Unterzug', 'Floor bearer (Unterzug)', 'On point foundations, bitumen strip underneath');
          supportCount += supportsFor(b - a);
          bedLength += b - a;
        }
      }
    }
  }

  let j = 0;
  const joistName = bearers ? 'Floor joist' : 'Sleeper';
  const joistNameDe = bearers ? 'Fußbodenbalken' : 'Lagerholz';
  const joistGroup = bearers ? 'Floor joist (Fußbodenbalken)' : 'Sleeper (Lagerholz)';
  for (const offset of layout.joistOffsets) {
    for (const piece of freePieces(joistAxis, runFrom, runTo, offset, settings.joist.width / 2, obstacles)) {
      for (const [a, b] of stockPieces(piece, maxStock)) {
        j += 1;
        bar('joist', joistAxis, a, b, offset, layout.joistBottom + settings.joist.height / 2, settings.joist, `${joistName} ${j}`, joistNameDe, joistGroup, bearers ? undefined : 'On levelling pads on the slab');
        if (bearers) crossings += layout.bearerOffsets.filter((o) => o >= a && o <= b).length;
        else {
          supportCount += supportsFor(b - a);
          bedLength += b - a;
        }
      }
    }
  }

  // Deck: one outline panel with cut-outs for posts and partitions. The canonical → world map
  // always mirrors X, so an extrusion pointing down here (X × Z = −Y) points up in world space.
  const holes = mergeRects(
    obstacles.map((o) => ({ minX: Math.max(o.minX, x0 + 1), maxX: Math.min(o.maxX, x1 - 1), minZ: Math.max(o.minZ, z0 + 1), maxZ: Math.min(o.maxZ, z1 - 1) })).filter((r) => r.maxX > r.minX && r.maxZ > r.minZ),
  );
  const rectOutline = (r: Rect): ProfilePoint[] => [
    { u: r.minX, v: r.minZ },
    { u: r.maxX, v: r.minZ },
    { u: r.maxX, v: r.maxZ },
    { u: r.minX, v: r.maxZ },
  ];
  const grossMm2 = (x1 - x0) * (z1 - z0);
  const holesMm2 = holes.reduce((s, r) => s + (r.maxX - r.minX) * (r.maxZ - r.minZ), 0);
  const areaM2 = (grossMm2 - holesMm2) / 1e6;
  const panel: Panel = {
    id: 'floor-deck',
    kind: 'floor',
    anchor: { x: 0, y: layout.deckBottom, z: 0 },
    direction: X_AXIS,
    up: Z_AXIS,
    normal: Y_AXIS,
    outline: { outer: rectOutline({ minX: x0, maxX: x1, minZ: z0, maxZ: z1 }), holes: holes.map(rectOutline), thickness: deck.thickness },
    areaM2,
    // boards run across the joists; u = X, v = Z
    floorFinish: { decking: settings.decking, boardsAlong: joistAxis === 'z' ? 'u' : 'v' },
  };

  if (layout.joistSpacing > deck.maxSpan + 1) {
    warnings.push({ level: 'warning', message: `Floor joist spacing ${layout.joistSpacing} mm exceeds the ${deck.maxSpan} mm recommended for ${deck.label} – reduce the max joist spacing.` });
  }
  const hasDoor = WALL_IDS.some((id) => project.walls[id].closed && project.walls[id].openings.some((o) => o.type === 'door')) || project.partitions.some((p) => p.openings.some((o) => o.type === 'door'));
  if (hasDoor) {
    warnings.push({ level: 'info', message: `Timber floor top is ${Math.round(layout.deckTop)} mm above the base while doors start at the base – plan a threshold step or raise the door sills.` });
  }

  const geometry: FloorGeometry = {
    support: settings.support,
    decking: settings.decking,
    areaM2,
    topHeight: Math.round(layout.deckTop),
    deckThickness: deck.thickness,
    joistCount: j,
    joistSpacing: layout.joistSpacing,
    joistSpan: Math.round(layout.joistSpan),
    bearerCount: out.filter((m) => m.category === 'bearer').length,
    bearerSpacing: layout.bearerSpacing,
    bearerSpan: Math.round(layout.bearerSpan),
    supportCount,
    crossings,
    bedLengthM: bedLength / 1000,
  };
  return { members: out, panel, geometry, warnings };
}
