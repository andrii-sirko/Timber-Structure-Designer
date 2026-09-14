import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { del as idbDel, get as idbGet, set as idbSet } from 'idb-keyval';
import type {
  CameraPreset,
  HighlightMode,
  LayerVisibility,
  LoadSettings,
  Measurement,
  Opening,
  OpeningType,
  Overhangs,
  GroundPoint,
  Partition,
  PartitionAxis,
  PavedArea,
  ProjectState,
  SavedProject,
  StrengthClass,
  StructureParams,
  TimberSection,
  TimberSpecs,
  Vehicle,
  ViewSettings,
  WallId,
  WallKey,
} from '@/types';
import { isOuterWall } from '@/types';
import { clampOpening, clampPartition, computeAllWallFrames, defaultPartition, OPENING_DEFAULTS } from '@/engine';
import { findVehicleSpot, getVehicleModel, VEHICLE_COLORS } from '@/engine/vehicles';
import { defaultPavedArea, insertVertex, PAVING_COLORS, resizePolygon, translatePolygon } from '@/engine/paving';
import { uuid } from '@/engine/geometry';
import { createDefaultProject, DEFAULT_VIEW, normalizeProject, PROJECT_TEMPLATES } from './defaults';
import { withHistory, type HistorySlice } from './history';

const STORAGE_KEY = 'timber-structure-designer-v1';

/** IndexedDB-backed storage with a localStorage fallback (private mode, old browsers). */
const idbStorage: StateStorage = {
  getItem: async (name) => {
    try {
      const value = await idbGet<string>(name);
      if (value !== undefined) return value;
    } catch {
      /* fall through */
    }
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: async (name, value) => {
    try {
      await idbSet(name, value);
    } catch {
      try {
        localStorage.setItem(name, value);
      } catch {
        /* storage unavailable */
      }
    }
  },
  removeItem: async (name) => {
    try {
      await idbDel(name);
    } catch {
      /* ignore */
    }
    try {
      localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

type TimberKey = keyof Omit<TimberSpecs, 'strengthClass'>;

interface ProjectStoreBase {
  project: ProjectState;
  savedProjects: SavedProject[];
  view: ViewSettings;
  /** Selected outer wall (WallId) or partition (its id) */
  selectedWallId: WallKey | null;
  selectedOpeningId: string | null;
  selectedVehicleId: string | null;
  selectedPavedAreaId: string | null;
  /** Index of the selected corner of the selected paved floor */
  selectedPavedPointIndex: number | null;
  hoveredMemberId: string | null;
  /** Member whose distances to its neighbours are being inspected */
  selectedMemberId: string | null;
  /** Neighbour row highlighted from the panel */
  focusedNeighbourId: string | null;
  measurements: Measurement[];
  isDragging: boolean;
  hydrated: boolean;
  /** Incremented whenever a camera preset is (re)applied so the rig re-runs even for the same preset */
  cameraNonce: number;

  setProjectName: (name: string) => void;
  setParam: <K extends keyof StructureParams>(key: K, value: StructureParams[K]) => void;
  /** Replace all structure parameters at once (e.g. statics auto-fix) */
  setParams: (params: StructureParams) => void;
  setOverhang: (side: keyof Overhangs, value: number) => void;
  setTimber: (key: TimberKey, section: TimberSection) => void;
  setStrengthClass: (cls: StrengthClass) => void;
  setLoad: <K extends keyof LoadSettings>(key: K, value: LoadSettings[K]) => void;

  setWallClosed: (id: WallId, closed: boolean) => void;
  addOpening: (wallKey: WallKey, type: OpeningType) => string;
  updateOpening: (wallKey: WallKey, id: string, patch: Partial<Opening>) => void;
  removeOpening: (wallKey: WallKey, id: string) => void;
  selectWall: (key: WallKey | null) => void;
  selectOpening: (wallKey: WallKey | null, id: string | null) => void;

  addPartition: (axis: PartitionAxis) => string;
  updatePartition: (id: string, patch: Partial<Omit<Partition, 'id' | 'openings'>>) => void;
  removePartition: (id: string) => void;
  setHoveredMember: (id: string | null) => void;
  selectMember: (id: string | null) => void;
  setFocusedNeighbour: (id: string | null) => void;
  setDragging: (dragging: boolean) => void;

  addVehicle: (modelId: string) => string;
  updateVehicle: (id: string, patch: Partial<Omit<Vehicle, 'id'>>) => void;
  removeVehicle: (id: string) => void;
  selectVehicle: (id: string | null) => void;
  nudgeVehicle: (id: string, dx: number, dz: number) => void;
  rotateVehicle: (id: string, deltaDeg: number) => void;
  movePost: (id: string, position: number) => void;
  /** Manual axis position of intermediate purlin row `index` (canonical frame); null = automatic */
  moveMidPurlin: (index: number, position: number | null) => void;
  removePost: (id: string) => void;

  addPavedArea: () => string;
  updatePavedArea: (id: string, patch: Partial<Omit<PavedArea, 'id'>>) => void;
  removePavedArea: (id: string) => void;
  selectPavedArea: (id: string | null, pointIndex?: number | null) => void;
  movePavedPoint: (id: string, index: number, point: GroundPoint) => void;
  /** Insert a corner on the edge after `afterIndex` (at its midpoint unless a point is given) and select it */
  insertPavedPoint: (id: string, afterIndex: number, point?: GroundPoint) => number;
  removePavedPoint: (id: string, index: number) => void;
  translatePavedArea: (id: string, dx: number, dz: number) => void;
  resizePavedArea: (id: string, width: number, depth: number) => void;

  setLayer: (layer: keyof LayerVisibility, visible: boolean) => void;
  setHighlight: (mode: HighlightMode) => void;
  setCameraPreset: (preset: CameraPreset) => void;
  setOrthographic: (ortho: boolean) => void;
  setMeasureMode: (on: boolean) => void;
  setNeighbourMode: (on: boolean) => void;
  setNeighbourRadius: (mm: number) => void;
  setNeighbourLimit: (count: number) => void;
  addMeasurement: (m: Measurement) => void;
  updateMeasurement: (id: string, patch: Partial<Pick<Measurement, 'a' | 'b'>>) => void;
  clearMeasurements: () => void;

  saveProjectAs: (name: string) => void;
  loadSavedProject: (id: string) => void;
  deleteSavedProject: (id: string) => void;
  loadTemplate: (templateId: string) => void;
  importProject: (raw: unknown) => void;
  resetProject: () => void;
  setHydrated: (v: boolean) => void;
}

/** Store actions plus the undo/redo ("rewire") stack from {@link withHistory}. */
export type ProjectStore = ProjectStoreBase & HistorySlice;

function normalizeDeg(deg: number): number {
  const d = Math.round(deg) % 360;
  return d < 0 ? d + 360 : d;
}

function clampAllOpenings(input: ProjectState): ProjectState {
  const project = { ...input, partitions: input.partitions.map((p) => clampPartition(p, input.params)) };
  const frames = computeAllWallFrames(project);
  const walls = { ...project.walls };
  for (const id of Object.keys(walls) as WallId[]) {
    const wall = walls[id];
    if (!wall.closed || wall.openings.length === 0) continue;
    walls[id] = { ...wall, openings: wall.openings.map((o) => clampOpening(frames[id], o, project.params)) };
  }
  const partitions = project.partitions.map((p) => (p.openings.length === 0 ? p : { ...p, openings: p.openings.map((o) => clampOpening(frames[p.id], o, project.params)) }));
  return { ...project, walls, partitions };
}

/** Apply `fn` to the openings of the outer wall or partition addressed by `key`. Adding closes an open outer wall. */
function mapOpenings(project: ProjectState, key: WallKey, fn: (openings: Opening[]) => Opening[], close = false): ProjectState {
  if (isOuterWall(key)) {
    const wall = project.walls[key];
    return { ...project, walls: { ...project.walls, [key]: { ...wall, closed: close || wall.closed, openings: fn(wall.openings) } } };
  }
  return { ...project, partitions: project.partitions.map((p) => (p.id === key ? { ...p, openings: fn(p.openings) } : p)) };
}

function hostOpenings(project: ProjectState, key: WallKey): Opening[] {
  if (isOuterWall(key)) return project.walls[key].openings;
  return project.partitions.find((p) => p.id === key)?.openings ?? [];
}

function hostLength(project: ProjectState, key: WallKey): number {
  if (isOuterWall(key)) return key === 'front' || key === 'rear' ? project.params.length : project.params.width;
  const p = project.partitions.find((x) => x.id === key);
  return p ? p.end - p.start : 0;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    withHistory<ProjectStoreBase>((set, get) => ({
      project: createDefaultProject(),
      savedProjects: [],
      view: DEFAULT_VIEW,
      selectedWallId: null,
      selectedOpeningId: null,
      selectedVehicleId: null,
      selectedPavedAreaId: null,
      selectedPavedPointIndex: null,
      hoveredMemberId: null,
      selectedMemberId: null,
      focusedNeighbourId: null,
      measurements: [],
      isDragging: false,
      hydrated: false,
      cameraNonce: 0,

      setProjectName: (name) => set((s) => ({ project: { ...s.project, name } })),

      setParam: (key, value) =>
        set((s) => {
          let params = { ...s.project.params, [key]: value };
          // keep the monopitch geometry valid: high eave H1 ≥ low eave H2
          if (key === 'frontHeight' && typeof value === 'number' && value < params.rearHeight) {
            params = { ...params, rearHeight: value };
          }
          if (key === 'rearHeight' && typeof value === 'number' && value > params.frontHeight) {
            params = { ...params, frontHeight: value };
          }
          // Post overrides are keyed by purlin row; the rows move to other walls with the roof direction.
          // Manual mid purlin positions are canonical-frame coordinates of those rows – reset as well.
          const layoutChanged = (key === 'roofDirection' || key === 'roofScheme') && value !== s.project.params[key];
          const postOverrides = layoutChanged ? {} : s.project.postOverrides;
          if (layoutChanged) params = { ...params, midPurlinPositions: [] };
          return { project: clampAllOpenings({ ...s.project, params, postOverrides }) };
        }),

      setParams: (params) => set((s) => ({ project: clampAllOpenings({ ...s.project, params }) })),

      setOverhang: (side, value) =>
        set((s) => ({
          project: { ...s.project, params: { ...s.project.params, overhangs: { ...s.project.params.overhangs, [side]: value } } },
        })),

      setTimber: (key, section) =>
        set((s) => ({
          project: clampAllOpenings({
            ...s.project,
            params: { ...s.project.params, timber: { ...s.project.params.timber, [key]: section } },
          }),
        })),

      setStrengthClass: (strengthClass) =>
        set((s) => ({ project: { ...s.project, params: { ...s.project.params, timber: { ...s.project.params.timber, strengthClass } } } })),

      setLoad: (key, value) =>
        set((s) => ({ project: { ...s.project, params: { ...s.project.params, loads: { ...s.project.params.loads, [key]: value } } } })),

      setWallClosed: (id, closed) =>
        set((s) => ({
          project: clampAllOpenings({ ...s.project, walls: { ...s.project.walls, [id]: { ...s.project.walls[id], closed } } }),
        })),

      addOpening: (wallKey, type) => {
        const id = uuid();
        set((s) => {
          const existing = hostOpenings(s.project, wallKey);
          const defaults = OPENING_DEFAULTS[type];
          const count = existing.filter((o) => o.type === type).length + 1;
          // place after the last opening on the wall, or at 1/3 of the wall
          const last = existing.reduce((m, o) => Math.max(m, o.x + o.width), 0);
          const x = last > 0 ? last + 400 : Math.max(300, hostLength(s.project, wallKey) / 3 - defaults.width / 2);
          const opening: Opening = {
            id,
            type,
            x,
            y: defaults.y,
            width: defaults.width,
            height: defaults.height,
            label: `${defaults.label} ${count}`,
          };
          const project = mapOpenings(s.project, wallKey, (openings) => [...openings, opening], true);
          return { project: clampAllOpenings(project), selectedWallId: wallKey, selectedOpeningId: id };
        });
        return id;
      },

      updateOpening: (wallKey, id, patch) =>
        set((s) => {
          const frames = computeAllWallFrames(s.project);
          const frame = frames[wallKey];
          if (!frame) return s;
          const project = mapOpenings(s.project, wallKey, (openings) =>
            openings.map((o) => {
              if (o.id !== id) return o;
              const merged = { ...o, ...patch };
              if (patch.type && patch.type !== o.type) {
                const d = OPENING_DEFAULTS[patch.type];
                merged.y = d.y;
                if (patch.type !== 'window' && o.type === 'window') merged.height = d.height;
              }
              return clampOpening(frame, merged, s.project.params);
            }),
          );
          return { project };
        }),

      removeOpening: (wallKey, id) =>
        set((s) => ({
          project: mapOpenings(s.project, wallKey, (openings) => openings.filter((o) => o.id !== id)),
          selectedOpeningId: s.selectedOpeningId === id ? null : s.selectedOpeningId,
        })),

      addPartition: (axis) => {
        const id = uuid();
        set((s) => {
          const label = `Partition ${s.project.partitions.length + 1}`;
          const partition = defaultPartition(s.project.params, axis, id, label);
          return {
            project: { ...s.project, partitions: [...s.project.partitions, partition] },
            selectedWallId: id,
            selectedOpeningId: null,
            selectedVehicleId: null,
          };
        });
        return id;
      },
      updatePartition: (id, patch) =>
        set((s) => ({
          project: clampAllOpenings({
            ...s.project,
            partitions: s.project.partitions.map((p) => (p.id === id ? clampPartition({ ...p, ...patch }, s.project.params) : p)),
          }),
        })),
      removePartition: (id) =>
        set((s) => ({
          project: { ...s.project, partitions: s.project.partitions.filter((p) => p.id !== id) },
          selectedWallId: s.selectedWallId === id ? null : s.selectedWallId,
          selectedOpeningId: s.selectedWallId === id ? null : s.selectedOpeningId,
        })),

      selectWall: (id) =>
        set((s) => ({
          selectedWallId: id,
          selectedOpeningId: id === s.selectedWallId ? s.selectedOpeningId : null,
          selectedVehicleId: id ? null : s.selectedVehicleId,
          selectedPavedAreaId: id ? null : s.selectedPavedAreaId,
          selectedPavedPointIndex: id ? null : s.selectedPavedPointIndex,
        })),
      selectOpening: (wallId, id) => set({ selectedWallId: wallId, selectedOpeningId: id, selectedVehicleId: null, selectedPavedAreaId: null, selectedPavedPointIndex: null }),

      addVehicle: (modelId) => {
        const id = uuid();
        set((s) => {
          const model = getVehicleModel(modelId);
          const spot = findVehicleSpot(s.project, model);
          const vehicle: Vehicle = { id, modelId: model.id, ...spot, color: VEHICLE_COLORS[s.project.vehicles.length % VEHICLE_COLORS.length] };
          return {
            project: { ...s.project, vehicles: [...s.project.vehicles, vehicle] },
            selectedVehicleId: id,
            selectedWallId: null,
            selectedOpeningId: null,
            selectedPavedAreaId: null,
            selectedPavedPointIndex: null,
          };
        });
        return id;
      },
      updateVehicle: (id, patch) =>
        set((s) => ({
          project: {
            ...s.project,
            vehicles: s.project.vehicles.map((v) => (v.id === id ? { ...v, ...patch, rotationDeg: normalizeDeg(patch.rotationDeg ?? v.rotationDeg) } : v)),
          },
        })),
      removeVehicle: (id) =>
        set((s) => ({
          project: { ...s.project, vehicles: s.project.vehicles.filter((v) => v.id !== id) },
          selectedVehicleId: s.selectedVehicleId === id ? null : s.selectedVehicleId,
        })),
      selectVehicle: (id) =>
        set((s) => ({
          selectedVehicleId: id,
          selectedWallId: id ? null : s.selectedWallId,
          selectedOpeningId: id ? null : s.selectedOpeningId,
          selectedPavedAreaId: id ? null : s.selectedPavedAreaId,
          selectedPavedPointIndex: id ? null : s.selectedPavedPointIndex,
        })),
      nudgeVehicle: (id, dx, dz) =>
        set((s) => ({
          project: { ...s.project, vehicles: s.project.vehicles.map((v) => (v.id === id ? { ...v, x: v.x + dx, z: v.z + dz } : v)) },
        })),
      rotateVehicle: (id, deltaDeg) =>
        set((s) => ({
          project: { ...s.project, vehicles: s.project.vehicles.map((v) => (v.id === id ? { ...v, rotationDeg: normalizeDeg(v.rotationDeg + deltaDeg) } : v)) },
        })),
      movePost: (id, position) =>
        set((s) => ({ project: { ...s.project, postOverrides: { ...s.project.postOverrides, [id]: { position } } } })),
      moveMidPurlin: (index, position) =>
        set((s) => {
          const midPurlinPositions = s.project.params.midPurlinPositions.slice();
          while (midPurlinPositions.length <= index) midPurlinPositions.push(null);
          midPurlinPositions[index] = position;
          return { project: { ...s.project, params: { ...s.project.params, midPurlinPositions } } };
        }),
      removePost: (id) =>
        set((s) => ({ project: { ...s.project, postOverrides: { ...s.project.postOverrides, [id]: { removed: true } } }, selectedMemberId: s.selectedMemberId === id ? null : s.selectedMemberId })),
      addPavedArea: () => {
        const id = uuid();
        set((s) => {
          const n = s.project.pavedAreas.length;
          const area = defaultPavedArea(s.project.params, id, `Paved floor ${n + 1}`, PAVING_COLORS[n % PAVING_COLORS.length]);
          // stack later floors next to the first one so they do not overlap exactly
          const shifted = n > 0 ? { ...area, points: translatePolygon(area.points, 0, n * (s.project.params.width + 1000)) } : area;
          return {
            project: { ...s.project, pavedAreas: [...s.project.pavedAreas, shifted] },
            selectedPavedAreaId: id,
            selectedPavedPointIndex: null,
            selectedVehicleId: null,
            selectedWallId: null,
            selectedOpeningId: null,
          };
        });
        return id;
      },
      updatePavedArea: (id, patch) =>
        set((s) => ({ project: { ...s.project, pavedAreas: s.project.pavedAreas.map((a) => (a.id === id ? { ...a, ...patch } : a)) } })),
      removePavedArea: (id) =>
        set((s) => ({
          project: { ...s.project, pavedAreas: s.project.pavedAreas.filter((a) => a.id !== id) },
          selectedPavedAreaId: s.selectedPavedAreaId === id ? null : s.selectedPavedAreaId,
          selectedPavedPointIndex: s.selectedPavedAreaId === id ? null : s.selectedPavedPointIndex,
        })),
      selectPavedArea: (id, pointIndex = null) =>
        set((s) => ({
          selectedPavedAreaId: id,
          selectedPavedPointIndex: id ? pointIndex : null,
          selectedWallId: id ? null : s.selectedWallId,
          selectedOpeningId: id ? null : s.selectedOpeningId,
          selectedVehicleId: id ? null : s.selectedVehicleId,
        })),
      movePavedPoint: (id, index, point) =>
        set((s) => ({
          project: {
            ...s.project,
            pavedAreas: s.project.pavedAreas.map((a) => (a.id === id ? { ...a, points: a.points.map((p, i) => (i === index ? { x: Math.round(point.x), z: Math.round(point.z) } : p)) } : a)),
          },
        })),
      insertPavedPoint: (id, afterIndex, point) => {
        const index = afterIndex + 1;
        set((s) => ({
          project: {
            ...s.project,
            pavedAreas: s.project.pavedAreas.map((a) => (a.id === id ? { ...a, points: insertVertex(a.points, afterIndex, point) } : a)),
          },
          selectedPavedAreaId: id,
          selectedPavedPointIndex: index,
          selectedWallId: null,
          selectedOpeningId: null,
          selectedVehicleId: null,
        }));
        return index;
      },
      removePavedPoint: (id, index) =>
        set((s) => {
          const area = s.project.pavedAreas.find((a) => a.id === id);
          if (!area || area.points.length <= 3) return s;
          return {
            project: { ...s.project, pavedAreas: s.project.pavedAreas.map((a) => (a.id === id ? { ...a, points: a.points.filter((_, i) => i !== index) } : a)) },
            selectedPavedPointIndex: s.selectedPavedAreaId === id && s.selectedPavedPointIndex === index ? null : s.selectedPavedPointIndex,
          };
        }),
      translatePavedArea: (id, dx, dz) =>
        set((s) => ({
          project: { ...s.project, pavedAreas: s.project.pavedAreas.map((a) => (a.id === id ? { ...a, points: translatePolygon(a.points, dx, dz) } : a)) },
        })),
      resizePavedArea: (id, width, depth) =>
        set((s) => ({
          project: { ...s.project, pavedAreas: s.project.pavedAreas.map((a) => (a.id === id ? { ...a, points: resizePolygon(a.points, Math.max(100, width), Math.max(100, depth)) } : a)) },
        })),
      setHoveredMember: (id) => set((s) => (s.hoveredMemberId === id ? s : { hoveredMemberId: id })),
      selectMember: (id) => set((s) => (s.selectedMemberId === id ? s : { selectedMemberId: id, focusedNeighbourId: null })),
      setFocusedNeighbour: (id) => set((s) => (s.focusedNeighbourId === id ? s : { focusedNeighbourId: id })),
      setDragging: (isDragging) => set({ isDragging }),

      setLayer: (layer, visible) => set((s) => ({ view: { ...s.view, layers: { ...s.view.layers, [layer]: visible } } })),
      setHighlight: (highlight) => set((s) => ({ view: { ...s.view, highlight } })),
      setCameraPreset: (cameraPreset) =>
        set((s) => ({ view: { ...s.view, cameraPreset, orthographic: cameraPreset !== 'iso' }, cameraNonce: s.cameraNonce + 1 })),
      setOrthographic: (orthographic) => set((s) => ({ view: { ...s.view, orthographic } })),
      setMeasureMode: (measureMode) => set((s) => ({ view: { ...s.view, measureMode } })),
      setNeighbourMode: (neighbourMode) =>
        set((s) => ({ view: { ...s.view, neighbourMode }, selectedMemberId: neighbourMode ? s.selectedMemberId : null })),
      setNeighbourRadius: (neighbourRadius) => set((s) => ({ view: { ...s.view, neighbourRadius } })),
      setNeighbourLimit: (neighbourLimit) => set((s) => ({ view: { ...s.view, neighbourLimit } })),
      addMeasurement: (m) => set((s) => ({ measurements: [...s.measurements, m] })),
      updateMeasurement: (id, patch) =>
        set((s) => ({ measurements: s.measurements.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      clearMeasurements: () => set({ measurements: [] }),

      saveProjectAs: (name) =>
        set((s) => {
          const project = { ...structuredClone(s.project), name };
          const entry: SavedProject = { id: uuid(), name, savedAt: new Date().toISOString(), project };
          return { savedProjects: [entry, ...s.savedProjects].slice(0, 50), project: { ...s.project, name } };
        }),
      loadSavedProject: (id) => {
        const entry = get().savedProjects.find((p) => p.id === id);
        if (!entry) return;
        set({ project: clampAllOpenings(normalizeProject(entry.project)), selectedWallId: null, selectedOpeningId: null, selectedMemberId: null, selectedPavedAreaId: null, selectedPavedPointIndex: null, measurements: [] });
      },
      deleteSavedProject: (id) => set((s) => ({ savedProjects: s.savedProjects.filter((p) => p.id !== id) })),
      loadTemplate: (templateId) => {
        const t = PROJECT_TEMPLATES.find((x) => x.id === templateId);
        if (!t) return;
        set({ project: clampAllOpenings(t.build()), selectedWallId: null, selectedOpeningId: null, selectedMemberId: null, selectedPavedAreaId: null, selectedPavedPointIndex: null, measurements: [] });
      },
      importProject: (raw) => {
        const project = clampAllOpenings(normalizeProject(raw));
        set({ project, selectedWallId: null, selectedOpeningId: null, selectedMemberId: null, selectedPavedAreaId: null, selectedPavedPointIndex: null, measurements: [] });
      },
      resetProject: () => set({ project: createDefaultProject(), selectedWallId: null, selectedOpeningId: null, selectedMemberId: null, selectedPavedAreaId: null, selectedPavedPointIndex: null, measurements: [] }),
      setHydrated: (hydrated) => set({ hydrated }),
    })),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({
        project: s.project,
        savedProjects: s.savedProjects,
        view: { ...s.view, measureMode: false },
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ProjectStore>;
        return {
          ...current,
          project: p.project ? normalizeProject(p.project) : current.project,
          savedProjects: Array.isArray(p.savedProjects) ? p.savedProjects : current.savedProjects,
          view: { ...current.view, ...(p.view ?? {}), layers: { ...current.view.layers, ...(p.view?.layers ?? {}) } },
        };
      },
      onRehydrateStorage: () => (state, error) => {
        if (error) console.error('Failed to restore project from storage', error);
        state?.setHydrated(true);
      },
    },
  ),
);
