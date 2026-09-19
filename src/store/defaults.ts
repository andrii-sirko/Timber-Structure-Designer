import type { BraceDirection, FreePost, LayerVisibility, ObjectSize, Opening, Partition, PavedArea, ProjectState, RoofDirection, RoofScheme, StructureParams, Vehicle, ViewSettings, Wall, WallId } from '@/types';
import { BRACE_DIRECTIONS, ROOF_SCHEMES, TIMBER_KEYS, WALL_IDS } from '@/types';
import { uuid } from '@/engine/geometry';
import { VEHICLE_CATALOG, VEHICLE_COLORS } from '@/engine/vehicles';
import { NEIGHBOUR_DEFAULTS } from '@/engine/neighbours';
import { PAVING_COLORS, PAVING_DEFAULTS, PAVING_PATTERNS } from '@/engine/paving';
import { FLOOR_DEFAULTS, sanitizeFloor } from '@/engine/framing/floor';

export const DEFAULT_PARAMS: StructureParams = {
  length: 6000,
  width: 3000,
  frontHeight: 2600,
  rearHeight: 2250,
  roofDirection: 'rear',
  roofScheme: 'classic',
  overhangs: { front: 300, rear: 300, left: 200, right: 200 },
  maxPostSpacing: 3000,
  postsPerRow: null,
  maxRafterSpacing: 800,
  maxRafterLength: 6000,
  midPurlinPositions: [],
  maxStudSpacing: 625,
  maxStockLength: 6000,
  braces: true,
  braceLeg: 600,
  braceDirection: 'both',
  connectionMode: 'hardware',
  timber: {
    post: { width: 120, height: 120 },
    beam: { width: 120, height: 200 },
    rafter: { width: 80, height: 160 },
    stud: { width: 60, height: 120 },
    brace: { width: 80, height: 100 },
    strengthClass: 'C24',
  },
  lockedSections: [],
  loads: { snowLoad: 0.85, roofCovering: 'trapezoidal-sheet', serviceClass: 2, windLoad: 0.65 },
  floor: structuredClone(FLOOR_DEFAULTS),
};

export function emptyWalls(closed = false): Record<WallId, Wall> {
  const walls = {} as Record<WallId, Wall>;
  for (const id of WALL_IDS) walls[id] = { id, closed, openings: [] };
  return walls;
}

export const DEFAULT_LAYERS: LayerVisibility = {
  frame: true,
  cladding: true,
  roof: true,
  dimensions: true,
  grid: true,
  vehicles: true,
  paving: true,
  floor: true,
};

export const DEFAULT_VIEW: ViewSettings = {
  layers: DEFAULT_LAYERS,
  highlight: 'solid',
  cameraPreset: 'iso',
  orthographic: false,
  measureMode: false,
  neighbourMode: true,
  neighbourRadius: NEIGHBOUR_DEFAULTS.radius,
  neighbourLimit: NEIGHBOUR_DEFAULTS.limit,
};

export function createDefaultProject(): ProjectState {
  return {
    id: uuid(),
    name: 'Carport 6 × 3 m',
    params: structuredClone(DEFAULT_PARAMS),
    walls: emptyWalls(false),
    partitions: [],
    vehicles: [{ id: uuid(), modelId: 'vw-golf', x: 3000, z: 1500, rotationDeg: 0, color: VEHICLE_COLORS[1] }],
    pavedAreas: [],
    postOverrides: {},
    freePosts: [],
  };
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  build: () => ProjectState;
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'carport-single',
    name: 'Single carport 6 × 3 m',
    description: 'Open post-and-purlin carport, trapezoidal sheet roof',
    build: createDefaultProject,
  },
  {
    id: 'carport-double',
    name: 'Double carport 6 × 5.5 m',
    description: 'Wide carport with closed rear wall, 4 posts per row',
    build: () => ({
      id: uuid(),
      name: 'Double carport 6 × 5.5 m',
      params: {
        ...structuredClone(DEFAULT_PARAMS),
        length: 6000,
        width: 5500,
        frontHeight: 2700,
        rearHeight: 2250,
        timber: { ...structuredClone(DEFAULT_PARAMS.timber), rafter: { width: 80, height: 220 }, beam: { width: 140, height: 240 } },
      },
      walls: { ...emptyWalls(false), rear: { id: 'rear', closed: true, openings: [] } },
      partitions: [],
      vehicles: [
        { id: uuid(), modelId: 'vw-tiguan', x: 3000, z: 1500, rotationDeg: 0, color: VEHICLE_COLORS[0] },
        { id: uuid(), modelId: 'vw-passat-variant', x: 3000, z: 4000, rotationDeg: 0, color: VEHICLE_COLORS[4] },
      ],
      pavedAreas: [],
      postOverrides: {},
      freePosts: [],
    }),
  },
  {
    id: 'garden-shed',
    name: 'Garden shed 4 × 3 m',
    description: 'Closed stud walls with door and window, bitumen shingle roof',
    build: () => {
      const walls = emptyWalls(true);
      walls.front.openings.push({ id: uuid(), type: 'door', x: 600, y: 0, width: 890, height: 2010, label: 'Boarded door 875×2000', preset: 'door-boarded-875', hinge: 'left', swing: 'out' });
      walls.right.openings.push({ id: uuid(), type: 'window', x: 900, y: 1000, width: 820, height: 820, label: 'Turn-tilt window 800×800', preset: 'window-turntilt-800x800' });
      return {
        id: uuid(),
        name: 'Garden shed 4 × 3 m',
        params: {
          ...structuredClone(DEFAULT_PARAMS),
          length: 4000,
          width: 3000,
          frontHeight: 2500,
          rearHeight: 2200,
          overhangs: { front: 250, rear: 250, left: 150, right: 150 },
          braces: false,
          loads: { snowLoad: 0.85, roofCovering: 'bitumen-shingles', serviceClass: 2, windLoad: 0.65 },
          floor: { ...structuredClone(FLOOR_DEFAULTS), enabled: true },
        },
        walls,
        partitions: [],
        vehicles: [],
        pavedAreas: [],
      postOverrides: {},
      freePosts: [],
      };
    },
  },
  {
    id: 'terrace-roof',
    name: 'Terrace roof (Überdachung) 5 × 3.5 m',
    description: 'Lean-to style roof with polycarbonate panels and open walls',
    build: () => ({
      id: uuid(),
      name: 'Terrace roof 5 × 3.5 m',
      params: {
        ...structuredClone(DEFAULT_PARAMS),
        length: 5000,
        width: 3500,
        frontHeight: 2800,
        rearHeight: 2400,
        overhangs: { front: 400, rear: 100, left: 250, right: 250 },
        maxRafterSpacing: 700,
        loads: { snowLoad: 0.85, roofCovering: 'polycarbonate', serviceClass: 3, windLoad: 0.65 },
      },
      walls: emptyWalls(false),
      partitions: [],
      vehicles: [],
      pavedAreas: [],
      postOverrides: {},
      freePosts: [],
    }),
  },
];

/** Deep-merge an imported or persisted project onto the defaults so older files still load. */
export function normalizeProject(input: unknown): ProjectState {
  const base = createDefaultProject();
  if (!input || typeof input !== 'object') return base;
  const src = input as Partial<ProjectState>;
  const p = (src.params ?? {}) as Partial<StructureParams>;
  const params: StructureParams = {
    ...base.params,
    ...p,
    overhangs: { ...base.params.overhangs, ...(p.overhangs ?? {}) },
    timber: {
      ...base.params.timber,
      ...(p.timber ?? {}),
      post: { ...base.params.timber.post, ...(p.timber?.post ?? {}) },
      beam: { ...base.params.timber.beam, ...(p.timber?.beam ?? {}) },
      rafter: { ...base.params.timber.rafter, ...(p.timber?.rafter ?? {}) },
      stud: { ...base.params.timber.stud, ...(p.timber?.stud ?? {}) },
      brace: { ...base.params.timber.brace, ...(p.timber?.brace ?? {}) },
    },
    lockedSections: Array.isArray(p.lockedSections) ? TIMBER_KEYS.filter((k) => p.lockedSections!.includes(k)) : [],
    loads: { ...base.params.loads, ...(p.loads ?? {}) },
    floor: sanitizeFloor(p.floor),
    midPurlinPositions: Array.isArray(p.midPurlinPositions) ? p.midPurlinPositions.map((v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)) : [],
    roofDirection: (WALL_IDS as readonly string[]).includes(p.roofDirection as string) ? (p.roofDirection as RoofDirection) : 'rear',
    roofScheme: (ROOF_SCHEMES as readonly string[]).includes(p.roofScheme as string) ? (p.roofScheme as RoofScheme) : 'classic',
    braceDirection: (BRACE_DIRECTIONS as readonly string[]).includes(p.braceDirection as string) ? (p.braceDirection as BraceDirection) : 'both',
  };
  const walls = emptyWalls(false);
  const srcWalls = (src.walls ?? {}) as Partial<Record<WallId, Partial<Wall>>>;
  for (const id of WALL_IDS) {
    const w = srcWalls[id];
    if (!w) continue;
    walls[id] = {
      id,
      closed: Boolean(w.closed),
      openings: normalizeOpenings(w.openings),
      ...(typeof w.start === 'number' && Number.isFinite(w.start) ? { start: w.start } : {}),
      ...(typeof w.end === 'number' && Number.isFinite(w.end) ? { end: w.end } : {}),
    };
  }
  const partitions: Partition[] = Array.isArray(src.partitions)
    ? src.partitions
        .filter((p) => p && typeof p === 'object')
        .map((p, i) => ({
          id: typeof p.id === 'string' ? p.id : uuid(),
          label: typeof p.label === 'string' && p.label.trim() ? p.label : `Partition ${i + 1}`,
          axis: p.axis === 'x' ? 'x' : 'z',
          offset: Number.isFinite(Number(p.offset)) ? Number(p.offset) : (p.axis === 'x' ? params.width : params.length) / 2,
          start: Number.isFinite(Number(p.start)) ? Number(p.start) : 0,
          end: Number.isFinite(Number(p.end)) ? Number(p.end) : p.axis === 'x' ? params.length : params.width,
          openings: normalizeOpenings(p.openings),
        }))
    : [];
  const normalizeObjectSize = (raw: unknown): { size?: ObjectSize } => {
    if (!raw || typeof raw !== 'object') return {};
    const r = raw as Record<string, unknown>;
    const length = Number(r.length);
    const width = Number(r.width);
    const height = Number(r.height);
    if (![length, width, height].every((n) => Number.isFinite(n) && n > 0)) return {};
    return { size: { length, width, height } };
  };
  const vehicles: Vehicle[] = Array.isArray(src.vehicles)
    ? src.vehicles
        .filter((v) => v && typeof v === 'object')
        .map((v, i) => ({
          id: typeof v.id === 'string' ? v.id : uuid(),
          modelId: VEHICLE_CATALOG.some((m) => m.id === v.modelId) ? (v.modelId as string) : 'vw-golf',
          x: Number.isFinite(Number(v.x)) ? Number(v.x) : params.length / 2,
          z: Number.isFinite(Number(v.z)) ? Number(v.z) : params.width / 2,
          rotationDeg: Number.isFinite(Number(v.rotationDeg)) ? Number(v.rotationDeg) : 0,
          color: typeof v.color === 'string' ? v.color : VEHICLE_COLORS[i % VEHICLE_COLORS.length],
          ...normalizeObjectSize(v.size),
        }))
    : [];
  const pavedAreas: PavedArea[] = Array.isArray(src.pavedAreas)
    ? src.pavedAreas
        .filter((a) => a && typeof a === 'object')
        .map((a, i) => {
          const num = (v: unknown, fallback: number): number => (Number.isFinite(Number(v)) ? Number(v) : fallback);
          const points = Array.isArray(a.points)
            ? a.points.filter((p) => p && typeof p === 'object').map((p) => ({ x: num(p.x, 0), z: num(p.z, 0) }))
            : [];
          return {
            id: typeof a.id === 'string' ? a.id : uuid(),
            label: typeof a.label === 'string' && a.label.trim() ? a.label : `Paved floor ${i + 1}`,
            points: points.length >= 3 ? points : [{ x: 0, z: 0 }, { x: params.length, z: 0 }, { x: params.length, z: params.width }, { x: 0, z: params.width }],
            stoneLength: num(a.stoneLength, PAVING_DEFAULTS.stoneLength),
            stoneWidth: num(a.stoneWidth, PAVING_DEFAULTS.stoneWidth),
            jointWidth: num(a.jointWidth, PAVING_DEFAULTS.jointWidth),
            stoneThickness: num(a.stoneThickness, PAVING_DEFAULTS.stoneThickness),
            pattern: PAVING_PATTERNS.some((p) => p.id === a.pattern) ? (a.pattern as PavedArea['pattern']) : 'stretcher',
            color: typeof a.color === 'string' ? a.color : PAVING_COLORS[i % PAVING_COLORS.length],
          };
        })
    : [];
  const postOverrides = src.postOverrides && typeof src.postOverrides === 'object' ? Object.fromEntries(
    Object.entries(src.postOverrides as Record<string, unknown>).flatMap(([key, value]) => {
      if (!value || typeof value !== 'object') return [];
      const v = value as Partial<{ position: number; removed: boolean }>;
      const override = {
        ...(Number.isFinite(Number(v.position)) ? { position: Number(v.position) } : {}),
        ...(v.removed === true ? { removed: true } : {}),
      };
      return Object.keys(override).length ? [[key, override]] : [];
    }),
  ) : {};
  const freePosts: FreePost[] = Array.isArray(src.freePosts)
    ? (src.freePosts as Partial<FreePost>[])
        .filter((p) => p && typeof p === 'object' && Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.z)))
        .map((p) => ({ id: typeof p.id === 'string' ? p.id : uuid(), x: Number(p.x), z: Number(p.z) }))
    : [];
  return {
    id: typeof src.id === 'string' ? src.id : base.id,
    name: typeof src.name === 'string' && src.name.trim() ? src.name : base.name,
    params,
    walls,
    partitions,
    vehicles,
    pavedAreas,
    postOverrides,
    freePosts,
    ...(Array.isArray(src.assemblyOrder) ? { assemblyOrder: src.assemblyOrder.filter((k) => typeof k === 'string') } : {}),
  };
}

function normalizeOpenings(input: unknown): Opening[] {
  if (!Array.isArray(input)) return [];
  return (input as Partial<Opening>[])
    .filter((o) => o && typeof o === 'object')
    .map((o) => ({
      id: typeof o.id === 'string' ? o.id : uuid(),
      type: o.type === 'window' || o.type === 'passage' ? o.type : 'door',
      x: Number(o.x) || 0,
      y: Number(o.y) || 0,
      width: Number(o.width) || 900,
      height: Number(o.height) || 2000,
      label: typeof o.label === 'string' ? o.label : undefined,
      preset: typeof o.preset === 'string' ? o.preset : undefined,
      hinge: o.hinge === 'right' ? 'right' : o.hinge === 'left' ? 'left' : undefined,
      swing: o.swing === 'in' ? 'in' : o.swing === 'out' ? 'out' : undefined,
    }));
}
