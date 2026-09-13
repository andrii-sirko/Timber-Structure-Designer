import type { LayerVisibility, Opening, Partition, ProjectState, StructureParams, Vehicle, ViewSettings, Wall, WallId } from '@/types';
import { WALL_IDS } from '@/types';
import { uuid } from '@/engine/geometry';
import { VEHICLE_CATALOG, VEHICLE_COLORS } from '@/engine/vehicles';
import { NEIGHBOUR_DEFAULTS } from '@/engine/neighbours';

export const DEFAULT_PARAMS: StructureParams = {
  length: 6000,
  width: 3000,
  frontHeight: 2600,
  rearHeight: 2250,
  overhangs: { front: 300, rear: 300, left: 200, right: 200 },
  maxPostSpacing: 3000,
  postsPerRow: null,
  maxRafterSpacing: 800,
  maxStudSpacing: 625,
  maxStockLength: 6000,
  braces: true,
  braceLeg: 600,
  connectionMode: 'hardware',
  timber: {
    post: { width: 120, height: 120 },
    beam: { width: 120, height: 200 },
    rafter: { width: 80, height: 160 },
    stud: { width: 60, height: 120 },
    brace: { width: 80, height: 100 },
    strengthClass: 'C24',
  },
  loads: { snowLoad: 0.85, roofCovering: 'trapezoidal-sheet', serviceClass: 2 },
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
    postOverrides: {},
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
      postOverrides: {},
    }),
  },
  {
    id: 'garden-shed',
    name: 'Garden shed 4 × 3 m',
    description: 'Closed stud walls with door and window, bitumen shingle roof',
    build: () => {
      const walls = emptyWalls(true);
      walls.front.openings.push({ id: uuid(), type: 'door', x: 600, y: 0, width: 900, height: 2000, label: 'Door' });
      walls.right.openings.push({ id: uuid(), type: 'window', x: 900, y: 1000, width: 1000, height: 800, label: 'Window' });
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
          loads: { snowLoad: 0.85, roofCovering: 'bitumen-shingles', serviceClass: 2 },
        },
        walls,
        partitions: [],
        vehicles: [],
        postOverrides: {},
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
        loads: { snowLoad: 0.85, roofCovering: 'polycarbonate', serviceClass: 3 },
      },
      walls: emptyWalls(false),
      partitions: [],
      vehicles: [],
      postOverrides: {},
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
    loads: { ...base.params.loads, ...(p.loads ?? {}) },
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
        }))
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
  return {
    id: typeof src.id === 'string' ? src.id : base.id,
    name: typeof src.name === 'string' && src.name.trim() ? src.name : base.name,
    params,
    walls,
    partitions,
    vehicles,
    postOverrides,
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
    }));
}
